"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/telegram/admin";
import { requireTenantId } from "@/lib/telegram/tenant";
import { TelegramAuthError } from "@/lib/telegram/auth";

export type FaqItemSummary = {
  id: string;
  question: string;
  answer: string;
};

/**
 * FAQ is public read content, editable from the Admin panel (Chapter 10).
 * Hardcoded to the Falcon Unlocker tenant: this has no initData/request-time
 * identity to resolve the real tenant from, the same blocker as the /imei
 * /server catalog pages (Chapter 25) — needs bot->tenant resolution first.
 * Hardcoding (rather than returning every tenant's FAQ unfiltered) keeps
 * today's behavior exactly correct and never leaks a second tenant's
 * content the moment one exists, at the cost of only Falcon's own FAQ
 * showing until that chapter lands.
 */
export async function listFaqAction(): Promise<FaqItemSummary[]> {
  const items = await prisma.faqItem.findMany({
    where: { tenantId: "falcon-unlocker" },
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
