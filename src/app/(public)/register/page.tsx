"use client";

import Link from "next/link";
import { useState, useRef } from "react";
import {
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Building2,
  ArrowRight,
  Shield,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MapPin,
} from "lucide-react";
import { CapCaptcha } from "@/modules/captcha";
import LoginAdPanel from "@/components/ads/LoginAdPanel";

export default function RegisterPage() {
  const [role, setRole] = useState<"customer" | "retailer">("customer");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [shopName, setShopName] = useState("");
  const [shopUrl, setShopUrl] = useState("");
  const [gstNo, setGstNo] = useState("");
  const [district, setDistrict] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [terms, setTerms] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [capToken, setCapToken] = useState("");
  const captchaRef = useRef<React.ComponentRef<typeof CapCaptcha>>(null);

  function refreshCaptcha() {
    setCapToken("");
    captchaRef.current?.reset();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name || name.length < 2) {
      setError("Please provide your full legal name or authorized business name.");
      return;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please provide a valid email address.");
      return;
    }

    if (!phone || phone.length !== 10) {
      setError("Please provide a valid 10-digit mobile number.");
      return;
    }

    if (role === "retailer" && !shopName) {
      setError("Please provide your Kendra or business name.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!terms) {
      setError("You must accept the terms of service and privacy policy.");
      return;
    }

    if (!capToken) {
      setError("Please complete the security verification (Cap) first.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          name,
          email,
          phone,
          shopName: role === "retailer" ? shopName : undefined,
          shopUrl: role === "retailer" ? shopUrl : undefined,
          gstNo: role === "retailer" ? gstNo : undefined,
          district: role === "retailer" ? district : undefined,
          password,
          confirmPassword,
          terms,
          captchaToken: capToken,
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setRegisteredEmail(email);
        setSuccess(true);
      } else {
        setError(data.error || "Registration could not be completed.");
        refreshCaptcha();
      }
    } catch {
      setError("Network communication error. Please check your internet connection.");
      refreshCaptcha();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-12rem)] flex items-center justify-center px-4 py-12" style={{ background: "var(--bg-subtle)" }}>
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] overflow-hidden rounded-2xl border bg-white shadow-[var(--shadow-lg)]" style={{ borderColor: "var(--border)" }}>
        <LoginAdPanel placement={role === "retailer" ? "RETAILER_SIGNUP" : "CUSTOMER_SIGNUP"} audience={role === "retailer" ? "Retailer" : "Customer"} />
        <div className="w-full max-w-lg mx-auto">
        <div className="rounded-2xl border p-6 sm:p-8 shadow-[var(--shadow-lg)]" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg mx-auto mb-3" style={{ background: "var(--primary)" }}>
              LS
            </div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
              Create LabourSeva Account
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Government of Tamil Nadu · Labour & Employment Services Portal
            </p>
          </div>

          {success ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 ring-8 ring-emerald-50/50">
                <CheckCircle2 size={36} />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Registration Submitted!</h2>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                A secure verification link has been dispatched to <strong>{registeredEmail}</strong>.
              </p>

              <div className="my-6 p-4 rounded-xl border border-blue-200 bg-blue-50/60 text-left">
                <div className="flex items-start gap-2.5">
                  <Shield className="w-5 h-5 text-[#1e3a8a] shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-xs font-bold text-[#1e3a8a] uppercase tracking-wider">Two-Step Verification Protocol</h3>
                    <ol className="text-xs text-slate-700 mt-1.5 list-decimal list-inside space-y-1 leading-normal">
                      <li><strong>Step 1:</strong> Open your email and select <em>Verify Email Address</em>.</li>
                      <li><strong>Step 2:</strong> Your account is automatically queued for officer review.</li>
                      <li><strong>Step 3:</strong> You will receive an official approval confirmation by <strong>Email and SMS</strong>.</li>
                    </ol>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <Link
                  href="/login"
                  className="w-full h-12 rounded-full font-semibold text-sm flex items-center justify-center gap-2 text-white bg-[#1e3a8a] hover:bg-[#1e40af] transition-all shadow-sm"
                >
                  Proceed to Sign In <ArrowRight size={16} />
                </Link>
                <Link
                  href={`/verify-email`}
                  className="text-xs text-slate-500 hover:text-[#1e3a8a] transition-colors py-1"
                >
                  Didn't receive email? Check verification status
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Account Type Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Select Account Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole("customer")}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
                      role === "customer"
                        ? "border-[#1e3a8a] bg-blue-50/50 text-[#1e3a8a] font-bold ring-2 ring-[#1e3a8a]/10"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <User size={18} className={role === "customer" ? "text-[#1e3a8a]" : "text-slate-400"} />
                    <div>
                      <p className="text-xs font-bold">Citizen / User</p>
                      <p className="text-[10px] text-slate-400 font-normal">Individual beneficiary</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole("retailer")}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
                      role === "retailer"
                        ? "border-[#1e3a8a] bg-blue-50/50 text-[#1e3a8a] font-bold ring-2 ring-[#1e3a8a]/10"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <Building2 size={18} className={role === "retailer" ? "text-[#1e3a8a]" : "text-slate-400"} />
                    <div>
                      <p className="text-xs font-bold">Retailer (Kendra)</p>
                      <p className="text-[10px] text-slate-400 font-normal">Assisted CSC Agent</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {role === "retailer" ? "Authorized Person's Full Name" : "Full Name (as per Aadhaar)"} <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center border rounded-lg overflow-hidden bg-slate-50 focus-within:bg-white focus-within:border-[#1e3a8a] transition-all" style={{ borderColor: "var(--border-strong)" }}>
                  <div className="px-3 text-slate-400"><User size={15} /></div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter full name"
                    className="flex-1 px-2 h-11 text-xs outline-none bg-transparent"
                    style={{ color: "var(--text)" }}
                    required
                  />
                </div>
              </div>

              {/* Retailer Specific: Shop / Kendra Name */}
              {role === "retailer" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Kendra / Shop Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex items-center border rounded-lg overflow-hidden bg-slate-50 focus-within:bg-white focus-within:border-[#1e3a8a] transition-all" style={{ borderColor: "var(--border-strong)" }}>
                      <div className="px-3 text-slate-400"><Building2 size={15} /></div>
                      <input
                        type="text"
                        value={shopName}
                        onChange={(e) => setShopName(e.target.value)}
                        placeholder="e.g. Sri Balaji CSC Centre"
                        className="flex-1 px-2 h-11 text-xs outline-none bg-transparent"
                        style={{ color: "var(--text)" }}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">GSTIN (optional)</label>
                    <input type="text" maxLength={15} value={gstNo} onChange={(e) => setGstNo(e.target.value.toUpperCase())} placeholder="15-character GSTIN, if registered" className="w-full px-3 h-11 text-xs rounded-lg border bg-slate-50" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Shop website or listing link (optional)</label>
                    <input type="url" value={shopUrl} onChange={(e) => setShopUrl(e.target.value)} placeholder="https://your-shop.example" className="w-full px-3 h-11 text-xs rounded-lg border bg-slate-50" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      District <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex items-center border rounded-lg overflow-hidden bg-slate-50 focus-within:bg-white focus-within:border-[#1e3a8a] transition-all" style={{ borderColor: "var(--border-strong)" }}>
                      <div className="px-3 text-slate-400"><MapPin size={15} /></div>
                      <select
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                        className="flex-1 px-2 h-11 text-xs outline-none bg-transparent"
                        style={{ color: "var(--text)" }}
                        required
                      >
                        <option value="">Select District</option>
                        {["Chennai", "Coimbatore", "Madurai", "Trichy", "Salem", "Tirunelveli", "Erode", "Vellore", "Thanjavur"].map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center border rounded-lg overflow-hidden bg-slate-50 focus-within:bg-white focus-within:border-[#1e3a8a] transition-all" style={{ borderColor: "var(--border-strong)" }}>
                    <div className="px-3 text-slate-400"><Mail size={15} /></div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value.toLowerCase())}
                      placeholder="name@example.com"
                      className="flex-1 px-2 h-11 text-xs outline-none bg-transparent"
                      style={{ color: "var(--text)" }}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center border rounded-lg overflow-hidden bg-slate-50 focus-within:bg-white focus-within:border-[#1e3a8a] transition-all" style={{ borderColor: "var(--border-strong)" }}>
                    <div className="px-2.5 text-xs font-semibold text-slate-500 bg-slate-100 border-r py-3 flex items-center gap-1">
                      <Phone size={12} /> +91
                    </div>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="98XXXXXXXX"
                      className="flex-1 px-2 h-11 text-xs outline-none bg-transparent"
                      style={{ color: "var(--text)" }}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Password & Confirm */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center border rounded-lg overflow-hidden bg-slate-50 focus-within:bg-white focus-within:border-[#1e3a8a] transition-all" style={{ borderColor: "var(--border-strong)" }}>
                    <div className="px-3 text-slate-400"><Lock size={15} /></div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      className="flex-1 px-2 h-11 text-xs outline-none bg-transparent"
                      style={{ color: "var(--text)" }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="px-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Confirm Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center border rounded-lg overflow-hidden bg-slate-50 focus-within:bg-white focus-within:border-[#1e3a8a] transition-all" style={{ borderColor: "var(--border-strong)" }}>
                    <div className="px-3 text-slate-400"><Lock size={15} /></div>
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="flex-1 px-2 h-11 text-xs outline-none bg-transparent"
                      style={{ color: "var(--text)" }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="px-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Terms Checkbox */}
              <div className="pt-1">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={terms}
                    onChange={(e) => setTerms(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded border-slate-300 text-[#1e3a8a] focus:ring-[#1e3a8a]"
                    required
                  />
                  <span className="text-xs text-slate-600 leading-normal">
                    I accept the <Link href="/terms" className="text-[#1e3a8a] underline font-medium">Terms of Service</Link> and <Link href="/privacy" className="text-[#1e3a8a] underline font-medium">Privacy Policy</Link>, and consent to verification by designated Labour Department officers.
                  </span>
                </label>
              </div>

              {/* Cap security verification */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Security Verification <span className="text-rose-500">*</span>
                </label>
                <CapCaptcha
                  ref={captchaRef}
                  action="register"
                  compact
                  onVerified={setCapToken}
                  onReset={() => setCapToken("")}
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !terms}
                className="w-full h-12 rounded-full font-semibold text-sm flex items-center justify-center gap-2 text-white bg-[#1e3a8a] hover:bg-[#1e40af] disabled:opacity-50 transition-all shadow-sm mt-3"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Creating Account...
                  </>
                ) : (
                  <>
                    Complete Registration <ArrowRight size={16} />
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <p className="text-xs text-slate-500">
                  Already have an account?{" "}
                  <Link href="/login" className="text-[#1e3a8a] font-bold underline hover:no-underline">
                    Sign In
                  </Link>
                </p>
              </div>
            </form>
          )}

        </div>

        <p className="text-center text-xs mt-4 flex items-center justify-center gap-1 text-slate-400">
          <Shield size={12} />
          Government of Tamil Nadu · Secure 256-bit Encrypted Portal
        </p>
        </div>
      </div>
    </div>
  );
}
