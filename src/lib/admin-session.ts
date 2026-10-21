import crypto from "node:crypto";
import { getSecret } from "@/lib/secrets";
const cookieName = "labourseva-admin-session";
function secret() { return getSecret("ADMIN_SESSION_SECRET", process.env.ADMIN_PASSWORD || "change-admin-session-secret", "openssl rand -base64 32 -> ADMIN_SESSION_SECRET (recommended)"); }
export function createAdminSession() { const payload = `${Date.now()}`; return `${payload}.${crypto.createHmac("sha256", secret()).update(payload).digest("hex")}`; }
export function isAdminSession(value: string | undefined) { if (!value) return false; const [payload, signature] = value.split("."); if (!payload || !signature || !/^\d+$/.test(payload) || Date.now() - Number(payload) > 8 * 60 * 60 * 1000) return false; const expected = crypto.createHmac("sha256", secret()).update(payload).digest("hex"); return signature.length === expected.length && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected)); }
export const adminSessionCookieName = cookieName;
