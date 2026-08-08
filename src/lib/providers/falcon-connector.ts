import "server-only";
import { BaseConnector } from "./base-connector";
import type {
  BalanceResult,
  ConnectionTestResult,
  CancelOrderResult,
  ConnectorService,
  ConnectorOrderStatus,
  OrderKind,
  OrderStatusResult,
  SubmitOrderInput,
  SubmitOrderResult,
} from "./types";

/**
 * Connector for another Falcon Unlocker instance, reached through its own
 * reseller API (src/app/api/reseller/route.ts). Written against that route
 * and src/lib/reseller-api/actions.ts directly rather than inferred from a
 * published spec, so the shapes below are exact rather than best-effort.
 *
 * Falcon's API follows the DHRU/GSM Theme action set, but differs from those
 * panels in three ways that make a dedicated connector worth having instead
 * of bending GsmThemeConnector to fit:
 *
 * 1. Credentials are `apikey` + `apisecret` - the app's own vocabulary. The
 *    DHRU spelling (`username` + `apiaccesskey`) is accepted as an alias,
 *    but forcing admins through it is what made "which value goes in which
 *    field" a recurring support question.
 * 2. `parameters` accepts plain JSON (parseParameters auto-detects JSON /
 *    base64 JSON / XML), so orders are sent as JSON instead of hand-built
 *    XML - and custom fields survive as a real map rather than being
 *    flattened into GSM Theme's single CUSTOMFIELD slot.
 * 3. `LIST` is an array of groups, each with a `SERVICES` array. GSM Theme
 *    returns objects keyed by group/service id. Parsing one as the other
 *    silently yields zero services.
 */
export class FalconConnector extends BaseConnector {
  private url(action: string, extraParams: Record<string, string> = {}): string {
    const url = new URL(this.provider.baseUrl);
    url.searchParams.set("action", action);
    // The remote instance identifies the reseller account by its `fu_...`
    // key; the secret is what actually authenticates. `token` is accepted as
    // a fallback slot for the secret so an existing provider row configured
    // before this type existed keeps working.
    const key = this.provider.username || this.provider.apiKey;
    const secret = this.provider.apiSecret || this.provider.token || this.provider.apiKey;
    if (key) url.searchParams.set("apikey", key);
    if (secret) url.searchParams.set("apisecret", secret);
    for (const [k, v] of Object.entries(extraParams)) url.searchParams.set(k, v);
    return url.toString();
  }

  private async parseResponse(
    response: Response,
  ): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; error: string }> {
    const body = await this.readJson(response);
    if (!body.ok) return body;
    const json = body.json as {
      SUCCESS?: Record<string, unknown>[];
      ERROR?: (Record<string, unknown> | string)[];
    };

    // Errors come back as HTTP 401/400/500 *and* an ERROR body; success is
    // always 200 with SUCCESS. Reading the body first means the caller sees
    // the remote's own message ("Invalid API secret") rather than a bare
    // status code.
    if (json.ERROR?.length) {
      const first = json.ERROR[0];
      const message = typeof first === "string" ? first : (first?.MESSAGE ?? "Provider error");
      return { ok: false, error: String(message) };
    }
    if (!json.SUCCESS?.length) return { ok: false, error: "Empty response from provider" };
    return { ok: true, data: json.SUCCESS[0] };
  }

  /** The base URL is the API endpoint here, so a bare unauthenticated GET always 401s - test the credentials instead. */
  async testConnection(): Promise<ConnectionTestResult> {
    return this.testConnectionViaBalance();
  }

  async getBalance(): Promise<BalanceResult> {
    try {
      const response = await this.fetchWithTimeout(
        this.url("accountinfo"),
        { method: "POST" },
        "getBalance",
      );
      const parsed = await this.parseResponse(response);
      if (!parsed.ok) return parsed;

      const accountInfo = parsed.data.AccountInfo as { creditraw?: number | string } | undefined;
      const raw = accountInfo?.creditraw;
      const balance = typeof raw === "string" ? Number(raw) : raw;
      if (typeof balance !== "number" || Number.isNaN(balance)) {
        return { ok: false, error: "Unexpected balance response shape" };
      }
      return { ok: true, balanceCents: Math.round(balance * 100) };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Failed to fetch balance" };
    }
  }

  async getServices(): Promise<ConnectorService[]> {
    const response = await this.fetchWithTimeout(
      this.url("imeiservicelist"),
      { method: "POST" },
      "getServices",
    );
    const parsed = await this.parseResponse(response);
    if (!parsed.ok) throw new Error(parsed.error);

    type RawService = {
      SERVICEID: string;
      SERVICENAME: string;
      CREDIT?: string;
      TIME?: string | null;
    };
    type RawGroup = { GROUPNAME: string; GROUPTYPE: string; SERVICES: RawService[] };

    const list = (parsed.data.LIST ?? []) as RawGroup[];
    const services: ConnectorService[] = [];

    for (const group of Array.isArray(list) ? list : []) {
      for (const service of group.SERVICES ?? []) {
        const price = service.CREDIT != null ? Number(service.CREDIT) : NaN;
        services.push({
          providerServiceId: String(service.SERVICEID),
          name: service.SERVICENAME,
          priceCents: Number.isNaN(price) ? null : Math.round(price * 100),
          estimatedTime: service.TIME ?? null,
          category: group.GROUPNAME ?? null,
        });
      }
    }
    return services;
  }

  async submitOrder(input: SubmitOrderInput): Promise<SubmitOrderResult> {
    try {
      // Sent as JSON: the remote's resolveCustomFields matches each key
      // against its own field ids first, then field labels - so passing the
      // whole map through keeps multi-field services intact instead of
      // collapsing them into one value.
      const parameters = JSON.stringify({
        ID: input.providerServiceId,
        CUSTOMFIELD: input.fieldValues,
      });

      const response = await this.fetchWithTimeout(
        this.url("placeimeiorder", { parameters }),
        { method: "POST" },
        "submitOrder",
      );
      const parsed = await this.parseResponse(response);
      if (!parsed.ok) return parsed;

      const referenceId = parsed.data.REFERENCEID;
      if (!referenceId) return { ok: false, error: "Provider did not return an order id" };
      return { ok: true, providerOrderId: String(referenceId) };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Failed to submit order" };
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- kind is part of the shared interface; getimeiorder looks up either kind by id
  async checkOrderStatus(providerOrderId: string, _kind: OrderKind): Promise<OrderStatusResult> {
    try {
      const response = await this.fetchWithTimeout(
        this.url("getimeiorder", { parameters: JSON.stringify({ ID: providerOrderId }) }),
        { method: "POST" },
        "checkOrderStatus",
      );
      const parsed = await this.parseResponse(response);
      if (!parsed.ok) return parsed;

      // Mirrors toDhruStatus() on the remote side: 0 waiting, 1 in process,
      // 3 rejected/cancelled, 4 success.
      const statusMap: Record<number, ConnectorOrderStatus> = {
        0: "PENDING",
        1: "PROCESSING",
        3: "REJECTED",
        4: "COMPLETED",
      };
      const status = statusMap[Number(parsed.data.STATUS)];
      if (!status) return { ok: false, error: `Unrecognized status: ${parsed.data.STATUS}` };
      return { ok: true, status, result: (parsed.data.CODE as string | undefined) || null };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Failed to check order status" };
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- part of the shared interface; the reseller API publishes no cancel action
  async cancelOrder(providerOrderId: string, _kind: OrderKind): Promise<CancelOrderResult> {
    // The route's switch covers accountinfo / imeiservicelist / getimeiorder
    // / getimeiorderbulk / placeimeiorder / placebulkorder and answers
    // "Unknown action" for anything else. Fail here rather than log a call
    // the remote can never honor.
    return { ok: false, error: "Falcon's reseller API has no cancel action" };
  }
}
