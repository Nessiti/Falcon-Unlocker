"use client";

import type { ReactNode } from "react";
import { useTelegramUser } from "@/components/telegram-user-provider";
import { Role } from "@/generated/prisma/browser";
import { AdminNav } from "@/components/admin/admin-nav";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const auth = useTelegramUser();

  if (auth.status !== "authenticated") return null;

  const isStaff = auth.user.role === Role.ADMIN || auth.user.role === Role.MODERATOR;
  if (!isStaff) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-16 text-center">
        <p className="text-sm text-hint">Admin access required.</p>
      </main>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Admin Panel</h1>
        <p className="text-sm text-hint">Manage the platform.</p>
      </div>
      <div className="lg:hidden">
        <AdminNav />
      </div>
      {children}
    </div>
  );
}
