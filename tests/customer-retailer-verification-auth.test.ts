import test, { describe } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { prisma } from "../src/lib/prisma";
import { createStaffSession, staffSessionCookieName } from "../src/lib/staff-session";
import { createAdminSession, adminSessionCookieName } from "../src/lib/admin-session";
import { signHmacSession, verifyHmacSession } from "../src/lib/session-validator";
import { CITIZEN_COOKIE_NAME } from "../src/lib/citizen-session";
import { RETAILER_COOKIE_NAME } from "../src/lib/retailer-session";
import { hashPassword } from "../src/lib/security";
import { NotificationRepository } from "../src/modules/notifications/repositories/notification.repository";
import { POST as verifyOtp } from "../src/app/api/auth/otp/verify/route";
import { POST as loginWithCredentials } from "../src/app/api/auth/login/route";
import { POST as retailerLogin } from "../src/app/api/retailer/login/route";
import { PUT as saveRetailerProfile } from "../src/app/api/retailer/profile/route";
import { POST as examineVerification } from "../src/app/api/verification/examination/route";
import { POST as reviewVerification } from "../src/app/api/verification/review/route";
import { POST as distributorLogin } from "../src/app/api/distributor/login/route";
import { DISTRIBUTOR_COOKIE_NAME } from "../src/lib/distributor-session";

const TEST_OTP = "481726";
const TEST_SECRET = process.env.HMAC_BLIND_INDEX_KEY || process.env.SESSION_SECRET_CUST || "ls-otp-phone-index";

function makeOtp(channel: "sms" | "email", identifier: string) {
  const phoneHash = crypto.createHmac("sha256", TEST_SECRET)
    .update(`customer:${channel}:${identifier}`).digest("hex");
  const codeHash = crypto.createHmac("sha256", TEST_SECRET)
    .update(`customer:${channel}:${identifier}:${TEST_OTP}`).digest("hex");
  return {
    id: `unit-${channel}-otp`,
    phoneHash,
    codeHash,
    attempts: 0,
    maxAttempts: 5,
    consumedAt: null,
    expiresAt: new Date(Date.now() + 60_000),
  };
}

function replaceRawQuery(t: any, handler: (query: string, args: any[]) => any) {
  replaceMethod(t, prisma as any, "$queryRawUnsafe", async (query: string, ...args: any[]) => handler(String(query), args));
}

function replaceRawExecute(t: any, handler: (query: string, args: any[]) => any = () => 1) {
  replaceMethod(t, prisma as any, "$executeRawUnsafe", async (query: string, ...args: any[]) => handler(String(query), args));
}

function replaceMethod(t: any, target: any, key: string, implementation: (...args: any[]) => any) {
  const original = target[key];
  if (typeof original !== "function") throw new Error(`Cannot stub missing method ${key}`);
  target[key] = implementation;
  t.after(() => { target[key] = original; });
}

function replaceOtpMethods(t: any, otp: any) {
  replaceMethod(t, prisma.otpCode, "findFirst", async () => otp);
  replaceMethod(t, prisma.otpCode, "updateMany", async () => ({ count: 1 }));
  replaceMethod(t, prisma.otpCode, "update", async () => ({}));
  replaceMethod(t, prisma.loginAttempt, "create", async () => ({}));
}

describe("Customer and retailer authentication / staff verification", () => {
  test("SMS OTP creates an in-memory customer fixture and issues a valid customer session", async (t) => {
    const phone = "9876543210";
    replaceOtpMethods(t, makeOtp("sms", phone));
    let created = false;
    replaceRawExecute(t, (query) => {
      if (query.includes("INSERT INTO customers")) created = true;
      return 1;
    });
    replaceRawQuery(t, (query) => {
      if (query.includes("FROM customers") && query.includes("WHERE phone = ?")) {
        return created ? [{ id: 880001, full_name: "Unit Customer", email: null, phone, status: "pending", verification_status: "Pending", email_verified: 0, wallet: 0 }] : [];
      }
      if (query.includes("FROM kyc_audit_logs")) return [];
      return [];
    });

    const response = await verifyOtp(new Request("http://localhost/api/auth/otp/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ channel: "sms", identifier: phone, code: TEST_OTP }),
    }) as any);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.redirectUrl, "/user/profile");
    assert.equal(body.user.profileComplete, false);
    assert.match(response.headers.get("set-cookie") || "", new RegExp(CITIZEN_COOKIE_NAME));
    const cookie = response.headers.get("set-cookie")!.split(";")[0].split("=").slice(1).join("=");
    const session = verifyHmacSession(decodeURIComponent(cookie), "CUSTOMER");
    assert.equal(session?.customerId, 880001);
    assert.equal(body.user.status, "Pending", "OTP authentication must not approve the account");
  });

  test("email OTP verifies an existing customer's email without approving their account", async (t) => {
    const email = "unit.customer@example.test";
    const phone = "9876500001";
    replaceOtpMethods(t, makeOtp("email", email));
    const executed: string[] = [];
    replaceRawExecute(t, (query) => { executed.push(query); return 1; });
    replaceRawQuery(t, (query) => {
      if (query.includes("FROM customers") && query.includes("LOWER(email) = ?")) {
        return [{ id: 880002, full_name: "Unit Email Customer", email, phone, status: "pending", verification_status: "Pending", email_verified: 0, wallet: 0 }];
      }
      if (query.includes("FROM kyc_audit_logs")) return [];
      return [];
    });

    const response = await verifyOtp(new Request("http://localhost/api/auth/otp/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ channel: "email", identifier: email, code: TEST_OTP }),
    }) as any);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.ok(executed.some((query) => query.includes("SET email_verified = 1")));
    assert.equal(body.user.status, "Pending");
    assert.equal(body.redirectUrl, "/user/profile");
  });

  test("customer email/password login accepts an email-verified account and routes incomplete profiles to correction", async (t) => {
    const password = "UnitTest-Password-2026";
    const passwordHash = hashPassword(password);
    const email = "credential.customer@example.test";
    replaceMethod(t, prisma.loginAttempt, "create", async () => ({}));
    replaceRawQuery(t, (query) => {
      if (query.includes("FROM employees")) return [];
      if (query.includes("FROM retail_users")) return [];
      if (query.includes("FROM customers") && query.includes("password")) {
        return [{ id: 880003, full_name: "Credential Test Customer", email, phone: "9876500003", password: passwordHash, email_verified: 1, verification_status: "Pending", status: "pending", rejection_reason: null }];
      }
      if (query.includes("FROM kyc_audit_logs")) return [];
      return [];
    });
    replaceRawExecute(t);

    const response = await loginWithCredentials(new Request("http://localhost/api/auth/login", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ identifier: email, password }),
    }) as any);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.redirectUrl, "/user/profile");
    assert.equal(body.user.isApproved, false);
    assert.match(response.headers.get("set-cookie") || "", new RegExp(CITIZEN_COOKIE_NAME));
  });

  test("retailer login keeps unapproved retailer in profile correction instead of dashboard", async (t) => {
    const password = "UnitRetailer-Password-2026";
    const passwordHash = hashPassword(password);
    replaceMethod(t, prisma.loginAttempt, "create", async () => ({}));
    replaceRawQuery(t, (query) => query.includes("FROM retail_users")
      ? [{ id: 880004, registration_no: "TN-RET-UNIT", name: "Unit Retailer", shop_name: "Unit Shop", email: "", phone: "", password: passwordHash, plain_password: null, wallet_balance: 0, status: "Pending", is_approved: 0, distributor_id: null, district_id: null, taluk_id: null, panchayat_id: null }]
      : []);
    replaceRawExecute(t);

    const response = await retailerLogin(new Request("http://localhost/api/retailer/login", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ identifier: "TN-RET-UNIT", password }),
    }) as any);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.redirectUrl, "/retailer/profile");
    assert.equal(body.retailer.status, "Pending");
    assert.match(response.headers.get("set-cookie") || "", new RegExp(RETAILER_COOKIE_NAME));
  });

  test("retailer profile correction saves shop link, optional GST, and photo then resets status to pending", async (t) => {
    const retailerId = 880005;
    const retailerCookie = signHmacSession({ id: retailerId, role: "RETAILER", isApproved: true }, "RETAILER");
    let updateQuery = "";
    let updateArgs: any[] = [];
    replaceRawQuery(t, (query) => {
      if (query.includes("SELECT status, shop_name FROM retail_users")) return [{ status: "Pending", shop_name: "Unit Shop" }];
      if (query.includes("FROM retail_users WHERE id = ?")) return [{ id: retailerId, email: "unit-retailer@example.test", phone: "9876500005", status: "Approved" }];
      return [];
    });
    replaceRawExecute(t, (query, args) => {
      if (query.includes("UPDATE retail_users")) { updateQuery = query; updateArgs = args; }
      return 1;
    });

    const response = await saveRetailerProfile(new Request("http://localhost/api/retailer/profile", {
      method: "PUT",
      headers: { "content-type": "application/json", cookie: `${RETAILER_COOKIE_NAME}=${retailerCookie}` },
      body: JSON.stringify({
        name: "Unit Retailer", shopName: "Test Shop", businessType: "Tailoring shop", phone: "9876500005",
        address: "10 Test Street", panNo: "ABCDE1234F", panDocument: "/test/pan.pdf",
        aadhaarNo: "123412341234", aadhaarDocument: "/test/aadhaar.pdf", businessDocument: "/test/trade.pdf",
        shopPhoto: "/test/shop.jpg", shopUrl: "https://maps.app.goo.gl/test", gstNo: "33ABCDE1234F1Z5",
      }),
    }) as any);
    const body = await response.json();
    assert.equal(response.status, 200, JSON.stringify(body));
    assert.equal(body.ok, true);
    assert.equal(body.status, "Pending");
    assert.match(updateQuery, /status = (?:'Pending'|\?), is_approved = (?:0|\?)/);
    assert.ok(updateArgs.includes("Pending"));
    assert.ok(updateArgs.includes(0));
    assert.ok(updateArgs.includes("https://maps.app.goo.gl/test"));
    assert.ok(updateArgs.includes("33ABCDE1234F1Z5"));
    assert.ok(updateArgs.includes("/test/shop.jpg"));
  });

  for (const userType of ["customer", "retailer"] as const) {
    for (const reviewerRole of ["staff", "admin"] as const) {
    test(`authorized ${reviewerRole} examines and approves a ${userType} fixture; storage, audit, and notification paths succeed`, async (t) => {
      const userId = userType === "customer" ? 880011 : 880012;
      let accountStatus = "Pending";
      let retailerApproved = 0;
      const profileDocs = { pan_doc: null, aadhar_doc: null, ration_doc: null, shop_image: null };

      replaceRawQuery(t, (query) => {
        if (query.includes("verification_document_artifacts")) return [];
        if (query.includes("FROM kyc_audit_logs")) return [];
        if (query.includes("SELECT pan_doc, aadhar_doc, ration_doc, shop_image")) return [profileDocs];
        if (query.includes("FROM customers WHERE id = ?")) return [{ name: "Unit Applicant", email: "", phone: "", verification_status: accountStatus }];
        if (query.includes("FROM retail_users WHERE id = ?")) {
          return [{ name: "Unit Retailer", email: "", phone: "", status: accountStatus, is_approved: retailerApproved }];
        }
        if (query.includes("SELECT verification_status, status FROM customers")) return [{ verification_status: accountStatus, status: accountStatus === "Approved" ? "active" : "pending" }];
        if (query.includes("SELECT status, is_approved FROM retail_users")) return [{ status: accountStatus, is_approved: retailerApproved }];
        if (query.includes("LAST_INSERT_ID")) return [{ lastId: "unit-notification" }];
        return [];
      });
      replaceRawExecute(t, (query, args) => {
        if (query.includes("UPDATE customers")) accountStatus = String(args[0]);
        if (query.includes("UPDATE retail_users")) {
          accountStatus = String(args[0]);
          retailerApproved = Number(args[1]);
        }
        return 1;
      });
      replaceMethod(t, NotificationRepository, "createNotificationRecord", async () => ({ id: "unit-notification", created: true }));

      const reviewerCookie = reviewerRole === "staff"
        ? `${staffSessionCookieName}=${createStaffSession({ id: 880099, name: "Unit Reviewer", email: "", canVerify: true, canSign: true })}`
        : `${adminSessionCookieName}=${createAdminSession()}`;
      const headers = { "content-type": "application/json", cookie: reviewerCookie };
      const examineResponse = await examineVerification(new Request("http://localhost/api/verification/examination", {
        method: "POST", headers,
        body: JSON.stringify({ userType, userId, action: "APPROVE" }),
      }));
      const examination = await examineResponse.json();
      assert.equal(examineResponse.status, 200);
      assert.ok(examination.examinationToken);

      const reviewResponse = await reviewVerification(new Request("http://localhost/api/verification/review", {
        method: "POST", headers,
        body: JSON.stringify({ userType, userId, action: "APPROVE", notes: "Test approval command", examinationToken: examination.examinationToken }),
      }));
      const result = await reviewResponse.json();
      assert.equal(reviewResponse.status, 200, JSON.stringify(result));
      assert.equal(result.ok, true);
      assert.equal(result.newStatus, "Approved");
      assert.equal(accountStatus, "Approved");
      if (userType === "retailer") assert.equal(retailerApproved, 1);
    });
    }
  }

  test("retailer session remains a retailer session and cannot be accepted as a customer session", () => {
    const retailerCookie = signHmacSession({ id: 880012, role: "RETAILER", isApproved: false }, "RETAILER");
    assert.ok(verifyHmacSession(retailerCookie, "RETAILER"));
    assert.equal(verifyHmacSession(retailerCookie, "CUSTOMER"), null);
    assert.notEqual(RETAILER_COOKIE_NAME, CITIZEN_COOKIE_NAME);
  });

  test("distributor login rejects invalid or missing captcha and accepts valid challenge token", async (t) => {
    // 1. Invalid captcha token is rejected with 400
    const invalidCaptchaRes = await distributorLogin(new Request("http://localhost/api/distributor/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        identifier: "DST-880099",
        password: "SecretPassword@123",
        captchaToken: "test-invalid-cap-token",
      }),
    }) as any);
    const invalidBody = await invalidCaptchaRes.json();
    assert.equal(invalidCaptchaRes.status, 400);
    assert.equal(invalidBody.ok, false);
    assert.match(invalidBody.error, /verification/i);

    // 2. Successful login with valid test token and credentials
    const hashed = await hashPassword("DistributorSecret@123");
    replaceRawQuery(t, (query) => {
      if (query.includes("FROM distributors")) {
        return [{
          id: 880099,
          registration_no: "DST-880099",
          name: "Unit Distributor",
          email: "distributor@example.com",
          phone: "9876543219",
          password: hashed,
          plain_password: null,
          wallet_balance: 5000,
          total_commission_earned: 12000,
          verification_status: "Approved",
          referral_code: "DIST880099",
        }];
      }
      return [];
    });

    const successRes = await distributorLogin(new Request("http://localhost/api/distributor/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        identifier: "DST-880099",
        password: "DistributorSecret@123",
        captchaToken: "test-valid-cap-distributor-1",
      }),
    }) as any);
    const successBody = await successRes.json();
    assert.equal(successRes.status, 200, JSON.stringify(successBody));
    assert.equal(successBody.ok, true);
    assert.equal(successBody.distributor.registrationNo, "DST-880099");
    assert.match(successRes.headers.get("set-cookie") || "", new RegExp(DISTRIBUTOR_COOKIE_NAME));

    // 3. Distributor session isolation check
    const distCookie = signHmacSession({ id: 880099, role: "DISTRIBUTOR" } as any, "DISTRIBUTOR");
    assert.ok(verifyHmacSession(distCookie, "DISTRIBUTOR"));
    assert.equal(verifyHmacSession(distCookie, "CUSTOMER"), null);
    assert.equal(verifyHmacSession(distCookie, "RETAILER"), null);
  });
});

