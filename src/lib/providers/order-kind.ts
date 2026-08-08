import type { OrderKind } from "./types";

/**
 * Reads a provider's own service-type label into Falcon's OrderKind, or null
 * when it says nothing recognizable. Panels spell it several ways in the same
 * catalog (`GROUPTYPE` on the group, `SERVICETYPE` on the service, sometimes
 * "Server"/"server"), and a wrong guess is worse than no guess: an unknown
 * kind leaves the service selectable everywhere, while a wrong one hides it
 * from the only screen where it belongs.
 */
export function parseOrderKind(value: unknown): OrderKind | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  if (normalized === "IMEI") return "IMEI";
  if (normalized === "SERVER") return "SERVER";
  return null;
}
