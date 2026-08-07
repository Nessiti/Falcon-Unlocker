import "server-only";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/telegram/current-user";
import { TelegramAuthError } from "@/lib/telegram/auth";
import { getClientIp } from "@/lib/security/client-ip";
import { isIpAllowed } from "@/lib/security/ip-allowlist";
import { Role, type User } from "@/generated/prisma/client";

/**
 * IP Restrictions (future-ready, Chapter 19): a no-op until an admin fills
 * in SecuritySettings.adminIpAllowlist - the safe default so nobody locks
 * themselves out by leaving it unconfigured.
 */
async function enforceIpAllowlist(): Promise<void> {
  const settings = await prisma.securitySettings.findUnique({ where: { id: "singleton" } });
  const allowlist = settings?.adminIpAllowlist?.trim();
  if (!allowlist) return;

  const ip = await getClientIp();
  if (!ip || !isIpAllowed(ip, allowlist)) {
    throw new TelegramAuthError("Access denied from this network");
  }
}

/**
 * Verifies initData and requires the matching account to have the Admin
 * role. Shared by every "Created by Admin only" rule (Chapters 4, 5, 11).
 * SUPER_ADMIN (multi-tenant foundation) also passes - it's a superset of
 * tenant-admin access, not a disjoint role.
 */
export async function requireAdmin(initData: string): Promise<User> {
  const user = await getCurrentUser(initData);
  if (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN) {
    throw new TelegramAuthError("Admin access required");
  }
  await enforceIpAllowlist();
  return user;
}

/**
 * Verifies initData and requires the matching account to be staff
 * (Admin, Moderator, or Super Admin). Used for the Admin Panel's read/operate
 * access, while Admin-only actions (e.g. promoting other staff) use requireAdmin.
 */
export async function requireStaff(initData: string): Promise<User> {
  const user = await getCurrentUser(initData);
  if (user.role !== Role.ADMIN && user.role !== Role.MODERATOR && user.role !== Role.SUPER_ADMIN) {
    throw new TelegramAuthError("Staff access required");
  }
  await enforceIpAllowlist();
  return user;
}

/**
 * Verifies initData and requires the matching account to be the platform's
 * Super Admin (multi-tenant foundation) - the one role above every tenant's
 * own Admin, gating platform-wide actions like creating/suspending brands.
 */
export async function requireSuperAdmin(initData: string): Promise<User> {
  const user = await getCurrentUser(initData);
  if (user.role !== Role.SUPER_ADMIN) {
    throw new TelegramAuthError("Super Admin access required");
  }
  await enforceIpAllowlist();
  return user;
}
