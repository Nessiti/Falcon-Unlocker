import "server-only";
import bcrypt from "bcryptjs";
import { BaseConnector } from "./base-connector";
import type {
  ApiLogOperation,
  BalanceResult,
  CancelOrderResult,
  ConnectorOrderStatus,
  ConnectorService,
  OrderKind,
  OrderStatusResult,
  SubmitOrderInput,
  SubmitOrderResult,
} from "./types";

/**
 * Connector for the WebX Next API (https://github.com/ptuchik/webx-api).
 * Distinctive shape vs. the other connectors: auth is a bcrypt hash of
 * `username + apiKey` sent as an `Auth-Key` header (generated fresh per
 * request - bcrypt salts randomly, there's no fixed value to reuse), and
 * IMEI/Server orders live on genuinely separate endpoints
 * (`imei-orders` / `server-orders`), which is why `kind` is threaded
 * through the shared ProviderConnector interface for this connector to key
 * off - see providers/types.ts.
 *
 * File orders/services exist in the upstream API but have no equivalent in
 * Falcon's data model (only IMEI/Server order kinds exist), so they're
 * intentionally not implemented here.
 */
export class WebXConnector extends BaseConnector {
  private authHeaders(): Record<string, string> {
    const username = this.provider.username ?? "";
    const key = this.provider.apiKey || this.provider.token || "";
    return {
      Accept: "application/json",
      "Auth-Key": bcrypt.hashSync(`${username}${key}`, 10),
    };
  }

  private endpoint(route: string): string {
    const base = this.provider.baseUrl.replace(/\/?$/, "/");
    return new URL(`api/${route}`, base).toString();
  }

  /**
   * Mirrors the PHP client's call(): GET/DELETE params go in the query
   * string, POST params go in a urlencoded body - `username` is always
   * included, matching every request the upstream client makes.
   */
  private async call(
    route: string,
    method: "GET" | "POST",
    params: Record<string, string>,
    operation: ApiLogOperation,
  ): Promise<{ ok: true; data: unknown } | { ok: false; error: string }> {
    const allParams = { username: this.provider.username ?? "", ...params };
    const headers: Record<string, string> = { ...this.authHeaders() };
    let url = this.endpoint(route);
    let body: string | undefined;

    if (method === "GET") {
      const withQuery = new URL(url);
      for (const [key, value] of Object.entries(allParams)) withQuery.searchParams.set(key, value);
      url = withQuery.toString();
    } else {
      body = new URLSearchParams(allParams).toString();
      headers["Content-Type"] = "application/x-www-form-urlencoded";
    }

    const response = await this.fetchWithTimeout(url, { method, headers, body }, operation);

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return { ok: false, error: `HTTP ${response.status}` };
    }

    const errors = data && typeof data === "object" ? (data as { errors?: unknown }).errors : undefined;
    if (!response.ok || (Array.isArray(errors) && errors.length > 0)) {
      return { ok: false, error: parseWebXError(errors) };
    }

    return { ok: true, data };
  }

  async getBalance(): Promise<BalanceResult> {
    const result = await this.call("", "GET", {}, "getBalance");
    if (!result.ok) return result;

    const info = result.data as { balance?: unknown };
    const balance = typeof info.balance === "string" ? Number(info.balance) : info.balance;
    if (typeof balance !== "number" || Number.isNaN(balance)) {
      return { ok: false, error: "Unexpected balance response shape" };
    }
    return { ok: true, balanceCents: Math.round(balance * 100) };
  }

  async getServices(): Promise<ConnectorService[]> {
    const [imei, server] = await Promise.all([
      this.call("imei-services", "GET", {}, "getServices"),
      this.call("server-services", "GET", {}, "getServices"),
    ]);

    if (!imei.ok && !server.ok) throw new Error(imei.error);

    // Two endpoints, one per order rail - so unlike the single-catalog
    // panels, the kind here is known for certain rather than parsed out of
    // a label the provider may or may not publish.
    return [
      ...(imei.ok ? toServiceArray(imei.data).map((s) => parseWebXService(s, "IMEI")) : []),
      ...(server.ok ? toServiceArray(server.data).map((s) => parseWebXService(s, "SERVER")) : []),
    ];
  }

  async submitOrder(input: SubmitOrderInput): Promise<SubmitOrderResult> {
    try {
      const values = Object.values(input.fieldValues);
      const params: Record<string, string> = {
        service_id: input.providerServiceId,
        comments: "",
        ...input.fieldValues,
      };
      // The first configured custom field is treated as the order's primary
      // identifier - the device IMEI for IMEI orders, a quantity for Server
      // orders. Falcon's generic Form Generator fields carry no semantic
      // role beyond their id/label at the connector layer (see
      // queue-engine.ts), so this is the same best-effort convention the
      // sibling connectors use, made explicit for WebX's stricter API.
      if (input.kind === "IMEI") {
        params.device = values[0] ?? "";
      } else {
        params.quantity = String(Number(values[0]) || 1);
      }

      const result = await this.call(orderRoute(input.kind), "POST", params, "submitOrder");
      if (!result.ok) return result;

      const data = result.data as { id?: unknown };
      if (!data.id) return { ok: false, error: "Provider did not return an order id" };
      return { ok: true, providerOrderId: String(data.id) };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Failed to submit order" };
    }
  }

  async checkOrderStatus(providerOrderId: string, kind: OrderKind): Promise<OrderStatusResult> {
    try {
      const result = await this.call(
        `${orderRoute(kind)}/${providerOrderId}`,
        "GET",
        {},
        "checkOrderStatus",
      );
      if (!result.ok) return result;

      const data = result.data as { status?: unknown; response?: unknown };
      const status = normalizeWebXStatus(data.status);
      if (!status) return { ok: false, error: `Unrecognized status: ${data.status}` };
      return { ok: true, status, result: typeof data.response === "string" ? data.response : null };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Failed to check order status" };
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept for interface parity; WebX's API has no cancel endpoint
  async cancelOrder(providerOrderId: string, kind: OrderKind): Promise<CancelOrderResult> {
    return { ok: false, error: "WebX does not support cancelling orders via its API" };
  }
}

function orderRoute(kind: OrderKind): string {
  return kind === "IMEI" ? "imei-orders" : "server-orders";
}

function toServiceArray(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (data && typeof data === "object") return Object.values(data as Record<string, unknown>) as Record<string, unknown>[];
  return [];
}

function parseWebXService(service: Record<string, unknown>, kind: OrderKind): ConnectorService {
  const credits = service.credits;
  const priceCents =
    typeof credits === "number"
      ? Math.round(credits * 100)
      : typeof credits === "string" && !Number.isNaN(Number(credits))
        ? Math.round(Number(credits) * 100)
        : null;

  return {
    kind,
    providerServiceId: String(service.id),
    name: typeof service.name === "string" ? service.name : "",
    priceCents,
    estimatedTime: typeof service.time === "string" ? service.time : null,
    category: null,
  };
}

/** 0=waiting, 1=in process, 2=cancelled, 3=rejected, 4=success - WebX's Order status constants. */
function normalizeWebXStatus(status: unknown): ConnectorOrderStatus | null {
  const value = typeof status === "string" ? Number(status) : status;
  switch (value) {
    case 0:
      return "PENDING";
    case 1:
      return "PROCESSING";
    case 2:
      return "CANCELLED";
    case 3:
      return "REJECTED";
    case 4:
      return "COMPLETED";
    default:
      return null;
  }
}

function parseWebXError(errors: unknown): string {
  if (!Array.isArray(errors) || errors.length === 0) return "WebX API request failed";

  const messages = errors.map((error) => {
    if (Array.isArray(error)) return error.join(", ");
    if (error && typeof error === "object") return Object.values(error as Record<string, unknown>).join(", ");
    return String(error);
  });

  return messages.join(", ");
}
