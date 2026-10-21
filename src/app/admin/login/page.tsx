"use client";

import React, { FormEvent, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RefreshCw, Shield, AlertCircle, Eye, EyeOff } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import LanguageToggle from "@/components/LanguageToggle";
import { CapCaptcha, CapCaptchaHandle } from "@/modules/captcha";

export default function AdminLoginPage() {
  const router = useRouter();
  const { isTamil } = useLanguage();
  const captchaRef = useRef<CapCaptchaHandle>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [lockedUntil, setLockedUntil] = useState(0);

  useEffect(() => {
    const storedLock = Number(window.sessionStorage.getItem("labourseva-admin-lock") || 0);
    if (storedLock > Date.now()) {
      setLockedUntil(storedLock);
    }
    // SECURITY: no pre-filled credentials (was: email = "lla@gmail.com").
  }, []);

  const isLocked = lockedUntil > Date.now();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isLocked || isSubmitting) return;

    if (!email.trim()) {
      setError(isTamil ? "உங்கள் நிர்வாகி மின்னஞ்சலை உள்ளிடவும்." : "Please enter your administrator email.");
      return;
    }
    if (password.length < 12) {
      setError(isTamil ? "நிர்வாகப் பாதுகாப்பிற்கு கடவுச்சொல் குறைந்தபட்சம் 12 எழுத்துகளைக் கொண்டிருக்க வேண்டும்." : "Password must contain at least 12 characters for admin security.");
      return;
    }
    if (!captchaToken) {
      setError(isTamil ? "பாதுகாப்பு சரிபார்ப்பை நிறைவு செய்யவும்." : "Please complete the security verification first.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");

      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          captchaToken,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        if (res.status === 429 && data.lockedUntil) {
          setLockedUntil(data.lockedUntil);
          window.sessionStorage.setItem("labourseva-admin-lock", String(data.lockedUntil));
        }
        setError(data.error || (isTamil ? "அங்கீகார தோல்வி. சான்றுகளை சரிபார்க்கவும்." : "Authentication failed. Please check credentials."));
        // Cap tokens are single-use — request a fresh challenge for the retry.
        setCaptchaToken("");
        captchaRef.current?.reset();
        return;
      }

      // Success: mark active session flag for client navigation
      window.sessionStorage.setItem("labourseva-admin-session", "active");
      window.sessionStorage.removeItem("labourseva-admin-lock");
      router.replace("/admin/dashboard");
    } catch {
      setError(isTamil ? "பாதுகாப்பு வாயிலுடன் இணைக்க முடியவில்லை. இணைய இணைப்பை சரிபார்க்கவும்." : "Unable to connect to security gateway. Please verify network connection.");
      setCaptchaToken("");
      captchaRef.current?.reset();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4 selection:bg-indigo-100 selection:text-indigo-900 font-sans relative">
      {/* Top Language Toggle */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
        <LanguageToggle />
      </div>

      {/* Main Authentication Card */}
      <div className="w-full max-w-[440px] bg-white rounded-2xl shadow-[0_20px_50px_rgba(15,23,42,0.06)] border border-slate-200/80 overflow-hidden transition-all">
        {/* Top Orange Accent Line */}
        <div className="h-1.5 w-full bg-[#ea580c]" />

        <div className="p-7 sm:p-9 space-y-6">
          {/* Card Title & Icon */}
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-50/90 border border-blue-100 flex items-center justify-center text-[#1e3a8a] shrink-0 shadow-xs">
              <Shield size={20} className="text-[#1e3a8a]" />
            </div>
            <div>
              <span className="block text-[11px] font-extrabold uppercase tracking-wider text-[#ea580c]">
                {isTamil ? "வரையறுக்கப்பட்ட அணுகல்" : "Restricted Access"}
              </span>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                {isTamil ? "முதன்மை நிர்வாகி உள்நுழைவு" : "Super Admin Login"}
              </h1>
              <p className="text-xs text-slate-500 mt-1 font-normal leading-normal">
                {isTamil ? "நிர்வாகக் கட்டுப்பாடுகளுக்கு சரிபார்க்கப்பட்ட சான்றுகள் தேவை." : "Administration controls require verified credentials."}
              </p>
            </div>
          </div>

          {/* Security Notice Box */}
          <div className="rounded-xl bg-[#f8fafc] border border-slate-200/80 p-3.5 text-[11px] text-slate-500 leading-relaxed font-normal">
            {isTamil
              ? "அனைத்து உள்நுழைவு முயற்சிகளும் பாதுகாப்பு மதிப்பாய்வுக்காக கண்காணிக்கப்பட்டு பதிவு செய்யப்படுகின்றன. அங்கீகரிக்கப்படாத அணுகல் கண்டிப்பாக தடைசெய்யப்பட்டுள்ளது."
              : "All login attempts are monitored and recorded for security review. Unauthorized access is strictly prohibited."}
          </div>

          {/* Error Notice */}
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700 flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Administrator Email */}
            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">
                {isTamil ? "நிர்வாகி மின்னஞ்சல்" : "Administrator Email"}
              </label>
              <input
                type="email"
                required
                suppressHydrationWarning
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={isTamil ? "நிர்வாகி மின்னஞ்சல்" : "Mail"}
                className="w-full h-11 px-3.5 bg-[#f8fafc] hover:bg-slate-50 focus:bg-white border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">
                {isTamil ? "கடவுச்சொல்" : "Password"}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  suppressHydrationWarning
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••••••"
                  className="w-full h-11 pl-3.5 pr-10 bg-[#f8fafc] hover:bg-slate-50 focus:bg-white border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors focus:outline-none"
                  title={showPassword ? (isTamil ? "கடவுச்சொல்லை மறை" : "Hide password") : (isTamil ? "கடவுச்சொல்லைக் காட்டு" : "Show password")}
                  aria-label={showPassword ? (isTamil ? "கடவுச்சொல்லை மறை" : "Hide password") : (isTamil ? "கடவுச்சொல்லைக் காட்டு" : "Show password")}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <span className="block text-[10px] text-slate-400 mt-1.5 font-normal">
                {isTamil ? "நிர்வாகப் பாதுகாப்பிற்கு குறைந்தபட்சம் 12 எழுத்துகள் தேவை." : "Minimum 12 characters required for admin security."}
              </span>
            </div>

            {/* Security Verification (Cap) */}
            <div className="pt-1">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">
                {isTamil ? "பாதுகாப்பு சரிபார்ப்பு" : "Security Verification"}
              </label>
              <CapCaptcha
                ref={captchaRef}
                action="admin_login"
                compact
                onVerified={setCaptchaToken}
                onReset={() => setCaptchaToken("")}
              />
            </div>

            {/* Secure Sign In Action Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLocked || isSubmitting}
                className="w-full h-11 rounded-xl bg-[#2e2a72] hover:bg-[#252163] active:scale-[0.99] text-white text-xs font-extrabold uppercase tracking-wider shadow-md shadow-indigo-950/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin text-white" />
                    {isTamil ? "சரிபார்க்கப்படுகிறது..." : "Authenticating Gateway..."}
                  </>
                ) : isLocked ? (
                  isTamil ? "தற்காலிகமாக பூட்டப்பட்டது (5 நிமிடம் காத்திருக்கவும்)" : "Temporarily Locked (Wait 5 min)"
                ) : (
                  isTamil ? "பாதுகாப்பாக உள்நுழைக" : "Secure Sign In"
                )}
              </button>
            </div>
          </form>

          {/* Card Footer Warning */}
          <p className="text-[10px] text-slate-400 text-center leading-normal pt-2 font-normal">
            {isTamil
              ? "அங்கீகரிக்கப்பட்ட நிர்வாகக் கணக்கை மட்டுமே பயன்படுத்தவும். அணுகல் கிடைக்கவில்லை என்றால் அல்லது பாதுகாப்பு மீறல் சந்தேகப்பட்டால் உதவி மையத்தை தொடர்பு கொள்ளவும்."
              : "Use only an approved administrator account. Contact platform security if access is unavailable or if you suspect a compromise."}
          </p>
        </div>
      </div>

      {/* Footer Navigation Links */}
      <div className="mt-8 flex items-center justify-center gap-8 text-[11px] font-bold uppercase tracking-wider text-slate-400">
        <Link href="/privacy" className="hover:text-slate-600 transition-colors">
          {isTamil ? "தனியுரிமைக் கொள்கை" : "Privacy Policy"}
        </Link>
        <Link href="/contact" className="hover:text-slate-600 transition-colors">
          {isTamil ? "உதவி மையம்" : "Support Center"}
        </Link>
      </div>
    </div>
  );
}
