"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, Send, CheckCircle2, AlertTriangle, ShieldAlert } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import LanguageToggle from "@/components/LanguageToggle";
import { CapCaptcha } from "@/modules/captcha";

export default function StaffForgotPasswordPage() {
  const { isTamil } = useLanguage();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ message: string; resetUrl?: string } | null>(null);
  const [capToken, setCapToken] = useState("");
  const captchaRef = useRef<React.ComponentRef<typeof CapCaptcha>>(null);

  function refreshCaptcha() {
    setCapToken("");
    captchaRef.current?.reset();
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    if (!capToken) {
      setError(isTamil ? "பாதுகாப்பு சரிபார்ப்பை நிறைவு செய்யவும்." : "Please complete the security verification (Cap) first.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccessInfo(null);

      const res = await fetch("/api/staff/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), captchaToken: capToken }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || (isTamil ? "கடவுச்சொல் மீட்டமைப்பு கோரிக்கையை செயலாக்குவதில் தோல்வி." : "Failed to process password reset request."));
        refreshCaptcha();
        return;
      }

      setSuccessInfo({
        message: data.message,
        resetUrl: data.resetUrl,
      });
    } catch {
      setError(isTamil ? "எதிர்பாராத பிழை ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்." : "An unexpected error occurred. Please try again.");
      refreshCaptcha();
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
        <Link
          href="/staff/login"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          {isTamil ? "பணியாளர் உள்நுழைவுக்குத் திரும்பு" : "Back to Employee Sign In"}
        </Link>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
          {isTamil ? "பணியாளர் கடவுச்சொல் மீட்டெடுப்பு" : "Staff Password Recovery"}
        </h2>
        <p className="mt-1 text-xs text-slate-600">
          {isTamil
            ? "உங்கள் பதிவுசெய்த பணியாளர் மின்னஞ்சலை உள்ளிடவும். நேர வரம்பிற்குட்பட்ட ஒருமுறை பயன்பாட்டு இணைப்பு உருவாக்கப்படும்."
            : "Enter your registered employee email. A time-limited single-use reset link will be generated."}
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-slate-200/80 sm:px-10">
          {successInfo ? (
            <div className="space-y-4">
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-900">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-bold">
                      {isTamil ? "மீட்டமைப்பு வழிமுறைகள் அனுப்பப்பட்டன" : "Reset Instructions Issued"}
                    </h3>
                    <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
                      {successInfo.message}
                    </p>
                  </div>
                </div>
              </div>

              {successInfo.resetUrl && (
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-900">
                  <span className="font-bold block mb-1">
                    {isTamil ? "நேரடி பாதுகாப்பான டோக்கன் இணைப்பு:" : "Direct Secure Token Link:"}
                  </span>
                  <Link
                    href={successInfo.resetUrl}
                    className="font-mono text-[11px] text-[#1e3a8a] underline break-all hover:text-[#ea580c]"
                  >
                    {successInfo.resetUrl}
                  </Link>
                  <p className="text-[10px] text-blue-700 mt-2">
                    {isTamil
                      ? "60 நிமிடங்களுக்கு செல்லுபடியாகும். ஒருமுறை பயன்படுத்திய பிறகு டோக்கன் செல்லாததாக்கப்படும்."
                      : "Valid for 60 minutes. Token will be invalidated immediately after a single use."}
                  </p>
                </div>
              )}

              <Link
                href="/staff/login"
                className="w-full flex justify-center py-2.5 px-4 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                {isTamil ? "உள்நுழைவுக்குத் திரும்பு" : "Return to Login"}
              </Link>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
              {error && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 flex items-start gap-3 text-xs text-rose-800">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium leading-relaxed">{error}</div>
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-xs font-bold uppercase text-slate-700 tracking-wider">
                  {isTamil ? "பதிவுசெய்த பணியாளர் மின்னஞ்சல்" : "Registered Staff Email"}
                </label>
                <div className="mt-1 relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="officer@labourseva.tn.gov.in"
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 tracking-wider mb-1.5">
                  {isTamil ? "பாதுகாப்பு சரிபார்ப்பு" : "Security Verification"}
                </label>
                <CapCaptcha
                  ref={captchaRef}
                  action="staff_forgot_password"
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
                    {isTamil ? "டோக்கன் உருவாக்கப்படுகிறது..." : "Generating Token..."}
                  </span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{isTamil ? "மீட்டமைப்பு வழிமுறைகளை அனுப்பு" : "Issue Reset Instructions"}</span>
                  </>
                )}
              </button>

              <div className="rounded-lg bg-slate-50 p-3 text-[11px] text-slate-500 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span>
                  {isTamil
                    ? "அனைத்து மீட்பு நடவடிக்கைகளும் பணியாளர் நேர முத்திரை மற்றும் ஐபி பதிவுகளுடன் தணிக்கை செய்யப்படுகின்றன."
                    : "All recovery activities are audited with staff timestamp and IP records."}
                </span>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
