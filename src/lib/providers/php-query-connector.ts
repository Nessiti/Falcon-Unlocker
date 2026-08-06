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
 * Default connector for PHP_API providers: the classic legacy reseller-panel
 * shape — a single endpoint, GET requests with `action`/`username`/`apikey`
 * query params, JSON responses. Same response contract as GenericJsonConnector,
 * different request style.
 */
export class PhpQueryConnector extends BaseConnector {
  private url(action: string, extraParams: Record<string, string> = {}): string {
    const url = new URL(this.provider.baseUrl);
    url.searchParams.set("action", action);
    if (this.provider.username) url.searchParams.set("username", this.provider.username);
    const apiKey = this.provider.apiKey || this.provider.token;
    if (apiKey) url.searchParams.set("apikey", apiKey);
    for (const [key, value] of Object.entries(extraParams)) url.searchParams.set(key, value);
    return url.toString();
  }

  async getBalance(): Promise<BalanceResult> {
    try {
      const response = await this.fetchWithTimeout(this.url("balance"), { method: "GET" }, "getBalance");
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
    const response = await this.fetchWithTimeout(this.url("servicelist"), { method: "GET" }, "getServices");
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
      const params: Record<string, string> = { serviceid: input.providerServiceId };
      for (const [key, value] of Object.entries(input.fieldValues)) params[`field_${key}`] = value;

      const response = await this.fetchWithTimeout(this.url("placeorder", params), { method: "GET" }, "submitOrder");
      if (!response.ok) return { ok: false, error: `HTTP ${response.status}` };

      const data = (await response.json()) as { orderId?: string };
      if (!data.orderId) return { ok: false, error: "Provider did not return an order id" };
      return { ok: true, providerOrderId: String(data.orderId) };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Failed to submit order" };
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- kind is part of the shared interface; this API's single endpoint doesn't need it
  async checkOrderStatus(providerOrderId: string, _kind: OrderKind): Promise<OrderStatusResult> {
    try {
      const response = await this.fetchWithTimeout(
        this.url("orderstatus", { orderid: providerOrderId }),
        { method: "GET" },
        "checkOrderStatus",
      );
      if (!response.ok) return { ok: false, error: `HTTP ${response.status}` };

      const data = (await response.json()) as { status?: string; result?: string };
      const status = normalizeStatus(data.status);
      if (!status) return { ok: false, error: `Unrecognized status: ${data.status}` };
      return { ok: true, status, result: data.result ?? null };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Failed to check order status" };
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- kind is part of the shared interface; this API's single endpoint doesn't need it
  async cancelOrder(providerOrderId: string, _kind: OrderKind): Promise<CancelOrderResult> {
    try {
      const response = await this.fetchWithTimeout(
        this.url("cancelorder", { orderid: providerOrderId }),
        { method: "GET" },
        "cancelOrder",
      );
      if (!response.ok) return { ok: false, error: `HTTP ${response.status}` };
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Failed to cancel order" };
    }
  }
}
