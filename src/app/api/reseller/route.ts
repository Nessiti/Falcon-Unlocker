import { NextResponse, type NextRequest } from "next/server";
import { authenticateResellerApi } from "@/lib/reseller-api/auth";
import { parseParameters, field } from "@/lib/reseller-api/params";
import { errorEnvelope } from "@/lib/reseller-api/format";
import {
  accountInfo,
  serviceList,
  getOrder,
  getOrderBulk,
  placeOrder,
  placeOrderBulk,
} from "@/lib/reseller-api/actions";

const RESPONSE_HEADERS = {
  "X-Powered-By": "Falcon-Unlocker",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
};

async function readBody(request: NextRequest): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    try {
      return await request.json();
    } catch {
      return {};
    }
  }

  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    return Object.fromEntries(form.entries());
  }

  const text = await request.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

/**
 * DHRU/GSM Theme-style public reseller API (vision: interop with the
 * existing GSM reseller ecosystem). A tenant's own customer, given an API
 * key generated for their account (Admin -> Users), can place orders and
 * check status programmatically - the same six actions that standard
 * exposes, spending from that same account's own wallet balance and
 * limited to that tenant's own catalog. See src/lib/reseller-api/ for the
 * implementation of each action.
 */
async function handle(request: NextRequest): Promise<NextResponse> {
  // GET carries everything in the query string; POST may still repeat
  // params there, so both are read either way.
  const body = request.method === "GET" ? {} : await readBody(request);
  const url = request.nextUrl;

  const param = (...names: string[]): string | null => {
    const fromBody = field(body, ...names);
    if (fromBody) return fromBody;
    for (const name of names) {
      const fromQuery = url.searchParams.get(name);
      if (fromQuery) return fromQuery;
    }
    return null;
  };

  const action = (param("action") ?? "").toLowerCase();
  // `username` + `apiaccesskey` are what real DHRU/GSM Theme client software
  // sends - our own outbound connectors send exactly those names to
  // providers, which is the proof of what the ecosystem expects. Accepting
  // only apikey/apisecret meant a standard reseller panel pointed at this
  // endpoint failed authentication with no obvious reason.
  const key = param("apikey", "key", "username", "user");
  const secret = param("apisecret", "secret", "apiaccesskey", "apiaccess");

  const auth = await authenticateResellerApi(key ?? null, secret ?? null);
  if (!auth.ok) {
    return NextResponse.json(errorEnvelope(auth.error), { status: 401, headers: RESPONSE_HEADERS });
  }
  const { context } = auth;

  const params = parseParameters(body.parameters ?? url.searchParams.get("parameters"));

  try {
    switch (action) {
      case "accountinfo":
        return NextResponse.json(await accountInfo(context), { headers: RESPONSE_HEADERS });

      case "imeiservicelist":
        return NextResponse.json(await serviceList(context.tenantId), { headers: RESPONSE_HEADERS });

      case "getimeiorder": {
        const referenceId = field(params, "ID", "REFERENCEID", "id");
        if (!referenceId) {
          return NextResponse.json(errorEnvelope("Missing ID"), { status: 400, headers: RESPONSE_HEADERS });
        }
        return NextResponse.json(await getOrder(context, referenceId), { headers: RESPONSE_HEADERS });
      }

      case "getimeiorderbulk": {
        const ids = Array.isArray(params) ? params : (params.IDS ?? params.ids ?? []);
        return NextResponse.json(await getOrderBulk(context, (ids as unknown[]).map(String)), {
          headers: RESPONSE_HEADERS,
        });
      }

      case "placeimeiorder":
        return NextResponse.json(await placeOrder(context, params), { headers: RESPONSE_HEADERS });

      case "placebulkorder": {
        const orders = Array.isArray(params) ? params : [];
        return NextResponse.json(await placeOrderBulk(context, orders as Record<string, unknown>[]), {
          headers: RESPONSE_HEADERS,
        });
      }

      default:
        return NextResponse.json(errorEnvelope("Unknown action"), { status: 400, headers: RESPONSE_HEADERS });
    }
  } catch (error) {
    console.error("[reseller-api] action failed", action, error);
    return NextResponse.json(errorEnvelope("Request failed"), { status: 500, headers: RESPONSE_HEADERS });
  }
}

/**
 * Both verbs hit the same handler: the DHRU convention is loose about which
 * one a client uses (our own DHRU connector GETs for balance/services and
 * POSTs for orders), so accepting only POST would reject perfectly standard
 * integrations with a bare 405.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  return handle(request);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return handle(request);
}
