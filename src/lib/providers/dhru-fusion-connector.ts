import "server-only";
import { BaseConnector } from "./base-connector";
import { normalizeStatus } from "./generic-json-connector";
import type {
  BalanceResult,
  CancelOrderResult,
  ConnectorService,
  OrderKind,
  OrderStatusResult,
  SubmitOrderInput,
  SubmitOrderResult,
} from "./types";

/**
 * Connector for DHRU Fusion API panels - the standard GSM-reseller panel
 * convention: single endpoint, `api=json` + `action` + `username` +
 * `apiaccesskey` query params, responses wrapped in a top-level `SUCCESS`
 * or `ERROR` array. Exact action names and field names can vary slightly
 * between panel versions/customizations - verify against the specific
 * provider's published API docs if orders don't come through as expected.
 */
export class DhruFusionConnector extends BaseConnector {
  private url(action: string, extraParams: Record<string, string> = {}): string {
    const url = new URL(this.provider.baseUrl);
    url.searchParams.set("api", "json");
    url.searchParams.set("action", action);
    if (this.provider.username) url.searchParams.set("username", this.provider.username);
    const key = this.provider.apiKey || this.provider.token;
    if (key) url.searchParams.set("apiaccesskey", key);
    for (const [k, v] of Object.entries(extraParams)) url.searchParams.set(k, v);
    return url.toString();
  }

  private async parseDhruResponse(response: Response): Promise<
    { ok: true; data: Record<string, unknown> } | { ok: false; error: string }
  > {
    const json = (await response.json()) as {
      SUCCESS?: Record<string, unknown>[];
      ERROR?: (Record<string, unknown> | string)[];
    };

    if (json.ERROR?.length) {
      const first = json.ERROR[0];
      const message = typeof first === "string" ? first : (first?.MESSAGE ?? first?.ERROR ?? "Provider error");
      return { ok: false, error: String(message) };
    }
    if (!json.SUCCESS?.length) return { ok: false, error: "Empty response from provider" };
    return { ok: true, data: json.SUCCESS[0] };
  }

  async getBalance(): Promise<BalanceResult> {
    try {
      const response = await this.fetchWithTimeout(this.url("balance"), { method: "GET" }, "getBalance");
      if (!response.ok) return { ok: false, error: `HTTP ${response.status}` };

      const parsed = await this.parseDhruResponse(response);
      if (!parsed.ok) return parsed;

      const credits = parsed.data.CREDITS ?? parsed.data.BALANCE;
      const balance = typeof credits === "string" ? Number(credits) : credits;
      if (typeof balance !== "number" || Number.isNaN(balance)) {
        return { ok: false, error: "Unexpected balance response shape" };
      }
      return { ok: true, balanceCents: Math.round(balance * 100) };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Failed to fetch balance" };
    }
  }

  async getServices(): Promise<ConnectorService[]> {
    const response = await this.fetchWithTimeout(this.url("imeiservicelist"), { method: "GET" }, "getServices");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const json = (await response.json()) as {
      SUCCESS?: { LIST?: Record<string, unknown>[] }[];
    };
    const list = json.SUCCESS?.[0]?.LIST ?? [];

    return list.map((service) => ({
      providerServiceId: String(service.ID ?? service.id),
      name: String(service.NAME ?? service.name ?? ""),
      priceCents:
        typeof service.CREDIT === "string" || typeof service.CREDIT === "number"
          ? Math.round(Number(service.CREDIT) * 100)
          : null,
      estimatedTime: (service.TIME as string | undefined) ?? null,
      category: (service.GROUP as string | undefined) ?? null,
    }));
  }

  async submitOrder(input: SubmitOrderInput): Promise<SubmitOrderResult> {
    try {
      const response = await this.fetchWithTimeout(
        this.url("placeimeiorder", { serviceid: input.providerServiceId, ...input.fieldValues }),
        { method: "GET" },
        "submitOrder",
      );
      if (!response.ok) return { ok: false, error: `HTTP ${response.status}` };

      const parsed = await this.parseDhruResponse(response);
      if (!parsed.ok) return parsed;

      const orderId = parsed.data.ORDERID ?? parsed.data.ID;
      if (!orderId) return { ok: false, error: "Provider did not return an order id" };
      return { ok: true, providerOrderId: String(orderId) };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Failed to submit order" };
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- kind is part of the shared interface; this API's single endpoint doesn't need it
  async checkOrderStatus(providerOrderId: string, _kind: OrderKind): Promise<OrderStatusResult> {
    try {
      const response = await this.fetchWithTimeout(
        this.url("imeiorderstatus", { orderid: providerOrderId }),
        { method: "GET" },
        "checkOrderStatus",
      );
      if (!response.ok) return { ok: false, error: `HTTP ${response.status}` };

      const parsed = await this.parseDhruResponse(response);
      if (!parsed.ok) return parsed;

      const status = normalizeStatus(parsed.data.STATUS as string | undefined);
      if (!status) return { ok: false, error: `Unrecognized status: ${parsed.data.STATUS}` };
      return { ok: true, status, result: (parsed.data.RESULT as string | undefined) ?? null };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Failed to check order status" };
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- kind is part of the shared interface; this API's single endpoint doesn't need it
  async cancelOrder(providerOrderId: string, _kind: OrderKind): Promise<CancelOrderResult> {
    try {
      const response = await this.fetchWithTimeout(
        this.url("cancelimeiorder", { orderid: providerOrderId }),
        { method: "GET" },
        "cancelOrder",
      );
      if (!response.ok) return { ok: false, error: `HTTP ${response.status}` };

      const parsed = await this.parseDhruResponse(response);
      if (!parsed.ok) return parsed;
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Failed to cancel order" };
    }
  }
}
