"use server";

import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/telegram/admin";
import { TelegramAuthError } from "@/lib/telegram/auth";

export type AuditLogSummary = {
  id: string;
  action: string;
  details: string | null;
  actorName: string;
  createdAt: string;
};

export type ListAuditLogsResult =
  | { ok: true; logs: AuditLogSummary[] }
  | { ok: false; error: string };

/** Logs (Chapter 11): recent admin actions. */
export async function listAuditLogsAction(initData: string): Promise<ListAuditLogsResult> {
  try {
    await requireStaff(initData);

    const logs = await prisma.auditLog.findMany({
      include: { actor: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return {
      ok: true,
      logs: logs.map((log) => ({
        id: log.id,
        action: log.action,
        details: log.details,
        actorName: [log.actor.firstName, log.actor.lastName].filter(Boolean).join(" "),
        createdAt: log.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to load logs";
    return { ok: false, error: message };
  }
}
