"use client";

import Link from "next/link";
import { useState } from "react";
import { Phone, ArrowRight, Shield, RefreshCw, AlertCircle } from "lucide-react";

type Step = "phone" | "otp" | "done";

export default function LoginPage() {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [phoneError, setPhoneError] = useState("");

  function validatePhone(v: string) {
    if (!/^[6-9]\d{9}$/.test(v)) return "Enter a valid 10-digit mobile number";
    return "";
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    const err = validatePhone(phone);
    if (err) { setPhoneError(err); return; }
    setPhoneError("");
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000)); // demo delay
    setLoading(false);
    setStep("otp");
    startCountdown();
  }

  function startCountdown() {
    setCountdown(45);
    const id = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(id); return 0; }
        return c - 1;
      });
    }, 1000);
  }

  function handleOtpChange(idx: number, val: string) {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    if (val && idx < 5) {
      document.getElementById(`otp-${idx + 1}`)?.focus();
    }
  }

  function handleOtpKeyDown(idx: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) {
      document.getElementById(`otp-${idx - 1}`)?.focus();
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setLoading(false);
    setStep("done");
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: "var(--bg-subtle)" }}
    >
      <div className="w-full max-w-md">
        {/* Card */}
        <div
          className="rounded-[var(--radius-lg)] border shadow-[var(--shadow-lg)] p-8"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          {/* Logo */}
          <div className="text-center mb-8">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg mx-auto mb-3"
              style={{ background: "var(--primary)" }}
            >
              LS
            </div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
              {step === "phone" ? "Sign in to LabourSeva" : step === "otp" ? "Enter OTP" : "Signed in!"}
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              {step === "phone"
                ? "Enter your registered mobile number"
                : step === "otp"
                ? `OTP sent to +91 ${phone.slice(0, 2)}XXXXXX${phone.slice(-2)}`
                : "Welcome back to LabourSeva"}
            </p>
          </div>

          {/* Phone step */}
          {step === "phone" && (
            <form onSubmit={handleSendOtp} noValidate>
              <div className="mb-5">
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: "var(--text)" }}
                >
                  Mobile number <span style={{ color: "var(--text-muted)" }}>(required)</span>
                </label>
                <div
                  className="flex items-center border rounded-[var(--radius-sm)] overflow-hidden transition-all"
                  style={{
                    borderColor: phoneError ? "var(--danger)" : "var(--border-strong)",
                    background: "var(--surface)",
                  }}
                >
                  <div
                    className="flex items-center gap-2 px-3 border-r h-12 flex-shrink-0"
                    style={{ borderColor: "var(--border)", background: "var(--bg-subtle)" }}
                  >
                    <Phone size={14} style={{ color: "var(--text-muted)" }} />
                    <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                      +91
                    </span>
                  </div>
                  <input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel-national"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
                      if (phoneError) setPhoneError("");
                    }}
                    placeholder="98XXXXXXXX"
                    className="flex-1 px-3 h-12 text-sm outline-none bg-transparent"
                    style={{ color: "var(--text)" }}
                    aria-invalid={!!phoneError}
                    aria-describedby={phoneError ? "phone-error" : undefined}
                    required
                  />
                </div>
                {phoneError && (
                  <p
                    id="phone-error"
                    role="alert"
                    className="flex items-center gap-1.5 mt-1.5 text-xs"
                    style={{ color: "var(--danger-text)" }}
                  >
                    <AlertCircle size={12} /> {phoneError}
                  </p>
                )}
                <p className="mt-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
                  An OTP will be sent to this number for verification.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || phone.length !== 10}
                className="w-full h-12 rounded-full font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[var(--shadow-primary)] active:scale-[0.98]"
                style={{ background: "var(--primary)", color: "var(--on-primary)" }}
                aria-busy={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner spinner-sm" aria-hidden="true" />
                    Sending OTP...
                  </>
                ) : (
                  <>
                    Send OTP <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          )}

          {/* OTP step */}
          {step === "otp" && (
            <form onSubmit={handleVerifyOtp}>
              <div className="mb-6">
                <div className="flex gap-2 justify-center mb-4" aria-label="OTP input">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      id={`otp-${i}`}
                      type="text"
                      inputMode="numeric"
                      autoComplete={i === 0 ? "one-time-code" : "off"}
                      value={digit}
                      maxLength={1}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className="w-12 h-14 text-center text-2xl font-bold border rounded-[var(--radius-sm)] outline-none transition-all"
                      style={{
                        fontFamily: "var(--font-mono)",
                        background: "var(--bg-subtle)",
                        borderColor: digit ? "var(--primary)" : "var(--border-strong)",
                        color: "var(--text)",
                      }}
                    />
                  ))}
                </div>

                <div className="text-center">
                  {countdown > 0 ? (
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                      Resend in{" "}
                      <span className="font-medium" style={{ fontFamily: "var(--font-mono)" }}>
                        0:{String(countdown).padStart(2, "0")}
                      </span>
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setOtp(["","","","","",""]); startCountdown(); }}
                      className="text-sm font-medium flex items-center gap-1 mx-auto transition-colors hover:opacity-80"
                      style={{ color: "var(--primary)" }}
                    >
                      <RefreshCw size={13} /> Resend OTP
                    </button>
                  )}
                </div>

                <p className="text-center text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                  OTP is valid for 5 minutes.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || otp.join("").length < 6}
                className="w-full h-12 rounded-full font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[var(--shadow-primary)] active:scale-[0.98]"
                style={{ background: "var(--primary)", color: "var(--on-primary)" }}
                aria-busy={loading}
              >
                {loading ? (
                  <><span className="spinner spinner-sm" aria-hidden="true" /> Verifying...</>
                ) : (
                  <>Verify & Sign in <ArrowRight size={16} /></>
                )}
              </button>

              <button
                type="button"
                className="w-full mt-3 h-10 rounded-full text-sm font-medium transition-colors hover:bg-[var(--bg-subtle)]"
                style={{ color: "var(--text-secondary)" }}
                onClick={() => setStep("phone")}
              >
                ← Change number
              </button>
            </form>
          )}

          {/* Done */}
          {step === "done" && (
            <div className="text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: "var(--success-bg)" }}
              >
                <Shield size={28} style={{ color: "var(--success)" }} />
              </div>
              <p className="mb-6 text-sm" style={{ color: "var(--text-secondary)" }}>
                This is a demonstration. In production, you would be redirected to your dashboard.
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 h-12 px-8 rounded-full font-semibold text-sm transition-all hover:shadow-[var(--shadow-primary)]"
                style={{ background: "var(--primary)", color: "var(--on-primary)" }}
              >
                Go to Homepage
              </Link>
            </div>
          )}

          {step === "phone" && (
            <>
              <div className="my-6 flex items-center gap-3">
                <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>or</span>
                <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
              </div>
              <p className="text-center text-sm" style={{ color: "var(--text-secondary)" }}>
                New to LabourSeva?{" "}
                <Link
                  href="/register"
                  className="font-semibold underline hover:no-underline"
                  style={{ color: "var(--primary)" }}
                >
                  Create an account
                </Link>
              </p>
            </>
          )}
        </div>

        {/* Trust note */}
        <p className="text-center text-xs mt-4 flex items-center justify-center gap-1" style={{ color: "var(--text-muted)" }}>
          <Shield size={12} />
          Secured with 256-bit encryption. Your data is protected.
        </p>
      </div>
    </div>
  );
}
