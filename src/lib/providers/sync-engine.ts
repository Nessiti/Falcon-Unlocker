import "server-only";
import { prisma } from "@/lib/prisma";
import { getProviderConnector } from "./registry";
import type { Provider, SyncFrequency } from "@/generated/prisma/client";

/**
 * Automatic Synchronization (Chapter 16): refreshes what the app knows about
 * a provider without touching admin customizations. It updates:
 * - Status: records a fresh connection test (Online/Offline) to ProviderConnectionLog.
 * - Provider Balance: refreshes Provider.lastBalanceCents/lastBalanceAt.
 * - Services / Categories / Prices / Estimated Time: refreshes the *cached*
 *   providerServiceName/providerPriceCents/providerCategory/providerEstimatedTime
 *   on every existing mapping to this provider — never the admin's own
 *   ImeiService/ServerService name, price, or status, which are
 *   administrator customizations sync must never overwrite.
 */

export type SyncResult = {
  connectionOk: boolean;
  balanceUpdated: boolean;
  imeiMappingsUpdated: number;
  serverMappingsUpdated: number;
  catalogError: string | null;
};

export async function syncProvider(provider: Provider): Promise<SyncResult> {
  const connector = getProviderConnector(provider);

  const test = await connector.testConnection();
  await prisma.providerConnectionLog.create({
    data: {
      providerId: provider.id,
      success: test.success,
      responseTimeMs: test.responseTimeMs,
      statusCode: test.statusCode,
      errorMessage: test.errorMessage,
    },
  });

  let balanceUpdated = false;
  const balance = await connector.getBalance();
  if (balance.ok) {
    await prisma.provider.update({
      where: { id: provider.id },
      data: { lastBalanceCents: balance.balanceCents, lastBalanceAt: new Date() },
    });
    balanceUpdated = true;
  }

  let imeiMappingsUpdated = 0;
  let serverMappingsUpdated = 0;
  let catalogError: string | null = null;

  try {
    const services = await connector.getServices();
    const byProviderServiceId = new Map(services.map((service) => [service.providerServiceId, service]));

    const imeiMappings = await prisma.imeiServiceMapping.findMany({ where: { providerId: provider.id } });
    for (const mapping of imeiMappings) {
      const match = byProviderServiceId.get(mapping.providerServiceId);
      if (!match) continue;
      await prisma.imeiServiceMapping.update({
        where: { id: mapping.id },
        data: {
          providerServiceName: match.name,
          providerPriceCents: match.priceCents,
          providerEstimatedTime: match.estimatedTime,
          providerCategory: match.category,
        },
      });
      imeiMappingsUpdated += 1;
    }

    const serverMappings = await prisma.serverServiceMapping.findMany({ where: { providerId: provider.id } });
    for (const mapping of serverMappings) {
      const match = byProviderServiceId.get(mapping.providerServiceId);
      if (!match) continue;
      await prisma.serverServiceMapping.update({
        where: { id: mapping.id },
        data: {
          providerServiceName: match.name,
          providerPriceCents: match.priceCents,
          providerEstimatedTime: match.estimatedTime,
          providerCategory: match.category,
        },
      });
      serverMappingsUpdated += 1;
    }
  } catch (error) {
    catalogError = error instanceof Error ? error.message : "Failed to fetch provider catalog";
  }

  await prisma.provider.update({ where: { id: provider.id }, data: { lastSyncAt: new Date() } });

  return { connectionOk: test.success, balanceUpdated, imeiMappingsUpdated, serverMappingsUpdated, catalogError };
}

const FREQUENCY_MS: Record<Exclude<SyncFrequency, "MANUAL">, number> = {
  HOURLY: 60 * 60 * 1000,
  EVERY_6_HOURS: 6 * 60 * 60 * 1000,
  DAILY: 24 * 60 * 60 * 1000,
};

/** Whether a provider on this schedule is due for another automatic sync. */
export function isSyncDue(frequency: SyncFrequency, lastSyncAt: Date | null): boolean {
  if (frequency === "MANUAL") return false;
  if (!lastSyncAt) return true;
  return Date.now() - lastSyncAt.getTime() >= FREQUENCY_MS[frequency];
}
