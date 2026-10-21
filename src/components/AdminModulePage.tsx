"use client";

import { useState, useMemo } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { formatGeoBilingual } from "@/lib/geo-bilingual";
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  Download,
  Eye,
  FileText,
  UserCheck,
  Send,
  X,
  FileSpreadsheet,
  Check,
  RotateCcw,
  Sparkles,
} from "lucide-react";

export interface AdminRecord {
  id: string;
  title: string;
  detail: string;
  status: string;
  category?: string;
  role?: string;
  amount?: string;
  date?: string;
  contact?: string;
  district?: string;
  docs?: { name: string; type?: string; verified?: boolean }[];
  remarks?: string;
}

export interface AdminModulePageProps {
  eyebrow: string;
  title: string;
  description: string;
  records: AdminRecord[];
  roleTabs?: { id: string; label: string }[];
  onAddRecord?: () => void;
  addActionLabel?: string;
  statsOverride?: { label: string; value: string | number; color?: string }[];
}

export default function AdminModulePage({
  eyebrow,
  title,
  description,
  records: initialRecords,
  roleTabs,
  onAddRecord,
  addActionLabel,
  statsOverride,
}: AdminModulePageProps) {
  const { language, t } = useLanguage();
  const isTa = language === "ta";

  // Local state for interactive mutations (session based)
  const [recordsList, setRecordsList] = useState<AdminRecord[]>(initialRecords);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [activeRoleTab, setActiveRoleTab] = useState<string>(roleTabs?.[0]?.id || "ALL");

  // Modal inspection state
  const [selectedRecord, setSelectedRecord] = useState<AdminRecord | null>(null);
  const [actionModal, setActionModal] = useState<{
    record: AdminRecord;
    type: "APPROVE" | "REJECT" | "REUPLOAD" | "ASSIGN";
  } | null>(null);
  const [actionRemark, setActionRemark] = useState("");
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Trigger temporary feedback toast
  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 3500);
  };

  // Status classifier helper
  const getStatusTone = (statusText: string) => {
    const s = statusText.toLowerCase();
    if (s.includes("approved") || s.includes("active") || s.includes("verified") || s.includes("settled") || s.includes("cleared") || s.includes("healthy") || s.includes("ஒப்புதல்")) {
      return {
        bg: "bg-emerald-50 text-emerald-800 border-emerald-200",
        badge: "bg-emerald-500",
        icon: CheckCircle2,
      };
    }
    if (s.includes("pending") || s.includes("scrutiny") || s.includes("review") || s.includes("progress") || s.includes("queue") || s.includes("hold") || s.includes("நிலுவை")) {
      return {
        bg: "bg-amber-50 text-amber-800 border-amber-200",
        badge: "bg-amber-500",
        icon: Clock,
      };
    }
    if (s.includes("reject") || s.includes("disabled") || s.includes("warning") || s.includes("overdue") || s.includes("cancelled") || s.includes("நிராகரி")) {
      return {
        bg: "bg-rose-50 text-rose-800 border-rose-200",
        badge: "bg-rose-500",
        icon: AlertTriangle,
      };
    }
    return {
      bg: "bg-blue-50 text-blue-800 border-blue-200",
      badge: "bg-blue-500",
      icon: CheckCircle2,
    };
  };

  // Filter records
  const filteredRecords = useMemo(() => {
    return recordsList.filter((r) => {
      // Role tab filter
      if (activeRoleTab !== "ALL" && r.role && r.role.toLowerCase() !== activeRoleTab.toLowerCase()) {
        return false;
      }
      // Status pill filter
      if (selectedStatus === "PENDING") {
        const s = r.status.toLowerCase();
        if (!s.includes("pending") && !s.includes("scrutiny") && !s.includes("review") && !s.includes("queue") && !s.includes("hold") && !s.includes("progress") && !s.includes("நிலுவை")) {
          return false;
        }
      } else if (selectedStatus === "APPROVED") {
        const s = r.status.toLowerCase();
        if (!s.includes("approved") && !s.includes("active") && !s.includes("verified") && !s.includes("settled") && !s.includes("cleared") && !s.includes("ஒப்புதல்")) {
          return false;
        }
      } else if (selectedStatus === "REJECTED") {
        const s = r.status.toLowerCase();
        if (!s.includes("reject") && !s.includes("disabled") && !s.includes("cancelled") && !s.includes("நிராகரி")) {
          return false;
        }
      }

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const haystack = `${r.id} ${r.title} ${r.detail} ${r.status} ${r.category || ""} ${r.district || ""}`.toLowerCase();
        return haystack.includes(q);
      }
      return true;
    });
  }, [recordsList, searchQuery, selectedStatus, activeRoleTab]);

  // Compute metrics
  const stats = useMemo(() => {
    if (statsOverride) return statsOverride;
    const total = recordsList.length;
    let pending = 0;
    let approved = 0;
    recordsList.forEach((r) => {
      const s = r.status.toLowerCase();
      if (s.includes("pending") || s.includes("scrutiny") || s.includes("review") || s.includes("queue") || s.includes("hold") || s.includes("நிலுவை")) pending++;
      else if (s.includes("approved") || s.includes("active") || s.includes("verified") || s.includes("settled") || s.includes("cleared") || s.includes("ஒப்புதல்")) approved++;
    });
    return [
      { label: isTa ? "மொத்த பதிவுகள்" : "Total Entries", value: total, color: "border-t-[#1e3a8a]" },
      { label: isTa ? "செயலாக்கத்தில் உள்ளவை" : "Pending Processing", value: pending, color: "border-t-amber-500" },
      { label: isTa ? "ஒப்புதல் பெற்றவை / செயலில்" : "Approved / Active", value: approved, color: "border-t-emerald-600" },
      { label: isTa ? "காலக்கெடு இணக்கம்" : "Adherence SLA", value: "98.4%", color: "border-t-blue-600" },
    ];
  }, [recordsList, statsOverride, isTa]);

  // Execute review action
  const handleConfirmAction = () => {
    if (!actionModal) return;
    const { record, type } = actionModal;
    let newStatus = record.status;
    let note = actionRemark.trim();

    if (type === "APPROVE") {
      newStatus = isTa ? "ஒப்புதல் அளிக்கப்பட்டது · நிர்வாகி கையொப்பமிட்டார்" : "Approved & Verified · Signed by Administrator";
      showToast(isTa ? `பதிவு எண் ${record.id} வெற்றிகரமாக ஒப்புதல் அளிக்கப்பட்டது.` : `Record ${record.id} successfully approved.`);
    } else if (type === "REJECT") {
      newStatus = `${isTa ? "நிராகரிக்கப்பட்டது" : "Rejected"}: ${note || (isTa ? "ஆவண குறைபாடு" : "Document non-compliance")}`;
      showToast(isTa ? `பதிவு எண் ${record.id} நிராகரிக்கப்பட்டது.` : `Record ${record.id} rejected.`);
    } else if (type === "REUPLOAD") {
      newStatus = `${isTa ? "மீண்டும் பதிவேற்றம் கோரப்பட்டது" : "Re-Upload Requested"}: ${note || (isTa ? "தெளிவான ஆவணம் தேவை" : "Clear document required")}`;
      showToast(isTa ? `பதிவு எண் ${record.id} ஆவணங்களை மீண்டும் பதிவேற்ற அறிவிப்பு அனுப்பப்பட்டது.` : `Notice sent for ${record.id} to re-upload documents.`);
    } else if (type === "ASSIGN") {
      newStatus = `${isTa ? "அதிகாரிக்கு ஒதுக்கப்பட்டது" : "Assigned to Officer"}: ${note || (isTa ? "பொது மதிப்பாய்வு பிரிவு" : "General Review Desk")}`;
      showToast(isTa ? `பதிவு எண் ${record.id} பணிக்காக ஒதுக்கப்பட்டது.` : `Task for ${record.id} assigned.`);
    }


    setRecordsList((prev) =>
      prev.map((r) => (r.id === record.id ? { ...r, status: newStatus, remarks: note || r.remarks } : r))
    );

    if (selectedRecord && selectedRecord.id === record.id) {
      setSelectedRecord({ ...selectedRecord, status: newStatus, remarks: note || selectedRecord.remarks });
    }

    setActionModal(null);
    setActionRemark("");
  };

  // Export CSV handler
  const handleExportCSV = () => {
    const headers = ["ID", "Title", "Details", "Status", "District", "Date"];
    const rows = filteredRecords.map((r) => [
      `"${r.id}"`,
      `"${r.title.replace(/"/g, '""')}"`,
      `"${r.detail.replace(/"/g, '""')}"`,
      `"${r.status.replace(/"/g, '""')}"`,
      `"${r.district || "Tamil Nadu"}"`,
      `"${r.date || new Date().toISOString().split("T")[0]}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${title.toLowerCase().replace(/[^a-z0-9]/g, "_")}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("CSV export downloaded successfully.");
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {feedbackToast && (
        <div className="fixed top-20 right-6 z-50 rounded-xl bg-slate-900 text-white px-5 py-3 shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-top-4 duration-200">
          <Sparkles className="w-4 h-4 text-orange-400" />
          <span className="text-xs font-semibold">{feedbackToast}</span>
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#ea580c]">{eyebrow}</span>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">{title}</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onAddRecord && (
            <button
              type="button"
              onClick={onAddRecord}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#1e3a8a] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#1e40af] transition-colors"
            >
              {addActionLabel || (isTa ? "புதிய பதிவு உருவாக்கு" : "Create New Entry")}
            </button>
          )}
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
            title={isTa ? "பதிவுகளை CSV ஆக ஏற்றுமதி செய்க" : "Export filtered records to CSV"}
          >
            <Download className="w-4 h-4 text-slate-500" /> {isTa ? "CSV ஏற்றுமதி" : "Export CSV"}
          </button>
        </div>
      </div>

      {/* Metric summary counters */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className={`rounded-xl border border-slate-200 bg-white p-5 shadow-xs border-t-4 ${
              s.color || "border-t-[#1e3a8a]"
            }`}
          >
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{s.label}</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Role Tabs if supplied */}
      {roleTabs && roleTabs.length > 0 && (
        <div className="border-b border-slate-200">
          <nav className="flex space-x-6 overflow-x-auto pb-px" aria-label="Role filters">
            <button
              type="button"
              onClick={() => setActiveRoleTab("ALL")}
              className={`pb-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
                activeRoleTab === "ALL"
                  ? "border-[#1e3a8a] text-[#1e3a8a]"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
              }`}
            >
              {isTa ? "அனைத்து குழுக்கள்" : "All Populations"} ({recordsList.length})
            </button>
            {roleTabs.map((t) => {
              const count = recordsList.filter((r) => r.role?.toLowerCase() === t.id.toLowerCase()).length;
              const isActive = activeRoleTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveRoleTab(t.id)}
                  className={`pb-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
                    isActive
                      ? "border-[#1e3a8a] text-[#1e3a8a]"
                      : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                  }`}
                >
                  {t.label}
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full ${
                      isActive ? "bg-blue-100 text-[#1e3a8a]" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      )}

      {/* Table section with search and filter controls */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        {/* Table Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isTa ? "பதிவு எண், பெயர், திட்டம், மொபைல் அல்லது மாவட்டம் மூலம் தேடுக..." : "Search by ID, name, scheme, mobile, or district..."}
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-300 bg-white text-xs outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> {isTa ? "நிலை:" : "Status:"}
            </span>
            {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map((st) => {
              const label =
                st === "ALL"
                  ? (isTa ? "அனைத்து நிலைகளும்" : "All Statuses")
                  : st === "PENDING"
                  ? (isTa ? "நிலுவையில்" : "Pending")
                  : st === "APPROVED"
                  ? (isTa ? "ஒப்புதல் அளிக்கப்பட்டது" : "Approved")
                  : (isTa ? "நிராகரிக்கப்பட்டது" : "Rejected");
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => setSelectedStatus(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedStatus === st
                      ? "bg-[#1e3a8a] text-white shadow-xs"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Records list */}
        {filteredRecords.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <FileSpreadsheet className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-800">
              {isTa ? "பொருந்தக்கூடிய நிர்வாகப் பதிவுகள் எதுவும் கிடைக்கவில்லை" : "No matching administrative records found"}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {isTa ? "வேறு சொற்களைப் பயன்படுத்தி தேடவும் அல்லது நிலை வடிகட்டியை மாற்றவும்." : "Try adjusting your keyword search or changing the status filter."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredRecords.map((record) => {
              const tone = getStatusTone(record.status);
              const districtBilingual = record.district
                ? formatGeoBilingual(record.district).bilingual || record.district
                : null;
              return (
                <article
                  key={record.id}
                  className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                        {record.id}
                      </span>
                      {districtBilingual && (
                        <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1 bg-amber-50/80 px-2 py-0.5 rounded border border-amber-200/60">
                          📍 {districtBilingual}
                        </span>
                      )}
                      {record.amount && (
                        <span className="text-xs font-extrabold text-slate-900 bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">
                          {record.amount}
                        </span>
                      )}
                    </div>

                    <h3 className="mt-1.5 text-sm font-bold text-slate-900 leading-snug">{record.title}</h3>
                    <p className="mt-1 text-xs text-slate-600 line-clamp-2 leading-relaxed">{record.detail}</p>

                    <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${tone.bg}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${tone.badge}`} />
                        {record.status}
                      </span>
                      {record.date && (
                        <span className="text-[11px] text-slate-400">
                          {isTa ? "சமர்ப்பிக்கப்பட்டது:" : "Submitted:"} {record.date}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    <button
                      type="button"
                      onClick={() => setSelectedRecord(record)}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-500" /> {isTa ? "கோப்பு விவரம்" : "Dossier"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setActionModal({ record, type: "APPROVE" })}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-2xs"
                    >
                      <Check className="w-3.5 h-3.5" /> {isTa ? "ஒப்புதல்" : "Approve"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setActionModal({ record, type: "REJECT" })}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" /> {isTa ? "நிராகரி" : "Reject"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <span>
            {isTa ? (
              <>
                <strong>{recordsList.length}</strong> பதிவுகளில் <strong>{filteredRecords.length}</strong> காட்டப்படுகின்றன
              </>
            ) : (
              <>
                Showing <strong>{filteredRecords.length}</strong> of <strong>{recordsList.length}</strong> records
              </>
            )}
          </span>
          <span className="text-slate-400">
            {isTa ? "லேபர்சேவா ஒருங்கிணைந்த நிர்வாக கட்டமைப்பு" : "LabourSeva Unified Administration Engine"}
          </span>
        </div>
      </section>

      {/* Record Dossier Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-blue-900 to-[#1e3a8a] text-white">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-orange-300">
                  {isTa ? "பயனாளி கோப்பு மதிப்பாய்வு" : "Beneficiary Dossier Review"}
                </span>
                <h2 className="text-lg font-extrabold mt-0.5">{selectedRecord.title}</h2>
                <p className="font-mono text-xs text-blue-200 mt-1">
                  {isTa ? "குறிப்பு எண்:" : "Ref ID:"} {selectedRecord.id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed">
                <strong className="block font-bold text-slate-900 mb-1">
                  {isTa ? "விவரங்கள் மற்றும் பிரகடனம்:" : "Details & Declaration:"}
                </strong>
                {selectedRecord.detail}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg border border-slate-100 bg-white">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    {isTa ? "தற்போதைய நிலை" : "Current Status"}
                  </span>
                  <span className="font-bold text-slate-800 mt-1 block">{selectedRecord.status}</span>
                </div>
                <div className="p-3 rounded-lg border border-slate-100 bg-white">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    {isTa ? "பிரதேசம் / மாவட்டம்" : "Territory / District"}
                  </span>
                  <span className="font-bold text-slate-800 mt-1 block">
                    {formatGeoBilingual(selectedRecord.district || "Tamil Nadu").bilingual || (selectedRecord.district || "Tamil Nadu / தமிழ்நாடு")}
                  </span>
                </div>
              </div>

              {/* Verified Documents Simulation */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-[#1e3a8a]" />{" "}
                  {isTa ? "கேஒய்சி & சரிபார்ப்பு ஆவணங்கள்" : "KYC & Verification Documents"}
                </h4>
                <div className="space-y-2">
                  <div className="p-3 rounded-lg border border-slate-200 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <div>
                        <p className="font-semibold text-slate-800">
                          {isTa ? "ஆதார் / தேசிய அடையாள ஆவணம்" : "Aadhaar / National Identity Document"}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {isTa ? "ஓடிபி இ-கேஒய்சி மூலம் சரிபார்க்கப்பட்டது" : "UIDAI verified via OTP e-KYC"}
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {isTa ? "சரிபார்க்கப்பட்டது" : "Verified Match"}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg border border-slate-200 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-amber-600" />
                      <div>
                        <p className="font-semibold text-slate-800">
                          {isTa ? "பணியாளர் 90-நாள் வேலை சான்றிதழ்" : "Employer 90-Day Work Certificate"}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {isTa ? "ஒப்பந்ததாரர் / விஏஓ சான்றளித்தது" : "Attested by Civil Contractor / VAO"}
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      {isTa ? "டிஜிட்டல் முத்திரை செல்லுபடியாகும்" : "Digital Seal Valid"}
                    </span>
                  </div>
                </div>
              </div>

              {selectedRecord.remarks && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
                  <strong>{isTa ? "அதிகாரி தணிக்கைக் குறிப்பு:" : "Officer Audit Note:"}</strong> {selectedRecord.remarks}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  const rec = selectedRecord;
                  setSelectedRecord(null);
                  setActionModal({ record: rec, type: "REUPLOAD" });
                }}
                className="px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 hover:bg-white"
              >
                {isTa ? "மீண்டும் பதிவேற்றக் கோரிக்கை" : "Request Re-upload"}
              </button>
              <button
                type="button"
                onClick={() => {
                  const rec = selectedRecord;
                  setSelectedRecord(null);
                  setActionModal({ record: rec, type: "REJECT" });
                }}
                className="px-3.5 py-2 rounded-lg border border-rose-200 bg-rose-50 text-xs font-bold text-rose-700 hover:bg-rose-100"
              >
                {isTa ? "கோரிக்கையை நிராகரி" : "Reject Claim"}
              </button>
              <button
                type="button"
                onClick={() => {
                  const rec = selectedRecord;
                  setSelectedRecord(null);
                  setActionModal({ record: rec, type: "APPROVE" });
                }}
                className="px-4 py-2 rounded-lg bg-[#1e3a8a] text-xs font-bold text-white hover:bg-[#1e40af]"
              >
                {isTa ? "கையொப்பமிட்டு ஒப்புதல் அளி" : "Sign & Approve"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Dialog (Approve, Reject, Reupload, Assign) */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                {actionModal.type === "APPROVE" && (isTa ? "நிர்வாக ஒப்புதலை உறுதிப்படுத்தவும்" : "Confirm Administrative Approval")}
                {actionModal.type === "REJECT" && (isTa ? "பதிவை நிராகரித்து காரணத்தைக் குறிப்பிடவும்" : "Reject Record & State Reason")}
                {actionModal.type === "REUPLOAD" && (isTa ? "ஆவணத்தை மீண்டும் பதிவேற்றக் கோரவும்" : "Request Document Re-Upload")}
                {actionModal.type === "ASSIGN" && (isTa ? "அதிகாரிக்கு பணியை ஒதுக்குங்கள்" : "Assign Task to Officer")}
              </h3>
              <button type="button" onClick={() => setActionModal(null)} className="p-1 rounded text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-600">
                {isTa ? "செயல் இலக்கு:" : "Action target:"}{" "}
                <strong className="text-slate-900">{actionModal.record.title}</strong> (
                <span className="font-mono text-slate-500">{actionModal.record.id}</span>)
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {actionModal.type === "APPROVE" && (isTa ? "ஒப்புதல் குறிப்புகள் (விருப்பத்தேர்வு)" : "Approval Remarks (Optional)")}
                  {actionModal.type === "REJECT" && (isTa ? "கட்டாய நிராகரிப்பு காரணம்" : "Mandatory Rejection Reason")}
                  {actionModal.type === "REUPLOAD" && (isTa ? "குடிமகனுக்கான குறிப்பிட்ட பதிவேற்ற வழிகாட்டல்" : "Specific Re-upload Instructions for Citizen")}
                  {actionModal.type === "ASSIGN" && (isTa ? "அதிகாரி பெயர் & உள் உத்தரவு" : "Officer Name & Internal Directive")}
                </label>
                <textarea
                  rows={3}
                  value={actionRemark}
                  onChange={(e) => setActionRemark(e.target.value)}
                  placeholder={
                    actionModal.type === "REJECT"
                      ? (isTa ? "எ.கா: வங்கி கணக்கு புத்தகம் தெளிவாக இல்லை / வேலை காலம் 90 நாட்களுக்கு குறைவு." : "e.g., Bank passbook scan unreadable / Work duration less than mandatory 90 days.")
                      : actionModal.type === "REUPLOAD"
                      ? (isTa ? "எ.கா: தெளிவான வண்ண புகைப்படம் மற்றும் சான்றளிக்கப்பட்ட சான்றிதழை பதிவேற்றவும்." : "e.g., Please upload clear color photograph and signed employer certificate.")
                      : (isTa ? "துறை சார்ந்த மதிப்பாய்வு கருத்துகளை உள்ளிடவும்..." : "Enter departmental review comments...")
                  }
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-xs outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {actionModal.type === "APPROVE" && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    {isTa
                      ? "இப்பதிவுக்கு ஒப்புதல் அளிப்பது வகுப்பு 3 டிஜிட்டல் முத்திரையைப் பயன்படுத்தி விண்ணப்பதாரரின் நிலையை புதுப்பிக்கும்."
                      : "Approving this record will apply the Class 3 Digital Certificate seal and update the applicant state."}
                  </span>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-white"
              >
                {isTa ? "ரத்துசெய்" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold text-white transition-colors ${
                  actionModal.type === "REJECT"
                    ? "bg-rose-600 hover:bg-rose-700"
                    : actionModal.type === "APPROVE"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-[#1e3a8a] hover:bg-[#1e40af]"
                }`}
              >
                {isTa
                  ? (actionModal.type === "APPROVE" ? "ஒப்புதலை உறுதிப்படுத்து" : actionModal.type === "REJECT" ? "நிராகரிப்பை உறுதிப்படுத்து" : "உறுதிப்படுத்து")
                  : `Confirm ${actionModal.type.charAt(0) + actionModal.type.slice(1).toLowerCase()}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
