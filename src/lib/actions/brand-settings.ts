"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/telegram/admin";
import { requireTenantId } from "@/lib/telegram/tenant";
import { TelegramAuthError } from "@/lib/telegram/auth";
import { logAdminAction } from "@/lib/telegram/audit";

export type BrandSettings = {
  name: string;
  logoUrl: string | null;
  primaryColor: string | null;
  currency: string;
  country: string | null;
  language: string;
};

export type GetBrandSettingsResult =
  | { ok: true; settings: BrandSettings }
  | { ok: false; error: string };

/**
 * Brand Settings: the tenant's own presentation/locale choices - logo,
 * colors, currency, country, language. Deliberately NOT Super Admin
 * territory (that's only name/bot connection/owner, set once at brand
 * creation in admin-tenants.ts) - every brand configures its own look and
 * locale itself, the same way any tenant admin manages their own catalog.
 */
export async function getBrandSettingsAction(initData: string): Promise<GetBrandSettingsResult> {
  try {
    const admin = await requireAdmin(initData);
    const tenantId = requireTenantId(admin);

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) return { ok: false, error: "Tenant not found" };

    return {
      ok: true,
      settings: {
        name: tenant.name,
        logoUrl: tenant.logoUrl,
        primaryColor: tenant.primaryColor,
        currency: tenant.currency,
        country: tenant.country,
        language: tenant.language,
      },
    };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to load brand settings";
    return { ok: false, error: message };
  }
}

export type UpdateBrandSettingsInput = {
  logoUrl: string | null;
  primaryColor: string | null;
  currency: string;
  country: string | null;
  language: string;
};

export type UpdateBrandSettingsResult = { ok: true } | { ok: false; error: string };

export async function updateBrandSettingsAction(
  initData: string,
  input: UpdateBrandSettingsInput,
): Promise<UpdateBrandSettingsResult> {
  try {
    const admin = await requireAdmin(initData);
    const tenantId = requireTenantId(admin);

    const currency = input.currency.trim();
    const language = input.language.trim();
    if (!currency) return { ok: false, error: "Currency is required" };
    if (!language) return { ok: false, error: "Language is required" };

    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        logoUrl: input.logoUrl?.trim() || null,
        primaryColor: input.primaryColor?.trim() || null,
        currency,
        country: input.country?.trim() || null,
        language,
      },
    });

    await logAdminAction(admin.id, "brand.settings", `currency=${currency} language=${language}`);
    return { ok: true };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to update brand settings";
    return { ok: false, error: message };
  }
}
