import "server-only";
import { TelegramAuthError } from "@/lib/telegram/auth";
import { getCurrentUser } from "@/lib/telegram/current-user";
import type { User } from "@/generated/prisma/client";

/**
 * Falcon Unlocker's own tenant id — the fallback every public, no-required-
 * auth read (FAQ/Help/News/About, and until Chapter 35's catalog actions,
 * the customer-facing service pages) resolves to when no visitor identity
 * is available or verifiable.
 */
export const FALLBACK_TENANT_ID = "falcon-unlocker";

/**
 * Tenant isolation (Chapter 25): every tenant-scoped admin action needs a
 * concrete tenant to scope reads/writes by. Every existing user was
 * backfilled to a tenant in Chapter 24's migration, so this should never
 * actually fire in practice — staying defensive here (a hard error) rather
 * than silently falling back to Falcon Unlocker's tenant, since a silent
 * fallback would risk writing one tenant's data into another's.
 */
export function requireTenantId(user: User): string {
  if (!user.tenantId) {
    throw new TelegramAuthError("Account has no tenant assigned");
  }
  return user.tenantId;
}

/**
 * For public, no-required-auth reads (Chapter 35: FAQ/Help/News/About)
 * whose call sites are all client components that already have initData in
 * scope. Resolves the real visitor's tenant when possible; falls back to
 * Falcon Unlocker's own tenant when initData is absent or fails to verify,
 * so an unauthenticated/edge-case call never throws and never silently
 * returns another tenant's content by guessing.
 */
export async function resolvePublicTenantId(initData?: string | null): Promise<string> {
  if (!initData) return FALLBACK_TENANT_ID;
  try {
    const user = await getCurrentUser(initData);
    return user.tenantId ?? FALLBACK_TENANT_ID;
  } catch {
    return FALLBACK_TENANT_ID;
  }
}
