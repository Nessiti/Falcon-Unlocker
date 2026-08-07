/**
 * Margin (Chapter 22-23): computes a suggested selling price from a
 * provider's cost. Percent is applied first (rounded), then the flat
 * amount is added - matches how "20% + $0.50" markups are normally read.
 * Never touches an admin's actual service price on its own; callers decide
 * whether/when to apply the suggestion.
 */
export type MarginInput = {
  costCents: number;
  marginPercent?: number | null;
  marginCents?: number | null;
};

export function applyMargin({ costCents, marginPercent, marginCents }: MarginInput): number {
  let price = costCents;
  if (marginPercent) price = Math.round(price * (1 + marginPercent / 100));
  if (marginCents) price += marginCents;
  return price;
}
