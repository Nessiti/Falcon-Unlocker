"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin, requireStaff } from "@/lib/telegram/admin";
import { requireTenantId } from "@/lib/telegram/tenant";
import { TelegramAuthError } from "@/lib/telegram/auth";
import { logAdminAction } from "@/lib/telegram/audit";
import { getProviderConnector } from "@/lib/providers/registry";
import { buildRoutingPlan, type RoutingPlan } from "@/lib/providers/routing-engine";
export type { RoutingPlan, RoutingCandidate } from "@/lib/providers/routing-engine";
import type { ConnectorService } from "@/lib/providers/types";
import { RoutingStrategy } from "@/generated/prisma/client";
import { applyMargin } from "@/lib/pricing/pricing-engine";

export type MappingKind = "IMEI" | "SERVER";

export type ServiceMappingSummary = {
  id: string;
  providerId: string;
  providerName: string;
  providerServiceId: string;
  providerServiceName: string | null;
  providerPriceCents: number | null;
  providerEstimatedTime: string | null;
  providerCategory: string | null;
  priority: number;
  enabled: boolean;
  /** Margin (Chapter 23): null means "use the PricingSettings default". */
  marginPercent: number | null;
  marginCents: number | null;
  /** providerPriceCents with the effective margin (this mapping's override, or the default) applied. Null when there's no provider price to base it on. */
  suggestedPriceCents: number | null;
};

export type ListServiceMappingsResult =
  | { ok: true; mappings: ServiceMappingSummary[]; routingStrategy: RoutingStrategy }
  | { ok: false; error: string };

/** Service Mapping (Chapter 14): every provider service linked to one Falcon service, scoped to the staff member's own tenant (Chapter 28). */
export async function listServiceMappingsAction(
  initData: string,
  kind: MappingKind,
  falconServiceId: string,
): Promise<ListServiceMappingsResult> {
  try {
    const staff = await requireStaff(initData);
    const tenantId = requireTenantId(staff);

    const [rows, falconService] =
      kind === "IMEI"
        ? await Promise.all([
            prisma.imeiServiceMapping.findMany({
              where: { imeiServiceId: falconServiceId, tenantId },
              include: { provider: true },
              orderBy: { priority: "asc" },
            }),
            prisma.imeiService.findFirst({ where: { id: falconServiceId, tenantId } }),
          ])
        : await Promise.all([
            prisma.serverServiceMapping.findMany({
              where: { serverServiceId: falconServiceId, tenantId },
              include: { provider: true },
              orderBy: { priority: "asc" },
            }),
            prisma.serverService.findFirst({ where: { id: falconServiceId, tenantId } }),
          ]);
    if (!falconService) return { ok: false, error: "Service not found" };

    const pricingSettings = await prisma.pricingSettings.findUnique({ where: { tenantId } });

    return {
      ok: true,
      mappings: rows.map((row) => ({
        id: row.id,
        providerId: row.providerId,
        providerName: row.provider.name,
        providerServiceId: row.providerServiceId,
        providerServiceName: row.providerServiceName,
        providerPriceCents: row.providerPriceCents,
        providerEstimatedTime: row.providerEstimatedTime,
        providerCategory: row.providerCategory,
        priority: row.priority,
        enabled: row.enabled,
        marginPercent: row.marginPercent,
        marginCents: row.marginCents,
        suggestedPriceCents:
          row.providerPriceCents != null
            ? applyMargin({
                costCents: row.providerPriceCents,
                marginPercent: row.marginPercent ?? pricingSettings?.defaultMarginPercent,
                marginCents: row.marginCents ?? pricingSettings?.defaultMarginCents,
              })
            : null,
      })),
      routingStrategy: falconService.routingStrategy,
    };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to load mappings";
    return { ok: false, error: message };
  }
}

export type CreateServiceMappingInput = {
  providerId: string;
  providerServiceId: string;
  providerServiceName: string | null;
  providerPriceCents: number | null;
  providerEstimatedTime: string | null;
  providerCategory: string | null;
  priority: number;
  marginPercent: number | null;
  marginCents: number | null;
};

export type CreateServiceMappingResult = { ok: true } | { ok: false; error: string };

/**
 * Manual mapping: admin links a Falcon service directly to a provider's
 * service ID. Both the Falcon service AND the provider must belong to the
 * admin's own tenant (Chapter 28) - this is the join table that could
 * otherwise let one brand route orders (and spend) through another brand's
 * paid provider credentials, so both sides are checked, not just one.
 */
export async function createServiceMappingAction(
  initData: string,
  kind: MappingKind,
  falconServiceId: string,
  input: CreateServiceMappingInput,
): Promise<CreateServiceMappingResult> {
  try {
    const admin = await requireAdmin(initData);
    const tenantId = requireTenantId(admin);

    const providerServiceId = input.providerServiceId.trim();
    if (!providerServiceId) return { ok: false, error: "Provider service ID is required" };
    if (!input.providerId) return { ok: false, error: "Select a provider" };

    const provider = await prisma.provider.findFirst({ where: { id: input.providerId, tenantId }, select: { id: true } });
    if (!provider) return { ok: false, error: "Provider not found" };

    const falconService =
      kind === "IMEI"
        ? await prisma.imeiService.findFirst({ where: { id: falconServiceId, tenantId }, select: { id: true } })
        : await prisma.serverService.findFirst({ where: { id: falconServiceId, tenantId }, select: { id: true } });
    if (!falconService) return { ok: false, error: "Service not found" };

    if (kind === "IMEI") {
      await prisma.imeiServiceMapping.create({
        data: {
          imeiServiceId: falconServiceId,
          providerId: input.providerId,
          providerServiceId,
          providerServiceName: input.providerServiceName,
          providerPriceCents: input.providerPriceCents,
          providerEstimatedTime: input.providerEstimatedTime,
          providerCategory: input.providerCategory,
          priority: input.priority,
          marginPercent: input.marginPercent,
          marginCents: input.marginCents,
          tenantId,
        },
      });
    } else {
      await prisma.serverServiceMapping.create({
        data: {
          serverServiceId: falconServiceId,
          providerId: input.providerId,
          providerServiceId,
          providerServiceName: input.providerServiceName,
          providerPriceCents: input.providerPriceCents,
          providerEstimatedTime: input.providerEstimatedTime,
          providerCategory: input.providerCategory,
          priority: input.priority,
          marginPercent: input.marginPercent,
          marginCents: input.marginCents,
          tenantId,
        },
      });
    }

    await logAdminAction(
      admin.id,
      "service-mapping.create",
      `${kind} ${falconServiceId} -> ${providerServiceId}`,
    );
    return { ok: true };
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return { ok: false, error: "This provider service is already mapped" };
    }
    const message = error instanceof TelegramAuthError ? error.message : "Failed to create mapping";
    return { ok: false, error: message };
  }
}

export type UpdateServiceMappingInput = {
  providerServiceId: string;
  providerServiceName: string | null;
  providerPriceCents: number | null;
  providerEstimatedTime: string | null;
  providerCategory: string | null;
  priority: number;
  enabled: boolean;
  marginPercent: number | null;
  marginCents: number | null;
};

export type UpdateServiceMappingResult = { ok: true } | { ok: false; error: string };

/** Edit a mapping's provider service ID, priority order, or enabled state. */
export async function updateServiceMappingAction(
  initData: string,
  kind: MappingKind,
  mappingId: string,
  input: UpdateServiceMappingInput,
): Promise<UpdateServiceMappingResult> {
  try {
    const admin = await requireAdmin(initData);
    const tenantId = requireTenantId(admin);

    const providerServiceId = input.providerServiceId.trim();
    if (!providerServiceId) return { ok: false, error: "Provider service ID is required" };

    const data = {
      providerServiceId,
      providerServiceName: input.providerServiceName,
      providerPriceCents: input.providerPriceCents,
      providerEstimatedTime: input.providerEstimatedTime,
      providerCategory: input.providerCategory,
      priority: input.priority,
      enabled: input.enabled,
      marginPercent: input.marginPercent,
      marginCents: input.marginCents,
    };

    if (kind === "IMEI") {
      const owned = await prisma.imeiServiceMapping.findFirst({ where: { id: mappingId, tenantId }, select: { id: true } });
      if (!owned) return { ok: false, error: "Mapping not found" };
      await prisma.imeiServiceMapping.update({ where: { id: mappingId }, data });
    } else {
      const owned = await prisma.serverServiceMapping.findFirst({ where: { id: mappingId, tenantId }, select: { id: true } });
      if (!owned) return { ok: false, error: "Mapping not found" };
      await prisma.serverServiceMapping.update({ where: { id: mappingId }, data });
    }

    await logAdminAction(admin.id, "service-mapping.update", `${kind} ${mappingId}`);
    return { ok: true };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to update mapping";
    return { ok: false, error: message };
  }
}

export type DeleteServiceMappingResult = { ok: true } | { ok: false; error: string };

export async function deleteServiceMappingAction(
  initData: string,
  kind: MappingKind,
  mappingId: string,
): Promise<DeleteServiceMappingResult> {
  try {
    const admin = await requireAdmin(initData);
    const tenantId = requireTenantId(admin);

    if (kind === "IMEI") {
      const { count } = await prisma.imeiServiceMapping.deleteMany({ where: { id: mappingId, tenantId } });
      if (count === 0) return { ok: false, error: "Mapping not found" };
    } else {
      const { count } = await prisma.serverServiceMapping.deleteMany({ where: { id: mappingId, tenantId } });
      if (count === 0) return { ok: false, error: "Mapping not found" };
    }

    await logAdminAction(admin.id, "service-mapping.delete", `${kind} ${mappingId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Failed to delete mapping" };
  }
}

export type ProviderServiceOption = ConnectorService;

export type FetchProviderServicesResult =
  | { ok: true; services: ProviderServiceOption[] }
  | { ok: false; error: string };

/** Browse a provider's live service catalog (through the Chapter 13 connector) to pick from when mapping manually. */
export async function fetchProviderServicesAction(
  initData: string,
  providerId: string,
): Promise<FetchProviderServicesResult> {
  try {
    const admin = await requireAdmin(initData);
    const tenantId = requireTenantId(admin);

    const provider = await prisma.provider.findFirst({ where: { id: providerId, tenantId } });
    if (!provider) return { ok: false, error: "Provider not found" };

    const services = await getProviderConnector(provider).getServices();
    return { ok: true, services };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to load provider services",
    };
  }
}

export type AutoMapResult =
  | { ok: true; created: number; skipped: { providerName: string; reason: string }[] }
  | { ok: false; error: string };

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * Automatic mapping: for each candidate provider, fetch its live service
 * catalog and link the one whose name matches the Falcon service's name
 * (normalized, case/punctuation-insensitive). Providers with no match are
 * reported back, not silently skipped. Both the service and every candidate
 * provider are filtered to the admin's own tenant (Chapter 28).
 */
export async function autoMapServiceAction(
  initData: string,
  kind: MappingKind,
  falconServiceId: string,
  providerIds: string[],
): Promise<AutoMapResult> {
  try {
    const admin = await requireAdmin(initData);
    const tenantId = requireTenantId(admin);

    const falconService =
      kind === "IMEI"
        ? await prisma.imeiService.findFirst({ where: { id: falconServiceId, tenantId } })
        : await prisma.serverService.findFirst({ where: { id: falconServiceId, tenantId } });
    if (!falconService) return { ok: false, error: "Service not found" };

    const providers = await prisma.provider.findMany({ where: { id: { in: providerIds }, tenantId } });
    const targetName = normalizeName(falconService.name);

    let created = 0;
    const skipped: { providerName: string; reason: string }[] = [];

    for (const provider of providers) {
      try {
        const services = await getProviderConnector(provider).getServices();
        const match = services.find((service) => normalizeName(service.name) === targetName);
        if (!match) {
          skipped.push({ providerName: provider.name, reason: "No matching service name found" });
          continue;
        }

        if (kind === "IMEI") {
          await prisma.imeiServiceMapping.upsert({
            where: {
              imeiServiceId_providerId_providerServiceId: {
                imeiServiceId: falconServiceId,
                providerId: provider.id,
                providerServiceId: match.providerServiceId,
              },
            },
            update: {
              providerServiceName: match.name,
              providerPriceCents: match.priceCents,
              providerEstimatedTime: match.estimatedTime,
              providerCategory: match.category,
            },
            create: {
              imeiServiceId: falconServiceId,
              providerId: provider.id,
              providerServiceId: match.providerServiceId,
              providerServiceName: match.name,
              providerPriceCents: match.priceCents,
              providerEstimatedTime: match.estimatedTime,
              providerCategory: match.category,
              tenantId,
            },
          });
        } else {
          await prisma.serverServiceMapping.upsert({
            where: {
              serverServiceId_providerId_providerServiceId: {
                serverServiceId: falconServiceId,
                providerId: provider.id,
                providerServiceId: match.providerServiceId,
              },
            },
            update: {
              providerServiceName: match.name,
              providerPriceCents: match.priceCents,
              providerEstimatedTime: match.estimatedTime,
              providerCategory: match.category,
            },
            create: {
              serverServiceId: falconServiceId,
              providerId: provider.id,
              providerServiceId: match.providerServiceId,
              providerServiceName: match.name,
              providerPriceCents: match.priceCents,
              providerEstimatedTime: match.estimatedTime,
              providerCategory: match.category,
              tenantId,
            },
          });
        }
        created += 1;
      } catch (error) {
        skipped.push({
          providerName: provider.name,
          reason: error instanceof Error ? error.message : "Failed to fetch services",
        });
      }
    }

    await logAdminAction(
      admin.id,
      "service-mapping.auto-map",
      `${kind} ${falconService.name} -> ${created} created`,
    );
    return { ok: true, created, skipped };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to auto-map";
    return { ok: false, error: message };
  }
}

export type SetRoutingStrategyResult = { ok: true } | { ok: false; error: string };

/** Smart Routing (Chapter 15): how this service picks a provider among its mappings. */
export async function setServiceRoutingStrategyAction(
  initData: string,
  kind: MappingKind,
  falconServiceId: string,
  strategy: RoutingStrategy,
): Promise<SetRoutingStrategyResult> {
  try {
    const admin = await requireAdmin(initData);
    const tenantId = requireTenantId(admin);

    if (kind === "IMEI") {
      const { count } = await prisma.imeiService.updateMany({
        where: { id: falconServiceId, tenantId },
        data: { routingStrategy: strategy },
      });
      if (count === 0) return { ok: false, error: "Service not found" };
    } else {
      const { count } = await prisma.serverService.updateMany({
        where: { id: falconServiceId, tenantId },
        data: { routingStrategy: strategy },
      });
      if (count === 0) return { ok: false, error: "Service not found" };
    }

    await logAdminAction(admin.id, "service-mapping.set-routing-strategy", `${kind} ${falconServiceId} -> ${strategy}`);
    return { ok: true };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to update routing strategy";
    return { ok: false, error: message };
  }
}

export type RoutingPreviewResult = { ok: true; plan: RoutingPlan } | { ok: false; error: string };

/**
 * Computes the routing order that would currently be used for this service:
 * which provider is tried first per its configured strategy, and the
 * automatic fallback sequence behind it (or none, under MANUAL).
 */
export async function getRoutingPreviewAction(
  initData: string,
  kind: MappingKind,
  falconServiceId: string,
): Promise<RoutingPreviewResult> {
  try {
    const staff = await requireStaff(initData);
    const tenantId = requireTenantId(staff);

    if (kind === "IMEI") {
      const service = await prisma.imeiService.findFirst({
        where: { id: falconServiceId, tenantId },
        include: { mappings: { where: { enabled: true }, include: { provider: true } } },
      });
      if (!service) return { ok: false, error: "Service not found" };
      const plan = await buildRoutingPlan(service.routingStrategy, service.mappings);
      return { ok: true, plan };
    }

    const service = await prisma.serverService.findFirst({
      where: { id: falconServiceId, tenantId },
      include: { mappings: { where: { enabled: true }, include: { provider: true } } },
    });
    if (!service) return { ok: false, error: "Service not found" };
    const plan = await buildRoutingPlan(service.routingStrategy, service.mappings);
    return { ok: true, plan };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to compute routing preview";
    return { ok: false, error: message };
  }
}

export type ApplySuggestedPriceResult =
  | { ok: true; priceCents: number }
  | { ok: false; error: string };

/**
 * Margin (Chapter 23): recomputes this mapping's suggested price
 * server-side (never trusts a client-submitted number for something that
 * changes what customers pay) and sets it as the Falcon service's
 * priceCents - an explicit admin action, never automatic.
 */
export async function applySuggestedPriceAction(
  initData: string,
  kind: MappingKind,
  mappingId: string,
): Promise<ApplySuggestedPriceResult> {
  try {
    const admin = await requireAdmin(initData);
    const tenantId = requireTenantId(admin);
    const pricingSettings = await prisma.pricingSettings.findUnique({ where: { tenantId } });

    let priceCents: number;

    if (kind === "IMEI") {
      const mapping = await prisma.imeiServiceMapping.findFirst({ where: { id: mappingId, tenantId } });
      if (!mapping) return { ok: false, error: "Mapping not found" };
      if (mapping.providerPriceCents == null) {
        return { ok: false, error: "This mapping has no provider price to base a price on" };
      }
      priceCents = applyMargin({
        costCents: mapping.providerPriceCents,
        marginPercent: mapping.marginPercent ?? pricingSettings?.defaultMarginPercent,
        marginCents: mapping.marginCents ?? pricingSettings?.defaultMarginCents,
      });
      await prisma.imeiService.update({ where: { id: mapping.imeiServiceId }, data: { priceCents } });
    } else {
      const mapping = await prisma.serverServiceMapping.findFirst({ where: { id: mappingId, tenantId } });
      if (!mapping) return { ok: false, error: "Mapping not found" };
      if (mapping.providerPriceCents == null) {
        return { ok: false, error: "This mapping has no provider price to base a price on" };
      }
      priceCents = applyMargin({
        costCents: mapping.providerPriceCents,
        marginPercent: mapping.marginPercent ?? pricingSettings?.defaultMarginPercent,
        marginCents: mapping.marginCents ?? pricingSettings?.defaultMarginCents,
      });
      await prisma.serverService.update({ where: { id: mapping.serverServiceId }, data: { priceCents } });
    }

    await logAdminAction(admin.id, "service-mapping.apply-suggested-price", `${kind} ${mappingId} -> ${priceCents}`);
    return { ok: true, priceCents };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to apply suggested price";
    return { ok: false, error: message };
  }
}
