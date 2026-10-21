import crypto from "node:crypto";

// ---------------------------------------------------------------------------
// AES-256-GCM encryption matching the *Enc column pattern in the Prisma schema.
// Ciphertext format: "v<keyVersion>:<iv>:<tag>:<data>" (all base64url encoded).
// Blind indexes use HMAC-SHA256 and produce 64-char hex strings for *Hash columns.
// ---------------------------------------------------------------------------

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12; // 96-bit IV recommended for GCM
const AUTH_TAG_BYTES = 16;

/**
 * Retrieve the raw 256-bit encryption key from the environment.
 * Accepts either a 32-byte raw key or a base64/base64url encoded key.
 * Throws if ENCRYPTION_KEY is missing or invalid.
 */
function getEncryptionKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("ENCRYPTION_KEY environment variable is not set");
  }

  // If it's exactly 64 hex chars, decode as hex
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, "hex");
  }

  // If it's 44 base64 chars (32 bytes padded), decode as base64
  if (raw.length === 44 && raw.endsWith("=")) {
    return Buffer.from(raw, "base64");
  }

  // If it's 43 base64url chars (32 bytes unpadded), decode as base64url
  if (/^[A-Za-z0-9_-]{43}$/.test(raw)) {
    return Buffer.from(raw, "base64url");
  }

  // Try raw 32-byte string
  if (Buffer.byteLength(raw, "utf-8") === 32) {
    return Buffer.from(raw, "utf-8");
  }

  throw new Error("ENCRYPTION_KEY must be 32 bytes (hex, base64, base64url, or raw)");
}

/**
 * Retrieve the current encryption key version from the environment.
 */
function getKeyVersion(): number {
  const version = process.env.ENCRYPTION_KEY_VERSION;
  if (!version) {
    throw new Error("ENCRYPTION_KEY_VERSION environment variable is not set");
  }
  const parsed = parseInt(version, 10);
  if (isNaN(parsed) || parsed < 1) {
    throw new Error("ENCRYPTION_KEY_VERSION must be a positive integer");
  }
  return parsed;
}

/**
 * Retrieve the HMAC blind index key from the environment.
 */
function getHmacKey(): Buffer {
  const raw = process.env.HMAC_BLIND_INDEX_KEY;
  if (!raw) {
    throw new Error("HMAC_BLIND_INDEX_KEY environment variable is not set");
  }

  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, "hex");
  }

  if (Buffer.byteLength(raw, "utf-8") === 32) {
    return Buffer.from(raw, "utf-8");
  }

  throw new Error("HMAC_BLIND_INDEX_KEY must be 32 bytes (hex or raw)");
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 *
 * Returns the ciphertext in the format: `v<version>:<iv>:<tag>:<data>`
 * where iv, tag, and data are base64url-encoded.
 *
 * @param plaintext - The string to encrypt
 * @returns Encrypted string in the project's canonical format
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const version = getKeyVersion();
  const iv = crypto.randomBytes(IV_BYTES);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf-8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  if (authTag.length !== AUTH_TAG_BYTES) {
    throw new Error("Unexpected authentication tag length");
  }

  const ivB64 = iv.toString("base64url");
  const tagB64 = authTag.toString("base64url");
  const dataB64 = encrypted.toString("base64url");

  return `v${version}:${ivB64}:${tagB64}:${dataB64}`;
}

/**
 * Decrypt a ciphertext string produced by {@link encrypt}.
 *
 * @param ciphertext - String in `v<version>:<iv>:<tag>:<data>` format
 * @returns The original plaintext
 * @throws If the ciphertext format is invalid, the key version is unknown,
 *         or the authentication tag does not match (tampered data)
 */
export function decrypt(ciphertext: string): string {
  const parts = ciphertext.split(":");
  if (parts.length !== 4) {
    throw new Error("Invalid ciphertext format: expected v<version>:<iv>:<tag>:<data>");
  }

  const [versionPart, ivB64, tagB64, dataB64] = parts as [string, string, string, string];

  if (!versionPart.startsWith("v")) {
    throw new Error("Invalid ciphertext: missing version prefix");
  }

  const _ciphertextVersion = parseInt(versionPart.slice(1), 10);
  if (isNaN(_ciphertextVersion) || _ciphertextVersion < 1) {
    throw new Error("Invalid ciphertext: malformed version number");
  }

  // Always use the current encryption key for decryption.
  // For key rotation, use rotateEncryption() which handles version mapping.
  const key = getEncryptionKey();

  let iv: Buffer;
  let authTag: Buffer;
  let encryptedData: Buffer;

  try {
    iv = Buffer.from(ivB64, "base64url");
    authTag = Buffer.from(tagB64, "base64url");
    encryptedData = Buffer.from(dataB64, "base64url");
  } catch {
    throw new Error("Invalid ciphertext: failed to decode base64url components");
  }

  if (iv.length !== IV_BYTES) {
    throw new Error(`Invalid ciphertext: IV must be ${IV_BYTES} bytes, got ${iv.length}`);
  }

  if (authTag.length !== AUTH_TAG_BYTES) {
    throw new Error(`Invalid ciphertext: auth tag must be ${AUTH_TAG_BYTES} bytes, got ${authTag.length}`);
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  try {
    const decrypted = Buffer.concat([
      decipher.update(encryptedData),
      decipher.final(),
    ]);
    return decrypted.toString("utf-8");
  } catch {
    throw new Error("Decryption failed: data may be tampered or encrypted with a different key");
  }
}

/**
 * Generate an HMAC-SHA256 blind index for a value.
 * Used for *Hash columns (64-char hex) to enable equality lookups
 * on encrypted data without revealing the plaintext.
 *
 * @param value - The plaintext value to index
 * @returns 64-character lowercase hex string
 */
export function generateBlindIndex(value: string): string {
  const key = getHmacKey();
  return crypto
    .createHmac("sha256", key)
    .update(value)
    .digest("hex");
}

/**
 * Re-encrypt a ciphertext from an old key version to the current key version.
 *
 * @param oldCiphertext - The ciphertext to rotate
 * @param _oldVersion - The key version that was used to encrypt (informational;
 *   the current key is used for both decryption and re-encryption in this
 *   single-key setup; for multi-key rotation, extend getEncryptionKey to accept
 *   a version parameter)
 * @param _newVersion - The target key version (informational)
 * @returns The re-encrypted ciphertext with the current key version prefix
 * @throws If decryption of the old ciphertext fails
 */
export function rotateEncryption(
  oldCiphertext: string,
  _oldVersion: number,
  _newVersion: number,
): string {
  // Decrypt with the current key (single-key setup).
  // In a multi-key setup, you would look up the key by _oldVersion here.
  const plaintext = decrypt(oldCiphertext);

  // Re-encrypt with the current key and version.
  return encrypt(plaintext);
}

/**
 * Safely encrypt a nullable value. Returns null if the input is null/undefined.
 */
export function encryptNullable(value: string | null | undefined): string | null {
  if (value == null || value === "") return null;
  return encrypt(value);
}

/**
 * Safely decrypt a nullable value. Returns null if the input is null/undefined.
 */
export function decryptNullable(ciphertext: string | null | undefined): string | null {
  if (ciphertext == null || ciphertext === "") return null;
  return decrypt(ciphertext);
}

/**
 * Generate a blind index for a nullable value. Returns null if the input is null/undefined.
 */
export function generateBlindIndexNullable(value: string | null | undefined): string | null {
  if (value == null || value === "") return null;
  return generateBlindIndex(value);
}
