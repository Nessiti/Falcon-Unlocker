import { NextResponse, type NextRequest } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getCurrentUser } from "@/lib/telegram/current-user";

/**
 * Server side of the direct-to-Blob upload flow for wallet recharge proof
 * photos (Chapter 40). The browser never sends the image through a Server
 * Action — it uploads straight to Vercel Blob using a short-lived token
 * this route hands out, after verifying the requester is a genuine,
 * currently signed-in customer (their initData, passed as the client
 * upload's clientPayload).
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        if (!clientPayload) {
          throw new Error("Missing auth");
        }
        await getCurrentUser(clientPayload);

        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"],
          // Modern phone cameras routinely produce 10-15MB photos.
          maximumSizeInBytes: 20 * 1024 * 1024,
          addRandomSuffix: true,
        };
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("[upload] recharge-proof failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 400 },
    );
  }
}
