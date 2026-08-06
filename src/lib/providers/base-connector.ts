import "server-only";
import type { Provider } from "@/generated/prisma/client";
import type {
  BalanceResult,
  CancelOrderResult,
  ConnectionTestResult,
  ConnectorService,
  OrderStatusResult,
  ProviderConnector,
  SubmitOrderInput,
  SubmitOrderResult,
  SyncServicesResult,
} from "./types";

/**
 * Shared HTTP plumbing (timeout handling, generic reachability test) that
 * every concrete connector builds on. Per-type request/response shape stays
 * in the subclass — nothing provider-specific belongs here.
 */
export abstract class BaseConnector implements ProviderConnector {
  protected readonly provider: Provider;

  constructor(provider: Provider) {
    this.provider = provider;
  }

  async connect(): Promise<void> {}

  async disconnect(): Promise<void> {}

  async testConnection(): Promise<ConnectionTestResult> {
    const startedAt = Date.now();
    try {
      const response = await this.fetchWithTimeout(this.provider.baseUrl, { method: "GET" });
      return {
        success: response.status < 500,
        responseTimeMs: Date.now() - startedAt,
        statusCode: response.status,
        errorMessage: null,
      };
    } catch (error) {
      return {
        success: false,
        responseTimeMs: Date.now() - startedAt,
        statusCode: null,
        errorMessage: error instanceof Error ? error.message : "Connection failed",
      };
    }
  }

  async syncServices(): Promise<SyncServicesResult> {
    try {
      const services = await this.getServices();
      return { ok: true, services };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Sync failed" };
    }
  }

  abstract getServices(): Promise<ConnectorService[]>;
  abstract submitOrder(input: SubmitOrderInput): Promise<SubmitOrderResult>;
  abstract checkOrderStatus(providerOrderId: string): Promise<OrderStatusResult>;
  abstract cancelOrder(providerOrderId: string): Promise<CancelOrderResult>;
  abstract getBalance(): Promise<BalanceResult>;

  protected async fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.provider.timeoutMs);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  }
}
