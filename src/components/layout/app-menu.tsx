"use client";

import Link from "next/link";
import { closeMiniApp } from "@telegram-apps/sdk-react";

const MENU_ITEMS = [
  { label: "Dashboard", href: "/" },
  { label: "IMEI", href: "/imei" },
  { label: "Server", href: "/server" },
  { label: "Orders", href: "/orders" },
  { label: "Wallet", href: "/wallet" },
  { label: "Settings", href: "/settings" },
  { label: "Support", href: "/support" },
  { label: "About", href: "/about" },
];

export function AppMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-30 flex">
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className="flex-1 bg-black/60"
      />
      <nav className="flex w-64 max-w-[80%] flex-col gap-1 border-l border-border bg-surface p-4">
        {MENU_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm text-foreground hover:bg-background"
          >
            {item.label}
          </Link>
        ))}
        <button
          type="button"
          onClick={() => {
            onClose();
            if (closeMiniApp.isAvailable()) closeMiniApp();
          }}
          className="mt-2 rounded-lg px-3 py-2 text-left text-sm text-accent hover:bg-background"
        >
          Logout
        </button>
      </nav>
    </div>
  );
}
