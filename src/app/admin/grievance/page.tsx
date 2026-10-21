"use client";

import { useState, useMemo } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { formatGeoBilingual } from "@/lib/geo-bilingual";
import {
  MessageSquareWarning,
  Search,
  Filter,
  Download,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Phone,
  Mail,
  MapPin,
  ShieldAlert,
  ShieldCheck,
  Send,
  X,
  FileText,
  User,
  ArrowUpRight,
  MessageCircle,
} from "lucide-react";

interface Grievance {
  id: string;
  ticketNo: string;
  complainantName: string;
  role: "CITIZEN" | "RETAILER" | "DISTRIBUTOR";
  mobile: string;
  category: "PAYMENT_FAILURE" | "CARD_DELIVERY_DELAY" | "REJECTION_APPEAL" | "RETAILER_OVERCHARGING";
  subject: string;
  description: string;
  district: string;
  slaRemainingHours: number;
  status: "OPEN" | "INVESTIGATING" | "ESCALATED" | "RESOLVED";
  filedDate: string;
  officerAssigned: string;
  resolutionNotes?: string;
}

const initialGrievances: Grievance[] = [];


export default function AdminGrievancePage() {
  const { isTamil } = useLanguage();
  const [grievances, setGrievances] = useState<Grievance[]>(initialGrievances);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "OPEN" | "INVESTIGATING" | "ESCALATED" | "RESOLVED">("ALL");

  // Modals
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [selectedGrievance, setSelectedGrievance] = useState<Grievance | null>(null);
  const [toastMessage, setToastMessage] = useState("");

  // Resolve form state
  const [findings, setFindings] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [refundApproved, setRefundApproved] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  const filteredGrievances = useMemo(() => {
    return grievances.filter((g) => {
      const matchesSearch =
        g.ticketNo.toLowerCase().includes(search.toLowerCase()) ||
        g.complainantName.toLowerCase().includes(search.toLowerCase()) ||
        g.subject.toLowerCase().includes(search.toLowerCase()) ||
        g.mobile.includes(search) ||
        g.district.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === "ALL" || g.category === categoryFilter;
      const matchesStatus = statusFilter === "ALL" || g.status === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [grievances, search, categoryFilter, statusFilter]);

  const handleOpenDetail = (g: Grievance) => {
    setSelectedGrievance(g);
    setDetailModalOpen(true);
  };

  const handleOpenResolve = (g: Grievance) => {
    setSelectedGrievance(g);
    setDetailModalOpen(false);
    setFindings("");
    setActionTaken("");
    setRefundApproved(false);
    setResolveModalOpen(true);
  };

  const handleExecuteResolve = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGrievance) return;
    const finalNotes = `${findings} — Action: ${actionTaken}${refundApproved ? " (Wallet Refund Initiated)" : ""}`;

    setGrievances((prev) =>
      prev.map((g) =>
        g.id === selectedGrievance.id
          ? { ...g, status: "RESOLVED", resolutionNotes: finalNotes }
          : g
      )
    );

    setResolveModalOpen(false);
    showToast(`Grievance ${selectedGrievance.ticketNo} marked RESOLVED. Notification dispatched.`);
  };

  const handleEscalate = (gId: string) => {
    setGrievances((prev) =>
      prev.map((g) => (g.id === gId ? { ...g, status: "ESCALATED" } : g))
    );
    setDetailModalOpen(false);
    showToast(`Grievance escalated to Joint Commissioner of Labour.`);
  };

  const exportCSV = () => {
    const headers = ["Ticket No", "Complainant", "Role", "Mobile", "Category", "Subject", "District", "Status", "SLA (Hrs)"];
    const rows = filteredGrievances.map((g) => [
      g.ticketNo,
      g.complainantName,
      g.role,
      g.mobile,
      g.category,
      g.subject,
      g.district,
      g.status,
      g.slaRemainingHours,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "labourseva_grievances_tracker.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 rounded-xl bg-slate-900 text-white px-5 py-3 shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#1e3a8a] via-[#1e40af] to-[#2563eb] rounded-2xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold uppercase tracking-wider backdrop-blur-sm border border-white/10 mb-3">
                <MessageSquareWarning className="w-3.5 h-3.5 text-amber-300" />
                {isTamil ? "சர்ச்சை தீர்வு மையம் (admin_grievance.php)" : "Dispute Redressal Desk (admin_grievance.php)"}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                {isTamil ? "பொது குறைகள் மற்றும் தீர்வு" : "Public Grievances & Redressal"}
              </h1>
              <p className="mt-1 text-sm sm:text-base text-blue-100 max-w-2xl">
                {isTamil
                  ? "குடிமக்கள் புகார்களைக் கண்காணிக்கவும், சில்லறை விற்பனையாளர் கூடுதல் கட்டண சர்ச்சைகளை விசாரிக்கவும், சட்டப்பூர்வ 48 மணி நேர தீர்வு காலக்கெடுவை நடைமுறைப்படுத்தவும், கட்டண திரும்பப்பெறுதல்களை அங்கீகரிக்கவும்."
                  : "Track citizen complaints, investigate retailer overcharging disputes, enforce statutory 48-hour resolution SLAs, and approve fee refunds."}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={exportCSV}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold border border-white/20 transition-all backdrop-blur-sm shadow-sm"
              >
                <Download className="w-4 h-4" />
                {isTamil ? "CSV ஏற்றுமதி" : "Export CSV"}
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/15">
            <div>
              <p className="text-xs text-blue-200 font-medium">{isTamil ? "திறந்த புகார்கள்" : "Open Tickets"}</p>
              <p className="text-2xl font-black mt-1 text-amber-300">
                {grievances.filter((g) => g.status === "OPEN").length} {isTamil ? "செயலில்" : "Active"}
              </p>
            </div>
            <div>
              <p className="text-xs text-blue-200 font-medium">{isTamil ? "காலக்கெடு மீறியவை (>48 மணி)" : "SLA Breached (>48h)"}</p>
              <p className="text-2xl font-black mt-1 text-red-300">
                {grievances.filter((g) => g.slaRemainingHours < 0 && g.status !== "RESOLVED").length} {isTamil ? "அவசரம்" : "Urgent"}
              </p>
            </div>
            <div>
              <p className="text-xs text-blue-200 font-medium">{isTamil ? "விசாரணையில்" : "Investigating"}</p>
              <p className="text-2xl font-black mt-1 text-blue-200">
                {grievances.filter((g) => g.status === "INVESTIGATING").length} {isTamil ? "ஆய்வில்" : "Under Review"}
              </p>
            </div>
            <div>
              <p className="text-xs text-blue-200 font-medium">{isTamil ? "தீர்க்கப்பட்ட வழக்குகள்" : "Resolved Cases"}</p>
              <p className="text-2xl font-black mt-1 text-emerald-300">
                {grievances.filter((g) => g.status === "RESOLVED").length} {isTamil ? "வழக்குகள்" : "Cases"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-3 min-w-[280px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isTamil ? "டிக்கெட் எண், புகார்தாரர் பெயர், மொபைல் அல்லது மாவட்டம் மூலம் தேடவும்..." : "Search by Ticket No, Complainant Name, Mobile, Subject, or District..."}
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:bg-white transition-all"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
            >
              <option value="ALL">{isTamil ? "அனைத்து பிரிவுகளும்" : "All Categories"}</option>
              <option value="PAYMENT_FAILURE">{isTamil ? "கட்டண தோல்வி" : "Payment Failure"}</option>
              <option value="CARD_DELIVERY_DELAY">{isTamil ? "அட்டை விநியோக தாமதம்" : "Card Delivery Delay"}</option>
              <option value="REJECTION_APPEAL">{isTamil ? "நிராகரிப்பு மேல்முறையீடு" : "Rejection Appeal"}</option>
              <option value="RETAILER_OVERCHARGING">{isTamil ? "சில்லறை விற்பனையாளர் கூடுதல் கட்டணம்" : "Retailer Overcharging"}</option>
            </select>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            {(["ALL", "OPEN", "INVESTIGATING", "ESCALATED", "RESOLVED"] as const).map((st) => {
              const label = isTamil
                ? st === "ALL" ? "அனைத்தும்" : st === "OPEN" ? "திறந்தவை" : st === "INVESTIGATING" ? "விசாரணை" : st === "ESCALATED" ? "மேல்முறையீடு" : "தீர்க்கப்பட்டவை"
                : st;
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    statusFilter === st
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Grievance Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto w-full scrollbar-thin">
          <table className="w-full min-w-[980px] text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-700">
              <tr>
                <th className="px-5 py-4 whitespace-nowrap">{isTamil ? "டிக்கெட் & புகார்தாரர்" : "Ticket & Complainant"}</th>
                <th className="px-5 py-4 whitespace-nowrap">{isTamil ? "வகை & பொருள்" : "Category & Subject"}</th>
                <th className="px-5 py-4 whitespace-nowrap">{isTamil ? "மாவட்டம் & அதிகாரி" : "District & Officer"}</th>
                <th className="px-5 py-4 whitespace-nowrap">{isTamil ? "எஸ்.எல்.ஏ காலக்கெடு" : "SLA Countdown"}</th>
                <th className="px-5 py-4 whitespace-nowrap">{isTamil ? "நிலை" : "Status"}</th>
                <th className="px-5 py-4 text-right whitespace-nowrap min-w-[100px]">{isTamil ? "நடவடிக்கைகள்" : "Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredGrievances.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                    <AlertTriangle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">
                      {isTamil ? "குறைதீர்ப்பு முறையீடுகள் எதுவும் பதிவு செய்யப்படவில்லை" : "No Grievance Appeals Recorded"}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {isTamil ? "உதவி மையம் மூலம் பதிவு செய்யப்படும் பொது புகார்கள் இங்கே தோன்றும்." : "Disputes and public complaints filed through the helpdesk will appear here."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredGrievances.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900 text-base">{g.complainantName}</div>
                      <div className="text-xs font-mono text-[#1e3a8a] font-semibold mt-0.5">{g.ticketNo}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{g.mobile} · <strong className="font-semibold text-slate-700">{g.role}</strong></span>
                      </div>
                    </td>

                    <td className="px-5 py-4 max-w-sm">
                      <span className="shrink-0 whitespace-nowrap px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700">
                        {g.category.replace("_", " ")}
                      </span>
                      <div className="font-semibold text-slate-800 text-xs mt-1 truncate block" title={g.subject}>{g.subject}</div>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{formatGeoBilingual(g.district).bilingual}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 font-medium">
                        {isTamil ? "ஒதுக்கப்பட்டவர்:" : "Assigned:"} {g.officerAssigned}
                      </div>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      {g.status === "RESOLVED" ? (
                        <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>{isTamil ? "தீர்க்கப்பட்டது" : "SLA Cleared"}</span>
                        </span>
                      ) : g.slaRemainingHours < 0 ? (
                        <span className="shrink-0 whitespace-nowrap inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 px-2.5 py-1 rounded-full border border-red-200">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>{isTamil ? `${Math.abs(g.slaRemainingHours)} மணிநேரம் கடந்தது` : `Breached by ${Math.abs(g.slaRemainingHours)}h`}</span>
                        </span>
                      ) : (
                        <span className="shrink-0 whitespace-nowrap inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          <span>{isTamil ? `${g.slaRemainingHours} மணி மீதம்` : `${g.slaRemainingHours}h remaining`}</span>
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <span
                        className={`shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                          g.status === "RESOLVED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : g.status === "INVESTIGATING"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : g.status === "OPEN"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}
                      >
                        {isTamil
                          ? g.status === "RESOLVED"
                            ? "தீர்க்கப்பட்டது"
                            : g.status === "INVESTIGATING"
                            ? "விசாரணை"
                            : g.status === "OPEN"
                            ? "திறந்தது"
                            : "மேல்முறையீடு"
                          : g.status}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right whitespace-nowrap min-w-[100px]">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(g)}
                          className="p-1.5 text-slate-600 hover:text-[#1e3a8a] hover:bg-slate-100 rounded-lg transition-colors shrink-0 cursor-pointer"
                          title={isTamil ? "புகார் ஆவணங்களைப் பார்க்க" : "View Grievance Hearing Dossier"}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {g.status !== "RESOLVED" && (
                          <button
                            type="button"
                            onClick={() => handleOpenResolve(g)}
                            className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors shrink-0 cursor-pointer"
                            title={isTamil ? "தீர்வைப் பதிவு செய்து புகாரை முடிக்க" : "Record Resolution & Close Dispute"}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Grievance Detail Dossier */}
      {detailModalOpen && selectedGrievance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-5 bg-[#1e3a8a] text-white flex items-center justify-between">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-blue-200">
                  {isTamil ? "விசாரணை பதிவு" : "Hearing Record"} · {selectedGrievance.ticketNo}
                </span>
                <h3 className="text-lg font-bold mt-0.5">{selectedGrievance.subject}</h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1 text-xs text-slate-700">
                <p><strong>{isTamil ? "புகார்தாரர்:" : "Complainant:"}</strong> {selectedGrievance.complainantName} ({selectedGrievance.mobile})</p>
                <p><strong>{isTamil ? "மாவட்டம்:" : "District:"}</strong> {formatGeoBilingual(selectedGrievance.district).bilingual}</p>
                <p><strong>{isTamil ? "பதிவு செய்த நாள்:" : "Filed On:"}</strong> {selectedGrievance.filedDate}</p>
                <p><strong>{isTamil ? "ஒதுக்கப்பட்ட அதிகாரி:" : "Assigned Officer:"}</strong> {selectedGrievance.officerAssigned}</p>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  {isTamil ? "புகார்தாரரின் விளக்கம்" : "Complainant Narrative"}
                </h4>
                <div className="p-3 bg-blue-50/50 border border-blue-200/60 rounded-xl text-xs text-slate-800 leading-relaxed">
                  {selectedGrievance.description}
                </div>
              </div>

              {selectedGrievance.resolutionNotes && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    {isTamil ? "முறையான தீர்வு முடிவுகள்" : "Formal Resolution Findings"}
                  </h4>
                  <div className="p-3 bg-emerald-50/50 border border-emerald-200/60 rounded-xl text-xs text-emerald-900 leading-relaxed">
                    {selectedGrievance.resolutionNotes}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-between">
              {selectedGrievance.status !== "RESOLVED" && selectedGrievance.status !== "ESCALATED" ? (
                <button
                  type="button"
                  onClick={() => handleEscalate(selectedGrievance.id)}
                  className="px-4 py-2 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 cursor-pointer"
                >
                  {isTamil ? "இணை ஆணையருக்கு மாற்று" : "Escalate to Joint Commissioner"}
                </button>
              ) : <div></div>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDetailModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  {isTamil ? "மூடு" : "Close"}
                </button>
                {selectedGrievance.status !== "RESOLVED" && (
                  <button
                    type="button"
                    onClick={() => handleOpenResolve(selectedGrievance)}
                    className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm cursor-pointer"
                  >
                    {isTamil ? "சர்ச்சையைத் தீர்க்கவும்" : "Resolve Dispute"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Record Resolution & Closure */}
      {resolveModalOpen && selectedGrievance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden">
            <div className="px-6 py-5 bg-[#1e3a8a] text-white flex items-center justify-between">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-blue-200">
                  {isTamil ? "முறையான சர்ச்சை தீர்வு முடிவு" : "Formal Dispute Closure"}
                </span>
                <h3 className="text-lg font-bold mt-0.5">
                  {isTamil ? `டிக்கெட் தீர்வு ${selectedGrievance.ticketNo}` : `Resolve Ticket ${selectedGrievance.ticketNo}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setResolveModalOpen(false)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteResolve} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {isTamil ? "விசாரணை முடிவுகள்" : "Investigation Findings"}
                </label>
                <textarea
                  rows={2}
                  required
                  value={findings}
                  onChange={(e) => setFindings(e.target.value)}
                  placeholder={isTamil ? "சரிபார்க்கப்பட்ட துறைசார்ந்த முடிவுகளை உள்ளிடவும்..." : "State verified departmental findings..."}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {isTamil ? "மேற்கொள்ளப்பட்ட சீர்திருத்த நடவடிக்கை" : "Corrective Action Taken"}
                </label>
                <textarea
                  rows={2}
                  required
                  value={actionTaken}
                  onChange={(e) => setActionTaken(e.target.value)}
                  placeholder={isTamil ? "எ.கா. ஸ்பீடு போஸ்ட் மூலம் மாற்று அட்டை அனுப்பப்பட்டது / மீதமுள்ள தொகை வரவு வைக்கப்பட்டது..." : "e.g. Dispatched replacement card via Speed Post / Credited missing float..."}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                />
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={refundApproved}
                  onChange={(e) => setRefundApproved(e.target.checked)}
                  className="rounded text-[#1e3a8a] focus:ring-[#1e3a8a] w-4 h-4"
                />
                <span>{isTamil ? "குடிமகனுக்கு நேரடி பணப்பை பணத்தைத் திரும்பப் பெறுவதை அங்கீகரிக்கவும்" : "Approve direct wallet refund / fee reversal to citizen"}</span>
              </label>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setResolveModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  {isTamil ? "ரத்துசெய்" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm cursor-pointer"
                >
                  {isTamil ? "முடிவை உறுதிசெய்து அறிவிக்கவும்" : "Confirm Closure & Notify"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
