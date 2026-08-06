import "server-only";
import { BaseConnector } from "./base-connector";
import type {
  BalanceResult,
  CancelOrderResult,
  ConnectorOrderStatus,
  ConnectorService,
  OrderStatusResult,
  SubmitOrderInput,
  SubmitOrderResult,
} from "./types";

/**
 * Default connector for REST_API / JSON_API / CUSTOM_API providers: a
 * conventional JSON-over-HTTP shape (Bearer auth, `/balance`, `/services`,
 * `/orders` endpoints). Real providers vary — this is the reference
 * implementation; a genuinely bespoke API needs its own connector class,
 * which per the Global Rule is the only thing that has to change, never
 * the core app.
 */
export class GenericJsonConnector extends BaseConnector {
  private authHeaders(): HeadersInit {
    const headers: Record<string, string> = { Accept: "application/json" };
    const token = this.provider.token || this.provider.apiKey;
    if (token) headers.Authorization = `Bearer ${token}`;
    if (this.provider.apiSecret) headers["X-Api-Secret"] = this.provider.apiSecret;
    return headers;
  }

  private url(path: string): string {
    return new URL(path, this.provider.baseUrl.replace(/\/?$/, "/")).toString();
  }

  async getBalance(): Promise<BalanceResult> {
    try {
      const response = await this.fetchWithTimeout(this.url("balance"), {
        method: "GET",
        headers: this.authHeaders(),
      });
      if (!response.ok) return { ok: false, error: `HTTP ${response.status}` };

      const data = (await response.json()) as { balance?: number };
      if (typeof data.balance !== "number") {
        return { ok: false, error: "Unexpected balance response shape" };
      }
      return { ok: true, balanceCents: Math.round(data.balance * 100) };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Failed to fetch balance" };
    }
  }

  async getServices(): Promise<ConnectorService[]> {
    const response = await this.fetchWithTimeout(this.url("services"), {
      method: "GET",
      headers: this.authHeaders(),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = (await response.json()) as {
      services?: { id: string; name: string; price?: number; eta?: string; category?: string }[];
    };

    return (data.services ?? []).map((service) => ({
      providerServiceId: String(service.id),
      name: service.name,
      priceCents: typeof service.price === "number" ? Math.round(service.price * 100) : null,
      estimatedTime: service.eta ?? null,
      category: service.category ?? null,
    }));
  }

  async submitOrder(input: SubmitOrderInput): Promise<SubmitOrderResult> {
    try {
      const response = await this.fetchWithTimeout(this.url("orders"), {
        method: "POST",
        headers: { ...this.authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId: input.providerServiceId, fields: input.fieldValues }),
      });
      if (!response.ok) return { ok: false, error: `HTTP ${response.status}` };

      const data = (await response.json()) as { orderId?: string };
      if (!data.orderId) return { ok: false, error: "Provider did not return an order id" };
      return { ok: true, providerOrderId: String(data.orderId) };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Failed to submit order" };
    }
  }

  async checkOrderStatus(providerOrderId: string): Promise<OrderStatusResult> {
    try {
      const response = await this.fetchWithTimeout(this.url(`orders/${providerOrderId}`), {
        method: "GET",
        headers: this.authHeaders(),
      });
      if (!response.ok) return { ok: false, error: `HTTP ${response.status}` };

      const data = (await response.json()) as { status?: string; result?: string };
      const status = normalizeStatus(data.status);
      if (!status) return { ok: false, error: `Unrecognized status: ${data.status}` };
      return { ok: true, status, result: data.result ?? null };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Failed to check order status" };
    }
  }

  async cancelOrder(providerOrderId: string): Promise<CancelOrderResult> {
    try {
      const response = await this.fetchWithTimeout(this.url(`orders/${providerOrderId}/cancel`), {
        method: "POST",
        headers: this.authHeaders(),
      });
      if (!response.ok) return { ok: false, error: `HTTP ${response.status}` };
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Failed to cancel order" };
    }
  }
}

export function normalizeStatus(raw: string | undefined): ConnectorOrderStatus | null {
  switch ((raw ?? "").toUpperCase()) {
    case "PENDING":
    case "QUEUED":
      return "PENDING";
    case "PROCESSING":
    case "IN_PROGRESS":
      return "PROCESSING";
    case "COMPLETED":
    case "DONE":
    case "SUCCESS":
      return "COMPLETED";
    case "REJECTED":
    case "FAILED":
    case "ERROR":
      return "REJECTED";
    case "CANCELLED":
    case "CANCELED":
      return "CANCELLED";
    default:
      return null;
  }
}
