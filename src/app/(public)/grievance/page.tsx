"use client";

import { useState } from "react";
import {
  MessageSquareWarning,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Upload,
  FileText,
  Shield,
  ArrowRight,
} from "lucide-react";

export default function GrievancePage() {
  const [activeTab, setActiveTab] = useState<"lodge" | "track">("lodge");

  // Form State
  const [form, setForm] = useState({
    name: "",
    phone: "",
    aadhaar4: "",
    board: "Tamil Nadu Construction Workers Welfare Board",
    category: "Delay in Application Verification",
    appRef: "",
    description: "",
  });
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Track State
  const [trackRef, setTrackRef] = useState("");
  const [trackResult, setTrackResult] = useState<{
    id: string;
    applicant: string;
    category: string;
    date: string;
    status: "in_review" | "resolved" | "escalated";
    statusLabel: string;
    officer: string;
    remarks: string;
  } | null>(null);
  const [searched, setSearched] = useState(false);

  async function handleLodgeGrievance(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    const generatedId = `GRV-2026-${Math.floor(10000 + Math.random() * 90000)}`;
    setSubmittedRef(generatedId);
  }

  function handleTrackGrievance(e: React.FormEvent) {
    e.preventDefault();
    setSearched(true);
    if (trackRef.trim().toUpperCase() === "GRV-2026-88192" || trackRef.trim().length > 3) {
      setTrackResult({
        id: trackRef.trim().toUpperCase() || "GRV-2026-88192",
        applicant: "K. Selvaraj",
        category: "Delay in Application Verification",
        date: "04 Oct 2026",
        status: "resolved",
        statusLabel: "Resolved by District Officer",
        officer: "M. Saravanan (Assistant Commissioner of Labour, Coimbatore)",
        remarks: "Verification completed on 09 Oct 2026 after telephonic re-validation of VAO certificate. Worker Welfare Smart Card has been issued and made available for download.",
      });
    } else {
      setTrackResult(null);
    }
  }

  return (
    <div style={{ background: "var(--bg-subtle)", minHeight: "100vh" }} className="py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold mb-3 border shadow-xs"
            style={{
              background: "var(--color-12)",
              color: "var(--color-dark-blue-1)",
              borderColor: "var(--color-11)",
            }}
          >
            <MessageSquareWarning size={14} style={{ color: "var(--color-8)" }} />
            <span>Public Grievance Redressal System · குறைதீர்ப்பு தளம்</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-2">
            Grievance Redressal
          </h1>
          <p className="text-base font-semibold mb-3" style={{ color: "var(--color-8)", fontFamily: "var(--font-sans-ta)" }}>
            தொழிலாளர் பொது குறைதீர்ப்பு மையம்
          </p>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Report delays in welfare card verification, payment double debits, service rejections, or Kendra operator complaints. Every grievance is monitored under statutory SLA timelines.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex justify-center mb-8">
          <div className="bg-white p-1 rounded-2xl border flex gap-1 shadow-xs" style={{ borderColor: "var(--border)" }}>
            <button
              type="button"
              onClick={() => setActiveTab("lodge")}
              className={`px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === "lodge"
                  ? "bg-[#1e3a8a] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Lodge New Grievance
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("track")}
              className={`px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === "track"
                  ? "bg-[#1e3a8a] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Track Grievance Status
            </button>
          </div>
        </div>

        {/* Tab 1: Lodge Grievance */}
        {activeTab === "lodge" && (
          <div
            className="bg-white rounded-3xl border p-6 sm:p-10 shadow-xs mb-10"
            style={{ borderColor: "var(--border)" }}
          >
            {submittedRef ? (
              <div className="text-center py-12 max-w-lg mx-auto">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "var(--success-bg)" }}>
                  <CheckCircle2 size={32} style={{ color: "var(--success)" }} />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Grievance Registered Successfully</h2>
                <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 mb-4 inline-block text-center">
                  <span className="text-xs text-slate-600 block">Your Grievance Reference ID</span>
                  <span className="text-xl font-mono font-black text-[#1e3a8a] tracking-wider">{submittedRef}</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
                  An SMS confirmation has been dispatched to {form.phone}. As per the Citizen Charter, your grievance has been assigned to the District Labour Welfare Inspector with a statutory 7-day resolution timeline.
                </p>
                <div className="flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSubmittedRef(null);
                      setForm({
                        name: "",
                        phone: "",
                        aadhaar4: "",
                        board: "Tamil Nadu Construction Workers Welfare Board",
                        category: "Delay in Application Verification",
                        appRef: "",
                        description: "",
                      });
                    }}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold border border-slate-300 text-slate-700 hover:bg-slate-50"
                  >
                    Lodge Another
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTrackRef(submittedRef);
                      setActiveTab("track");
                    }}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#1e3a8a] text-white hover:opacity-95"
                  >
                    Track this Grievance
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleLodgeGrievance} className="space-y-6">
                <div>
                  <h2 className="text-xl font-black text-slate-900 mb-1">Applicant Details</h2>
                  <p className="text-xs text-slate-500">Provide accurate contact details to receive investigation updates.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. S. Arumugam"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full h-11 px-3.5 rounded-xl border text-sm outline-none"
                      style={{ borderColor: "var(--border)" }}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Mobile Number (10 digits)</label>
                    <input
                      type="tel"
                      required
                      pattern="[6-9][0-9]{9}"
                      placeholder="Registered mobile"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full h-11 px-3.5 rounded-xl border text-sm outline-none"
                      style={{ borderColor: "var(--border)" }}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Aadhaar (Last 4 Digits)</label>
                    <input
                      type="text"
                      required
                      maxLength={4}
                      pattern="[0-9]{4}"
                      placeholder="e.g. 8421"
                      value={form.aadhaar4}
                      onChange={(e) => setForm({ ...form, aadhaar4: e.target.value })}
                      className="w-full h-11 px-3.5 rounded-xl border text-sm outline-none font-mono text-center"
                      style={{ borderColor: "var(--border)" }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Welfare Board</label>
                    <select
                      value={form.board}
                      onChange={(e) => setForm({ ...form, board: e.target.value })}
                      className="w-full h-11 px-3.5 rounded-xl border text-sm outline-none bg-white font-medium"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <option value="Tamil Nadu Construction Workers Welfare Board">Tamil Nadu Construction Workers Welfare Board</option>
                      <option value="Tamil Nadu Manual Workers Welfare Board">Tamil Nadu Manual Workers Welfare Board</option>
                      <option value="Tamil Nadu Auto & Taxi Drivers Welfare Board">Tamil Nadu Auto & Taxi Drivers Welfare Board</option>
                      <option value="Tamil Nadu Agricultural Labourers Welfare Board">Tamil Nadu Agricultural Labourers Welfare Board</option>
                      <option value="Tamil Nadu Domestic Workers Welfare Board">Tamil Nadu Domestic Workers Welfare Board</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Grievance Nature / Category</label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full h-11 px-3.5 rounded-xl border text-sm outline-none bg-white font-medium"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <option value="Delay in Application Verification">Delay in Application Verification (&gt;7 days)</option>
                      <option value="Payment Failed / Double Debit">Payment Failed / Double Debit</option>
                      <option value="Certificate Not Generated">Certificate / ID Card Not Generated</option>
                      <option value="Improper Application Rejection">Improper Application Rejection</option>
                      <option value="e-Seva Kendra Operator Overcharge">e-Seva Kendra Operator Overcharge</option>
                      <option value="Other Administration Issue">Other Administration Issue</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Related Application Reference Number (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. LS2026001234 or TN-2026-APP-78491"
                    value={form.appRef}
                    onChange={(e) => setForm({ ...form, appRef: e.target.value })}
                    className="w-full h-11 px-3.5 rounded-xl border text-sm outline-none font-mono"
                    style={{ borderColor: "var(--border)" }}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Detailed Description of Grievance</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Provide clear details including date of application, Kendra visited, or the nature of difficulty..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full p-3.5 rounded-xl border text-sm outline-none resize-none"
                    style={{ borderColor: "var(--border)" }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 shadow-xs hover:opacity-95 transition-opacity"
                  style={{ background: "var(--color-6)" }}
                >
                  <MessageSquareWarning size={16} />
                  <span>{loading ? "Lodging Grievance..." : "Submit Grievance to Welfare Board"}</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* Tab 2: Track Grievance */}
        {activeTab === "track" && (
          <div
            className="bg-white rounded-3xl border p-6 sm:p-10 shadow-xs mb-10"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="max-w-xl mx-auto mb-8">
              <h2 className="text-xl font-black text-slate-900 mb-1 text-center">Track Grievance Status</h2>
              <p className="text-xs text-slate-500 text-center mb-6">
                Enter your Grievance Reference ID (e.g. <span className="font-mono font-bold text-slate-800">GRV-2026-88192</span>)
              </p>

              <form onSubmit={handleTrackGrievance} className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Enter GRV-XXXX-XXXXX"
                    value={trackRef}
                    onChange={(e) => setTrackRef(e.target.value)}
                    className="w-full pl-11 pr-4 h-12 rounded-xl border text-sm outline-none font-mono uppercase"
                    style={{ borderColor: "var(--border)" }}
                  />
                </div>
                <button
                  type="submit"
                  className="h-12 px-6 rounded-xl font-bold text-sm text-white whitespace-nowrap shadow-xs"
                  style={{ background: "var(--color-6)" }}
                >
                  Track
                </button>
              </form>
            </div>

            {/* Tracking Result */}
            {searched && trackResult && (
              <div className="max-w-2xl mx-auto border rounded-2xl p-6 bg-slate-50/70 space-y-4" style={{ borderColor: "var(--color-11)" }}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-4 border-slate-200">
                  <div>
                    <span className="text-xs text-slate-500">Grievance Reference:</span>
                    <h3 className="text-lg font-mono font-black text-slate-900">{trackResult.id}</h3>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 self-start sm:self-auto">
                    {trackResult.statusLabel}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 block">Complainant:</span>
                    <span className="font-bold text-slate-800">{trackResult.applicant}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Date Lodged:</span>
                    <span className="font-bold text-slate-800">{trackResult.date}</span>
                  </div>
                </div>

                <div className="text-xs">
                  <span className="text-slate-500 block">Grievance Category:</span>
                  <span className="font-bold text-slate-800">{trackResult.category}</span>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200 text-xs">
                  <span className="font-bold text-slate-900 block mb-1">Resolution & Officer Remarks:</span>
                  <p className="text-slate-600 leading-relaxed">{trackResult.remarks}</p>
                  <span className="text-[11px] text-slate-400 block mt-2">— {trackResult.officer}</span>
                </div>
              </div>
            )}

            {searched && !trackResult && (
              <div className="text-center py-10">
                <AlertTriangle size={36} className="mx-auto text-amber-500 mb-2" />
                <h3 className="text-base font-bold text-slate-800">No Record Found</h3>
                <p className="text-xs text-slate-500 mt-1">Please check your Reference ID and try again.</p>
              </div>
            )}
          </div>
        )}

        {/* Escalation Hierarchy Strip */}
        <div
          className="rounded-3xl border p-6 sm:p-8 bg-white shadow-xs"
          style={{ borderColor: "var(--border)" }}
        >
          <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Shield size={18} className="text-[#1e3a8a]" />
            Three-Tier Grievance Escalation Matrix (Citizen Charter)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="font-bold text-[#1e3a8a] block mb-1">Tier 1: Taluk Welfare Inspector</span>
              <p className="text-slate-600">Initial investigation and field check within <strong>7 days</strong> of complaint registration.</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="font-bold text-[#1e3a8a] block mb-1">Tier 2: District Labour Officer</span>
              <p className="text-slate-600">Automatic escalation for unaddressed grievances within <strong>15 days</strong>.</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="font-bold text-[#1e3a8a] block mb-1">Tier 3: Secretary to Government</span>
              <p className="text-slate-600">Appellate review and disciplinary action authority within <strong>30 days</strong>.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
