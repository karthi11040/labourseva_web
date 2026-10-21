"use client";

import Link from "next/link";
import Image from "next/image";
import LoginAdPanel from "@/components/ads/LoginAdPanel";
import { useEffect, useState, Suspense, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Shield,
  ArrowLeft,
  Loader2,
  Phone,
  KeyRound,
  ShieldCheck,
  Users,
  Clock,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Info,
} from "lucide-react";
import { getCitizenSession, saveCitizenSession } from "@/lib/citizen-session";
import { CapCaptcha } from "@/modules/captcha";

// ---------------------------------------------------------------------------
// Citizen login: phone -> OTP -> HttpOnly session cookie. Both steps are
// protected by the self-hosted Cap CAPTCHA (proof-of-humanity). Sessions are
// minted SERVER-SIDE by /api/auth/otp/send + /verify. The client only tracks
// the "remembered number" hint in localStorage — it can no longer mint its
// own session.
// ---------------------------------------------------------------------------

function UserLoginForm({ registration = false }: { registration?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect") || "/user/dashboard";

  const [phone, setPhone] = useState("");
  const [channel, setChannel] = useState<"sms" | "email">("sms");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const [activeAccount, setActiveAccount] = useState<string | null>(null);
  const [capToken, setCapToken] = useState("");
  const captchaRef = useRef<React.ComponentRef<typeof CapCaptcha>>(null);

  // Each API request must carry a fresh, unconsumed Cap token — refresh the
  // challenge whenever the step changes and after every failed attempt.
  function refreshCaptcha() {
    setCapToken("");
    captchaRef.current?.reset();
  }

  useEffect(() => {
    setCapToken("");
    captchaRef.current?.reset();
  }, [step]);

  useEffect(() => {
    const session = getCitizenSession();
    if (session?.phone) {
      setActiveAccount(session.phone);
    }
  }, []);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const identifier = channel === "email" ? phone.trim().toLowerCase() : phone;
    if (channel === "sms" ? !/^[6-9]\d{9}$/.test(identifier) : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) {
      setError(channel === "email" ? "Please enter a valid email address." : "Please enter a valid 10-digit mobile number");
      return;
    }
    if (!capToken) {
      setError("Please complete the security verification (Cap) first.");
      return;
    }
    setLoading(true);
    fetch("/api/auth/otp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, channel, captchaToken: capToken }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok) {
          setStep("otp");
          setInfo(data.message || (channel === "email" ? "OTP sent to your email." : "OTP sent to your mobile number."));
          setResendIn(60);
        } else {
          setError(data?.error || "Could not send OTP. Please try again.");
          refreshCaptcha();
        }
      })
      .catch(() => {
        setError("Network error. Please check your connection and try again.");
        refreshCaptcha();
      })
      .finally(() => setLoading(false));
  }

  function handleVerifyOtp(code?: string) {
    const value = code ?? otp.join("");
    if (value.length !== 6) {
      setError("Please enter all 6 digits of the OTP");
      return;
    }
    setError("");
    setLoading(true);
    fetch("/api/auth/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: channel === "email" ? phone.trim().toLowerCase() : phone, channel, code: value }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok) {
          // Session cookie was set server-side (HttpOnly). Only keep a
          // non-sensitive "last used number" hint for this device.
          saveCitizenSession({
            phone: data.user?.phone || phone,
            name: data.user?.name || "Citizen Beneficiary",
          });
          router.replace(data.redirectUrl || redirectTarget);
        } else {
          setError(
            data?.error || "Incorrect OTP. Please enter the correct code or request a new OTP."
          );
          setOtp(["", "", "", "", "", ""]);
          setLoading(false);
          setTimeout(() => {
            document.getElementById("otp-input-0")?.focus();
          }, 100);
        }
      })
      .catch(() => {
        setError("Network error. Please check your connection and try again.");
        setOtp(["", "", "", "", "", ""]);
        setLoading(false);
        setTimeout(() => {
          document.getElementById("otp-input-0")?.focus();
        }, 100);
      });
  }

  function handleResend() {
    if (resendIn > 0 || loading) return;
    setError("");
    setInfo("");
    setOtp(["", "", "", "", "", ""]);
    setLoading(true);
    fetch("/api/auth/otp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: channel === "email" ? phone.trim().toLowerCase() : phone, channel, isResend: true }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok) {
          setInfo(data.message || "A new OTP has been sent to your mobile number.");
          setResendIn(60);
          setTimeout(() => {
            document.getElementById("otp-input-0")?.focus();
          }, 100);
        } else {
          setError(
            data?.error || "Could not resend OTP. Please wait before requesting another."
          );
        }
      })
      .catch(() => setError("Network error. Please try again."))
      .finally(() => {
        setLoading(false);
      });
  }

  function handleOtpChange(index: number, val: string) {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[index] = val.slice(-1);
    setOtp(next);
    if (val && index < 5) {
      document.getElementById(`otp-input-${index + 1}`)?.focus();
    }
    // When the last digit is filled, verify immediately.
    if (val && index === 5 && next.join("").length === 6) {
      handleVerifyOtp(next.join(""));
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    // Backspace: jump to previous when empty
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      document.getElementById(`otp-input-${index - 1}`)?.focus();
    }
    // Arrow navigation
    if (e.key === "ArrowLeft" && index > 0) {
      document.getElementById(`otp-input-${index - 1}`)?.focus();
    }
    if (e.key === "ArrowRight" && index < 5) {
      document.getElementById(`otp-input-${index + 1}`)?.focus();
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    const next = ["", "", "", "", "", ""];
    pasted.split("").forEach((c, i) => (next[i] = c));
    setOtp(next);
    if (pasted.length === 6) {
      handleVerifyOtp(pasted);
    } else {
      document.getElementById(`otp-input-${pasted.length}`)?.focus();
    }
  }

  function editPhoneAgain() {
    setStep("phone");
    setOtp(["", "", "", "", "", ""]);
    setError("");
    setInfo("");
    setResendIn(0);
  }

  return (
    <div className="min-h-screen w-full bg-slate-100/70 flex flex-col font-sans antialiased">
      <header className="w-full border-b-2 border-[#ea580c] bg-white">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/images/Logo.webp" alt="LabourSeva logo" width={40} height={40} className="h-10 w-10 object-contain" priority />
            <span className="text-lg font-black text-[#1e3a8a]">Labour<span className="text-[#ea580c]">Seva</span></span>
            <span className="text-xs font-medium text-slate-500">Citizen Portal</span>
          </Link>
          <Link href="/" className="min-h-11 inline-flex items-center text-xs font-semibold text-slate-600 hover:text-[#1e3a8a]">Main Portal</Link>
        </div>
      </header>
      <div className="flex flex-1 items-center justify-center px-0 sm:px-4">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] bg-white shadow-2xl shadow-slate-900/10 lg:my-6 lg:min-h-[calc(100vh-10rem)] lg:rounded-3xl overflow-hidden border border-slate-200/70">

        <LoginAdPanel placement={registration ? "USER_SIGNUP" : "USER_LOGIN"} audience="Citizen" />



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
                    Citizen Portal
                  </span>
                </div>
              </Link>
            </div>

            {/* Heading */}
            <div className="mb-7">
              <h2 className="text-[1.65rem] font-black tracking-tight text-slate-900 leading-tight">
                {step === "phone" ? (registration ? "Create your citizen account" : "Sign in to continue") : "Verify your number"}
              </h2>
              <p className="mt-1.5 text-sm text-slate-500">
                {step === "phone"
                  ? "We'll send a 6-digit code to your mobile."
                  : (
                    <>
                      Enter the code sent to{" "}
                      <span className="font-semibold text-slate-700">
                        {channel === "sms" ? `+91 ${phone}` : phone}
                      </span>
                    </>
                  )}
              </p>
            </div>

            {/* Info banner */}
            {info && (
              <div
                role="status"
                className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start gap-2.5 animate-[fadeIn_0.2s_ease-out]"
              >
                <Info size={16} className="flex-shrink-0 mt-0.5 text-emerald-600" />
                <span className="text-xs font-medium">{info}</span>
              </div>
            )}


            {/* Error banner */}
            {error && (
              <div
                role="alert"
                className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2.5 animate-[fadeIn_0.2s_ease-out]"
              >
                <AlertCircle
                  size={16}
                  className="flex-shrink-0 mt-0.5 text-rose-500"
                />
                <div>
                  <p className="font-semibold text-xs">Action needed</p>
                  <p className="text-xs text-rose-600/90 mt-0.5">{error}</p>
                </div>
              </div>
            )}

            {step === "phone" ? (
              <form onSubmit={handleSendOtp} className="space-y-5">
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
                  <button type="button" onClick={() => { setChannel("sms"); setPhone(""); }} className={`rounded-lg px-3 py-2 text-xs font-bold ${channel === "sms" ? "bg-white text-[#1e3a8a] shadow-sm" : "text-slate-500"}`}>SMS OTP</button>
                  <button type="button" onClick={() => { setChannel("email"); setPhone(""); }} className={`rounded-lg px-3 py-2 text-xs font-bold ${channel === "email" ? "bg-white text-[#1e3a8a] shadow-sm" : "text-slate-500"}`}>Email OTP</button>
                </div>

                {/* Identifier */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="phone"
                    className="block text-[11px] font-bold uppercase tracking-[0.12em] text-slate-700"
                  >
                    {channel === "sms" ? "Mobile Number" : "Email Address"}
                  </label>
                  <div className="group relative">
                    {channel === "sms" && <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#ea580c] transition-colors flex items-center gap-1">
                      <span className="text-xs font-bold text-slate-500 group-focus-within:text-[#ea580c]">
                        +91
                      </span>
                    </span>}
                    {channel === "sms" && <span className="absolute left-12 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#ea580c] transition-colors">
                      <Phone size={15} />
                    </span>}
                    <input
                      id="phone"
                      type={channel === "sms" ? "tel" : "email"}
                      inputMode={channel === "sms" ? "numeric" : "email"}
                      autoComplete={channel === "sms" ? "tel" : "email"}
                      value={phone}
                      onChange={(e) =>
                        setPhone(channel === "sms" ? e.target.value.replace(/\D/g, "").slice(0, 10) : e.target.value)
                      }
                      placeholder={channel === "sms" ? "98765 43210" : "you@example.com"}
                      className={`w-full ${channel === "sms" ? "pl-[4.5rem]" : "pl-4"} pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-base tracking-wide text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#1e3a8a] focus:ring-4 focus:ring-blue-100 transition-all`}
                      disabled={loading}
                      required
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 pl-1">
                    {channel === "sms" ? "We'll send a one-time code by SMS." : "We'll send a one-time code to this email address."}
                  </p>
                </div>

                {/* Cap security verification */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-[0.12em] text-slate-700 mb-1.5">
                    Security Verification
                  </label>
                  <CapCaptcha
                    ref={captchaRef}
                    action="otp_send"
                    compact
                    onVerified={setCapToken}
                    onReset={() => setCapToken("")}
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading || (channel === "sms" ? phone.length !== 10 : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(phone.trim()))}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#1e3a8a] to-[#1e40af] hover:from-[#1e40af] hover:to-[#1e3a8a] shadow-lg shadow-blue-900/20 hover:shadow-blue-900/30 focus:outline-none focus:ring-4 focus:ring-blue-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Sending OTP...
                    </>
                  ) : (
                    <>
                      Send OTP
                      <ArrowRight
                        size={15}
                        className="group-hover:translate-x-0.5 transition-transform"
                      />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleVerifyOtp();
                }}
                className="space-y-5"
              >
                {/* OTP box */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-[0.12em] text-slate-700">
                    Enter 6-digit OTP
                  </label>
                  <div
                    className="flex gap-2 justify-between"
                    id="otp-inputs"
                    onPaste={handleOtpPaste}
                  >
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        id={`otp-input-${i}`}
                        type="text"
                        inputMode="numeric"
                        autoComplete={i === 0 ? "one-time-code" : "off"}
                        value={digit}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        className={`w-12 h-14 text-center text-xl font-bold rounded-xl border bg-slate-50 outline-none transition-all focus:bg-white focus:ring-4 focus:ring-blue-100 ${
                          digit
                            ? "border-[#1e3a8a] text-[#1e3a8a] bg-blue-50/50"
                            : "border-slate-200 text-slate-900 focus:border-[#1e3a8a]"
                        }`}
                        disabled={loading}
                        maxLength={1}
                        autoFocus={i === 0}
                      />
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 pl-1 flex items-center gap-1">
                    <KeyRound size={11} />
                    Tip: you can paste the entire OTP at once.
                  </p>
                </div>


                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#1e3a8a] to-[#1e40af] hover:from-[#1e40af] hover:to-[#1e3a8a] shadow-lg shadow-blue-900/20 hover:shadow-blue-900/30 focus:outline-none focus:ring-4 focus:ring-blue-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={15} />
                      Verify & Sign In
                      <ArrowRight
                        size={15}
                        className="group-hover:translate-x-0.5 transition-transform"
                      />
                    </>
                  )}
                </button>

                {/* Footer row: back + resend */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={editPhoneAgain}
                    className="inline-flex items-center gap-1.5 text-slate-500 hover:text-[#1e3a8a] font-semibold transition-colors"
                    disabled={loading}
                  >
                    <ArrowLeft size={14} /> Change {channel === "sms" ? "number" : "email"}
                  </button>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendIn > 0 || loading}
                    className="inline-flex items-center gap-1.5 text-[#1e3a8a] hover:text-[#1e40af] font-bold disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
                  >
                    <RefreshCw size={13} className={resendIn > 0 ? "" : "group-hover:rotate-180 transition-transform duration-300"} />
                    {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend OTP"}
                  </button>
                </div>
              </form>
            )}

            {/* Register CTA */}
            <div className="mt-7 pt-6 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-500">
                {registration ? "Already registered? " : "New citizen? "}{" "}
                <Link
                  href={registration ? "/user/login" : "/user/register"}
                  className="text-[#1e3a8a] font-bold hover:underline inline-flex items-center gap-1"
                >
                  {registration ? "Sign in" : "Create an account"}
                  <ArrowRight size={12} />
                </Link>
              </p>
            </div>
          </div>
        </main>
      </div>
      </div>

      <footer className="w-full border-t border-slate-200 bg-white">
        <div className="mx-auto flex min-h-14 max-w-7xl flex-col items-center justify-between gap-2 px-4 py-3 text-center text-[11px] text-slate-500 sm:flex-row sm:px-6 sm:text-left">
          <span>LabourSeva Citizen Portal · Secure access</span><a href="tel:18004251234" className="font-semibold text-[#1e3a8a] hover:underline">Help: 1800 425 1234</a>
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

export default function UserLoginPage() {
  return (
    <Suspense fallback={null}>
      <UserLoginForm />
    </Suspense>
  );
}

export function UserRegisterPage() {
  return (
    <Suspense fallback={null}>
      <UserLoginForm registration />
    </Suspense>
  );
}
