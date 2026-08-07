"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/telegram/admin";
import { requireTenantId, resolvePublicTenantId } from "@/lib/telegram/tenant";
import { TelegramAuthError } from "@/lib/telegram/auth";

/**
 * About content is public read, editable from the Admin panel (Chapter 10).
 * getAboutAction is scoped to the caller's own tenant (Chapter 35), resolved
 * from initData. updateAboutAction below was already scoped in Chapter 31:
 * before that this was a single platform-wide row (fixed id: "about"), so
 * any tenant's admin could overwrite every other tenant's About page — now
 * one row per tenant, same pattern as PricingSettings (Chapter 28).
 */
export async function getAboutAction(initData?: string | null): Promise<string> {
  const tenantId = await resolvePublicTenantId(initData);
  const page = await prisma.aboutPage.findUnique({ where: { tenantId } });
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
