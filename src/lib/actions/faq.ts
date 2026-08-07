"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/telegram/admin";
import { requireTenantId, resolvePublicTenantId } from "@/lib/telegram/tenant";
import { TelegramAuthError } from "@/lib/telegram/auth";

export type FaqItemSummary = {
  id: string;
  question: string;
  answer: string;
};

/**
 * FAQ is public read content, editable from the Admin panel (Chapter 10).
 * Scoped to the caller's own tenant (Chapter 35), resolved from initData -
 * every call site is a client component that already has it in scope, so
 * this is real resolution, not the Chapter 31 hardcoded-to-Falcon stopgap.
 */
export async function listFaqAction(initData?: string | null): Promise<FaqItemSummary[]> {
  const tenantId = await resolvePublicTenantId(initData);
  const items = await prisma.faqItem.findMany({
    where: { tenantId },
    orderBy: { displayOrder: "asc" },
  });
  return items.map((item) => ({ id: item.id, question: item.question, answer: item.answer }));
}

export type CreateFaqInput = { question: string; answer: string; displayOrder: number };
export type CreateFaqResult = { ok: true } | { ok: false; error: string };

export async function createFaqAction(
  initData: string,
  input: CreateFaqInput,
): Promise<CreateFaqResult> {
  try {
    const admin = await requireAdmin(initData);
    const tenantId = requireTenantId(admin);

    const question = input.question.trim();
    const answer = input.answer.trim();
    if (!question) return { ok: false, error: "Question is required" };
    if (!answer) return { ok: false, error: "Answer is required" };

    await prisma.faqItem.create({
      data: { question, answer, displayOrder: input.displayOrder, tenantId },
    });

    return { ok: true };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to add FAQ";
    return { ok: false, error: message };
  }
}
