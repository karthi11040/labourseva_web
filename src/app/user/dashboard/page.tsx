"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import {
  ArrowRight,
  Award,
  CheckCircle2,
  ClipboardList,
  FilePlus2,
  Layers,
  HeartHandshake,
  Receipt,
  Bell,
  Sparkles,
  X,
  ChevronRight,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

type ApplicationStatus = "Approved" | "In review" | "Document check";

type Application = {
  id: string;
  name: string;
  tamilName: string;
  submitted: string;
  status: ApplicationStatus;
  statusDescription: string;
  action: string;
  href: string;
};

const quickActions = [
  {
    title: "Apply for a benefit",
    description: "Browse welfare services that match your membership.",
    href: "/services",
    icon: FilePlus2,
  },
  {
    title: "My applications",
    description: "Track each request and complete any next step.",
    href: "/user/applications",
    icon: ClipboardList,
  },
  {
    title: "Online e-services",
    description: "Apply for statutory welfare board and e-district services.",
    href: "/user/es-services",
    icon: Layers,
  },
  {
    title: "Payment history",
    description: "Review fees, transfers, and benefit payments.",
    href: "/user/payments",
    icon: Receipt,
  },
];

export default function UserDashboardPage() {
  const { language } = useLanguage();
  const tamil = language === "ta";
  const [applications, setApplications] = useState<Application[]>([]);
  const [showIdCard, setShowIdCard] = useState(false);
  const [noticeDismissed, setNoticeDismissed] = useState(false);
  const [serviceCount, setServiceCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [memberId, setMemberId] = useState("");
  const [memberName, setMemberName] = useState("");

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        const memberRes = await fetch("/api/user/member-id").catch(() => null);
        if (memberRes?.ok) {
          const memberData = await memberRes.json();
          if (memberData.ok && memberData.name)
            setMemberName(String(memberData.name).trim());
          if (memberData.ok && memberData.verified && memberData.memberId) {
            setMemberId(memberData.memberId);
          }
        }
        if (!memberName) {
          const profileRes = await fetch(
            "/api/verification/status?userType=customer"
          ).catch(() => null);
          if (profileRes?.ok) {
            const profileData = await profileRes.json();
            const savedName = String(
              profileData?.profileData?.fullName ||
                profileData?.profileData?.applicantName ||
                profileData?.applicantName ||
                ""
            ).trim();
            if (savedName) setMemberName(savedName);
          }
        }
        const sRes = await fetch("/api/services").catch(() => null);
        if (sRes && sRes.ok) {
          const sData = await sRes.json();
          if (sData.ok && Array.isArray(sData.services)) {
            setServiceCount(sData.services.length);
          }
        }
        const aRes = await fetch("/api/user/applications").catch(() => null);
        if (aRes && aRes.ok) {
          const aData = await aRes.json();
          if (aData.ok && Array.isArray(aData.applications)) {
            const mapped: Application[] = aData.applications.map((app: any) => {
              let status: ApplicationStatus = "In review";
              let statusDesc =
                "Application under scrutiny by district welfare officer.";
              if (app.status === "completed" || app.status === "approved") {
                status = "Approved";
                statusDesc =
                  "Application verified and approved. Certificate issued.";
              } else if (app.status === "rejected" || app.status === "returned") {
                status = "Document check";
                statusDesc =
                  app.rejectionReason ||
                  "Clarification required on submitted documents.";
              }
              const dateStr = app.appliedDate
                ? new Date(app.appliedDate).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "Recent";
              return {
                id: app.id,
                name: app.serviceName || "Welfare Scheme Application",
                tamilName: "நலத்திட்ட விண்ணப்பம்",
                submitted: dateStr,
                status,
                statusDescription: statusDesc,
                action: "View Details",
                href: `/user/applications`,
              };
            });
            setApplications(mapped);
          }
        }
      } catch {
        // keep fallback
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  const pendingDocsApp = applications.find(
    (a) => a.status === "Document check"
  );

  const activeCount = applications.filter(
    (a) => a.status === "In review" || a.status === "Document check"
  ).length;

  const approvedCount = applications.filter(
    (a) => a.status === "Approved"
  ).length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* ───────── Welcome Banner ───────── */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="grid lg:grid-cols-[1.5fr_1fr]">
          {/* Left: greeting */}
          <div className="p-6 sm:p-8 bg-gradient-to-br from-[#1e3a8a] via-[#1e3a8a] to-[#0f172a] text-white relative overflow-hidden">
            {/* Subtle dot grid */}
            <div
              className="absolute inset-0 opacity-[0.06] pointer-events-none"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
                backgroundSize: "28px 28px",
              }}
            />
            <div className="absolute top-0 right-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-[#ea580c] to-transparent" />

            <div className="relative">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 text-[10px] font-semibold tracking-wide">
                <Sparkles size={11} className="text-amber-300" />
                {tamil ? "குடிமக்கள் தளம்" : "Citizen Portal"}
              </div>
              <h1 className="mt-3 text-2xl sm:text-[1.75rem] font-black tracking-tight leading-tight">
                {tamil
                  ? `வரவேற்கிறோம், ${memberName || "குடிமக்கள்"}`
                  : `Welcome, ${memberName || "Citizen"}`}
              </h1>
              <p className="mt-2 text-sm text-blue-100/80 max-w-md leading-relaxed">
                {tamil
                  ? "உங்கள் நல விண்ணப்பங்கள், உறுப்பினர் ஆவணங்கள் மற்றும் நலச் சேவைகளை ஒரே இடத்தில் நிர்வகிக்கவும்."
                  : "Manage your welfare applications, member documents, and benefit services from one place."}
              </p>

              <div className="flex flex-wrap gap-2.5 mt-5">
                <Link
                  href="/services"
                  className="inline-flex items-center gap-1.5 px-4 h-10 rounded-lg bg-white text-[#1e3a8a] font-bold text-xs hover:bg-blue-50 transition-colors shadow-sm"
                >
                  <FilePlus2 size={14} />
                  {tamil ? "நலனுக்கு விண்ணப்பிக்கவும்" : "Apply for a benefit"}
                </Link>
                {memberId && (
                  <button
                    type="button"
                    onClick={() => setShowIdCard(true)}
                    className="inline-flex items-center gap-1.5 px-4 h-10 rounded-lg bg-white/10 backdrop-blur-sm text-white font-bold text-xs hover:bg-white/20 transition-colors border border-white/20"
                  >
                    <Award size={14} />
                    {tamil ? "டிஜிட்டல் அடையாளத்தைப் பார்க்க" : "View digital ID"}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right: member ID card */}
          {memberId && (
            <div className="p-6 sm:p-8 bg-white flex flex-col justify-center">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-3">
                Member record
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                  <ShieldCheck size={18} className="text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                    Member ID
                  </div>
                  <div className="text-sm font-mono font-bold text-slate-900 truncate">
                    {memberId}
                  </div>
                </div>
              </div>
              <div className="space-y-2 text-xs border-t border-slate-100 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Status</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                    <CheckCircle2 size={11} /> Verified
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">
                    {tamil ? "உறுப்பினர்" : "Name"}
                  </span>
                  <span className="font-semibold text-slate-900 truncate ml-2">
                    {memberName}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Validity</span>
                  <span className="font-semibold text-slate-900">Lifetime</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ───────── Alert Banner ───────── */}
      {!noticeDismissed && pendingDocsApp && (
        <section className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0">
              <Bell size={16} className="text-amber-700" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                  Action required
                </span>
              </div>
              <p className="text-sm font-bold text-slate-900">
                {pendingDocsApp.name} needs a document
              </p>
              <p className="text-xs text-slate-600 mt-0.5">
                {pendingDocsApp.statusDescription}
              </p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link
              href={pendingDocsApp.href}
              className="inline-flex items-center h-9 px-3.5 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
            >
              Review now
            </Link>
            <button
              type="button"
              onClick={() => setNoticeDismissed(true)}
              className="inline-flex items-center h-9 px-3.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </section>
      )}

      {/* ───────── Stats Grid ───────── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Active applications"
          value={String(activeCount)}
          helper="Track submitted applications"
          icon={ClipboardList}
          trend="this week"
        />
        <StatCard
          label="Available benefits"
          value={`${serviceCount} ${serviceCount !== 1 ? "services" : "service"}`}
          helper="Statutory welfare board services"
          icon={HeartHandshake}
          trend="updated daily"
        />
        <StatCard
          label="Approved benefits"
          value={String(approvedCount)}
          helper="Verified certificates issued"
          icon={CheckCircle2}
          trend="lifetime"
        />
        <StatCard
          label="Latest payment"
          value={applications.length > 0 ? "₹50" : "₹0"}
          helper="Portal fee status"
          icon={Receipt}
          trend="no pending dues"
        />
      </section>

      {/* ───────── Recent Applications ───────── */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              {tamil ? "உங்கள் விண்ணப்பங்கள்" : "Your applications"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Track real-time progress and complete any next step
            </p>
          </div>
          <Link
            href="/user/applications"
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-900 whitespace-nowrap"
          >
            {tamil ? "அனைத்தையும் பார்க்க" : "View all"}
            <ArrowRight size={13} />
          </Link>
        </div>

        {loading ? (
          <div className="p-10 text-center">
            <div className="inline-block w-5 h-5 border-2 border-slate-200 border-t-slate-700 rounded-full animate-spin mb-2" />
            <p className="text-xs text-slate-500">Loading applications…</p>
          </div>
        ) : applications.length === 0 ? (
          <div className="p-10 text-center">
            <div className="h-12 w-12 mx-auto rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
              <ClipboardList size={20} />
            </div>
            <p className="text-sm font-bold text-slate-900">
              {tamil
                ? "விண்ணப்பங்கள் எதுவும் சமர்ப்பிக்கப்படவில்லை"
                : "No submitted applications yet"}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {tamil
                ? "புதிய திட்டத்திற்கு விண்ணப்பிக்க கீழே உள்ள சேவைகளைத் தேர்ந்தெடுக்கவும்."
                : "Choose a welfare benefit below to begin your application."}
            </p>
            <Link
              href="/services"
              className="inline-flex items-center gap-1.5 mt-4 h-9 px-4 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
            >
              <FilePlus2 size={13} />
              {tamil ? "புதிய விண்ணப்பம்" : "Apply for a service"}
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {applications.map((application) => (
              <ApplicationRow
                key={application.id}
                application={application}
              />
            ))}
          </div>
        )}
      </section>

      {/* ───────── Quick Actions ───────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              {tamil ? "விரைவு செயல்கள்" : "Quick actions"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Common tasks to manage your welfare benefits
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.title}
                href={action.href}
                className="group bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 hover:shadow-md transition-all"
              >
                <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center mb-3 group-hover:bg-slate-900 group-hover:border-slate-900 transition-colors">
                  <Icon
                    size={16}
                    className="text-slate-500 group-hover:text-white transition-colors"
                  />
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  {action.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {action.description}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 group-hover:text-slate-900">
                  Open
                  <ChevronRight
                    size={11}
                    className="group-hover:translate-x-0.5 transition-transform"
                  />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ───────── Help Banner ───────── */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
            <ShieldCheck size={16} className="text-slate-500" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              {tamil
                ? "சேவைக்கு உதவி தேவையா?"
                : "Need help with a service?"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Read service guidance or contact the LabourSeva help desk.
            </p>
          </div>
        </div>
        <Link
          href="/help"
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 hover:border-slate-300 transition-colors whitespace-nowrap shrink-0"
        >
          Help and guidance
          <ArrowRight size={13} />
        </Link>
      </section>

      {showIdCard && memberId && (
        <IdCardDialog
          memberId={memberId}
          memberName={memberName}
          onClose={() => setShowIdCard(false)}
        />
      )}
    </div>
  );
}

/* ────────────────── Sub-components ────────────────── */

function StatCard({
  label,
  value,
  helper,
  icon: Icon,
  trend,
}: {
  label: string;
  value: string;
  helper: string;
  icon: typeof ClipboardList;
  trend: string;
}) {
  return (
    <article className="bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center">
          <Icon size={16} className="text-slate-500" />
        </div>
        <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
          <TrendingUp size={9} />
          {trend}
        </span>
      </div>
      <p className="text-xl font-bold text-slate-900 tabular-nums leading-none">
        {value}
      </p>
      <p className="text-xs font-semibold text-slate-700 mt-2">{label}</p>
      <p className="text-[11px] text-slate-500 mt-0.5">{helper}</p>
    </article>
  );
}

function ApplicationRow({
  application,
}: {
  application: Application;
}) {
  const statusConfig: Record<
    ApplicationStatus,
    { bg: string; text: string; dot: string }
  > = {
    Approved: {
      bg: "bg-emerald-50 border-emerald-200",
      text: "text-emerald-700",
      dot: "bg-emerald-500",
    },
    "In review": {
      bg: "bg-blue-50 border-blue-200",
      text: "text-blue-700",
      dot: "bg-blue-500",
    },
    "Document check": {
      bg: "bg-amber-50 border-amber-200",
      text: "text-amber-700",
      dot: "bg-amber-500",
    },
  };
  const sc = statusConfig[application.status];

  return (
    <article className="p-4 hover:bg-slate-50 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="text-sm font-bold text-slate-900">
              {application.name}
            </h3>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${sc.bg} ${sc.text}`}
            >
              <span className={`h-1 w-1 rounded-full ${sc.dot}`} />
              {application.status}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            {application.tamilName}
          </p>
          <p className="text-xs text-slate-600 mt-1">
            {application.statusDescription}
          </p>
          <p className="text-[11px] text-slate-400 font-mono mt-1">
            {application.id} · {application.submitted}
          </p>
        </div>
        <Link
          href={application.href}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors whitespace-nowrap shrink-0"
        >
          {application.action}
          <ArrowRight size={12} />
        </Link>
      </div>
    </article>
  );
}

function IdCardDialog({
  memberId,
  memberName,
  onClose,
}: {
  memberId: string;
  memberName: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
              Member record
            </p>
            <h2 className="text-sm font-bold text-slate-900 mt-0.5">
              Digital ID preview
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* ID card body */}
        <div className="p-5">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 h-full w-1 bg-gradient-to-b from-transparent via-[#1e3a8a] to-transparent" />
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                  LabourSeva
                </p>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                  Citizen Portal
                </p>
              </div>
              <div className="h-8 w-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                <ShieldCheck size={14} className="text-emerald-600" />
              </div>
            </div>
            <p className="text-lg font-bold text-slate-900 leading-tight">
              {memberName}
            </p>
            <p className="mt-1 font-mono text-sm text-slate-600">{memberId}</p>
            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-500">Validity</span>
              <span className="font-semibold text-emerald-700 inline-flex items-center gap-1">
                <CheckCircle2 size={11} /> Verified · Lifetime
              </span>
            </div>
          </div>

          <p className="mt-4 text-xs text-slate-500">
            Your member ID is issued after your account is verified. Present
            this ID at any LabourSeva Kendra for assisted services.
          </p>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center h-9 px-4 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
          >
            Close preview
          </button>
        </div>
      </div>
    </div>
  );
}