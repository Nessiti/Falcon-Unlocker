"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/telegram/admin";
import { requireTenantId } from "@/lib/telegram/tenant";
import { TelegramAuthError } from "@/lib/telegram/auth";

/**
 * About content is public read, editable from the Admin panel (Chapter 10).
 * getAboutAction isn't tenant-scoped yet — same blocker as listFaqAction (no
 * request-time identity to scope by). updateAboutAction below is scoped:
 * before Chapter 31 this was a single platform-wide row (fixed id: "about"),
 * so any tenant's admin could overwrite every other tenant's About page —
 * now one row per tenant, same pattern as PricingSettings (Chapter 28).
 */
export async function getAboutAction(): Promise<string> {
  const page = await prisma.aboutPage.findUnique({ where: { tenantId: "falcon-unlocker" } });
  return page?.content ?? "";
}

export type UpdateAboutResult = { ok: true } | { ok: false; error: string };

export async function updateAboutAction(
  initData: string,
  content: string,
): Promise<UpdateAboutResult> {
  try {
    const admin = await requireAdmin(initData);
    const tenantId = requireTenantId(admin);

    await prisma.aboutPage.upsert({
      where: { tenantId },
      update: { content },
      create: { tenantId, content },
    });

    return { ok: true };
  } catch (error) {
    const message =
      error instanceof TelegramAuthError ? error.message : "Failed to update About content";
    return { ok: false, error: message };
  }
}
