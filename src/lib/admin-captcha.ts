import crypto from "node:crypto";
import { resolveSecretChain } from "@/lib/secrets";

// Historical chain preserved exactly: SESSION_SECRET_ADMIN -> ENCRYPTION_KEY -> constant.
const CAPTCHA_SECRET = resolveSecretChain(
  ["SESSION_SECRET_ADMIN", "ENCRYPTION_KEY", "CAPTCHA_SECRET"],
  "labourseva-secure-captcha-salt-key-2026",
  "openssl rand -base64 32 -> CAPTCHA_SECRET"
);

// Clear characters that avoid visual confusion (no 0/O, 1/I)
const CAPTCHA_CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export interface CaptchaChallenge {
  token: string;
  svg: string;
  expiresAt: number;
}

/**
 * Generate a random 5-character CAPTCHA string
 */
export function generateCaptchaCode(length = 5): string {
  let code = "";
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    code += CAPTCHA_CHARS[bytes[i] % CAPTCHA_CHARS.length];
  }
  return code;
}

/**
 * Create an HMAC signature for the captcha text, timestamp, and salt
 */
function createSignature(code: string, timestamp: number, salt: string): string {
  return crypto
    .createHmac("sha256", CAPTCHA_SECRET)
    .update(`${code.toUpperCase()}:${timestamp}:${salt}`)
    .digest("hex");
}

/**
 * Sign a captcha challenge into a stateless token
 */
export function signCaptchaChallenge(code: string): { token: string; expiresAt: number } {
  const timestamp = Date.now();
  const salt = crypto.randomBytes(8).toString("hex");
  const expiresAt = timestamp + 5 * 60 * 1000; // 5 minutes validity
  const hmac = createSignature(code, timestamp, salt);
  // Token format: timestamp.salt.hmac
  const token = `${timestamp}.${salt}.${hmac}`;
  return { token, expiresAt };
}

/**
 * Verify a user's answer against the signed captcha token
 */
export function verifyCaptchaAnswer(userAnswer: string, token: string, expectedCodeLength = 5): boolean {
  if (!userAnswer || !token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [timestampStr, salt, providedHmac] = parts;
  const timestamp = Number(timestampStr);
  if (isNaN(timestamp) || Date.now() - timestamp > 5 * 60 * 1000) {
    // Expired
    return false;
  }

  const cleanAnswer = userAnswer.trim().toUpperCase();
  if (cleanAnswer.length !== expectedCodeLength) return false;

  // Recompute HMAC for the user's answer
  const expectedHmac = createSignature(cleanAnswer, timestamp, salt);
  const a = Buffer.from(providedHmac);
  const b = Buffer.from(expectedHmac);

  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Renders an SVG matching the visual style of the screenshot:
 * Dotted pattern, spaced distorted letters, subtle wavy lines
 */
export function renderCaptchaSvg(code: string): string {
  const width = 220;
  const height = 48;
  const chars = code.split("");

  // Random noise lines
  let linesSvg = "";
  for (let i = 0; i < 3; i++) {
    const y1 = 12 + Math.floor(Math.random() * 24);
    const y2 = 12 + Math.floor(Math.random() * 24);
    const x1 = Math.floor(Math.random() * 30);
    const x2 = width - Math.floor(Math.random() * 30);
    const stroke = i % 2 === 0 ? "#cbd5e1" : "#94a3b8";
    linesSvg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="1.2" stroke-dasharray="4 3" opacity="0.6"/>`;
  }

  // Letters positioned with slight jitter and rotation
  const letterSpacing = width / (chars.length + 1);
  let textSvg = "";
  chars.forEach((char, idx) => {
    const x = Math.round(letterSpacing * (idx + 0.85));
    const y = 32 + (idx % 2 === 0 ? -2 : 2);
    const angle = ((idx * 7) % 15) - 7; // -7 to +7 deg tilt
    textSvg += `
      <text
        x="${x}"
        y="${y}"
        font-family="system-ui, -apple-system, sans-serif"
        font-size="20"
        font-weight="800"
        fill="#1e293b"
        letter-spacing="2"
        text-anchor="middle"
        transform="rotate(${angle} ${x} ${y})"
      >${char}</text>
    `;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="background-color: #f1f5f9; border-radius: 8px;">
    <defs>
      <pattern id="dot-pattern" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="1" fill="#cbd5e1" opacity="0.7"/>
      </pattern>
    </defs>
    <rect width="${width}" height="${height}" fill="#f1f5f9" rx="8" />
    <rect width="${width}" height="${height}" fill="url(#dot-pattern)" rx="8" />
    ${linesSvg}
    ${textSvg}
  </svg>`;
}
