"use client";

import { useRouter } from "next/navigation";

export function PlaceOrderChooser({ onClose }: { onClose: () => void }) {
  const router = useRouter();

  function go(href: string) {
    onClose();
    router.push(href);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
      <div className="flex w-full max-w-sm flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-base font-semibold text-foreground">What are you ordering?</h2>
        <button
          type="button"
          onClick={() => go("/imei")}
          className="flex items-center justify-between rounded-xl border border-border px-4 py-3 text-left text-sm font-medium text-foreground hover:bg-background"
        >
          <span>IMEI Services</span>
          <span aria-hidden>📱</span>
        </button>
        <button
          type="button"
          onClick={() => go("/server")}
          className="flex items-center justify-between rounded-xl border border-border px-4 py-3 text-left text-sm font-medium text-foreground hover:bg-background"
        >
          <span>Server Services</span>
          <span aria-hidden>🖥️</span>
        </button>
        <button
          type="button"
          onClick={onClose}
          className="self-center text-sm text-hint"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
