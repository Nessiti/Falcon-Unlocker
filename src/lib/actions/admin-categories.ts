"use server";

import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/telegram/admin";
import { requireTenantId } from "@/lib/telegram/tenant";
import { TelegramAuthError } from "@/lib/telegram/auth";

export type CategorySummary = { id: string; name: string; imeiCount: number; serverCount: number };

export type ListCategoriesResult =
  | { ok: true; categories: CategorySummary[] }
  | { ok: false; error: string };

export async function listCategoriesAction(initData: string): Promise<ListCategoriesResult> {
  try {
    const staff = await requireStaff(initData);
    const tenantId = requireTenantId(staff);

    const categories = await prisma.category.findMany({
      where: { tenantId },
      include: { _count: { select: { imeiServices: true, serverServices: true } } },
      orderBy: { name: "asc" },
    });

    return {
      ok: true,
      categories: categories.map((category) => ({
        id: category.id,
        name: category.name,
        imeiCount: category._count.imeiServices,
        serverCount: category._count.serverServices,
      })),
    };
  } catch (error) {
    const message =
      error instanceof TelegramAuthError ? error.message : "Failed to load categories";
    return { ok: false, error: message };
  }
}

export type CreateCategoryResult = { ok: true } | { ok: false; error: string };

export async function createCategoryAction(
  initData: string,
  name: string,
): Promise<CreateCategoryResult> {
  try {
    const staff = await requireStaff(initData);
    const tenantId = requireTenantId(staff);
    const trimmed = name.trim();
    if (!trimmed) return { ok: false, error: "Name is required" };

    await prisma.category.upsert({
      where: { tenantId_name: { tenantId, name: trimmed } },
      update: {},
      create: { tenantId, name: trimmed },
    });

    return { ok: true };
  } catch (error) {
    const message =
      error instanceof TelegramAuthError ? error.message : "Failed to create category";
    return { ok: false, error: message };
  }
}

export type DeleteCategoryResult = { ok: true } | { ok: false; error: string };

export async function deleteCategoryAction(
  initData: string,
  categoryId: string,
): Promise<DeleteCategoryResult> {
  try {
    const staff = await requireStaff(initData);
    const tenantId = requireTenantId(staff);

    const { count } = await prisma.category.deleteMany({ where: { id: categoryId, tenantId } });
    if (count === 0) return { ok: false, error: "Category not found" };
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof TelegramAuthError ? error.message : "Failed to delete category";
    return { ok: false, error: message };
  }
}
