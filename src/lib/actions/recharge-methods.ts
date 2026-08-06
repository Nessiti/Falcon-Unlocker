"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/telegram/admin";
import { TelegramAuthError } from "@/lib/telegram/auth";
import { RechargeContactType } from "@/generated/prisma/client";

export type CreateRechargeMethodInput = {
  name: string;
  instructions: string;
  accountDetails: string | null;
  customText: string | null;
  imageUrl: string | null;
  qrCodeUrl: string | null;
  displayOrder: number;
  contactType: RechargeContactType | null;
  contactValue: string | null;
};

export type CreateRechargeMethodResult = { ok: true } | { ok: false; error: string };

/** Recharge methods (Instructions, account details, images, QR codes) are Admin-configured (Chapter 7). */
export async function createRechargeMethodAction(
  initData: string,
  input: CreateRechargeMethodInput,
): Promise<CreateRechargeMethodResult> {
  try {
    await requireAdmin(initData);

    const name = input.name.trim();
    const instructions = input.instructions.trim();
    if (!name) return { ok: false, error: "Name is required" };
    if (!instructions) return { ok: false, error: "Instructions are required" };

    const contactValue = input.contactValue?.trim() || null;
    if (input.contactType && !contactValue) {
      return { ok: false, error: "Enter a contact number/username for the selected contact type" };
    }

    await prisma.rechargeMethod.create({
      data: {
        name,
        instructions,
        accountDetails: input.accountDetails?.trim() || null,
        customText: input.customText?.trim() || null,
        imageUrl: input.imageUrl?.trim() || null,
        qrCodeUrl: input.qrCodeUrl?.trim() || null,
        displayOrder: input.displayOrder,
        contactType: input.contactType,
        contactValue,
      },
    });

    return { ok: true };
  } catch (error) {
    const message =
      error instanceof TelegramAuthError ? error.message : "Failed to create recharge method";
    return { ok: false, error: message };
  }
}
