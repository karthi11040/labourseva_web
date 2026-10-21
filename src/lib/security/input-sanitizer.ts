// ---------------------------------------------------------------------------
// Input sanitization utilities.
//
// Provides XSS prevention, path traversal prevention, and validation helpers
// for common Indian identity formats. Prisma handles SQL injection prevention
// via parameterized queries; these functions add an additional validation layer.
// ---------------------------------------------------------------------------

// Characters that must be escaped in HTML contexts.
const HTML_ENTITY_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;",
  "`": "&#96;",
};

const HTML_ENTITY_REGEX = /[&<>"'`/]/g;

/**
 * Encode a string for safe inclusion in HTML content.
 * Converts dangerous characters to their HTML entity equivalents.
 *
 * @param input - Raw user input
 * @returns HTML-safe string with entities encoded
 */
export function sanitizeHtml(input: string): string {
  if (typeof input !== "string") return "";
  return input.replace(HTML_ENTITY_REGEX, (char) => HTML_ENTITY_MAP[char] ?? char);
}

/**
 * Strip all HTML tags from a string and remove common XSS vectors.
 * Use this when you need to completely remove HTML, not just encode it.
 *
 * @param input - Raw user input potentially containing HTML
 * @returns Plain text with all HTML tags removed
 */
export function stripHtml(input: string): string {
  if (typeof input !== "string") return "";

  let cleaned = input
    // Remove script tags and their content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    // Remove event handlers (on*=)
    .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, "")
    // Remove javascript: protocol
    .replace(/javascript\s*:/gi, "")
    // Remove all remaining HTML tags
    .replace(/<\/?[^>]+>/g, "")
    // Remove HTML entities
    .replace(/&[#\w]+;/g, "");

  // Collapse excessive whitespace
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  return cleaned;
}

/**
 * Sanitize a filename to prevent path traversal and other attacks.
 * Removes directory separators, null bytes, and other dangerous characters.
 *
 * @param input - Original filename from user upload
 * @returns Safe filename containing only alphanumeric chars, hyphens, underscores, and dots
 */
export function sanitizeFilename(input: string): string {
  if (typeof input !== "string") return "unnamed";

  let safe = input
    // Remove null bytes
    .replace(/\0/g, "")
    // Remove path separators and traversal sequences
    .replace(/[/\\]/g, "")
    // Remove any leading dots (hidden files)
    .replace(/^\.+/, "")
    // Keep only safe characters: alphanumeric, hyphen, underscore, dot
    .replace(/[^a-zA-Z0-9._-]/g, "_");

  // Limit length
  if (safe.length > 255) {
    const ext = safe.lastIndexOf(".");
    if (ext > 0) {
      const extension = safe.slice(ext, ext + 10);
      safe = safe.slice(0, 245 - extension.length) + extension;
    } else {
      safe = safe.slice(0, 245);
    }
  }

  // Ensure it's not empty
  if (!safe || safe === "." || safe === "..") {
    return "unnamed";
  }

  return safe;
}

/**
 * Sanitize a file path to prevent path traversal attacks.
 * Ensures the resolved path stays within the expected base directory.
 *
 * @param inputPath - User-supplied path
 * @param baseDir - The base directory the path should be contained within
 * @returns The sanitized path, or null if it escapes the base directory
 */
export function sanitizePath(inputPath: string, baseDir: string): string | null {
  if (typeof inputPath !== "string") return null;

  // Remove null bytes
  const cleaned = inputPath.replace(/\0/g, "");

  // Normalize path separators
  const normalized = cleaned.replace(/\\/g, "/");

  // Check for traversal attempts
  if (normalized.includes("../") || normalized.includes("/..") || normalized === "..") {
    return null;
  }

  // Ensure no absolute paths
  if (normalized.startsWith("/") || /^[a-zA-Z]:/.test(normalized)) {
    return null;
  }

  // Combine with base directory
  const combined = `${baseDir.replace(/[/\\]+$/, "")}/${normalized}`;

  return combined;
}

/**
 * Validate an email address format.
 * Uses a practical regex that covers common valid email formats.
 *
 * @param input - Email address to validate
 * @returns The trimmed email if valid, null otherwise
 */
export function validateEmail(input: string): string | null {
  if (typeof input !== "string") return null;

  const trimmed = input.trim().toLowerCase();
  if (trimmed.length < 5 || trimmed.length > 254) return null;

  // RFC 5322 practical subset
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  if (!emailRegex.test(trimmed)) return null;

  // Must have at least one dot in the domain
  const domain = trimmed.split("@")[1];
  if (!domain || !domain.includes(".")) return null;

  return trimmed;
}

/**
 * Validate an Indian mobile phone number.
 * Accepts formats: +91XXXXXXXXXX, 91XXXXXXXXXX, 0XXXXXXXXXX, XXXXXXXXXX
 *
 * @param input - Phone number to validate
 * @returns The 10-digit phone number (without country code) if valid, null otherwise
 */
export function validatePhone(input: string): string | null {
  if (typeof input !== "string") return null;

  // Strip spaces, dashes, parentheses
  const cleaned = input.replace(/[\s\-()]/g, "");

  // Remove leading +91 or 91 or 0
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

  // Must be exactly 10 digits
  if (!/^[0-9]{10}$/.test(digits)) return null;

  // Indian mobile numbers start with 6, 7, 8, or 9
  if (!/^[6-9]/.test(digits)) return null;

  return digits;
}

/**
 * Validate an Aadhaar number (12 digits).
 * Does NOT validate the checksum digit; use a dedicated library for that.
 * Masks the output for security (returns only last 4 digits).
 *
 * @param input - Aadhaar number to validate
 * @returns The last 4 digits if the format is valid, null otherwise
 */
export function validateAadhaar(input: string): string | null {
  if (typeof input !== "string") return null;

  // Strip spaces and dashes
  const cleaned = input.replace(/[\s-]/g, "");

  // Must be exactly 12 digits
  if (!/^[0-9]{12}$/.test(cleaned)) return null;

  // Aadhaar numbers must not start with 0 or 1
  if (cleaned[0] === "0" || cleaned[0] === "1") return null;

  // Return only last 4 digits for storage/display
  return cleaned.slice(-4);
}

/**
 * Validate a full Aadhaar number (12 digits) without masking.
 * Use only when the full number is needed for verification.
 *
 * @param input - Aadhaar number to validate
 * @returns The 12-digit Aadhaar number if valid, null otherwise
 */
export function validateAadhaarFull(input: string): string | null {
  if (typeof input !== "string") return null;

  const cleaned = input.replace(/[\s-]/g, "");
  if (!/^[0-9]{12}$/.test(cleaned)) return null;
  if (cleaned[0] === "0" || cleaned[0] === "1") return null;

  return cleaned;
}

/**
 * Validate a PAN (Permanent Account Number) format.
 * Format: AAAAANNNNA (5 letters, 4 digits, 1 letter)
 *
 * @param input - PAN to validate
 * @returns The uppercase PAN if valid, null otherwise
 */
export function validatePan(input: string): string | null {
  if (typeof input !== "string") return null;

  const trimmed = input.trim().toUpperCase();
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

  if (!panRegex.test(trimmed)) return null;

  // Fourth character must be one of the valid holder type codes
  // P=Person, C=Company, H=HUF, F=Firm, A=AOP, T=Trust, B=BOI, L=Local Authority, J=Artificial Juridical, G=Government
  const validFourthChars = "PCHFATBLJG";
  if (!validFourthChars.includes(trimmed[3])) return null;

  return trimmed;
}

/**
 * Validate a GSTIN (Goods and Services Tax Identification Number).
 * Format: 2 digits (state code) + 10 chars (PAN) + 1 digit (entity) + 1 letter (Z) + 1 alphanumeric
 *
 * @param input - GSTIN to validate
 * @returns The uppercase GSTIN if valid, null otherwise
 */
export function validateGstin(input: string): string | null {
  if (typeof input !== "string") return null;

  const trimmed = input.trim().toUpperCase();
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

  if (!gstinRegex.test(trimmed)) return null;

  return trimmed;
}

/**
 * Validate an Indian pincode (6 digits).
 * First digit cannot be 0.
 *
 * @param input - Pincode to validate
 * @returns The 6-digit pincode if valid, null otherwise
 */
export function validatePincode(input: string): string | null {
  if (typeof input !== "string") return null;

  const trimmed = input.trim();
  if (!/^[1-9][0-9]{5}$/.test(trimmed)) return null;

  return trimmed;
}

/**
 * Validate a UUID v4 format.
 *
 * @param input - UUID to validate
 * @returns The UUID if valid, null otherwise
 */
export function validateUuid(input: string): string | null {
  if (typeof input !== "string") return null;

  const trimmed = input.trim().toLowerCase();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

  if (!uuidRegex.test(trimmed)) return null;

  return trimmed;
}

/**
 * Validate and sanitize a voter ID (EPIC) number.
 * Format: 1 letter + 7 digits (varies by state, but this is the common format)
 *
 * @param input - Voter ID to validate
 * @returns The uppercase voter ID if valid, null otherwise
 */
export function validateVoterId(input: string): string | null {
  if (typeof input !== "string") return null;

  const trimmed = input.trim().toUpperCase();
  // EPIC format: 3 letters + 7 digits (more permissive)
  const voterIdRegex = /^[A-Z]{2,3}[0-9]{7}$/;

  if (!voterIdRegex.test(trimmed)) return null;

  return trimmed;
}

/**
 * Truncate a string to a maximum length, appending an ellipsis if truncated.
 *
 * @param input - String to truncate
 * @param maxLength - Maximum allowed length
 * @returns Truncated string
 */
export function truncate(input: string, maxLength: number): string {
  if (typeof input !== "string") return "";
  if (input.length <= maxLength) return input;
  return input.slice(0, maxLength - 3) + "...";
}

/**
 * Remove all control characters and null bytes from a string.
 *
 * @param input - String to clean
 * @returns Cleaned string with control characters removed
 */
export function removeControlChars(input: string): string {
  if (typeof input !== "string") return "";
  // Remove C0 and C1 control characters, but keep common whitespace (\t, \n, \r)
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "");
}
