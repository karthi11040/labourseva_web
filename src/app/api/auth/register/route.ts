import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, checkRateLimit, recordLoginFailure } from "@/lib/security";
import { createSecurityToken } from "@/lib/token-store";
import { dispatchEmailVerificationNotification } from "@/lib/notification-service";
import { sanitizeIndianMobile } from "@/lib/sms";
import { verifyCaptcha } from "@/modules/captcha";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const body = await request.json().catch(() => ({}));
    const captchaToken = typeof body.captchaToken === "string" ? body.captchaToken.trim() : "";

    // Security Verification: Mandatory Cap CAPTCHA challenge
    const capRes = await verifyCaptcha(captchaToken, { ip, action: "register" });
    if (!capRes.success) {
      return NextResponse.json(
        { ok: false, error: capRes.error || "Security verification failed. Please complete the challenge." },
        { status: 400 }
      );
    }

    const rateKey = `register:${ip}`;
    const rateCheck = checkRateLimit(rateKey);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { ok: false, error: `Too many registration attempts. Please retry in ${rateCheck.remainingLockoutSeconds} seconds.` },
        { status: 429 }
      );
    }
    const name = String(body.name || "").trim();
    const email = String(body.email || "").toLowerCase().trim();
    const rawPhone = String(body.phone || "").trim();
    const password = String(body.password || "");
    const confirmPassword = String(body.confirmPassword || "");
    const requestedRole = String(body.role || "customer").toLowerCase().trim();
    const shopName = String(body.shopName || "").trim();
    const shopUrl = String(body.shopUrl || "").trim();
    const gstNo = String(body.gstNo || "").trim().toUpperCase();
    const terms = Boolean(body.terms);

    // 1. Validation
    if (!name || name.length < 2) {
      return NextResponse.json({ ok: false, error: "Please provide your full legal name." }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json({ ok: false, error: "Please enter a valid email address." }, { status: 400 });
    }

    const phone = sanitizeIndianMobile(rawPhone);
    if (!phone || phone.length !== 10) {
      return NextResponse.json({ ok: false, error: "Please enter a valid 10-digit Indian mobile number." }, { status: 400 });
    }

    if (!password || password.length < 8) {
      return NextResponse.json({ ok: false, error: "Password must be at least 8 characters long." }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ ok: false, error: "Passwords do not match." }, { status: 400 });
    }

    if (!terms) {
      return NextResponse.json({ ok: false, error: "You must accept the terms of service and privacy policy." }, { status: 400 });
    }

    // Role Security: Reject unauthorized self-registration
    if (["admin", "employee", "staff", "superadmin"].includes(requestedRole)) {
      return NextResponse.json(
        { ok: false, error: "Staff and administrative accounts must be created through authorized governance processes." },
        { status: 403 }
      );
    }

    const role = ["retailer", "distributor"].includes(requestedRole) ? requestedRole : "customer";

    if (role === "retailer" && !shopName) {
      return NextResponse.json({ ok: false, error: "Enter the shop or business name." }, { status: 400 });
    }
    if (shopUrl && !/^https?:\/\//i.test(shopUrl)) {
      return NextResponse.json({ ok: false, error: "Enter a complete shop link beginning with http:// or https://." }, { status: 400 });
    }
    if (gstNo && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstNo)) {
      return NextResponse.json({ ok: false, error: "Enter a valid 15-character GSTIN or leave it blank." }, { status: 400 });
    }

    // 2. Uniqueness Checks
    try {
      const existingAccount = await prisma.$queryRawUnsafe<any[]>(
        role === "retailer"
          ? `SELECT id FROM retail_users WHERE LOWER(email) = ? OR phone = ? LIMIT 1`
          : `SELECT id FROM customers WHERE LOWER(email) = ? OR phone = ? LIMIT 1`,
        email,
        phone
      );
      if (existingAccount && existingAccount.length > 0) {
        return NextResponse.json(
          { ok: false, error: "An account with this email address or mobile number already exists." },
          { status: 409 }
        );
      }
    } catch (checkErr: any) {
      console.error("[Register Uniqueness Check Error]:", checkErr?.message);
      return NextResponse.json(
        { ok: false, error: "Unable to verify account uniqueness. Please try again shortly." },
        { status: 500 }
      );
    }

    // 3. Password Hashing
    const hashedPassword = hashPassword(password);

    // 4. Create Account in PENDING_VERIFICATION state
    let createdUserId = Date.now();
    try {
      if (role === "retailer") {
        const regNo = `TN-RET-${Date.now().toString().slice(-6)}`;
        await prisma.$executeRawUnsafe(
          `INSERT INTO retail_users (registration_no, name, shop_name, shop_url, business_type, gst_no, email, phone, password, status, is_approved, wallet_balance, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_APPROVAL', 0, 0, NOW())`,
          regNo,
          name,
          shopName,
          shopUrl || null,
          String(body.businessType || "Retail / Common Service Centre").trim(),
          gstNo || null,
          email,
          phone,
          hashedPassword
        );
        const [created] = await prisma.$queryRawUnsafe<any[]>(`SELECT id FROM retail_users WHERE registration_no = ? LIMIT 1`, regNo);
        if (!created?.id) throw new Error("Retailer account could not be created.");
        createdUserId = Number(created.id);
      } else {
        await prisma.$executeRawUnsafe(
          `INSERT INTO customers (full_name, email, phone, password, email_verified, verification_status, status, created_at)
           VALUES (?, ?, ?, ?, 0, 'Pending', 'pending', NOW())`,
          name,
          email,
          phone,
          hashedPassword
        );
        const [created] = await prisma.$queryRawUnsafe<any[]>(`SELECT id FROM customers WHERE LOWER(email) = ? LIMIT 1`, email);
        if (!created?.id) throw new Error("Customer account could not be created.");
        createdUserId = Number(created.id);
      }
    } catch (insertErr: any) {
      console.error("[Register Insert Error]:", insertErr?.message);
      return NextResponse.json({ ok: false, error: "We could not create your account. Please try again shortly." }, { status: 500 });
    }

    // 5. Generate Email Verification Token (24-hour expiry)
    const rawToken = await createSecurityToken({
      identifier: email,
      userId: createdUserId,
      purpose: "EMAIL_VERIFICATION",
      expiresInMinutes: 24 * 60,
    });

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://labourseva.com").replace(/\/$/, "");
    const verifyUrl = `${appUrl}/verify-email?token=${rawToken}`;

    // 6. Send Email Verification Notification
    await dispatchEmailVerificationNotification({
      name,
      email,
      verifyUrl,
      expiryHours: 24,
    });

    return NextResponse.json({
      ok: true,
      message: "Registration successful. A verification link has been sent to your email address. Please verify your email to submit your account for administrative review.",
      email,
      role,
    });
  } catch (error: any) {
    console.error("[POST /api/auth/register Error]:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "An unexpected error occurred during registration." },
      { status: 500 }
    );
  }
}
