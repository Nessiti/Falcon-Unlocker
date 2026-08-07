"use client";

import Link from "next/link";
import { closeMiniApp } from "@telegram-apps/sdk-react";
import { useTelegramUser } from "@/components/telegram-user-provider";
import { Role } from "@/generated/prisma/browser";

const MENU_ITEMS = [
  { label: "Dashboard", href: "/" },
  { label: "IMEI", href: "/imei" },
  { label: "Server", href: "/server" },
  { label: "Orders", href: "/orders" },
  { label: "Wallet", href: "/wallet" },
  { label: "Referrals", href: "/referrals" },
  { label: "Notifications", href: "/notifications" },
  { label: "Settings", href: "/settings" },
  { label: "Support", href: "/support" },
  { label: "About", href: "/about" },
];

export function AppMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const auth = useTelegramUser();
  const isStaff =
    auth.status === "authenticated" &&
    (auth.user.role === Role.ADMIN || auth.user.role === Role.MODERATOR || auth.user.role === Role.SUPER_ADMIN);
  const isSuperAdmin = auth.status === "authenticated" && auth.user.role === Role.SUPER_ADMIN;

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
        {isStaff ? (
          <Link
            href="/admin"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm text-foreground hover:bg-background"
          >
            Admin Panel
          </Link>
        ) : null}
        {isSuperAdmin ? (
          <Link
            href="/super-admin/tenants"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm text-foreground hover:bg-background"
          >
            Super Admin
          </Link>
        ) : null}
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
