import { NextResponse, type NextRequest } from "next/server";
import { validate } from "@tma.js/init-data-node/web";

export const config = {
  // Excludes /api/telegram/webhook (Telegram calls it directly, no Mini App
  // initData) and /api/cron (the unified cron endpoint — called directly by
  // an external scheduler, e.g. cron-job.org) — both authenticate via their
  // own secret token instead. Also excludes /api/upload (Chapter 40): this
  // gate only ever validates against Falcon Unlocker's own bot token, so a
  // customer of any other tenant would always be rejected here — the
  // upload route does its own (tenant-aware) initData verification instead.
  matcher: ["/api/((?!telegram/webhook|cron(?:/|$)|upload(?:/|$)).*)"],
};

export default async function proxy(request: NextRequest) {
  const initData = request.headers.get("x-telegram-init-data");
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token || !initData) {
    return NextResponse.json(
      { error: "Missing or invalid Telegram init data" },
      { status: 401 },
    );
  }

  try {
    await validate(initData, token);
  } catch {
    return NextResponse.json(
      { error: "Missing or invalid Telegram init data" },
      { status: 401 },
    );
  }

  return NextResponse.next();
}
