"use client";

import Link from "next/link";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import LoginAdPanel from "@/components/ads/LoginAdPanel";
import {
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Shield,
  AlertCircle,
  Clock,
  Loader2,
  Mail,
  KeyRound,
} from "lucide-react";
export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [accountStatus, setAccountStatus] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setAccountStatus(null);

    if (!identifier || !password) {
      setError("Please enter your registered email/phone and password.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password, rememberMe }),
      });

      const data = await res.json();

      if (res.ok && data.ok) {
        // Successful login
        const targetUrl = data.redirectUrl || "/user/dashboard";
        router.push(targetUrl);
        return;
      }

      if (res.status === 403) {
        setAccountStatus(data.accountStatus || "BLOCKED");
        setError(data.error || "Access restricted by administrative policy.");
      } else if (res.status === 429) {
        setError(data.error || "Too many failed login attempts. Please wait a few minutes before retrying.");
      } else {
        setError(data.error || "Invalid login credentials. Please check your details and try again.");
      }
    } catch {
      setError("Unable to connect to authentication server. Please check your network.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-12rem)] flex items-center justify-center px-4 py-12" style={{ background: "var(--bg-subtle)" }}>
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] overflow-hidden rounded-2xl border bg-white shadow-[var(--shadow-lg)]" style={{ borderColor: "var(--border)" }}>
        <LoginAdPanel placement="CUSTOMER_LOGIN" audience="Customer" />
        <div className="w-full max-w-md mx-auto">
        <div className="rounded-2xl border p-6 sm:p-8 shadow-[var(--shadow-lg)]" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg mx-auto mb-3" style={{ background: "var(--primary)" }}>
              LS
            </div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
              Sign In to LabourSeva
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Government of Tamil Nadu · Department of Labour
            </p>
          </div>

          {error && (
            <div className={`mb-5 p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
              accountStatus === "EMAIL_UNVERIFIED"
                ? "bg-amber-50 border-amber-200 text-amber-900"
                : accountStatus === "REJECTED"
                ? "bg-rose-50 border-rose-200 text-rose-900"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}>
              {accountStatus === "EMAIL_UNVERIFIED" ? (
                <Clock size={16} className="text-amber-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-medium leading-relaxed">{error}</p>
                {accountStatus === "EMAIL_UNVERIFIED" && (
                  <div className="mt-2 pt-2 border-t border-amber-200">
                    <Link
                      href="/verify-email"
                      className="inline-flex items-center gap-1 font-bold text-amber-950 underline hover:no-underline"
                    >
                      <Mail size={12} /> Request a new verification link →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Login Identifier */}
            <div>
              <label htmlFor="login-id" className="block text-xs font-medium text-slate-700 mb-1">
                Email Address or 10-Digit Mobile Number <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center border rounded-lg overflow-hidden bg-slate-50 focus-within:bg-white focus-within:border-[#1e3a8a] transition-all" style={{ borderColor: "var(--border-strong)" }}>
                <div className="px-3 text-slate-400">
                  <User size={15} />
                </div>
                <input
                  id="login-id"
                  type="text"
                  autoComplete="username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="name@example.com or 98XXXXXXXX"
                  className="flex-1 px-2 h-11 text-xs outline-none bg-transparent"
                  style={{ color: "var(--text)" }}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="login-pwd" className="text-xs font-medium text-slate-700">
                  Password <span className="text-rose-500">*</span>
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-[#1e3a8a] font-medium hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="flex items-center border rounded-lg overflow-hidden bg-slate-50 focus-within:bg-white focus-within:border-[#1e3a8a] transition-all" style={{ borderColor: "var(--border-strong)" }}>
                <div className="px-3 text-slate-400">
                  <Lock size={15} />
                </div>
                <input
                  id="login-pwd"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="flex-1 px-2 h-11 text-xs outline-none bg-transparent"
                  style={{ color: "var(--text)" }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="px-3 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-[#1e3a8a] focus:ring-[#1e3a8a]"
                />
                <span className="text-xs text-slate-600">Keep me signed in</span>
              </label>
            </div>



            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !identifier || !password}
              className="w-full h-12 rounded-full font-semibold text-sm flex items-center justify-center gap-2 text-white bg-[#1e3a8a] hover:bg-[#1e40af] disabled:opacity-50 transition-all shadow-sm mt-3"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Verifying Credentials...
                </>
              ) : (
                <>
                  Sign In <ArrowRight size={16} />
                </>
              )}
            </button>

            <Link
              href="/user/login"
              className="min-h-11 w-full inline-flex items-center justify-center gap-2 rounded-lg border border-[#1e3a8a] bg-white px-4 py-2 text-sm font-semibold text-[#1e3a8a] transition-colors hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-200"
            >
              <KeyRound size={15} />
              Sign in with mobile OTP
            </Link>
            <p className="-mt-2 text-center text-xs text-slate-500">
              New phone numbers can create an account after verifying the OTP.
            </p>

            {/* Register Footer */}
            <div className="pt-4 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-500">
                New to LabourSeva?{" "}
                <Link href="/register" className="text-[#1e3a8a] font-bold underline hover:no-underline">
                  Create an account
                </Link>
              </p>
            </div>
          </form>

        </div>

        <p className="text-center text-xs mt-4 flex items-center justify-center gap-1 text-slate-400">
          <Shield size={12} />
          Protected by Tamil Nadu e-Governance Authentication Standard
        </p>
        </div>
      </div>
    </div>
  );
}
