import "server-only";
import { prisma } from "@/lib/prisma";
import type { Provider } from "@/generated/prisma/client";
import type {
  ApiLogOperation,
  BalanceResult,
  CancelOrderResult,
  ConnectionTestResult,
  ConnectorService,
  OrderKind,
  OrderStatusResult,
  ProviderConnector,
  SubmitOrderInput,
  SubmitOrderResult,
  SyncServicesResult,
} from "./types";

const MAX_LOGGED_BODY_LENGTH = 4000;

function truncateForLog(value: string | null): string | null {
  if (value == null) return null;
  return value.length > MAX_LOGGED_BODY_LENGTH
    ? `${value.slice(0, MAX_LOGGED_BODY_LENGTH)}…(truncated)`
    : value;
}

// Some provider APIs (PhpQueryConnector, DhruFusionConnector) put the API
// key/token directly in the query string rather than a header. Redact any
// query param whose name looks credential-shaped before it ever reaches
// ApiLog — "No exposed API credentials" (Chapter 21) applies to the API
// Logs viewer too, not just the frontend forms.
const SENSITIVE_QUERY_PARAM_PATTERN = /key|secret|token|password|auth/i;

function sanitizeUrlForLog(url: string): string {
  try {
    const parsed = new URL(url);
    for (const name of parsed.searchParams.keys()) {
      if (SENSITIVE_QUERY_PARAM_PATTERN.test(name)) {
        parsed.searchParams.set(name, "••••");
      }
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

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
      const response = await this.fetchWithTimeout(
        this.provider.baseUrl,
        { method: "GET" },
        "testConnection",
      );
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
  abstract checkOrderStatus(providerOrderId: string, kind: OrderKind): Promise<OrderStatusResult>;
  abstract cancelOrder(providerOrderId: string, kind: OrderKind): Promise<CancelOrderResult>;
  abstract getBalance(): Promise<BalanceResult>;

  /**
   * Rate Limiting (Chapter 19): counts this provider's own ApiLog rows from
   * the last 60 seconds — no extra state to maintain, reuses what Chapter
   * 17 already records at this exact chokepoint. Protecting the provider's
   * real API from being hammered (by a runaway sync, a retry storm, or an
   * admin double-clicking) is the point, so this fails closed on error:
   * if the count query itself fails, the call is blocked rather than let
   * through unchecked.
   */
  private async isRateLimited(): Promise<boolean> {
    if (!this.provider.rateLimitPerMinute) return false;
    try {
      const count = await prisma.apiLog.count({
        where: { providerId: this.provider.id, createdAt: { gte: new Date(Date.now() - 60_000) } },
      });
      return count >= this.provider.rateLimitPerMinute;
    } catch (error) {
      console.error("Rate limit check failed, blocking call", error);
      return true;
    }
  }

  /**
   * API Logs (Chapter 17): the single chokepoint every connector call passes
   * through, regardless of provider type — so every outbound request is
   * logged identically without any provider-specific logging code. A
   * logging failure never breaks the actual provider call. Also where
   * Chapter 19's per-provider rate limit is enforced, before any network
   * call is made.
   */
  protected async fetchWithTimeout(
    url: string,
    init: RequestInit,
    operation: ApiLogOperation,
  ): Promise<Response> {
    const method = init.method ?? "GET";
    const requestBody = typeof init.body === "string" ? init.body : null;

    if (await this.isRateLimited()) {
      void this.logApiCall({
        operation,
        url,
        method,
        requestBody,
        responseBody: null,
        statusCode: null,
        responseTimeMs: 0,
        success: false,
        errorMessage: `Rate limit exceeded (${this.provider.rateLimitPerMinute}/min)`,
      });
      throw new Error(`Rate limit exceeded for ${this.provider.name}`);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.provider.timeoutMs);
    const startedAt = Date.now();

    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      const responseTimeMs = Date.now() - startedAt;
      void this.logApiCall({
        operation,
        url,
        method,
        requestBody,
        responseBody: await response
          .clone()
          .text()
          .catch(() => null),
        statusCode: response.status,
        responseTimeMs,
        success: response.ok,
        errorMessage: null,
      });
      return response;
    } catch (error) {
      void this.logApiCall({
        operation,
        url,
        method,
        requestBody,
        responseBody: null,
        statusCode: null,
        responseTimeMs: Date.now() - startedAt,
        success: false,
        errorMessage: error instanceof Error ? error.message : "Request failed",
      });
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async logApiCall(entry: {
    operation: ApiLogOperation;
    url: string;
    method: string;
    requestBody: string | null;
    responseBody: string | null;
    statusCode: number | null;
    responseTimeMs: number;
    success: boolean;
    errorMessage: string | null;
  }): Promise<void> {
    try {
      await prisma.apiLog.create({
        data: {
          providerId: this.provider.id,
          operation: entry.operation,
          endpoint: sanitizeUrlForLog(entry.url),
          method: entry.method,
          requestBody: truncateForLog(entry.requestBody),
          responseBody: truncateForLog(entry.responseBody),
          statusCode: entry.statusCode,
          responseTimeMs: entry.responseTimeMs,
          success: entry.success,
          errorMessage: entry.errorMessage,
        },
      });
    } catch (error) {
      console.error("Failed to write ApiLog entry", error);
    }
  }
}
