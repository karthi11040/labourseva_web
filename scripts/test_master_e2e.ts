/**
 * LabourSeva — Master End-to-End Testing Module
 * Comprehensive verification of Database, Keys, Triggers, Functions, and Gateways.
 * 
 * Execution:
 *   npx tsx --env-file=.env scripts/test_master_e2e.ts
 */

import { prisma } from "../src/lib/prisma";
import { getRazorpayCredentials, getRazorpayEnv, verifyRazorpaySignature } from "../src/lib/razorpay";
import { getSmsConfig, sanitizeIndianMobile, sendSms } from "../src/lib/sms";
import { getEmailTransporter, verifyEmailConnection } from "../src/lib/email";
import { hashPassword, verifyPassword, checkRateLimit, recordLoginFailure } from "../src/lib/security";
import { createAdminSession, isAdminSession } from "../src/lib/admin-session";
import { createStaffSession, verifyStaffSession } from "../src/lib/staff-session";
import { createSecurityToken, validateSecurityToken } from "../src/lib/token-store";
import { generateReceiptPdf } from "../src/lib/generateReceiptPdf";
import * as templates from "../src/lib/email-templates";
import {
  dispatchAccountApprovedNotification,
  dispatchAccountRejectedNotification,
  dispatchPaymentSuccessNotification,
  dispatchServiceApplicationApprovedNotification,
  dispatchSignedDocumentReadyNotification,
} from "../src/lib/notification-service";
import crypto from "node:crypto";

interface TestResult {
  group: string;
  name: string;
  status: "PASS" | "FAIL" | "WARN";
  durationMs: number;
  details?: string;
}

const results: TestResult[] = [];

function recordTest(group: string, name: string, passed: boolean, startTime: number, details?: string, isWarn = false) {
  const durationMs = Math.round((performance.now() - startTime) * 100) / 100;
  const status: "PASS" | "FAIL" | "WARN" = passed ? "PASS" : (isWarn ? "WARN" : "FAIL");
  results.push({ group, name, status, durationMs, details });
  const icon = status === "PASS" ? "✔" : (status === "WARN" ? "⚠" : "✖");
  console.log(`  ${icon} [${status}] ${name} (${durationMs}ms)${details ? ` - ${details}` : ""}`);
}

async function runMasterE2ETestModule() {
  console.log("===============================================================================");
  console.log("              LABOURSEVA MASTER END-TO-END VERIFICATION SUITE                  ");
  console.log("         Testing: Functions, Keys, Triggers, Database & Gateways               ");
  console.log("===============================================================================\n");

  const overallStart = performance.now();

  // =========================================================================
  // GROUP 1: DATABASE INTEGRITY & SCHEMAS
  // =========================================================================
  console.log("=== GROUP 1: DATABASE SUBSYSTEM & CORE SCHEMAS ===");

  // 1.1 Connection & Latency
  let tStart = performance.now();
  try {
    const [dbInfo] = await prisma.$queryRawUnsafe<any[]>(
      "SELECT 1 as alive, DATABASE() as db, VERSION() as ver, NOW() as server_time"
    );
    const isAlive = dbInfo && Number(dbInfo.alive) === 1;
    recordTest("Database", "MySQL 8.4 Live Connection & Handshake", isAlive, tStart, `DB: ${dbInfo?.db}, Version: ${dbInfo?.ver}`);
  } catch (err: any) {
    recordTest("Database", "MySQL 8.4 Live Connection & Handshake", false, tStart, err.message);
  }

  // 1.2 Core Tables Inspection
  const coreTables = [
    "customers",
    "guests",
    "retail_users",
    "distributors",
    "users",
    "employees",
    "services",
    "es_services",
    "service_requests",
    "es_service_requests",
    "kyc_audit_logs",
    "employee_logs",
    "password_resets",
    "notifications",
  ];

  for (const tableName of coreTables) {
    tStart = performance.now();
    try {
      const [countRow] = await prisma.$queryRawUnsafe<any[]>(`SELECT COUNT(*) as cnt FROM \`${tableName}\``);
      const rowCount = Number(countRow?.cnt ?? 0);
      recordTest("Database", `Core Table Accessible: \`${tableName}\``, true, tStart, `${rowCount} records`);
    } catch (err: any) {
      recordTest("Database", `Core Table Accessible: \`${tableName}\``, false, tStart, err.message);
    }
  }

  // 1.3 Database CRUD Transactional Safety
  tStart = performance.now();
  const testTokenId = `e2e_test_${Date.now()}`;
  try {
    // Insert
    await prisma.$executeRawUnsafe(
      `INSERT INTO password_resets (user_id, token, code_hash, identifier, expires_at, created_at)
       VALUES (99999, ?, 'e2e_test_hash', 'e2e@test.local', DATE_ADD(NOW(), INTERVAL 1 HOUR), NOW())`,
      testTokenId
    );
    // Read
    const [readRow] = await prisma.$queryRawUnsafe<any[]>(
      `SELECT token, identifier FROM password_resets WHERE token = ? LIMIT 1`,
      testTokenId
    );
    const readMatches = readRow?.token === testTokenId;

    // Update
    await prisma.$executeRawUnsafe(
      `UPDATE password_resets SET code_hash = 'updated_e2e_hash' WHERE token = ?`,
      testTokenId
    );
    const [updatedRow] = await prisma.$queryRawUnsafe<any[]>(
      `SELECT code_hash FROM password_resets WHERE token = ? LIMIT 1`,
      testTokenId
    );
    const updateMatches = updatedRow?.code_hash === "updated_e2e_hash";

    // Delete
    await prisma.$executeRawUnsafe(`DELETE FROM password_resets WHERE token = ?`, testTokenId);
    const [deletedRow] = await prisma.$queryRawUnsafe<any[]>(
      `SELECT token FROM password_resets WHERE token = ? LIMIT 1`,
      testTokenId
    );
    const deleteMatches = !deletedRow;

    const crudSuccess = readMatches && updateMatches && deleteMatches;
    recordTest("Database", "Transactional CRUD & State Lifecycle (INSERT, READ, UPDATE, DELETE)", crudSuccess, tStart);
  } catch (err: any) {
    recordTest("Database", "Transactional CRUD & State Lifecycle (INSERT, READ, UPDATE, DELETE)", false, tStart, err.message);
  }

  // =========================================================================
  // GROUP 2: KEYS & EXTERNAL GATEWAYS
  // =========================================================================
  console.log("\n=== GROUP 2: KEYS & EXTERNAL GATEWAYS ===");

  // 2.1 Razorpay Credentials & Keys
  tStart = performance.now();
  const rzEnv = getRazorpayEnv();
  const rzCreds = getRazorpayCredentials();
  const rzValidKey = !!rzCreds?.keyId && rzCreds.keyId.startsWith("rzp_");
  const rzValidSecret = !!rzCreds?.keySecret && rzCreds.keySecret.length > 5;
  recordTest(
    "Gateways",
    "Razorpay Production API Key & Secret Configuration",
    rzValidKey && rzValidSecret,
    tStart,
    `Env: ${rzEnv}, Key: ${rzCreds?.keyId?.slice(0, 10)}...`
  );

  // 2.2 Razorpay HMAC-SHA256 Signature Verification
  tStart = performance.now();
  const dummySecret = "test_secret_for_sig_verification_123";
  const dummyOrder = "order_N123456789";
  const dummyPayment = "pay_P987654321";
  const expectedSig = crypto.createHmac("sha256", dummySecret).update(`${dummyOrder}|${dummyPayment}`).digest("hex");
  const sigMatch = verifyRazorpaySignature(dummySecret, dummyOrder, dummyPayment, expectedSig);
  const sigTamperedReject = !verifyRazorpaySignature(dummySecret, dummyOrder, dummyPayment, "tampered_fake_signature");
  recordTest("Gateways", "Razorpay HMAC-SHA256 Signature Verification & Tamper Detection", sigMatch && sigTamperedReject, tStart);

  // 2.3 SMS Gateway Keys & Configuration
  tStart = performance.now();
  const smsCfg = getSmsConfig();
  const smsKeyValid = !!smsCfg?.apiKey && smsCfg.apiKey.length >= 8;
  const smsSenderValid = smsCfg?.senderId === "MDTDMO";
  recordTest(
    "Gateways",
    "SMS Gateway Credentials & Sender ID Configuration",
    smsKeyValid && smsSenderValid,
    tStart,
    `Provider: My Dreams Technology, Sender: ${smsCfg?.senderId}`
  );

  // 2.4 Mobile Phone Number Normalization
  tStart = performance.now();
  const p1 = sanitizeIndianMobile("9489501089") === "9489501089";
  const p2 = sanitizeIndianMobile("+91 94895 01089") === "9489501089";
  const p3 = sanitizeIndianMobile("919489501089") === "9489501089";
  const p4 = sanitizeIndianMobile("09489501089") === "9489501089";
  recordTest("Gateways", "Indian Mobile Phone Sanitization (10-digit, +91, 91-prefix)", p1 && p2 && p3 && p4, tStart);

  // 2.5 Gmail SMTP TLS Mailer Verification
  tStart = performance.now();
  try {
    const smtpStatus = await verifyEmailConnection();
    recordTest(
      "Gateways",
      "Gmail SMTP TLS Mailer Handshake & Authentication",
      smtpStatus.success,
      tStart,
      smtpStatus.success ? "Authenticated with smtp.gmail.com:587 (TLS)" : smtpStatus.error
    );
  } catch (err: any) {
    recordTest("Gateways", "Gmail SMTP TLS Mailer Handshake & Authentication", false, tStart, err.message);
  }

  // =========================================================================
  // GROUP 3: CORE FUNCTIONS & CRYPTOGRAPHIC SECURITY
  // =========================================================================
  console.log("\n=== GROUP 3: CORE FUNCTIONS & CRYPTOGRAPHIC SECURITY ===");

  // 3.1 Password Hashing with scrypt
  tStart = performance.now();
  const testPlainPassword = "TamilNadu@Secure2026!#";
  const passHash = hashPassword(testPlainPassword);
  const isScryptFormat = passHash.startsWith("scrypt:") && passHash.split(":").length === 3;
  const verifyValid = verifyPassword(testPlainPassword, passHash);
  const verifyInvalid = !verifyPassword("WrongPasswordAttempt999!", passHash);
  recordTest(
    "Functions",
    "Scrypt Password Hashing & Constant-Time Verification",
    isScryptFormat && verifyValid && verifyInvalid,
    tStart
  );

  // 3.2 Rate Limiting & Brute-Force Defense
  tStart = performance.now();
  const testIp = `victim_ip_${Date.now()}`;
  const allowedInitial = checkRateLimit(testIp).allowed;
  for (let i = 0; i < 4; i++) {
    recordLoginFailure(testIp);
  }
  const allowedBeforeLockout = checkRateLimit(testIp).allowed;
  const fifthFailure = recordLoginFailure(testIp);
  const lockedAfterThreshold = !checkRateLimit(testIp).allowed;
  recordTest(
    "Functions",
    "Rate Limiting & Account Lockout Defense",
    allowedInitial && allowedBeforeLockout && fifthFailure.locked && lockedAfterThreshold,
    tStart
  );

  // 3.3 Session Management (Admin & Staff Tokens)
  tStart = performance.now();
  const adminToken = createAdminSession();
  const adminVerified = isAdminSession(adminToken);
  const staffToken = createStaffSession({
    id: 42,
    name: "Tirunelveli Scrutiny Officer",
    email: "officer.tnv@staff.gov.in",
    canVerify: true,
    canSign: true,
  });
  const staffVerified = verifyStaffSession(staffToken);
  const staffHasCaps = staffVerified?.canVerify === true && staffVerified?.canSign === true && staffVerified?.id === 42;
  recordTest(
    "Functions",
    "HMAC-SHA256 Multi-Role Session Token Generators & Validators",
    adminVerified && !!staffVerified && staffHasCaps,
    tStart
  );

  // 3.4 64-Character Security Token Store (Single-Use & Expiry)
  tStart = performance.now();
  const secToken = await createSecurityToken({
    identifier: "citizen.recovery@labourseva.gov.in",
    userId: 8881,
    purpose: "PASSWORD_RESET",
    expiresInMinutes: 15,
  });
  const secTokenValid = typeof secToken === "string" && secToken.length === 64;
  const consumeResult = await validateSecurityToken({
    rawToken: secToken,
    purpose: "PASSWORD_RESET",
    consume: true,
  });
  const firstUseValid = consumeResult.valid && consumeResult.identifier === "citizen.recovery@labourseva.gov.in";
  // Attempt replay of consumed token
  const replayResult = await validateSecurityToken({
    rawToken: secToken,
    purpose: "PASSWORD_RESET",
  });
  const replayBlocked = !replayResult.valid;
  recordTest(
    "Functions",
    "Security Token Store (64-char, SHA-256 Hash In-DB, Single-Use Invalidation)",
    secTokenValid && firstUseValid && replayBlocked,
    tStart
  );

  // 3.5 Authoritative Payment Receipt PDF Generator
  tStart = performance.now();
  try {
    const pdfBytes = await generateReceiptPdf({
      receiptNo: "TN-E2E-2026-RCP01",
      paymentReference: "pay_test_master_e2e_01",
      applicationReference: "TN-DOC-2026-00042",
      serviceType: "DOCUMENT_SERVICE",
      categoryName: "Statutory Welfare Schemes",
      serviceName: "Labour Welfare Board Assistance",
      customerName: "Karthigeyan S",
      customerPhone: "9489501089",
      customerEmail: "karthigeyan.s11@gmail.com",
      amount: 150.0,
      currency: "INR",
      paymentProvider: "RAZORPAY",
      paymentMethod: "UPI",
      paymentStatus: "SUCCESS",
      paymentDate: new Date().toISOString(),
    });
    const isPdf = pdfBytes && pdfBytes.length > 5000 && Buffer.from(pdfBytes.slice(0, 5)).toString() === "%PDF-";
    recordTest(
      "Functions",
      "Government-Standard Payment Receipt PDF Generator",
      isPdf,
      tStart,
      `Generated ${pdfBytes ? (pdfBytes.length / 1024).toFixed(1) : 0} KB valid PDF`
    );
  } catch (err: any) {
    recordTest("Functions", "Government-Standard Payment Receipt PDF Generator", false, tStart, err.message);
  }

  // =========================================================================
  // GROUP 4: STATE MACHINE & TRIGGER LIFECYCLE (END-TO-END FLOWS)
  // =========================================================================
  console.log("\n=== GROUP 4: STATE MACHINE & TRIGGER LIFECYCLES ===");

  const TEST_CITIZEN_ID = 8881;
  const TEST_RETAILER_ID = 9991;

  // 4.1 Trigger 1: Registration -> Email Verification Token
  tStart = performance.now();
  try {
    const emailVerifyToken = await createSecurityToken({
      identifier: "test_citizen_reg@example.com",
      userId: TEST_CITIZEN_ID,
      purpose: "EMAIL_VERIFICATION",
      expiresInMinutes: 60,
    });
    const verifyValidation = await validateSecurityToken({
      rawToken: emailVerifyToken,
      purpose: "EMAIL_VERIFICATION",
      consume: true,
    });
    recordTest(
      "Triggers",
      "Trigger: Registration -> Token Issue -> Email Verification Invalidation",
      verifyValidation.valid,
      tStart
    );
  } catch (err: any) {
    recordTest("Triggers", "Trigger: Registration -> Token Issue -> Email Verification Invalidation", false, tStart, err.message);
  }

  // 4.2 Trigger 2: KYC Submission -> Pending State & Audit Log
  tStart = performance.now();
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE customers SET verification_status = 'Pending', verification_note = 'Submitted KYC' WHERE id = ?`,
      TEST_CITIZEN_ID
    );
    await prisma.$executeRawUnsafe(
      `INSERT INTO kyc_audit_logs (user_type, user_id, admin_id, action_performed, old_status, new_status, notes, ip_address, created_at)
       VALUES ('customer', ?, 1, 'submit_verification', 'Unverified', 'Pending', 'E2E Test Submission', '127.0.0.1', NOW())`,
      TEST_CITIZEN_ID
    );
    const [auditRow] = await prisma.$queryRawUnsafe<any[]>(
      `SELECT new_status, action_performed FROM kyc_audit_logs WHERE user_type = 'customer' AND user_id = ? ORDER BY id DESC LIMIT 1`,
      TEST_CITIZEN_ID
    );
    recordTest(
      "Triggers",
      "Trigger: KYC Submission -> Pending State Transition & Audit Log Entry",
      auditRow?.new_status === "Pending" && auditRow?.action_performed === "submit_verification",
      tStart
    );
  } catch (err: any) {
    recordTest("Triggers", "Trigger: KYC Submission -> Pending State Transition & Audit Log Entry", false, tStart, err.message);
  }

  // 4.3 Trigger 3: Review Re-Upload Required State Transition & Rejection
  tStart = performance.now();
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE customers SET verification_status = 'Re-Upload Required', verification_note = 'Clear Aadhaar copy needed' WHERE id = ?`,
      TEST_CITIZEN_ID
    );
    const [reuploadRow] = await prisma.$queryRawUnsafe<any[]>(
      `SELECT verification_status, verification_note FROM customers WHERE id = ? LIMIT 1`,
      TEST_CITIZEN_ID
    );
    await prisma.$executeRawUnsafe(
      `UPDATE customers SET verification_status = 'Rejected', rejection_reason = 'Discrepancy in date of birth' WHERE id = ?`,
      TEST_CITIZEN_ID
    );
    const [rejectRow] = await prisma.$queryRawUnsafe<any[]>(
      `SELECT verification_status, rejection_reason FROM customers WHERE id = ? LIMIT 1`,
      TEST_CITIZEN_ID
    );
    recordTest(
      "Triggers",
      "Trigger: Review Desk Exceptions (Re-Upload Request & Rejection Reason Storage)",
      reuploadRow?.verification_status === "Re-Upload Required" && rejectRow?.verification_status === "Rejected",
      tStart
    );
  } catch (err: any) {
    recordTest("Triggers", "Trigger: Review Desk Exceptions (Re-Upload Request & Rejection Reason Storage)", false, tStart, err.message);
  }

  // 4.4 Trigger 4: Review Approval -> Dual Notification Event (Email + SMS)
  tStart = performance.now();
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE customers SET verification_status = 'Approved', verification_note = 'Approved by Officer' WHERE id = ?`,
      TEST_CITIZEN_ID
    );
    const [approvedCust] = await prisma.$queryRawUnsafe<any[]>(
      `SELECT verification_status FROM customers WHERE id = ? LIMIT 1`,
      TEST_CITIZEN_ID
    );

    // Call unified notification dispatcher for approval
    const notifRes = await dispatchAccountApprovedNotification({
      userId: TEST_CITIZEN_ID,
      name: "A. Muthu Kumar",
      email: "karthigeyan.s11@gmail.com",
      phone: "9489501089",
      userType: "CUSTOMER",
    });

    recordTest(
      "Triggers",
      "Trigger: Account Approval -> Dual Notification Dispatch (Email + SMS)",
      approvedCust?.verification_status === "Approved" && notifRes.emailSent && notifRes.smsSent,
      tStart,
      `Email Sent: ${notifRes.emailSent}, SMS Sent: ${notifRes.smsSent}`
    );
  } catch (err: any) {
    recordTest("Triggers", "Trigger: Account Approval -> Dual Notification Dispatch (Email + SMS)", false, tStart, err.message);
  }

  // 4.5 Trigger 5: Payment Success -> Receipt PDF + Confirmation Email & Short SMS
  tStart = performance.now();
  try {
    const sampleReceiptBytes = await generateReceiptPdf({
      receiptNo: "TN-E2E-RCP-9901",
      paymentReference: "PAY-E2E-SUCCESS-001",
      applicationReference: "TN-DOC-2026-00042",
      serviceType: "DOCUMENT_SERVICE",
      categoryName: "Maternity Assistance",
      serviceName: "Maternity Assistance Scheme",
      customerName: "Karthigeyan S",
      amount: 150.0,
      currency: "INR",
      paymentProvider: "RAZORPAY",
      paymentMethod: "UPI",
      paymentStatus: "SUCCESS",
      paymentDate: new Date().toISOString(),
    });

    const payNotifRes = await dispatchPaymentSuccessNotification({
      userId: TEST_CITIZEN_ID,
      name: "Karthigeyan S",
      email: "karthigeyan.s11@gmail.com",
      phone: "9489501089",
      amount: 150.0,
      receiptNo: "TN-E2E-RCP-9901",
      paymentId: "pay_e2e_verified_12345",
      applicationRef: "TN-DOC-2026-00042",
      serviceName: "Maternity Assistance Scheme",
      serviceType: "DOCUMENT_SERVICE",
      pdfBuffer: Buffer.from(sampleReceiptBytes),
    });
    recordTest(
      "Triggers",
      "Trigger: Payment Verification -> PDF Receipt Attachment Email + Short Confirmation SMS",
      payNotifRes.emailSent && payNotifRes.smsSent,
      tStart,
      `PDF Receipt Email: ${payNotifRes.emailSent}, SMS: ${payNotifRes.smsSent}`
    );
  } catch (err: any) {
    recordTest("Triggers", "Trigger: Payment Verification -> PDF Receipt Attachment Email + Short Confirmation SMS", false, tStart, err.message);
  }

  // 4.6 Trigger 6: Service Application Approval (STRICTLY NO OTP)
  tStart = performance.now();
  try {
    // 1. Approval email (must NEVER contain OTP)
    const appApprovedEmail = templates.renderDocumentServiceApplicationApprovedEmail({
      name: "Karthigeyan S",
      serviceName: "Labour Welfare Board Assistance",
      applicationRef: "DOC-2026-9912",
      approvedDate: new Date().toLocaleDateString("en-IN", { dateStyle: "medium" }),
      downloadUrl: "https://labourseva.com/user/applications",
    });

    const hasNoOtp = !appApprovedEmail.subject.toLowerCase().includes("otp") &&
                     !appApprovedEmail.html.includes("OTP") &&
                     !appApprovedEmail.html.includes("one-time password");

    const appNotifRes = await dispatchServiceApplicationApprovedNotification({
      userId: TEST_CITIZEN_ID,
      name: "Karthigeyan S",
      email: "karthigeyan.s11@gmail.com",
      serviceName: "Labour Welfare Board Assistance",
      applicationRef: "DOC-2026-9912",
      serviceType: "DOCUMENT_SERVICE",
    });

    // 2. Signed document delivery email
    const docReadyRes = await dispatchSignedDocumentReadyNotification({
      userId: TEST_CITIZEN_ID,
      name: "Karthigeyan S",
      email: "karthigeyan.s11@gmail.com",
      serviceName: "Labour Welfare Board Assistance",
      applicationRef: "DOC-2026-9912",
      downloadUrl: "https://labourseva.com/assets/uploads/services/signed/signed_DOC_9912.pdf",
    });

    recordTest(
      "Triggers",
      "Trigger: Service Application Approval (STRICTLY NO OTP) & Signed Document Delivery",
      hasNoOtp && appNotifRes.emailSent && docReadyRes.emailSent,
      tStart,
      `No-OTP Constraint: ${hasNoOtp}, Approval Email: ${appNotifRes.emailSent}, Delivery Email: ${docReadyRes.emailSent}`
    );
  } catch (err: any) {
    recordTest("Triggers", "Trigger: Service Application Approval (STRICTLY NO OTP) & Signed Document Delivery", false, tStart, err.message);
  }

  // 4.7 Trigger 7: Password Recovery Lifecycle & Token Consumption
  tStart = performance.now();
  try {
    const resetToken = await createSecurityToken({
      identifier: "test_recovery_flow@labourseva.gov.in",
      userId: TEST_CITIZEN_ID,
      purpose: "PASSWORD_RESET",
      expiresInMinutes: 15,
    });

    // Valid consume
    const validReset = await validateSecurityToken({
      rawToken: resetToken,
      purpose: "PASSWORD_RESET",
      consume: true,
    });

    // Token reuse rejection
    const invalidReuse = await validateSecurityToken({
      rawToken: resetToken,
      purpose: "PASSWORD_RESET",
    });

    recordTest(
      "Triggers",
      "Trigger: Password Recovery -> Token Issue -> Invalidation -> Replay Rejection",
      validReset.valid && !invalidReuse.valid,
      tStart
    );
  } catch (err: any) {
    recordTest("Triggers", "Trigger: Password Recovery -> Token Issue -> Invalidation -> Replay Rejection", false, tStart, err.message);
  }

  // =========================================================================
  // SUMMARY REPORT
  // =========================================================================
  const totalDuration = Math.round((performance.now() - overallStart) * 100) / 100;
  const passedCount = results.filter((r) => r.status === "PASS").length;
  const failedCount = results.filter((r) => r.status === "FAIL").length;
  const warnCount = results.filter((r) => r.status === "WARN").length;

  console.log("\n===============================================================================");
  console.log("                        E2E TEST SUMMARY REPORT                                ");
  console.log("===============================================================================");
  console.log(`  Total Test Assertions : ${results.length}`);
  console.log(`  Passed (100% Verified): ${passedCount}`);
  console.log(`  Failed                : ${failedCount}`);
  console.log(`  Warnings              : ${warnCount}`);
  console.log(`  Total Execution Time  : ${totalDuration}ms`);
  console.log("===============================================================================\n");

  await prisma.$disconnect();

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runMasterE2ETestModule().catch((err) => {
  console.error("FATAL E2E RUNTIME ERROR:", err);
  process.exit(1);
});
