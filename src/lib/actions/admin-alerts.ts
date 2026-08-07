"use server";

import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/telegram/admin";
import { requireTenantId } from "@/lib/telegram/tenant";
import { TelegramAuthError } from "@/lib/telegram/auth";
import { OrderStatus, RechargeStatus, TicketStatus } from "@/generated/prisma/client";

export type AdminAlertCounts = {
  newOrders: number;
  newTickets: number;
  newRecharges: number;
  total: number;
};

export type GetAdminAlertsResult = { ok: true; alerts: AdminAlertCounts } | { ok: false; error: string };

/**
 * Powers the live "new request" badges (Sidebar/AdminNav/notification bell):
 * the same DB state that triggers a bot notification to staff (Chapter 9)
 * - a freshly placed order, an unanswered support ticket, a submitted
 * recharge proof - polled from the client so the webapp reflects it too,
 * without the admin needing to check Telegram. Scoped to the staff member's
 * own tenant (Chapter 30) - previously counted every tenant's activity
 * together, so a brand's badge could light up from a completely different
 * brand's orders/tickets/recharges.
 */
export async function getAdminAlertsAction(initData: string): Promise<GetAdminAlertsResult> {
  try {
    const staff = await requireStaff(initData);
    const tenantId = requireTenantId(staff);

    const [pendingImei, pendingServer, openTickets, pendingRecharges] = await Promise.all([
      prisma.imeiOrder.count({ where: { tenantId, status: OrderStatus.PENDING } }),
      prisma.serverOrder.count({ where: { tenantId, status: OrderStatus.PENDING } }),
      prisma.supportTicket.count({ where: { status: TicketStatus.OPEN, user: { tenantId } } }),
      prisma.rechargeOrder.count({ where: { tenantId, status: RechargeStatus.PENDING } }),
    ]);

    const newOrders = pendingImei + pendingServer;
    return {
      ok: true,
      alerts: {
        newOrders,
        newTickets: openTickets,
        newRecharges: pendingRecharges,
        total: newOrders + openTickets + pendingRecharges,
      },
    };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to load alerts";
    return { ok: false, error: message };
  }
}
