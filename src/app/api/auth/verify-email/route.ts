import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateSecurityToken } from "@/lib/token-store";
import { renderAccountVerificationSubmittedEmail } from "@/lib/email-templates";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = request.nextUrl ?? new URL(request.url);
  const token = url.searchParams.get("token")?.trim() || "";

  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Missing verification token." },
      { status: 400 }
    );
  }

  // 1. Validate and consume token (single-use)
  const validation = await validateSecurityToken({
    rawToken: token,
    purpose: "EMAIL_VERIFICATION",
    consume: true,
  });

  if (!validation.valid || !validation.identifier) {
    // If the token was recently consumed (e.g. React StrictMode or browser link prefetch),
    // check if the associated account is already verified in the database.
    if (validation.alreadyConsumed && validation.identifier) {
      const email = validation.identifier.toLowerCase();

      // Check customer account
      const customer = await prisma.$queryRawUnsafe<any[]>(
        `SELECT id, full_name, email_verified, status FROM customers WHERE LOWER(email) = ? LIMIT 1`,
        email
      ).catch(() => []);

      if (customer && customer.length > 0 && Number(customer[0].email_verified) === 1) {
        const refNo = `TN-VER-${String(customer[0].id).padStart(6, "0")}`;
        const acceptHeader = request.headers.get("accept") || "";
        if (acceptHeader.includes("text/html")) {
          const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://labourseva.com").replace(/\/$/, "");
          return NextResponse.redirect(`${appUrl}/user/account-status?email_verified=true&ref=${refNo}`);
        }

        return NextResponse.json({
          ok: true,
          alreadyVerified: true,
          message: "Your email address is already verified. Your account is queued for administrative verification.",
          email,
          userType: "customer",
          referenceNo: refNo,
          accountStatus: "PENDING_APPROVAL",
        });
      }

      // Check retailer account
      const retailer = await prisma.$queryRawUnsafe<any[]>(
        `SELECT id, name, status FROM retail_users WHERE LOWER(email) = ? LIMIT 1`,
        email
      ).catch(() => []);

      if (retailer && retailer.length > 0 && (retailer[0].status === "PENDING_APPROVAL" || retailer[0].status === "active" || retailer[0].status === "approved")) {
        const refNo = `TN-RET-${String(retailer[0].id).padStart(6, "0")}`;
        return NextResponse.json({
          ok: true,
          alreadyVerified: true,
          message: "Your email address is already verified. Your account is queued for administrative verification.",
          email,
          userType: "retailer",
          referenceNo: refNo,
          accountStatus: "PENDING_APPROVAL",
        });
      }
    }

    return NextResponse.json(
      { ok: false, error: validation.error || "The email verification link is invalid or has already been used." },
      { status: 400 }
    );
  }

  const email = validation.identifier.toLowerCase();

  // 2. Mark account email as verified in database
  let applicantName = "Citizen";
  let userType = "customer";
  let accountId = validation.userId || 1;

  try {
    const customer = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, full_name FROM customers WHERE LOWER(email) = ? LIMIT 1`,
      email
    );
    if (customer && customer.length > 0) {
      applicantName = customer[0].full_name || applicantName;
      accountId = customer[0].id;
      await prisma.$executeRawUnsafe(
        `UPDATE customers 
         SET email_verified = 1,
             verification_status = CASE WHEN LOWER(verification_status) = 'approved' THEN verification_status ELSE 'Pending' END,
             status = CASE WHEN LOWER(verification_status) = 'approved' THEN status ELSE 'pending' END
         WHERE id = ?`,
        accountId
      );
    } else {
      const retailer = await prisma.$queryRawUnsafe<any[]>(
        `SELECT id, name FROM retail_users WHERE LOWER(email) = ? LIMIT 1`,
        email
      );
      if (retailer && retailer.length > 0) {
        applicantName = retailer[0].name || applicantName;
        userType = "retailer";
        accountId = retailer[0].id;
        await prisma.$executeRawUnsafe(
          `UPDATE retail_users 
           SET status = 'PENDING_APPROVAL', is_approved = 0, updated_at = NOW()
           WHERE id = ?`,
          accountId
        );
      }
    }
  } catch (err: any) {
    console.warn("[Verify Email DB Warning]:", err?.message);
  }

  // 3. Dispatch "Account Verification Submitted" Email
  const refNo = `TN-VER-${String(accountId).padStart(6, "0")}`;
  const submittedEmail = renderAccountVerificationSubmittedEmail({
    name: applicantName,
    userType,
    referenceNo: refNo,
  });

  sendEmail({
    to: email,
    subject: submittedEmail.subject,
    html: submittedEmail.html,
    text: submittedEmail.text,
  }).catch(() => {});

  // 4. If browser navigation, redirect to account status page with success indicator
  const acceptHeader = request.headers.get("accept") || "";
  if (acceptHeader.includes("text/html")) {
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://labourseva.com").replace(/\/$/, "");
    return NextResponse.redirect(`${appUrl}/user/account-status?email_verified=true&ref=${refNo}`);
  }

  return NextResponse.json({
    ok: true,
    message: "Email address verified successfully. Your account is now queued for administrative verification.",
    email,
    userType,
    referenceNo: refNo,
    accountStatus: "PENDING_APPROVAL",
  });
}
