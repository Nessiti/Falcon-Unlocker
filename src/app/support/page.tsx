"use client";

import { useState } from "react";
import { useRawInitData } from "@telegram-apps/sdk-react";
import { useTelegramUser } from "@/components/telegram-user-provider";
import { TicketsTab } from "@/components/support/tickets-tab";
import { FaqTab } from "@/components/support/faq-tab";
import { HelpTab } from "@/components/support/help-tab";
import { AboutContent } from "@/components/support/about-content";
import { Role } from "@/generated/prisma/browser";

type Tab = "tickets" | "faq" | "help" | "about";

function tabClass(active: boolean) {
  return `rounded-lg px-3 py-1.5 text-sm font-medium ${
    active ? "bg-accent text-accent-foreground" : "border border-border text-foreground"
  }`;
}

export default function SupportPage() {
  const auth = useTelegramUser();
  const initData = useRawInitData();
  const [tab, setTab] = useState<Tab>("tickets");

  if (auth.status !== "authenticated" || !initData) return null;
  const isAdmin = auth.user.role === Role.ADMIN || auth.user.role === Role.SUPER_ADMIN;

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Support</h1>
        <p className="text-sm text-hint">Chat with us, browse the FAQ, or read Help articles.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setTab("tickets")} className={tabClass(tab === "tickets")}>
          Tickets
        </button>
        <button type="button" onClick={() => setTab("faq")} className={tabClass(tab === "faq")}>
          FAQ
        </button>
        <button type="button" onClick={() => setTab("help")} className={tabClass(tab === "help")}>
          Help
        </button>
        <button type="button" onClick={() => setTab("about")} className={tabClass(tab === "about")}>
          About
        </button>
      </div>

      {tab === "tickets" ? (
        <TicketsTab initData={initData} currentUserId={auth.user.id} isAdmin={isAdmin} />
      ) : null}
      {tab === "faq" ? <FaqTab initData={initData} isAdmin={isAdmin} /> : null}
      {tab === "help" ? <HelpTab initData={initData} isAdmin={isAdmin} /> : null}
      {tab === "about" ? <AboutContent initData={initData} isAdmin={isAdmin} /> : null}
    </main>
  );
}
