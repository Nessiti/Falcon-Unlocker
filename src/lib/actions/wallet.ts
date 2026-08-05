"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/telegram/current-user";
import { requireAdmin } from "@/lib/telegram/admin";
import { TelegramAuthError } from "@/lib/telegram/auth";
import { RechargeStatus, WalletTransactionType } from "@/generated/prisma/client";

export type RechargeMethodSummary = {
  id: string;
  name: string;
  instructions: string;
  accountDetails: string | null;
  customText: string | null;
  imageUrl: string | null;
  qrCodeUrl: string | null;
};

export type RechargeOrderSummary = {
  id: string;
  amountCents: number;
  status: RechargeStatus;
  methodName: string;
  proofUrl: string | null;
  proofNote: string | null;
  createdAt: string;
};

export type WalletTransactionSummary = {
  id: string;
  type: WalletTransactionType;
  amountCents: number;
  reason: string;
  createdAt: string;
};

export type WalletData = {
  balanceCents: number;
  methods: RechargeMethodSummary[];
  rechargeOrders: RechargeOrderSummary[];
  transactions: WalletTransactionSummary[];
};

export type GetWalletDataResult = { ok: true; data: WalletData } | { ok: false; error: string };

/** Balance, recharge methods, recharge request history, and transaction history (Chapter 7). */
export async function getWalletDataAction(initData: string): Promise<GetWalletDataResult> {
  try {
    const user = await getCurrentUser(initData);

    const [methods, rechargeOrders, transactions] = await Promise.all([
      prisma.rechargeMethod.findMany({ where: { active: true }, orderBy: { displayOrder: "asc" } }),
      prisma.rechargeOrder.findMany({
        where: { userId: user.id },
        include: { method: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.walletTransaction.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return {
      ok: true,
      data: {
        balanceCents: user.balanceCents,
        methods: methods.map((method) => ({
          id: method.id,
          name: method.name,
          instructions: method.instructions,
          accountDetails: method.accountDetails,
          customText: method.customText,
          imageUrl: method.imageUrl,
          qrCodeUrl: method.qrCodeUrl,
        })),
        rechargeOrders: rechargeOrders.map((order) => ({
          id: order.id,
          amountCents: order.amountCents,
          status: order.status,
          methodName: order.method.name,
          proofUrl: order.proofUrl,
          proofNote: order.proofNote,
          createdAt: order.createdAt.toISOString(),
        })),
        transactions: transactions.map((tx) => ({
          id: tx.id,
          type: tx.type,
          amountCents: tx.amountCents,
          reason: tx.reason,
          createdAt: tx.createdAt.toISOString(),
        })),
      },
    };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to load wallet";
    return { ok: false, error: message };
  }
}

export type CreateRechargeOrderInput = {
  methodId: string;
  amountCents: number;
  proofUrl: string | null;
  proofNote: string | null;
};

export type CreateRechargeOrderResult = { ok: true } | { ok: false; error: string };

/** Step 1-2 of the manual recharge flow: customer sends proof of payment. */
export async function createRechargeOrderAction(
  initData: string,
  input: CreateRechargeOrderInput,
): Promise<CreateRechargeOrderResult> {
  try {
    const user = await getCurrentUser(initData);

    if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
      return { ok: false, error: "Enter a valid amount" };
    }

    const method = await prisma.rechargeMethod.findUnique({ where: { id: input.methodId } });
    if (!method || !method.active) {
      return { ok: false, error: "This payment method is not available" };
    }

    await prisma.rechargeOrder.create({
      data: {
        userId: user.id,
        methodId: method.id,
        amountCents: input.amountCents,
        proofUrl: input.proofUrl,
        proofNote: input.proofNote,
      },
    });

    return { ok: true };
  } catch (error) {
    const message =
      error instanceof TelegramAuthError ? error.message : "Failed to submit recharge request";
    return { ok: false, error: message };
  }
}

export type AdminRechargeOrderSummary = RechargeOrderSummary & { customerName: string };

export type GetAdminRechargeQueueResult =
  | { ok: true; orders: AdminRechargeOrderSummary[] }
  | { ok: false; error: string };

/** Step 3 (queue): pending recharge requests awaiting Admin validation. */
export async function getAdminRechargeQueueAction(
  initData: string,
): Promise<GetAdminRechargeQueueResult> {
  try {
    await requireAdmin(initData);

    const orders = await prisma.rechargeOrder.findMany({
      where: { status: RechargeStatus.PENDING },
      include: { method: true, user: true },
      orderBy: { createdAt: "asc" },
    });

    return {
      ok: true,
      orders: orders.map((order) => ({
        id: order.id,
        amountCents: order.amountCents,
        status: order.status,
        methodName: order.method.name,
        proofUrl: order.proofUrl,
        proofNote: order.proofNote,
        createdAt: order.createdAt.toISOString(),
        customerName: [order.user.firstName, order.user.lastName].filter(Boolean).join(" "),
      })),
    };
  } catch (error) {
    const message =
      error instanceof TelegramAuthError ? error.message : "Failed to load recharge queue";
    return { ok: false, error: message };
  }
}

export type ReviewRechargeOrderInput = {
  rechargeOrderId: string;
  decision: "APPROVED" | "REJECTED";
};

export type ReviewRechargeOrderResult = { ok: true } | { ok: false; error: string };

/** Steps 3-4: Admin validates the proof, and approval credits the balance. */
export async function reviewRechargeOrderAction(
  initData: string,
  input: ReviewRechargeOrderInput,
): Promise<ReviewRechargeOrderResult> {
  try {
    const admin = await requireAdmin(initData);

    await prisma.$transaction(async (tx) => {
      const order = await tx.rechargeOrder.findUnique({ where: { id: input.rechargeOrderId } });
      if (!order || order.status !== RechargeStatus.PENDING) {
        throw new Error("ORDER_NOT_PENDING");
      }

      await tx.rechargeOrder.update({
        where: { id: order.id },
        data: {
          status: input.decision === "APPROVED" ? RechargeStatus.APPROVED : RechargeStatus.REJECTED,
          reviewedAt: new Date(),
          reviewedById: admin.id,
        },
      });

      if (input.decision === "APPROVED") {
        await tx.user.update({
          where: { id: order.userId },
          data: { balanceCents: { increment: order.amountCents } },
        });

        await tx.walletTransaction.create({
          data: {
            userId: order.userId,
            type: WalletTransactionType.CREDIT,
            amountCents: order.amountCents,
            reason: "Recharge approved",
            rechargeOrderId: order.id,
          },
        });
      }
    });

    return { ok: true };
  } catch (error) {
    if (error instanceof Error && error.message === "ORDER_NOT_PENDING") {
      return { ok: false, error: "This request was already reviewed" };
    }
    const message =
      error instanceof TelegramAuthError ? error.message : "Failed to review request";
    return { ok: false, error: message };
  }
}
