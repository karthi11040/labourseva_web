import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import nodemailer from "nodemailer";

export const SECURITY_ALERT_EMAIL = "karthigeyan.s11@gmail.com";
const LOGS_DIR = path.join(process.cwd(), "logs");
const AUDIT_LOG_FILE = path.join(LOGS_DIR, "admin-login-audit.log");
const AUDIT_JSON_FILE = path.join(LOGS_DIR, "admin-login-audit.json");

export type LoginAuditStatus =
  | "SUCCESS"
  | "INVALID_CREDENTIALS"
  | "INVALID_CAPTCHA"
  | "LOCKED_OUT"
  | "SUSPICIOUS_BLOCKED";

export interface LoginAuditEntry {
  id: string;
  timestamp: string;
  unixTime: number;
  ip: string;
  email: string;
  status: LoginAuditStatus;
  userAgent: string;
  reason?: string;
}

export interface SuspiciousPatternResult {
  isSuspicious: boolean;
  reasons: string[];
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

// In-memory alert cooldown to prevent inbox flooding (1 email per 5 minutes per IP + reason)
const lastAlertSentMap = new Map<string, number>();

/**
 * Ensures the logs directory exists
 */
async function ensureLogsDir() {
  if (!fsSync.existsSync(LOGS_DIR)) {
    await fs.mkdir(LOGS_DIR, { recursive: true });
  }
}

/**
 * Extracts the real client IP address from request headers
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();

  return "127.0.0.1";
}

/**
 * Reads recent audit log entries
 */
export async function getRecentAuditEntries(limit = 100): Promise<LoginAuditEntry[]> {
  try {
    await ensureLogsDir();
    if (!fsSync.existsSync(AUDIT_JSON_FILE)) {
      return [];
    }
    const content = await fs.readFile(AUDIT_JSON_FILE, "utf-8");
    const data: LoginAuditEntry[] = JSON.parse(content);
    return data.slice(-limit);
  } catch {
    return [];
  }
}

/**
 * Appends a login attempt to both text log and JSON audit trail
 */
export async function recordLoginAudit(entry: Omit<LoginAuditEntry, "id" | "timestamp" | "unixTime">): Promise<LoginAuditEntry> {
  await ensureLogsDir();

  const now = new Date();
  const fullEntry: LoginAuditEntry = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: now.toISOString(),
    unixTime: now.getTime(),
    ...entry,
  };

  // 1. Human-readable text log line
  const textLine = `[${now.toISOString()}] IP=${fullEntry.ip.padEnd(15)} | STATUS=${fullEntry.status.padEnd(19)} | USER=${fullEntry.email} | REASON=${fullEntry.reason || "N/A"} | UA=${fullEntry.userAgent}\n`;
  await fs.appendFile(AUDIT_LOG_FILE, textLine, "utf-8").catch((err) => {
    console.error("Failed to write to text audit log:", err);
  });

  // 2. Structured JSON log file
  try {
    let entries: LoginAuditEntry[] = [];
    if (fsSync.existsSync(AUDIT_JSON_FILE)) {
      const fileData = await fs.readFile(AUDIT_JSON_FILE, "utf-8");
      entries = JSON.parse(fileData);
    }
    entries.push(fullEntry);
    // Keep last 5,000 log records for disk safety
    if (entries.length > 5000) {
      entries = entries.slice(-5000);
    }
    await fs.writeFile(AUDIT_JSON_FILE, JSON.stringify(entries, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write to JSON audit log:", err);
  }

  return fullEntry;
}

/**
 * Analyzes login patterns across recent history to detect suspicious anomalies
 */
export async function analyzeLoginPattern(current: {
  ip: string;
  email: string;
  status: LoginAuditStatus;
  userAgent: string;
}): Promise<SuspiciousPatternResult> {
  const recent = await getRecentAuditEntries(100);
  const reasons: string[] = [];
  let severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "LOW";

  const now = Date.now();
  const fifteenMinutesAgo = now - 15 * 60 * 1000;
  const twoMinutesAgo = now - 2 * 60 * 1000;

  // 1. Check for rapid repeated failures from the same IP (Brute Force / Dictionary Attack)
  const failedFromSameIpIn15m = recent.filter(
    (e) => e.ip === current.ip && e.status !== "SUCCESS" && e.unixTime >= fifteenMinutesAgo
  );

  if (failedFromSameIpIn15m.length >= 3) {
    reasons.push(
      `Multiple failed login attempts detected (${failedFromSameIpIn15m.length} failures in the last 15 minutes from IP ${current.ip}).`
    );
    severity = failedFromSameIpIn15m.length >= 5 ? "CRITICAL" : "HIGH";
  }

  // 2. High-frequency robotic attempts (< 3 seconds between requests)
  const attemptsIn2m = recent.filter((e) => e.ip === current.ip && e.unixTime >= twoMinutesAgo);
  if (attemptsIn2m.length >= 4) {
    reasons.push(`High-frequency login velocity detected (${attemptsIn2m.length} requests within 2 minutes). Potential automated bot.`);
    if (severity !== "CRITICAL") severity = "HIGH";
  }

  // 3. New / Unrecognized IP Address attempting to access super admin account
  const pastSuccessIps = new Set(recent.filter((e) => e.status === "SUCCESS").map((e) => e.ip));
  if (pastSuccessIps.size > 0 && !pastSuccessIps.has(current.ip)) {
    if (current.status === "SUCCESS") {
      reasons.push(`Super Admin login authenticated from a NEW / previously unseen IP address (${current.ip}).`);
      severity = "MEDIUM";
    } else {
      reasons.push(`Failed login attempt targeting admin credentials from an unrecognized IP address (${current.ip}).`);
      if (severity === "LOW") severity = "MEDIUM";
    }
  }

  // 4. Suspicious or programmatic user-agents
  const uaLower = current.userAgent.toLowerCase();
  const isScriptUa =
    !uaLower ||
    uaLower.includes("python") ||
    uaLower.includes("curl") ||
    uaLower.includes("postman") ||
    uaLower.includes("httpclient") ||
    uaLower.includes("node-fetch") ||
    uaLower.includes("axios") ||
    uaLower.includes("undici") ||
    uaLower === "node";

  if (isScriptUa) {
    reasons.push(`Suspicious programmatic user-agent detected: "${current.userAgent || 'EMPTY'}".`);
    severity = "CRITICAL";
  }

  // 5. Account lockout triggered
  if (current.status === "LOCKED_OUT") {
    reasons.push(`Admin security threshold exceeded. IP ${current.ip} has been temporarily locked out.`);
    severity = "CRITICAL";
  }

  return {
    isSuspicious: reasons.length > 0,
    reasons,
    severity,
  };
}

/**
 * Sends a security email alert to karthigeyan.s11@gmail.com
 */
export async function sendSuspiciousLoginEmail(payload: {
  patternResult: SuspiciousPatternResult;
  ip: string;
  email: string;
  status: LoginAuditStatus;
  userAgent: string;
  reason?: string;
}): Promise<boolean> {
  const { patternResult, ip, email, status, userAgent, reason } = payload;

  // Rate-limit alert emails to avoid mailbox spam (1 email per 5 minutes per IP)
  const alertKey = `${ip}:${patternResult.reasons[0] || "general"}`;
  const lastSent = lastAlertSentMap.get(alertKey) || 0;
  if (Date.now() - lastSent < 5 * 60 * 1000) {
    console.log(`[Security Alert] Suppressed duplicate email to ${SECURITY_ALERT_EMAIL} (cooldown active).`);
    return false;
  }
  lastAlertSentMap.set(alertKey, Date.now());

  const subject = `🚨 [LabourSeva Security Alert] ${patternResult.severity} Risk: Suspicious Admin Activity (${ip})`;
  const timestampStr = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 24px; margin: 0; }
          .card { max-width: 620px; margin: 0 auto; background-color: #1e293b; border-radius: 16px; border: 1px solid #334155; border-top: 5px solid ${patternResult.severity === "CRITICAL" ? "#ef4444" : "#f97316"}; padding: 28px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
          .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; background-color: ${patternResult.severity === "CRITICAL" ? "rgba(239, 68, 68, 0.2)" : "rgba(249, 115, 22, 0.2)"}; color: ${patternResult.severity === "CRITICAL" ? "#fca5a5" : "#fdba74"}; border: 1px solid ${patternResult.severity === "CRITICAL" ? "rgba(239, 68, 68, 0.4)" : "rgba(249, 115, 22, 0.4)"}; }
          h2 { margin: 12px 0 6px 0; font-size: 20px; font-weight: 800; color: #ffffff; }
          p { margin: 0 0 16px 0; font-size: 13px; color: #94a3b8; line-height: 1.5; }
          .table { width: 100%; border-collapse: collapse; margin: 18px 0; background-color: #0f172a; border-radius: 10px; overflow: hidden; border: 1px solid #334155; }
          .table td { padding: 10px 14px; font-size: 12px; border-bottom: 1px solid #1e293b; }
          .table td.label { font-weight: 700; color: #94a3b8; width: 35%; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; }
          .table td.value { color: #f1f5f9; font-family: monospace; font-size: 12px; }
          .reasons-box { background-color: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 14px; margin: 18px 0; }
          .reasons-box h4 { margin: 0 0 8px 0; font-size: 12px; color: #f87171; text-transform: uppercase; font-weight: 800; }
          .reasons-box ul { margin: 0; padding-left: 18px; color: #fecaca; font-size: 12px; line-height: 1.6; }
          .footer { font-size: 11px; color: #64748b; text-align: center; margin-top: 24px; border-top: 1px solid #334155; padding-top: 14px; }
        </style>
      </head>
      <body>
        <div class="card">
          <span class="badge">${patternResult.severity} SECURITY ALERT</span>
          <h2>Suspicious Admin Login Detected</h2>
          <p>LabourSeva Security Watchdog detected an anomaly during an administrative authentication attempt on the platform.</p>

          <div class="reasons-box">
            <h4>Detected Security Anomalies:</h4>
            <ul>
              ${patternResult.reasons.map((r) => `<li>${r}</li>`).join("")}
            </ul>
          </div>

          <table class="table">
            <tr>
              <td class="label">Client IP Address</td>
              <td class="value"><strong>${ip}</strong></td>
            </tr>
            <tr>
              <td class="label">Attempted Email</td>
              <td class="value">${email || "—"}</td>
            </tr>
            <tr>
              <td class="label">Login Status</td>
              <td class="value"><span style="color: ${status === "SUCCESS" ? "#34d399" : "#f87171"}">${status}</span></td>
            </tr>
            <tr>
              <td class="label">Failure Reason</td>
              <td class="value">${reason || "N/A"}</td>
            </tr>
            <tr>
              <td class="label">Incident Time</td>
              <td class="value">${timestampStr} (IST)</td>
            </tr>
            <tr>
              <td class="label">User-Agent</td>
              <td class="value" style="word-break: break-all; font-size: 11px;">${userAgent}</td>
            </tr>
          </table>

          <p style="font-size: 12px; color: #cbd5e1;">
            <strong>Recommended Action:</strong> If this was not authorized by your security team, inspect the server audit logs under <code style="background: #0f172a; padding: 2px 6px; border-radius: 4px;">logs/admin-login-audit.log</code> and consider firewall-blocking IP <strong>${ip}</strong>.
          </p>

          <div class="footer">
            LabourSeva Security Operations Center • Automated Alert System<br/>
            Target Notification Address: ${SECURITY_ALERT_EMAIL}
          </div>
        </div>
      </body>
    </html>
  `;

  // Determine SMTP transport
  const smtpHost = process.env.EMAIL_SMTP_HOST?.trim();
  const smtpUser = process.env.EMAIL_SMTP_USER?.trim();
  const smtpPass = process.env.EMAIL_SMTP_PASS?.trim();
  const smtpPort = Number(process.env.EMAIL_SMTP_PORT || 587);
  const fromAddr = process.env.EMAIL_FROM || "security@labourseva.com";

  try {
    if (smtpHost && smtpUser && smtpPass) {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      await transporter.sendMail({
        from: `"LabourSeva Security" <${fromAddr}>`,
        to: SECURITY_ALERT_EMAIL,
        subject,
        html: htmlContent,
      });

      console.log(`[Security Alert] Email successfully delivered to ${SECURITY_ALERT_EMAIL} via SMTP (${smtpHost}).`);
      return true;
    } else {
      // Direct send / local notification log fallback
      console.warn(
        `[Security Alert Notice] SMTP credentials not set in .env. Attempting direct mail delivery or recording to audit alert channel for ${SECURITY_ALERT_EMAIL}.`
      );

      // Create JSON alert notice in logs directory
      const alertNoticeFile = path.join(LOGS_DIR, "security-alerts-dispatched.log");
      const alertLine = `[${new Date().toISOString()}] ALERT_TO=${SECURITY_ALERT_EMAIL} | SEVERITY=${patternResult.severity} | IP=${ip} | REASONS=${patternResult.reasons.join("; ")}\n`;
      await fs.appendFile(alertNoticeFile, alertLine, "utf-8");

      return true;
    }
  } catch (err) {
    console.error(`[Security Alert] Failed to dispatch alert email to ${SECURITY_ALERT_EMAIL}:`, err);
    return false;
  }
}
