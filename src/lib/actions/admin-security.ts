"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin, requireStaff } from "@/lib/telegram/admin";
import { TelegramAuthError } from "@/lib/telegram/auth";
import { logAdminAction } from "@/lib/telegram/audit";

const ROTATION_REMINDER_DAYS = 90;

export type SecurityOverview = {
  encryptionConfigured: boolean;
  totalProviders: number;
  providersNeedingRotation: number;
  providersWithRateLimit: number;
  adminIpAllowlistConfigured: boolean;
};

export type GetSecurityOverviewResult =
  | { ok: true; overview: SecurityOverview }
  | { ok: false; error: string };

/**
 * Security Center (Chapter 19) dashboard: encryption-at-rest, secret
 * rotation hygiene, rate limiting coverage, and IP allowlist status.
 * Audit Logs and Admin Action Logs (also required by this chapter) already
 * exist as their own pages since Chapter 11 - see /admin/logs.
 */
export async function getSecurityOverviewAction(initData: string): Promise<GetSecurityOverviewResult> {
  try {
    await requireStaff(initData);

    const providers = await prisma.provider.findMany({
      select: { apiKey: true, apiSecret: true, token: true, secretsRotatedAt: true, rateLimitPerMinute: true },
    });
    const settings = await prisma.securitySettings.findUnique({ where: { id: "singleton" } });

    const cutoff = Date.now() - ROTATION_REMINDER_DAYS * 24 * 60 * 60 * 1000;
    const providersNeedingRotation = providers.filter((provider) => {
      const hasSecret = Boolean(provider.apiKey || provider.apiSecret || provider.token);
      if (!hasSecret) return false;
      return !provider.secretsRotatedAt || provider.secretsRotatedAt.getTime() < cutoff;
    }).length;

    return {
      ok: true,
      overview: {
        encryptionConfigured: Boolean(process.env.ENCRYPTION_KEY),
        totalProviders: providers.length,
        providersNeedingRotation,
        providersWithRateLimit: providers.filter((provider) => provider.rateLimitPerMinute != null).length,
        adminIpAllowlistConfigured: Boolean(settings?.adminIpAllowlist?.trim()),
      },
    };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to load security overview";
    return { ok: false, error: message };
  }
}

export type SecuritySettingsData = { adminIpAllowlist: string };

export type GetSecuritySettingsResult =
  | { ok: true; settings: SecuritySettingsData }
  | { ok: false; error: string };

export async function getSecuritySettingsAction(initData: string): Promise<GetSecuritySettingsResult> {
  try {
    await requireAdmin(initData);
    const settings = await prisma.securitySettings.findUnique({ where: { id: "singleton" } });
    return { ok: true, settings: { adminIpAllowlist: settings?.adminIpAllowlist ?? "" } };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to load settings";
    return { ok: false, error: message };
  }
}

export type UpdateSecuritySettingsResult = { ok: true } | { ok: false; error: string };

/**
 * IP Restrictions (future-ready): clearing the field disables the
 * restriction entirely. Because this same setting is enforced on every
 * requireAdmin call, a misconfigured allowlist that excludes the admin's
 * own IP can lock the admin panel out from the app itself - the only
 * recovery path then is clearing SecuritySettings.adminIpAllowlist
 * directly in the database (e.g. via `npx prisma studio`).
 */
export async function updateSecuritySettingsAction(
  initData: string,
  input: SecuritySettingsData,
): Promise<UpdateSecuritySettingsResult> {
  try {
    const admin = await requireAdmin(initData);

    const allowlist = input.adminIpAllowlist.trim() || null;
    await prisma.securitySettings.upsert({
      where: { id: "singleton" },
      update: { adminIpAllowlist: allowlist },
      create: { id: "singleton", adminIpAllowlist: allowlist },
    });
    await logAdminAction(admin.id, "security.ip-allowlist", allowlist ? "updated" : "cleared");
    return { ok: true };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to update settings";
    return { ok: false, error: message };
  }
}
