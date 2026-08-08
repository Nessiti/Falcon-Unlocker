import type { IconName } from "@/components/ui/icon";

/**
 * One status vocabulary for the whole app. Before this, four components
 * each invented their own: order rows painted COMPLETED as a solid white
 * pill while the dashboard preview painted it green, "Rejected" and
 * "Cancelled" shared one style even though only one of them is a failure,
 * and every in-progress state (Pending/Checking/Processing) collapsed into
 * the same flat grey - so a customer couldn't tell from color alone
 * whether anything was actually happening.
 *
 * Failure states deliberately use a fixed red rather than the theme's
 * `accent`: accent is the tenant's own brand color, which is red for
 * Falcon Unlocker but is whatever each brand picks - a green-branded
 * tenant would otherwise show rejections in green.
 */
export type StatusTone = {
  /** Tinted pill: subtle background + readable text. */
  pill: string;
  /** Just the text color, for dense/admin rows that don't want a pill. */
  text: string;
  icon: IconName;
};

const WAITING: StatusTone = {
  pill: "bg-amber-500/15 text-amber-500",
  text: "text-amber-500",
  icon: "clock",
};

const IN_PROGRESS: StatusTone = {
  pill: "bg-sky-500/15 text-sky-500",
  text: "text-sky-500",
  icon: "clock",
};

const SUCCESS: StatusTone = {
  pill: "bg-emerald-500/15 text-emerald-500",
  text: "text-emerald-500",
  icon: "check-circle",
};

const FAILURE: StatusTone = {
  pill: "bg-red-500/15 text-red-500",
  text: "text-red-500",
  icon: "x-circle",
};

const NEUTRAL: StatusTone = {
  pill: "bg-surface text-hint",
  text: "text-hint",
  icon: "x-circle",
};

const TONES: Record<string, StatusTone> = {
  // Orders (ImeiOrder / ServerOrder)
  PENDING: WAITING,
  CHECKING: IN_PROGRESS,
  PROCESSING: IN_PROGRESS,
  COMPLETED: SUCCESS,
  REJECTED: FAILURE,
  CANCELLED: NEUTRAL,
  // Wallet recharges
  APPROVED: SUCCESS,
  // Order queue
  QUEUED: WAITING,
  SUCCEEDED: SUCCESS,
  FAILED: FAILURE,
  // Support tickets
  OPEN: WAITING,
  ANSWERED: IN_PROGRESS,
  CLOSED: NEUTRAL,
};

const LABELS: Record<string, string> = {
  PENDING: "Pending",
  CHECKING: "Checking",
  PROCESSING: "Processing",
  COMPLETED: "Completed",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
  APPROVED: "Approved",
  QUEUED: "Queued",
  SUCCEEDED: "Succeeded",
  FAILED: "Failed",
  OPEN: "Open",
  ANSWERED: "Answered",
  CLOSED: "Closed",
};

export function statusTone(status: string): StatusTone {
  return TONES[status] ?? NEUTRAL;
}

/** Falls back to the raw value so an unmapped future status still reads sensibly. */
export function statusLabel(status: string): string {
  return LABELS[status] ?? status;
}
