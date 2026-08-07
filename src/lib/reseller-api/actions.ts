import "server-only";
import { prisma } from "@/lib/prisma";
import { OrderStatus, ServiceStatus } from "@/generated/prisma/client";
import { placeImeiOrder, placeServerOrder } from "@/lib/orders-core";
import { toDhruStatus, successEnvelope, errorEnvelope } from "@/lib/reseller-api/format";
import { field } from "@/lib/reseller-api/params";
import type { ResellerContext } from "@/lib/reseller-api/auth";
import { formatUsd } from "@/lib/ui";

export async function accountInfo(ctx: ResellerContext) {
  const tenant = await prisma.tenant.findUnique({ where: { id: ctx.tenantId }, select: { currency: true } });
  return successEnvelope({
    MESSAGE: "Account info",
    AccountInfo: {
      credit: formatUsd(ctx.balanceCents),
      creditraw: (ctx.balanceCents / 100).toFixed(2),
      mail: "",
      currency: tenant?.currency ?? "USD",
    },
  });
}

function customFieldMeta(fields: { id: string; label: string; type: string; required: boolean }[]) {
  return fields.map((f) => ({
    fieldid: f.id,
    customname: f.label,
    fieldtype: f.type,
    required: f.required,
  }));
}

export async function serviceList(tenantId: string) {
  const [imeiServices, serverServices] = await Promise.all([
    prisma.imeiService.findMany({
      where: { tenantId, status: ServiceStatus.ONLINE },
      include: { category: true, fields: true },
      orderBy: { displayOrder: "asc" },
    }),
    prisma.serverService.findMany({
      where: { tenantId, status: ServiceStatus.ONLINE },
      include: { category: true, fields: true },
      orderBy: { displayOrder: "asc" },
    }),
  ]);

  const groups = new Map<string, { GROUPNAME: string; GROUPTYPE: string; SERVICES: unknown[] }>();

  for (const service of imeiServices) {
    const key = `IMEI:${service.category?.name ?? "Uncategorized"}`;
    if (!groups.has(key)) {
      groups.set(key, { GROUPNAME: service.category?.name ?? "Uncategorized", GROUPTYPE: "IMEI", SERVICES: [] });
    }
    groups.get(key)!.SERVICES.push({
      SERVICEID: service.id,
      SERVICETYPE: "IMEI",
      SERVICENAME: service.name,
      CREDIT: (service.priceCents / 100).toFixed(2),
      TIME: service.estimatedTime,
      INFO: service.description,
      CUSTOM: customFieldMeta(service.fields),
    });
  }

  for (const service of serverServices) {
    const key = `SERVER:${service.category?.name ?? "Uncategorized"}`;
    if (!groups.has(key)) {
      groups.set(key, { GROUPNAME: service.category?.name ?? "Uncategorized", GROUPTYPE: "SERVER", SERVICES: [] });
    }
    groups.get(key)!.SERVICES.push({
      SERVICEID: service.id,
      SERVICETYPE: "SERVER",
      SERVICENAME: service.name,
      CREDIT: (service.priceCents / 100).toFixed(2),
      TIME: service.estimatedTime,
      INFO: service.description,
      CUSTOM: customFieldMeta(service.fields),
    });
  }

  return successEnvelope({ MESSAGE: "Service list", LIST: Array.from(groups.values()) });
}

async function findOwnedOrder(ctx: ResellerContext, referenceId: string) {
  const [imeiOrder, serverOrder] = await Promise.all([
    prisma.imeiOrder.findFirst({ where: { id: referenceId, userId: ctx.userId, tenantId: ctx.tenantId } }),
    prisma.serverOrder.findFirst({ where: { id: referenceId, userId: ctx.userId, tenantId: ctx.tenantId } }),
  ]);
  return imeiOrder ?? serverOrder ?? null;
}

export async function getOrder(ctx: ResellerContext, referenceId: string) {
  const order = await findOwnedOrder(ctx, referenceId);
  if (!order) return errorEnvelope("Order not found");

  return successEnvelope({
    STATUS: toDhruStatus(order.status),
    CODE: order.status === OrderStatus.COMPLETED ? (order.downloadUrl ?? order.tracking ?? "") : "",
  });
}

export async function getOrderBulk(ctx: ResellerContext, referenceIds: string[]) {
  const results: Record<string, { STATUS: number; CODE: string }> = {};
  for (const id of referenceIds) {
    const order = await findOwnedOrder(ctx, id);
    results[id] = order
      ? {
          STATUS: toDhruStatus(order.status),
          CODE: order.status === OrderStatus.COMPLETED ? (order.downloadUrl ?? order.tracking ?? "") : "",
        }
      : { STATUS: 3, CODE: "" };
  }
  return successEnvelope(results);
}

/** CUSTOMFIELD may be a JSON object keyed by field id or label, or (for single-field services) a bare string. */
function resolveCustomFields(
  customField: unknown,
  serviceFields: { id: string; label: string }[],
): Record<string, string> {
  const values: Record<string, string> = {};

  if (customField && typeof customField === "object" && !Array.isArray(customField)) {
    const byLabel = new Map(serviceFields.map((f) => [f.label.toLowerCase(), f.id]));
    for (const [rawKey, rawValue] of Object.entries(customField as Record<string, unknown>)) {
      const fieldId = serviceFields.some((f) => f.id === rawKey) ? rawKey : byLabel.get(rawKey.toLowerCase());
      if (fieldId) values[fieldId] = String(rawValue);
    }
    return values;
  }

  if (typeof customField === "string" && customField.trim() && serviceFields.length === 1) {
    values[serviceFields[0].id] = customField.trim();
  }

  return values;
}

async function placeOrderFromParams(ctx: ResellerContext, params: Record<string, unknown>) {
  const serviceId = field(params, "ID", "id", "SERVICEID");
  if (!serviceId) return { ok: false as const, error: "Missing ID" };

  const imeiService = await prisma.imeiService.findFirst({
    where: { id: serviceId, tenantId: ctx.tenantId },
    include: { fields: true },
  });
  const serverService = imeiService
    ? null
    : await prisma.serverService.findFirst({
        where: { id: serviceId, tenantId: ctx.tenantId },
        include: { fields: true },
      });

  const service = imeiService ?? serverService;
  if (!service) return { ok: false as const, error: "Service not found" };

  const imei = field(params, "IMEI", "imei");
  const fieldValues = resolveCustomFields(params.CUSTOMFIELD ?? params.customfield, service.fields);
  if (imei && service.fields.length > 0) {
    const imeiField = service.fields.find((f) => f.label.toLowerCase().includes("imei"));
    if (imeiField) fieldValues[imeiField.id] = imei;
  }

  const orderingUser = { id: ctx.userId, tenantId: ctx.tenantId, telegramId: ctx.telegramId, firstName: ctx.firstName, lastName: ctx.lastName };
  const input = { serviceId: service.id, fieldValues, notes: null };

  return imeiService ? placeImeiOrder(orderingUser, input) : placeServerOrder(orderingUser, input);
}

export async function placeOrder(ctx: ResellerContext, params: Record<string, unknown>) {
  const result = await placeOrderFromParams(ctx, params);
  if (!result.ok) return errorEnvelope(result.error);
  return successEnvelope({ MESSAGE: "Order placed", REFERENCEID: result.orderId });
}

export async function placeOrderBulk(ctx: ResellerContext, orders: Record<string, unknown>[]) {
  const results: Record<string, unknown>[] = [];
  for (const order of orders) {
    const result = await placeOrderFromParams(ctx, order);
    results.push(
      result.ok
        ? { status: "success", message: "Order placed", referenceid: result.orderId }
        : { status: "error", message: result.error },
    );
  }
  return successEnvelope({ RESULTS: results });
}
