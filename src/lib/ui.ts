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

export function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );
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
