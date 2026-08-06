export const formInputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground";

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
 * simply never gets an entry — the caller doesn't need to filter it out.
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
