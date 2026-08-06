"use client";

import { useEffect, useState } from "react";
import {
  getPricingSettingsAction,
  updatePricingSettingsAction,
} from "@/lib/actions/admin-pricing";
import { formInputClass } from "@/lib/ui";

export function PricingSettingsPanel({ initData }: { initData: string }) {
  const [marginPercent, setMarginPercent] = useState("");
  const [marginCents, setMarginCents] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPricingSettingsAction(initData).then((result) => {
      setLoading(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMarginPercent(
        result.settings.defaultMarginPercent != null ? String(result.settings.defaultMarginPercent) : "",
      );
      setMarginCents(
        result.settings.defaultMarginCents != null ? String(result.settings.defaultMarginCents / 100) : "",
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);

    const result = await updatePricingSettingsAction(initData, {
      defaultMarginPercent: marginPercent.trim() ? Number(marginPercent) : null,
      defaultMarginCents: marginCents.trim() ? Math.round(Number(marginCents) * 100) : null,
    });
    setSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) return null;

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4">
      <h2 className="text-sm font-semibold text-foreground">Default Margin</h2>
      <p className="text-xs text-hint">
        Applied when suggesting a selling price from a provider&apos;s cost on a service mapping —
        percent first, then the flat amount. A mapping&apos;s own margin overrides this default.
        Never changes an existing service price on its own.
      </p>

      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-xs text-hint">
          Margin %
          <input
            className={formInputClass}
            type="number"
            min="0"
            step="0.01"
            placeholder="e.g. 20"
            value={marginPercent}
            onChange={(e) => setMarginPercent(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-hint">
          Flat markup (USD)
          <input
            className={formInputClass}
            type="number"
            min="0"
            step="0.01"
            placeholder="e.g. 0.50"
            value={marginCents}
            onChange={(e) => setMarginCents(e.target.value)}
          />
        </label>
      </div>

      {error ? <p className="text-xs text-accent">{error}</p> : null}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="self-start rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground disabled:opacity-50"
      >
        {saving ? "Saving…" : saved ? "Saved!" : "Save"}
      </button>
    </div>
  );
}
