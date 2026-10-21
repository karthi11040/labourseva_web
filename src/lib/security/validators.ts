// ---------------------------------------------------------------------------
// Input validation utilities with type-safe return values.
//
// These functions validate common input types used across the LabourSeva
// application and return either the validated value or null/throw on failure.
// ---------------------------------------------------------------------------

/**
 * Validate a UUID string (v4 format).
 *
 * @param input - Value to validate
 * @returns The validated UUID string, or null if invalid
 */
export function isValidUuid(input: unknown): string | null {
  if (typeof input !== "string") return null;

  const trimmed = input.trim().toLowerCase();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

  return uuidRegex.test(trimmed) ? trimmed : null;
}

/**
 * Validate a date string in ISO 8601 format (YYYY-MM-DD).
 *
 * @param input - Value to validate
 * @returns A Date object if valid, or null if invalid
 */
export function isValidDate(input: unknown): Date | null {
  if (typeof input !== "string") return null;

  const trimmed = input.trim();

  // Check ISO date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(trimmed)) return null;

  const date = new Date(trimmed + "T00:00:00Z");
  if (isNaN(date.getTime())) return null;

  // Verify the date components match (catches invalid dates like Feb 30)
  const [year, month, day] = trimmed.split("-").map(Number);
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  // Sanity check: year should be reasonable (1900-2100)
  if (year < 1900 || year > 2100) return null;

  return date;
}

/**
 * Validate a date-time string in ISO 8601 format.
 *
 * @param input - Value to validate
 * @returns A Date object if valid, or null if invalid
 */
export function isValidDateTime(input: unknown): Date | null {
  if (typeof input !== "string") return null;

  const trimmed = input.trim();
  const date = new Date(trimmed);

  if (isNaN(date.getTime())) return null;

  // Must be a reasonable date (not before 1970 or after 2100)
  const year = date.getUTCFullYear();
  if (year < 1970 || year > 2100) return null;

  return date;
}

/**
 * Validate that a value is a member of a TypeScript enum.
 *
 * @param value - The value to check
 * @param enumType - The enum object to check against
 * @returns The validated enum value, or null if not a member
 */
export function isValidEnum<T extends Record<string, string | number>>(
  value: unknown,
  enumType: T,
): T[keyof T] | null {
  if (value === null || value === undefined) return null;

  const values = Object.values(enumType);

  // Check if the value is one of the enum values
  if (values.includes(value as string | number)) {
    return value as T[keyof T];
  }

  // For string enums, try case-insensitive match
  if (typeof value === "string") {
    const upper = value.toUpperCase();
    for (const v of values) {
      if (typeof v === "string" && v.toUpperCase() === upper) {
        return v as T[keyof T];
      }
    }
  }

  return null;
}

/**
 * Validate that a string is valid JSON.
 *
 * @param input - Value to validate
 * @returns The parsed JSON value, or null if invalid
 */
export function isValidJson(input: unknown): unknown | null {
  if (typeof input !== "string") return null;

  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}

/**
 * Validate an OTP (One-Time Password).
 * Must be exactly 6 digits.
 *
 * @param input - Value to validate
 * @returns The OTP string if valid, or null if invalid
 */
export function isValidOtp(input: unknown): string | null {
  if (typeof input !== "string") return null;

  const trimmed = input.trim();
  if (!/^[0-9]{6}$/.test(trimmed)) return null;

  return trimmed;
}

/**
 * Validate an Indian mobile phone number.
 * Accepts formats: +91XXXXXXXXXX, 91XXXXXXXXXX, 0XXXXXXXXXX, XXXXXXXXXX
 *
 * @param input - Value to validate
 * @returns The 10-digit phone number (without country code) if valid, or null
 */
export function isValidPhoneIndia(input: unknown): string | null {
  if (typeof input !== "string") return null;

  const cleaned = input.replace(/[\s\-()]/g, "");

  let digits: string;
  if (cleaned.startsWith("+91")) {
    digits = cleaned.slice(3);
  } else if (cleaned.startsWith("91") && cleaned.length === 12) {
    digits = cleaned.slice(2);
  } else if (cleaned.startsWith("0")) {
    digits = cleaned.slice(1);
  } else {
    digits = cleaned;
  }

  if (!/^[0-9]{10}$/.test(digits)) return null;
  if (!/^[6-9]/.test(digits)) return null;

  return digits;
}

/**
 * Validate an Indian postal pincode (6 digits).
 * First digit cannot be 0.
 *
 * @param input - Value to validate
 * @returns The 6-digit pincode if valid, or null if invalid
 */
export function isValidPincode(input: unknown): string | null {
  if (typeof input !== "string") return null;

  const trimmed = input.trim();
  if (!/^[1-9][0-9]{5}$/.test(trimmed)) return null;

  return trimmed;
}

/**
 * Validate an email address.
 *
 * @param input - Value to validate
 * @returns The normalized email if valid, or null if invalid
 */
export function isValidEmail(input: unknown): string | null {
  if (typeof input !== "string") return null;

  const trimmed = input.trim().toLowerCase();
  if (trimmed.length < 5 || trimmed.length > 254) return null;

  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  if (!emailRegex.test(trimmed)) return null;

  const domain = trimmed.split("@")[1];
  if (!domain || !domain.includes(".")) return null;

  return trimmed;
}

/**
 * Validate a string length is within bounds.
 *
 * @param input - Value to validate
 * @param min - Minimum length (inclusive)
 * @param max - Maximum length (inclusive)
 * @returns The trimmed string if valid, or null if invalid
 */
export function isValidLength(input: unknown, min: number, max: number): string | null {
  if (typeof input !== "string") return null;

  const trimmed = input.trim();
  if (trimmed.length < min || trimmed.length > max) return null;

  return trimmed;
}

/**
 * Validate that a value is a non-empty string.
 *
 * @param input - Value to validate
 * @returns The trimmed string if valid, or null if empty/invalid
 */
export function isNonEmptyString(input: unknown): string | null {
  if (typeof input !== "string") return null;

  const trimmed = input.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Validate that a number is an integer within a range.
 *
 * @param input - Value to validate
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @returns The integer if valid, or null if invalid
 */
export function isValidInt(input: unknown, min: number, max: number): number | null {
  if (typeof input === "string") {
    const parsed = parseInt(input, 10);
    if (isNaN(parsed)) return null;
    if (parsed < min || parsed > max) return null;
    return parsed;
  }

  if (typeof input === "number") {
    if (!Number.isInteger(input)) return null;
    if (input < min || input > max) return null;
    return input;
  }

  return null;
}

/**
 * Validate that a value is a boolean or boolean-like string.
 *
 * @param input - Value to validate
 * @returns Boolean value, or null if invalid
 */
export function isValidBoolean(input: unknown): boolean | null {
  if (typeof input === "boolean") return input;
  if (typeof input === "string") {
    const lower = input.trim().toLowerCase();
    if (lower === "true" || lower === "1" || lower === "yes") return true;
    if (lower === "false" || lower === "0" || lower === "no") return false;
  }
  if (typeof input === "number") {
    if (input === 1) return true;
    if (input === 0) return false;
  }
  return null;
}

/**
 * Validate a string contains only safe characters (no HTML/script injection).
 *
 * @param input - Value to validate
 * @returns true if the string is safe, false otherwise
 */
export function isSafeString(input: unknown): boolean {
  if (typeof input !== "string") return false;

  // Reject strings containing HTML tags or script-like patterns
  if (/<[a-z][\s\S]*>/i.test(input)) return false;
  if (/javascript\s*:/i.test(input)) return false;
  if (/on\w+\s*=/i.test(input)) return false;
  if (/data\s*:/i.test(input) && /base64/i.test(input)) return false;

  return true;
}

/**
 * Validate an Indian Aadhaar number (12 digits, not starting with 0 or 1).
 *
 * @param input - Value to validate
 * @returns The 12-digit Aadhaar if valid, or null if invalid
 */
export function isValidAadhaar(input: unknown): string | null {
  if (typeof input !== "string") return null;

  const cleaned = input.replace(/[\s-]/g, "");
  if (!/^[0-9]{12}$/.test(cleaned)) return null;
  if (cleaned[0] === "0" || cleaned[0] === "1") return null;

  return cleaned;
}

/**
 * Validate a PAN (Permanent Account Number).
 * Format: 5 letters + 4 digits + 1 letter
 *
 * @param input - Value to validate
 * @returns The uppercase PAN if valid, or null if invalid
 */
export function isValidPan(input: unknown): string | null {
  if (typeof input !== "string") return null;

  const trimmed = input.trim().toUpperCase();
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

  if (!panRegex.test(trimmed)) return null;

  return trimmed;
}

/**
 * Assert that a value is a valid UUID, throwing if not.
 * Use in contexts where a missing/invalid UUID should abort execution.
 *
 * @param input - Value to validate
 * @param fieldName - Name of the field for error messages
 * @returns The validated UUID string
 * @throws Error if the input is not a valid UUID
 */
export function assertUuid(input: unknown, fieldName: string): string {
  const result = isValidUuid(input);
  if (!result) {
    throw new Error(`Invalid UUID for ${fieldName}: expected format xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`);
  }
  return result;
}

/**
 * Assert that a value is a valid date, throwing if not.
 *
 * @param input - Value to validate
 * @param fieldName - Name of the field for error messages
 * @returns The validated Date object
 * @throws Error if the input is not a valid date
 */
export function assertDate(input: unknown, fieldName: string): Date {
  const result = isValidDate(input);
  if (!result) {
    throw new Error(`Invalid date for ${fieldName}: expected format YYYY-MM-DD`);
  }
  return result;
}
