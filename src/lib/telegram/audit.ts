import "server-only";
import { prisma } from "@/lib/prisma";

/** Records an admin action (Chapter 11: Logs). */
export async function logAdminAction(actorId: string, action: string, details?: string) {
  await prisma.auditLog.create({ data: { actorId, action, details } });
}
