export const formInputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground";

export function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );
}
