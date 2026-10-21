export function normalizeAadhaarNumber(value: string): string {
  return value.replace(/\D/g, "");
}

export function normalizePanNumber(value: string): string {
  return value.replace(/\s+/g, "").toUpperCase();
}

export function isPlaceholderPersonName(value: string): boolean {
  const normalized = value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
  if (!normalized) return true;
  if (["test", "testing", "yourname", "your name", "name", "n/a", "na", "unknown"].includes(normalized)) return true;

  const compact = Array.from(normalized.replace(/\s/g, ""));
  return compact.length >= 4 && compact.every((character) => character === compact[0]);
}

export function isPlaceholderEmail(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return ["example@example.com", "test@example.com", "yourname@example.com", "user@example.com"].includes(normalized);
}

export type DocumentMimeType = "application/pdf" | "image/jpeg" | "image/png";

export function detectDocumentMimeType(bytes: Uint8Array): DocumentMimeType | null {
  if (bytes.length >= 5 && Buffer.from(bytes.subarray(0, 5)).toString("ascii") === "%PDF-") {
    return "application/pdf";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  return null;
}
