"use client";

import { useEffect, useState } from "react";
import { listUsersAction, type AdminUserSummary } from "@/lib/actions/admin-users";
import {
  listApiKeysAction,
  createApiKeyAction,
  setApiKeyEnabledAction,
  deleteApiKeyAction,
  type ApiKeySummary,
} from "@/lib/actions/admin-api-keys";
import { formInputClass } from "@/lib/ui";

/**
 * The endpoint a reseller points their own software at. Shown alongside the
 * key/secret because DHRU-style panels ask for three things - server URL,
 * username, API access key - and handing over only two leaves the reseller
 * asking "what's the link?".
 */
const API_URL = `${(process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "")}/api/reseller`;

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-hint">{label}</p>
        <p className="break-all text-xs text-foreground">{value}</p>
      </div>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard?.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="shrink-0 rounded-lg border border-border px-2 py-1 text-[11px] text-foreground transition-transform active:scale-95"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

export function ApiKeyManager({ initData }: { initData: string }) {
  const [keys, setKeys] = useState<ApiKeySummary[] | null>(null);
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState("");
  const [label, setLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [newSecret, setNewSecret] = useState<{ key: string; secret: string } | null>(null);

  function refresh() {
    listApiKeysAction(initData).then((result) => {
      if (result.ok) {
        setKeys(result.keys);
      } else {
        setError(result.error);
        setKeys([]);
      }
    });
  }

  useEffect(() => {
    refresh();
    listUsersAction(initData).then((result) => {
      if (result.ok) setUsers(result.users);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate() {
    if (!customerId) {
      setError("Choose a customer first");
      return;
    }
    setCreating(true);
    setError(null);
    const result = await createApiKeyAction(initData, { customerId, label: label || null });
    setCreating(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setNewSecret({ key: result.key, secret: result.secret });
    setLabel("");
    refresh();
  }

  async function handleToggle(id: string, enabled: boolean) {
    const result = await setApiKeyEnabledAction(initData, id, enabled);
    if (!result.ok) setError(result.error);
    else refresh();
  }

  async function handleDelete(id: string) {
    const result = await deleteApiKeyAction(initData, id);
    if (!result.ok) setError(result.error);
    else refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold text-foreground">Generate API Access</h2>
        <p className="text-xs text-hint">
          Gives one of your customers a key + secret to place orders programmatically from their own
          software, spending from their own balance. Compatible with the DHRU / GSM Theme reseller API
          standard.
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <select
            className={formInputClass}
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
          >
            <option value="">Choose a customer…</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {[user.firstName, user.lastName].filter(Boolean).join(" ")}
                {user.username ? ` (@${user.username})` : ""}
              </option>
            ))}
          </select>
          <input
            className={formInputClass}
            placeholder="Label (optional)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating}
            className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
          >
            {creating ? "Generating…" : "Generate"}
          </button>
        </div>
        {error ? <p className="text-xs text-accent">{error}</p> : null}
      </div>

      <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold text-foreground">Endpoint</h2>
        <p className="text-xs text-hint">
          Give this URL to any customer integrating their own system. Their panel may label the
          fields differently - key/username and secret/API access key are both accepted.
        </p>
        <CopyRow label="API URL / Server URL" value={API_URL} />
      </div>

      {newSecret ? (
        <div className="flex flex-col gap-2 rounded-2xl border border-accent bg-surface p-4">
          <p className="text-sm font-medium text-foreground">
            Send these three to your customer - the secret won&apos;t be shown again.
          </p>
          <CopyRow label="API URL / Server URL" value={API_URL} />
          <CopyRow label="API key (some panels call this Username)" value={newSecret.key} />
          <CopyRow
            label="API secret (some panels call this API Access Key)"
            value={newSecret.secret}
          />
          <button type="button" onClick={() => setNewSecret(null)} className="self-start text-xs text-hint">
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        {keys === null ? (
          <p className="text-sm text-hint">Loading…</p>
        ) : keys.length === 0 ? (
          <p className="text-sm text-hint">No API keys yet.</p>
        ) : (
          keys.map((k) => (
            <div key={k.id} className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4 text-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="text-foreground">{k.customerName}</p>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    k.enabled ? "bg-emerald-500/15 text-emerald-500" : "bg-accent/15 text-accent"
                  }`}
                >
                  {k.enabled ? "Enabled" : "Disabled"}
                </span>
              </div>
              <p className="break-all text-xs text-hint">
                {k.key}
                {k.label ? ` · ${k.label}` : ""}
              </p>
              <p className="text-xs text-hint">
                Created {new Date(k.createdAt).toLocaleDateString()}
                {k.lastUsedAt ? ` · Last used ${new Date(k.lastUsedAt).toLocaleString()}` : " · Never used"}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleToggle(k.id, !k.enabled)}
                  className="rounded-lg border border-border px-2 py-1 text-xs text-foreground"
                >
                  {k.enabled ? "Disable" : "Enable"}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(k.id)}
                  className="rounded-lg border border-border px-2 py-1 text-xs text-accent"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
