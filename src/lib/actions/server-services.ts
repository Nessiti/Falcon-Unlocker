"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin, requireStaff } from "@/lib/telegram/admin";
import { requireTenantId } from "@/lib/telegram/tenant";
import { TelegramAuthError } from "@/lib/telegram/auth";
import { logAdminAction } from "@/lib/telegram/audit";
import { ServerFieldType, ServerServiceType, ServiceBadge, ServiceStatus } from "@/generated/prisma/client";

export type CreateServerServiceField = {
  label: string;
  type: ServerFieldType;
  required: boolean;
  displayOrder: number;
  placeholder: string | null;
  /// Field format validation (overrides the type's built-in default length).
  minLength: number | null;
  maxLength: number | null;
};

export type CreateServerServiceInput = {
  name: string;
  priceCents: number;
  description: string;
  estimatedTime: string;
  status: ServiceStatus;
  badge: ServiceBadge | null;
  imageUrl: string | null;
  categoryName: string | null;
  displayOrder: number;
  type: ServerServiceType;
  fields: CreateServerServiceField[];
};

export type CreateServerServiceResult = { ok: true } | { ok: false; error: string };

/** Server services are "Created by Admin only" (Chapter 5), scoped to the admin's own tenant (Chapter 25). */
export async function createServerServiceAction(
  initData: string,
  input: CreateServerServiceInput,
): Promise<CreateServerServiceResult> {
  try {
    const admin = await requireAdmin(initData);
    const tenantId = requireTenantId(admin);

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
              where: { tenantId_name: { tenantId, name: categoryName } },
              update: {},
              create: { tenantId, name: categoryName },
            })
          ).id
        : null;

      await tx.serverService.create({
        data: {
          name,
          priceCents: input.priceCents,
          description: input.description.trim(),
          estimatedTime: input.estimatedTime.trim(),
          status: input.status,
          badge: input.badge,
          imageUrl: input.imageUrl?.trim() || null,
          displayOrder: input.displayOrder,
          type: input.type,
          categoryId,
          tenantId,
          fields: {
            create: input.fields
              .filter((field) => field.label.trim())
              .map((field) => ({
                label: field.label.trim(),
                type: field.type,
                required: field.required,
                displayOrder: field.displayOrder,
                placeholder: field.placeholder?.trim() || null,
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

export type ServerServiceFieldDetail = CreateServerServiceField & { id: string };

export type ServerServiceDetail = {
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
  type: ServerServiceType;
  fields: ServerServiceFieldDetail[];
};

export type GetServerServiceDetailResult =
  | { ok: true; service: ServerServiceDetail }
  | { ok: false; error: string };

/** Loads a single service (with its fields) to prefill the admin edit form. */
export async function getServerServiceDetailAction(
  initData: string,
  serviceId: string,
): Promise<GetServerServiceDetailResult> {
  try {
    const staff = await requireStaff(initData);
    const tenantId = requireTenantId(staff);

    const service = await prisma.serverService.findFirst({
      where: { id: serviceId, tenantId },
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
        type: service.type,
        fields: service.fields.map((field) => ({
          id: field.id,
          label: field.label,
          type: field.type,
          required: field.required,
          displayOrder: field.displayOrder,
          placeholder: field.placeholder,
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

export type UpdateServerServiceField = CreateServerServiceField & { id?: string };
export type UpdateServerServiceInput = Omit<CreateServerServiceInput, "fields"> & {
  fields: UpdateServerServiceField[];
};
export type UpdateServerServiceResult = { ok: true } | { ok: false; error: string };

/** Edits an existing Server service. Fields keep their id when possible, so past
 * orders' submitted values (keyed by field id) still resolve to a label. */
export async function updateServerServiceAction(
  initData: string,
  serviceId: string,
  input: UpdateServerServiceInput,
): Promise<UpdateServerServiceResult> {
  try {
    const admin = await requireAdmin(initData);
    const tenantId = requireTenantId(admin);

    const name = input.name.trim();
    if (!name) return { ok: false, error: "Name is required" };
    if (!Number.isInteger(input.priceCents) || input.priceCents < 0) {
      return { ok: false, error: "Price must be a positive amount" };
    }

    const owned = await prisma.serverService.findFirst({ where: { id: serviceId, tenantId }, select: { id: true } });
    if (!owned) return { ok: false, error: "Service not found" };

    const categoryName = input.categoryName?.trim() || null;

    await prisma.$transaction(async (tx) => {
      const categoryId = categoryName
        ? (
            await tx.category.upsert({
              where: { tenantId_name: { tenantId, name: categoryName } },
              update: {},
              create: { tenantId, name: categoryName },
            })
          ).id
        : null;

      const existingFields = await tx.serverServiceField.findMany({ where: { serviceId } });
      const keepIds = new Set(
        input.fields.map((field) => field.id).filter((id): id is string => Boolean(id)),
      );
      const staleIds = existingFields
        .map((field) => field.id)
        .filter((id) => !keepIds.has(id));
      if (staleIds.length > 0) {
        await tx.serverServiceField.deleteMany({ where: { id: { in: staleIds } } });
      }

      for (const field of input.fields) {
        if (!field.label.trim()) continue;
        const data = {
          label: field.label.trim(),
          type: field.type,
          required: field.required,
          displayOrder: field.displayOrder,
          placeholder: field.placeholder?.trim() || null,
          minLength: field.minLength,
          maxLength: field.maxLength,
        };
        if (field.id) {
          await tx.serverServiceField.update({ where: { id: field.id }, data });
        } else {
          await tx.serverServiceField.create({ data: { ...data, serviceId } });
        }
      }

      await tx.serverService.update({
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
          type: input.type,
          categoryId,
        },
      });
    });

    await logAdminAction(admin.id, "service.update", `Server ${name}`);
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof TelegramAuthError ? error.message : "Failed to update service";
    return { ok: false, error: message };
  }
}

export type AdminServerServiceSummary = {
  id: string;
  name: string;
  priceCents: number;
  status: ServiceStatus;
  badge: ServiceBadge | null;
  type: ServerServiceType;
  categoryName: string | null;
  fieldCount: number;
};

export type ListAllServerServicesResult =
  | { ok: true; services: AdminServerServiceSummary[] }
  | { ok: false; error: string };

/** Admin view of every Server service in the staff member's own tenant, including Offline/Maintenance ones customers don't see. */
export async function listAllServerServicesAction(
  initData: string,
): Promise<ListAllServerServicesResult> {
  try {
    const staff = await requireStaff(initData);
    const tenantId = requireTenantId(staff);

    const services = await prisma.serverService.findMany({
      where: { tenantId },
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
        type: service.type,
        categoryName: service.category?.name ?? null,
        fieldCount: service.fields.length,
      })),
    };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to load services";
    return { ok: false, error: message };
  }
}

export type SetServerServiceStatusResult = { ok: true } | { ok: false; error: string };

/** Activate / Deactivate / Maintenance (Chapter 11 Service Management). */
export async function setServerServiceStatusAction(
  initData: string,
  serviceId: string,
  status: ServiceStatus,
): Promise<SetServerServiceStatusResult> {
  try {
    const admin = await requireAdmin(initData);
    const tenantId = requireTenantId(admin);

    const owned = await prisma.serverService.findFirst({ where: { id: serviceId, tenantId }, select: { name: true } });
    if (!owned) return { ok: false, error: "Service not found" };

    await prisma.serverService.update({ where: { id: serviceId }, data: { status } });
    await logAdminAction(admin.id, "service.status", `Server ${owned.name} -> ${status}`);
    return { ok: true };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to update status";
    return { ok: false, error: message };
  }
}

export type DeleteServerServiceResult = { ok: true } | { ok: false; error: string };

export async function deleteServerServiceAction(
  initData: string,
  serviceId: string,
): Promise<DeleteServerServiceResult> {
  try {
    const admin = await requireAdmin(initData);
    const tenantId = requireTenantId(admin);

    const owned = await prisma.serverService.findFirst({ where: { id: serviceId, tenantId }, select: { name: true } });
    if (!owned) return { ok: false, error: "Service not found" };

    await prisma.serverService.delete({ where: { id: serviceId } });
    await logAdminAction(admin.id, "service.delete", `Server ${owned.name}`);
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "Failed to delete service (it may still have orders referencing it)",
    };
  }
}

export type DuplicateServerServiceResult = { ok: true } | { ok: false; error: string };

export async function duplicateServerServiceAction(
  initData: string,
  serviceId: string,
): Promise<DuplicateServerServiceResult> {
  try {
    const admin = await requireAdmin(initData);
    const tenantId = requireTenantId(admin);

    const original = await prisma.serverService.findFirst({
      where: { id: serviceId, tenantId },
      include: { fields: true },
    });
    if (!original) return { ok: false, error: "Service not found" };

    await prisma.serverService.create({
      data: {
        name: `${original.name} (Copy)`,
        priceCents: original.priceCents,
        description: original.description,
        estimatedTime: original.estimatedTime,
        status: ServiceStatus.OFFLINE,
        badge: original.badge,
        imageUrl: original.imageUrl,
        displayOrder: original.displayOrder,
        type: original.type,
        categoryId: original.categoryId,
        tenantId,
        fields: {
          create: original.fields.map((field) => ({
            label: field.label,
            type: field.type,
            required: field.required,
            displayOrder: field.displayOrder,
            placeholder: field.placeholder,
            minLength: field.minLength,
            maxLength: field.maxLength,
          })),
        },
      },
    });

    await logAdminAction(admin.id, "service.duplicate", `Server ${original.name}`);
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof TelegramAuthError ? error.message : "Failed to duplicate service";
    return { ok: false, error: message };
  }
}
