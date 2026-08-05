"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/telegram/admin";
import { TelegramAuthError } from "@/lib/telegram/auth";
import { ServiceBadge, ServiceFieldType, ServiceStatus } from "@/generated/prisma/client";

export type CreateImeiServiceField = {
  label: string;
  type: ServiceFieldType;
  options: string | null;
  required: boolean;
  displayOrder: number;
};

export type CreateImeiServiceInput = {
  name: string;
  priceCents: number;
  description: string;
  estimatedTime: string;
  status: ServiceStatus;
  badge: ServiceBadge | null;
  imageUrl: string | null;
  categoryName: string | null;
  displayOrder: number;
  fields: CreateImeiServiceField[];
};

export type CreateImeiServiceResult = { ok: true } | { ok: false; error: string };

/** IMEI services are "Created by Admin only" (Chapter 4). */
export async function createImeiServiceAction(
  initData: string,
  input: CreateImeiServiceInput,
): Promise<CreateImeiServiceResult> {
  try {
    await requireAdmin(initData);

    const name = input.name.trim();
    if (!name) return { ok: false, error: "Name is required" };
    if (!Number.isInteger(input.priceCents) || input.priceCents < 0) {
      return { ok: false, error: "Price must be a positive amount" };
    }

    const categoryName = input.categoryName?.trim() || null;

    await prisma.$transaction(async (tx) => {
      const categoryId = categoryName
        ? (
            await tx.category.upsert({
              where: { name: categoryName },
              update: {},
              create: { name: categoryName },
            })
          ).id
        : null;

      await tx.imeiService.create({
        data: {
          name,
          priceCents: input.priceCents,
          description: input.description.trim(),
          estimatedTime: input.estimatedTime.trim(),
          status: input.status,
          badge: input.badge,
          imageUrl: input.imageUrl?.trim() || null,
          displayOrder: input.displayOrder,
          categoryId,
          fields: {
            create: input.fields
              .filter((field) => field.label.trim())
              .map((field) => ({
                label: field.label.trim(),
                type: field.type,
                options: field.type === ServiceFieldType.SELECT ? field.options : null,
                required: field.required,
                displayOrder: field.displayOrder,
              })),
          },
        },
      });
    });

    return { ok: true };
  } catch (error) {
    const message =
      error instanceof TelegramAuthError ? error.message : "Failed to create service";
    return { ok: false, error: message };
  }
}
