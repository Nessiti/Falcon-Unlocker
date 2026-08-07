"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getSecurityOverviewAction,
  getSecuritySettingsAction,
  updateSecuritySettingsAction,
  type SecurityOverview,
} from "@/lib/actions/admin-security";
import { formInputClass } from "@/lib/ui";

export function SecurityCenter({ initData }: { initData: string }) {
  const [overview, setOverview] = useState<SecurityOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [allowlist, setAllowlist] = useState("");
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  useEffect(() => {
    getSecurityOverviewAction(initData).then((result) => {
      if (result.ok) setOverview(result.overview);
      else setError(result.error);
    });
    getSecuritySettingsAction(initData).then((result) => {
      setLoadingSettings(false);
      if (result.ok) setAllowlist(result.settings.adminIpAllowlist);
      else setSettingsError(result.error);
    });
  }, [initData]);

  async function handleSaveAllowlist() {
    setSaving(true);
    setSaved(false);
    setSettingsError(null);
    const result = await updateSecuritySettingsAction(initData, { adminIpAllowlist: allowlist });
    setSaving(false);
    if (result.ok) setSaved(true);
    else setSettingsError(result.error);
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? <p className="text-sm text-accent">{error}</p> : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-4 text-sm">
          <p className="text-xs text-hint">Encryption at Rest</p>
          <p className={overview?.encryptionConfigured ? "text-foreground" : "text-accent"}>
            {overview ? (overview.encryptionConfigured ? "✓ Configured" : "✗ ENCRYPTION_KEY not set") : "…"}
          </p>
          <p className="mt-1 text-xs text-hint">
            Provider API keys, secrets, and tokens are encrypted with AES-256-GCM before being
            stored, and only ever decrypted server-side.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4 text-sm">
          <p className="text-xs text-hint">Secret Rotation</p>
          <p className={overview?.providersNeedingRotation ? "text-accent" : "text-foreground"}>
            {overview
              ? overview.providersNeedingRotation > 0
                ? `${overview.providersNeedingRotation} provider(s) need rotation`
                : "✓ All providers rotated recently"
              : "…"}
          </p>
          <p className="mt-1 text-xs text-hint">
            Flagged when a provider&apos;s secrets were never rotated, or not in the last 90 days.
            See Admin → Providers.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4 text-sm">
          <p className="text-xs text-hint">Rate Limiting</p>
          <p className="text-foreground">
            {overview ? `${overview.providersWithRateLimit}/${overview.totalProviders} providers limited` : "…"}
          </p>
          <p className="mt-1 text-xs text-hint">
            Enforced per provider at the connector level - a call over the configured limit is
            rejected before it ever reaches the provider&apos;s API.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4 text-sm">
          <p className="text-xs text-hint">Audit Logs &amp; Admin Action Logs</p>
          <p className="text-foreground">✓ Active since Chapter 11</p>
          <p className="mt-1 text-xs text-hint">
            Every admin mutation is recorded.{" "}
            <Link href="/admin/logs" className="underline">
              View Audit Logs
            </Link>{" "}
            ·{" "}
            <Link href="/admin/api-logs" className="underline">
              View API Logs
            </Link>
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4 text-sm">
        <p className="font-semibold text-foreground">IP Restrictions (future-ready)</p>
        <p className="text-xs text-hint">
          Comma or newline-separated IPs or address prefixes allowed to use admin/staff actions.
          Leave empty to disable (default - no restriction).
        </p>
        <p className="text-xs text-accent">
          Warning: misconfiguring this can lock every admin out of the panel, including you. Make
          sure your own current IP is included before saving. Recovery requires clearing this
          field directly in the database.
        </p>
        {loadingSettings ? (
          <p className="text-xs text-hint">Loading…</p>
        ) : (
          <>
            <textarea
              className={`${formInputClass} min-h-24 font-mono text-xs`}
              placeholder="203.0.113.10&#10;198.51.100."
              value={allowlist}
              onChange={(e) => {
                setAllowlist(e.target.value);
                setSaved(false);
              }}
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveAllowlist}
                className="self-start rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
              {saved ? <span className="text-xs text-hint">✓ Saved</span> : null}
            </div>
            {settingsError ? <p className="text-xs text-accent">{settingsError}</p> : null}
          </>
        )}
      </div>
    </div>
  );
}
