"use client";

export function PlaceOrderBanner({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-between rounded-2xl bg-accent px-4 py-4 text-left text-accent-foreground"
    >
      <div>
        <p className="text-base font-semibold">Place New Order</p>
        <p className="text-sm opacity-90">Choose a service and place your order</p>
      </div>
      <span className="text-2xl" aria-hidden>
        🛒
      </span>
    </button>
  );
}
