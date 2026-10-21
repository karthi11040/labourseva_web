"use client";

import { useState } from "react";
import {
  Download,
  FileText,
  Search,
  BookOpen,
  FileCheck,
  Building,
  CheckCircle2,
  ExternalLink,
  Shield,
} from "lucide-react";

interface DownloadItem {
  id: string;
  title: string;
  titleTa: string;
  category: "forms" | "affidavits" | "manuals" | "circulars";
  format: string;
  size: string;
  description: string;
  version: string;
}

const downloadItems: DownloadItem[] = [
  {
    id: "f-1",
    title: "Form 1: Worker Welfare Registration Application",
    titleTa: "படிவம் 1: அமைப்புசாரா தொழிலாளர் புதிய பதிவு விண்ணப்பம்",
    category: "forms",
    format: "PDF",
    size: "420 KB",
    description: "Official statutory registration application form for unorganised manual and construction workers in Tamil Nadu.",
    version: "Rev 2026",
  },
  {
    id: "f-2",
    title: "Form 5: Workplace Accident Relief Claim Application",
    titleTa: "படிவம் 5: பணியிட விபத்து நிவாரண நிதி கோரும் விண்ணப்பம்",
    category: "forms",
    format: "PDF",
    size: "350 KB",
    description: "Application for claiming immediate ex-gratia relief, disability compensation, or fatal accident coverage.",
    version: "Rev 2026",
  },
  {
    id: "f-3",
    title: "Form 12: Children's Educational Scholarship Application",
    titleTa: "படிவம் 12: தொழிலாளர் பிள்ளைகள் கல்வி உதவித்தொகை விண்ணப்பம்",
    category: "forms",
    format: "PDF",
    size: "280 KB",
    description: "Scholarship claim form along with Headmaster / College Principal bonafide attestation certificate.",
    version: "Rev 2026",
  },
  {
    id: "f-4",
    title: "Form 15: Maternity Assistance Claim Form",
    titleTa: "படிவம் 15: மகப்பேறு நல உதவி மற்றும் ஊட்டச்சத்து நிதி விண்ணப்பம்",
    category: "forms",
    format: "PDF",
    size: "295 KB",
    description: "Form for claiming financial assistance for maternity delivery and post-natal wage compensation.",
    version: "Rev 2026",
  },
  {
    id: "f-5",
    title: "Form 22: Old Age Pension (Retirement) Application",
    titleTa: "படிவம் 22: முதியோர் சமூகப் பாதுகாப்பு ஓய்வூதிய விண்ணப்பம்",
    category: "forms",
    format: "PDF",
    size: "410 KB",
    description: "Application for registered workers completing 60 years of age to initiate monthly pension disbursement.",
    version: "Rev 2026",
  },
  {
    id: "a-1",
    title: "VAO / Employer Work Engagement Certificate Template",
    titleTa: "கிராம நிர்வாக அலுவலர் / முதலாளி பணிச்சான்றிதழ் மாதிரி",
    category: "affidavits",
    format: "PDF",
    size: "180 KB",
    description: "Standard bilingual certificate verifying 90 days of manual or construction work within the last 12 months.",
    version: "Standard",
  },
  {
    id: "a-2",
    title: "Nominee Declaration and Legal Heir Affidavit",
    titleTa: "வாரிசுதாரர் நியமனம் மற்றும் உறுதிமொழி படிவம்",
    category: "affidavits",
    format: "PDF",
    size: "210 KB",
    description: "Notarized affidavit template for nominating beneficiaries for death relief and insurance benefits.",
    version: "Standard",
  },
  {
    id: "m-1",
    title: "Citizen Portal User Manual (English & Tamil)",
    titleTa: "குடிமக்கள் இணையதள பயன்பாட்டு கையேடு",
    category: "manuals",
    format: "PDF",
    size: "2.4 MB",
    description: "Step-by-step graphical guide explaining registration, OTP login, application tracking, and certificate downloads.",
    version: "v3.2",
  },
  {
    id: "m-2",
    title: "e-Seva Kendra Operator Standard Operating Procedures",
    titleTa: "இ-சேவை மைய பணியாளர் வழிகாட்டு நெறிமுறைகள்",
    category: "manuals",
    format: "PDF",
    size: "3.1 MB",
    description: "Operational guidelines for retail Kendra operators processing citizen applications, biometric verification, and wallet payments.",
    version: "v2.8",
  },
  {
    id: "c-1",
    title: "G.O. Ms. No. 48: Revised Unorganised Welfare Benefit Rates",
    titleTa: "அரசாணை எண் 48: மாற்றியமைக்கப்பட்ட நலத்திட்ட உதவித்தொகை விவரங்கள்",
    category: "circulars",
    format: "PDF",
    size: "780 KB",
    description: "Labour and Employment Department Government Order detailing enhanced accident relief and marriage grants.",
    version: "Govt Order",
  },
];

export default function DownloadsPage() {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [downloadToast, setDownloadToast] = useState<string | null>(null);

  const filtered = downloadItems.filter((item) => {
    const matchTab = activeTab === "all" || item.category === activeTab;
    const matchQuery =
      query === "" ||
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.titleTa.toLowerCase().includes(query.toLowerCase()) ||
      item.description.toLowerCase().includes(query.toLowerCase());
    return matchTab && matchQuery;
  });

  function handleDownload(title: string) {
    setDownloadToast(`Preparing download: ${title}`);
    setTimeout(() => {
      setDownloadToast(null);
    }, 3500);
  }

  return (
    <div style={{ background: "var(--bg-subtle)", minHeight: "100vh" }} className="py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
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
            <BookOpen size={14} style={{ color: "var(--color-6)" }} />
            <span>Official Forms & Documents Repository · பதிவிறக்கங்கள்</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-2">
            Downloads & Guidelines
          </h1>
          <p className="text-base font-semibold mb-3" style={{ color: "var(--color-8)", fontFamily: "var(--font-sans-ta)" }}>
            அரசு விண்ணப்பப் படிவங்கள் மற்றும் கையேடுகள்
          </p>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Download official statutory application forms, self-declaration formats, government orders (G.O.), and citizen user manuals.
          </p>
        </div>

        {/* Search & Tabs */}
        <div className="bg-white rounded-2xl border p-4 sm:p-6 mb-8 shadow-xs" style={{ borderColor: "var(--border)" }}>
          <div className="relative w-full mb-5">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search forms by number, scheme name or keyword..."
              className="w-full pl-11 pr-4 h-12 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-[#1e3a8a] transition-all"
              style={{ borderColor: "var(--border)" }}
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {[
              { id: "all", label: "All Documents" },
              { id: "forms", label: "Application Forms" },
              { id: "affidavits", label: "Certificates & Affidavits" },
              { id: "manuals", label: "User Manuals" },
              { id: "circulars", label: "Government Orders" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? "bg-[#1e3a8a] text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Download Toast Notification */}
        {downloadToast && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-xl border border-slate-700 animate-slide-up">
            <CheckCircle2 size={18} className="text-emerald-400" />
            <span className="text-xs sm:text-sm font-medium">{downloadToast}</span>
          </div>
        )}

        {/* Documents List */}
        <div className="space-y-4 mb-12">
          {filtered.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-2xl border p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs hover:border-[#1e3a8a] transition-all"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--color-12)", color: "var(--color-6)" }}
                >
                  <FileText size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {doc.format}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">{doc.size}</span>
                    <span className="text-[11px] text-slate-400">· {doc.version}</span>
                  </div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">
                    {doc.title}
                  </h2>
                  <p className="text-xs font-semibold mt-0.5" style={{ color: "var(--color-8)", fontFamily: "var(--font-sans-ta)" }}>
                    {doc.titleTa}
                  </p>
                  <p className="text-xs text-slate-500 mt-1 max-w-2xl">{doc.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => handleDownload(doc.title)}
                  className="h-10 px-4 rounded-xl text-xs sm:text-sm font-bold border border-[#1e3a8a] text-[#1e3a8a] hover:bg-blue-50 flex items-center gap-2 transition-colors whitespace-nowrap"
                >
                  <Download size={14} />
                  <span>Download PDF</span>
                </button>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl border" style={{ borderColor: "var(--border)" }}>
              <FileText size={40} className="mx-auto text-slate-300 mb-3" />
              <p className="text-sm font-bold text-slate-700">No documents match your search criteria</p>
              <p className="text-xs text-slate-500 mt-1">Try clearing filters or checking your spelling</p>
            </div>
          )}
        </div>

        {/* Offline Assistance Note */}
        <div
          className="rounded-2xl border p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          style={{ background: "var(--color-14)", borderColor: "var(--color-11)" }}
        >
          <div className="flex items-center gap-3">
            <Shield size={22} className="text-[#1e3a8a] flex-shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Need physical hard-copy forms?</h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Physical application forms are available free of charge at all District Labour Welfare Offices and e-Seva Kendras.
              </p>
            </div>
          </div>
          <a
            href="/contact"
            className="text-xs font-bold text-[#1e3a8a] hover:underline whitespace-nowrap flex items-center gap-1"
          >
            <span>Locate Nearest Kendra</span>
            <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </div>
  );
}
