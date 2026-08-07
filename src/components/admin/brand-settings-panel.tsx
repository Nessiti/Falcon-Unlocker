"use client";

import { useEffect, useState } from "react";
import { getBrandSettingsAction, updateBrandSettingsAction } from "@/lib/actions/brand-settings";
import { ColorPickerField } from "@/components/admin/color-picker-field";
import { formInputClass } from "@/lib/ui";

const EMPTY_FORM = {
  logoUrl: "",
  primaryColor: null as string | null,
  secondaryColor: null as string | null,
  currency: "USD",
  country: "",
  language: "en",
};

export function BrandSettingsPanel({ initData }: { initData: string }) {
  const [brandName, setBrandName] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getBrandSettingsAction(initData).then((result) => {
      setLoading(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setBrandName(result.settings.name);
      setForm({
        logoUrl: result.settings.logoUrl ?? "",
        primaryColor: result.settings.primaryColor,
        secondaryColor: result.settings.secondaryColor,
        currency: result.settings.currency,
        country: result.settings.country ?? "",
        language: result.settings.language,
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);

    const result = await updateBrandSettingsAction(initData, {
      logoUrl: form.logoUrl || null,
      primaryColor: form.primaryColor,
      secondaryColor: form.secondaryColor,
      currency: form.currency,
      country: form.country || null,
      language: form.language,
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
      <h2 className="text-sm font-semibold text-foreground">Brand Settings{brandName ? ` — ${brandName}` : ""}</h2>
      <p className="text-xs text-hint">
        Your brand&apos;s own look and locale. The Super Admin only sets up your bot connection —
        logo, colors, currency, country and language are entirely yours to configure.
      </p>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          className={formInputClass}
          placeholder="Logo URL"
          value={form.logoUrl}
          onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
        />
        <ColorPickerField
          label="Button color"
          value={form.primaryColor}
          onChange={(primaryColor) => setForm({ ...form, primaryColor })}
        />
        <ColorPickerField
          label="Secondary color"
          value={form.secondaryColor}
          onChange={(secondaryColor) => setForm({ ...form, secondaryColor })}
        />
        <input
          className={formInputClass}
          placeholder="Currency (e.g. USD)"
          value={form.currency}
          onChange={(e) => setForm({ ...form, currency: e.target.value })}
        />
        <input
          className={formInputClass}
          placeholder="Country"
          value={form.country}
          onChange={(e) => setForm({ ...form, country: e.target.value })}
        />
        <input
          className={formInputClass}
          placeholder="Language (e.g. en)"
          value={form.language}
          onChange={(e) => setForm({ ...form, language: e.target.value })}
        />
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
