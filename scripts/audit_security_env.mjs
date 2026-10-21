#!/usr/bin/env node
/**
 * Security environment preflight — run BEFORE deploying to production:
 *
 *    node scripts/audit_security_env.mjs
 *
 * Verifies every secret the app needs without printing any values.
 * Exit code 1 when critical items are missing.
 */
import { readFileSync, existsSync } from "node:fs";

const envFile = existsSync(".env") ? readFileSync(".env", "utf8") : "";
function isSet(name) {
  const m = envFile.match(new RegExp(`^${name}=(.*)$`, "m"));
  return Boolean(m && m[1].trim());
}

const SESSION_SECRETS = [
  "SESSION_SECRET_CUST",
  "SESSION_SECRET_GUEST",
  "SESSION_SECRET_ADMIN",
  "SESSION_SECRET_DIST",
  "SESSION_SECRET_RET",
  "SESSION_SECRET_EMP",
];

const CRITICAL = [
  ...SESSION_SECRETS,
  "ENCRYPTION_KEY",
  "ENCRYPTION_KEY_VERSION",
  "HMAC_BLIND_INDEX_KEY",
  "CSRF_SECRET",
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD",
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "RAZORPAY_WEBHOOK_SECRET",
];

const RECOMMENDED = [
  "SMS_API_KEY",
  "CAP_SECRET_KEY",
  "STAFF_SESSION_SECRET",
  "ADMIN_SESSION_SECRET",
];

let failures = 0;

console.log("== LabourSeva security environment audit ==========================");
for (const name of CRITICAL) {
  if (isSet(name)) {
    console.log(`  [OK]      ${name}`);
  } else {
    console.log(`  [MISSING] ${name}`);
    failures += 1;
  }
}
for (const name of RECOMMENDED) {
  console.log(`  [${isSet(name) ? "OK" : "recommend set"}] ${name}`);
}

console.log("===================================================================");
console.log("How to fix missing entries:");
console.log("  openssl rand -base64 32   # per secret; one line each in .env");
console.log("");
console.log("Recommended rollout order:");
console.log("  1. Set the [MISSING] vars in the PRODUCTION .env across all instances.");
console.log("  2. Restart once. Old sessions signed with the legacy fallback constant become invalid -> users re-login once.");
console.log("  3. Then set STRICT_SECRETS=true so a missing secret aborts boot instead of silently downgrading.");
console.log("");

if (failures > 0) {
  console.log(`RESULT: ${failures} critical variable(s) missing.`);
  process.exitCode = 1;
} else {
  console.log("RESULT: all critical security variables are set.");
}
