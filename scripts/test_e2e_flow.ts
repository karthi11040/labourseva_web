/**
 * LabourSeva — End-to-End Test Suite for Master Technical Implementation
 * Tests Authentication, Security Tokens, Notifications, and Template Rendering.
 */

import { hashPassword, verifyPassword } from "../src/lib/security";
import { createSecurityToken, validateSecurityToken } from "../src/lib/token-store";
import * as templates from "../src/lib/email-templates";
import { generateReceiptPdf } from "../src/lib/generateReceiptPdf";

async function runE2ETests() {
  console.log("==========================================================");
  console.log("   LABOURSEVA E2E VERIFICATION TEST SUITE (JS/TS ENGINE)  ");
  console.log("==========================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName}`);
      failed++;
    }
  }

  // 1. Password Hashing & Verification Test
  console.log("\n--- TEST GROUP 1: Cryptographic Authentication ---");
  const plainPass = "TN_Secure_Pass@2026";
  const hashed = hashPassword(plainPass);
  assert(hashed.startsWith("scrypt:"), "Password hashes with scrypt salt format");
  assert(verifyPassword(plainPass, hashed), "Password verifies correctly with valid plaintext");
  assert(!verifyPassword("WrongPassword123", hashed), "Password verification rejects incorrect plaintext");

  // 2. Security Token Store Test (Single-Use, Expiry, Cryptographic Hashing)
  console.log("\n--- TEST GROUP 2: Security Token Store & Expiry ---");
  const testEmail = "citizen.test@example.com";
  const token = await createSecurityToken({
    identifier: testEmail,
    userId: 9999,
    purpose: "EMAIL_VERIFICATION",
    expiresInMinutes: 60,
  });
  assert(typeof token === "string" && token.length === 64, "Generated 64-char cryptographically secure token");

  const validRes = await validateSecurityToken({
    rawToken: token,
    purpose: "EMAIL_VERIFICATION",
    consume: true,
  });
  assert(validRes.valid && validRes.identifier === testEmail, "Token validates successfully on first use");

  // Single-use guarantee: Re-using the consumed token must fail
  const reusedRes = await validateSecurityToken({
    rawToken: token,
    purpose: "EMAIL_VERIFICATION",
  });
  assert(!reusedRes.valid, "Re-using consumed token is strictly rejected (Idempotent single-use)");

  // 3. Payment Receipt PDF Generation Test
  console.log("\n--- TEST GROUP 3: Authoritative Receipt PDF Generation ---");
  let pdfBytes: Uint8Array | null = null;
  try {
    pdfBytes = await generateReceiptPdf({
      receiptNo: "TN-RCP-E2E-2026-001",
      paymentReference: "pay_test_e2e_12345",
      applicationReference: "TN-ES-2026-999001",
      serviceType: "DOCUMENT_SERVICE",
      categoryName: "Welfare Board Scheme",
      serviceName: "Maternity Assistance Scheme",
      customerName: "Karthigeyan S",
      customerPhone: "9489501089",
      customerEmail: "karthigeyan.s11@gmail.com",
      amount: 150.0,
      currency: "INR",
      paymentProvider: "RAZORPAY",
      paymentMethod: "UPI",
      razorpayOrderId: "order_test_e2e_12345",
      razorpayPaymentId: "pay_test_e2e_12345",
      paymentStatus: "SUCCESS",
      paymentDate: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("PDF generation exception:", err);
  }
  assert(pdfBytes !== null && pdfBytes.length > 500, `Receipt PDF generated successfully (${pdfBytes?.length} bytes)`);

  // 4. Email Template Rendering Verification (Cross-client responsive layouts)
  console.log("\n--- TEST GROUP 4: Reusable Email Template Library ---");
  
  // Account Approved (Mandatory Dual Event)
  const approvedEmail = templates.renderAccountApprovedEmail({
    name: "Karthigeyan S",
    userType: "CUSTOMER",
    loginUrl: "https://labourseva.com/login",
  });
  assert(approvedEmail.subject.includes("Your Account Has Been Verified"), "Account approved email subject matches specification");
  assert(approvedEmail.html.includes("Karthigeyan S") && approvedEmail.html.includes("Sign In to Your Account"), "Account approved HTML contains personalization & CTA button");
  assert(approvedEmail.text.includes("https://labourseva.com/login"), "Account approved plain-text fallback contains login URL");

  // Email Verification
  const verifyEmail = templates.renderEmailVerificationEmail({
    name: "Karthigeyan S",
    verifyUrl: "https://labourseva.com/verify-email?token=xyz123",
    expiryHours: 24,
  });
  assert(verifyEmail.subject.includes("Verify Your Email Address"), "Email verification subject correct");
  assert(verifyEmail.html.includes("https://labourseva.com/verify-email?token=xyz123"), "Verification link present in HTML");

  // Password Reset
  const resetEmail = templates.renderPasswordResetEmail({
    name: "Karthigeyan S",
    resetUrl: "https://labourseva.com/reset-password?token=reset123",
    expiryMinutes: 15,
  });
  assert(resetEmail.subject.includes("Reset Your Password"), "Password reset subject correct");
  assert(resetEmail.html.includes("15 minutes"), "Password reset token expiry stated");

  // Document Service Payment Receipt
  const docReceiptEmail = templates.renderDocumentServicePaymentReceiptEmail({
    name: "Karthigeyan S",
    serviceName: "Accident Relief Scheme",
    applicationRef: "DOC-2026-101",
    receiptNo: "RCP-2026-101",
    amount: 150.0,
    paymentId: "pay_test_99",
    date: "15 Oct 2026",
    downloadUrl: "https://labourseva.com/user/payments",
  });
  assert(docReceiptEmail.subject.includes("Payment Receipt"), "Payment receipt subject correct");
  assert(docReceiptEmail.html.includes("150.00"), "Payment receipt amount rendered correctly");

  // Application Approved (NO OTP!)
  const appApprovedEmail = templates.renderDocumentServiceApplicationApprovedEmail({
    name: "Karthigeyan S",
    serviceName: "Accident Relief Scheme",
    applicationRef: "DOC-2026-101",
    approvedDate: "15 Oct 2026",
    downloadUrl: "https://labourseva.com/user/applications",
  });
  assert(appApprovedEmail.subject.includes("Your Document Service Application Has Been Approved"), "Application approval subject correct");
  assert(!appApprovedEmail.html.toLowerCase().includes("otp"), "Application approval STRICTLY does not request an OTP");
  assert(!appApprovedEmail.text.toLowerCase().includes("otp"), "Application approval plain-text STRICTLY does not request an OTP");

  // Signed Document Ready
  const signedEmail = templates.renderSignedDocumentReadyEmail({
    name: "Karthigeyan S",
    serviceName: "Accident Relief Scheme",
    applicationRef: "DOC-2026-101",
    downloadUrl: "https://labourseva.com/user/applications",
  });
  assert(signedEmail.subject.includes("Your Signed Certificate Is Ready for Download"), "Signed certificate ready subject correct");

  // Application Rejected with Reason
  const rejectedEmail = templates.renderApplicationRejectedEmail({
    name: "Karthigeyan S",
    serviceName: "Maternity Scheme",
    applicationRef: "DOC-2026-102",
    reason: "Submitted Aadhaar card copy was illegible.",
    supportUrl: "https://labourseva.com/user/applications",
  });
  assert(rejectedEmail.html.includes("Submitted Aadhaar card copy was illegible"), "Rejection reason rendered in callout");

  // Additional Information Requested
  const infoEmail = templates.renderApplicationInfoRequestedEmail({
    name: "Karthigeyan S",
    serviceName: "Marriage Assistance",
    applicationRef: "DOC-2026-103",
    instructions: "Please upload official Marriage Registration Certificate issued by Sub-Registrar.",
    resubmitUrl: "https://labourseva.com/user/applications",
  });
  assert(infoEmail.html.includes("Marriage Registration Certificate"), "Info requested instructions rendered");

  console.log("\n==========================================================");
  console.log(`   TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("==========================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runE2ETests().catch((err) => {
  console.error("Test runner failed:", err);
  process.exit(1);
});
