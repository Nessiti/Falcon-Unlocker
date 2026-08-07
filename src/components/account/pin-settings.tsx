"use client";

import { useState, type FormEvent } from "react";
import { setPinAction, clearPinAction } from "@/lib/actions/account";
import { useRefreshTelegramUser } from "@/components/telegram-user-provider";
import { formInputClass } from "@/lib/ui";

export function PinSettings({
  initData,
  initialHasPin,
}: {
  initData: string;
  initialHasPin: boolean;
}) {
  const refreshUser = useRefreshTelegramUser();
  const [hasPin, setHasPin] = useState(initialHasPin);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSetPin(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    const result = await setPinAction(initData, {
      newPin,
      currentPin: hasPin ? currentPin : null,
    });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setHasPin(true);
    setCurrentPin("");
    setNewPin("");
    setMessage(hasPin ? "PIN changed" : "PIN set");
    refreshUser();
  }

  async function handleClearPin() {
    if (!currentPin) {
      setError("Enter your current PIN to remove it");
      return;
    }
    setSubmitting(true);
    setError(null);
    setMessage(null);

    const result = await clearPinAction(initData, { currentPin });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setHasPin(false);
    setCurrentPin("");
    setMessage("PIN removed");
    refreshUser();
  }

  return (
    <form onSubmit={handleSetPin} className="flex flex-col gap-2">
      <p className="text-sm text-foreground">PIN {hasPin ? "(set)" : "(not set)"}</p>

      {hasPin ? (
        <input
          className={formInputClass}
          type="password"
          inputMode="numeric"
          placeholder="Current PIN"
          value={currentPin}
          onChange={(e) => setCurrentPin(e.target.value)}
        />
      ) : null}

      <input
        className={formInputClass}
        type="password"
        inputMode="numeric"
        placeholder="New PIN (4-6 digits)"
        value={newPin}
        onChange={(e) => setNewPin(e.target.value)}
      />

      {error ? <p className="text-xs text-accent">{error}</p> : null}
      {message ? <p className="text-xs text-hint">{message}</p> : null}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground disabled:opacity-50"
        >
          {hasPin ? "Change PIN" : "Set PIN"}
        </button>
        {hasPin ? (
          <button
            type="button"
            disabled={submitting}
            onClick={handleClearPin}
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground disabled:opacity-50"
          >
            Remove PIN
          </button>
        ) : null}
      </div>
    </form>
  );
}
