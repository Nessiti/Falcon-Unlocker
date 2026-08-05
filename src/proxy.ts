import { NextResponse, type NextRequest } from "next/server";
import { validate } from "@tma.js/init-data-node/web";

export const config = {
  matcher: ["/api/:path*"],
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
