import "server-only";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;

/** A public-looking key id (safe to log/display) and a secret shown to the reseller exactly once. */
export function generateApiCredentials(): { key: string; secret: string } {
  return {
    key: `fu_${randomBytes(12).toString("hex")}`,
    secret: randomBytes(24).toString("hex"),
  };
}

export function hashApiSecret(secret: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(secret, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyApiSecret(secret: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;

  const candidate = scryptSync(secret, salt, KEY_LENGTH);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;

  return timingSafeEqual(candidate, expected);
}
