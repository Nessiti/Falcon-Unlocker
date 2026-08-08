/**
 * IMEI check-digit maths (GSMA TS.06 / 3GPP TS 23.003 - the Luhn algorithm).
 *
 * An IMEI is 15 digits, but only the first 14 carry information (Type
 * Allocation Code + serial). The 15th is a checksum computed from those 14,
 * so it is fully determined - it can be predicted, and a typo in any single
 * digit makes the whole number fail the check. That means we can catch a
 * mistyped IMEI before spending the customer's balance on a provider call
 * that would have been rejected anyway.
 */

/** Luhn sum over a digits-only string. */
function luhnSum(digits: string): number {
  let sum = 0;
  // Doubling applies to every second digit counting from the right, so the
  // parity depends on the string's length - anchoring to the end keeps this
  // correct for both the 14-digit (predicting) and 15-digit (checking) case.
  for (let i = 0; i < digits.length; i += 1) {
    let value = digits.charCodeAt(digits.length - 1 - i) - 48;
    if (i % 2 === 1) {
      value *= 2;
      if (value > 9) value -= 9;
    }
    sum += value;
  }
  return sum;
}

/**
 * The 15th digit implied by the first 14. Returns null unless given exactly
 * 14 digits, so callers can't accidentally "complete" a partial entry.
 */
export function imeiCheckDigit(first14: string): string | null {
  if (!/^\d{14}$/.test(first14)) return null;
  // luhnSum treats index 0 as the rightmost digit and does NOT double it.
  // Appending the check digit shifts every existing digit one place left, so
  // sum the 14 as if a 0 were already appended.
  const sum = luhnSum(`${first14}0`);
  return String((10 - (sum % 10)) % 10);
}

/** Full 15-digit IMEI, checksum included. Exactly 15 digits and Luhn-valid. */
export function isValidImei(imei: string): boolean {
  if (!/^\d{15}$/.test(imei)) return false;
  return luhnSum(imei) % 10 === 0;
}

/**
 * What the input should show for a partially typed IMEI:
 * - 14 digits -> the predicted full 15-digit number, so the customer can
 *   accept it in one tap instead of reading the checksum off the handset.
 * - 15 valid digits -> nothing to suggest.
 * - anything else -> null.
 */
export function suggestImei(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 14) return null;
  const check = imeiCheckDigit(digits);
  return check === null ? null : `${digits}${check}`;
}
