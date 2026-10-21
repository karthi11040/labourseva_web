import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, hashPassword } from "@/lib/security";
import {
  checkLoginGuard,
  recordLoginFailureGuard,
  recordLoginSuccessGuard,
  clientIpFromRequest,
} from "@/lib/security/login-guard";
import { createStaffSession, staffSessionCookieName } from "@/lib/staff-session";
import { verifyCaptcha } from "@/modules/captcha";

export async function POST(request: Request) {
  try {
    const ip = clientIpFromRequest(request);
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const captchaToken = typeof body.captchaToken === "string" ? body.captchaToken.trim() : "";

    // Security Verification: Validate Cap challenge only if provided
    if (captchaToken) {
      const capRes = await verifyCaptcha(captchaToken, { ip, action: "staff_login" });
      if (!capRes.success) {
        return NextResponse.json(
          { ok: false, error: capRes.error || "Security verification failed. Please complete the challenge." },
          { status: 400 }
        );
      }
    }

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: "Please enter both employee email and password." },
        { status: 400 }
      );
    }

    // 1. Check rate limit (memory lockout + shared DB sliding windows)
    const guardCtx = { ip, identifier: email, portal: "EMPLOYEE" as const };
    const rateLimitCheck = await checkLoginGuard(guardCtx);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: `Too many failed attempts. Access is temporarily locked. Try again in ${rateLimitCheck.remainingLockoutSeconds} seconds.`,
          locked: true,
          lockoutSeconds: rateLimitCheck.remainingLockoutSeconds,
        },
        { status: 429 }
      );
    }

    // 2. Query employee from database
    const [employee] = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM employees WHERE LOWER(email) = ? AND status = 'active' LIMIT 1`,
      email
    );

    if (!employee) {
      await recordLoginFailureGuard(guardCtx, "EMPLOYEE_NOT_FOUND");
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid employee credentials.",
        },
        { status: 401 }
      );
    }

    // 3. Verify password (progressive rehash for legacy plaintext entries)
    let passwordMatches = false;
    if (employee.password_hash) {
      if (employee.password_hash.startsWith("scrypt:")) {
        passwordMatches = verifyPassword(password, employee.password_hash);
      } else if (employee.password_hash === password) {
        // Legacy plaintext entry: succeed, then immediately hash it.
        passwordMatches = true;
        console.error(
          `[CRITICAL] employee #${employee.id} authenticated via legacy plaintext password_hash. Migrating in-request.`
        );
        try {
          await prisma.$executeRawUnsafe(
            `UPDATE employees SET password_hash = ? WHERE id = ?`,
            hashPassword(password),
            employee.id
          );
        } catch {}
      }
    }

    if (!passwordMatches) {
      await recordLoginFailureGuard(guardCtx);
      // Log failed attempt
      try {
        await prisma.$executeRawUnsafe(
          `INSERT INTO employee_logs (employee_id, action, description, created_at) VALUES (?, ?, ?, NOW())`,
          employee.id,
          "LOGIN_FAILED",
          `Failed login attempt from email: ${email}`
        );
      } catch {}

      return NextResponse.json(
        {
          ok: false,
          error: "Invalid employee credentials.",
        },
        { status: 401 }
      );
    }

    // 4. Success: clear rate limit, update last login, log success
    await recordLoginSuccessGuard(guardCtx);

    try {
      await prisma.$executeRawUnsafe(
        `UPDATE employees SET last_login = NOW() WHERE id = ?`,
        employee.id
      );
      await prisma.$executeRawUnsafe(
        `INSERT INTO employee_logs (employee_id, action, description, created_at) VALUES (?, ?, ?, NOW())`,
        employee.id,
        "LOGIN_SUCCESS",
        `Employee logged in successfully`
      );
    } catch {}

    // 5. Create secure session cookie
    const sessionToken = createStaffSession({
      id: employee.id,
      email: employee.email,
      name: employee.name,
      department: employee.department || "Welfare Inspection",
      designation: employee.designation || "Scrutiny Officer",
      canVerify: employee.can_verify !== 0,
      canSign: Boolean(employee.can_sign),
    });

    const response = NextResponse.json({
      ok: true,
      message: "Employee authenticated successfully.",
      employee: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        department: employee.department || "Welfare Inspection",
        designation: employee.designation || "Scrutiny Officer",
      },
    });

    response.cookies.set({
      name: staffSessionCookieName,
      value: sessionToken,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 12 * 60 * 60, // 12 hours
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Authentication error" },
      { status: 500 }
    );
  }
}
