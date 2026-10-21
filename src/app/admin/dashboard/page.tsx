"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import {
  ArrowRight,
  Banknote,
  ClipboardCheck,
  FileStack,
  ShieldAlert,
  UsersRound,
  WalletCards,
  Clock,
  TrendingUp,
  FileText,
  Store,
  Layers,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";

type PriorityDecision = {
  id: string;
  item: string;
  detail: string;
  owner: string;
  href: string;
  status: string;
};

const priorityDecisions: PriorityDecision[] = [];

export default function AdminDashboardPage() {
  const { language } = useLanguage();
  const isTa = language === "ta";

  const metrics = [
    {
      label: isTa ? "நிலுவையில் உள்ள ஒப்புதல்கள்" : "Pending Approvals",
      value: "0",
      detail: isTa ? "வரிசையில் உள்ள முடிவுகள்" : "Decisions in queue",
      icon: ClipboardCheck,
      tone: "amber",
      href: "/admin/requests",
    },
    {
      label: isTa ? "சரிபார்க்கப்படாத கணக்குகள்" : "Unverified Accounts",
      value: "0",
      detail: isTa ? "வரிசையில் உள்ள கேஒய்சி வழக்குகள்" : "KYC exceptions in queue",
      icon: UsersRound,
      tone: "red",
      href: "/admin/verification",
    },
    {
      label: isTa ? "செயலில் உள்ள நெட்வொர்க் நிதி" : "Active Network Float",
      value: "₹0",
      detail: isTa ? "கூட்டாண்மை பணப்பைகள்" : "Across partner wallets",
      icon: WalletCards,
      tone: "emerald",
      href: "/admin/finance",
    },
    {
      label: isTa ? "இ-சேவை பதிவுகள்" : "E-Service Records",
      value: "0",
      detail: isTa ? "சட்டப்பூர்வ இலக்கு கண்காணிக்கப்படுகிறது" : "Statutory SLA tracked",
      icon: Layers,
      tone: "blue",
      href: "/admin/es-records",
    },
  ];

  const quickHubs = [
    {
      title: isTa ? "சரிபார்ப்பு வரிசை" : "Verification Queue",
      desc: isTa ? "ஆதார் இ-கேஒய்சி & வணிக உரிமங்கள்" : "Aadhaar e-KYC & Trade Licenses",
      href: "/admin/verification",
      icon: ShieldAlert,
      badge: isTa ? "சரிபார்ப்பு" : "Queue",
    },
    {
      title: isTa ? "கோரிக்கை மதிப்பாய்வு" : "Request Review Inbox",
      desc: isTa ? "குடிமக்கள், சில்லறை & விருந்தினர் கோரிக்கைகள்" : "Citizen, Retail & Guest Claims",
      href: "/admin/requests",
      icon: FileText,
      badge: isTa ? "ஆய்வு" : "Review",
    },
    {
      title: isTa ? "கட்டணம் & பணப்பை மையம்" : "Fee & Wallet Hub",
      desc: isTa ? "விநியோகஸ்தர் பணப்புழக்கம் & இருப்பு" : "Distributor Liquidity & Float",
      href: "/admin/slide",
      icon: Banknote,
      badge: isTa ? "பணப்பைகள்" : "Wallets",
    },
    {
      title: isTa ? "இ-சேவை பதிவுகள்" : "E-Service Records",
      desc: isTa ? "பாதுகாப்பான 20-நிமிட டோக்கன் அனுமதிகள்" : "Secure 20-min Token Grants",
      href: "/admin/es-records",
      icon: Layers,
      badge: isTa ? "பதிவுகள்" : "Records",
    },
    {
      title: isTa ? "நிதிப் பேரேடு" : "Financial Ledger",
      desc: isTa ? "அட்டைகள் & கட்டணப் பணப்பைகள்" : "Cards & Payments Wallets",
      href: "/admin/finance",
      icon: WalletCards,
      badge: isTa ? "பேரேடு" : "Ledger",
    },
    {
      title: isTa ? "குறைதீர்க்கும் பிரிவு" : "Grievance Redressal",
      desc: isTa ? "பொது சேவை தகராறு தீர்வு மையம்" : "Public Service Dispute Desk",
      href: "/admin/grievance",
      icon: AlertCircle,
      badge: isTa ? "மையம்" : "Desk",
    },
  ];

  return (
    <div className="space-y-6 font-sans">
      {/* Welcome Banner */}
      <section className="rounded-2xl border border-[#1e3a8a] border-t-4 bg-white p-6 shadow-xs sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#ea580c]">
              {isTa
                ? "நிர்வாகக் குழு · தமிழ்நாடு தொழிலாளர் நல வாரியம்"
                : "Executive Directorate · Tamil Nadu Labour Welfare Board"}
            </span>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
              {isTa ? "தள நிர்வாகம் & செயல்பாட்டுக் கட்டளை மையம்" : "Platform Governance & Operations Command"}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              {isTa
                ? "நேரடி குடிமக்கள் நலத்திட்ட வழங்கல், சில்லறை மற்றும் விநியோகஸ்தர் பணப்பை இருப்பு, டிஜிட்டல் கையொப்ப இணக்கம் மற்றும் சட்டப்பூர்வ இலக்கு நேரங்களை மேற்பார்வையிடுங்கள்."
                : "Supervise direct citizen benefit disbursements, retail and distributor wallet liquidity, digital signature compliance, and statutory SLA queues."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              href="/admin/requests"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#1e3a8a] px-4 text-xs font-bold text-white hover:bg-[#1e40af] transition-colors shadow-xs"
            >
              {isTa ? "கோரிக்கைகளைச் செயல்படுத்தவும்" : "Process Requests"} <ArrowRight size={15} />
            </Link>
            <Link
              href="/admin/verification"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
            >
              {isTa ? "கேஒய்சி சரிபார்ப்புகள்" : "KYC Verifications"}
            </Link>
          </div>
        </div>
      </section>

      {/* Metrics Row */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Platform summary">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const iconClass =
            metric.tone === "red"
              ? "bg-red-50 text-red-700"
              : metric.tone === "amber"
              ? "bg-amber-50 text-amber-700"
              : metric.tone === "emerald"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-blue-50 text-[#1e3a8a]";
          return (
            <Link
              key={metric.label}
              href={metric.href}
              className="border-t-4 border-[#1e3a8a] rounded-xl border border-slate-200 bg-white p-5 shadow-xs hover:border-slate-300 transition-all block group"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{metric.label}</span>
                <span
                  className={`grid h-9 w-9 place-items-center rounded-lg ${iconClass} group-hover:scale-105 transition-transform`}
                >
                  <Icon size={18} />
                </span>
              </div>
              <strong className="mt-4 block text-2xl font-extrabold text-slate-950">{metric.value}</strong>
              <span className="mt-1 block text-xs text-slate-500">{metric.detail}</span>
            </Link>
          );
        })}
      </section>

      {/* Quick Operational Subsystems Grid */}
      <section>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">
          {isTa ? "முக்கிய செயல்பாட்டு தளங்கள்" : "Core Operational Workbenches"}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickHubs.map((h) => {
            const Icon = h.icon;
            return (
              <Link
                key={h.title}
                href={h.href}
                className="p-5 rounded-xl border border-slate-200 bg-white shadow-xs hover:border-[#1e3a8a] hover:shadow-sm transition-all group flex items-start gap-4"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-[#1e3a8a] flex items-center justify-center shrink-0 group-hover:bg-[#1e3a8a] group-hover:text-white transition-colors">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#1e3a8a] transition-colors truncate">
                      {h.title}
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {h.badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{h.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Decisions & System Status Grid */}
      <section className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 p-5 bg-slate-50/50">
            <div>
              <h2 className="font-bold text-slate-950 text-sm">
                {isTa ? "உடனடி கவனம் தேவைப்படும் முடிவுகள்" : "Decisions Requiring Immediate Attention"}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {isTa
                  ? "முறையான நிர்வாக ஒப்புதல் வரை உருப்படிகள் ஆய்வில் இருக்கும்."
                  : "Items remain in review until formal administrative sign-off."}
              </p>
            </div>
            <Link href="/admin/requests" className="text-xs font-bold text-[#1e3a8a] hover:underline">
              {isTa ? "அனைத்து வரிசையையும் காண்க" : "View All Queue"}
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {priorityDecisions.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <ClipboardCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">
                  {isTa ? "வரிசையில் முன்னுரிமை முடிவுகள் எதுவும் நிலுவையில் இல்லை" : "No pending priority decisions in queue"}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {isTa
                    ? "அனைத்து நிர்வாக ஒப்புதல்களும் மேல்முறையீடுகளும் செயலாக்கப்பட்டுள்ளன."
                    : "All administrative approvals and escalations have been processed."}
                </p>
              </div>
            ) : (
              priorityDecisions.map((decision) => (
                <div
                  key={decision.id}
                  className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between hover:bg-slate-50/50 transition-colors"
                >
                  <div>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {decision.id}
                    </span>
                    <h3 className="mt-1.5 text-sm font-bold text-slate-900">{decision.item}</h3>
                    <p className="mt-0.5 text-xs text-slate-600">{decision.detail}</p>
                    <span className="mt-2 inline-block text-[11px] font-semibold text-[#1e3a8a]">
                      {decision.owner}
                    </span>
                  </div>
                  <Link
                    href={decision.href}
                    className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[#1e3a8a] px-3.5 text-xs font-bold text-[#1e3a8a] hover:bg-blue-50 transition-colors shrink-0"
                  >
                    {decision.status}
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* System Health & Integrity Panel */}
        <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <h2 className="font-bold text-slate-950 text-sm flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />{" "}
            {isTa ? "தள பாதுகாப்பு & சேவைகள்" : "Platform Security & Services"}
          </h2>
          <p className="text-xs text-slate-500">
            {isTa ? "அரசு உள்கட்டமைப்பின் நேரலை செயல்பாட்டு நிலை." : "Live operational status across government infrastructure."}
          </p>

          <div className="space-y-3 pt-1 text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-950">
              <span className="font-semibold">
                {isTa ? "மாநில தரவு மைய தரவுத்தளம் (SDC)" : "State Data Centre Database"}
              </span>
              <span className="font-bold text-[10px] uppercase bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded">
                {isTa ? "இணைக்கப்பட்டுள்ளது" : "Online"}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-950">
              <span className="font-semibold">
                {isTa ? "UIDAI ஆதார் இ-கேஒய்சி மையம்" : "UIDAI Aadhaar e-KYC Hub"}
              </span>
              <span className="font-bold text-[10px] uppercase bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded">
                220ms Latency
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-950">
              <span className="font-semibold">
                {isTa ? "வகுப்பு 3 டிஎஸ்சி முத்திரை இயந்திரம்" : "Class 3 DSC HSM Signing Engine"}
              </span>
              <span className="font-bold text-[10px] uppercase bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded">
                {isTa ? "செயல்பாட்டில் உள்ளது" : "Operational"}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-950">
              <span className="font-semibold">
                {isTa ? "ரேசர்பே & எஸ்பிஐ இ-பே கட்டணங்கள்" : "Razorpay & SBI e-Pay Webhooks"}
              </span>
              <span className="font-bold text-[10px] uppercase bg-blue-200 text-blue-900 px-2 py-0.5 rounded">
                {isTa ? "சரிபார்க்கப்பட்டது" : "Reconciled"}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>{isTa ? "அடுத்த காப்புப் பிரதி நேரம்:" : "Next Backup Snapshot:"}</span>
            <span className="font-bold text-slate-800">
              {isTa ? "இன்று இரவு, 02:00 மணி" : "Tonight, 02:00 IST"}
            </span>
          </div>
        </aside>
      </section>
    </div>
  );
}
