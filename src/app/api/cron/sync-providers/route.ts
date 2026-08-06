import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncProvider, isSyncDue } from "@/lib/providers/sync-engine";

/**
 * Automatic Synchronization (Chapter 16). Invoked by Vercel Cron (see
 * vercel.json) — runs hourly and syncs every enabled provider whose
 * configured frequency (HOURLY / EVERY_6_HOURS / DAILY) has elapsed since
 * its last sync. Providers left on MANUAL are only ever synced by an
 * admin's explicit "Sync Now" click (admin-providers.ts).
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided = request.headers.get("authorization");
  if (!secret || provided !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const providers = await prisma.provider.findMany({
    where: { enabled: true, syncFrequency: { not: "MANUAL" } },
  });
  const due = providers.filter((provider) => isSyncDue(provider.syncFrequency, provider.lastSyncAt));

  const results = [];
  for (const provider of due) {
    try {
      const result = await syncProvider(provider);
      results.push({ providerId: provider.id, name: provider.name, ...result });
    } catch (error) {
      results.push({
        providerId: provider.id,
        name: provider.name,
        error: error instanceof Error ? error.message : "Sync failed",
      });
    }
  }

  return NextResponse.json({ ok: true, checked: providers.length, synced: results.length, results });
}
