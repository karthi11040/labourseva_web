import test from "node:test";
import assert from "node:assert/strict";
import {
  detectDocumentMimeType,
  isPlaceholderEmail,
  isPlaceholderPersonName,
  normalizeAadhaarNumber,
  normalizePanNumber,
} from "../src/lib/verification/validation";

test("normalizes Aadhaar and PAN for exact comparisons", () => {
  assert.equal(normalizeAadhaarNumber("1234 5678-9012"), "123456789012");
  assert.equal(normalizePanNumber("abcde 1234 f"), "ABCDE1234F");
});

test("rejects generic placeholders while allowing ordinary names", () => {
  assert.equal(isPlaceholderPersonName("Your Name"), true);
  assert.equal(isPlaceholderPersonName("AAAAAA"), true);
  assert.equal(isPlaceholderPersonName("Karthik Kumar"), false);
  assert.equal(isPlaceholderEmail("test@example.com"), true);
  assert.equal(isPlaceholderEmail("karthik@example.org"), false);
});

test("detects supported document formats from bytes rather than declared MIME", () => {
  assert.equal(detectDocumentMimeType(Buffer.from("%PDF-1.7")), "application/pdf");
  assert.equal(detectDocumentMimeType(Buffer.from([0xff, 0xd8, 0xff, 0x00])), "image/jpeg");
  assert.equal(detectDocumentMimeType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), "image/png");
  assert.equal(detectDocumentMimeType(Buffer.from("not a document")), null);
});
