"use client";

import Link from "next/link";
import { useState } from "react";
import { Phone, ArrowRight, ArrowLeft, CheckCircle2, Shield, User, MapPin, AlertCircle } from "lucide-react";

type Step = 1 | 2 | 3 | 4;

const STEPS = [
  { num: 1, label: "Mobile" },
  { num: 2, label: "OTP" },
  { num: 3, label: "Profile" },
  { num: 4, label: "Done" },
];

export default function RegisterPage() {
  const [step, setStep] = useState<Step>(1);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [form, setForm] = useState({ name: "", dob: "", district: "", gender: "" });
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  function startCountdown() {
    setCountdown(45);
    const id = setInterval(() => setCountdown((c) => { if (c <= 1) { clearInterval(id); return 0; } return c - 1; }), 1000);
  }

  async function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setLoading(false);
    setStep(2);
    startCountdown();
  }

  function handleOtpChange(idx: number, val: string) {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    if (val && idx < 5) document.getElementById(`rotp-${idx + 1}`)?.focus();
  }

  async function handleStep2(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setLoading(false);
    setStep(3);
  }

  async function handleStep3(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1500));
    setLoading(false);
    setStep(4);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: "var(--bg-subtle)" }}>
      <div className="w-full max-w-lg">
        {/* Card */}
        <div className="rounded-[var(--radius-lg)] border shadow-[var(--shadow-lg)] p-8" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          {/* Logo + title */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg mx-auto mb-3" style={{ background: "var(--primary)" }}>
              LS
            </div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Create your account</h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Register to access LabourSeva services</p>
          </div>

          {/* Stepper */}
          <div className="flex items-center mb-8">
            {STEPS.map((s, i) => (
              <div key={s.num} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all"
                    style={{
                      background: step > s.num ? "var(--success)" : step === s.num ? "var(--primary)" : "transparent",
                      borderColor: step > s.num ? "var(--success)" : step === s.num ? "var(--primary)" : "var(--border)",
                      color: step >= s.num ? "white" : "var(--text-muted)",
                    }}
                  >
                    {step > s.num ? <CheckCircle2 size={14} /> : s.num}
                  </div>
                  <span className="text-[10px] font-medium hidden sm:block" style={{ color: step === s.num ? "var(--primary)" : "var(--text-muted)" }}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="flex-1 h-0.5 mx-2 mb-4" style={{ background: step > i + 1 ? "var(--success)" : "var(--border)" }} />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Phone */}
          {step === 1 && (
            <form onSubmit={handleStep1}>
              <label htmlFor="reg-phone" className="block text-sm font-medium mb-1.5" style={{ color: "var(--text)" }}>
                Mobile number (required)
              </label>
              <div className="flex items-center border rounded-[var(--radius-sm)] overflow-hidden mb-4" style={{ borderColor: "var(--border-strong)" }}>
                <div className="flex items-center gap-2 px-3 h-12 border-r flex-shrink-0" style={{ borderColor: "var(--border)", background: "var(--bg-subtle)" }}>
                  <Phone size={14} style={{ color: "var(--text-muted)" }} />
                  <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>+91</span>
                </div>
                <input
                  id="reg-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="98XXXXXXXX"
                  className="flex-1 px-3 h-12 text-sm outline-none bg-transparent"
                  style={{ color: "var(--text)" }}
                  required
                />
              </div>
              <p className="text-xs mb-5" style={{ color: "var(--text-muted)" }}>
                This number will be your login credential. Use a number you have regular access to.
              </p>
              <button
                type="submit"
                disabled={loading || phone.length !== 10}
                className="w-full h-12 rounded-full font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 hover:shadow-[var(--shadow-primary)] active:scale-[0.98]"
                style={{ background: "var(--primary)", color: "var(--on-primary)" }}
                aria-busy={loading}
              >
                {loading ? <><span className="spinner spinner-sm" />Sending OTP...</> : <>Send OTP <ArrowRight size={16} /></>}
              </button>
            </form>
          )}

          {/* Step 2: OTP */}
          {step === 2 && (
            <form onSubmit={handleStep2}>
              <p className="text-sm text-center mb-4" style={{ color: "var(--text-secondary)" }}>
                Enter the OTP sent to +91 {phone.slice(0, 2)}XXXXXX{phone.slice(-2)}
              </p>
              <div className="flex gap-2 justify-center mb-3">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    id={`rotp-${i}`}
                    type="text"
                    inputMode="numeric"
                    autoComplete={i === 0 ? "one-time-code" : "off"}
                    value={digit}
                    maxLength={1}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Backspace" && !otp[i] && i > 0) document.getElementById(`rotp-${i - 1}`)?.focus(); }}
                    className="w-11 h-13 text-center text-xl font-bold border rounded-[var(--radius-sm)] outline-none"
                    style={{
                      height: 52,
                      fontFamily: "var(--font-mono)",
                      background: "var(--bg-subtle)",
                      borderColor: digit ? "var(--primary)" : "var(--border-strong)",
                      color: "var(--text)",
                    }}
                  />
                ))}
              </div>
              <p className="text-center text-xs mb-5" style={{ color: "var(--text-muted)" }}>
                {countdown > 0 ? `Resend in 0:${String(countdown).padStart(2, "0")}` : "OTP expired"} · Valid for 5 minutes
              </p>
              <button
                type="submit"
                disabled={loading || otp.join("").length < 6}
                className="w-full h-12 rounded-full font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 hover:shadow-[var(--shadow-primary)] active:scale-[0.98]"
                style={{ background: "var(--primary)", color: "var(--on-primary)" }}
                aria-busy={loading}
              >
                {loading ? <><span className="spinner spinner-sm" />Verifying...</> : <>Verify OTP <ArrowRight size={16} /></>}
              </button>
              <button type="button" className="w-full mt-3 h-10 text-sm flex items-center justify-center gap-1" style={{ color: "var(--text-muted)" }} onClick={() => setStep(1)}>
                <ArrowLeft size={14} /> Change number
              </button>
            </form>
          )}

          {/* Step 3: Profile */}
          {step === 3 && (
            <form onSubmit={handleStep3} className="space-y-4">
              {[
                { id: "full-name", label: "Full name", type: "text", key: "name", placeholder: "As in Aadhaar card", autoComplete: "name" },
                { id: "dob", label: "Date of birth", type: "date", key: "dob", placeholder: "", autoComplete: "bday" },
              ].map(({ id, label, type, key, placeholder, autoComplete }) => (
                <div key={id}>
                  <label htmlFor={id} className="block text-sm font-medium mb-1.5" style={{ color: "var(--text)" }}>
                    {label} <span style={{ color: "var(--text-muted)" }}>(required)</span>
                  </label>
                  <input
                    id={id}
                    type={type}
                    value={(form as any)[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    placeholder={placeholder}
                    autoComplete={autoComplete}
                    className="w-full h-12 px-4 rounded-[var(--radius-sm)] border text-sm outline-none"
                    style={{ background: "var(--bg-subtle)", borderColor: "var(--border-strong)", color: "var(--text)" }}
                    required
                  />
                </div>
              ))}
              <div>
                <label htmlFor="district" className="block text-sm font-medium mb-1.5" style={{ color: "var(--text)" }}>District (required)</label>
                <select
                  id="district"
                  value={form.district}
                  onChange={(e) => setForm({ ...form, district: e.target.value })}
                  className="w-full h-12 px-4 rounded-[var(--radius-sm)] border text-sm outline-none"
                  style={{ background: "var(--bg-subtle)", borderColor: "var(--border-strong)", color: "var(--text)" }}
                  required
                >
                  <option value="">Select district</option>
                  {["Chennai", "Coimbatore", "Madurai", "Trichy", "Salem", "Erode", "Tirunelveli", "Vellore", "Thanjavur"].map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <p className="block text-sm font-medium mb-2" style={{ color: "var(--text)" }}>Gender (required)</p>
                <div className="flex gap-3">
                  {["Male", "Female", "Other"].map((g) => (
                    <label key={g} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="gender"
                        value={g}
                        checked={form.gender === g}
                        onChange={(e) => setForm({ ...form, gender: e.target.value })}
                        className="w-4 h-4"
                        style={{ accentColor: "var(--primary)" }}
                      />
                      <span className="text-sm" style={{ color: "var(--text)" }}>{g}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button type="button" className="h-12 px-4 rounded-full text-sm font-medium border flex items-center gap-1" style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }} onClick={() => setStep(2)}>
                  <ArrowLeft size={14} /> Back
                </button>
                <button
                  type="submit"
                  disabled={loading || !form.name || !form.dob || !form.district || !form.gender}
                  className="flex-1 h-12 rounded-full font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 hover:shadow-[var(--shadow-primary)] active:scale-[0.98]"
                  style={{ background: "var(--primary)", color: "var(--on-primary)" }}
                  aria-busy={loading}
                >
                  {loading ? <><span className="spinner spinner-sm" />Registering...</> : <>Complete Registration <ArrowRight size={16} /></>}
                </button>
              </div>
            </form>
          )}

          {/* Step 4: Done */}
          {step === 4 && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "var(--success-bg)" }}>
                <CheckCircle2 size={32} style={{ color: "var(--success)" }} />
              </div>
              <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text)" }}>Registration successful!</h2>
              <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>
                Welcome to LabourSeva, {form.name || "User"}. Your account has been created.
              </p>
              <p className="text-xs mb-6" style={{ color: "var(--text-muted)" }}>
                This is a demonstration. Real registration requires backend and SMS integration.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 h-12 px-8 rounded-full font-semibold text-sm hover:shadow-[var(--shadow-primary)]"
                style={{ background: "var(--primary)", color: "var(--on-primary)" }}
              >
                Sign in to your account
              </Link>
            </div>
          )}

          {step === 1 && (
            <p className="text-center text-sm mt-5" style={{ color: "var(--text-secondary)" }}>
              Already have an account?{" "}
              <Link href="/login" className="font-semibold underline hover:no-underline" style={{ color: "var(--primary)" }}>
                Sign in
              </Link>
            </p>
          )}
        </div>

        <p className="text-center text-xs mt-4 flex items-center justify-center gap-1" style={{ color: "var(--text-muted)" }}>
          <Shield size={12} /> Your data is encrypted and used only for service delivery.
        </p>
      </div>
    </div>
  );
}
