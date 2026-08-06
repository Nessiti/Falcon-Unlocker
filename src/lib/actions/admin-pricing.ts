"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/telegram/admin";
import { TelegramAuthError } from "@/lib/telegram/auth";

export type PricingSettingsData = {
  defaultMarginPercent: number | null;
  defaultMarginCents: number | null;
};

export type GetPricingSettingsResult =
  | { ok: true; settings: PricingSettingsData }
  | { ok: false; error: string };

/** Default margin (Chapter 22) applied to a provider's cost when suggesting a selling price. */
export async function getPricingSettingsAction(initData: string): Promise<GetPricingSettingsResult> {
  try {
    await requireAdmin(initData);
    const settings = await prisma.pricingSettings.findUnique({ where: { id: "singleton" } });
    return {
      ok: true,
      settings: {
        defaultMarginPercent: settings?.defaultMarginPercent ?? null,
        defaultMarginCents: settings?.defaultMarginCents ?? null,
      },
    };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to load pricing settings";
    return { ok: false, error: message };
  }
}

export type UpdatePricingSettingsResult = { ok: true } | { ok: false; error: string };

export async function updatePricingSettingsAction(
  initData: string,
  input: PricingSettingsData,
): Promise<UpdatePricingSettingsResult> {
  try {
    await requireAdmin(initData);

    if (input.defaultMarginPercent != null && input.defaultMarginPercent < 0) {
      return { ok: false, error: "Margin percent can't be negative" };
    }

    await prisma.pricingSettings.upsert({
      where: { id: "singleton" },
      update: {
        defaultMarginPercent: input.defaultMarginPercent,
        defaultMarginCents: input.defaultMarginCents,
      },
      create: {
        id: "singleton",
        defaultMarginPercent: input.defaultMarginPercent,
        defaultMarginCents: input.defaultMarginCents,
      },
    });

    return { ok: true };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to save pricing settings";
    return { ok: false, error: message };
  }
}
