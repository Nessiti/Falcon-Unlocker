"use client";

import { useState } from "react";
import { useSignal, requestFullscreen, exitFullscreen, isFullscreen } from "@telegram-apps/sdk-react";
import { useTelegramStatus } from "@/components/telegram-root";

async function enterFullscreen() {
  try {
    if (requestFullscreen.isAvailable()) {
      await requestFullscreen();
      return;
    }
  } catch (error) {
    console.error("[fullscreen] Telegram requestFullscreen failed", error);
  }

  try {
    await document.documentElement.requestFullscreen?.();
  } catch (error) {
    console.error("[fullscreen] browser requestFullscreen failed", error);
  }
}

async function leaveFullscreen() {
  try {
    if (exitFullscreen.isAvailable()) {
      await exitFullscreen();
      return;
    }
  } catch (error) {
    console.error("[fullscreen] Telegram exitFullscreen failed", error);
  }

  try {
    await document.exitFullscreen?.();
  } catch (error) {
    console.error("[fullscreen] browser exitFullscreen failed", error);
  }
}

/**
 * A single-click "enter fullscreen" toggle. Desktop and tablets only — on
 * phones the app is already fullscreen-equivalent inside Telegram, so the
 * button is hidden below the `sm` breakpoint via className, not by guessing
 * at the Telegram client's platform string (unreliable for tablets, which
 * report the same platform as phones).
 */
export function FullscreenButton({ className }: { className?: string }) {
  const telegram = useTelegramStatus();
  const fullscreen = useSignal(isFullscreen);
  const [busy, setBusy] = useState(false);

  if (telegram.status !== "ready") return null;

  async function handleClick() {
    setBusy(true);
    await (fullscreen ? leaveFullscreen() : enterFullscreen());
    setBusy(false);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
      title={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg text-foreground hover:bg-surface disabled:opacity-50 ${className ?? ""}`}
    >
      ⛶
    </button>
  );
}
