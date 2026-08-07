import { XMLParser } from "fast-xml-parser";

const xmlParser = new XMLParser({ ignoreAttributes: true });

/**
 * The DHRU/GSM Theme standard sends `parameters` as XML for single-item
 * actions and base64-encoded JSON for bulk ones. Accepting all three forms
 * here (raw JSON, base64 JSON, or XML) covers both that convention and the
 * common case of an integrator just POSTing JSON directly, without the
 * caller needing to know which action expects which encoding.
 */
export function parseParameters(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object") return raw as Record<string, unknown>;
  if (typeof raw !== "string" || raw.trim() === "") return {};

  const text = raw.trim();

  if (text.startsWith("{") || text.startsWith("[")) {
    try {
      return JSON.parse(text);
    } catch {
      // Fall through to the other encodings.
    }
  }

  if (text.startsWith("<")) {
    try {
      const parsed = xmlParser.parse(text) as Record<string, unknown>;
      const root = parsed.PARAMETERS ?? parsed.parameters ?? parsed;
      return root as Record<string, unknown>;
    } catch {
      // Fall through to base64.
    }
  }

  try {
    const decoded = Buffer.from(text, "base64").toString("utf-8");
    return JSON.parse(decoded);
  } catch {
    return {};
  }
}

/** Reads a string field case-insensitively (DHRU-style params use ALLCAPS keys). */
export function field(params: Record<string, unknown>, ...names: string[]): string | undefined {
  for (const name of names) {
    const value = params[name];
    if (value !== undefined && value !== null) return String(value);
  }
  return undefined;
}
