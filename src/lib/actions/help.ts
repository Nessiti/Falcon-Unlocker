"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/telegram/admin";
import { requireTenantId } from "@/lib/telegram/tenant";
import { TelegramAuthError } from "@/lib/telegram/auth";

export type HelpArticleSummary = {
  id: string;
  title: string;
  body: string;
};

/**
 * Help articles are public read content, editable from the Admin panel
 * (Chapter 10). Hardcoded to the Falcon Unlocker tenant, same reasoning as
 * listFaqAction above.
 */
export async function listHelpArticlesAction(): Promise<HelpArticleSummary[]> {
  const articles = await prisma.helpArticle.findMany({
    where: { tenantId: "falcon-unlocker" },
    orderBy: { displayOrder: "asc" },
  });
  return articles.map((article) => ({ id: article.id, title: article.title, body: article.body }));
}

export type CreateHelpArticleInput = { title: string; body: string; displayOrder: number };
export type CreateHelpArticleResult = { ok: true } | { ok: false; error: string };

export async function createHelpArticleAction(
  initData: string,
  input: CreateHelpArticleInput,
): Promise<CreateHelpArticleResult> {
  try {
    const admin = await requireAdmin(initData);
    const tenantId = requireTenantId(admin);

    const title = input.title.trim();
    const body = input.body.trim();
    if (!title) return { ok: false, error: "Title is required" };
    if (!body) return { ok: false, error: "Body is required" };

    await prisma.helpArticle.create({
      data: { title, body, displayOrder: input.displayOrder, tenantId },
    });

    return { ok: true };
  } catch (error) {
    const message =
      error instanceof TelegramAuthError ? error.message : "Failed to add help article";
    return { ok: false, error: message };
  }
}
