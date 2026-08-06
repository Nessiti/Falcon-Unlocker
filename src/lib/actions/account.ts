"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/telegram/current-user";
import { TelegramAuthError } from "@/lib/telegram/auth";
import { hashPin, verifyPin } from "@/lib/security/pin";

const PIN_PATTERN = /^\d{4,6}$/;

export type SetPinInput = { newPin: string; currentPin: string | null };
export type SetPinResult = { ok: true } | { ok: false; error: string };

/** Sets or changes the app-lock PIN (Chapter 8). Requires the current PIN to change an existing one. */
export async function setPinAction(initData: string, input: SetPinInput): Promise<SetPinResult> {
  try {
    const user = await getCurrentUser(initData);

    if (!PIN_PATTERN.test(input.newPin)) {
      return { ok: false, error: "PIN must be 4 to 6 digits" };
    }

    if (user.pinHash && (!input.currentPin || !verifyPin(input.currentPin, user.pinHash))) {
      return { ok: false, error: "Current PIN is incorrect" };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { pinHash: hashPin(input.newPin) },
    });

    return { ok: true };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to set PIN";
    return { ok: false, error: message };
  }
}

export type ClearPinInput = { currentPin: string };
export type ClearPinResult = { ok: true } | { ok: false; error: string };

export async function clearPinAction(
  initData: string,
  input: ClearPinInput,
): Promise<ClearPinResult> {
  try {
    const user = await getCurrentUser(initData);

    if (!user.pinHash) {
      return { ok: false, error: "No PIN is set" };
    }
    if (!verifyPin(input.currentPin, user.pinHash)) {
      return { ok: false, error: "Current PIN is incorrect" };
    }

    await prisma.user.update({ where: { id: user.id }, data: { pinHash: null } });

    return { ok: true };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to remove PIN";
    return { ok: false, error: message };
  }
}

export type VerifyPinResult = { ok: true } | { ok: false; error: string };

/** Confirms the caller's PIN before letting them proceed with a sensitive action (order, etc). */
export async function verifyPinAction(initData: string, pin: string): Promise<VerifyPinResult> {
  try {
    const user = await getCurrentUser(initData);

    if (!user.pinHash) {
      return { ok: false, error: "No PIN is set" };
    }
    if (!verifyPin(pin, user.pinHash)) {
      return { ok: false, error: "Incorrect PIN" };
    }

    return { ok: true };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to verify PIN";
    return { ok: false, error: message };
  }
}

export type SetBiometricEnabledResult = { ok: true } | { ok: false; error: string };

/** Persists whether biometric unlock (via the Telegram client's native biometry) is enabled. */
export async function setBiometricEnabledAction(
  initData: string,
  enabled: boolean,
): Promise<SetBiometricEnabledResult> {
  try {
    const user = await getCurrentUser(initData);
    await prisma.user.update({ where: { id: user.id }, data: { biometricEnabled: enabled } });
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof TelegramAuthError ? error.message : "Failed to update biometric setting";
    return { ok: false, error: message };
  }
}
