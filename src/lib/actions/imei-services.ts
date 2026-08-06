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
  /// Field format validation (overrides the type's built-in default length).
  minLength: number | null;
  maxLength: number | null;
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
                minLength: field.minLength,
                maxLength: field.maxLength,
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

export type ImeiServiceFieldDetail = CreateImeiServiceField & { id: string };

export type ImeiServiceDetail = {
  id: string;
  name: string;
  priceCents: number;
  description: string;
  estimatedTime: string;
  status: ServiceStatus;
  badge: ServiceBadge | null;
  imageUrl: string | null;
  categoryName: string | null;
  displayOrder: number;
  fields: ImeiServiceFieldDetail[];
};

export type GetImeiServiceDetailResult =
  | { ok: true; service: ImeiServiceDetail }
  | { ok: false; error: string };

/** Loads a single service (with its fields) to prefill the admin edit form. */
export async function getImeiServiceDetailAction(
  initData: string,
  serviceId: string,
): Promise<GetImeiServiceDetailResult> {
  try {
    await requireStaff(initData);

    const service = await prisma.imeiService.findUnique({
      where: { id: serviceId },
      include: { category: true, fields: { orderBy: { displayOrder: "asc" } } },
    });
    if (!service) return { ok: false, error: "Service not found" };

    return {
      ok: true,
      service: {
        id: service.id,
        name: service.name,
        priceCents: service.priceCents,
        description: service.description,
        estimatedTime: service.estimatedTime,
        status: service.status,
        badge: service.badge,
        imageUrl: service.imageUrl,
        categoryName: service.category?.name ?? null,
        displayOrder: service.displayOrder,
        fields: service.fields.map((field) => ({
          id: field.id,
          label: field.label,
          type: field.type,
          options: field.options,
          regex: field.regex,
          placeholder: field.placeholder,
          defaultValue: field.defaultValue,
          required: field.required,
          displayOrder: field.displayOrder,
          minLength: field.minLength,
          maxLength: field.maxLength,
        })),
      },
    };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to load service";
    return { ok: false, error: message };
  }
}

export type UpdateImeiServiceField = CreateImeiServiceField & { id?: string };
export type UpdateImeiServiceInput = Omit<CreateImeiServiceInput, "fields"> & {
  fields: UpdateImeiServiceField[];
};
export type UpdateImeiServiceResult = { ok: true } | { ok: false; error: string };

/** Edits an existing IMEI service. Fields keep their id when possible, so past
 * orders' submitted values (keyed by field id) still resolve to a label. */
export async function updateImeiServiceAction(
  initData: string,
  serviceId: string,
  input: UpdateImeiServiceInput,
): Promise<UpdateImeiServiceResult> {
  try {
    const admin = await requireAdmin(initData);

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

      const existingFields = await tx.imeiServiceField.findMany({ where: { serviceId } });
      const keepIds = new Set(
        input.fields.map((field) => field.id).filter((id): id is string => Boolean(id)),
      );
      const staleIds = existingFields
        .map((field) => field.id)
        .filter((id) => !keepIds.has(id));
      if (staleIds.length > 0) {
        await tx.imeiServiceField.deleteMany({ where: { id: { in: staleIds } } });
      }

      for (const field of input.fields) {
        if (!field.label.trim()) continue;
        const data = {
          label: field.label.trim(),
          type: field.type,
          options: field.type === ServiceFieldType.SELECT ? field.options : null,
          regex: field.regex?.trim() || null,
          placeholder: field.placeholder?.trim() || null,
          defaultValue: field.defaultValue?.trim() || null,
          required: field.required,
          displayOrder: field.displayOrder,
          minLength: field.minLength,
          maxLength: field.maxLength,
        };
        if (field.id) {
          await tx.imeiServiceField.update({ where: { id: field.id }, data });
        } else {
          await tx.imeiServiceField.create({ data: { ...data, serviceId } });
        }
      }

      await tx.imeiService.update({
        where: { id: serviceId },
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
        },
      });
    });

    await logAdminAction(admin.id, "service.update", `IMEI ${name}`);
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof TelegramAuthError ? error.message : "Failed to update service";
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
            minLength: field.minLength,
            maxLength: field.maxLength,
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
