import "server-only";
import { BaseConnector } from "./base-connector";
import type {
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
 * Connector for DHRU Fusion Pro's modern reseller API, written against the
 * published spec at github.com/dhru-com/reseller-api.
 *
 * This is a different protocol from DhruFusionConnector, not a newer dialect
 * of it. The legacy panel API is one endpoint with `api=json&action=...` in
 * the query string and `username` + `apiaccesskey` credentials; this one is
 * REST + JSON with a single Bearer token:
 *
 *   GET  /account   -> { data: { currency, balance, name, email } }
 *   GET  /products  -> { data: { currency, categories, products } }
 *   POST /order     -> [{ product_uuid, fields: [{ reference_id, Quantity, ... }] }]
 *   GET  /order     -> { data: { quantity, status, date } }
 *
 * Every response shares the envelope `{ status, message, code, data }`, so
 * `status: "success"` is the success signal - not the HTTP code alone.
 *
 * Providers commonly run both APIs side by side (a modern `api.` host and a
 * legacy one), which is exactly why both types exist here: an admin picks
 * whichever their provider gave them credentials for.
 */

/** Products are keyed by uuid; categories by an opaque id referenced in `cids`. */
type RawProduct = {
  name?: string;
  type?: string;
  cids?: string[];
  price?: number | string;
};

type AccountData = { currency?: string; balance?: number | string };
type ProductsData = {
  categories?: Record<string, { name?: string }>;
  products?: Record<string, RawProduct>;
};
type OrderData = { status?: string; date?: string; quantity?: number };
type PlacedOrder = { order_uuid?: string; reference_id?: string; amount?: number };

/**
 * The spec documents `success` and `rejected` explicitly and leaves the
 * in-flight vocabulary open, so the waiting/processing spellings panels
 * actually emit are all mapped rather than guessed at one at a time. An
 * unrecognized value is reported as-is instead of being silently treated as
 * pending - a status this app misreads as "still waiting" would strand an
 * order in the queue forever.
 */
const STATUS_MAP: Record<string, ConnectorOrderStatus> = {
  success: "COMPLETED",
  successful: "COMPLETED",
  completed: "COMPLETED",
  delivered: "COMPLETED",
  rejected: "REJECTED",
  failed: "REJECTED",
  error: "REJECTED",
  cancelled: "CANCELLED",
  canceled: "CANCELLED",
  refunded: "CANCELLED",
  pending: "PENDING",
  waiting: "PENDING",
  new: "PENDING",
  processing: "PROCESSING",
  inprocess: "PROCESSING",
  "in process": "PROCESSING",
  "in-process": "PROCESSING",
};

export class DhruProConnector extends BaseConnector {
  private headers(): HeadersInit {
    // The token is the only credential this API takes. `apiKey` is accepted
    // as a fallback slot so a provider row saved before this type existed
    // (token pasted into the API Key field) keeps working.
    const token = this.provider.token || this.provider.apiKey || "";
    return {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  }

  private url(path: string, params: Record<string, string> = {}): string {
    // Base URL may or may not carry a version prefix (`https://api.host` vs
    // `https://api.host/v1`), so paths are appended to it rather than
    // resolved against the host root - resolving would drop the prefix.
    const url = new URL(`${this.provider.baseUrl.replace(/\/+$/, "")}${path}`);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    return url.toString();
  }

  private async parseEnvelope(
    response: Response,
  ): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; error: string }> {
    const body = await this.readJson(response);
    if (!body.ok) return body;

    const json = body.json as {
      status?: string;
      message?: string;
      code?: number;
      data?: unknown;
      errors?: unknown;
    };

    if (json.status && json.status !== "success") {
      return { ok: false, error: json.message || `Provider returned status "${json.status}"` };
    }
    if (!response.ok) {
      return { ok: false, error: json.message || `HTTP ${response.status}` };
    }
    if (json.data == null || typeof json.data !== "object") {
      return { ok: false, error: json.message || "Empty response from provider" };
    }
    return { ok: true, data: json.data as Record<string, unknown> };
  }

  async getBalance(): Promise<BalanceResult> {
    try {
      const response = await this.fetchWithTimeout(
        this.url("/account"),
        { method: "GET", headers: this.headers() },
        "getBalance",
      );
      const parsed = await this.parseEnvelope(response);
      if (!parsed.ok) return parsed;

      // Sent as a decimal string ("450.78000"), not a number.
      const { balance } = parsed.data as AccountData;
      const amount = typeof balance === "string" ? Number(balance) : balance;
      if (typeof amount !== "number" || Number.isNaN(amount)) {
        return { ok: false, error: "Unexpected balance response shape" };
      }
      return { ok: true, balanceCents: Math.round(amount * 100) };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Failed to fetch balance" };
    }
  }

  async getServices(): Promise<ConnectorService[]> {
    const response = await this.fetchWithTimeout(
      this.url("/products"),
      { method: "GET", headers: this.headers() },
      "getServices",
    );
    const parsed = await this.parseEnvelope(response);
    if (!parsed.ok) throw new Error(parsed.error);

    const { categories = {}, products = {} } = parsed.data as ProductsData;

    return Object.entries(products).map(([uuid, product]) => {
      // A product can belong to several categories; the first is the one
      // shown in the panel's own tree, so it's the one used for grouping.
      const categoryId = product.cids?.[0];
      const price = product.price != null ? Number(product.price) : NaN;
      return {
        providerServiceId: uuid,
        name: product.name ?? uuid,
        priceCents: Number.isNaN(price) ? null : Math.round(price * 100),
        // This API publishes no delivery-time field.
        estimatedTime: null,
        category: (categoryId ? categories[categoryId]?.name : null) ?? null,
      };
    });
  }

  async submitOrder(input: SubmitOrderInput): Promise<SubmitOrderResult> {
    try {
      // `reference_id` is the reseller's own unique tracker, echoed back on
      // both the order response and any webhook. Nothing upstream supplies
      // one, so it's generated here and returned to the caller alongside the
      // provider's uuid only if the uuid is missing - the uuid is what the
      // status endpoint takes.
      const referenceId = crypto.randomUUID();
      const payload = [
        {
          product_uuid: input.providerServiceId,
          fields: [{ reference_id: referenceId, Quantity: 1, ...input.fieldValues }],
        },
      ];

      const response = await this.fetchWithTimeout(
        this.url("/order"),
        { method: "POST", headers: this.headers(), body: JSON.stringify(payload) },
        "submitOrder",
      );

      const body = await this.readJson(response);
      if (!body.ok) return body;
      const json = body.json as { status?: string; message?: string; data?: PlacedOrder[] };

      if (json.status && json.status !== "success") {
        return { ok: false, error: json.message || `Provider returned status "${json.status}"` };
      }
      // Bulk-capable endpoint: one submitted product means one entry back.
      const placed = json.data?.[0];
      const orderId = placed?.order_uuid ?? placed?.reference_id;
      if (!orderId) {
        return { ok: false, error: json.message || "Provider did not return an order id" };
      }
      return { ok: true, providerOrderId: String(orderId) };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Failed to submit order" };
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- kind is part of the shared interface; /order looks up either kind by uuid
  async checkOrderStatus(providerOrderId: string, _kind: OrderKind): Promise<OrderStatusResult> {
    try {
      const response = await this.fetchWithTimeout(
        this.url("/order", { order_uuid: providerOrderId }),
        { method: "GET", headers: this.headers() },
        "checkOrderStatus",
      );
      const parsed = await this.parseEnvelope(response);
      if (!parsed.ok) return parsed;

      const { status, date } = parsed.data as OrderData;
      const mapped = STATUS_MAP[String(status ?? "").trim().toLowerCase()];
      if (!mapped) return { ok: false, error: `Unrecognized status: ${status}` };
      // The documented order-details payload carries no result/code field -
      // the delivered value arrives on the webhook (`replay`, base64) rather
      // than on this endpoint, so there is nothing to return here yet.
      return { ok: true, status: mapped, result: date ?? null };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to check order status",
      };
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- part of the shared interface; this API publishes no cancel endpoint
  async cancelOrder(providerOrderId: string, _kind: OrderKind): Promise<CancelOrderResult> {
    // The spec documents /account, /products and /order only. Fail here
    // rather than fire a request the provider can never honor.
    return { ok: false, error: "DHRU Fusion Pro's API has no cancel endpoint" };
  }
}
