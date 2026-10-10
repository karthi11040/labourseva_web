"use client";

import { useState } from "react";
import {
  Search, CheckCircle2, Clock, AlertTriangle, XCircle, ClipboardCheck,
  FileText, BadgeCheck, ChevronRight, MapPin, Calendar,
} from "lucide-react";

type Status = "draft" | "paid" | "review" | "returned" | "rejected" | "approved" | "completed";

const STATUS_CONFIG: Record<Status, { label: string; icon: React.ElementType; bg: string; text: string }> = {
  draft: { label: "Draft", icon: FileText, bg: "var(--bg-subtle)", text: "var(--text-secondary)" },
  paid: { label: "Paid, pending verification", icon: Clock, bg: "var(--warning-bg)", text: "var(--warning-text)" },
  review: { label: "In review", icon: ClipboardCheck, bg: "var(--info-bg)", text: "var(--info-text)" },
  returned: { label: "Returned for correction", icon: AlertTriangle, bg: "var(--warning-bg)", text: "var(--warning-text)" },
  rejected: { label: "Rejected", icon: XCircle, bg: "var(--danger-bg)", text: "var(--danger-text)" },
  approved: { label: "Approved", icon: CheckCircle2, bg: "var(--success-bg)", text: "var(--success-text)" },
  completed: { label: "Completed", icon: BadgeCheck, bg: "var(--success-bg)", text: "var(--success-text)" },
};

const SAMPLE_RESULTS: Record<string, { ref: string; name: string; service: string; district: string; date: string; status: Status; remarks?: string }> = {
  "LS2026001234": {
    ref: "LS2026001234", name: "Muthu K.", service: "Worker Registration", district: "Chennai",
    date: "01 Oct 2026", status: "completed",
  },
  "LS2026005678": {
    ref: "LS2026005678", name: "Lakshmi R.", service: "Maternity Benefit", district: "Coimbatore",
    date: "05 Oct 2026", status: "review",
  },
  "LS2026009999": {
    ref: "LS2026009999", name: "Arjun M.", service: "Scholarship Scheme", district: "Madurai",
    date: "07 Oct 2026", status: "returned",
    remarks: "Please upload a clearer photograph of the school certificate.",
  },
};

function StatusBadge({ status }: { status: Status }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ background: cfg.bg, color: cfg.text }}
    >
      <Icon size={12} />
      {cfg.label}
    </span>
  );
}

export default function TrackPage() {
  const [ref, setRef] = useState("");
  const [searched, setSearched] = useState(false);
  const [result, setResult] = useState<(typeof SAMPLE_RESULTS)[string] | null>(null);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearched(true);
    setResult(SAMPLE_RESULTS[ref.trim().toUpperCase()] ?? null);
  }

  const steps: Status[] = ["paid", "review", "approved", "completed"];

  return (
    <div style={{ background: "var(--bg-subtle)", minHeight: "100vh" }}>
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: "var(--primary-tint)" }}
          >
            <Search size={26} style={{ color: "var(--primary)" }} />
          </div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: "var(--text)" }}>
            Track Application
          </h1>
          <p style={{ color: "var(--text-secondary)" }}>
            Enter your reference number to check your application status.
          </p>
        </div>

        {/* Search card */}
        <div
          className="rounded-[var(--radius-lg)] border shadow-[var(--shadow-sm)] p-6 mb-6"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <form onSubmit={handleSearch}>
            <label htmlFor="ref-input" className="block text-sm font-medium mb-1.5" style={{ color: "var(--text)" }}>
              Application reference number
            </label>
            <div className="flex gap-2">
              <input
                id="ref-input"
                type="text"
                value={ref}
                onChange={(e) => setRef(e.target.value)}
                placeholder="e.g. LS2026001234"
                className="flex-1 h-12 px-4 rounded-[var(--radius-sm)] border text-sm outline-none transition-all"
                style={{
                  fontFamily: "var(--font-mono)",
                  background: "var(--bg-subtle)",
                  borderColor: "var(--border-strong)",
                  color: "var(--text)",
                }}
              />
              <button
                type="submit"
                className="h-12 px-6 rounded-full text-sm font-semibold transition-all hover:shadow-[var(--shadow-primary)] active:scale-[0.98]"
                style={{ background: "var(--primary)", color: "var(--on-primary)" }}
              >
                Track
              </button>
            </div>
            <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
              Try: LS2026001234 · LS2026005678 · LS2026009999
            </p>
          </form>
        </div>

        {/* Results */}
        {searched && !result && (
          <div
            className="rounded-[var(--radius-lg)] border p-8 text-center"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <Search size={40} className="mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
            <h2 className="font-semibold mb-1" style={{ color: "var(--text)" }}>
              No application found
            </h2>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Check the reference number and try again.
            </p>
          </div>
        )}

        {result && (
          <div
            className="rounded-[var(--radius-lg)] border shadow-[var(--shadow-sm)] overflow-hidden"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            {/* Header */}
            <div className="p-5 border-b" style={{ borderColor: "var(--border)", background: "var(--bg-subtle)" }}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium mb-0.5" style={{ color: "var(--text-muted)" }}>Reference number</p>
                  <p className="font-bold text-lg" style={{ fontFamily: "var(--font-mono)", color: "var(--text)" }}>
                    {result.ref}
                  </p>
                </div>
                <StatusBadge status={result.status} />
              </div>
            </div>

            <div className="p-5">
              {/* Details */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {[
                  { label: "Applicant", value: result.name },
                  { label: "Service", value: result.service },
                  { label: "District", value: result.district },
                  { label: "Submitted", value: result.date },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs font-medium mb-0.5" style={{ color: "var(--text-muted)" }}>{label}</p>
                    <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Progress stepper */}
              {!["rejected", "draft"].includes(result.status) && (
                <div className="mb-5">
                  <p className="text-xs font-semibold mb-3" style={{ color: "var(--text-muted)" }}>
                    APPLICATION PROGRESS
                  </p>
                  <div className="flex items-center gap-0">
                    {steps.map((s, i) => {
                      const cfg = STATUS_CONFIG[s];
                      const Icon = cfg.icon;
                      const stepStatuses = ["paid", "review", "approved", "completed"];
                      const currentIdx = stepStatuses.indexOf(result.status);
                      const isComplete = i <= currentIdx;
                      const isCurrent = i === currentIdx;
                      return (
                        <div key={s} className="flex items-center flex-1 last:flex-none">
                          <div className="flex flex-col items-center gap-1">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all"
                              style={{
                                background: isComplete ? "var(--primary)" : "var(--bg-subtle)",
                                borderColor: isComplete ? "var(--primary)" : "var(--border)",
                              }}
                            >
                              <Icon size={14} color={isComplete ? "white" : "var(--text-muted)"} />
                            </div>
                            <span
                              className="text-[10px] text-center font-medium hidden sm:block"
                              style={{ color: isCurrent ? "var(--primary)" : "var(--text-muted)", maxWidth: 60 }}
                            >
                              {cfg.label}
                            </span>
                          </div>
                          {i < steps.length - 1 && (
                            <div
                              className="flex-1 h-0.5 mx-1 mb-4"
                              style={{ background: i < currentIdx ? "var(--primary)" : "var(--border)" }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Remarks */}
              {result.remarks && (
                <div
                  className="p-3 rounded-[var(--radius-sm)] text-sm"
                  style={{ background: "var(--warning-bg)", color: "var(--warning-text)" }}
                >
                  <p className="font-semibold mb-0.5 flex items-center gap-1.5">
                    <AlertTriangle size={13} /> Action required
                  </p>
                  <p>{result.remarks}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
