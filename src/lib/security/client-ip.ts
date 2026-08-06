import "server-only";
import { headers } from "next/headers";

/** Best-effort client IP from the headers Vercel's edge sets on every request. */
export async function getClientIp(): Promise<string | null> {
  const headersList = await headers();
  const forwardedFor = headersList.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() ?? null;
  return headersList.get("x-real-ip");
}
