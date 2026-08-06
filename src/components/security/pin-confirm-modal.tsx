"use client";

import { useState, type FormEvent } from "react";
import { verifyPinAction } from "@/lib/actions/account";
import { formInputClass } from "@/lib/ui";

export function PinConfirmModal({
  initData,
  reason,
  onConfirmed,
  onCancel,
}: {
  initData: string;
  reason: string;
  onConfirmed: () => void;
  onCancel: () => void;
}) {
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const result = await verifyPinAction(initData, pin);
    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    onConfirmed();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-xs flex-col gap-3 rounded-2xl border border-border bg-surface p-4"
      >
        <p className="text-sm font-semibold text-foreground">Enter your PIN</p>
        <p className="text-xs text-hint">{reason}</p>
        <input
          className={formInputClass}
          type="password"
          inputMode="numeric"
          pattern="\d*"
          maxLength={6}
          placeholder="PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          autoFocus
          required
        />
        {error ? <p className="text-xs text-accent">{error}</p> : null}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={busy || pin.length < 4}
            className="flex-1 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground disabled:opacity-50"
          >
            {busy ? "Verifying…" : "Confirm"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
