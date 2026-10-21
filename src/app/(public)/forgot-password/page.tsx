"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { Mail, ArrowRight, ArrowLeft, CheckCircle2, Shield, AlertCircle, Loader2 } from "lucide-react";
import { CapCaptcha } from "@/modules/captcha";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [capToken, setCapToken] = useState("");
  const captchaRef = useRef<React.ComponentRef<typeof CapCaptcha>>(null);

  function refreshCaptcha() {
    setCapToken("");
    captchaRef.current?.reset();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    if (!capToken) {
      setError("Please complete the security verification (Cap) first.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, captchaToken: capToken }),
      });
      const data = await res.json();
      if (res.ok) {
        setSubmitted(true);
      } else {
        setError(data.error || "Unable to process request. Please try again later.");
        refreshCaptcha();
      }
    } catch {
      setError("Network error occurred. Please check your internet connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-12rem)] flex items-center justify-center px-4 py-12" style={{ background: "var(--bg-subtle)" }}>
      <div className="w-full max-w-md">
        <div className="rounded-2xl border p-8 shadow-[var(--shadow-lg)]" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg mx-auto mb-3" style={{ background: "var(--primary)" }}>
              LS
            </div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
              Forgot Password
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              Enter your registered email address to receive password recovery instructions.
            </p>
          </div>

          {submitted ? (
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 ring-8 ring-emerald-50/50">
                <CheckCircle2 size={32} />
              </div>
              <h2 className="text-lg font-bold text-slate-800">Check Your Email</h2>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                If an account exists with <strong>{email}</strong>, a secure password reset link has been dispatched to your inbox.
              </p>
              <div className="my-5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-left text-xs text-amber-900 leading-normal">
                <p className="font-semibold text-amber-950">Security Notice:</p>
                <p className="mt-0.5">
                  The reset link expires in 15 minutes and can only be used once. Please check your Spam or Junk folder if you do not receive it shortly.
                </p>
              </div>
              <Link
                href="/login"
                className="w-full h-11 rounded-full font-semibold text-xs flex items-center justify-center gap-1.5 text-white bg-[#1e3a8a] hover:bg-[#1e40af] transition-colors"
              >
                <ArrowLeft size={14} /> Back to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              {error && (
                <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="mb-5">
                <label htmlFor="reset-email" className="block text-sm font-medium mb-1.5" style={{ color: "var(--text)" }}>
                  Registered Email Address <span style={{ color: "var(--text-muted)" }}>(required)</span>
                </label>
                <div className="flex items-center border rounded-lg overflow-hidden bg-slate-50 focus-within:bg-white focus-within:border-[#1e3a8a] transition-all" style={{ borderColor: "var(--border-strong)" }}>
                  <div className="px-3 text-slate-400">
                    <Mail size={16} />
                  </div>
                  <input
                    id="reset-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="flex-1 px-2 h-12 text-sm outline-none bg-transparent"
                    style={{ color: "var(--text)" }}
                    required
                  />
                </div>
              </div>

              {/* Cap security verification */}
              <div className="mb-5">
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text)" }}>
                  Security Verification <span style={{ color: "var(--text-muted)" }}>(required)</span>
                </label>
                <CapCaptcha
                  ref={captchaRef}
                  action="forgot_password"
                  compact
                  onVerified={setCapToken}
                  onReset={() => setCapToken("")}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full h-12 rounded-full font-semibold text-sm flex items-center justify-center gap-2 text-white bg-[#1e3a8a] hover:bg-[#1e40af] disabled:opacity-50 transition-all shadow-sm"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Sending Reset Link...
                  </>
                ) : (
                  <>
                    Send Password Reset Link <ArrowRight size={16} />
                  </>
                )}
              </button>

              <div className="mt-6 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-[#1e3a8a] transition-colors"
                >
                  <ArrowLeft size={13} /> Return to Sign In
                </Link>
              </div>
            </form>
          )}

        </div>

        <p className="text-center text-xs mt-4 flex items-center justify-center gap-1 text-slate-400">
          <Shield size={12} />
          LabourSeva State Portal · Cryptographically secured recovery
        </p>
      </div>
    </div>
  );
}
