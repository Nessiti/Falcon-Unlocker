"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/telegram/admin";
import { TelegramAuthError } from "@/lib/telegram/auth";

const ABOUT_PAGE_ID = "about";

/** About content is public read, editable from the Admin panel (Chapter 10). Singleton row. */
export async function getAboutAction(): Promise<string> {
  const page = await prisma.aboutPage.findUnique({ where: { id: ABOUT_PAGE_ID } });
  return page?.content ?? "";
}

export type UpdateAboutResult = { ok: true } | { ok: false; error: string };

export async function updateAboutAction(
  initData: string,
  content: string,
): Promise<UpdateAboutResult> {
  try {
    await requireAdmin(initData);

    await prisma.aboutPage.upsert({
      where: { id: ABOUT_PAGE_ID },
      update: { content },
      create: { id: ABOUT_PAGE_ID, content },
    });

    return { ok: true };
  } catch (error) {
    const message =
      error instanceof TelegramAuthError ? error.message : "Failed to update About content";
    return { ok: false, error: message };
  }
}
