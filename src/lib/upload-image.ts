/** Client-only helpers for the wallet recharge proof upload (Chapter 40). */

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.8;

/**
 * Downscales and re-encodes an image as JPEG before it ever leaves the
 * device — a full-resolution phone photo can be 10-15MB, comfortably past
 * what a serverless function's request body allows, while a compressed
 * proof-of-payment screenshot is plenty legible well under 1MB. Falls back
 * to the original file untouched if the browser can't decode it (some
 * WebViews don't support every format via canvas).
 */
export async function compressImageToJpeg(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    return blob ?? file;
  } catch {
    return file;
  }
}

export type UploadProgressCallback = (percentage: number) => void;

/**
 * POSTs a blob to `url` with real byte-level progress — `fetch` doesn't
 * expose upload progress in a broadly supported way, XHR still does.
 */
export function uploadWithProgress(
  url: string,
  body: Blob,
  options: { headers: Record<string, string>; onProgress: UploadProgressCallback; signal: AbortSignal },
): Promise<{ url: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    for (const [key, value] of Object.entries(options.headers)) {
      xhr.setRequestHeader(key, value);
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        options.onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      let data: unknown;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        data = null;
      }
      if (xhr.status >= 200 && xhr.status < 300 && data && typeof (data as { url?: unknown }).url === "string") {
        resolve(data as { url: string });
        return;
      }
      const message =
        data && typeof (data as { error?: unknown }).error === "string"
          ? (data as { error: string }).error
          : "Upload failed";
      reject(new Error(message));
    };

    xhr.onerror = () => reject(new Error("Network error"));
    xhr.onabort = () => reject(new DOMException("Aborted", "AbortError"));
    options.signal.addEventListener("abort", () => xhr.abort());

    xhr.send(body);
  });
}
