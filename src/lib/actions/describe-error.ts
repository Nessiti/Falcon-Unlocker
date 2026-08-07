import { TelegramAuthError } from "@/lib/telegram/auth";

/**
 * Shared by every admin/staff-only server action's catch block. Admin
 * surfaces are safe to show the real error detail on (Prisma message, etc.)
 * instead of a generic string with nothing to act on - customer-facing
 * actions should keep using their own generic fallback instead of this.
 * Always logs server-side too, for anything that also needs a stack trace.
 */
export function describeActionError(error: unknown, fallback: string, logTag: string): string {
  if (error instanceof TelegramAuthError) return error.message;
  console.error(`[${logTag}] ${fallback}`, error);
  const detail = error instanceof Error ? error.message : String(error);
  return `${fallback}: ${detail}`;
}
