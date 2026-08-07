import "server-only";
import { TelegramAuthError } from "@/lib/telegram/auth";
import type { User } from "@/generated/prisma/client";

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
