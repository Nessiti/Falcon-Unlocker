"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/telegram/admin";
import { TelegramAuthError } from "@/lib/telegram/auth";

export type FaqItemSummary = {
  id: string;
  question: string;
  answer: string;
};

/** FAQ is public read content, editable from the Admin panel (Chapter 10). */
export async function listFaqAction(): Promise<FaqItemSummary[]> {
  const items = await prisma.faqItem.findMany({ orderBy: { displayOrder: "asc" } });
  return items.map((item) => ({ id: item.id, question: item.question, answer: item.answer }));
}

export type CreateFaqInput = { question: string; answer: string; displayOrder: number };
export type CreateFaqResult = { ok: true } | { ok: false; error: string };

export async function createFaqAction(
  initData: string,
  input: CreateFaqInput,
): Promise<CreateFaqResult> {
  try {
    await requireAdmin(initData);

    const question = input.question.trim();
    const answer = input.answer.trim();
    if (!question) return { ok: false, error: "Question is required" };
    if (!answer) return { ok: false, error: "Answer is required" };

    await prisma.faqItem.create({
      data: { question, answer, displayOrder: input.displayOrder },
    });

    return { ok: true };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to add FAQ";
    return { ok: false, error: message };
  }
}
