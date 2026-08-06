"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin, requireStaff } from "@/lib/telegram/admin";
import { TelegramAuthError } from "@/lib/telegram/auth";
import { logAdminAction } from "@/lib/telegram/audit";
import { getProviderConnector } from "@/lib/providers/registry";
import { buildRoutingPlan, type RoutingPlan } from "@/lib/providers/routing-engine";
export type { RoutingPlan, RoutingCandidate } from "@/lib/providers/routing-engine";
import type { ConnectorService } from "@/lib/providers/types";
import { RoutingStrategy } from "@/generated/prisma/client";

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
};

export type ListServiceMappingsResult =
  | { ok: true; mappings: ServiceMappingSummary[]; routingStrategy: RoutingStrategy }
  | { ok: false; error: string };

/** Service Mapping (Chapter 14): every provider service linked to one Falcon service. */
export async function listServiceMappingsAction(
  initData: string,
  kind: MappingKind,
  falconServiceId: string,
): Promise<ListServiceMappingsResult> {
  try {
    await requireStaff(initData);

    const [rows, falconService] =
      kind === "IMEI"
        ? await Promise.all([
            prisma.imeiServiceMapping.findMany({
              where: { imeiServiceId: falconServiceId },
              include: { provider: true },
              orderBy: { priority: "asc" },
            }),
            prisma.imeiService.findUnique({ where: { id: falconServiceId } }),
          ])
        : await Promise.all([
            prisma.serverServiceMapping.findMany({
              where: { serverServiceId: falconServiceId },
              include: { provider: true },
              orderBy: { priority: "asc" },
            }),
            prisma.serverService.findUnique({ where: { id: falconServiceId } }),
          ]);
    if (!falconService) return { ok: false, error: "Service not found" };

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
};

export type CreateServiceMappingResult = { ok: true } | { ok: false; error: string };

/** Manual mapping: admin links a Falcon service directly to a provider's service ID. */
export async function createServiceMappingAction(
  initData: string,
  kind: MappingKind,
  falconServiceId: string,
  input: CreateServiceMappingInput,
): Promise<CreateServiceMappingResult> {
  try {
    const admin = await requireAdmin(initData);

    const providerServiceId = input.providerServiceId.trim();
    if (!providerServiceId) return { ok: false, error: "Provider service ID is required" };
    if (!input.providerId) return { ok: false, error: "Select a provider" };

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
    };

    if (kind === "IMEI") {
      await prisma.imeiServiceMapping.update({ where: { id: mappingId }, data });
    } else {
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

    if (kind === "IMEI") {
      await prisma.imeiServiceMapping.delete({ where: { id: mappingId } });
    } else {
      await prisma.serverServiceMapping.delete({ where: { id: mappingId } });
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
    await requireAdmin(initData);

    const provider = await prisma.provider.findUnique({ where: { id: providerId } });
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
 * reported back, not silently skipped.
 */
export async function autoMapServiceAction(
  initData: string,
  kind: MappingKind,
  falconServiceId: string,
  providerIds: string[],
): Promise<AutoMapResult> {
  try {
    const admin = await requireAdmin(initData);

    const falconService =
      kind === "IMEI"
        ? await prisma.imeiService.findUnique({ where: { id: falconServiceId } })
        : await prisma.serverService.findUnique({ where: { id: falconServiceId } });
    if (!falconService) return { ok: false, error: "Service not found" };

    const providers = await prisma.provider.findMany({ where: { id: { in: providerIds } } });
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

    if (kind === "IMEI") {
      await prisma.imeiService.update({ where: { id: falconServiceId }, data: { routingStrategy: strategy } });
    } else {
      await prisma.serverService.update({ where: { id: falconServiceId }, data: { routingStrategy: strategy } });
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
    await requireStaff(initData);

    if (kind === "IMEI") {
      const service = await prisma.imeiService.findUnique({
        where: { id: falconServiceId },
        include: { mappings: { where: { enabled: true }, include: { provider: true } } },
      });
      if (!service) return { ok: false, error: "Service not found" };
      const plan = await buildRoutingPlan(service.routingStrategy, service.mappings);
      return { ok: true, plan };
    }

    const service = await prisma.serverService.findUnique({
      where: { id: falconServiceId },
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
