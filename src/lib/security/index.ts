// ---------------------------------------------------------------------------
// Security utilities barrel export.
//
// Re-exports all security modules for convenient imports:
//   import { encrypt, validateCsrfToken, logAuditEvent } from "@/lib/security";
// ---------------------------------------------------------------------------

// Encryption (AES-256-GCM + blind indexes)
export {
  encrypt,
  decrypt,
  generateBlindIndex,
  rotateEncryption,
  encryptNullable,
  decryptNullable,
  generateBlindIndexNullable,
} from "./encryption";

// CSRF protection (double-submit cookie pattern)
export {
  generateCsrfToken,
  validateCsrfToken,
  setCsrfCookie,
  getCsrfToken,
  validateRequestCsrf,
  CSRF_COOKIE_NAME,
} from "./csrf";

// Hash-chained audit logging
export {
  logAuditEvent,
  verifyAuditChain,
  getAuditEntriesForEntity,
  getAuditEntriesForActor,
} from "./audit-log";
export type { AuditChainVerification } from "./audit-log";

// Input sanitization
export {
  sanitizeHtml,
  stripHtml,
  sanitizeFilename,
  sanitizePath,
  validateEmail,
  validatePhone,
  validateAadhaar,
  validateAadhaarFull,
  validatePan,
  validateGstin,
  validatePincode,
  validateUuid,
  validateVoterId,
  truncate,
  removeControlChars,
} from "./input-sanitizer";

// Rate limiting (DB-backed sliding window)
export {
  checkRateLimit,
  incrementRateLimit,
  resetRateLimit,
  checkAndIncrement,
  checkPreset,
  cleanupExpiredBuckets,
  RATE_LIMIT_PRESETS,
} from "./rate-limiter";
export type { RateLimitPreset, RateLimitResult } from "./rate-limiter";

// Account lockout (progressive delays)
export {
  recordFailedAttempt,
  recordSuccessfulLogin,
  isAccountLocked,
  getLockoutInfo,
  forceUnlockAccount,
  getRecentAttempts,
} from "./account-lockout";
export type { LockoutInfo } from "./account-lockout";

// Hybrid login guard (memory + shared DB sliding windows + login audit rows)
export {
  checkLoginGuard,
  recordLoginFailureGuard,
  recordLoginSuccessGuard,
  clientIpFromRequest,
} from "./login-guard";
export type { LoginGuardContext, LoginGuardResult } from "./login-guard";

// Progressive legacy password rehash (plain_password -> hashed on login)
export { verifyWithProgressiveRehash } from "./legacy-rehash";
export type { VerificationOutcome, LegacyRehashTable } from "./legacy-rehash";

// Input validators (type-safe)
export {
  isValidUuid,
  isValidDate,
  isValidDateTime,
  isValidEnum,
  isValidJson,
  isValidOtp,
  isValidPhoneIndia,
  isValidPincode,
  isValidEmail,
  isValidLength,
  isNonEmptyString,
  isValidInt,
  isValidBoolean,
  isSafeString,
  isValidAadhaar,
  isValidPan,
  assertUuid,
  assertDate,
} from "./validators";
