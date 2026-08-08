"use client";

import { impactHaptic } from "@/lib/haptics";
import { Icon } from "@/components/ui/icon";

export function PlaceOrderBanner({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={() => {
        impactHaptic("medium");
        onClick();
      }}
      className="flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-br from-accent to-accent/60 px-4 py-4 text-left text-accent-foreground shadow-lg shadow-accent/30 transition-transform active:scale-[0.98]"
    >
      <div className="min-w-0">
        <p className="text-base font-semibold">Place New Order</p>
        <p className="truncate text-sm opacity-90">Choose a service and place your order</p>
      </div>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15">
        <Icon name="cart" className="h-6 w-6" />
      </span>
    </button>
  );
}
