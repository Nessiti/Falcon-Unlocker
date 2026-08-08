"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  createProviderAction,
  updateProviderAction,
  type ProviderDetail,
} from "@/lib/actions/admin-providers";
import { ProviderType, SyncFrequency } from "@/generated/prisma/browser";
import { formInputClass } from "@/lib/ui";

const TYPE_OPTIONS: { value: ProviderType; label: string }[] = [
  { value: ProviderType.DHRU_FUSION, label: "DHRU Fusion API" },
  { value: ProviderType.PHP_API, label: "PHP API" },
  { value: ProviderType.WEBX, label: "WebX Next API" },
  { value: ProviderType.GSM_THEME, label: "GSM-THEME Panel" },
  { value: ProviderType.REST_API, label: "REST API" },
  { value: ProviderType.JSON_API, label: "JSON API" },
  { value: ProviderType.XML_API, label: "XML API" },
  { value: ProviderType.CUSTOM_API, label: "Custom API" },
];

const SYNC_FREQUENCY_OPTIONS: { value: SyncFrequency; label: string }[] = [
  { value: SyncFrequency.MANUAL, label: "Manual Sync" },
  { value: SyncFrequency.HOURLY, label: "Every hour" },
  { value: SyncFrequency.EVERY_6_HOURS, label: "Every 6 hours" },
  { value: SyncFrequency.DAILY, label: "Daily" },
];

export function ProviderForm({
  initData,
  editingProvider,
  onSaved,
  onCancel,
}: {
  initData: string;
  editingProvider?: ProviderDetail;
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(editingProvider?.name ?? "");
  const [type, setType] = useState<ProviderType>(editingProvider?.type ?? ProviderType.REST_API);
  const [baseUrl, setBaseUrl] = useState(editingProvider?.baseUrl ?? "");
  const [username, setUsername] = useState(editingProvider?.username ?? "");
  const usernameRequired =
    type === ProviderType.DHRU_FUSION || type === ProviderType.GSM_THEME;
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [token, setToken] = useState("");
  const [timeoutMs, setTimeoutMs] = useState(String(editingProvider?.timeoutMs ?? 30000));
  const [priority, setPriority] = useState(String(editingProvider?.priority ?? 0));
  const [syncFrequency, setSyncFrequency] = useState<SyncFrequency>(
    editingProvider?.syncFrequency ?? SyncFrequency.MANUAL,
  );
  const [rateLimitPerMinute, setRateLimitPerMinute] = useState(
    editingProvider?.rateLimitPerMinute != null ? String(editingProvider.rateLimitPerMinute) : "",
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const timeoutValue = Number(timeoutMs);
    if (!Number.isInteger(timeoutValue) || timeoutValue <= 0) {
      setError("Enter a valid timeout in milliseconds");
      return;
    }
    const rateLimitValue = rateLimitPerMinute.trim() ? Number(rateLimitPerMinute) : null;
    if (rateLimitValue != null && (!Number.isInteger(rateLimitValue) || rateLimitValue <= 0)) {
      setError("Rate limit must be a positive whole number, or blank for unlimited");
      return;
    }

    const payload = {
      name,
      type,
      baseUrl,
      username: username || null,
      apiKey: apiKey || undefined,
      apiSecret: apiSecret || undefined,
      token: token || undefined,
      timeoutMs: timeoutValue,
      priority: Number(priority) || 0,
      syncFrequency,
      rateLimitPerMinute: rateLimitValue,
    };

    setSubmitting(true);
    const result = editingProvider
      ? await updateProviderAction(initData, editingProvider.id, payload)
      : await createProviderAction(initData, payload);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    router.refresh();
    if (editingProvider) {
      onSaved?.();
    } else {
      setName("");
      setType(ProviderType.REST_API);
      setBaseUrl("");
      setUsername("");
      setApiKey("");
      setApiSecret("");
      setToken("");
      setTimeoutMs("30000");
      setPriority("0");
      setSyncFrequency(SyncFrequency.MANUAL);
      setRateLimitPerMinute("");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4"
    >
      <h2 className="text-sm font-semibold text-foreground">
        {editingProvider ? `Edit ${editingProvider.name} (Admin)` : "Add Provider (Admin)"}
      </h2>

      <input
        className={formInputClass}
        placeholder="Provider name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <select
        className={formInputClass}
        value={type}
        onChange={(e) => setType(e.target.value as ProviderType)}
      >
        {TYPE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <input
        className={formInputClass}
        placeholder="Base URL (e.g. https://api.provider.com)"
        value={baseUrl}
        onChange={(e) => setBaseUrl(e.target.value)}
        required
      />
      <input
        className={formInputClass}
        placeholder={
          usernameRequired ? "Username (required for this provider type)" : "Username (optional)"
        }
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required={usernameRequired}
      />
      {usernameRequired ? (
        <p className="-mt-2 text-[11px] text-hint">
          DHRU / GSM Theme send credentials as <code>username</code> + <code>apiaccesskey</code>:
          put the provider&apos;s key here and its secret in API Key below.
        </p>
      ) : null}

      <input
        className={formInputClass}
        type="password"
        placeholder={
          editingProvider?.apiKeyMasked
            ? `API Key (current: ${editingProvider.apiKeyMasked}, leave blank to keep)`
            : "API Key"
        }
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
      />
      <input
        className={formInputClass}
        type="password"
        placeholder={
          editingProvider?.apiSecretMasked
            ? `API Secret (current: ${editingProvider.apiSecretMasked}, leave blank to keep)`
            : "API Secret"
        }
        value={apiSecret}
        onChange={(e) => setApiSecret(e.target.value)}
      />
      <input
        className={formInputClass}
        type="password"
        placeholder={
          editingProvider?.tokenMasked
            ? `Token (current: ${editingProvider.tokenMasked}, leave blank to keep)`
            : "Token (optional)"
        }
        value={token}
        onChange={(e) => setToken(e.target.value)}
      />

      <div className="grid grid-cols-2 gap-3">
        <input
          className={formInputClass}
          type="number"
          min="1"
          placeholder="Timeout (ms)"
          value={timeoutMs}
          onChange={(e) => setTimeoutMs(e.target.value)}
        />
        <input
          className={formInputClass}
          type="number"
          placeholder="Priority"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        />
      </div>

      <label className="flex flex-col gap-1 text-sm text-foreground">
        Sync Frequency
        <select
          className={formInputClass}
          value={syncFrequency}
          onChange={(e) => setSyncFrequency(e.target.value as SyncFrequency)}
        >
          {SYNC_FREQUENCY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm text-foreground">
        Rate Limit (calls per minute, blank = unlimited)
        <input
          className={formInputClass}
          type="number"
          min="1"
          placeholder="Unlimited"
          value={rateLimitPerMinute}
          onChange={(e) => setRateLimitPerMinute(e.target.value)}
        />
      </label>

      {error ? <p className="text-sm text-accent">{error}</p> : null}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
        >
          {submitting
            ? editingProvider
              ? "Saving…"
              : "Creating…"
            : editingProvider
              ? "Save Changes"
              : "Add Provider"}
        </button>
        {editingProvider ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-border px-3 py-2 text-sm text-foreground"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}
