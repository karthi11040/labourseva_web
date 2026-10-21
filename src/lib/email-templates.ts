/**
 * LabourSeva — Centralized Transactional Email Template System
 * Designed for Government of Tamil Nadu Labour Welfare Board
 * Cross-client compatible table layout with deep navy (#1e3a8a) & saffron (#ea580c)
 */

export interface EmailRenderOutput {
  subject: string;
  html: string;
  text: string;
}

export function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

interface BaseLayoutOptions {
  preheader?: string;
  badgeText?: string;
  title: string;
  contentHtml: string;
  actionButton?: {
    text: string;
    url: string;
  };
  securityNotice?: string;
  footerNotes?: string[];
}

function renderBaseEmailLayout(opts: BaseLayoutOptions): string {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://labourseva.com").replace(/\/$/, "");
  const badgeHtml = opts.badgeText
    ? `<tr>
        <td style="padding: 0 0 12px 0;">
          <span style="display: inline-block; background-color: #ffedd5; color: #c2410c; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 4px 10px; border-radius: 4px; border: 1px solid #fed7aa;">
            ${escapeHtml(opts.badgeText)}
          </span>
        </td>
      </tr>`
    : "";

  const actionButtonHtml = opts.actionButton
    ? `<tr>
        <td align="center" style="padding: 24px 0 28px 0;">
          <table border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
            <tr>
              <td align="center" style="border-radius: 6px; background-color: #1e3a8a;">
                <a href="${escapeHtml(opts.actionButton.url)}" target="_blank" style="font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff; text-decoration: none; border-radius: 6px; padding: 13px 28px; border: 1px solid #1e3a8a; display: inline-block; font-weight: 700; letter-spacing: 0.3px;">
                  ${escapeHtml(opts.actionButton.text)} &rarr;
                </a>
              </td>
            </tr>
          </table>
          <p style="margin: 12px 0 0 0; font-size: 11px; color: #64748b;">
            Button not working? Copy and paste this link into your browser:<br/>
            <a href="${escapeHtml(opts.actionButton.url)}" style="color: #2563eb; word-break: break-all; text-decoration: underline;">
              ${escapeHtml(opts.actionButton.url)}
            </a>
          </p>
        </td>
      </tr>`
    : "";

  const securityNoticeHtml = opts.securityNotice
    ? `<tr>
        <td style="padding: 16px 0 0 0;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #fff7ed; border-left: 4px solid #ea580c; border-radius: 0 6px 6px 0;">
            <tr>
              <td style="padding: 12px 16px; font-size: 12px; line-height: 18px; color: #9a3412;">
                <strong>Security Advisory:</strong> ${opts.securityNotice}
              </td>
            </tr>
          </table>
        </td>
      </tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${escapeHtml(opts.title)}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, a { font-family: Arial, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  ${opts.preheader ? `<div style="display: none; max-height: 0px; overflow: hidden; mso-hide: all;">${escapeHtml(opts.preheader)}</div>` : ""}

  <!-- Outer Canvas -->
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 30px 15px;">
    <tr>
      <td align="center">
        <!-- Main Container (600px max) -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #cbd5e1; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          
          <!-- Government / Portal Banner Header -->
          <tr>
            <td style="background-color: #1e3a8a; padding: 22px 28px; border-bottom: 4px solid #ea580c;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: 0.5px;">
                      LabourSeva
                    </h1>
                    <p style="margin: 4px 0 0 0; font-size: 11px; font-weight: 600; color: #fed7aa; text-transform: uppercase; letter-spacing: 0.5px;">
                      Government of Tamil Nadu &bull; Digital Welfare Portal
                    </p>
                  </td>
                  <td align="right" style="font-size: 11px; color: #93c5fd; font-weight: 600;">
                    TNBOCWWB
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 32px 28px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                ${badgeHtml}
                <tr>
                  <td style="padding: 0 0 16px 0;">
                    <h2 style="margin: 0; font-size: 19px; font-weight: 800; color: #0f172a; line-height: 26px;">
                      ${escapeHtml(opts.title)}
                    </h2>
                  </td>
                </tr>
                <tr>
                  <td style="font-size: 14px; line-height: 22px; color: #334155;">
                    ${opts.contentHtml}
                  </td>
                </tr>
                ${actionButtonHtml}
                ${securityNoticeHtml}
              </table>
            </td>
          </tr>

          <!-- Footer Divider -->
          <tr>
            <td style="border-top: 1px solid #e2e8f0; background-color: #f1f5f9; padding: 22px 28px; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;">
                Tamil Nadu Building & Other Construction Workers Welfare Board
              </p>
              <p style="margin: 0 0 8px 0; font-size: 11px; line-height: 16px; color: #64748b;">
                Official Digital Citizen Portal &bull; Chennai, Tamil Nadu, India<br/>
                Helpline: 044-24335111 &bull; Email: <a href="mailto:support@labourseva.com" style="color: #1e3a8a; text-decoration: none; font-weight: 600;">support@labourseva.com</a>
              </p>
              <p style="margin: 12px 0 0 0; font-size: 10px; color: #94a3b8;">
                &copy; ${new Date().getFullYear()} LabourSeva Digital Services. All rights reserved.<br/>
                This is an automated operational notification. Please do not reply directly to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// 1. Email Verification
// ---------------------------------------------------------------------------
export function renderEmailVerificationEmail(data: {
  name: string;
  verifyUrl: string;
  expiryHours?: number;
}): EmailRenderOutput {
  const expiry = data.expiryHours || 24;
  const subject = "Verify Your Email Address — LabourSeva";
  const html = renderBaseEmailLayout({
    preheader: "Please confirm your email address to proceed with LabourSeva registration.",
    badgeText: "Account Registration",
    title: "Verify Your Email Address",
    contentHtml: `
      <p style="margin: 0 0 14px 0;">Dear <strong>${escapeHtml(data.name)}</strong>,</p>
      <p style="margin: 0 0 14px 0;">
        Thank you for registering on the <strong>LabourSeva</strong> welfare portal. To activate your account submission, please verify that this email address belongs to you by clicking the button below.
      </p>
      <p style="margin: 0 0 14px 0; font-size: 13px; color: #64748b;">
        This verification link will remain active for <strong>${expiry} hours</strong>. Once your email is verified, your profile will be queued for official compliance review.
      </p>
    `,
    actionButton: {
      text: "Verify Email Address",
      url: data.verifyUrl,
    },
    securityNotice: "If you did not register for an account on LabourSeva, you can safely ignore this message.",
  });

  const text = `Dear ${data.name},\n\nThank you for registering on LabourSeva. Please verify your email address by opening the following link:\n\n${data.verifyUrl}\n\nThis link is valid for ${expiry} hours.\n\nLabourSeva Digital Welfare Board`;
  return { subject, html, text };
}

// ---------------------------------------------------------------------------
// 2. Account Verification Request Submitted
// ---------------------------------------------------------------------------
export function renderAccountVerificationSubmittedEmail(data: {
  name: string;
  userType: string;
  referenceNo: string;
}): EmailRenderOutput {
  const subject = `Account Verification Queued [Ref: ${data.referenceNo}] — LabourSeva`;
  const html = renderBaseEmailLayout({
    preheader: "Your account verification request has been received and is under review.",
    badgeText: "Verification In Review",
    title: "Account Verification Request Received",
    contentHtml: `
      <p style="margin: 0 0 14px 0;">Dear <strong>${escapeHtml(data.name)}</strong>,</p>
      <p style="margin: 0 0 14px 0;">
        Your email address has been verified. Your request for an approved <strong>${escapeHtml(data.userType.toUpperCase())}</strong> account has been placed into the administrative review queue.
      </p>
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; margin: 16px 0; padding: 12px 16px;">
        <tr>
          <td style="font-size: 13px; color: #475569; padding: 4px 0;"><strong>Reference No:</strong> ${escapeHtml(data.referenceNo)}</td>
        </tr>
        <tr>
          <td style="font-size: 13px; color: #475569; padding: 4px 0;"><strong>Account Type:</strong> ${escapeHtml(data.userType.toUpperCase())}</td>
        </tr>
        <tr>
          <td style="font-size: 13px; color: #475569; padding: 4px 0;"><strong>Status:</strong> Under Administrative Scrutiny</td>
        </tr>
      </table>
      <p style="margin: 0 0 14px 0; font-size: 13px; color: #64748b;">
        An authorized officer will verify your details against official records. You will receive an SMS and email notification immediately once a decision is made.
      </p>
    `,
    securityNotice: "Protected services remain restricted until an official approval decision is recorded.",
  });

  const text = `Dear ${data.name},\n\nYour account verification request (Ref: ${data.referenceNo}) for account type ${data.userType} has been received and is currently under review by our scrutiny officers.\n\nYou will receive a confirmation once reviewed.\n\nLabourSeva Digital Welfare Board`;
  return { subject, html, text };
}

// ---------------------------------------------------------------------------
// 3. Account Approved by Admin / Staff (MANDATORY REQUIREMENT)
// ---------------------------------------------------------------------------
export function renderAccountApprovedEmail(data: {
  name: string;
  userType: string;
  loginUrl: string;
  serviceHighlights?: string[];
}): EmailRenderOutput {
  const subject = "Your Account Has Been Verified — LabourSeva";
  const highlights = data.serviceHighlights || [
    "Apply for statutory welfare document services",
    "Submit digital e-services and track application status",
    "Secure document vault and downloadable official receipts",
  ];
  const listItems = highlights.map((h) => `<li style="margin-bottom: 6px;">${escapeHtml(h)}</li>`).join("");

  const html = renderBaseEmailLayout({
    preheader: "Your LabourSeva account has been officially verified and approved.",
    badgeText: "Account Approved",
    title: "Your Account Has Been Verified Successfully",
    contentHtml: `
      <p style="margin: 0 0 14px 0;">Dear <strong>${escapeHtml(data.name)}</strong>,</p>
      <p style="margin: 0 0 14px 0;">
        We are pleased to inform you that your <strong>LabourSeva</strong> account (${escapeHtml(data.userType.toUpperCase())}) has been verified and officially approved by the Labour Welfare Administration.
      </p>
      <p style="margin: 0 0 10px 0; font-weight: 700; color: #0f172a;">You now have full access to:</p>
      <ul style="margin: 0 0 18px 0; padding-left: 20px; color: #334155; font-size: 13px; line-height: 20px;">
        ${listItems}
      </ul>
      <p style="margin: 0 0 14px 0; font-size: 13px; color: #475569;">
        Click below to sign in to your dashboard and begin using the platform services.
      </p>
    `,
    actionButton: {
      text: "Sign In to Your Account",
      url: data.loginUrl,
    },
    securityNotice: "Never share your password with anyone. Department staff will never request login credentials.",
  });

  const text = `Dear ${data.name},\n\nYour LabourSeva account (${data.userType.toUpperCase()}) has been verified and approved by the administration. You can now log in at:\n\n${data.loginUrl}\n\nLabourSeva Digital Welfare Board`;
  return { subject, html, text };
}

// ---------------------------------------------------------------------------
// 4. Account Rejected
// ---------------------------------------------------------------------------
export function renderAccountRejectedEmail(data: {
  name: string;
  userType: string;
  reason: string;
  resubmitUrl?: string;
}): EmailRenderOutput {
  const subject = "Account Verification Status Update — LabourSeva";
  const html = renderBaseEmailLayout({
    preheader: "Your LabourSeva account verification request could not be approved.",
    badgeText: "Verification Rejected",
    title: "Account Verification Update",
    contentHtml: `
      <p style="margin: 0 0 14px 0;">Dear <strong>${escapeHtml(data.name)}</strong>,</p>
      <p style="margin: 0 0 14px 0;">
        Your verification request for a <strong>${escapeHtml(data.userType.toUpperCase())}</strong> account was reviewed, but could not be approved due to the following reason:
      </p>
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 0 6px 6px 0; margin: 16px 0;">
        <tr>
          <td style="padding: 12px 16px; font-size: 13px; color: #991b1b; line-height: 20px;">
            <strong>Reason:</strong> ${escapeHtml(data.reason)}
          </td>
        </tr>
      </table>
      <p style="margin: 0 0 14px 0; font-size: 13px; color: #475569;">
        If you have corrected documents or believe this decision was made in error, you may resubmit your verification request from your profile.
      </p>
    `,
    actionButton: data.resubmitUrl
      ? {
          text: "Review & Resubmit Documents",
          url: data.resubmitUrl,
        }
      : undefined,
    securityNotice: "For inquiries, please contact our helpline at 044-24335111 with your registered mobile number.",
  });

  const text = `Dear ${data.name},\n\nYour LabourSeva verification request was not approved.\nReason: ${data.reason}\n\nYou may resubmit via: ${data.resubmitUrl || "your profile dashboard"}.\n\nLabourSeva Digital Welfare Board`;
  return { subject, html, text };
}

// ---------------------------------------------------------------------------
// 5. Additional Information / Documents Requested
// ---------------------------------------------------------------------------
export function renderAdditionalInfoRequestedEmail(data: {
  name: string;
  userType: string;
  requestedInfo: string;
  resubmitUrl: string;
}): EmailRenderOutput {
  const subject = "Action Required: Additional Verification Details Needed — LabourSeva";
  const html = renderBaseEmailLayout({
    preheader: "Action needed to complete your LabourSeva account verification.",
    badgeText: "Information Requested",
    title: "Additional Verification Details Needed",
    contentHtml: `
      <p style="margin: 0 0 14px 0;">Dear <strong>${escapeHtml(data.name)}</strong>,</p>
      <p style="margin: 0 0 14px 0;">
        The scrutiny officer reviewing your <strong>${escapeHtml(data.userType.toUpperCase())}</strong> account verification has requested additional documentation or clarification:
      </p>
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 0 6px 6px 0; margin: 16px 0;">
        <tr>
          <td style="padding: 12px 16px; font-size: 13px; color: #1e40af; line-height: 20px;">
            <strong>Officer Note:</strong> ${escapeHtml(data.requestedInfo)}
          </td>
        </tr>
      </table>
      <p style="margin: 0 0 14px 0; font-size: 13px; color: #475569;">
        Please upload the requested details as soon as possible to proceed with your verification.
      </p>
    `,
    actionButton: {
      text: "Upload Requested Details",
      url: data.resubmitUrl,
    },
    securityNotice: "Upload documents only through the official portal URL.",
  });

  const text = `Dear ${data.name},\n\nAdditional information is required for your LabourSeva verification:\n${data.requestedInfo}\n\nUpload via: ${data.resubmitUrl}\n\nLabourSeva Digital Welfare Board`;
  return { subject, html, text };
}

// ---------------------------------------------------------------------------
// 6. Password Reset (Cryptographic, single-use, time-limited)
// ---------------------------------------------------------------------------
export function renderPasswordResetEmail(data: {
  name: string;
  resetUrl: string;
  expiryMinutes?: number;
}): EmailRenderOutput {
  const minutes = data.expiryMinutes || 15;
  const subject = "Reset Your Password — LabourSeva";
  const html = renderBaseEmailLayout({
    preheader: "Follow this link to reset your LabourSeva portal password.",
    badgeText: "Security",
    title: "Password Reset Request",
    contentHtml: `
      <p style="margin: 0 0 14px 0;">Dear <strong>${escapeHtml(data.name)}</strong>,</p>
      <p style="margin: 0 0 14px 0;">
        We received a request to reset the password for your LabourSeva account. Click the button below to set a new password.
      </p>
      <p style="margin: 0 0 14px 0; font-size: 13px; color: #64748b;">
        This single-use reset link is valid for <strong>${minutes} minutes</strong>. If you did not initiate this request, your account remains secure and you can safely disregard this email.
      </p>
    `,
    actionButton: {
      text: "Reset Password",
      url: data.resetUrl,
    },
    securityNotice: "Do not forward this email or share your reset link with anyone.",
  });

  const text = `Dear ${data.name},\n\nA password reset was requested for your LabourSeva account. Reset your password here:\n\n${data.resetUrl}\n\nValid for ${minutes} minutes.\n\nLabourSeva Digital Welfare Board`;
  return { subject, html, text };
}

// ---------------------------------------------------------------------------
// 7. Password Changed Security Notification
// ---------------------------------------------------------------------------
export function renderPasswordChangedEmail(data: {
  name: string;
  timestamp?: string;
  supportEmail?: string;
}): EmailRenderOutput {
  const timeStr = data.timestamp || new Date().toUTCString();
  const support = data.supportEmail || "support@labourseva.com";
  const subject = "Security Alert: Password Changed — LabourSeva";
  const html = renderBaseEmailLayout({
    preheader: "Your LabourSeva account password was recently changed.",
    badgeText: "Security Notice",
    title: "Your Password Was Changed Successfully",
    contentHtml: `
      <p style="margin: 0 0 14px 0;">Dear <strong>${escapeHtml(data.name)}</strong>,</p>
      <p style="margin: 0 0 14px 0;">
        This is a confirmation that the password for your LabourSeva account was successfully updated on <strong>${escapeHtml(timeStr)}</strong>.
      </p>
      <p style="margin: 0 0 14px 0; font-size: 13px; color: #64748b;">
        If you made this change, no further action is required. If you did NOT make this change, please contact our security team immediately at <a href="mailto:${escapeHtml(support)}" style="color: #2563eb;">${escapeHtml(support)}</a>.
      </p>
    `,
    securityNotice: "All prior active sessions have been invalidated as a security precaution.",
  });

  const text = `Dear ${data.name},\n\nYour LabourSeva password was successfully changed on ${timeStr}. If you did not make this change, contact ${support} immediately.\n\nLabourSeva Digital Welfare Board`;
  return { subject, html, text };
}

// ---------------------------------------------------------------------------
// 8. Document Service Payment Receipt Email
// ---------------------------------------------------------------------------
export function renderDocumentServicePaymentReceiptEmail(data: {
  name: string;
  serviceName: string;
  applicationRef: string;
  receiptNo: string;
  amount: number;
  paymentId: string;
  date: string;
  downloadUrl: string;
}): EmailRenderOutput {
  const subject = `Payment Receipt: ${data.receiptNo} — LabourSeva`;
  const html = renderBaseEmailLayout({
    preheader: `Payment confirmed for ${data.serviceName}. Receipt No: ${data.receiptNo}`,
    badgeText: "Payment Receipt",
    title: "Payment Confirmation & Receipt",
    contentHtml: `
      <p style="margin: 0 0 14px 0;">Dear <strong>${escapeHtml(data.name)}</strong>,</p>
      <p style="margin: 0 0 14px 0;">
        Thank you for your payment. Your statutory document service request has been registered successfully.
      </p>
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; margin: 16px 0; padding: 14px 18px;">
        <tr>
          <td style="font-size: 13px; color: #475569; padding: 5px 0;"><strong>Service:</strong></td>
          <td align="right" style="font-size: 13px; color: #0f172a; font-weight: 600;">${escapeHtml(data.serviceName)}</td>
        </tr>
        <tr>
          <td style="font-size: 13px; color: #475569; padding: 5px 0;"><strong>Application Ref:</strong></td>
          <td align="right" style="font-size: 13px; color: #0f172a; font-weight: 600;">${escapeHtml(data.applicationRef)}</td>
        </tr>
        <tr>
          <td style="font-size: 13px; color: #475569; padding: 5px 0;"><strong>Receipt Number:</strong></td>
          <td align="right" style="font-size: 13px; color: #0f172a; font-weight: 600;">${escapeHtml(data.receiptNo)}</td>
        </tr>
        <tr>
          <td style="font-size: 13px; color: #475569; padding: 5px 0;"><strong>Transaction ID:</strong></td>
          <td align="right" style="font-size: 12px; font-family: monospace; color: #334155;">${escapeHtml(data.paymentId)}</td>
        </tr>
        <tr>
          <td style="font-size: 13px; color: #475569; padding: 5px 0;"><strong>Date:</strong></td>
          <td align="right" style="font-size: 13px; color: #0f172a;">${escapeHtml(data.date)}</td>
        </tr>
        <tr style="border-top: 1px solid #cbd5e1;">
          <td style="font-size: 14px; font-weight: 700; color: #0f172a; padding: 8px 0 0 0;">Total Amount Paid:</td>
          <td align="right" style="font-size: 16px; font-weight: 800; color: #1e3a8a; padding: 8px 0 0 0;">₹${data.amount.toFixed(2)}</td>
        </tr>
      </table>
      <p style="margin: 0 0 14px 0; font-size: 13px; color: #475569;">
        Please download your blank statutory application template, fill in the required particulars, and upload the signed document in your dashboard to proceed.
      </p>
    `,
    actionButton: {
      text: "View Application & Download PDF",
      url: data.downloadUrl,
    },
    securityNotice: "Your official tax receipt PDF is also attached to this email and archived in your portal vault.",
  });

  const text = `Payment Receipt - LabourSeva\n\nDear ${data.name},\nPayment received for ${data.serviceName}.\nAmount: ₹${data.amount.toFixed(2)}\nReceipt No: ${data.receiptNo}\nApplication Ref: ${data.applicationRef}\nTransaction ID: ${data.paymentId}\n\nDownload details: ${data.downloadUrl}\n\nLabourSeva Digital Welfare Board`;
  return { subject, html, text };
}

// ---------------------------------------------------------------------------
// 9. E-Service Payment Receipt Email
// ---------------------------------------------------------------------------
export function renderEServicePaymentReceiptEmail(data: {
  name: string;
  serviceName: string;
  applicationRef: string;
  receiptNo: string;
  amount: number;
  paymentId: string;
  date: string;
  trackingUrl: string;
}): EmailRenderOutput {
  const subject = `E-Service Remittance Receipt: ${data.receiptNo} — LabourSeva`;
  const html = renderBaseEmailLayout({
    preheader: `Payment confirmed for E-Service: ${data.serviceName}. Ref: ${data.applicationRef}`,
    badgeText: "E-Service Payment",
    title: "E-Service Remittance Confirmation",
    contentHtml: `
      <p style="margin: 0 0 14px 0;">Dear <strong>${escapeHtml(data.name)}</strong>,</p>
      <p style="margin: 0 0 14px 0;">
        Your online submission and processing remittance for <strong>${escapeHtml(data.serviceName)}</strong> has been verified successfully.
      </p>
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; margin: 16px 0; padding: 14px 18px;">
        <tr>
          <td style="font-size: 13px; color: #475569; padding: 5px 0;"><strong>E-Service:</strong></td>
          <td align="right" style="font-size: 13px; color: #0f172a; font-weight: 600;">${escapeHtml(data.serviceName)}</td>
        </tr>
        <tr>
          <td style="font-size: 13px; color: #475569; padding: 5px 0;"><strong>Application No:</strong></td>
          <td align="right" style="font-size: 13px; color: #0f172a; font-weight: 600;">${escapeHtml(data.applicationRef)}</td>
        </tr>
        <tr>
          <td style="font-size: 13px; color: #475569; padding: 5px 0;"><strong>Receipt No:</strong></td>
          <td align="right" style="font-size: 13px; color: #0f172a; font-weight: 600;">${escapeHtml(data.receiptNo)}</td>
        </tr>
        <tr>
          <td style="font-size: 13px; color: #475569; padding: 5px 0;"><strong>Transaction ID:</strong></td>
          <td align="right" style="font-size: 12px; font-family: monospace; color: #334155;">${escapeHtml(data.paymentId)}</td>
        </tr>
        <tr style="border-top: 1px solid #cbd5e1;">
          <td style="font-size: 14px; font-weight: 700; color: #0f172a; padding: 8px 0 0 0;">Amount Remitted:</td>
          <td align="right" style="font-size: 16px; font-weight: 800; color: #1e3a8a; padding: 8px 0 0 0;">₹${data.amount.toFixed(2)}</td>
        </tr>
      </table>
      <p style="margin: 0 0 14px 0; font-size: 13px; color: #475569;">
        Your application is currently queued for scrutiny by the designated taluk/district welfare officer.
      </p>
    `,
    actionButton: {
      text: "Track Application Status",
      url: data.trackingUrl,
    },
    securityNotice: "Keep your application number safe for future tracking and correspondence.",
  });

  const text = `E-Service Payment Receipt - LabourSeva\n\nDear ${data.name},\nPayment confirmed for E-Service: ${data.serviceName}\nAmount: ₹${data.amount.toFixed(2)}\nApplication Ref: ${data.applicationRef}\nReceipt No: ${data.receiptNo}\n\nTrack status: ${data.trackingUrl}\n\nLabourSeva Digital Welfare Board`;
  return { subject, html, text };
}

// ---------------------------------------------------------------------------
// 10. Document Service Application Approved by Staff (NO OTP REQUEST!)
// ---------------------------------------------------------------------------
export function renderDocumentServiceApplicationApprovedEmail(data: {
  name: string;
  serviceName: string;
  applicationRef: string;
  approvedDate: string;
  downloadUrl: string;
}): EmailRenderOutput {
  const subject = `Your Document Service Application Has Been Approved — LabourSeva`;
  const html = renderBaseEmailLayout({
    preheader: `Your application for ${data.serviceName} has been officially approved.`,
    badgeText: "Application Approved",
    title: "Your Document Service Application Has Been Approved",
    contentHtml: `
      <p style="margin: 0 0 14px 0;">Dear <strong>${escapeHtml(data.name)}</strong>,</p>
      <p style="margin: 0 0 14px 0;">
        We are pleased to inform you that your application for <strong>${escapeHtml(data.serviceName)}</strong> (Ref: <strong>${escapeHtml(data.applicationRef)}</strong>) has been approved on <strong>${escapeHtml(data.approvedDate)}</strong>.
      </p>
      <p style="margin: 0 0 14px 0; font-size: 13px; color: #475569;">
        The scrutiny officer has verified all submitted declarations and supporting documents. The final signed certificate with digital seal is being generated and will be available in your portal vault shortly.
      </p>
    `,
    actionButton: {
      text: "View Application in Portal",
      url: data.downloadUrl,
    },
    securityNotice: "This approval is recorded on the official welfare ledger. No authentication challenge is required.",
  });

  const text = `Dear ${data.name},\n\nYour application for ${data.serviceName} (${data.applicationRef}) has been approved on ${data.approvedDate}.\n\nView details: ${data.downloadUrl}\n\nLabourSeva Digital Welfare Board`;
  return { subject, html, text };
}

// ---------------------------------------------------------------------------
// 11. E-Service Application Approved by Staff (NO OTP REQUEST!)
// ---------------------------------------------------------------------------
export function renderEServiceApplicationApprovedEmail(data: {
  name: string;
  serviceName: string;
  applicationRef: string;
  approvedDate: string;
  statusUrl: string;
}): EmailRenderOutput {
  const subject = `Your E-Service Application Has Been Approved — LabourSeva`;
  const html = renderBaseEmailLayout({
    preheader: `Your e-service application for ${data.serviceName} has been approved.`,
    badgeText: "E-Service Approved",
    title: "Your E-Service Application Has Been Approved",
    contentHtml: `
      <p style="margin: 0 0 14px 0;">Dear <strong>${escapeHtml(data.name)}</strong>,</p>
      <p style="margin: 0 0 14px 0;">
        Your e-service application for <strong>${escapeHtml(data.serviceName)}</strong> (Application No: <strong>${escapeHtml(data.applicationRef)}</strong>) has been reviewed and approved by the welfare board scrutiny desk on <strong>${escapeHtml(data.approvedDate)}</strong>.
      </p>
      <p style="margin: 0 0 14px 0; font-size: 13px; color: #475569;">
        You can review the approved record and any associated statutory endorsements directly in your citizen portal.
      </p>
    `,
    actionButton: {
      text: "View Approved E-Service",
      url: data.statusUrl,
    },
    securityNotice: "This approval is recorded on the official welfare ledger. No authentication challenge is required.",
  });

  const text = `Dear ${data.name},\n\nYour e-service application for ${data.serviceName} (${data.applicationRef}) has been approved on ${data.approvedDate}.\n\nView in portal: ${data.statusUrl}\n\nLabourSeva Digital Welfare Board`;
  return { subject, html, text };
}

// ---------------------------------------------------------------------------
// 12. Application Rejected with Reason
// ---------------------------------------------------------------------------
export function renderApplicationRejectedEmail(data: {
  name: string;
  serviceName: string;
  applicationRef: string;
  reason: string;
  supportUrl?: string;
}): EmailRenderOutput {
  const subject = `Application Status Update: ${data.applicationRef} — LabourSeva`;
  const html = renderBaseEmailLayout({
    preheader: `Update regarding your application for ${data.serviceName}.`,
    badgeText: "Application Rejected",
    title: "Application Decision Update",
    contentHtml: `
      <p style="margin: 0 0 14px 0;">Dear <strong>${escapeHtml(data.name)}</strong>,</p>
      <p style="margin: 0 0 14px 0;">
        Your application for <strong>${escapeHtml(data.serviceName)}</strong> (Ref: <strong>${escapeHtml(data.applicationRef)}</strong>) could not be approved following administrative scrutiny.
      </p>
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 0 6px 6px 0; margin: 16px 0;">
        <tr>
          <td style="padding: 12px 16px; font-size: 13px; color: #991b1b; line-height: 20px;">
            <strong>Decision Remarks:</strong> ${escapeHtml(data.reason)}
          </td>
        </tr>
      </table>
      <p style="margin: 0 0 14px 0; font-size: 13px; color: #475569;">
        If you wish to dispute this decision or submit an appeal, please file a ticket via the grievance portal.
      </p>
    `,
    actionButton: data.supportUrl
      ? {
          text: "Open Grievance Desk",
          url: data.supportUrl,
        }
      : undefined,
  });

  const text = `Dear ${data.name},\n\nYour application for ${data.serviceName} (${data.applicationRef}) was rejected.\nRemarks: ${data.reason}\n\nLabourSeva Digital Welfare Board`;
  return { subject, html, text };
}

// ---------------------------------------------------------------------------
// 13. Application Re-Upload / Corrections Requested
// ---------------------------------------------------------------------------
export function renderApplicationInfoRequestedEmail(data: {
  name: string;
  serviceName: string;
  applicationRef: string;
  instructions: string;
  resubmitUrl: string;
}): EmailRenderOutput {
  const subject = `Action Required: Document Corrections for ${data.applicationRef} — LabourSeva`;
  const html = renderBaseEmailLayout({
    preheader: `Document re-upload needed for ${data.serviceName}.`,
    badgeText: "Corrections Requested",
    title: "Document Re-Upload Required",
    contentHtml: `
      <p style="margin: 0 0 14px 0;">Dear <strong>${escapeHtml(data.name)}</strong>,</p>
      <p style="margin: 0 0 14px 0;">
        During the review of your application for <strong>${escapeHtml(data.serviceName)}</strong> (Ref: <strong>${escapeHtml(data.applicationRef)}</strong>), the scrutiny officer noted corrections are required:
      </p>
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #fff7ed; border-left: 4px solid #f97316; border-radius: 0 6px 6px 0; margin: 16px 0;">
        <tr>
          <td style="padding: 12px 16px; font-size: 13px; color: #9a3412; line-height: 20px;">
            <strong>Officer Instructions:</strong> ${escapeHtml(data.instructions)}
          </td>
        </tr>
      </table>
      <p style="margin: 0 0 14px 0; font-size: 13px; color: #475569;">
        Please upload the corrected document via your portal dashboard to resume processing.
      </p>
    `,
    actionButton: {
      text: "Re-Upload Document",
      url: data.resubmitUrl,
    },
  });

  const text = `Dear ${data.name},\n\nCorrections needed for application ${data.applicationRef} (${data.serviceName}):\n${data.instructions}\n\nUpload: ${data.resubmitUrl}\n\nLabourSeva Digital Welfare Board`;
  return { subject, html, text };
}

// ---------------------------------------------------------------------------
// 14. Signed Final Document Ready for Download
// ---------------------------------------------------------------------------
export function renderSignedDocumentReadyEmail(data: {
  name: string;
  serviceName: string;
  applicationRef: string;
  downloadUrl: string;
}): EmailRenderOutput {
  const subject = `Your Signed Certificate Is Ready for Download: ${data.applicationRef} — LabourSeva`;
  const html = renderBaseEmailLayout({
    preheader: `Your digitally signed certificate for ${data.serviceName} is now ready to download.`,
    badgeText: "Certificate Issued",
    title: "Your Digitally Signed Certificate Is Ready",
    contentHtml: `
      <p style="margin: 0 0 14px 0;">Dear <strong>${escapeHtml(data.name)}</strong>,</p>
      <p style="margin: 0 0 14px 0;">
        The official signed certificate for <strong>${escapeHtml(data.serviceName)}</strong> (Ref: <strong>${escapeHtml(data.applicationRef)}</strong>) has been generated with authorized district seals and digital signatures.
      </p>
      <p style="margin: 0 0 14px 0; font-size: 13px; color: #475569;">
        You can now download the verified statutory PDF directly from your secured portal vault.
      </p>
    `,
    actionButton: {
      text: "Download Signed Certificate",
      url: data.downloadUrl,
    },
    securityNotice: "This document contains an anti-tamper QR code and digital verification hash.",
  });

  const text = `Dear ${data.name},\n\nYour signed certificate for ${data.serviceName} (${data.applicationRef}) is ready for download:\n\n${data.downloadUrl}\n\nLabourSeva Digital Welfare Board`;
  return { subject, html, text };
}

// ---------------------------------------------------------------------------
// 15. Refund Completed
// ---------------------------------------------------------------------------
export function renderRefundCompletedEmail(data: {
  name: string;
  serviceName: string;
  applicationRef: string;
  amount: number;
  refundId: string;
}): EmailRenderOutput {
  const subject = `Refund Processed: ₹${data.amount.toFixed(2)} — LabourSeva`;
  const html = renderBaseEmailLayout({
    preheader: `Refund completed for application ${data.applicationRef}.`,
    badgeText: "Refund Completed",
    title: "Refund Processed Successfully",
    contentHtml: `
      <p style="margin: 0 0 14px 0;">Dear <strong>${escapeHtml(data.name)}</strong>,</p>
      <p style="margin: 0 0 14px 0;">
        A refund of <strong>₹${data.amount.toFixed(2)}</strong> has been processed for your transaction related to <strong>${escapeHtml(data.serviceName)}</strong> (Ref: <strong>${escapeHtml(data.applicationRef)}</strong>).
      </p>
      <p style="margin: 0 0 14px 0; font-size: 13px; color: #475569;">
        <strong>Refund Reference ID:</strong> <span style="font-family: monospace;">${escapeHtml(data.refundId)}</span><br/>
        Depending on your banking provider, the funds should reflect in your source account within 5-7 business days.
      </p>
    `,
  });

  const text = `Dear ${data.name},\n\nRefund of ₹${data.amount.toFixed(2)} processed for ${data.serviceName} (${data.applicationRef}).\nRefund ID: ${data.refundId}\n\nLabourSeva Digital Welfare Board`;
  return { subject, html, text };
}

// ---------------------------------------------------------------------------
// 16. Retailer Wallet Topup Success Email
// ---------------------------------------------------------------------------
export function renderRetailerWalletTopupSuccessEmail(data: {
  name: string;
  shopName?: string;
  registrationNo?: string;
  receiptNo: string;
  amount: number;
  newBalance: number;
  paymentId: string;
  orderId?: string;
  date: string;
  walletUrl: string;
}): EmailRenderOutput {
  const subject = `Payment Successful: ₹${data.amount.toFixed(2)} Credited to Kendra Wallet — LabourSeva`;
  const html = renderBaseEmailLayout({
    preheader: `Payment confirmed. ₹${data.amount.toFixed(2)} credited to your Kendra wallet. Receipt No: ${data.receiptNo}`,
    badgeText: "Wallet Credit Confirmed",
    title: "Kendra Wallet Top-Up Successful",
    contentHtml: `
      <p style="margin: 0 0 14px 0;">Dear <strong>${escapeHtml(data.name || data.shopName || "Kendra Operator")}</strong>,</p>
      <p style="margin: 0 0 14px 0;">
        Your prepaid Kendra wallet top-up has been verified and processed successfully. Your account balance has been updated immediately.
      </p>
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; margin: 16px 0; padding: 14px 18px;">
        <tr>
          <td style="font-size: 13px; color: #475569; padding: 5px 0;"><strong>Beneficiary Counter:</strong></td>
          <td align="right" style="font-size: 13px; color: #0f172a; font-weight: 600;">${escapeHtml(data.shopName || data.name)}</td>
        </tr>
        <tr>
          <td style="font-size: 13px; color: #475569; padding: 5px 0;"><strong>Kendra Reg No:</strong></td>
          <td align="right" style="font-size: 12px; font-family: monospace; color: #1e3a8a; font-weight: 700;">${escapeHtml(data.registrationNo || "RET-KENDRA")}</td>
        </tr>
        <tr>
          <td style="font-size: 13px; color: #475569; padding: 5px 0;"><strong>Receipt Number:</strong></td>
          <td align="right" style="font-size: 13px; color: #0f172a; font-weight: 600;">${escapeHtml(data.receiptNo)}</td>
        </tr>
        <tr>
          <td style="font-size: 13px; color: #475569; padding: 5px 0;"><strong>Payment ID:</strong></td>
          <td align="right" style="font-size: 12px; font-family: monospace; color: #334155;">${escapeHtml(data.paymentId)}</td>
        </tr>
        ${data.orderId ? `<tr>
          <td style="font-size: 13px; color: #475569; padding: 5px 0;"><strong>Order Reference:</strong></td>
          <td align="right" style="font-size: 12px; font-family: monospace; color: #64748b;">${escapeHtml(data.orderId)}</td>
        </tr>` : ""}
        <tr>
          <td style="font-size: 13px; color: #475569; padding: 5px 0;"><strong>Date & Time:</strong></td>
          <td align="right" style="font-size: 13px; color: #0f172a;">${escapeHtml(data.date)}</td>
        </tr>
        <tr style="border-top: 1px solid #cbd5e1;">
          <td style="font-size: 14px; font-weight: 700; color: #0f172a; padding: 8px 0 0 0;">Credited Amount:</td>
          <td align="right" style="font-size: 16px; font-weight: 800; color: #059669; padding: 8px 0 0 0;">+₹${data.amount.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="font-size: 14px; font-weight: 700; color: #0f172a; padding: 6px 0 0 0;">New Wallet Balance:</td>
          <td align="right" style="font-size: 16px; font-weight: 800; color: #1e3a8a; padding: 6px 0 0 0;">₹${data.newBalance.toFixed(2)}</td>
        </tr>
      </table>
      <p style="margin: 0 0 14px 0; font-size: 13px; color: #475569;">
        The official computer-generated PDF tax receipt for this recharge is attached to this email and can also be downloaded anytime from your Historical Transaction Ledger.
      </p>
    `,
    actionButton: {
      text: "View Historical Transaction Ledger",
      url: data.walletUrl,
    },
    securityNotice: "Your PDF payment receipt is attached to this email. You can retain it for counter audits and taxation records.",
  });

  const text = `Payment Successful - LabourSeva Kendra Wallet\n\nDear ${data.name || "Kendra Operator"},\nYour wallet recharge of ₹${data.amount.toFixed(2)} is successful.\nNew Balance: ₹${data.newBalance.toFixed(2)}\nReceipt No: ${data.receiptNo}\nPayment ID: ${data.paymentId}\n\nView ledger: ${data.walletUrl}\n\nLabourSeva Digital Welfare Portal`;
  return { subject, html, text };
}

// ---------------------------------------------------------------------------
// 17. Retailer Wallet Topup Pending Email
// ---------------------------------------------------------------------------
export function renderRetailerWalletTopupPendingEmail(data: {
  name: string;
  shopName?: string;
  registrationNo?: string;
  orderId: string;
  amount: number;
  date: string;
  walletUrl: string;
}): EmailRenderOutput {
  const subject = `Top-Up Request Initiated: ₹${data.amount.toFixed(2)} (Pending Verification) — LabourSeva`;
  const html = renderBaseEmailLayout({
    preheader: `Top-up order ${data.orderId} of ₹${data.amount.toFixed(2)} initiated for Kendra wallet.`,
    badgeText: "Payment Pending",
    title: "Wallet Top-Up Request Initiated",
    contentHtml: `
      <p style="margin: 0 0 14px 0;">Dear <strong>${escapeHtml(data.name || data.shopName || "Kendra Operator")}</strong>,</p>
      <p style="margin: 0 0 14px 0;">
        We have received an online wallet top-up request of <strong>₹${data.amount.toFixed(2)}</strong> for your Kendra balance.
      </p>
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 6px; margin: 16px 0; padding: 14px 18px;">
        <tr>
          <td style="font-size: 13px; color: #92400e; padding: 5px 0;"><strong>Kendra Registration:</strong></td>
          <td align="right" style="font-size: 13px; color: #78350f; font-weight: 700;">${escapeHtml(data.registrationNo || "RET-KENDRA")}</td>
        </tr>
        <tr>
          <td style="font-size: 13px; color: #92400e; padding: 5px 0;"><strong>Order Reference:</strong></td>
          <td align="right" style="font-size: 12px; font-family: monospace; color: #78350f;">${escapeHtml(data.orderId)}</td>
        </tr>
        <tr>
          <td style="font-size: 13px; color: #92400e; padding: 5px 0;"><strong>Requested Amount:</strong></td>
          <td align="right" style="font-size: 15px; font-weight: 800; color: #b45309;">₹${data.amount.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="font-size: 13px; color: #92400e; padding: 5px 0;"><strong>Status:</strong></td>
          <td align="right" style="font-size: 12px; font-weight: 700; color: #d97706;">PENDING PAYMENT VERIFICATION</td>
        </tr>
        <tr>
          <td style="font-size: 13px; color: #92400e; padding: 5px 0;"><strong>Initiated At:</strong></td>
          <td align="right" style="font-size: 13px; color: #78350f;">${escapeHtml(data.date)}</td>
        </tr>
      </table>
      <p style="margin: 0 0 14px 0; font-size: 13px; color: #475569;">
        If you are completing payment via UPI, NetBanking, or QR code, your wallet will be credited automatically within a few moments of bank confirmation. Once verified, you will receive your official downloadable PDF payment receipt.
      </p>
    `,
    actionButton: {
      text: "Go to Kendra Wallet Desk",
      url: data.walletUrl,
    },
    securityNotice: "Never share OTP or banking credentials. LabourSeva operators will never ask for PIN or account passwords.",
  });

  const text = `Top-Up Request Initiated - LabourSeva\n\nDear ${data.name || "Kendra Operator"},\nA wallet top-up request of ₹${data.amount.toFixed(2)} (Order: ${data.orderId}) is currently pending payment confirmation.\n\nCheck status: ${data.walletUrl}\n\nLabourSeva Digital Welfare Board`;
  return { subject, html, text };
}

// ---------------------------------------------------------------------------
// 18. Retailer Wallet Topup Failure Email
// ---------------------------------------------------------------------------
export function renderRetailerWalletTopupFailureEmail(data: {
  name: string;
  shopName?: string;
  registrationNo?: string;
  orderId?: string;
  paymentId?: string;
  amount: number;
  reason: string;
  errorCode?: string;
  date: string;
  retryUrl: string;
}): EmailRenderOutput {
  const subject = `Payment Not Successful: Kendra Wallet Top-Up (₹${data.amount.toFixed(2)}) — LabourSeva`;
  const html = renderBaseEmailLayout({
    preheader: `Your Kendra wallet top-up of ₹${data.amount.toFixed(2)} could not be completed.`,
    badgeText: "Payment Not Successful",
    title: "Wallet Top-Up Payment Declined / Incomplete",
    contentHtml: `
      <p style="margin: 0 0 14px 0;">Dear <strong>${escapeHtml(data.name || data.shopName || "Kendra Operator")}</strong>,</p>
      <p style="margin: 0 0 14px 0;">
        We noticed that your recent prepaid Kendra wallet top-up payment could not be completed successfully. No amount has been credited to your wallet balance.
      </p>
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 6px; margin: 16px 0; padding: 14px 18px;">
        <tr>
          <td style="font-size: 13px; color: #991b1b; padding: 5px 0;"><strong>Kendra Registration:</strong></td>
          <td align="right" style="font-size: 13px; color: #7f1d1d; font-weight: 700;">${escapeHtml(data.registrationNo || "RET-KENDRA")}</td>
        </tr>
        <tr>
          <td style="font-size: 13px; color: #991b1b; padding: 5px 0;"><strong>Attempted Amount:</strong></td>
          <td align="right" style="font-size: 15px; font-weight: 800; color: #b91c1c;">₹${data.amount.toFixed(2)}</td>
        </tr>
        ${data.orderId ? `<tr>
          <td style="font-size: 13px; color: #991b1b; padding: 5px 0;"><strong>Order ID:</strong></td>
          <td align="right" style="font-size: 12px; font-family: monospace; color: #7f1d1d;">${escapeHtml(data.orderId)}</td>
        </tr>` : ""}
        ${data.paymentId ? `<tr>
          <td style="font-size: 13px; color: #991b1b; padding: 5px 0;"><strong>Payment Attempt ID:</strong></td>
          <td align="right" style="font-size: 12px; font-family: monospace; color: #7f1d1d;">${escapeHtml(data.paymentId)}</td>
        </tr>` : ""}
        <tr>
          <td style="font-size: 13px; color: #991b1b; padding: 5px 0;"><strong>Reason:</strong></td>
          <td align="right" style="font-size: 13px; color: #991b1b; font-weight: 600;">${escapeHtml(data.reason || "Transaction declined by gateway or banking network.")}</td>
        </tr>
        <tr>
          <td style="font-size: 13px; color: #991b1b; padding: 5px 0;"><strong>Timestamp:</strong></td>
          <td align="right" style="font-size: 13px; color: #7f1d1d;">${escapeHtml(data.date)}</td>
        </tr>
      </table>
      <div style="background-color: #fff7ed; border-left: 4px solid #ea580c; padding: 12px 14px; border-radius: 0 6px 6px 0; margin: 16px 0; font-size: 12px; color: #9a3412;">
        <strong>Bank Deduction Advisory:</strong> If money was debited from your bank account or UPI app during this attempt, the amount will be automatically reversed to your source account by your bank within 3 to 5 business days according to RBI settlement norms.
      </div>
      <p style="margin: 0 0 14px 0; font-size: 13px; color: #475569;">
        You can retry the top-up at your convenience using any supported payment method including UPI QR, Google Pay, PhonePe, Paytm, or NetBanking.
      </p>
    `,
    actionButton: {
      text: "Retry Wallet Top-Up",
      url: data.retryUrl,
    },
    securityNotice: "For payment assistance, please quote your Order ID to our helpline or write to support@labourseva.com.",
  });

  const text = `Payment Not Successful - LabourSeva Kendra\n\nDear ${data.name || "Kendra Operator"},\nYour wallet top-up of ₹${data.amount.toFixed(2)} could not be processed.\nReason: ${data.reason}\nOrder: ${data.orderId || "N/A"}\n\nRetry top-up: ${data.retryUrl}\n\nLabourSeva Digital Welfare Portal`;
  return { subject, html, text };
}
