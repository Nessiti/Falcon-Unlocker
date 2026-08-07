"use client";

import { useEffect, useState } from "react";
import {
  listTenantsAction,
  createTenantAction,
  setTenantStatusAction,
  type TenantSummary,
} from "@/lib/actions/admin-tenants";
import { TenantStatus } from "@/generated/prisma/browser";
import { formInputClass } from "@/lib/ui";

const EMPTY_FORM = {
  name: "",
  telegramBotUsername: "",
  telegramBotToken: "",
  ownerTelegramId: "",
  email: "",
};

export function TenantManager({ initData }: { initData: string }) {
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [statusBusyId, setStatusBusyId] = useState<string | null>(null);

  function refresh() {
    listTenantsAction(initData).then((result) => {
      setLoading(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      setTenants(result.tenants);
    });
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate() {
    setCreating(true);
    setCreateError(null);

    const result = await createTenantAction(initData, {
      name: form.name,
      telegramBotUsername: form.telegramBotUsername || null,
      telegramBotToken: form.telegramBotToken || null,
      ownerTelegramId: form.ownerTelegramId || null,
      email: form.email || null,
    });
    setCreating(false);

    if (!result.ok) {
      setCreateError(result.error);
      return;
    }
    setForm(EMPTY_FORM);
    refresh();
  }

  async function handleToggleStatus(tenant: TenantSummary) {
    setStatusBusyId(tenant.id);
    const nextStatus = tenant.status === TenantStatus.ACTIVE ? TenantStatus.SUSPENDED : TenantStatus.ACTIVE;
    const result = await setTenantStatusAction(initData, tenant.id, nextStatus);
    setStatusBusyId(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold text-foreground">Brands</h2>
        {loading ? <p className="text-xs text-hint">Loading…</p> : null}
        {error ? <p className="text-xs text-accent">{error}</p> : null}

        {!loading && tenants.length === 0 ? <p className="text-xs text-hint">No brands yet.</p> : null}

        <div className="flex flex-col gap-2">
          {tenants.map((tenant) => (
            <div
              key={tenant.id}
              className="flex flex-col gap-1 rounded-xl border border-border p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-foreground">{tenant.name}</p>
                <p className="text-xs text-hint">
                  {tenant.telegramBotUsername ? `@${tenant.telegramBotUsername}` : "No bot configured"} ·{" "}
                  {tenant.userCount} user{tenant.userCount === 1 ? "" : "s"} · {tenant.subscriptionPlan}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    tenant.status === TenantStatus.ACTIVE
                      ? "bg-emerald-500/15 text-emerald-500"
                      : "bg-accent/15 text-accent"
                  }`}
                >
                  {tenant.status}
                </span>
                <button
                  type="button"
                  onClick={() => handleToggleStatus(tenant)}
                  disabled={statusBusyId === tenant.id || tenant.id === "falcon-unlocker"}
                  className="rounded-lg border border-border px-2 py-1 text-xs font-medium text-foreground disabled:opacity-50"
                >
                  {tenant.status === TenantStatus.ACTIVE ? "Suspend" : "Reactivate"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold text-foreground">New Brand</h2>
        <p className="text-xs text-hint">
          Sets only the brand&apos;s identity and bot connection. Logo, colors, currency, country
          and language are the brand&apos;s own choice — its Admin configures those later from
          Brand Settings, not the Super Admin.
        </p>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <input
            className={formInputClass}
            placeholder="Brand name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            className={formInputClass}
            placeholder="Telegram bot username (without @)"
            value={form.telegramBotUsername}
            onChange={(e) => setForm({ ...form, telegramBotUsername: e.target.value })}
          />
          <input
            className={formInputClass}
            placeholder="BotFather token"
            value={form.telegramBotToken}
            onChange={(e) => setForm({ ...form, telegramBotToken: e.target.value })}
          />
          <input
            className={formInputClass}
            placeholder="Owner Telegram ID"
            value={form.ownerTelegramId}
            onChange={(e) => setForm({ ...form, ownerTelegramId: e.target.value })}
          />
          <input
            className={formInputClass}
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>

        {createError ? <p className="text-xs text-accent">{createError}</p> : null}

        <button
          type="button"
          onClick={handleCreate}
          disabled={creating || !form.name.trim()}
          className="self-start rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground disabled:opacity-50"
        >
          {creating ? "Creating…" : "Create Brand"}
        </button>
      </div>
    </div>
  );
}
