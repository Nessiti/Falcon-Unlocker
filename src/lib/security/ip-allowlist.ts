import "server-only";

/**
 * IP Restrictions (future-ready, Chapter 19). Simple exact-match or
 * prefix-match against a comma/newline-separated allowlist — full CIDR
 * parsing is unnecessary complexity for what's meant to be a basic,
 * opt-in extra layer, not the primary access control (Telegram initData +
 * role checks remain that).
 */
export function isIpAllowed(ip: string, allowlist: string): boolean {
  const entries = allowlist
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (entries.length === 0) return true;
  return entries.some((entry) => ip === entry || ip.startsWith(entry));
}
