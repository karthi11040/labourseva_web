"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Lock, Mail, ArrowRight, AlertTriangle, KeyRound, Eye, EyeOff } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import LanguageToggle from "@/components/LanguageToggle";
export default function StaffLoginPage() {
  const router = useRouter();
  const { isTamil } = useLanguage();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/staff/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        if (res.status === 429 && data.lockoutSeconds) {
          setLockedUntil(Date.now() + data.lockoutSeconds * 1000);
        }
        setError(data.error || (isTamil ? "அங்கீகார தோல்வி. சான்றுகளை சரிபார்க்கவும்." : "Authentication failed."));
        return;
      }

      // Replace the login screen so Back does not return to an authenticated form.
      router.replace("/staff/dashboard");
      router.refresh();
    } catch {
      setError(isTamil ? "எதிர்பாராத பிணையப் பிழை ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்." : "An unexpected network error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans relative">
      {/* Language Toggle */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
        <LanguageToggle />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center items-center gap-3">
          <Image
            src="/images/Logo.webp"
            alt="LabourSeva logo"
            width={56}
            height={56}
            priority
            className="h-14 w-14 rounded-lg border border-slate-200 bg-white object-contain p-1 shadow-sm"
          />
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-[#ea580c] bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
              {isTamil ? "துறை செயல்பாடுகள்" : "Department Operations"}
            </span>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              {isTamil ? "லேபர்சேவா பணியாளர் மேசை" : "LabourSeva Staff Desk"}
            </h2>
          </div>
        </div>
        <p className="mt-2 text-center text-xs text-slate-600">
          {isTamil
            ? "ஆய்வு அலுவலர்கள், ஆய்வாளர்கள் மற்றும் சரிபார்ப்பு எழுத்தர்களுக்கான அதிகாரப்பூர்வ பணியாளர் தளம்."
            : "Official staff portal for Scrutiny Officers, Inspectors, and Verification Clerks."}
        </p>
        <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <Image
            src="/images/Receipt_head.webp"
            alt="Jai Jagan Nath Labour Welfare Board official banner"
            width={1600}
            height={288}
            priority
            sizes="(max-width: 640px) calc(100vw - 2rem), 448px"
            className="h-auto w-full object-contain"
          />
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-slate-200/80 sm:px-10">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 flex items-start gap-3 text-xs text-rose-800">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium leading-relaxed">{error}</div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-xs font-bold uppercase text-slate-700 tracking-wider">
                {isTamil ? "பணியாளர் மின்னஞ்சல் முகவரி" : "Staff Email Address"}
              </label>
              <div className="mt-1 relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  suppressHydrationWarning
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="officer@labourseva.tn.gov.in"
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a]"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-xs font-bold uppercase text-slate-700 tracking-wider">
                  {isTamil ? "கடவுச்சொல்" : "Password"}
                </label>
                <Link
                  href="/staff/forgot-password"
                  className="text-xs font-semibold text-[#1e3a8a] hover:text-[#ea580c] transition-colors"
                >
                  {isTamil ? "கடவுச்சொல் மறந்துவிட்டதா?" : "Forgot password?"}
                </Link>
              </div>
              <div className="mt-1 relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  suppressHydrationWarning
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                  aria-label={showPassword ? (isTamil ? "கடவுச்சொல்லை மறை" : "Hide password") : (isTamil ? "கடவுச்சொல்லைக் காட்டு" : "Show password")}
                  title={showPassword ? (isTamil ? "கடவுச்சொல்லை மறை" : "Hide password") : (isTamil ? "கடவுச்சொல்லைக் காட்டு" : "Show password")}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>


            <div>
              <button
                type="submit"
                disabled={loading || Boolean(lockedUntil && lockedUntil > Date.now())}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-[#1e3a8a] hover:bg-[#1e40af] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1e3a8a] disabled:opacity-50 transition-all cursor-pointer"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {isTamil ? "சரிபார்க்கப்படுகிறது..." : "Authenticating..."}
                  </span>
                ) : (
                  <>
                    <span>{isTamil ? "பணியாளர் மேசையில் உள்நுழைக" : "Sign in to Employee Desk"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-4 text-center">
            <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-slate-400" />
              {isTamil
                ? "பணியாளர் கணக்குகள் முதன்மை நிர்வாகிகளால் மட்டுமே வழங்கப்படுகின்றன."
                : "Employee accounts are provisioned exclusively by Super Administrators."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
