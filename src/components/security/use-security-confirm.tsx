"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import {
  authenticateBiometry,
  isBiometryMounted,
  mountBiometry,
  hapticFeedbackNotificationOccurred,
} from "@telegram-apps/sdk-react";
import { PinConfirmModal } from "@/components/security/pin-confirm-modal";
import type { AuthState } from "@/components/telegram-user-provider";

/**
 * Gates a sensitive customer action (placing an order, etc.) behind the
 * user's own PIN or biometric unlock, if they've set one up (Chapter 8).
 * Users without either configured pass through unconfirmed, unchanged.
 */
export function useSecurityConfirm(initData: string | undefined, auth: AuthState) {
  const [pinModalReason, setPinModalReason] = useState<string | null>(null);
  const resolverRef = useRef<((confirmed: boolean) => void) | null>(null);

  const hasPin = auth.status === "authenticated" && auth.user.hasPin;
  const biometricEnabled = auth.status === "authenticated" && auth.user.biometricEnabled;

  const confirm = useCallback(
    async (reason: string): Promise<boolean> => {
      if (biometricEnabled) {
        try {
          if (!isBiometryMounted() && mountBiometry.isAvailable()) {
            await mountBiometry(undefined);
          }
          const { status } = await authenticateBiometry({ reason });
          const ok = status === "authorized";
          if (hapticFeedbackNotificationOccurred.isAvailable()) {
            hapticFeedbackNotificationOccurred(ok ? "success" : "error");
          }
          return ok;
        } catch {
          return false;
        }
      }

      if (hasPin && initData) {
        return new Promise<boolean>((resolve) => {
          resolverRef.current = resolve;
          setPinModalReason(reason);
        });
      }

      return true;
    },
    [biometricEnabled, hasPin, initData],
  );

  const modal: ReactNode =
    pinModalReason && initData ? (
      <PinConfirmModal
        initData={initData}
        reason={pinModalReason}
        onConfirmed={() => {
          setPinModalReason(null);
          resolverRef.current?.(true);
          resolverRef.current = null;
        }}
        onCancel={() => {
          setPinModalReason(null);
          resolverRef.current?.(false);
          resolverRef.current = null;
        }}
      />
    ) : null;

  return { confirm, modal };
}
