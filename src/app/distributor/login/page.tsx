"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import LoginAdPanel from "@/components/ads/LoginAdPanel";
import {
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  User,
  KeyRound,
  Lock,
} from "lucide-react";
import { saveDistributorSession } from "@/lib/distributor-session";
import { CapCaptcha, CapCaptchaHandle } from "@/modules/captcha";
import ManualAdSlider from "@/components/ads/ManualAdSlider";

export default function DistributorLoginPage() {
  const router = useRouter();
  const captchaRef = useRef<CapCaptchaHandle>(null);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!identifier.trim()) {
      setError("Please enter your Distributor ID, phone, or email.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }
    if (!captchaToken) {
      setError("Please complete the security verification challenge.");
      return;
    }
    setLoading(true);

    try {
      const res = await fetch("/api/distributor/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password, captchaToken }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(
          data.error ||
            "Authentication failed. Please check your distributor credentials."
        );
        setCaptchaToken("");
        captchaRef.current?.reset();
        return;
      }

      // Save session in localStorage and cookie
      saveDistributorSession({
        id: data.distributor.id,
        registrationNo: data.distributor.registrationNo,
        name: data.distributor.name,
        email: data.distributor.email,
        phone: data.distributor.phone,
        walletBalance: data.distributor.walletBalance,
        totalCommissionEarned: data.distributor.totalCommissionEarned,
        verificationStatus: data.distributor.verificationStatus,
      });

      router.push("/distributor/dashboard");
    } catch (err: any) {
      setError(err.message || "Network error. Please try again.");
      setCaptchaToken("");
      captchaRef.current?.reset();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-slate-100/70 flex flex-col font-sans antialiased">
      <header className="w-full border-b-2 border-[#ea580c] bg-white">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <Image src="/images/Logo.webp" alt="LabourSeva logo" width={40} height={40} className="h-10 w-10 object-contain" priority />
            <span className="truncate text-lg font-black tracking-tight text-[#1e3a8a]">
              Labour<span className="text-[#ea580c]">Seva</span>
              <span className="ml-2 hidden text-xs font-medium text-slate-500 sm:inline">Distributor Desk</span>
            </span>
          </Link>
          <Link href="/" className="min-h-11 shrink-0 inline-flex items-center text-xs font-semibold text-slate-600 hover:text-[#1e3a8a] hover:underline">
            Main Portal
          </Link>
        </div>
      </header>

      <div className="flex flex-1 items-stretch justify-center px-0 sm:px-4">
        <div className="grid w-full max-w-[90rem] grid-cols-1 overflow-hidden border border-slate-200/70 bg-white shadow-2xl shadow-slate-900/10 sm:my-4 sm:rounded-2xl lg:my-6 lg:min-h-[calc(100svh-18rem)] lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">

        <LoginAdPanel placement="DISTRIBUTOR_LOGIN" audience="Distributor" />



        {/* ───────── RIGHT: Login Form ───────── */}
        <main className="flex flex-col justify-center px-5 sm:px-10 lg:px-12 py-8 lg:py-10 bg-white">
          <div className="w-full max-w-md mx-auto">
            {/* Heading */}
            <div className="mb-6">
              <h2 className="text-[1.55rem] font-black tracking-tight text-slate-900 leading-tight">
                Distributor sign-in
              </h2>
              <p className="mt-1.5 text-sm text-slate-500">
                விநியோகஸ்தர் தளம் · Regional Channel Partner Login.
              </p>
            </div>

            {/* Error banner */}
            {error && (
              <div
                role="alert"
                className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2 animate-[fadeIn_0.2s_ease-out]"
              >
                <AlertCircle
                  size={15}
                  className="flex-shrink-0 mt-0.5 text-rose-500"
                />
                <div>
                  <p className="font-semibold text-xs">Action needed</p>
                  <p className="text-xs text-rose-600/90 mt-0.5">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Identifier */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-[0.12em] text-slate-700">
                  Distributor ID · Phone · Email
                </label>
                <div className="group relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#ea580c] transition-colors">
                    <User size={16} />
                  </span>
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Distributor ID / Phone / Email"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#0f172a] focus:ring-4 focus:ring-slate-100 transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold uppercase tracking-[0.12em] text-slate-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 inline-flex items-center gap-1 transition-colors"
                  >
                    {showPassword ? <EyeOff size={12} /> : <Eye size={12} />}
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                <div className="group relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#ea580c] transition-colors">
                    <KeyRound size={16} />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your distributor password"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#0f172a] focus:ring-4 focus:ring-slate-100 transition-all"
                  />
                </div>
              </div>

              {/* Security Verification (Cap CAPTCHA) */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-[11px] font-bold uppercase tracking-[0.12em] text-slate-700">
                  Security Verification · பாதுகாப்பு சரிபார்ப்பு
                </label>
                <CapCaptcha
                  ref={captchaRef}
                  action="distributor_login"
                  compact
                  onVerified={(token) => {
                    setCaptchaToken(token);
                    setError(null);
                  }}
                  onReset={() => setCaptchaToken("")}
                  onError={(err) => setError(err)}
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={
                  loading ||
                  !identifier.trim() ||
                  !password ||
                  !captchaToken
                }
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#0f172a] to-[#1e293b] hover:from-[#1e293b] hover:to-[#0f172a] shadow-lg shadow-slate-900/20 hover:shadow-slate-900/30 focus:outline-none focus:ring-4 focus:ring-slate-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Authenticating Distributor...
                  </>
                ) : (
                  <>
                    <Lock size={15} className="group-hover:-translate-x-0.5 transition-transform" />
                    Sign In to Distributor Hub
                    <ArrowRight
                      size={15}
                      className="group-hover:translate-x-0.5 transition-transform"
                    />
                  </>
                )}
              </button>
            </form>

            {/* Back link */}
            <div className="mt-6 pt-5 border-t border-slate-100 text-center">
              <Link
                href="/"
                className="text-xs font-semibold text-slate-500 hover:text-[#0f172a] inline-flex items-center gap-1.5 transition-colors"
              >
                <ArrowRight size={12} className="rotate-180" />
                Return to LabourSeva Main Portal
              </Link>
            </div>
          </div>
        </main>
      </div>
      </div>

        <footer className="w-full border-t border-slate-200 bg-white">
          <div className="mx-auto flex min-h-14 max-w-7xl flex-col items-center justify-between gap-2 px-4 py-3 text-center text-[11px] text-slate-500 sm:flex-row sm:px-6 sm:text-left">
            <span>LabourSeva Distributor Desk · Secure partner access</span>
            <a href="tel:18004251234" className="font-semibold text-[#1e3a8a] hover:underline">Help: 1800 425 1234</a>
          </div>
        </footer>

      {/* Keyframe fallback for the inline animation */}
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
