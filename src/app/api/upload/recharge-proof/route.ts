import { NextResponse, type NextRequest } from "next/server";
import { put } from "@vercel/blob";
import { getCurrentUser } from "@/lib/telegram/current-user";
import { TelegramAuthError } from "@/lib/telegram/auth";

// Includes the raw camera formats too, not just the compressed JPEG output
// - compressImageToJpeg falls back to the original file untouched when a
// WebView can't decode it into a canvas, so the server has to accept
// whatever a phone camera might hand it, not only its own preferred shape.
const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);
const MAX_SIZE_BYTES = 4 * 1024 * 1024;

/**
 * Wallet recharge proof photo upload (Chapter 40, rewritten). The first
 * version had the browser upload directly to Vercel Blob's own storage
 * domain - a cross-origin request that a live report showed silently
 * hanging forever inside Telegram's in-app WebView, never resolving on
 * either side (not even a fast failure). Routing the bytes through this
 * same-origin endpoint instead avoids that entirely: the client's only
 * request goes to this app's own domain, exactly like every other action.
 * The image is compressed client-side first, so this fits well inside a
 * serverless function's request body limit.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const initData = request.headers.get("x-telegram-init-data");
    if (!initData) {
      return NextResponse.json({ error: "Missing auth" }, { status: 401 });
    }
    const user = await getCurrentUser(initData);

    const contentType = request.headers.get("content-type") ?? "";
    if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }

    const body = await request.arrayBuffer();
    if (body.byteLength === 0) {
      return NextResponse.json({ error: "Empty file" }, { status: 400 });
    }
    if (body.byteLength > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: "File too large" }, { status: 400 });
    }

    const extension = contentType.split("/")[1].replace("jpeg", "jpg");
    const blob = await put(`recharge-proofs/${user.id}-${Date.now()}.${extension}`, body, {
      access: "public",
      contentType,
      addRandomSuffix: true,
    });

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error("[upload] recharge-proof failed", error);
    const message = error instanceof TelegramAuthError ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
