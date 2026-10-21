(process.env as any).NODE_ENV = "test";
import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma";
import { createAdminSession, adminSessionCookieName } from "../src/lib/admin-session";
import { createStaffSession, staffSessionCookieName } from "../src/lib/staff-session";
import { signHmacSession } from "../src/lib/session-validator";
import { CITIZEN_COOKIE_NAME } from "../src/lib/citizen-session";
import { hashPassword, verifyPassword, checkRateLimit, recordLoginFailure } from "../src/lib/security";

// Import Route Handlers
import { POST as handleVerificationRequest } from "../src/app/api/verification/request/route";
import { GET as handleVerificationStatus } from "../src/app/api/verification/status/route";
import { POST as handleVerificationReview } from "../src/app/api/verification/review/route";
import { POST as handleAdminCreateEmployee } from "../src/app/api/admin/employees/route";
import { POST as handleStaffForgotPassword } from "../src/app/api/staff/forgot-password/route";
import { POST as handleStaffResetPassword } from "../src/app/api/staff/reset-password/route";

describe("Account Verification & Employee Management Test Suite", () => {
  const TEST_USER_ID = 8881;
  const OTHER_USER_ID = 8882;
  const TEST_EMPLOYEE_EMAIL = "test_scrutiny_officer@labourseva.gov.in";

  // Test 1: User Submitting a Verification Request
  it("Path 1: A user successfully submits an account verification request", async () => {
    const payload = {
      userType: "customer",
      userId: TEST_USER_ID,
      applicantName: "A. Muthu Kumar",
      phone: "9876543210",
      email: "muthu@citizen.local",
      dob: "1990-05-15",
      gender: "male",
      idType: "Aadhaar Card",
      idNumber: "1234-5678-9012",
      aadhaarNumber: "1234-5678-9012",
      aadhaarFile: "/uploads/proofs/aadhaar_muthu.pdf",
      documentUrl: "/uploads/proofs/aadhaar_muthu.pdf",
      address: "12 Main Road, Anaimalai",
      pincode: "642104",
      occupation: "Agricultural Worker",
      districtId: 523,
      talukId: 6406,
      panchayatId: 221937,
      roleSpecificData: {
        rationNo: "05/W/882103",
        district: "Coimbatore",
      },
    };

    const customerCookie = `${CITIZEN_COOKIE_NAME}=${signHmacSession({ customerId: TEST_USER_ID, phone: "9876543210" }, "CUSTOMER")}`;
    const req = new Request("http://localhost:3000/api/verification/request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: customerCookie,
      },
      body: JSON.stringify(payload),
    });

    const res = await handleVerificationRequest(req);
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.ok, true);
    assert.equal(data.status, "Pending");

    // Check database record
    const [cust] = await prisma.$queryRawUnsafe<any[]>(
      `SELECT verification_status, aadhar_no FROM customers WHERE id = ?`,
      TEST_USER_ID
    );
    assert.equal(cust?.verification_status, "Pending");
    assert.equal(cust?.aadhar_no, "1234-5678-9012");

    // Check audit log
    const [log] = await prisma.$queryRawUnsafe<any[]>(
      `SELECT new_status, action_performed FROM kyc_audit_logs WHERE user_type = 'customer' AND user_id = ? ORDER BY id DESC LIMIT 1`,
      TEST_USER_ID
    );
    assert.equal(log?.new_status, "Pending");
    assert.equal(log?.action_performed, "submit_verification");
  });

  // Test 2: Employee Approving a Verification Request
  it("Path 2: An authorized employee reviews and approves a pending verification request", async () => {
    const staffCookie = createStaffSession({
      id: 101,
      name: "Inspector Rajan",
      email: "rajan@staff.gov.in",
      canVerify: true,
      canSign: false,
    });

    const examinationReq = new Request("http://localhost:3000/api/verification/examination", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: `${staffSessionCookieName}=${staffCookie}`,
      },
      body: JSON.stringify({ userType: "customer", userId: TEST_USER_ID, action: "APPROVE" }),
    });
    const examinationRes = await (await import("../src/app/api/verification/examination/route")).POST(examinationReq);
    const examinationData = await examinationRes.json();
    assert.equal(examinationRes.status, 200);

    const req = new Request("http://localhost:3000/api/verification/review", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: `${staffSessionCookieName}=${staffCookie}`,
      },
      body: JSON.stringify({
        userType: "customer",
        userId: TEST_USER_ID,
        action: "APPROVE",
        notes: "Identity documents verified against government database.",
        examinationToken: examinationData.examinationToken,
      }),
    });

    const res = await handleVerificationReview(req);
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.ok, true);
    assert.equal(data.newStatus, "Approved");

    // Verify in database
    const [cust] = await prisma.$queryRawUnsafe<any[]>(
      `SELECT verification_status FROM customers WHERE id = ?`,
      TEST_USER_ID
    );
    assert.equal(cust?.verification_status, "Approved");

    // Verify audit log has the employee's ID and decision
    const [log] = await prisma.$queryRawUnsafe<any[]>(
      `SELECT new_status, admin_id, notes FROM kyc_audit_logs WHERE user_type = 'customer' AND user_id = ? ORDER BY id DESC LIMIT 1`,
      TEST_USER_ID
    );
    assert.equal(log?.new_status, "Approved");
    assert.equal(log?.admin_id, 101);
  });

  // Test 3: User Blocked From Viewing Another User's Request
  it("Path 3: A user is blocked with 403 when attempting to view another user's verification status", async () => {
    // User OTHER_USER_ID tries to inspect TEST_USER_ID's status
    const otherUserCookie = `${CITIZEN_COOKIE_NAME}=${signHmacSession({ customerId: OTHER_USER_ID, phone: "9876543211" }, "CUSTOMER")}`;
    const req = new Request(
      `http://localhost:3000/api/verification/status?userType=customer&userId=${TEST_USER_ID}`,
      {
        method: "GET",
        headers: {
          Cookie: otherUserCookie,
        },
      }
    );

    const res = await handleVerificationStatus(req);
    assert.equal(res.status, 403);

    const data = await res.json();
    assert.equal(data.ok, false);
    assert.match(data.error, /blocked from viewing another user/i);
  });

  // Test 4: Super Admin Creating an Employee
  it("Path 4: Super administrator successfully creates a new employee account with an invitation token", async () => {
    const adminCookie = createAdminSession();

    // Clean up existing test employee if present
    await prisma.$executeRawUnsafe(
      `DELETE FROM employees WHERE LOWER(email) = ?`,
      TEST_EMPLOYEE_EMAIL.toLowerCase()
    );

    const req = new Request("http://localhost:3000/api/admin/employees", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: `${adminSessionCookieName}=${adminCookie}`,
      },
      body: JSON.stringify({
        name: "P. Vignesh",
        email: TEST_EMPLOYEE_EMAIL,
        phone: "9840112233",
        designation: "District Scrutiny Officer",
        district: "Tiruchirappalli",
        sendInvitation: true,
      }),
    });

    const res = await handleAdminCreateEmployee(req);
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.ok, true);
    assert.ok(data.employee.id);
    assert.ok(data.inviteUrl);
    assert.ok(data.inviteToken);

    // Verify employee was created in database
    const [emp] = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, name, status FROM employees WHERE LOWER(email) = ?`,
      TEST_EMPLOYEE_EMAIL.toLowerCase()
    );
    assert.ok(emp);
    assert.equal(emp.status, "active");
  });

  // Test 5: Non-Admin Blocked From Creating an Employee
  it("Path 5: A non-admin is blocked with 403 from creating an employee account", async () => {
    // Regular employee tries to create another employee account
    const staffCookie = createStaffSession({
      id: 101,
      name: "Regular Staff",
      email: "staff@labourseva.gov.in",
      canVerify: true,
      canSign: false,
    });

    const req = new Request("http://localhost:3000/api/admin/employees", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: `${staffSessionCookieName}=${staffCookie}`,
      },
      body: JSON.stringify({
        name: "Unauthorized Add",
        email: "unauthorized@test.local",
        phone: "9000000000",
      }),
    });

    const res = await handleAdminCreateEmployee(req);
    assert.equal(res.status, 403);

    const data = await res.json();
    assert.equal(data.ok, false);
    assert.match(data.error, /Only Super Administrators can create employee accounts/i);
  });

  // Test 6: Successful and Expired Password Reset
  it("Path 6: Successful single-use password reset and rejection of expired reset token", async () => {
    // 6A. Request a reset token
    const forgotReq = new Request("http://localhost:3000/api/staff/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: TEST_EMPLOYEE_EMAIL, captchaToken: "test-valid-cap-token" }),
    });

    const forgotRes = await handleStaffForgotPassword(forgotReq);
    assert.equal(forgotRes.status, 200);
    const forgotData = await forgotRes.json();
    assert.ok(forgotData.token);
    const validToken = forgotData.token;

    // 6B. Successful reset
    const newPassword = "NewSecurePassword2026!";
    const resetReq = new Request("http://localhost:3000/api/staff/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: validToken,
        newPassword,
        captchaToken: "test-valid-cap-token-reset-1",
      }),
    });

    const resetRes = await handleStaffResetPassword(resetReq);
    assert.equal(resetRes.status, 200);
    const resetData = await resetRes.json();
    assert.equal(resetData.ok, true);

    // Verify password was updated in DB with scrypt hash
    const [emp] = await prisma.$queryRawUnsafe<any[]>(
      `SELECT password_hash FROM employees WHERE LOWER(email) = ?`,
      TEST_EMPLOYEE_EMAIL.toLowerCase()
    );
    assert.ok(emp.password_hash.startsWith("scrypt:"));
    assert.equal(verifyPassword(newPassword, emp.password_hash), true);

    // 6C. Token is single-use: Reusing the same token should fail
    const reuseReq = new Request("http://localhost:3000/api/staff/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: validToken,
        newPassword: "AnotherPassword123!",
        captchaToken: "test-valid-cap-token-reset-2",
      }),
    });
    const reuseRes = await handleStaffResetPassword(reuseReq);
    assert.equal(reuseRes.status, 400);

    // 6D. Expired token test: Insert a token with past expiration
    const expiredToken = "test_expired_token_1234567890abcdef";
    const [empRecord] = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id FROM employees WHERE LOWER(email) = ?`,
      TEST_EMPLOYEE_EMAIL.toLowerCase()
    );

    await prisma.$executeRawUnsafe(
      `INSERT INTO password_resets (user_id, token, code_hash, identifier, expires_at, created_at)
       VALUES (?, ?, 'expired_hash', ?, DATE_SUB(NOW(), INTERVAL 2 HOUR), DATE_SUB(NOW(), INTERVAL 3 HOUR))`,
      empRecord.id,
      expiredToken,
      TEST_EMPLOYEE_EMAIL
    );

    const expiredReq = new Request("http://localhost:3000/api/staff/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: expiredToken,
        newPassword: "ValidPassword999!",
        captchaToken: "test-valid-cap-token-reset-3",
      }),
    });

    const expiredRes = await handleStaffResetPassword(expiredReq);
    assert.equal(expiredRes.status, 400);
    const expiredData = await expiredRes.json();
    assert.match(expiredData.error, /expired/i);
  });
});
