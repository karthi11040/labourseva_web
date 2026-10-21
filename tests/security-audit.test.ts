(process.env as any).NODE_ENV = "test";

import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { signHmacSession, verifyHmacSession } from "../src/lib/session-validator";
import { getAuthenticatedActor } from "../src/lib/staff-session";
import { verifyRazorpaySignature } from "../src/lib/razorpay";
import { GET as handleUserApplications } from "../src/app/api/user/applications/route";
import { GET as handleUserDocuments } from "../src/app/api/user/documents/route";
import { GET as handleUserPayments } from "../src/app/api/user/payments/route";
import { GET as handleUserReceipt } from "../src/app/api/user/payments/receipt/route";
import { POST as handleEsServicesUpload } from "../src/app/api/es-services/upload/route";
import { POST as handleAdminEsCategories, PUT as handleAdminEsCategoriesPut, DELETE as handleAdminEsCategoriesDelete } from "../src/app/api/admin/es-categories/route";
import { POST as handleAdminEsServices, PUT as handleAdminEsServicesPut, DELETE as handleAdminEsServicesDelete } from "../src/app/api/admin/es-services/route";

describe("LabourSeva Platform Security Audit & Regression Test Suite", () => {
  // =========================================================================
  // 1. Cryptographic HMAC Session Integrity & Verification
  // =========================================================================
  describe("1. HMAC Session Signing and Verification", () => {
    it("signs and verifies a valid Customer session token", () => {
      const payload = { id: 42, phone: "9876543210", role: "CUSTOMER", name: "Ravi Kumar" };
      const token = signHmacSession(payload, "CUSTOMER", 3600);

      assert.ok(token.includes("."), "Token should contain dot separator");
      const verified = verifyHmacSession(token, "CUSTOMER");
      assert.ok(verified, "Verified token payload should exist");
      assert.equal(verified?.id, 42);
      assert.equal(verified?.phone, "9876543210");
      assert.equal(verified?.role, "CUSTOMER");
    });

    it("rejects token with tampered payload", () => {
      const token = signHmacSession({ id: 42, role: "CUSTOMER" }, "CUSTOMER");
      const [payloadStr, signature] = token.split(".");

      // Tamper with payload to elevate privilege or change ID
      const tamperedObj = { id: 9999, role: "ADMIN" };
      const tamperedPayloadStr = Buffer.from(JSON.stringify(tamperedObj)).toString("base64url");
      const tamperedToken = `${tamperedPayloadStr}.${signature}`;

      const verified = verifyHmacSession(tamperedToken, "CUSTOMER");
      assert.equal(verified, null, "Tampered payload must be rejected by HMAC verification");
    });

    it("rejects token with tampered signature", () => {
      const token = signHmacSession({ id: 42, role: "CUSTOMER" }, "CUSTOMER");
      const [payloadStr] = token.split(".");
      const badSignature = crypto.randomBytes(32).toString("hex");
      const badToken = `${payloadStr}.${badSignature}`;

      const verified = verifyHmacSession(badToken, "CUSTOMER");
      assert.equal(verified, null, "Tampered signature must be rejected");
    });

    it("rejects expired tokens", () => {
      // Create token that expired 60 seconds ago
      const expiredToken = signHmacSession({ id: 42, role: "CUSTOMER" }, "CUSTOMER", -60);
      const verified = verifyHmacSession(expiredToken, "CUSTOMER");
      assert.equal(verified, null, "Expired token must be rejected");
    });

    it("rejects cross-portal session token reuse", () => {
      // Token signed for CUSTOMER portal should be rejected by RETAILER portal validator
      const customerToken = signHmacSession({ id: 42, role: "CUSTOMER" }, "CUSTOMER");
      const verifiedForRetailer = verifyHmacSession(customerToken, "RETAILER");
      assert.equal(verifiedForRetailer, null, "Cross-portal token reuse must be rejected");
    });
  });

  // =========================================================================
  // 2. Identity Spoofing Protection (Header-based Spoofing)
  // =========================================================================
  describe("2. Header-Based Identity Spoofing Protection", () => {
    it("rejects client-supplied x-user-role and x-user-id in production mode", () => {
      const originalEnv = process.env.NODE_ENV;
      const originalArgv = [...process.argv];
      const originalExecArgv = [...process.execArgv];
      try {
        (process.env as any).NODE_ENV = "production";
        // Temporarily clear test runner flags to simulate live production request
        process.argv = ["node", "server.js"];
        process.execArgv = [];

        const spoofedRequest = new Request("http://localhost:3000/api/verification/status", {
          headers: {
            "x-user-role": "CUSTOMER",
            "x-user-id": "1",
            "x-user-name": "Attacker",
          },
        });

        const actor = getAuthenticatedActor(spoofedRequest);
        assert.equal(actor.role, "ANONYMOUS", "Header spoofing must be rejected in production mode");
        assert.equal(actor.id, "anonymous");
      } finally {
        (process.env as any).NODE_ENV = originalEnv;
        process.argv = originalArgv;
        process.execArgv = originalExecArgv;
      }
    });
  });

  // =========================================================================
  // 3. Razorpay Cryptographic Payment Signature Verification
  // =========================================================================
  describe("3. Razorpay Payment Signature Verification", () => {
    const keySecret = "test_razorpay_secret_123456789";
    const orderId = "order_NmbKjhg1234567";
    const paymentId = "pay_NmbKjhg7654321";

    it("successfully verifies valid Razorpay HMAC-SHA256 signature", () => {
      const validSignature = crypto
        .createHmac("sha256", keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");

      const isValid = verifyRazorpaySignature(keySecret, orderId, paymentId, validSignature);
      assert.equal(isValid, true, "Legitimate Razorpay signature must verify successfully");
    });

    it("rejects forged Razorpay signature", () => {
      const forgedSignature = "a".repeat(64);
      const isValid = verifyRazorpaySignature(keySecret, orderId, paymentId, forgedSignature);
      assert.equal(isValid, false, "Forged signature must be rejected");
    });

    it("rejects signature when orderId or paymentId is modified", () => {
      const validSignature = crypto
        .createHmac("sha256", keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");

      const tamperedPaymentId = "pay_TAMPERED999";
      const isValid = verifyRazorpaySignature(keySecret, orderId, tamperedPaymentId, validSignature);
      assert.equal(isValid, false, "Altered payment ID must cause verification failure");
    });

    it("rejects empty or malformed signatures", () => {
      assert.equal(verifyRazorpaySignature(keySecret, orderId, paymentId, ""), false);
      assert.equal(verifyRazorpaySignature(keySecret, orderId, paymentId, "short_sig"), false);
    });
  });

  // =========================================================================
  // 4. IDOR & Unauthenticated Access Prevention on Citizen Endpoints
  // =========================================================================
  describe("4. IDOR and Access Control on User Endpoints", () => {
    it("blocks unauthenticated access to /api/user/applications with 401", async () => {
      const req = new Request("http://localhost:3000/api/user/applications", {
        method: "GET",
      });
      const res = await handleUserApplications(req as any);
      assert.equal(res.status, 401, "Unauthenticated access must return 401 Unauthorized");
      const data = await res.json();
      assert.equal(data.ok, false);
      assert.match(data.error, /authentication required/i);
    });

    it("blocks unauthenticated access to /api/user/documents with 401", async () => {
      const req = new Request("http://localhost:3000/api/user/documents", {
        method: "GET",
      });
      const res = await handleUserDocuments(req as any);
      assert.equal(res.status, 401, "Unauthenticated access must return 401 Unauthorized");
      const data = await res.json();
      assert.equal(data.ok, false);
      assert.match(data.error, /authentication required/i);
    });

    it("blocks unauthenticated access to /api/user/payments with 401", async () => {
      const req = new Request("http://localhost:3000/api/user/payments", {
        method: "GET",
      });
      const res = await handleUserPayments(req as any);
      assert.equal(res.status, 401, "Unauthenticated access must return 401 Unauthorized");
      const data = await res.json();
      assert.equal(data.ok, false);
      assert.match(data.error, /authentication required/i);
    });

    it("blocks unauthenticated receipt download with 401", async () => {
      const req = new Request("http://localhost:3000/api/user/payments/receipt", {
        method: "GET",
      });
      const res = await handleUserReceipt(req as any);
      assert.equal(res.status, 401, "Unauthenticated receipt download must return 401 Unauthorized");
      const data = await res.json();
      assert.equal(data.ok, false);
      assert.match(data.error, /authentication required/i);
    });

    it("rejects authenticated receipt download without paymentId with 400", async () => {
      const validCookie = signHmacSession({ id: 8881, phone: "9876543210", role: "CUSTOMER" }, "CUSTOMER");
      const req = new Request("http://localhost:3000/api/user/payments/receipt", {
        method: "GET",
        headers: {
          cookie: `labourseva-user-session=${validCookie}`,
        },
      });
      const res = await handleUserReceipt(req as any);
      assert.equal(res.status, 400, "Missing payment ID must return 400 Bad Request");
      const data = await res.json();
      assert.equal(data.ok, false);
      assert.match(data.error, /payment id required/i);
    });
  });

  // =========================================================================
  // 5. File Upload Security (XSS / Remote Code Execution Prevention)
  // =========================================================================
  describe("5. File Upload Whitelist and Magic Byte Enforcement", () => {
    it("rejects dangerous executable or script files (.php, .html, .exe)", async () => {
      const phpContent = "<?php echo 'malicious'; ?>";
      const formData = new FormData();
      const fakeFile = new File([phpContent], "shell.php", { type: "application/x-php" });
      formData.append("file", fakeFile);

      const req = new Request("http://localhost:3000/api/es-services/upload", {
        method: "POST",
        body: formData,
      });

      const res = await handleEsServicesUpload(req);
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.ok, false);
      assert.match(data.error, /unsupported file type/i);
    });

    it("rejects files where extension is .pdf but content lacks %PDF magic header", async () => {
      const fakePdfContent = "This is not really a PDF file, just plain text.";
      const formData = new FormData();
      const fakePdf = new File([fakePdfContent], "fake.pdf", { type: "application/pdf" });
      formData.append("file", fakePdf);

      const req = new Request("http://localhost:3000/api/es-services/upload", {
        method: "POST",
        body: formData,
      });

      const res = await handleEsServicesUpload(req);
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.ok, false);
      assert.match(data.error, /expected document format/i);
    });

    it("accepts valid PDF with %PDF magic header", async () => {
      const validPdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]); // %PDF-1.4
      const formData = new FormData();
      const validPdf = new File([validPdfBytes], "legit.pdf", { type: "application/pdf" });
      formData.append("file", validPdf);
      formData.append("documentType", "aadhaar");

      const req = new Request("http://localhost:3000/api/es-services/upload", {
        method: "POST",
        body: formData,
      });

      const res = await handleEsServicesUpload(req);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.ok, true);
      assert.ok(data.url.startsWith("/uploads/es_docs/"));
    });
  });

  // =========================================================================
  // 6. Admin Endpoint Protection
  // =========================================================================
  describe("6. Admin Route Authorization Checks", () => {
    it("blocks unauthenticated POST to /api/admin/es-categories with 401", async () => {
      const req = new Request("http://localhost:3000/api/admin/es-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category_name: "Unauthorized Category" }),
      });
      const res = await handleAdminEsCategories(req);
      assert.equal(res.status, 401, "Unauthenticated POST to admin categories must return 401");
    });

    it("blocks unauthenticated PUT to /api/admin/es-categories with 401", async () => {
      const req = new Request("http://localhost:3000/api/admin/es-categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: 1, category_name: "Renamed" }),
      });
      const res = await handleAdminEsCategoriesPut(req);
      assert.equal(res.status, 401, "Unauthenticated PUT to admin categories must return 401");
    });

    it("blocks unauthenticated DELETE to /api/admin/es-categories with 401", async () => {
      const req = new Request("http://localhost:3000/api/admin/es-categories?id=1", {
        method: "DELETE",
      });
      const res = await handleAdminEsCategoriesDelete(req);
      assert.equal(res.status, 401, "Unauthenticated DELETE to admin categories must return 401");
    });

    it("blocks unauthenticated POST to /api/admin/es-services with 401", async () => {
      const req = new Request("http://localhost:3000/api/admin/es-services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service_name: "Unauthorized Service" }),
      });
      const res = await handleAdminEsServices(req);
      assert.equal(res.status, 401, "Unauthenticated POST to admin services must return 401");
    });

    it("blocks unauthenticated PUT to /api/admin/es-services with 401", async () => {
      const req = new Request("http://localhost:3000/api/admin/es-services", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: 1, service_name: "Modified" }),
      });
      const res = await handleAdminEsServicesPut(req);
      assert.equal(res.status, 401, "Unauthenticated PUT to admin services must return 401");
    });

    it("blocks unauthenticated DELETE to /api/admin/es-services with 401", async () => {
      const req = new Request("http://localhost:3000/api/admin/es-services?id=1", {
        method: "DELETE",
      });
      const res = await handleAdminEsServicesDelete(req);
      assert.equal(res.status, 401, "Unauthenticated DELETE to admin services must return 401");
    });
  });
});
