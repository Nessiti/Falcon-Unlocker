import "server-only";
import { XMLParser } from "fast-xml-parser";
import { BaseConnector } from "./base-connector";
import { normalizeStatus } from "./generic-json-connector";
import type {
  BalanceResult,
  CancelOrderResult,
  ConnectorService,
  OrderStatusResult,
  SubmitOrderInput,
  SubmitOrderResult,
} from "./types";

const parser = new XMLParser();

/**
 * Default connector for XML_API providers: same request shape as the
 * generic REST connector (Bearer auth, conventional endpoints), but the
 * provider replies with XML instead of JSON.
 */
export class XmlConnector extends BaseConnector {
  private authHeaders(): HeadersInit {
    const headers: Record<string, string> = { Accept: "application/xml" };
    const token = this.provider.token || this.provider.apiKey;
    if (token) headers.Authorization = `Bearer ${token}`;
    if (this.provider.apiSecret) headers["X-Api-Secret"] = this.provider.apiSecret;
    return headers;
  }

  private url(path: string): string {
    return new URL(path, this.provider.baseUrl.replace(/\/?$/, "/")).toString();
  }

  private async parseXml(response: Response): Promise<Record<string, unknown>> {
    const text = await response.text();
    return parser.parse(text) as Record<string, unknown>;
  }

  async getBalance(): Promise<BalanceResult> {
    try {
      const response = await this.fetchWithTimeout(
        this.url("balance"),
        { method: "GET", headers: this.authHeaders() },
        "getBalance",
      );
      if (!response.ok) return { ok: false, error: `HTTP ${response.status}` };

      const data = await this.parseXml(response);
      const root = data.response as { balance?: number } | undefined;
      const balance = root?.balance;
      if (typeof balance !== "number") return { ok: false, error: "Unexpected balance response shape" };
      return { ok: true, balanceCents: Math.round(balance * 100) };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Failed to fetch balance" };
    }
  }

  async getServices(): Promise<ConnectorService[]> {
    const response = await this.fetchWithTimeout(
      this.url("services"),
      { method: "GET", headers: this.authHeaders() },
      "getServices",
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await this.parseXml(response);
    const root = data.response as { service?: unknown } | undefined;
    const raw = root?.service;
    const list = Array.isArray(raw) ? raw : raw ? [raw] : [];

    return (list as { id: string; name: string; price?: number; eta?: string; category?: string }[]).map(
      (service) => ({
        providerServiceId: String(service.id),
        name: service.name,
        priceCents: typeof service.price === "number" ? Math.round(service.price * 100) : null,
        estimatedTime: service.eta ?? null,
        category: service.category ?? null,
        // This shape publishes no IMEI/Server distinction.
        kind: null,
      }),
    );
  }

  async submitOrder(input: SubmitOrderInput): Promise<SubmitOrderResult> {
    try {
      const url = new URL(this.url("orders"));
      url.searchParams.set("serviceId", input.providerServiceId);
      for (const [key, value] of Object.entries(input.fieldValues)) url.searchParams.set(key, value);

      const response = await this.fetchWithTimeout(
        url.toString(),
        { method: "POST", headers: this.authHeaders() },
        "submitOrder",
      );
      if (!response.ok) return { ok: false, error: `HTTP ${response.status}` };

      const data = await this.parseXml(response);
      const root = data.response as { orderId?: string } | undefined;
      if (!root?.orderId) return { ok: false, error: "Provider did not return an order id" };
      return { ok: true, providerOrderId: String(root.orderId) };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Failed to submit order" };
    }
  }

  async checkOrderStatus(providerOrderId: string): Promise<OrderStatusResult> {
    try {
      const response = await this.fetchWithTimeout(
        this.url(`orders/${providerOrderId}`),
        { method: "GET", headers: this.authHeaders() },
        "checkOrderStatus",
      );
      if (!response.ok) return { ok: false, error: `HTTP ${response.status}` };

      const data = await this.parseXml(response);
      const root = data.response as { status?: string; result?: string } | undefined;
      const status = normalizeStatus(root?.status);
      if (!status) return { ok: false, error: `Unrecognized status: ${root?.status}` };
      return { ok: true, status, result: root?.result ?? null };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Failed to check order status" };
    }
  }

  async cancelOrder(providerOrderId: string): Promise<CancelOrderResult> {
    try {
      const response = await this.fetchWithTimeout(
        this.url(`orders/${providerOrderId}/cancel`),
        { method: "POST", headers: this.authHeaders() },
        "cancelOrder",
      );
      if (!response.ok) return { ok: false, error: `HTTP ${response.status}` };
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Failed to cancel order" };
    }
  }
}
