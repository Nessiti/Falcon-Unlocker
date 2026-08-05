import "server-only";
import { getCurrentUser } from "@/lib/telegram/current-user";
import { TelegramAuthError } from "@/lib/telegram/auth";
import { Role, type User } from "@/generated/prisma/client";

/**
 * Verifies initData and requires the matching account to have the Admin
 * role. Shared by every "Created by Admin only" rule (Chapters 4, 5, 11).
 */
export async function requireAdmin(initData: string): Promise<User> {
  const user = await getCurrentUser(initData);
  if (user.role !== Role.ADMIN) {
    throw new TelegramAuthError("Admin access required");
  }
  return user;
}

/**
 * Verifies initData and requires the matching account to be staff
 * (Admin or Moderator). Used for the Admin Panel's read/operate access,
 * while Admin-only actions (e.g. promoting other staff) use requireAdmin.
 */
export async function requireStaff(initData: string): Promise<User> {
  const user = await getCurrentUser(initData);
  if (user.role !== Role.ADMIN && user.role !== Role.MODERATOR) {
    throw new TelegramAuthError("Staff access required");
  }
  return user;
}
