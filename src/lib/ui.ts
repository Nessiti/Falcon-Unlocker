import type { IconName } from "@/components/ui/icon";

export const formInputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground";

/** Picks black or white text for a given background hex, by relative
 * luminance - used to keep a tenant's custom button color readable without
 * asking them to also pick a text color (Chapter 41). */
export function readableTextColor(hex: string): "#000000" | "#ffffff" {
  const value = hex.replace("#", "");
  if (value.length !== 6) return "#ffffff";
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#000000" : "#ffffff";
}

const CATEGORY_ICON_RULES: [RegExp, IconName][] = [
  [/iphone|ipad|ios|apple|icloud/i, "apple"],
  [/samsung|galaxy|xiaomi|redmi|poco|huawei|honor|oppo|vivo|realme|oneplus|pixel|google|lg|sony|nokia|motorola|moto\b/i, "smartphone"],
  [/frp|reset/i, "shield"],
  [/unlock/i, "unlock"],
  [/sim|network|carrier/i, "signal"],
  [/server|remote|activation|license|credit/i, "server"],
  [/repair|screen|part/i, "wrench"],
  [/account|login/i, "user"],
];

/**
 * Picks a reasonably fitting icon for a category name with no admin setup
 * required - keyword-matched against common device brands and service
 * types, falling back to a generic package for anything unrecognized.
 */
export function categoryIcon(name: string): IconName {
  for (const [pattern, icon] of CATEGORY_ICON_RULES) {
    if (pattern.test(name)) return icon;
  }
  return "package";
}

export function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );
}

/**
 * Compact balance for tight spaces (the Navbar chip) - "$1M" instead of
 * "$1,000,000.00". A `shrink-0` chip can't wrap or truncate its content, so
 * an unbounded-width formatted number is exactly what pushes neighboring
 * elements (the avatar) off the edge of a narrow phone screen once the
 * balance gets large - bounding the width at the source fixes that instead
 * of chasing the overflow through every layout that shows a balance.
 *
 * Only switches to compact notation once the full precision string would
 * actually be wide enough to risk that overflow - a typical balance like
 * $362.11 stays exact instead of silently getting rounded to $362.1.
 */
export function formatUsdCompact(cents: number) {
  const full = formatUsd(cents);
  if (full.length <= 9) return full;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(cents / 100);
}

export type CategoryGroup<T> = { id: string; name: string; items: T[] };

/**
 * Groups already-filtered services by category, preserving the order
 * categories first appear in (which follows the services' own displayOrder
 * sort) so groups never interleave. A category with no matching services
 * simply never gets an entry - the caller doesn't need to filter it out.
 */
export function groupByCategory<T extends { categoryId: string | null; category: { name: string } | null }>(
  services: T[],
): CategoryGroup<T>[] {
  const order: string[] = [];
  const groups = new Map<string, CategoryGroup<T>>();

  for (const service of services) {
    const id = service.categoryId ?? "uncategorized";
    if (!groups.has(id)) {
      groups.set(id, { id, name: service.category?.name ?? "Uncategorized", items: [] });
      order.push(id);
    }
    groups.get(id)!.items.push(service);
  }

  return order.map((id) => groups.get(id)!);
}
