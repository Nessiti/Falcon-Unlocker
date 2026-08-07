import { hapticFeedbackNotificationOccurred } from "@telegram-apps/sdk-react";

/**
 * Native haptic feedback via Telegram's WebView bridge - the same taps iOS
 * and Android's own system UI use. Silently no-ops outside Telegram (desktop
 * browsers, unsupported clients) since `isAvailable()` reflects that.
 */
export function notifyHaptic(type: "success" | "error" | "warning") {
  if (hapticFeedbackNotificationOccurred.isAvailable()) {
    hapticFeedbackNotificationOccurred(type);
  }
}
