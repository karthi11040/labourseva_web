"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Download,
  Printer,
  Shield,
  FileText,
  Building,
  User,
  CreditCard,
  QrCode,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

export default function ApplicationDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = (params?.id as string) || "LS2026001234";

  const showReceiptInitial = searchParams?.get("view") === "receipt";
  const [receiptOpen, setReceiptOpen] = useState(showReceiptInitial);

  // Application details
  const appData = {
    id: id,
    scheme: id === "LS2026005678" ? "Maternity Benefit" : id === "TN-2026-APP-78491" ? "Children's Scholarship" : "Worker Registration",
    schemeTa: id === "LS2026005678" ? "மகப்பேறு நல உதவி" : id === "TN-2026-APP-78491" ? "குழந்தைகள் கல்வி உதவித்தொகை" : "தொழிலாளர் புதிய பதிவு",
    board: "Tamil Nadu Construction Workers Welfare Board",
    dateSubmitted: "01 Oct 2026, 11:42 AM IST",
    status: id === "LS2026005678" ? "In Review" : id === "TN-2026-APP-78491" ? "Pending Verification" : "Approved & Completed",
    statusBadgeColor: id === "LS2026005678" ? "blue" : id === "TN-2026-APP-78491" ? "amber" : "emerald",
    applicant: "Verified Citizen (சரிபார்க்கப்பட்ட பயனாளி)",
    phone: "+91 Verified Contact",
    aadhaarMasked: "XXXX XXXX ••••",
    district: "Jurisdiction District",
    taluk: "Jurisdiction Taluk",
    trade: "Registered Worker",
    fee: "Statutory Fee",
    paymentId: "Portal Direct Transfer",
    bankAccount: "Aadhaar Seeded DBT Bank Account",
    officer: "Designated Verification Officer",
  };

  const timelineSteps = [
    {
      title: "Application Submitted Online",
      titleTa: "விண்ணப்பம் இணைய வழியே சமர்ப்பிக்கப்பட்டது",
      date: "01 Oct 2026, 11:42 AM",
      desc: "Form submitted by citizen with Aadhaar authentication and biometric consent.",
      completed: true,
    },
    {
      title: "Fee Payment Reconciled",
      titleTa: "கட்டணப் பரிவர்த்தனை உறுதி செய்யப்பட்டது",
      date: "01 Oct 2026, 11:44 AM",
      desc: `Payment of ₹50.00 confirmed via Razorpay (Txn ID: ${appData.paymentId}).`,
      completed: true,
    },
    {
      title: "Document Screening & Field Inquiry",
      titleTa: "ஆவண சரிபார்ப்பு மற்றும் கள ஆய்வு",
      date: "03 Oct 2026, 03:15 PM",
      desc: "Village Administrative Officer (VAO) 90-day employment engagement certificate verified.",
      completed: true,
    },
    {
      title: "District Committee Sanction",
      titleTa: "மாவட்ட நல வாரியக் குழுவின் ஒப்புதல்",
      date: "04 Oct 2026, 04:30 PM",
      desc: "Sanction granted under Tamil Nadu Manual Workers Welfare Scheme by Assistant Commissioner of Labour.",
      completed: appData.status === "Approved & Completed",
    },
    {
      title: "Digital Certificate Generated & Signed",
      titleTa: "டிஜிட்டல் நல வாரிய அடையாள அட்டை வழங்கப்பட்டது",
      date: "05 Oct 2026, 10:00 AM",
      desc: "Cryptographically signed ID Card issued with permanent Lifetime validity.",
      completed: appData.status === "Approved & Completed",
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Link & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/user/applications"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#1e3a8a] transition-colors"
        >
          <ArrowLeft size={14} /> Back to My Applications
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setReceiptOpen(true)}
            className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-white text-xs font-bold flex items-center gap-1.5 shadow-2xs"
          >
            <Printer size={13} />
            <span>Print Receipt</span>
          </button>
          {appData.status === "Approved & Completed" && (
            <button
              type="button"
              onClick={() => alert("Downloading signed Smart Card Certificate...")}
              className="px-4 py-2 rounded-xl bg-[#1e3a8a] text-white hover:opacity-95 text-xs font-bold flex items-center gap-1.5 shadow-2xs"
            >
              <Download size={13} />
              <span>Download Card</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Details Header Card */}
      <div
        className="bg-white rounded-3xl border p-6 sm:p-8 shadow-2xs"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-sm font-black text-slate-900">{appData.id}</span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs text-slate-500">Submitted: {appData.dateSubmitted}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">{appData.scheme}</h1>
            <p className="text-xs font-semibold text-amber-700 mt-0.5" style={{ fontFamily: "var(--font-sans-ta)" }}>
              {appData.schemeTa}
            </p>
          </div>

          <span
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold self-start sm:self-auto ${
              appData.status === "Approved & Completed"
                ? "bg-emerald-100 text-emerald-800"
                : appData.status === "In Review"
                ? "bg-blue-100 text-[#1e3a8a]"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            {appData.status}
          </span>
        </div>

        {/* 2-Column Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-500 block mb-0.5">Beneficiary Name</span>
            <strong className="text-slate-900 text-sm">{appData.applicant}</strong>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-500 block mb-0.5">Aadhaar (Masked) & Phone</span>
            <strong className="text-slate-900 text-sm">{appData.aadhaarMasked} · {appData.phone}</strong>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-500 block mb-0.5">Welfare Board & Trade</span>
            <strong className="text-slate-900">{appData.board} ({appData.trade})</strong>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-500 block mb-0.5">Assigned Welfare Officer</span>
            <strong className="text-slate-900">{appData.officer}</strong>
          </div>

          <div className="sm:col-span-2 p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
            <span className="text-emerald-800 font-bold block mb-0.5">Direct Benefit Transfer (DBT) Account</span>
            <span className="text-slate-700">{appData.bankAccount}</span>
          </div>
        </div>
      </div>

      {/* Audit Trail & Step-by-Step Progress Timeline */}
      <div
        className="bg-white rounded-3xl border p-6 sm:p-8 shadow-2xs"
        style={{ borderColor: "var(--border)" }}
      >
        <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
          <Clock size={18} className="text-[#1e3a8a]" />
          <span>Statutory Lifecycle & Audit Trail · செயல்முறை பதிவு</span>
        </h2>

        <div className="space-y-6 relative before:absolute before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
          {timelineSteps.map((st, i) => (
            <div key={i} className="flex items-start gap-4 relative">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold z-10 shadow-xs ${
                  st.completed ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500"
                }`}
              >
                {st.completed ? "✓" : i + 1}
              </div>
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <h3 className="text-sm font-bold text-slate-900">{st.title}</h3>
                  <span className="text-[11px] font-mono text-slate-400">{st.date}</span>
                </div>
                <p className="text-xs font-semibold text-amber-700 mt-0.5" style={{ fontFamily: "var(--font-sans-ta)" }}>
                  {st.titleTa}
                </p>
                <p className="text-xs text-slate-600 mt-1">{st.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Official Acknowledgment Receipt Modal */}
      {receiptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-scale-up max-h-[90vh] overflow-y-auto">
            {/* Receipt Printable Header */}
            <div className="text-center border-b pb-4 mb-4">
              <div className="text-[11px] font-bold text-slate-500 tracking-wider">
                GOVERNMENT OF TAMIL NADU · தமிழ்நாடு அரசு
              </div>
              <h3 className="text-base font-black text-slate-900 mt-0.5">
                Tamil Nadu Manual Workers Social Security and Welfare Board
              </h3>
              <p className="text-xs font-bold text-slate-600">
                Official Acknowledgement & Fee Receipt
              </p>
            </div>

            {/* Receipt Details */}
            <div className="space-y-2 text-xs mb-6">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Application Number:</span>
                <strong className="font-mono text-slate-900">{appData.id}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Receipt Date:</span>
                <strong className="text-slate-900">{appData.dateSubmitted}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Beneficiary Name:</span>
                <strong className="text-slate-900">{appData.applicant}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Welfare Scheme:</span>
                <strong className="text-slate-900">{appData.scheme}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Statutory Fee Paid:</span>
                <strong className="text-emerald-700">{appData.fee}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Payment Gateway Reference:</span>
                <strong className="font-mono text-slate-900">{appData.paymentId}</strong>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Current Status:</span>
                <strong className="text-[#1e3a8a]">{appData.status}</strong>
              </div>
            </div>

            {/* Verification QR simulation */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-white rounded-lg border border-slate-300 flex items-center justify-center flex-shrink-0">
                <QrCode size={36} className="text-slate-800" />
              </div>
              <div className="text-[11px] text-slate-600">
                <span className="font-bold text-slate-800 block">Digital Verification Hash:</span>
                Scan this code at any e-Seva Kendra or visit <span className="font-mono text-[#1e3a8a]">labourseva.com/track</span> to verify authentic state issuance.
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setReceiptOpen(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-[#1e3a8a] text-white hover:opacity-95 flex items-center justify-center gap-1.5"
              >
                <Printer size={13} />
                <span>Print Official Copy</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
