"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin, requireStaff } from "@/lib/telegram/admin";
import { TelegramAuthError } from "@/lib/telegram/auth";
import { logAdminAction } from "@/lib/telegram/audit";
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

export type AdminRechargeMethodDetail = {
  id: string;
  name: string;
  instructions: string;
  accountDetails: string | null;
  customText: string | null;
  imageUrl: string | null;
  qrCodeUrl: string | null;
  displayOrder: number;
  active: boolean;
  contactType: RechargeContactType | null;
  contactValue: string | null;
};

export type ListAllRechargeMethodsResult =
  | { ok: true; methods: AdminRechargeMethodDetail[] }
  | { ok: false; error: string };

/** Admin view of every recharge method, including inactive ones customers don't see. */
export async function listAllRechargeMethodsAction(
  initData: string,
): Promise<ListAllRechargeMethodsResult> {
  try {
    await requireStaff(initData);

    const methods = await prisma.rechargeMethod.findMany({ orderBy: { displayOrder: "asc" } });

    return {
      ok: true,
      methods: methods.map((method) => ({
        id: method.id,
        name: method.name,
        instructions: method.instructions,
        accountDetails: method.accountDetails,
        customText: method.customText,
        imageUrl: method.imageUrl,
        qrCodeUrl: method.qrCodeUrl,
        displayOrder: method.displayOrder,
        active: method.active,
        contactType: method.contactType,
        contactValue: method.contactValue,
      })),
    };
  } catch (error) {
    const message =
      error instanceof TelegramAuthError ? error.message : "Failed to load recharge methods";
    return { ok: false, error: message };
  }
}

export type UpdateRechargeMethodInput = CreateRechargeMethodInput;
export type UpdateRechargeMethodResult = { ok: true } | { ok: false; error: string };

/** Edits an existing recharge method's instructions, contact, etc. */
export async function updateRechargeMethodAction(
  initData: string,
  methodId: string,
  input: UpdateRechargeMethodInput,
): Promise<UpdateRechargeMethodResult> {
  try {
    const admin = await requireAdmin(initData);

    const name = input.name.trim();
    const instructions = input.instructions.trim();
    if (!name) return { ok: false, error: "Name is required" };
    if (!instructions) return { ok: false, error: "Instructions are required" };

    const contactValue = input.contactValue?.trim() || null;
    if (input.contactType && !contactValue) {
      return { ok: false, error: "Enter a contact number/username for the selected contact type" };
    }

    await prisma.rechargeMethod.update({
      where: { id: methodId },
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

    await logAdminAction(admin.id, "recharge-method.update", name);
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof TelegramAuthError ? error.message : "Failed to update recharge method";
    return { ok: false, error: message };
  }
}

export type SetRechargeMethodActiveResult = { ok: true } | { ok: false; error: string };

/** Activate / Deactivate a recharge method (hides it from customers without deleting it). */
export async function setRechargeMethodActiveAction(
  initData: string,
  methodId: string,
  active: boolean,
): Promise<SetRechargeMethodActiveResult> {
  try {
    const admin = await requireAdmin(initData);
    const method = await prisma.rechargeMethod.update({ where: { id: methodId }, data: { active } });
    await logAdminAction(admin.id, "recharge-method.status", `${method.name} -> ${active ? "active" : "inactive"}`);
    return { ok: true };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to update status";
    return { ok: false, error: message };
  }
}

export type DeleteRechargeMethodResult = { ok: true } | { ok: false; error: string };

export async function deleteRechargeMethodAction(
  initData: string,
  methodId: string,
): Promise<DeleteRechargeMethodResult> {
  try {
    const admin = await requireAdmin(initData);
    const method = await prisma.rechargeMethod.delete({ where: { id: methodId } });
    await logAdminAction(admin.id, "recharge-method.delete", method.name);
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "Failed to delete method (it may still have recharge requests referencing it)",
    };
  }
}
