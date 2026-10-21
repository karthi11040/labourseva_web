(process.env as any).NODE_ENV = "test";
import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createLabourSevaCaptchaToken,
  verifyLabourSevaCaptchaToken,
  verifyCaptcha,
  _resetTokenCacheForTesting,
} from "../src/modules/captcha/services/captcha-verification";
import { POST as handleCaptchaVerifyRoute } from "../src/app/api/captcha/verify/route";
import { NextRequest } from "next/server";

describe("Native Security Verification (Captcha) Test Suite", () => {
  it("generates and verifies a valid native LabourSeva token", async () => {
    _resetTokenCacheForTesting();
    const token = createLabourSevaCaptchaToken("otp_send", "127.0.0.1");
    assert.ok(token.startsWith("ls_cap."));

    const verify = verifyLabourSevaCaptchaToken(token, {
      action: "otp_send",
      ip: "127.0.0.1",
    });
    assert.equal(verify.valid, true);

    const fullResult = await verifyCaptcha(token, {
      action: "otp_send",
      ip: "127.0.0.1",
    });
    assert.equal(fullResult.success, true);
    assert.equal(fullResult.action, "otp_send");
  });

  it("rejects a replayed token", async () => {
    _resetTokenCacheForTesting();
    const token = createLabourSevaCaptchaToken("auth_login", "10.0.0.1");

    // First consumption succeeds
    const first = await verifyCaptcha(token, { action: "auth_login", ip: "10.0.0.1" });
    assert.equal(first.success, true);

    // Second consumption must fail due to replay prevention
    const second = await verifyCaptcha(token, { action: "auth_login", ip: "10.0.0.1" });
    assert.equal(second.success, false);
    assert.equal(second.errorCode, "REPLAYED_TOKEN");
  });

  it("rejects forged or tampered tokens", async () => {
    _resetTokenCacheForTesting();
    const token = createLabourSevaCaptchaToken("admin_login", "192.168.1.1");
    const tampered = token.slice(0, -6) + "abcdef";

    const result = await verifyCaptcha(tampered, { action: "admin_login", ip: "192.168.1.1" });
    assert.equal(result.success, false);
    assert.equal(result.errorCode, "INVALID_TOKEN");
  });

  it("rejects missing or empty tokens", async () => {
    const emptyResult = await verifyCaptcha("", { action: "test" });
    assert.equal(emptyResult.success, false);
    assert.equal(emptyResult.errorCode, "MISSING_TOKEN");

    const nullResult = await verifyCaptcha(null as any, { action: "test" });
    assert.equal(nullResult.success, false);
    assert.equal(nullResult.errorCode, "MISSING_TOKEN");
  });

  it("honors test tokens in test environment", async () => {
    _resetTokenCacheForTesting();
    const result = await verifyCaptcha("test-valid-cap-token", { action: "retailer_login" });
    assert.equal(result.success, true);
  });

  it("/api/captcha/verify route produces a valid, consumable token", async () => {
    _resetTokenCacheForTesting();
    const req = new NextRequest("http://localhost:3000/api/captcha/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "127.0.0.1",
      },
      body: JSON.stringify({ action: "otp_send" }),
    });

    const res = await handleCaptchaVerifyRoute(req);
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.ok, true);
    assert.ok(typeof data.token === "string");
    assert.ok(data.token.startsWith("ls_cap."));

    // Verify that the token returned by the route validates in verifyCaptcha
    const verified = await verifyCaptcha(data.token, { action: "otp_send", ip: "127.0.0.1" });
    assert.equal(verified.success, true);
  });
});
