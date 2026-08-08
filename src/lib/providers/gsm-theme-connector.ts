import "server-only";
import { BaseConnector } from "./base-connector";
import type {
  BalanceResult,
  CancelOrderResult,
  ConnectorService,
  ConnectorOrderStatus,
  OrderKind,
  OrderStatusResult,
  SubmitOrderInput,
  SubmitOrderResult,
} from "./types";

/**
 * Connector for "GSM-THEME" panel clones (verified against the published
 * standard: github.com/gsmtheme/gsm-theme-api-standards, PublicApiController.php).
 * Single endpoint, one `action` param routes to a match() block. Every
 * response - success AND error - comes back as HTTP 200 with a JSON body
 * shaped `{ SUCCESS: [...] }` or `{ ERROR: [{ MESSAGE }] }`, so HTTP status
 * is never a reliable success signal here; only the JSON body is. Order
 * detail/place actions take a `parameters` field holding a raw XML string
 * (simplexml_load_string on the PHP side), not flat query params.
 *
 * Auth: the published standard only shows `isValidIncommingApi($request)`
 * being called, not its implementation, so the exact credential field names
 * aren't confirmed. This follows the same `username` + `apiaccesskey`
 * convention already used for DhruFusionConnector (GSM-THEME panels are
 * built on that same lineage) - verify against a real test call and adjust
 * if the provider rejects auth.
 *
 * Method: POST, not GET. These panels serve a client-rendered storefront
 * SPA off the same domain, and Laravel's `Route::fallback()` (the usual way
 * an app serves a SPA's index.html for any unmatched path) only intercepts
 * GET requests by design - a GET to the real API route can still fall
 * through to the SPA shell if routing is even slightly off, which is
 * consistent with what was observed (200 + the homepage HTML, for both `/`
 * and `/api/public`, action param or not). POST does not fall through a
 * GET-only fallback, so it's a meaningfully different test, not a guess of
 * the same kind as the path.
 */
export class GsmThemeConnector extends BaseConnector {
  private url(action: string, extraParams: Record<string, string> = {}): string {
    const url = new URL(this.provider.baseUrl);
    url.searchParams.set("action", action);
    if (this.provider.username) url.searchParams.set("username", this.provider.username);
    const key = this.provider.apiKey || this.provider.token;
    if (key) url.searchParams.set("apiaccesskey", key);
    for (const [k, v] of Object.entries(extraParams)) url.searchParams.set(k, v);
    return url.toString();
  }

  private static escapeXml(value: string): string {
    return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  private static buildXmlParams(fields: Record<string, string>): string {
    const body = Object.entries(fields)
      .map(([key, value]) => `<${key}>${GsmThemeConnector.escapeXml(value)}</${key}>`)
      .join("");
    return `<xml>${body}</xml>`;
  }

  private async parseGsmThemeResponse(
    response: Response,
  ): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; error: string }> {
    const body = await this.readJson(response);
    if (!body.ok) return body;
    const json = body.json as {
      SUCCESS?: Record<string, unknown>[];
      ERROR?: (Record<string, unknown> | string)[];
    };

    // The panel returns HTTP 200 for both success AND error - `ERROR` in the
    // body is the only reliable failure signal, independent of response.ok.
    if (json.ERROR?.length) {
      const first = json.ERROR[0];
      const message = typeof first === "string" ? first : (first?.MESSAGE ?? "Provider error");
      return { ok: false, error: String(message) };
    }
    if (!json.SUCCESS?.length) return { ok: false, error: "Empty response from provider" };
    return { ok: true, data: json.SUCCESS[0] };
  }

  async getBalance(): Promise<BalanceResult> {
    try {
      const response = await this.fetchWithTimeout(this.url("accountinfo"), { method: "POST" }, "getBalance");
      const parsed = await this.parseGsmThemeResponse(response);
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
    const response = await this.fetchWithTimeout(this.url("imeiservicelist"), { method: "POST" }, "getServices");
    const parsed = await this.parseGsmThemeResponse(response);
    if (!parsed.ok) throw new Error(parsed.error);

    // LIST is an object keyed by group name, not an array - each group's
    // SERVICES is itself an object keyed by service id.
    type RawService = {
      SERVICEID: string | number;
      SERVICENAME: string;
      CREDIT?: number | string;
      TIME?: string;
    };
    type RawGroup = { GROUPNAME: string; SERVICES: Record<string, RawService> };
    const list = (parsed.data.LIST ?? {}) as Record<string, RawGroup>;

    const services: ConnectorService[] = [];
    for (const group of Object.values(list)) {
      for (const service of Object.values(group.SERVICES ?? {})) {
        const credit = service.CREDIT;
        const price = typeof credit === "string" ? Number(credit) : credit;
        services.push({
          providerServiceId: String(service.SERVICEID),
          name: service.SERVICENAME,
          priceCents: typeof price === "number" && !Number.isNaN(price) ? Math.round(price * 100) : null,
          estimatedTime: service.TIME ?? null,
          category: group.GROUPNAME ?? null,
        });
      }
    }
    return services;
  }

  async submitOrder(input: SubmitOrderInput): Promise<SubmitOrderResult> {
    try {
      // The panel's order XML only has one <IMEI> tag and one <CUSTOMFIELD>
      // tag (its service list response confirms services carry at most one
      // custom field beyond the IMEI itself) - not a per-field breakdown.
      const { imei, rest } = Object.entries(input.fieldValues).reduce(
        (acc, [key, value]) => {
          if (key.toLowerCase() === "imei") acc.imei = value;
          else acc.rest[key] = value;
          return acc;
        },
        { imei: undefined as string | undefined, rest: {} as Record<string, string> },
      );
      const restValues = Object.values(rest);
      const customField =
        restValues.length === 0 ? undefined : restValues.length === 1 ? restValues[0] : JSON.stringify(rest);

      const xmlFields: Record<string, string> = { ID: input.providerServiceId, QNT: "1" };
      if (imei) xmlFields.IMEI = imei;
      if (customField !== undefined) xmlFields.CUSTOMFIELD = customField;

      const response = await this.fetchWithTimeout(
        this.url("placeimeiorder", { parameters: GsmThemeConnector.buildXmlParams(xmlFields) }),
        { method: "POST" },
        "submitOrder",
      );
      const parsed = await this.parseGsmThemeResponse(response);
      if (!parsed.ok) return parsed;

      const referenceId = parsed.data.REFERENCEID;
      if (!referenceId) return { ok: false, error: "Provider did not return an order id" };
      return { ok: true, providerOrderId: String(referenceId) };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Failed to submit order" };
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- kind is part of the shared interface; this API looks orders up by id regardless of kind
  async checkOrderStatus(providerOrderId: string, _kind: OrderKind): Promise<OrderStatusResult> {
    try {
      const response = await this.fetchWithTimeout(
        this.url("getimeiorder", { parameters: GsmThemeConnector.buildXmlParams({ ID: providerOrderId }) }),
        { method: "POST" },
        "checkOrderStatus",
      );
      const parsed = await this.parseGsmThemeResponse(response);
      if (!parsed.ok) return parsed;

      const statusCode = Number(parsed.data.STATUS);
      const statusMap: Record<number, ConnectorOrderStatus> = {
        0: "PENDING",
        1: "PROCESSING",
        3: "REJECTED",
        4: "COMPLETED",
      };
      const status = statusMap[statusCode];
      if (!status) return { ok: false, error: `Unrecognized status: ${parsed.data.STATUS}` };
      return { ok: true, status, result: (parsed.data.CODE as string | undefined) ?? null };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Failed to check order status" };
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- kind and providerOrderId are part of the shared interface; this API publishes no cancel action at all
  async cancelOrder(providerOrderId: string, _kind: OrderKind): Promise<CancelOrderResult> {
    // The published action list (accountinfo / imeiservicelist / getimeiorder
    // / getimeiorderbulk / placeimeiorder / placebulkorder) has no cancel
    // action - any other action hits the controller's default branch and
    // returns "Invalid Action". Fail immediately rather than log a call the
    // provider can never honor.
    return { ok: false, error: "This provider does not support order cancellation" };
  }
}
