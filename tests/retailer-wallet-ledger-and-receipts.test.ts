import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  renderRetailerWalletTopupSuccessEmail,
  renderRetailerWalletTopupPendingEmail,
  renderRetailerWalletTopupFailureEmail,
} from "../src/lib/email-templates";
import { generateReceiptPdf, ReceiptData } from "../src/lib/generateReceiptPdf";
import {
  dispatchRetailerWalletSuccessNotification,
  dispatchRetailerWalletPendingNotification,
  dispatchRetailerWalletFailureNotification,
} from "../src/lib/notification-service";
import { GET as getReceiptHandler } from "../src/app/api/retailer/wallet/receipt/route";
import { POST as postFailureHandler } from "../src/app/api/retailer/wallet/failure/route";
import { GET as getAdminPendingHandler, POST as postAdminPendingHandler } from "../src/app/api/admin/pending-txns/route";
import { NextRequest } from "next/server";

describe("Retailer Wallet Ledger, Payment Receipts & Lifecycle Notifications", () => {
  describe("1. Transactional Email Templates for Wallet Operations", () => {
    test("renders success receipt email with correct financial details and receipt number", () => {
      const rendered = renderRetailerWalletTopupSuccessEmail({
        name: "Muthu Raman",
        shopName: "Anna Nagar Kendra",
        registrationNo: "RET-TN-2026-0042",
        receiptNo: "RCT-RET-000123",
        amount: 5000,
        newBalance: 12500,
        paymentId: "pay_test_987654321",
        orderId: "order_test_123456",
        date: "18 Oct 2026, 01:30 PM",
        walletUrl: "http://localhost:3000/retailer/wallet",
      });

      assert.match(rendered.subject, /Payment Successful/);
      assert.match(rendered.subject, /₹5000\.00/);
      assert.match(rendered.html, /RCT-RET-000123/);
      assert.match(rendered.html, /Anna Nagar Kendra/);
      assert.match(rendered.html, /RET-TN-2026-0042/);
      assert.match(rendered.html, /pay_test_987654321/);
      assert.match(rendered.html, /₹12500\.00/);
      assert.match(rendered.text, /RCT-RET-000123/);
    });

    test("renders pending request email with order ID and advisory instructions", () => {
      const rendered = renderRetailerWalletTopupPendingEmail({
        name: "Selvi K",
        shopName: "T Nagar Citizen Counter",
        registrationNo: "RET-TN-2026-0099",
        orderId: "order_pending_999888",
        amount: 2000,
        date: "18 Oct 2026, 01:35 PM",
        walletUrl: "http://localhost:3000/retailer/wallet",
      });

      assert.match(rendered.subject, /Top-Up Request Initiated/);
      assert.match(rendered.subject, /Pending Verification/);
      assert.match(rendered.html, /order_pending_999888/);
      assert.match(rendered.html, /₹2000\.00/);
      assert.match(rendered.html, /PENDING PAYMENT VERIFICATION/);
      assert.match(rendered.text, /order_pending_999888/);
    });

    test("renders failure notification email with reason, order reference and bank refund advisory", () => {
      const rendered = renderRetailerWalletTopupFailureEmail({
        name: "Kumar S",
        shopName: "Madurai North Kendra",
        registrationNo: "RET-TN-2026-0012",
        orderId: "order_failed_555",
        paymentId: "pay_declined_111",
        amount: 1500,
        reason: "Insufficient funds in bank account",
        errorCode: "BAD_REQUEST_ERROR",
        date: "18 Oct 2026, 01:40 PM",
        retryUrl: "http://localhost:3000/retailer/wallet",
      });

      assert.match(rendered.subject, /Payment Not Successful/);
      assert.match(rendered.subject, /₹1500\.00/);
      assert.match(rendered.html, /Insufficient funds in bank account/);
      assert.match(rendered.html, /order_failed_555/);
      assert.match(rendered.html, /pay_declined_111/);
      assert.match(rendered.html, /automatically reversed to your source account/);
      assert.match(rendered.text, /Insufficient funds in bank account/);
    });
  });

  describe("2. Kendra Wallet Payment Receipt PDF Generation", () => {
    test("generates valid PDF binary with official government headers for wallet recharge", async () => {
      const receiptData: ReceiptData = {
        receiptNo: "RCT-RET-000789",
        paymentReference: "pay_test_success_789",
        applicationReference: "KENDRA-TOPUP-789",
        serviceType: "DOCUMENT_SERVICE",
        categoryName: "Kendra Prepaid Account",
        serviceName: "Kendra Wallet Balance Recharge",
        customerName: "Kavitha Agency (RET-KNDRA-042)",
        customerPhone: "9876543210",
        customerEmail: "kavitha@kendra.local",
        amount: 3000,
        subtotal: 3000,
        totalAmount: 3000,
        currency: "INR",
        paymentProvider: "RAZORPAY",
        paymentMethod: "UPI Instant Payment",
        razorpayOrderId: "order_kavitha_789",
        razorpayPaymentId: "pay_test_success_789",
        paymentStatus: "SUCCESS",
        paymentDate: new Date().toISOString(),
        receiptDate: new Date().toLocaleDateString("en-IN"),
        organizationName: "Labour Welfare Department · Govt of Tamil Nadu",
      };

      const pdfBytes = await generateReceiptPdf(receiptData);
      assert.ok(pdfBytes instanceof Uint8Array, "Result must be a Uint8Array");
      assert.ok(pdfBytes.length > 500, "PDF size must be substantial");

      // Verify %PDF magic header bytes
      const headerStr = Buffer.from(pdfBytes.subarray(0, 4)).toString("ascii");
      assert.strictEqual(headerStr, "%PDF", "PDF must begin with %PDF magic header");
    });
  });

  describe("3. Notification Dispatch Functions Resiliency", () => {
    test("dispatches success, pending, and failure notifications safely without unhandled rejections", async () => {
      const pendingResult = await dispatchRetailerWalletPendingNotification({
        retailerId: 1,
        name: "Test Kendra",
        email: "test@kendra.local",
        amount: 1000,
        orderId: "order_test_resiliency",
      });
      assert.strictEqual(typeof pendingResult.emailSent, "boolean");

      const failureResult = await dispatchRetailerWalletFailureNotification({
        retailerId: 1,
        name: "Test Kendra",
        email: "test@kendra.local",
        amount: 1000,
        reason: "Test Decline",
      });
      assert.strictEqual(typeof failureResult.emailSent, "boolean");

      const successResult = await dispatchRetailerWalletSuccessNotification({
        retailerId: 1,
        name: "Test Kendra",
        email: "test@kendra.local",
        amount: 1000,
        newBalance: 6000,
        paymentId: "pay_test_resiliency",
        receiptNo: "RCT-RET-TEST",
      });
      assert.strictEqual(typeof successResult.emailSent, "boolean");
      assert.strictEqual(successResult.inAppSaved, true);
    });
  });

  describe("4. Security & Access Control on Receipt and Settlement Endpoints", () => {
    test("blocks unauthenticated receipt download request with 401", async () => {
      const req = new NextRequest("http://localhost:3000/api/retailer/wallet/receipt?id=1", {
        method: "GET",
      });
      const res = await getReceiptHandler(req);
      assert.strictEqual(res.status, 401);
      const json = await res.json();
      assert.strictEqual(json.ok, false);
    });

    test("blocks unauthenticated wallet failure reporting with 401", async () => {
      const req = new NextRequest("http://localhost:3000/api/retailer/wallet/failure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ razorpayOrderId: "order_fake" }),
      });
      const res = await postFailureHandler(req);
      assert.strictEqual(res.status, 401);
      const json = await res.json();
      assert.strictEqual(json.ok, false);
    });

    test("blocks unauthorized non-admin access to admin pending-txns with 401", async () => {
      const reqGet = new NextRequest("http://localhost:3000/api/admin/pending-txns", {
        method: "GET",
      });
      const resGet = await getAdminPendingHandler(reqGet);
      assert.strictEqual(resGet.status, 401);

      const reqPost = new NextRequest("http://localhost:3000/api/admin/pending-txns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "APPROVE", txnId: "PTXN-1" }),
      });
      const resPost = await postAdminPendingHandler(reqPost);
      assert.strictEqual(resPost.status, 401);
    });
  });
});
