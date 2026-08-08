import { NextResponse, type NextRequest } from "next/server";
import { put } from "@vercel/blob";
import { requireAdmin } from "@/lib/telegram/admin";
import { requireTenantId } from "@/lib/telegram/tenant";
import { TelegramAuthError } from "@/lib/telegram/auth";

// Includes the raw camera/screenshot formats too, not just the compressed
// JPEG the client normally sends - compressImageToJpeg falls back to the
// original file untouched when a WebView can't decode it into a canvas, so
// the server has to accept whatever a phone might hand it. SVG is
// deliberately excluded: it can carry script, and these URLs are rendered
// straight into <img> tags for every customer of the tenant.
const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);
const MAX_SIZE_BYTES = 4 * 1024 * 1024;

/** Which admin-managed image is being replaced - only used to keep blob paths tidy. */
const ALLOWED_KINDS = new Set(["logo", "qr", "payment", "service"]);

/**
 * Upload endpoint for the images an admin manages: brand logo, payment QR
 * codes, payment instruction screenshots, service thumbnails. Before this,
 * every one of those fields was a URL text box - meaning an admin had to
 * host the image somewhere else first, and a broken third-party link
 * silently emptied their storefront.
 *
 * Bytes are routed through this same-origin endpoint rather than uploaded
 * straight to Vercel Blob's own domain: a live report showed that
 * cross-origin upload silently hanging forever inside Telegram's in-app
 * WebView, never resolving on either side. The image is compressed
 * client-side first, so this fits well inside a serverless function's
 * request body limit.
 *
 * Admin-only (requireAdmin), and tenant-aware on purpose - this route is
 * excluded from the global proxy gate, which only ever validates against
 * Falcon Unlocker's own bot token and would reject every other tenant's
 * admin outright.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const initData = request.headers.get("x-telegram-init-data");
    if (!initData) {
      return NextResponse.json({ error: "Missing auth" }, { status: 401 });
    }
    const admin = await requireAdmin(initData);
    const tenantId = requireTenantId(admin);

    const kind = new URL(request.url).searchParams.get("kind") ?? "service";
    if (!ALLOWED_KINDS.has(kind)) {
      return NextResponse.json({ error: "Unknown image kind" }, { status: 400 });
    }

    const contentType = request.headers.get("content-type") ?? "";
    if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }

    const body = await request.arrayBuffer();
    if (body.byteLength === 0) {
      return NextResponse.json({ error: "Empty file" }, { status: 400 });
    }
    if (body.byteLength > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: "File too large (max 4 MB)" }, { status: 400 });
    }

    const extension = contentType.split("/")[1].replace("jpeg", "jpg");
    const blob = await put(`${tenantId}/${kind}/${Date.now()}.${extension}`, body, {
      access: "public",
      contentType,
      addRandomSuffix: true,
    });

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error("[upload] admin-image failed", error);
    const message = error instanceof TelegramAuthError ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
