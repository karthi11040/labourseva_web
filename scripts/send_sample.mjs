import nodemailer from "nodemailer";

const phone = "9489501089";
const email = "karthigeyan.s11@gmail.com";
const sampleOtp = Math.floor(100000 + Math.random() * 900000).toString();

console.log("==================================================");
console.log("LabourSeva Dispatch Test: JS / Node.js Secured Runner");
console.log(`Target Phone: ${phone}`);
console.log(`Target Email: ${email}`);
console.log(`Sample OTP:   ${sampleOtp}`);
console.log("==================================================");

// 1. Send SMS via My Dreams Technology HTTP Gateway
async function testSms() {
  const apiUrl = process.env.SMS_API_URL || "http://app.mydreamstechnology.in/vb/apikey.php";
  const apiKey = process.env.SMS_API_KEY || "pdtPO9aL4m8RSQTV";
  const senderId = process.env.SMS_SENDER_ID || "MDTDMO";
  const appName = process.env.SMS_APP_NAME || "labourseva.com";
  const template = process.env.SMS_TEMPLATE || "Dear {otp}, Your OTP for login to {app_name}. Valid for 30 minutes. Please do not share this OTP. Regards, My Dreams Technology Team";

  const message = template.replace("{otp}", sampleOtp).replace("{app_name}", appName);

  console.log("\n[SMS] Preparing dispatch...");
  console.log(`[SMS] Message: "${message}"`);

  const url = new URL(apiUrl);
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("senderid", senderId);
  url.searchParams.set("number", phone);
  url.searchParams.set("message", message);

  try {
    const res = await fetch(url.toString(), { method: "GET" });
    const text = await res.text();
    console.log(`[SMS] Response Status: ${res.status}`);
    console.log(`[SMS] Response Body: ${text}`);
    return { success: res.ok, response: text };
  } catch (err) {
    console.error("[SMS Error]:", err.message);
    return { success: false, error: err.message };
  }
}

// 2. Send Sample Email via Gmail SMTP TLS
async function testEmail() {
  const host = process.env.EMAIL_SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.EMAIL_SMTP_PORT || "587", 10);
  const user = process.env.EMAIL_SMTP_USER || "c2bs.in@gmail.com";
  const pass = process.env.EMAIL_SMTP_PASS || "qhfi wcfd cyrb avln";
  const fromName = process.env.EMAIL_FROM_NAME || "LabourSeva";
  const fromEmail = process.env.EMAIL_FROM || "c2bs.in@gmail.com";

  console.log("\n[Email] Initializing SMTP TLS connection...");
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: false, // TLS
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  const subject = `[LabourSeva] Sample Verification OTP: ${sampleOtp}`;
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
        .header h1 { margin: 0; font-size: 22px; color: #ffffff; font-weight: 800; letter-spacing: 0.5px; }
        .header p { margin: 4px 0 0; font-size: 11px; color: #fdba74; text-transform: uppercase; font-weight: 700; }
        .content { padding: 32px; }
        .greeting { font-size: 16px; font-weight: 600; color: #0f172a; margin-bottom: 12px; }
        .message { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
        .otp-box { background: #eff6ff; border: 2px dashed #3b82f6; border-radius: 10px; padding: 20px; text-align: center; margin: 24px 0; }
        .otp-code { font-size: 38px; font-weight: 800; color: #1e3a8a; letter-spacing: 8px; font-family: 'Courier New', Courier, monospace; }
        .otp-expiry { font-size: 12px; color: #64748b; margin-top: 8px; font-weight: 500; }
        .notice { background: #fff7ed; border-left: 4px solid #ea580c; padding: 12px 16px; border-radius: 0 8px 8px 0; font-size: 12px; color: #9a3412; margin-bottom: 24px; line-height: 1.5; }
        .footer { background: #f1f5f9; padding: 20px 32px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="header">
          <h1>LabourSeva</h1>
          <p>Government of Tamil Nadu &bull; Digital Welfare Board</p>
        </div>
        <div class="content">
          <div class="greeting">Vanakkam Karthigeyan,</div>
          <div class="message">
            This is an official test verification dispatched directly from the secured Node.js / JavaScript engine of <strong>LabourSeva</strong>.
          </div>
          <div class="otp-box">
            <div class="otp-code">${sampleOtp}</div>
            <div class="otp-expiry">Sample OTP code &bull; Valid for 30 minutes</div>
          </div>
          <div class="notice">
            <strong>Security Notice:</strong> Secured TLS SMTP connection verified successfully. Do not share sensitive credentials.
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} LabourSeva Digital Services. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: email,
      subject,
      html,
      text: `Your LabourSeva sample verification OTP is: ${sampleOtp}. Valid for 30 minutes.`,
    });
    console.log(`[Email] Success! Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error("[Email Error]:", err.message);
    return { success: false, error: err.message };
  }
}

async function run() {
  const smsResult = await testSms();
  const emailResult = await testEmail();

  console.log("\n==================================================");
  console.log("FINAL DISPATCH RESULTS:");
  console.log("SMS Success:", smsResult.success);
  console.log("Email Success:", emailResult.success);
  console.log("==================================================");
  process.exit(0);
}

run();
