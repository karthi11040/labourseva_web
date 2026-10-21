import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/security";
import {
  checkLoginGuard,
  recordLoginFailureGuard,
  recordLoginSuccessGuard,
  clientIpFromRequest,
} from "@/lib/security/login-guard";
import { CITIZEN_COOKIE_NAME } from "@/lib/citizen-session";
import { RETAILER_COOKIE_NAME } from "@/lib/retailer-session";
import { DISTRIBUTOR_COOKIE_NAME } from "@/lib/distributor-session";
import { createAdminSession, adminSessionCookieName } from "@/lib/admin-session";
import { createStaffSession, staffSessionCookieName } from "@/lib/staff-session";
import { signHmacSession } from "@/lib/session-validator";
import { verifyCaptcha } from "@/modules/captcha";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const ip = clientIpFromRequest(request);
  try {
    const body = await request.json().catch(() => ({}));
    const identifier = String(body.identifier || body.email || body.phone || "").trim();
    const password = String(body.password || "");
    const captchaToken = typeof body.captchaToken === "string" ? body.captchaToken.trim() : "";

    // Security Verification: Validate Cap challenge only if provided
    if (captchaToken) {
      const capRes = await verifyCaptcha(captchaToken, { ip, action: "auth_login" });
      if (!capRes.success) {
        return NextResponse.json(
          { ok: false, error: capRes.error || "Security verification failed. Please complete the challenge." },
          { status: 400 }
        );
      }
    }

    if (!identifier || !password) {
      return NextResponse.json(
        { ok: false, error: "Please provide your login identifier (email or phone) and password." },
        { status: 400 }
      );
    }

    const guardCtx = { ip, identifier, portal: "CUSTOMER" as const };
    const rateCheck = await checkLoginGuard(guardCtx);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { ok: false, error: `Account access temporarily locked due to repeated failed attempts. Please retry in ${rateCheck.remainingLockoutSeconds ?? 60} seconds.` },
        { status: 429 }
      );
    }

    // 1. Check Super-Admin Credentials from .env
    // SECURITY: no source-known default password. If ADMIN_PASSWORD is not
    // configured, the admin shortcut is skipped entirely (503-style behavior
    // matches /api/admin/login). Previously an unset env silently enabled the
    // literal "labourseva@2026" password — removed.
    const envAdminEmail = (process.env.ADMIN_EMAIL || "").toLowerCase();
    const envAdminPass = process.env.ADMIN_PASSWORD;
    if (envAdminEmail && envAdminPass && identifier.toLowerCase() === envAdminEmail) {
      if (password !== envAdminPass) {
        await recordLoginFailureGuard({ ...guardCtx, portal: "ADMIN" }, "ADMIN_BAD_PASSWORD");
        return NextResponse.json(
          { ok: false, error: "Invalid credentials. Please verify your login identifier and password." },
          { status: 401 }
        );
      }
      const adminCookie = createAdminSession();
      await recordLoginSuccessGuard({ ...guardCtx, portal: "ADMIN" });
      const response = NextResponse.json({
        ok: true,
        user: { id: 1, name: "System Administrator", email: envAdminEmail, role: "ADMIN", status: "APPROVED" },
        redirectUrl: "/admin/dashboard",
      });
      response.cookies.set(adminSessionCookieName, adminCookie, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 86400,
      });
      return response;
    }

    // 2. Query Employees (Staff)
    try {
      const employees = await prisma.$queryRawUnsafe<any[]>(
        `SELECT id, name, email, password, role, designation, can_verify, can_sign, status 
         FROM employees WHERE LOWER(email) = ? LIMIT 1`,
        identifier.toLowerCase()
      );
      if (employees && employees.length > 0) {
        const emp = employees[0];
        if (verifyPassword(password, emp.password)) {
          if (emp.status === "suspended" || emp.status === "inactive") {
            return NextResponse.json({ ok: false, error: "Your employee account has been suspended or deactivated. Contact HR." }, { status: 403 });
          }
          const staffCookie = createStaffSession({
            id: emp.id,
            email: emp.email,
            name: emp.name,
            designation: emp.designation,
            canVerify: Boolean(emp.can_verify),
            canSign: Boolean(emp.can_sign),
          });
          const response = NextResponse.json({
            ok: true,
            user: { id: emp.id, name: emp.name, email: emp.email, role: "EMPLOYEE", status: "APPROVED" },
            redirectUrl: "/staff/dashboard",
          });
          await recordLoginSuccessGuard({ ip, identifier, portal: "EMPLOYEE" });
          response.cookies.set(staffSessionCookieName, staffCookie, {
            path: "/",
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            maxAge: 43200,
          });
          return response;
        }
      }
    } catch {}

    // 3. Query Retailers
    try {
      const retailers = await prisma.$queryRawUnsafe<any[]>(
        `SELECT id, registration_no, name, shop_name, email, phone, password, status, is_approved 
         FROM retail_users 
         WHERE LOWER(email) = ? OR phone = ? LIMIT 1`,
        identifier.toLowerCase(),
        identifier
      );
      if (retailers && retailers.length > 0) {
        const ret = retailers[0];
        if (verifyPassword(password, ret.password)) {
          const isApproved = Boolean(Number(ret.is_approved) === 1 && String(ret.status || "").toLowerCase() === "approved");
          const sessionPayload = {
            id: ret.id,
            registrationNo: ret.registration_no,
            name: ret.name,
            email: ret.email,
            phone: ret.phone,
            role: "RETAILER",
            isApproved,
            status: ret.status,
          };
          const cookieVal = signHmacSession(sessionPayload, "RETAILER");
          const redirectUrl = isApproved ? "/retailer/dashboard" : "/retailer/profile";

          const response = NextResponse.json({
            ok: true,
            user: { id: ret.id, name: ret.name, email: ret.email, role: "RETAILER", status: ret.status, isApproved },
            redirectUrl,
            message: isApproved ? "Login successful." : "Your retailer account is currently pending administrative verification.",
          });
          await recordLoginSuccessGuard({ ip, identifier, portal: "RETAILER" });
          response.cookies.set(RETAILER_COOKIE_NAME, cookieVal, {
            path: "/",
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            maxAge: 604800,
          });
          return response;
        }
      }
    } catch {}

    // 4. Query Customers (Citizens)
    try {
      const customers = await prisma.$queryRawUnsafe<any[]>(
        `SELECT id, full_name, email, phone, password, email_verified, verification_status, status, rejection_reason 
         FROM customers 
         WHERE LOWER(email) = ? OR phone = ? LIMIT 1`,
        identifier.toLowerCase(),
        identifier
      );
      if (customers && customers.length > 0) {
        const cust = customers[0];
        if (verifyPassword(password, cust.password)) {
          // Check email verification status
          const isEmailVerified = Boolean(Number(cust.email_verified) === 1);
          const isApproved = String(cust.verification_status || "").toLowerCase() === "approved";

          if (!isEmailVerified) {
            return NextResponse.json({
              ok: false,
              accountStatus: "EMAIL_UNVERIFIED",
              error: "Your email address is not yet verified. Please click the verification link sent to your inbox, or request a new link.",
            }, { status: 403 });
          }

          if (cust.verification_status === "Rejected") {
            return NextResponse.json({
              ok: false,
              accountStatus: "REJECTED",
              rejectionReason: cust.rejection_reason || "Documents did not satisfy verification criteria.",
              error: `Your account verification was rejected: ${cust.rejection_reason || "Please review required details."}`,
            }, { status: 403 });
          }

          const sessionPayload = {
            id: cust.phone || cust.id,
            customerId: cust.id,
            name: cust.full_name,
            phone: cust.phone,
            email: cust.email,
            role: "CUSTOMER",
            isApproved,
            verificationStatus: cust.verification_status,
          };
          const cookieVal = signHmacSession(sessionPayload, "CUSTOMER");
          const submittedProfiles = await prisma.$queryRawUnsafe<any[]>(
            `SELECT id FROM kyc_audit_logs WHERE user_type = 'customer' AND user_id = ? AND action_performed = 'submit_verification' LIMIT 1`,
            cust.id
          );
          const profileComplete = submittedProfiles.length > 0;
          const redirectUrl = profileComplete ? "/user/dashboard" : "/user/profile";

          const response = NextResponse.json({
            ok: true,
            user: { id: cust.id, name: cust.full_name, email: cust.email, phone: cust.phone, role: "CUSTOMER", status: cust.verification_status, isApproved },
            redirectUrl,
            message: profileComplete ? "Signed in successfully." : "Complete your profile to continue to the dashboard.",
          });
          await recordLoginSuccessGuard({ ip, identifier, portal: "CUSTOMER" });
          response.cookies.set(CITIZEN_COOKIE_NAME, cookieVal, {
            path: "/",
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            maxAge: 604800,
          });
          return response;
        }
      }
    } catch {}

    // Record login failure and return generic timing-safe error
    await recordLoginFailureGuard(guardCtx, "NO_MATCHING_CREDENTIALS");
    return NextResponse.json(
      { ok: false, error: "Invalid credentials. Please verify your login identifier and password." },
      { status: 401 }
    );
  } catch (error: any) {
    console.error("[POST /api/auth/login Error]:", error);
    return NextResponse.json(
      { ok: false, error: "An unexpected error occurred during login." },
      { status: 500 }
    );
  }
}
