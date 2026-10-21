"use client";

import { useState, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, CheckCircle2, AlertTriangle, KeyRound, ArrowRight } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import LanguageToggle from "@/components/LanguageToggle";
import { CapCaptcha } from "@/modules/captcha";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";
  const { isTamil } = useLanguage();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [capToken, setCapToken] = useState("");
  const captchaRef = useRef<React.ComponentRef<typeof CapCaptcha>>(null);

  function refreshCaptcha() {
    setCapToken("");
    captchaRef.current?.reset();
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError(isTamil ? "மீட்டமைப்பு டோக்கன் இல்லை அல்லது தவறானது." : "Missing or invalid password reset token.");
      return;
    }
    if (newPassword.length < 8) {
      setError(isTamil ? "கடவுச்சொல் குறைந்தபட்சம் 8 எழுத்துகள் இருக்க வேண்டும்." : "Password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(isTamil ? "கடவுச்சொற்கள் பொருந்தவில்லை." : "Password and confirmation do not match.");
      return;
    }
    if (!capToken) {
      setError(isTamil ? "பாதுகாப்பு சரிபார்ப்பை நிறைவு செய்யவும்." : "Please complete the security verification (Cap) first.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/staff/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword, captchaToken: capToken }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || (isTamil ? "கடவுச்சொல்லை மீட்டமைப்பதில் தோல்வி." : "Failed to reset password."));
        refreshCaptcha();
        return;
      }

      setSuccess(true);
    } catch {
      setError(isTamil ? "எதிர்பாராத பிணையப் பிழை ஏற்பட்டது." : "An unexpected network error occurred.");
      refreshCaptcha();
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="rounded-xl bg-amber-50 border border-amber-200 p-6 text-center space-y-4">
        <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto" />
        <h3 className="text-sm font-bold text-amber-900">
          {isTamil ? "தவறான அல்லது விடுபட்ட மீட்டமைப்பு டோக்கன்" : "Invalid or Missing Reset Token"}
        </h3>
        <p className="text-xs text-amber-700 leading-relaxed">
          {isTamil
            ? "உங்கள் அழைப்பிதழ் அல்லது மீட்பு செய்தியில் வழங்கப்பட்ட இணைப்பை சரிபார்க்கவும்."
            : "Please check the link provided in your invitation or recovery message."}
        </p>
        <Link
          href="/staff/forgot-password"
          className="inline-block text-xs font-bold text-[#1e3a8a] underline"
        >
          {isTamil ? "புதிய மீட்பு இணைப்பைக் கோரவும்" : "Request New Recovery Link"}
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-6 text-center space-y-4">
        <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
        <h3 className="text-base font-bold text-emerald-950">
          {isTamil ? "கடவுச்சொல் வெற்றிகரமாக புதுப்பிக்கப்பட்டது" : "Password Successfully Updated"}
        </h3>
        <p className="text-xs text-emerald-700 leading-relaxed">
          {isTamil
            ? "உங்கள் சான்றுகள் பாதுகாப்பாக புதுப்பிக்கப்பட்டுள்ளன. மீட்டமைப்பு டோக்கன் செல்லாததாக்கப்பட்டுள்ளது."
            : "Your credentials have been securely updated. The reset token has been invalidated."}
        </p>
        <Link
          href="/staff/login"
          className="inline-flex items-center gap-2 justify-center py-2.5 px-6 rounded-lg text-xs font-bold text-white bg-[#1e3a8a] hover:bg-[#1e40af] transition-colors"
        >
          <span>{isTamil ? "பணியாளர் மேசையில் உள்நுழைக" : "Sign In to Employee Desk"}</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {error && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 flex items-start gap-3 text-xs text-rose-800">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{error}</div>
        </div>
      )}

      <div>
        <label htmlFor="newPassword" className="block text-xs font-bold uppercase text-slate-700 tracking-wider">
          {isTamil ? "புதிய கடவுச்சொல்" : "New Password"}
        </label>
        <div className="mt-1 relative rounded-lg shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Lock className="h-4 w-4 text-slate-400" />
          </div>
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder={isTamil ? "குறைந்தபட்சம் 8 எழுத்துகள்" : "Minimum 8 characters"}
            className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a]"
          />
        </div>
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-xs font-bold uppercase text-slate-700 tracking-wider">
          {isTamil ? "கடவுச்சொல்லை உறுதிப்படுத்தவும்" : "Confirm Password"}
        </label>
        <div className="mt-1 relative rounded-lg shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Lock className="h-4 w-4 text-slate-400" />
          </div>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder={isTamil ? "புதிய கடவுச்சொல்லை மீண்டும் உள்ளிடவும்" : "Re-enter new password"}
            className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a]"
          />
        </div>
      </div>

      {/* Cap security verification */}
      <div>
        <label className="block text-xs font-bold uppercase text-slate-700 tracking-wider mb-1.5">
          {isTamil ? "பாதுகாப்பு சரிபார்ப்பு" : "Security Verification"}
        </label>
        <CapCaptcha
          ref={captchaRef}
          action="staff_reset_password"
          compact
          onVerified={setCapToken}
          onReset={() => setCapToken("")}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-[#1e3a8a] hover:bg-[#1e40af] disabled:opacity-50 transition-all cursor-pointer"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            {isTamil ? "சான்றுகள் புதுப்பிக்கப்படுகின்றன..." : "Updating Credentials..."}
          </span>
        ) : (
          <span>{isTamil ? "புதிய கடவுச்சொல்லைச் சேமிக்கவும்" : "Save New Password"}</span>
        )}
      </button>
    </form>
  );
}

export default function StaffResetPasswordPage() {
  const { isTamil } = useLanguage();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans relative">
      {/* Language Toggle */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
        <LanguageToggle />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex items-center gap-2 mb-2">
          <KeyRound className="w-5 h-5 text-[#ea580c]" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#ea580c]">
            {isTamil ? "பாதுகாப்பான டோக்கன் சரிபார்ப்பு" : "Secure Token Verification"}
          </span>
        </div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
          {isTamil ? "பணியாளர் கடவுச்சொல்லை அமைக்கவும்" : "Set Employee Password"}
        </h2>
        <p className="mt-1 text-xs text-slate-600">
          {isTamil
            ? "உங்கள் லேபர்சேவா பணியாளர் கணக்கிற்கான பாதுகாப்பான கடவுச்சொல்லை அமைக்கவும்."
            : "Set a secure password for your LabourSeva employee account."}
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-slate-200/80 sm:px-10">
          <Suspense fallback={<div className="text-center py-6 text-xs text-slate-500">{isTamil ? "டோக்கன் சரிபார்க்கப்படுகிறது..." : "Validating token..."}</div>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
