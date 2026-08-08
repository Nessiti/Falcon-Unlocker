"use client";

import { useState, type ChangeEvent } from "react";
import { compressImageToJpeg, uploadWithProgress } from "@/lib/upload-image";
import { Icon } from "@/components/ui/icon";

const UPLOAD_TIMEOUT_MS = 45_000;

function uploadErrorMessage(error: unknown): string {
  if (error instanceof DOMException && error.name === "AbortError") {
    return "Upload timed out. Check your connection and try again.";
  }
  // The route's own messages are already short plain-language reasons
  // ("Unsupported file type", "File too large (max 4 MB)") - worth showing
  // as-is rather than masking behind one generic string.
  if (error instanceof Error && error.message) return error.message;
  return "Couldn't upload the image. Try again.";
}

/**
 * Pick-and-upload replacement for the URL text boxes admins used to have to
 * fill for the brand logo, payment QR codes, payment instruction images and
 * service thumbnails. Those required hosting the image somewhere else
 * first, and left the storefront silently broken whenever a third-party
 * link died. Stores the resulting blob URL in the same string field, so
 * nothing about the data model changes - only how the value gets there.
 */
export function ImageUploadField({
  label,
  value,
  onChange,
  initData,
  kind,
  hint,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  initData: string;
  kind: "logo" | "qr" | "payment" | "service";
  hint?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError(null);
    setUploading(true);
    setProgress(0);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);
    try {
      const compressed = await compressImageToJpeg(file);
      const result = await uploadWithProgress(`/api/upload/admin-image?kind=${kind}`, compressed, {
        headers: {
          "x-telegram-init-data": initData,
          "content-type": compressed.type || "image/jpeg",
        },
        onProgress: setProgress,
        signal: controller.signal,
      });
      onChange(result.url);
    } catch (uploadError) {
      console.error("[admin] image upload failed", uploadError);
      setError(uploadErrorMessage(uploadError));
    } finally {
      clearTimeout(timeout);
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-foreground">{label}</span>

      {value ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- uploaded blob URL */}
          <img
            src={value}
            alt=""
            className="h-16 w-16 shrink-0 rounded-xl border border-border object-contain"
          />
          <button
            type="button"
            onClick={() => onChange("")}
            className="rounded-lg border border-border px-2 py-1 text-xs text-red-500 transition-transform active:scale-95"
          >
            Remove
          </button>
        </div>
      ) : null}

      <label className="flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-surface">
        <Icon name="plus" className="h-4 w-4" />
        {value ? "Replace image" : "Upload image"}
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={uploading}
          className="hidden"
        />
      </label>

      {uploading ? (
        <div className="flex flex-col gap-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-background">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-hint">Uploading… {progress}%</p>
        </div>
      ) : null}

      {error ? <p className="text-xs text-red-500">{error}</p> : null}
      {hint && !error ? <p className="text-xs text-hint">{hint}</p> : null}
    </div>
  );
}
