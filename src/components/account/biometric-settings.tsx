"use client";

import { useEffect, useState } from "react";
import {
  mountBiometry,
  isBiometryMounted,
  isBiometrySupported,
  biometryState,
  requestBiometryAccess,
  authenticateBiometry,
  updateBiometryToken,
} from "@telegram-apps/sdk-react";
import { setBiometricEnabledAction } from "@/lib/actions/account";
import { useRefreshTelegramUser } from "@/components/telegram-user-provider";

export function BiometricSettings({
  initData,
  initialEnabled,
}: {
  initData: string;
  initialEnabled: boolean;
}) {
  const refreshUser = useRefreshTelegramUser();
  const [available, setAvailable] = useState(false);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!isBiometrySupported()) return;
      if (!isBiometryMounted() && mountBiometry.isAvailable()) {
        try {
          await mountBiometry(undefined);
        } catch {
          return;
        }
      }
      if (!cancelled) setAvailable(biometryState().available);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleEnable() {
    setBusy(true);
    setError(null);

    try {
      const granted = await requestBiometryAccess({ reason: "Unlock Falcon Unlocker faster" });
      if (!granted) {
        setError("Biometric access was not granted");
        return;
      }

      const { status } = await authenticateBiometry({ reason: "Confirm biometric unlock" });
      if (status !== "authorized") {
        setError("Biometric authentication failed");
        return;
      }

      await updateBiometryToken({ token: "enabled" });

      const result = await setBiometricEnabledAction(initData, true);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEnabled(true);
      refreshUser();
    } catch {
      setError("Biometric authentication failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleDisable() {
    setBusy(true);
    setError(null);

    try {
      await updateBiometryToken({ token: null });
    } catch {
      // Device-side cleanup is best-effort; our own record still gets cleared below.
    }

    const result = await setBiometricEnabledAction(initData, false);
    if (result.ok) {
      setEnabled(false);
      refreshUser();
    } else {
      setError(result.error);
    }
    setBusy(false);
  }

  if (!available) {
    return <p className="text-sm text-hint">Biometric unlock is not available on this device.</p>;
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-foreground">Biometric unlock</p>
          <p className="text-xs text-hint">{enabled ? "Enabled" : "Disabled"}</p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={enabled ? handleDisable : handleEnable}
          className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground disabled:opacity-50"
        >
          {enabled ? "Disable" : "Enable"}
        </button>
      </div>
      {error ? <p className="text-xs text-accent">{error}</p> : null}
    </div>
  );
}
