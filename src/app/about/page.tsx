"use client";

import { useRawInitData } from "@telegram-apps/sdk-react";
import { useTelegramUser } from "@/components/telegram-user-provider";
import { AboutContent } from "@/components/support/about-content";
import { Role } from "@/generated/prisma/browser";

export default function AboutPage() {
  const auth = useTelegramUser();
  const initData = useRawInitData();

  if (auth.status !== "authenticated") return null;
  const isAdmin = auth.user.role === Role.ADMIN || auth.user.role === Role.SUPER_ADMIN;

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">About</h1>
      </div>
      <AboutContent initData={initData ?? null} isAdmin={isAdmin} />
    </main>
  );
}
