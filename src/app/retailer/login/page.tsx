"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import LoginAdPanel from "@/components/ads/LoginAdPanel";
import {
  Store,
  Lock,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff,
  User,
  KeyRound,
  Zap,
  Wallet,
} from "lucide-react";
import { saveRetailerSession } from "@/lib/retailer-session";

export default function RetailerLoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/retailer/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(
          data.error || "Authentication failed. Please check your credentials."
        );
        return;
      }

      // Save session in localStorage and cookie
      saveRetailerSession({
        id: data.retailer.id,
        registrationNo: data.retailer.registrationNo,
        name: data.retailer.name,
        shopName: data.retailer.shopName,
        email: data.retailer.email,
        phone: data.retailer.phone,
        walletBalance: data.retailer.walletBalance,
      });

      router.push(data.redirectUrl || "/retailer/dashboard");
    } catch (err: any) {
      setError(err.message || "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-slate-100/70 flex flex-col font-sans antialiased">
      <header className="w-full border-b-2 border-[#ea580c] bg-white">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3 text-lg font-black text-[#1e3a8a]">Labour<span className="text-[#ea580c]">Seva</span><span className="text-xs font-medium text-slate-500">Retailer Desk</span></Link>
          <Link href="/" className="min-h-11 inline-flex items-center text-xs font-semibold text-slate-600 hover:text-[#1e3a8a]">Main Portal</Link>
        </div>
      </header>
      <div className="flex flex-1 items-center justify-center px-0 sm:px-4">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] bg-white shadow-2xl shadow-slate-900/10 lg:my-6 lg:min-h-[calc(100vh-10rem)] lg:rounded-3xl overflow-hidden border border-slate-200/70">

        <LoginAdPanel placement="RETAILER_LOGIN" audience="Retailer" />



        {/* ───────── RIGHT: Login Form ───────── */}
        <main className="flex flex-col justify-center px-6 sm:px-12 lg:px-16 py-10 lg:py-12 bg-white">
          <div className="w-full max-w-md mx-auto">
            {/* Mobile brand header */}
            <div className="lg:hidden mb-8 flex justify-center">
              <Link href="/" className="inline-flex items-center gap-3">
                <div className="h-10 w-10 p-0.5 bg-white rounded-xl shadow-md border border-slate-200 flex items-center justify-center">
                  <Image
                    src="/images/Logo.png"
                    alt="LabourSeva logo"
                    width={40}
                    height={40}
                    className="h-full w-full object-contain rounded-lg"
                    priority
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-black tracking-tight text-[#1e3a8a] leading-none">
                    Labour<span className="text-[#ea580c]">Seva</span>
                  </span>
                  <span className="text-[10px] tracking-widest text-slate-400 font-bold uppercase mt-1">
                    Retailer Kendra Desk
                  </span>
                </div>
              </Link>
            </div>

            {/* Heading */}
            <div className="mb-8">
              <h2 className="text-[1.65rem] font-black tracking-tight text-slate-900 leading-tight">
                Welcome back
              </h2>
              <p className="mt-1.5 text-sm text-slate-500">
                Sign in to your retailer kendra desk to continue.
              </p>
            </div>

            {/* Error display */}
            {error && (
              <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2.5 animate-[fadeIn_0.2s_ease-out]">
                <AlertCircle
                  size={17}
                  className="flex-shrink-0 mt-0.5 text-rose-500"
                />
                <div>
                  <p className="font-semibold text-xs">Sign-in failed</p>
                  <p className="text-xs text-rose-600/90 mt-0.5">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Identifier */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-[0.12em] text-slate-700">
                  Kendra ID · Phone · Email
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
                    placeholder="Phone or Kendra email"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#1e3a8a] focus:ring-4 focus:ring-blue-100 transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold uppercase tracking-[0.12em] text-slate-700">
                    Kendra Password
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
                    placeholder="Enter your kendra password"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#1e3a8a] focus:ring-4 focus:ring-blue-100 transition-all"
                  />
                </div>
              </div>


              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#1e3a8a] to-[#1e40af] hover:from-[#1e40af] hover:to-[#1e3a8a] shadow-lg shadow-blue-900/20 hover:shadow-blue-900/30 focus:outline-none focus:ring-4 focus:ring-blue-200 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed group"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Authenticating Kendra...
                  </>
                ) : (
                  <>
                    <Lock
                      size={15}
                      className="group-hover:-translate-x-0.5 transition-transform"
                    />
                    Sign In to Kendra Desk
                    <ArrowRight
                      size={15}
                      className="group-hover:translate-x-0.5 transition-transform"
                    />
                  </>
                )}
              </button>
            </form>

            {/* Back link */}
            <div className="mt-7 text-center">
              <Link
                href="/"
                className="text-xs font-semibold text-slate-500 hover:text-[#1e3a8a] inline-flex items-center gap-1.5 transition-colors"
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
          <span>LabourSeva Retailer Desk · Secure partner access</span><a href="tel:18004251234" className="font-semibold text-[#1e3a8a] hover:underline">Help: 1800 425 1234</a>
        </div>
      </footer>

      {/* Tailwind keyframe fallback (if `animate-in` plugin not present) */}
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
