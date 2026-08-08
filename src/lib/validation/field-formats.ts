import { ServiceFieldType, ServerFieldType } from "@/generated/prisma/client";
import { isValidImei } from "@/lib/validation/imei";

export type FieldFormatRule = {
  /** Shown as a hint under the input and in validation error messages. */
  hint: string;
  /** Characters allowed while typing - used to strip invalid input live. */
  allowedChars?: RegExp;
  /** Full-value shape the submitted value must match. */
  pattern?: RegExp;
  minLength?: number;
  maxLength?: number;
  inputMode?: "numeric" | "text" | "email";
  /** Extra check the shape/length rules can't express (e.g. a checksum).
   * Returns an error message, or null when the value is fine. */
  validate?: (value: string) => string | null;
};

/**
 * Built-in default format per Form Generator field type (Chapter 11's 13
 * types, extended with UDID/MEID/ICCID). An admin's own minLength/maxLength
 * on the field (Prisma columns) overrides the defaults here - this is only
 * the fallback for fields nobody has customized. IMEI stays hard-coded at
 * exactly 15 digits: that's a fixed real-world spec, not a per-service choice.
 */
export const SERVICE_FIELD_RULES: Partial<Record<ServiceFieldType, FieldFormatRule>> = {
  IMEI: {
    hint: "Exactly 15 digits",
    allowedChars: /\d/,
    pattern: /^\d{15}$/,
    minLength: 15,
    maxLength: 15,
    inputMode: "numeric",
    // The 15th digit is a checksum of the first 14, so a single mistyped
    // digit is detectable here - before the order spends the customer's
    // balance on a provider call that would have been rejected anyway.
    validate: (value) =>
      isValidImei(value) ? null : "is not a valid IMEI (check digit doesn't match)",
  },
  SN: {
    hint: "4-40 letters/numbers",
    allowedChars: /[A-Za-z0-9]/,
    pattern: /^[A-Za-z0-9]+$/,
    minLength: 4,
    maxLength: 40,
  },
  ECID: {
    hint: "Hexadecimal, up to 20 characters",
    allowedChars: /[0-9A-Fa-f]/,
    pattern: /^[0-9A-Fa-f]+$/,
    minLength: 6,
    maxLength: 20,
  },
  UDID: {
    hint: "25-40 hex characters (with optional dashes)",
    allowedChars: /[0-9A-Fa-f-]/,
    pattern: /^[0-9A-Fa-f-]{25,40}$/,
    minLength: 25,
    maxLength: 40,
  },
  MEID: {
    hint: "14-18 hex characters",
    allowedChars: /[0-9A-Fa-f]/,
    pattern: /^[0-9A-Fa-f]{14,18}$/,
    minLength: 14,
    maxLength: 18,
  },
  ICCID: {
    hint: "18-22 digits",
    allowedChars: /\d/,
    pattern: /^\d{18,22}$/,
    minLength: 18,
    maxLength: 22,
    inputMode: "numeric",
  },
  EMAIL: {
    hint: "A valid email address",
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    maxLength: 254,
    inputMode: "email",
  },
  IP: {
    hint: "A valid IPv4 address",
    allowedChars: /[0-9.]/,
    pattern: /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/,
    maxLength: 15,
    inputMode: "numeric",
  },
  NUMBER: {
    hint: "Numbers only",
    allowedChars: /[0-9.-]/,
    pattern: /^-?\d+(\.\d+)?$/,
    inputMode: "numeric",
  },
  TEXT: { hint: "", maxLength: 255 },
  TEXTAREA: { hint: "", maxLength: 5000 },
  PASSWORD: { hint: "", maxLength: 128 },
};

export const SERVER_FIELD_RULES: Partial<Record<ServerFieldType, FieldFormatRule>> = {
  IP: SERVICE_FIELD_RULES.IP,
  USERNAME: { hint: "3-64 characters", minLength: 3, maxLength: 64 },
  PASSWORD: { hint: "4-128 characters", minLength: 4, maxLength: 128 },
  TOKEN: { hint: "Up to 256 characters", maxLength: 256 },
  SERIAL: SERVICE_FIELD_RULES.SN,
  CUSTOM_TEXTBOX: { hint: "", maxLength: 500 },
};

export type FieldValidationResult = { ok: true } | { ok: false; error: string };

/**
 * Validates a submitted field value against its type's built-in format,
 * an optional per-field admin length override, and Chapter 11's optional
 * admin regex - all three layer together (regex further restricts, it
 * doesn't replace the type/length checks).
 */
export function validateFieldValue(
  value: string,
  options: {
    label: string;
    required: boolean;
    rule: FieldFormatRule | undefined;
    minLength?: number | null;
    maxLength?: number | null;
    regex?: string | null;
  },
): FieldValidationResult {
  const trimmed = value.trim();

  if (options.required && !trimmed) {
    return { ok: false, error: `${options.label} is required` };
  }
  if (!trimmed) return { ok: true };

  const rule = options.rule;
  const minLength = options.minLength ?? rule?.minLength;
  const maxLength = options.maxLength ?? rule?.maxLength;

  if (rule?.pattern && !rule.pattern.test(trimmed)) {
    return { ok: false, error: `${options.label}: ${rule.hint || "invalid format"}` };
  }
  if (rule?.validate) {
    const problem = rule.validate(trimmed);
    if (problem) return { ok: false, error: `${options.label} ${problem}` };
  }
  if (minLength != null && trimmed.length < minLength) {
    return { ok: false, error: `${options.label} must be at least ${minLength} characters` };
  }
  if (maxLength != null && trimmed.length > maxLength) {
    return { ok: false, error: `${options.label} must be at most ${maxLength} characters` };
  }
  if (options.regex) {
    try {
      if (!new RegExp(options.regex).test(trimmed)) {
        return { ok: false, error: `${options.label}: doesn't match the required format` };
      }
    } catch {
      // Malformed admin-entered regex - ignore rather than block every order.
    }
  }

  return { ok: true };
}

/** Strips characters the field type doesn't allow, for live-typing filters. */
export function filterAllowedChars(value: string, rule: FieldFormatRule | undefined): string {
  if (!rule?.allowedChars) return value;
  return Array.from(value)
    .filter((char) => rule.allowedChars!.test(char))
    .join("");
}
