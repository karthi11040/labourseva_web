"use client";

import { useState, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, Eye, EyeOff, CheckCircle2, ArrowRight, Shield, AlertCircle, Loader2 } from "lucide-react";
import { CapCaptcha } from "@/modules/captcha";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [capToken, setCapToken] = useState("");
  const captchaRef = useRef<React.ComponentRef<typeof CapCaptcha>>(null);

  function refreshCaptcha() {
    setCapToken("");
    captchaRef.current?.reset();
  }

  if (!token) {
    return (
      <div className="min-h-[calc(100vh-12rem)] flex items-center justify-center px-4 py-12" style={{ background: "var(--bg-subtle)" }}>
        <div className="w-full max-w-md rounded-2xl border p-8 bg-white shadow-lg text-center border-slate-200">
          <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Missing Reset Token</h1>
          <p className="text-xs text-slate-600 mt-2">
            The password reset link is invalid or incomplete. Please check the link from your email.
          </p>
          <div className="mt-6">
            <Link
              href="/forgot-password"
              className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full text-xs font-semibold text-white bg-[#1e3a8a] hover:bg-[#1e40af]"
            >
              Request New Link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("The entered passwords do not match.");
      return;
    }

    if (!capToken) {
      setError("Please complete the security verification (Cap) first.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password, confirmPassword, captchaToken: capToken }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
      } else {
        setError(data.error || "Password reset token is invalid or expired.");
        refreshCaptcha();
      }
    } catch {
      setError("Network communication error. Please try again.");
      refreshCaptcha();
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
              Reset Password
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              Create a strong, new password for your LabourSeva account.
            </p>
          </div>

          {success ? (
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 ring-8 ring-emerald-50/50">
                <CheckCircle2 size={32} />
              </div>
              <h2 className="text-lg font-bold text-slate-800">Password Updated!</h2>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Your password has been securely updated and existing reset tokens have been invalidated. A security notification email has been dispatched.
              </p>
              <div className="mt-6">
                <Link
                  href="/login"
                  className="w-full h-12 rounded-full font-semibold text-sm flex items-center justify-center gap-2 text-white bg-[#1e3a8a] hover:bg-[#1e40af] transition-all shadow-sm"
                >
                  Sign In with New Password <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text)" }}>
                  New Password <span style={{ color: "var(--text-muted)" }}>(min 8 characters)</span>
                </label>
                <div className="flex items-center border rounded-lg overflow-hidden bg-slate-50 focus-within:bg-white focus-within:border-[#1e3a8a] transition-all" style={{ borderColor: "var(--border-strong)" }}>
                  <div className="px-3 text-slate-400">
                    <Lock size={16} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="flex-1 px-2 h-12 text-sm outline-none bg-transparent"
                    style={{ color: "var(--text)" }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="px-3 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text)" }}>
                  Confirm New Password
                </label>
                <div className="flex items-center border rounded-lg overflow-hidden bg-slate-50 focus-within:bg-white focus-within:border-[#1e3a8a] transition-all" style={{ borderColor: "var(--border-strong)" }}>
                  <div className="px-3 text-slate-400">
                    <Lock size={16} />
                  </div>
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="flex-1 px-2 h-12 text-sm outline-none bg-transparent"
                    style={{ color: "var(--text)" }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="px-3 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Cap security verification */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text)" }}>
                  Security Verification <span style={{ color: "var(--text-muted)" }}>(required)</span>
                </label>
                <CapCaptcha
                  ref={captchaRef}
                  action="reset_password"
                  compact
                  onVerified={setCapToken}
                  onReset={() => setCapToken("")}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !password || !confirmPassword}
                className="w-full h-12 rounded-full font-semibold text-sm flex items-center justify-center gap-2 text-white bg-[#1e3a8a] hover:bg-[#1e40af] disabled:opacity-50 transition-all shadow-sm"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Updating Password...
                  </>
                ) : (
                  <>
                    Set New Password <ArrowRight size={16} />
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <Link
                  href="/forgot-password"
                  className="text-xs text-slate-500 hover:text-[#1e3a8a] transition-colors"
                >
                  Link expired? Request a new reset link
                </Link>
              </div>
            </form>
          )}

        </div>

        <p className="text-center text-xs mt-4 flex items-center justify-center gap-1 text-slate-400">
          <Shield size={12} />
          Encrypted & Audited · LabourSeva Authentication Engine
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#1e3a8a]" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
