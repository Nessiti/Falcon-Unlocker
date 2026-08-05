"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin, requireStaff } from "@/lib/telegram/admin";
import { TelegramAuthError } from "@/lib/telegram/auth";
import { logAdminAction } from "@/lib/telegram/audit";
import { ServiceBadge, ServiceFieldType, ServiceStatus } from "@/generated/prisma/client";

export type CreateImeiServiceField = {
  label: string;
  type: ServiceFieldType;
  options: string | null;
  /// Regex validation, placeholder and default value (Chapter 11 Form Generator).
  regex: string | null;
  placeholder: string | null;
  defaultValue: string | null;
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
                regex: field.regex?.trim() || null,
                placeholder: field.placeholder?.trim() || null,
                defaultValue: field.defaultValue?.trim() || null,
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

export type AdminImeiServiceSummary = {
  id: string;
  name: string;
  priceCents: number;
  status: ServiceStatus;
  badge: ServiceBadge | null;
  categoryName: string | null;
  fieldCount: number;
};

export type ListAllImeiServicesResult =
  | { ok: true; services: AdminImeiServiceSummary[] }
  | { ok: false; error: string };

/** Admin view of every IMEI service, including Offline/Maintenance ones customers don't see. */
export async function listAllImeiServicesAction(
  initData: string,
): Promise<ListAllImeiServicesResult> {
  try {
    await requireStaff(initData);

    const services = await prisma.imeiService.findMany({
      include: { category: true, fields: true },
      orderBy: { displayOrder: "asc" },
    });

    return {
      ok: true,
      services: services.map((service) => ({
        id: service.id,
        name: service.name,
        priceCents: service.priceCents,
        status: service.status,
        badge: service.badge,
        categoryName: service.category?.name ?? null,
        fieldCount: service.fields.length,
      })),
    };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to load services";
    return { ok: false, error: message };
  }
}

export type SetImeiServiceStatusResult = { ok: true } | { ok: false; error: string };

/** Activate / Deactivate / Maintenance (Chapter 11 Service Management). */
export async function setImeiServiceStatusAction(
  initData: string,
  serviceId: string,
  status: ServiceStatus,
): Promise<SetImeiServiceStatusResult> {
  try {
    const admin = await requireAdmin(initData);
    const service = await prisma.imeiService.update({ where: { id: serviceId }, data: { status } });
    await logAdminAction(admin.id, "service.status", `IMEI ${service.name} -> ${status}`);
    return { ok: true };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to update status";
    return { ok: false, error: message };
  }
}

export type DeleteImeiServiceResult = { ok: true } | { ok: false; error: string };

export async function deleteImeiServiceAction(
  initData: string,
  serviceId: string,
): Promise<DeleteImeiServiceResult> {
  try {
    const admin = await requireAdmin(initData);
    const service = await prisma.imeiService.delete({ where: { id: serviceId } });
    await logAdminAction(admin.id, "service.delete", `IMEI ${service.name}`);
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "Failed to delete service (it may still have orders referencing it)",
    };
  }
}

export type DuplicateImeiServiceResult = { ok: true } | { ok: false; error: string };

export async function duplicateImeiServiceAction(
  initData: string,
  serviceId: string,
): Promise<DuplicateImeiServiceResult> {
  try {
    const admin = await requireAdmin(initData);

    const original = await prisma.imeiService.findUnique({
      where: { id: serviceId },
      include: { fields: true },
    });
    if (!original) return { ok: false, error: "Service not found" };

    await prisma.imeiService.create({
      data: {
        name: `${original.name} (Copy)`,
        priceCents: original.priceCents,
        description: original.description,
        estimatedTime: original.estimatedTime,
        status: ServiceStatus.OFFLINE,
        badge: original.badge,
        imageUrl: original.imageUrl,
        displayOrder: original.displayOrder,
        categoryId: original.categoryId,
        fields: {
          create: original.fields.map((field) => ({
            label: field.label,
            type: field.type,
            options: field.options,
            regex: field.regex,
            placeholder: field.placeholder,
            defaultValue: field.defaultValue,
            required: field.required,
            displayOrder: field.displayOrder,
          })),
        },
      },
    });

    await logAdminAction(admin.id, "service.duplicate", `IMEI ${original.name}`);
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof TelegramAuthError ? error.message : "Failed to duplicate service";
    return { ok: false, error: message };
  }
}
