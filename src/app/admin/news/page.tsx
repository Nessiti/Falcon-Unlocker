"use client";

import { useState } from "react";
import { useRawInitData } from "@telegram-apps/sdk-react";
import { NewsTab } from "@/components/admin/news-tab";
import { PopupTab } from "@/components/admin/popup-tab";

type Tab = "news" | "popup";

function tabClass(active: boolean) {
  return `rounded-lg px-3 py-1.5 text-sm font-medium ${
    active ? "bg-accent text-accent-foreground" : "border border-border text-foreground"
  }`;
}

export default function AdminNewsPage() {
  const initData = useRawInitData();
  const [tab, setTab] = useState<Tab>("news");

  if (!initData) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <button type="button" onClick={() => setTab("news")} className={tabClass(tab === "news")}>
          News
        </button>
        <button
          type="button"
          onClick={() => setTab("popup")}
          className={tabClass(tab === "popup")}
        >
          Popup
        </button>
      </div>
      {tab === "news" ? <NewsTab initData={initData} /> : <PopupTab initData={initData} />}
    </div>
  );
}
