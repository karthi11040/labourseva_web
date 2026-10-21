/**
 * LabourSeva Email Service
 * Powered by Nodemailer with Gmail SMTP / Custom Mailer
 */
import nodemailer, { type Transporter } from "nodemailer";

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
}

let cachedTransporter: Transporter | null = null;

export function getEmailTransporter(): Transporter | null {
  const user = process.env.EMAIL_SMTP_USER?.trim();
  const pass = process.env.EMAIL_SMTP_PASS?.trim();
  const host = process.env.EMAIL_SMTP_HOST?.trim() || "smtp.gmail.com";
  const port = parseInt(process.env.EMAIL_SMTP_PORT || "587", 10);
  const secure = process.env.EMAIL_SMTP_SECURE === "true" || port === 465;

  if (!user || !pass) {
    return null;
  }

  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  return cachedTransporter;
}

/**
 * Sends an email using the configured SMTP server
 */
export async function sendEmail(
  opts: EmailOptions
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const transporter = getEmailTransporter();
    if (!transporter) {
      return { success: false, error: "Email SMTP credentials are not configured in environment (EMAIL_SMTP_USER / EMAIL_SMTP_PASS)." };
    }

    const fromName = process.env.EMAIL_FROM_NAME?.trim() || "LabourSeva";
    const fromAddress = opts.from || process.env.EMAIL_FROM?.trim() || process.env.EMAIL_SMTP_USER?.trim() || "c2bs.in@gmail.com";
    const replyTo = opts.replyTo || process.env.EMAIL_REPLY_TO?.trim() || fromAddress;

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: opts.to,
      replyTo,
      subject: opts.subject,
      text: opts.text || opts.html.replace(/<[^>]+>/g, ""),
      html: opts.html,
      attachments: opts.attachments,
    });

    console.log(`[Email Sent] MessageId: ${info.messageId} To: ${opts.to}`);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error(`[Email Send Error] To: ${opts.to}:`, err?.message || err);
    return { success: false, error: err?.message || "Failed to send email." };
  }
}

/**
 * Sends a high-security branded OTP verification email
 */
export async function sendOtpEmail(
  to: string,
  otp: string,
  purpose: string = "Citizen Portal Login"
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const subject = `${otp} is your LabourSeva Verification Code`;
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>LabourSeva Verification</title>
      <style>
        body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; }
        .wrapper { width: 100%; max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .header { background: #1e3a8a; padding: 24px 32px; border-bottom: 4px solid #ea580c; text-align: left; }
        .header h1 { margin: 0; font-size: 20px; color: #ffffff; font-weight: 800; letter-spacing: 0.5px; }
        .header p { margin: 4px 0 0; font-size: 11px; color: #fdba74; text-transform: uppercase; font-weight: 700; }
        .content { padding: 32px; }
        .greeting { font-size: 16px; font-weight: 600; color: #0f172a; margin-bottom: 12px; }
        .message { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
        .otp-box { background: #eff6ff; border: 2px dashed #3b82f6; border-radius: 10px; padding: 20px; text-align: center; margin: 24px 0; }
        .otp-code { font-size: 36px; font-weight: 800; color: #1e3a8a; letter-spacing: 8px; font-family: 'Courier New', Courier, monospace; }
        .otp-expiry { font-size: 12px; color: #64748b; margin-top: 8px; font-weight: 500; }
        .notice { background: #fff7ed; border-left: 4px solid #ea580c; padding: 12px 16px; border-radius: 0 8px 8px 0; font-size: 12px; color: #9a3412; margin-bottom: 24px; line-height: 1.5; }
        .footer { background: #f1f5f9; padding: 20px 32px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; }
        .footer a { color: #1e3a8a; text-decoration: none; font-weight: 600; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="header">
          <h1>LabourSeva</h1>
          <p>Tamil Nadu Labour Welfare Portal</p>
        </div>
        <div class="content">
          <div class="greeting">Vanakkam / Dear Beneficiary,</div>
          <div class="message">
            You recently requested a one-time verification code for <strong>${purpose}</strong> on the LabourSeva portal. Use the code below to complete your authentication.
          </div>
          <div class="otp-box">
            <div class="otp-code">${otp}</div>
            <div class="otp-expiry">Valid for 30 minutes. Do not share this OTP with anyone.</div>
          </div>
          <div class="notice">
            <strong>Security Advisory:</strong> Labour Department officials will never ask for your password, PIN, or OTP over the phone or email. If you did not initiate this request, please contact our help desk immediately.
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} LabourSeva Digital Services. All rights reserved.<br>
          For assistance, contact <a href="mailto:support@labourseva.com">support@labourseva.com</a> or call 044-24335111.
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    subject,
    html,
  });
}

/**
 * Validates connection to the configured SMTP server
 */
export async function verifyEmailConnection(): Promise<{ success: boolean; error?: string }> {
  const transporter = getEmailTransporter();
  if (!transporter) {
    return { success: false, error: "Email transporter not initialized (missing environment variables)." };
  }

  try {
    await transporter.verify();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to verify SMTP connection." };
  }
}
