(process.env as any).NODE_ENV = "test";

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  resolveDisplayStatus,
  normalizeErrorReason,
  maskPaymentMethod,
  isPaymentCaptured,
  DISPLAY_STATUSES,
  REFUND_OUTCOMES,
} from "../src/lib/payment-status-service";
import {
  createPaymentAttempt,
  recordPaymentSuccess,
  recordPaymentFailure,
  recordPaymentRefund,
  findPaymentAttemptByOrder,
} from "../src/lib/payment-attempt-repository";
import { POST as handleOrderCreation } from "../src/app/api/payments/razorpay/order/route";
import { POST as handlePaymentVerification } from "../src/app/api/payments/razorpay/verify/route";
import { POST as handlePaymentFailure } from "../src/app/api/payments/razorpay/failure/route";
import { POST as handlePaymentReconcile } from "../src/app/api/payments/razorpay/reconcile/route";
import { POST as handleWebhook } from "../src/app/api/payments/razorpay/webhook/route";
import { GET as handleUserPayments } from "../src/app/api/user/payments/route";
import { GET as handleUserReceipt } from "../src/app/api/user/payments/receipt/route";
import { signHmacSession } from "../src/lib/session-validator";
import { getRazorpayCredentials } from "../src/lib/razorpay";
import { prisma } from "../src/lib/prisma";

describe("Razorpay Outcomes & Payment Lifecycle Test Suite", () => {
  // =========================================================================
  // 1. Status Normalization & Alias Mapping
  // =========================================================================
  describe("1. Error Reason Normalization & Alias Mapping", () => {
    it("maps known alias 'insufficient_fund' to canonical 'insufficient_funds'", () => {
      const outcome = normalizeErrorReason("insufficient_fund");
      assert.equal(outcome.reasonCode, "insufficient_funds");
      assert.equal(outcome.isFundsIssue, true);
      assert.match(outcome.userMessage, /insufficient funds/i);
      assert.ok(outcome.suggestedAction.length > 0);
    });

    it("normalizes canonical 'insufficient_funds'", () => {
      const outcome = normalizeErrorReason("insufficient_funds");
      assert.equal(outcome.reasonCode, "insufficient_funds");
      assert.equal(outcome.isFundsIssue, true);
    });

    it("correctly handles payment_cancelled by user", () => {
      const outcome = normalizeErrorReason("payment_cancelled");
      assert.equal(outcome.isCancelled, true);
      assert.equal(outcome.reasonCode, "payment_cancelled");
      assert.match(outcome.userMessage, /cancelled/i);
    });

    it("correctly handles payment_timed_out", () => {
      const outcome = normalizeErrorReason("payment_timed_out");
      assert.equal(outcome.isTimedOut, true);
      assert.equal(outcome.reasonCode, "payment_timed_out");
      assert.match(outcome.userMessage, /timed out/i);
    });

    it("provides fallback for unknown error reason with diagnostics preserved", () => {
      const outcome = normalizeErrorReason("unexpected_gateway_code", "GATEWAY_502", "Custom gateway fault");
      assert.equal(outcome.reasonCode, "unexpected_gateway_code");
      assert.equal(outcome.errorCode, "GATEWAY_502");
      assert.equal(outcome.errorDescription, "Custom gateway fault");
      assert.match(outcome.userMessage, /Custom gateway fault/);
    });
  });

  // =========================================================================
  // 2. Display Status & Resolution
  // =========================================================================
  describe("2. Display Status Determination & Strict Capture Rules", () => {
    it("strictly requires 'captured' status to mark payment as SUCCESSFUL", () => {
      assert.equal(isPaymentCaptured("captured"), true);
      assert.equal(isPaymentCaptured("authorized"), false);
      assert.equal(isPaymentCaptured("created"), false);
      assert.equal(isPaymentCaptured("failed"), false);

      const statusCaptured = resolveDisplayStatus({ razorpayStatus: "captured" });
      assert.equal(statusCaptured, "SUCCESSFUL");

      const statusAuthorized = resolveDisplayStatus({ razorpayStatus: "authorized" });
      assert.equal(statusAuthorized, "AUTHORIZED");
      assert.notEqual(statusAuthorized, "SUCCESSFUL", "Authorized is not captured");
    });

    it("resolves refund statuses accurately", () => {
      const fullRefund = resolveDisplayStatus({ razorpayStatus: "refunded", refundStatus: "full" });
      assert.equal(fullRefund, "REFUNDED");

      const partialRefund = resolveDisplayStatus({ razorpayStatus: "captured", refundStatus: "partial" });
      assert.equal(partialRefund, "PARTIALLY_REFUNDED");
    });

    it("verifies all 9 display status metadata items are bilingual and non-empty", () => {
      for (const [key, meta] of Object.entries(DISPLAY_STATUSES)) {
        assert.ok(meta.label && meta.label.length > 0, `Status ${key} must have label`);
        assert.ok(meta.labelTa && meta.labelTa.length > 0, `Status ${key} must have Tamil label`);
        assert.ok(meta.message && meta.message.length > 0, `Status ${key} must have customer message`);
        assert.ok(meta.messageTa && meta.messageTa.length > 0, `Status ${key} must have Tamil customer message`);
        assert.ok(meta.badgeVariant, `Status ${key} must have badgeVariant`);
      }
    });

    it("masks payment methods for citizen privacy", () => {
      assert.match(maskPaymentMethod("card", { cardLast4: "4321", cardNetwork: "Visa" }), /Visa.*4321/i);
      assert.match(maskPaymentMethod("upi", { vpa: "citizen@okhdfcbank" }), /ci.*n@okhdfcbank/i);
      assert.match(maskPaymentMethod("netbanking", { bank: "HDFC" }), /Netbanking \(HDFC\)/i);
    });
  });

  // =========================================================================
  // 3. Payment Attempt Repository & Idempotency
  // =========================================================================
  describe("3. Idempotent Database Operations and State Persistence", () => {
    const testOrderId = `order_test_${Date.now()}`;
    const testPaymentId = `pay_test_${Date.now()}`;

    it("creates a payment attempt and retrieves it idempotently", async () => {
      const attempt = await createPaymentAttempt({
        userId: 9901,
        serviceType: "DOCUMENT_SERVICE",
        serviceId: 1,
        serviceName: "Labour Safety Certificate",
        categoryName: "Factory Welfare",
        amount: 250,
        currency: "INR",
        razorpayOrderId: testOrderId,
      });

      assert.ok(attempt.id, "Attempt ID must exist");
      assert.equal(attempt.razorpay_order_id, testOrderId);
      assert.equal(attempt.display_status, "INITIATED");

      // Verify retrieval
      const fetched = await findPaymentAttemptByOrder(testOrderId);
      assert.ok(fetched);
      assert.equal(fetched.razorpay_order_id, testOrderId);
    });

    it("records payment success idempotently without crashing or duplication", async () => {
      const res1 = await recordPaymentSuccess({
        razorpayOrderId: testOrderId,
        razorpayPaymentId: testPaymentId,
        applicationReference: "TN-APP-TEST-001",
        receiptNo: "TN-RCP-TEST-001",
        paymentMethod: "UPI",
        methodDetails: { vpa: "user@okaxis" },
      });

      assert.equal(res1.display_status, "SUCCESSFUL");
      assert.equal(res1.razorpay_payment_id, testPaymentId);

      // Repeat identical call (idempotency simulation)
      const res2 = await recordPaymentSuccess({
        razorpayOrderId: testOrderId,
        razorpayPaymentId: testPaymentId,
        applicationReference: "TN-APP-TEST-001",
        receiptNo: "TN-RCP-TEST-001",
        paymentMethod: "UPI",
      });

      assert.equal(res2.display_status, "SUCCESSFUL");
      assert.equal(res2.razorpay_payment_id, testPaymentId);
    });

    it("records failure with diagnostics preserved", async () => {
      const failOrderId = `order_fail_${Date.now()}`;
      await createPaymentAttempt({
        userId: 9902,
        serviceType: "E_SERVICE",
        serviceId: 1,
        serviceName: "Registration of Establishment",
        categoryName: "Commercial Welfare",
        amount: 500,
        currency: "INR",
        razorpayOrderId: failOrderId,
      });

      const failedAttempt = await recordPaymentFailure({
        razorpayOrderId: failOrderId,
        errorCode: "BAD_REQUEST_ERROR",
        errorReason: "insufficient_fund",
        errorSource: "bank",
        errorStep: "payment_authorization",
        errorDescription: "Account balance is insufficient to complete the transaction.",
      });

      assert.equal(failedAttempt.display_status, "FAILED");
      assert.equal(failedAttempt.error_code, "BAD_REQUEST_ERROR");
      assert.equal(failedAttempt.error_reason, "insufficient_funds", "Mapped alias");
      assert.equal(failedAttempt.error_source, "bank");
      assert.equal(failedAttempt.error_step, "payment_authorization");
      assert.match(failedAttempt.status_message, /insufficient funds/i);
    });
  });

  // =========================================================================
  // 4. Verification and Cryptographic Signatures
  // =========================================================================
  describe("4. Signature Verification & Cryptographic Integrity", () => {
    it("rejects forged verification signatures with 400", async () => {
      const userSession = signHmacSession({ id: 9905, phone: "9876543210", role: "CUSTOMER" }, "CUSTOMER");
      const req = new Request("http://localhost:3000/api/payments/razorpay/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `labourseva-user-session=${userSession}`,
        },
        body: JSON.stringify({
          serviceType: "DOCUMENT_SERVICE",
          serviceId: 1,
          razorpayOrderId: "order_mock_123",
          razorpayPaymentId: "pay_mock_123",
          razorpaySignature: "forged_invalid_signature_hex_code",
        }),
      });

      const res = await handlePaymentVerification(req as any);
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.ok, false);
      assert.match(data.error, /invalid.*signature/i);
    });

    it("verifies genuine signature when secret is matched", async () => {
      const creds = getRazorpayCredentials();
      const secret = creds?.keySecret || process.env.RAZORPAY_TEST_KEY_SECRET?.trim() || process.env.RAZORPAY_KEY_SECRET?.trim() || "test_secret_for_sha256";
      const orderId = `order_sig_${Date.now()}`;
      const paymentId = `pay_sig_${Date.now()}`;
      const validSignature = crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");

      const svc = await prisma.$queryRawUnsafe<any[]>("SELECT id FROM services LIMIT 1").catch(() => []);
      const serviceId = svc && svc.length > 0 ? svc[0].id : 11;

      const userSession = signHmacSession({ id: 9906, phone: "9876543210", role: "CUSTOMER" }, "CUSTOMER");
      const req = new Request("http://localhost:3000/api/payments/razorpay/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `labourseva-user-session=${userSession}`,
        },
        body: JSON.stringify({
          serviceType: "DOCUMENT_SERVICE",
          serviceId,
          razorpayOrderId: orderId,
          razorpayPaymentId: paymentId,
          razorpaySignature: validSignature,
        }),
      });

      const res = await handlePaymentVerification(req as any);
      const data = await res.json();
      // Should succeed with 200 and return verified payload
      assert.equal(res.status, 200);
      assert.equal(data.ok, true);
      assert.equal(data.status, "confirmed");
      assert.ok(data.receiptNo);
    });
  });

  // =========================================================================
  // 5. Access Control & IDOR Protection on Receipts & History
  // =========================================================================
  describe("5. Receipt Access Control & IDOR Prevention", () => {
    it("disallows receipt generation for payments that are not confirmed SUCCESSFUL", async () => {
      // Create a failed attempt for user 8882
      const failedOrderId = `order_unpaid_${Date.now()}`;
      const attempt = await createPaymentAttempt({
        userId: 8882,
        serviceType: "DOCUMENT_SERVICE",
        serviceId: 1,
        serviceName: "Unpaid Certificate",
        amount: 300,
        currency: "INR",
        razorpayOrderId: failedOrderId,
      });

      await recordPaymentFailure({
        razorpayOrderId: failedOrderId,
        errorCode: "PAYMENT_CANCELLED",
        errorReason: "payment_cancelled",
        isCancelled: true,
      });

      const userSession = signHmacSession({ id: 8882, customerId: 8882, phone: "8882888288", role: "CUSTOMER" }, "CUSTOMER");
      const req = new Request(`http://localhost:3000/api/user/payments/receipt?id=ATT-${attempt.id}`, {
        method: "GET",
        headers: {
          cookie: `labourseva-user-session=${userSession}`,
        },
      });

      const res = await handleUserReceipt(req as any);
      assert.equal(res.status, 400, "Must not allow receipt download for failed payments");
      const data = await res.json();
      assert.equal(data.ok, false);
      assert.match(data.error, /only available for confirmed successful payments/i);
    });

    it("prevents User A from accessing User B's receipt (IDOR prevention)", async () => {
      // Payment belongs to user 9001
      const orderId = `order_user9001_${Date.now()}`;
      const attempt = await createPaymentAttempt({
        userId: 9001,
        serviceType: "DOCUMENT_SERVICE",
        serviceId: 1,
        serviceName: "Private Scheme Application",
        amount: 150,
        currency: "INR",
        razorpayOrderId: orderId,
      });

      await recordPaymentSuccess({
        razorpayOrderId: orderId,
        razorpayPaymentId: `pay_user9001_${Date.now()}`,
        applicationReference: "TN-APP-PRIVATE-9001",
        receiptNo: "TN-RCP-PRIVATE-9001",
      });

      // User 9002 attempts to fetch it
      const attackerSession = signHmacSession({ id: 9002, customerId: 9002, phone: "9123456789", role: "CUSTOMER" }, "CUSTOMER");
      const req = new Request(`http://localhost:3000/api/user/payments/receipt?id=ATT-${attempt.id}`, {
        method: "GET",
        headers: {
          cookie: `labourseva-user-session=${attackerSession}`,
        },
      });

      const res = await handleUserReceipt(req as any);
      assert.equal(res.status, 404, "Must not find or expose another user's payment receipt");
      const data = await res.json();
      assert.equal(data.ok, false);
      assert.match(data.error, /not found/i);
    });
  });

  // =========================================================================
  // 6. Webhook Idempotency & Events
  // =========================================================================
  describe("6. Razorpay Webhook Idempotency & Event Processing", () => {
    it("handles repeated webhook events without duplicating records or errors", async () => {
      const webhookEventId = `evt_test_${Date.now()}`;
      const webhookOrder = `order_wb_${Date.now()}`;
      const webhookPay = `pay_wb_${Date.now()}`;

      await createPaymentAttempt({
        userId: 7771,
        serviceType: "DOCUMENT_SERVICE",
        serviceId: 1,
        serviceName: "Webhook Validation Service",
        amount: 200,
        currency: "INR",
        razorpayOrderId: webhookOrder,
      });

      const webhookPayload = JSON.stringify({
        id: webhookEventId,
        event: "payment.captured",
        payload: {
          payment: {
            entity: {
              id: webhookPay,
              order_id: webhookOrder,
              amount: 20000,
              currency: "INR",
              status: "captured",
              method: "upi",
            },
          },
        },
      });

      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim() || process.env.RAZORPAY_KEY_SECRET?.trim() || "test_secret";
      const signature = crypto.createHmac("sha256", webhookSecret).update(webhookPayload).digest("hex");

      const req1 = new Request("http://localhost:3000/api/payments/razorpay/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-razorpay-signature": signature,
        },
        body: webhookPayload,
      });

      const res1 = await handleWebhook(req1 as any);
      assert.equal(res1.status, 200);
      const data1 = await res1.json();
      assert.equal(data1.ok, true);

      // Send the exact same webhook payload again
      const req2 = new Request("http://localhost:3000/api/payments/razorpay/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-razorpay-signature": signature,
        },
        body: webhookPayload,
      });

      const res2 = await handleWebhook(req2 as any);
      assert.equal(res2.status, 200);
      const data2 = await res2.json();
      assert.equal(data2.ok, true);
      assert.equal(data2.duplicated, true, "Must flag duplicate webhook event as idempotent");
    });
  });
});
