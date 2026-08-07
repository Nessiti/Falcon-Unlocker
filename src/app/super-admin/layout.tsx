"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTelegramUser } from "@/components/telegram-user-provider";
import { Role } from "@/generated/prisma/browser";

const NAV_ITEMS = [{ label: "Tenants", href: "/super-admin/tenants" }];

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  const auth = useTelegramUser();
  const pathname = usePathname();

  if (auth.status !== "authenticated") return null;

  if (auth.user.role !== Role.SUPER_ADMIN) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-16 text-center">
        <p className="text-sm text-hint">Super Admin access required.</p>
      </main>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Super Admin</h1>
        <p className="text-sm text-hint">Manage every brand on the platform.</p>
      </div>
      <nav className="flex gap-2 overflow-x-auto pb-2">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium ${
              pathname === item.href
                ? "bg-accent text-accent-foreground"
                : "border border-border text-foreground"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
