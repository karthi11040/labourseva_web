"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Shield,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  ArrowRight,
  LogOut,
  Mail,
  Phone,
  User,
  FileText,
  Building2,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Loader2,
} from "lucide-react";
interface AccountStatusData {
  role: string;
  id?: number | string;
  name: string;
  email?: string;
  phone?: string;
  shopName?: string;
  isEmailVerified: boolean;
  status: string;
  isApproved: boolean;
  rejectionReason?: string | null;
  permissions?: Record<string, boolean>;
}

export default function AccountStatusPage() {
  const router = useRouter();
  const [data, setData] = useState<AccountStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  async function fetchStatus() {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/account-status");
      const json = await res.json();
      if (json.ok) {
        setData(json);
      } else {
        router.push("/login");
      }
    } catch {
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendVerification() {
    if (!data?.email) return;
    setResending(true);
    setResendMsg(null);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });
      const resJson = await res.json();
      if (resJson.ok) {
        setResendMsg({ ok: true, text: "Verification link sent! Please check your email inbox." });
      } else {
        setResendMsg({ ok: false, text: resJson.error || "Unable to resend verification email." });
      }
    } catch {
      setResendMsg({ ok: false, text: "Network error occurred. Please try again." });
    } finally {
      setResending(false);
    }
  }

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-[#1e3a8a] mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">Verifying account security status...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const isApproved = Boolean(data.isApproved) || String(data.status || "").toLowerCase() === "approved";
  const isRejected = data.status === "Rejected" || data.status === "REJECTED";
  const isReturned = data.status === "Re-Upload Required" || data.status === "RETURNED";
  const isPending = !isApproved && !isRejected && !isReturned;

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      {/* Government Portal Header Bar */}
      <div className="bg-[#1e3a8a] text-white py-3 px-4 border-b border-[#1e40af]">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-white font-bold text-sm tracking-wide">
              TN
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-300">Government of Tamil Nadu</p>
              <p className="text-sm font-semibold text-white">LabourSeva Citizen Verification Desk</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 transition-colors text-white"
          >
            <LogOut size={13} /> Sign Out
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-8">
        {/* Main Status Headline Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                  {data.role} ACCOUNT
                </span>
                <span className="text-xs text-slate-400">Ref: TN-VR-2026-{String(data.id || "001").padStart(4, "0")}</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mt-2">
                Verification Status: {data.name}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Official scrutiny record under the Tamil Nadu Labour Welfare Board framework.
              </p>
            </div>

            {/* Status Pill Badge */}
            <div className="shrink-0">
              {isApproved && (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-sm">
                  <CheckCircle2 size={16} className="text-emerald-600" /> Account Verified & Active
                </div>
              )}
              {isPending && (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold text-sm">
                  <Clock size={16} className="text-amber-600 animate-pulse" /> Pending Administrative Approval
                </div>
              )}
              {isReturned && (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 text-amber-800 border border-amber-300 font-bold text-sm">
                  <AlertTriangle size={16} className="text-amber-600" /> Action Required: Re-upload Docs
                </div>
              )}
              {isRejected && (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-50 text-rose-800 border border-rose-200 font-bold text-sm">
                  <XCircle size={16} className="text-rose-600" /> Verification Rejected
                </div>
              )}
            </div>
          </div>

          {/* Stepper Visualization */}
          <div className="py-6">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
              Verification Progress Pipeline
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              
              {/* Step 1: Registration */}
              <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40">
                <div className="flex items-center gap-2 mb-1.5">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-950">1. Registration</span>
                </div>
                <p className="text-[11px] text-emerald-800 leading-normal">
                  Account profile and contact details created.
                </p>
              </div>

              {/* Step 2: Email Verification */}
              <div className={`p-3.5 rounded-xl border ${
                data.isEmailVerified ? "border-emerald-200 bg-emerald-50/40" : "border-amber-300 bg-amber-50/60"
              }`}>
                <div className="flex items-center gap-2 mb-1.5">
                  {data.isEmailVerified ? (
                    <CheckCircle2 size={16} className="text-emerald-600" />
                  ) : (
                    <Clock size={16} className="text-amber-600" />
                  )}
                  <span className={`text-xs font-bold ${data.isEmailVerified ? "text-emerald-950" : "text-amber-950"}`}>
                    2. Email Verified
                  </span>
                </div>
                <p className={`text-[11px] leading-normal ${data.isEmailVerified ? "text-emerald-800" : "text-amber-800"}`}>
                  {data.isEmailVerified ? "Email address cryptographically verified." : "Pending email confirmation link."}
                </p>
              </div>

              {/* Step 3: Admin Review */}
              <div className={`p-3.5 rounded-xl border ${
                isApproved ? "border-emerald-200 bg-emerald-50/40" : isRejected ? "border-rose-200 bg-rose-50/50" : isReturned ? "border-amber-300 bg-amber-50/60" : "border-blue-200 bg-blue-50/40"
              }`}>
                <div className="flex items-center gap-2 mb-1.5">
                  {isApproved ? (
                    <CheckCircle2 size={16} className="text-emerald-600" />
                  ) : isRejected ? (
                    <XCircle size={16} className="text-rose-600" />
                  ) : isReturned ? (
                    <AlertTriangle size={16} className="text-amber-600" />
                  ) : (
                    <Clock size={16} className="text-blue-600 animate-pulse" />
                  )}
                  <span className={`text-xs font-bold ${isApproved ? "text-emerald-950" : isRejected ? "text-rose-950" : isReturned ? "text-amber-950" : "text-blue-950"}`}>
                    3. Staff Scrutiny
                  </span>
                </div>
                <p className="text-[11px] text-slate-700 leading-normal">
                  {isApproved ? "Officer approval recorded." : isRejected ? "Verification declined." : isReturned ? "Documents returned." : "Awaiting desk review."}
                </p>
              </div>

              {/* Step 4: Services Unlocked */}
              <div className={`p-3.5 rounded-xl border ${
                isApproved ? "border-emerald-200 bg-emerald-50/40" : "border-slate-200 bg-slate-50 text-slate-400"
              }`}>
                <div className="flex items-center gap-2 mb-1.5">
                  {isApproved ? (
                    <CheckCircle2 size={16} className="text-emerald-600" />
                  ) : (
                    <Shield size={16} className="text-slate-400" />
                  )}
                  <span className={`text-xs font-bold ${isApproved ? "text-emerald-950" : "text-slate-600"}`}>
                    4. Full Access
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-normal">
                  {isApproved ? "All portals fully active." : "Requires staff approval."}
                </p>
              </div>

            </div>
          </div>

          {/* Conditional Guidance Banner */}
          {data.email && !data.isEmailVerified && (
            <div className="mt-4 p-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-950">Email Verification Required</h3>
                  <p className="text-xs text-amber-800 mt-0.5">
                    You can verify your email address (<strong>{data.email}</strong>) for email notifications. Phone verification is already complete; submit your profile for staff review.
                  </p>
                </div>
              </div>

              <button
                onClick={handleResendVerification}
                disabled={resending}
                className="shrink-0 px-4 py-2 rounded-lg text-xs font-bold text-white bg-amber-800 hover:bg-amber-900 disabled:opacity-50 transition-colors flex items-center gap-1.5"
              >
                {resending ? <><Loader2 size={13} className="animate-spin" /> Sending...</> : <><RefreshCw size={13} /> Resend Link</>}
              </button>
            </div>
          )}

          {resendMsg && (
            <div className={`mt-3 p-3 rounded-xl text-xs font-medium ${resendMsg.ok ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-800 border border-rose-200"}`}>
              {resendMsg.text}
            </div>
          )}

          {isApproved && (
            <div className="mt-4 p-5 rounded-xl border border-emerald-200 bg-emerald-50/70 text-emerald-950">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-emerald-900">Your Account is Verified and Approved!</h3>
                  <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                    You have complete access to statutory document-based welfare schemes, online e-services, digital document vaults, and Razorpay payment receipts.
                  </p>
                  <div className="flex flex-wrap gap-3 mt-4">
                    <Link
                      href={data.role === "RETAILER" ? "/retailer/dashboard" : "/user/apply"}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white bg-[#1e3a8a] hover:bg-[#1e40af] transition-colors shadow-sm"
                    >
                      Browse Statutory Services <ArrowRight size={13} />
                    </Link>
                    <Link
                      href="/user/es-services"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-[#1e3a8a] bg-white border border-[#1e3a8a] hover:bg-blue-50 transition-colors"
                    >
                      Online E-Services
                    </Link>
                    <Link
                      href="/user/applications"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors"
                    >
                      Track Applications
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isPending && data.isEmailVerified && (
            <div className="mt-4 p-5 rounded-xl border border-blue-200 bg-blue-50/60 text-slate-800">
              <div className="flex items-start gap-3">
                <Clock className="w-6 h-6 text-[#1e3a8a] shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-[#1e3a8a]">Application Pending Officer Review</h3>
                  <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                    Your email has been verified and your account is currently in the verification desk queue. Officers verify registrations sequentially. You will receive an official notification via <strong>Email and SMS</strong> immediately once your credentials have been approved.
                  </p>
                  <div className="mt-4 flex items-center gap-3">
                    <Link
                      href="/user/profile"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors"
                    >
                      <User size={13} /> Review Uploaded Profile & KYC
                    </Link>
                    <button
                      onClick={fetchStatus}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-[#1e3a8a] hover:underline"
                    >
                      <RefreshCw size={13} /> Refresh Status
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {(isReturned || isRejected) && (
            <div className={`mt-4 p-5 rounded-xl border ${isRejected ? "border-rose-200 bg-rose-50/70" : "border-amber-300 bg-amber-50/70"}`}>
              <div className="flex items-start gap-3">
                {isRejected ? (
                  <XCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <h3 className={`text-sm font-bold ${isRejected ? "text-rose-950" : "text-amber-950"}`}>
                    {isRejected ? "Verification Desk Decision: Application Rejected" : "Officer Request: Document Resubmission Required"}
                  </h3>
                  <div className="my-2 p-3 rounded-lg bg-white/80 border text-xs text-slate-800 font-mono">
                    <strong>Official Remark:</strong> {data.rejectionReason || "Please verify submitted identification credentials and resubmit valid documentation."}
                  </div>
                  <p className="text-xs text-slate-600">
                    You can update your personal details and upload fresh, legible identification documents through your profile portal.
                  </p>
                  <div className="mt-4">
                    <Link
                      href="/user/profile"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white bg-[#1e3a8a] hover:bg-[#1e40af] transition-colors shadow-sm"
                    >
                      Update Profile & Resubmit KYC <ChevronRight size={13} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Account Details Summary Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <User size={14} className="text-[#1e3a8a]" /> Account Holder
            </h4>
            <p className="text-sm font-bold text-slate-900">{data.name}</p>
            {data.shopName && (
              <p className="text-xs text-slate-600 mt-1 flex items-center gap-1">
                <Building2 size={12} /> {data.shopName}
              </p>
            )}
            <p className="text-xs text-slate-500 mt-1 capitalize">Role: {data.role.toLowerCase()}</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <Mail size={14} className="text-[#1e3a8a]" /> Email Contact
            </h4>
            <p className="text-sm font-medium text-slate-900 break-all">{data.email || "No email linked"}</p>
            <div className="mt-2">
              {data.isEmailVerified ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <CheckCircle2 size={11} /> Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  <Clock size={11} /> Unverified
                </span>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <Phone size={14} className="text-[#1e3a8a]" /> Mobile Identification
            </h4>
            <p className="text-sm font-medium text-slate-900">{data.phone ? `+91 ${data.phone}` : "N/A"}</p>
            <p className="text-[11px] text-slate-400 mt-2">
              Primary recipient for official SMS alerts
            </p>
          </div>
        </div>

        {/* Support & Assistance Footer */}
        <div className="mt-8 text-center text-xs text-slate-500">
          <p>Tamil Nadu Labour Welfare Board · Government of Tamil Nadu</p>
          <p className="mt-1">
            For verification inquiries, visit your district Labour Welfare Office or call the state toll-free helpline.
          </p>
        </div>
      </div>
    </div>
  );
}
