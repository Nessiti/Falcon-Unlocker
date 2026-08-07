import "server-only";
import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";

/**
 * Encryption at rest (Chapter 19 - Security Center) for provider secrets
 * (apiKey/apiSecret/token). AES-256-GCM with a key derived from
 * ENCRYPTION_KEY - SHA-256 of the env var, so any length input works
 * without forcing the admin to generate a byte-exact key.
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) {
    throw new Error("ENCRYPTION_KEY is not configured");
  }
  return createHash("sha256").update(secret).digest();
}

// iv (12 bytes -> 24 hex chars) : authTag (16 bytes -> 32 hex chars) : ciphertext (hex)
const CIPHERTEXT_PATTERN = /^[0-9a-f]{24}:[0-9a-f]{32}:[0-9a-f]+$/i;

export function encryptSecret(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypts a value produced by encryptSecret. Values that don't match the
 * expected iv:authTag:ciphertext shape are returned unchanged - this is
 * what lets providers created before Chapter 19 (stored as plaintext) keep
 * working without a forced data migration; every value written from now on
 * is always encrypted, so the database converges to fully encrypted as
 * secrets are naturally edited or rotated.
 */
export function decryptSecret(value: string): string {
  if (!CIPHERTEXT_PATTERN.test(value)) return value;

  try {
    const [ivHex, authTagHex, dataHex] = value.split(":");
    const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
    const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]);
    return decrypted.toString("utf8");
  } catch {
    // Wrong key or corrupted value - fail safe by returning the raw stored
    // value (the caller ends up with a garbage credential and a failed
    // provider call, not a crash) rather than throwing.
    return value;
  }
}
