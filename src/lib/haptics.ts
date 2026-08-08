import {
  hapticFeedbackNotificationOccurred,
  hapticFeedbackSelectionChanged,
  hapticFeedbackImpactOccurred,
} from "@telegram-apps/sdk-react";

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

/**
 * The light tick native apps play when a selection changes - for switching
 * bottom tabs, picking a category, opening a sheet. Deliberately separate
 * from notifyHaptic: this is navigation feedback, not an outcome.
 */
export function selectionHaptic() {
  if (hapticFeedbackSelectionChanged.isAvailable()) {
    hapticFeedbackSelectionChanged();
  }
}

/** A physical "press" for primary actions (place order, add funds). */
export function impactHaptic(style: "light" | "medium" | "heavy" = "light") {
  if (hapticFeedbackImpactOccurred.isAvailable()) {
    hapticFeedbackImpactOccurred(style);
  }
}
