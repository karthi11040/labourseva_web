"use client";

import { useEffect, useState, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, XCircle, Loader2, ArrowRight, Mail, Shield, AlertCircle } from "lucide-react";
function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [resendEmail, setResendEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const hasRequestedRef = useRef(false);

  useEffect(() => {
    if (!token) {
      setState("error");
      setMessage("Verification token is missing from the URL. Please verify the link in your email.");
      return;
    }

    if (hasRequestedRef.current) {
      return;
    }
    hasRequestedRef.current = true;

    const controller = new AbortController();
    let isSubscribed = true;

    async function verify() {
      try {
        const res = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token!)}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        if (!isSubscribed) return;

        if (data.ok) {
          setState("success");
          setMessage(
            data.message ||
              (data.alreadyVerified
                ? "Your email address is already verified."
                : "Your email address has been successfully verified.")
          );
        } else {
          setState("error");
          setMessage(data.error || "The email verification link has expired or has already been used.");
        }
      } catch (err: any) {
        if (!isSubscribed || err.name === "AbortError") return;
        setState("error");
        setMessage("Unable to connect to verification server. Please check your internet connection.");
      }
    }

    verify();

    return () => {
      isSubscribed = false;
      controller.abort();
    };
  }, [token]);

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    if (!resendEmail) return;
    setResending(true);
    setResendStatus(null);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resendEmail }),
      });
      const data = await res.json();
      if (data.ok) {
        setResendStatus({
          ok: true,
          message: "A fresh verification link has been sent to your email. Please check your inbox.",
        });
      } else {
        setResendStatus({
          ok: false,
          message: data.error || "Unable to resend verification link at this moment.",
        });
      }
    } catch {
      setResendStatus({
        ok: false,
        message: "Network error occurred while requesting verification link.",
      });
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-12rem)] flex items-center justify-center px-4 py-12" style={{ background: "var(--bg-subtle)" }}>
      <div className="w-full max-w-md">
        <div className="rounded-2xl border p-8 shadow-[var(--shadow-lg)] text-center" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          
          {/* Logo / Emblem Area */}
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-5 shadow-sm" style={{ background: "var(--primary)" }}>
            LS
          </div>

          {state === "loading" && (
            <div className="py-8">
              <Loader2 className="w-10 h-10 animate-spin text-[#1e3a8a] mx-auto mb-4" />
              <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>Verifying Email Address</h1>
              <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>
                Cryptographically validating your token with LabourSeva...
              </p>
            </div>
          )}

          {state === "success" && (
            <div>
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 ring-8 ring-emerald-50/50">
                <CheckCircle2 size={36} />
              </div>
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
                Email Verified!
              </h1>
              <p className="text-sm mt-2 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {message}
              </p>

              <div className="my-6 p-4 rounded-xl border border-blue-100 bg-blue-50/60 text-left">
                <div className="flex items-start gap-2.5">
                  <Shield className="w-5 h-5 text-[#1e3a8a] shrink-0 mt-0.5" />
                  <div>
                    <h2 className="text-xs font-bold text-[#1e3a8a] uppercase tracking-wider">Next Step: Verification Desk Review</h2>
                    <p className="text-xs text-slate-700 mt-1 leading-normal">
                      Your account registration has been forwarded to the scrutiny officer queue. Once approved, you will receive an instant <strong>Email and SMS confirmation</strong>.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <Link
                  href="/login"
                  className="w-full h-12 rounded-full font-semibold text-sm flex items-center justify-center gap-2 text-white shadow-sm hover:opacity-95 transition-all"
                  style={{ background: "var(--primary)" }}
                >
                  Sign In to Check Status <ArrowRight size={16} />
                </Link>
                <Link
                  href="/help"
                  className="text-xs text-slate-500 hover:text-slate-800 transition-colors py-1"
                >
                  Need assistance? Contact LabourSeva Helpdesk
                </Link>
              </div>
            </div>
          )}

          {state === "error" && (
            <div>
              <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 ring-8 ring-rose-50/50">
                <XCircle size={36} />
              </div>
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
                Verification Failed
              </h1>
              <p className="text-sm mt-2 leading-relaxed text-rose-700">
                {message}
              </p>

              {/* Resend Verification Form */}
              <div className="mt-6 pt-6 border-t text-left" style={{ borderColor: "var(--border)" }}>
                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Mail size={14} className="text-[#1e3a8a]" /> Request New Verification Link
                </h2>
                <form onSubmit={handleResend} className="space-y-3">
                  <input
                    type="email"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    placeholder="Enter your registered email"
                    className="w-full h-11 px-3.5 rounded-lg border text-sm outline-none bg-slate-50 focus:bg-white focus:border-[#1e3a8a] transition-all"
                    style={{ borderColor: "var(--border-strong)" }}
                    required
                  />

                  <button
                    type="submit"
                    disabled={resending || !resendEmail}
                    className="w-full h-11 rounded-lg font-semibold text-xs text-white bg-[#1e3a8a] hover:bg-[#1e40af] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    {resending ? <><Loader2 size={14} className="animate-spin" /> Sending...</> : "Send Verification Email"}
                  </button>
                </form>

                {resendStatus && (
                  <div className={`mt-3 p-3 rounded-lg text-xs flex items-start gap-2 ${
                    resendStatus.ok ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-800 border border-rose-200"
                  }`}>
                    {resendStatus.ok ? <CheckCircle2 size={14} className="shrink-0 mt-0.5" /> : <AlertCircle size={14} className="shrink-0 mt-0.5" />}
                    <span>{resendStatus.message}</span>
                  </div>
                )}
              </div>

              <div className="mt-6">
                <Link href="/login" className="text-xs font-semibold text-[#1e3a8a] hover:underline">
                  Return to Sign In
                </Link>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#1e3a8a]" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
