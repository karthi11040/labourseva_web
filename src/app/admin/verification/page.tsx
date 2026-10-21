"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import {
  CheckCircle2,
  XCircle,
  FileQuestion,
  RefreshCw,
  Search,
  Filter,
  Eye,
  EyeOff,
  FileText,
  AlertCircle,
  ExternalLink,
  Building,
  User,
  Calendar,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
} from "lucide-react";

interface VerificationItem {
  id: number;
  userType: "customer" | "guest" | "retailer" | "distributor" | "user";
  applicantName: string;
  phone: string;
  email: string;
  address?: string;
  shopName?: string;
  idType: string;
  idNumber: string;
  documentUrl: string | null;
  hasDocument: boolean;
  status: string;
  statusNote: string;
  rejectionReason: string;
  submittedAt: string;
  recordSource?: string;
  profileData?: Record<string, any>;
}

function getVerificationItemKey(item: VerificationItem) {
  // IDs are only unique within their source table. Pending registrations and
  // provisioned accounts can therefore share a type and numeric ID.
  return JSON.stringify([
    item.userType,
    item.recordSource || "account",
    item.id,
    item.email,
    item.phone,
    item.submittedAt,
    item.applicantName,
  ]);
}

export default function AdminVerificationPage() {
  const { language } = useLanguage();
  const isTa = language === "ta";

  const [items, setItems] = useState<VerificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState("user");
  const [statusFilter, setStatusFilter] = useState("new");
  const [search, setSearch] = useState("");
  const [showFullPhone, setShowFullPhone] = useState(true);
  const [remark, setRemark] = useState("");
  const [approvalCommand, setApprovalCommand] = useState("Identity documents verified");
  const [approvalCustom, setApprovalCustom] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionCustom, setRejectionCustom] = useState("");
  const [actionInProgress, setActionInProgress] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/verification/requests?userType=${typeFilter}&status=${statusFilter}&search=${encodeURIComponent(search)}`
      );
      const data = await res.json();
      if (res.ok && data.ok) {
        const fetchedItems: VerificationItem[] = data.requests || [];
        setItems(fetchedItems);
        if (fetchedItems.length > 0) {
          if (!selectedKey || !fetchedItems.some((i) => getVerificationItemKey(i) === selectedKey)) {
            setSelectedKey(getVerificationItemKey(fetchedItems[0]));
          }
        } else {
          setSelectedKey(null);
        }
      }
    } catch {
      setMessage({
        type: "error",
        text: isTa ? "தரவுத்தளத்திலிருந்து சரிபார்ப்பு கோரிக்கைகளை ஏற்றுவதில் தோல்வி." : "Failed to load live verification requests from database.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [typeFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRequests();
  };

  const selected =
    items.find((item) => getVerificationItemKey(item) === selectedKey) ||
    items[0] ||
    null;

  async function handleReviewAction(action: "APPROVE" | "REJECT" | "REQUEST_DOCS") {
    if (!selected) return;

    const decisionNotes = action === "APPROVE"
      ? [approvalCommand, approvalCustom.trim()].filter(Boolean).join(" — ")
      : action === "REJECT"
        ? [rejectionReason, rejectionCustom.trim()].filter(Boolean).join(" — ")
        : remark.trim();

    if (action === "REJECT" && !rejectionReason && !rejectionCustom.trim()) {
      setMessage({ type: "error", text: "Select a rejection reason or enter a custom reason." });
      return;
    }
    if (action === "REJECT" && rejectionReason === "Other" && !rejectionCustom.trim()) {
      setMessage({ type: "error", text: "Enter the custom rejection reason." });
      return;
    }
    if (action === "REQUEST_DOCS" && !remark.trim()) {
      setMessage({
        type: "error",
        text: isTa ? "கூடுதல் ஆவணங்களைக் கோருவதற்கான குறிப்பை உள்ளிடவும்." : "Enter the additional documents required.",
      });
      return;
    }

    try {
      setActionInProgress(true);
      setMessage(null);

      const examinationResponse = await fetch("/api/verification/examination", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userType: selected.userType, userId: selected.id, action }),
      });
      const examination = await examinationResponse.json();
      if (!examinationResponse.ok || !examination.ok) {
        setMessage({ type: "error", text: examination.error || "Unable to examine the current documents." });
        return;
      }

      const res = await fetch("/api/verification/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userType: selected.userType,
          userId: selected.id,
          action,
          notes: decisionNotes,
          examinationToken: examination.examinationToken,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setMessage({
          type: "error",
          text: data.error || (isTa ? "மதிப்பாய்வு முடிவை சமர்ப்பிப்பதில் தோல்வி." : "Failed to submit verification action."),
        });
        return;
      }

      const notificationStatus = data.notification
        ? ` Notifications — in-app: ${data.notification.inAppSaved ? "saved" : "failed"}, email: ${data.notification.emailSent ? "sent" : "not sent"}, SMS: ${data.notification.smsSent ? "sent" : "not sent"}.${data.notification.errors?.length ? ` ${data.notification.errors.join("; ")}` : ""}`
        : "";
      setMessage({
        type: "success",
        text: isTa
          ? `வழக்கு #${selected.id} (${selected.applicantName}) ${data.newStatus} ஆக புதுப்பிக்கப்பட்டது.${notificationStatus}`
          : `Verification decision recorded: Case #${selected.id} (${selected.applicantName}) updated to ${data.newStatus}.${notificationStatus}`,
      });
      setRemark("");
      setApprovalCustom("");
      setRejectionReason("");
      setRejectionCustom("");

      await fetchRequests();
    } catch {
      setMessage({
        type: "error",
        text: isTa ? "சரிபார்ப்பு முடிவை சமர்ப்பிப்பதில் பிழை." : "Error submitting verification decision.",
      });
    } finally {
      setActionInProgress(false);
    }
  }

  function prefillDocumentRequest() {
    setRemark(
      isTa
        ? "சரிபார்ப்பைத் தொடர உங்கள் செல்லுபடியாகும் அரசு அடையாளச் சான்றின் (ஆதார் அட்டை, பான் அட்டை அல்லது வணிக உரிமம்) தெளிவான நகலை பதிவேற்றவும்."
        : "Please upload a clear, legible copy of your valid Government ID proof (Aadhaar Card, PAN Card, or Trade License) to proceed with verification."
    );
  }

  const formatStatus = (st: string) => {
    const s = st.toLowerCase();
    if (s === "approved") return isTa ? "ஒப்புதல் அளிக்கப்பட்டது" : "Approved";
    if (s === "rejected") return isTa ? "நிராகரிக்கப்பட்டது" : "Rejected";
    if (s.includes("upload") || s.includes("docs")) return isTa ? "மறுபதிவேற்றம் தேவை" : "Re-Upload Required";
    return isTa ? "மதிப்பாய்வில் உள்ளது" : "Pending Review";
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#ea580c]">
              {isTa ? "முதன்மை நிர்வாக மையம் · இணக்கம் மற்றும் சரிபார்ப்பு" : "Super Admin Desk · Compliance & Verification"}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
              {isTa ? "நேரலை தரவுத்தள இணைப்பு" : "Live Database Connected"}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
            {isTa ? "கணக்கு சரிபார்ப்பு வரிசை" : "Account Verification Queue"}
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            {isTa
              ? "விருந்தினர்கள், சில்லறை விற்பனையாளர்கள், விநியோகஸ்தர்கள் மற்றும் குடிமக்களின் சமர்ப்பிக்கப்பட்ட ஆவணங்களின் நிகழ்நேர இணக்க மதிப்பாய்வு."
            : "Review account requests by user type, handle new submissions first, and track pending decisions and completed history."}
          </p>
        </div>

        <button
          onClick={fetchRequests}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          {isTa ? "தரவுத்தளத்தைப் புதுப்பி" : "Refresh Database"}
        </button>
      </div>

      {/* Alert Banner */}
      {message && (
        <div
          className={`rounded-xl border p-4 text-xs font-semibold flex items-center justify-between shadow-2xs ${
            message.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          <span>{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            className="text-slate-400 hover:text-slate-700 ml-4 font-bold text-base cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-3 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex items-center gap-1 text-xs font-bold text-slate-500 mr-1">
              <Filter className="w-3.5 h-3.5" /> {isTa ? "வடிகட்டுதல்:" : "Filter by:"}
            </div>
            {[
              { id: "user", label: isTa ? "பயனர்கள்" : "Users" },
              { id: "customer", label: isTa ? "வாடிக்கையாளர்கள்" : "Customers" },
              { id: "retailer", label: isTa ? "சில்லறை விற்பனையாளர்கள்" : "Retailers" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTypeFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  typeFilter === tab.id
                    ? "bg-[#1e3a8a] text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          {[
            { id: "new", label: isTa ? "புதிய கோரிக்கைகள்" : "New Requests" },
            { id: "pending", label: isTa ? "நிலுவையில்" : "Pending" },
            { id: "history", label: isTa ? "கோரிக்கை வரலாறு" : "Request History" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-colors ${statusFilter === tab.id ? "bg-orange-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Live Search Form */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 pt-1 border-t border-slate-100">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                isTa
                  ? "விண்ணப்பதாரர் பெயர், மொபைல் எண், மின்னஞ்சல் அல்லது ஆவண எண் மூலம் தேடுக..."
                  : "Search by applicant name, mobile phone, email, or document ID..."
              }
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a] bg-slate-50/50"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {isTa ? "தேடுக" : "Search"}
          </button>
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setTimeout(() => fetchRequests(), 50);
              }}
              className="px-3 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
            >
              {isTa ? "நீக்கு" : "Clear"}
            </button>
          )}
        </form>
      </div>

      {/* Master Detail Split */}
      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        {/* Left Side: Records List */}
        <aside className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col max-h-[780px]">
          <div className="border-b border-slate-100 p-4 bg-slate-50/50 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">
              {statusFilter === "new" ? (isTa ? "புதிய சரிபார்ப்பு கோரிக்கைகள்" : "New Verification Requests") : statusFilter === "pending" ? (isTa ? "நிலுவையிலுள்ள கோரிக்கைகள்" : "Pending Requests") : (isTa ? "கோரிக்கை வரலாறு" : "Verification History")}
            </span>
            <span className="rounded-full bg-blue-100 text-[#1e3a8a] px-2.5 py-0.5 text-xs font-extrabold">
              {isTa ? `${items.length} பதிவுகள்` : `${items.length} records`}
            </span>
          </div>

          <div className="divide-y divide-slate-100 overflow-y-auto flex-1">
            {loading && items.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                {isTa ? "சரிபார்ப்புப் பதிவுகள் ஏற்றப்படுகின்றன..." : "Loading live verification records..."}
              </div>
            ) : items.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                {isTa
                  ? "உங்கள் நிபந்தனைகளுக்குப் பொருந்தக்கூடிய சரிபார்ப்புக் கோரிக்கைகள் எதுவும் கிடைக்கவில்லை."
                  : "No verification requests found in database matching your criteria."}
              </div>
            ) : (
              items.map((item) => {
                const key = getVerificationItemKey(item);
                const isSelected = selectedKey === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setSelectedKey(key);
                      setMessage(null);
                    }}
                    className={`w-full p-4 text-left transition-all hover:bg-slate-50/80 cursor-pointer ${
                      isSelected ? "border-l-4 border-l-[#ea580c] bg-blue-50/40" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] font-bold text-slate-500 uppercase">
                        {item.userType} #{item.id}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                          item.status.toLowerCase() === "approved"
                            ? "bg-emerald-100 text-emerald-800"
                            : item.status.toLowerCase() === "rejected"
                            ? "bg-rose-100 text-rose-800"
                            : item.status.toLowerCase().includes("upload")
                            ? "bg-amber-100 text-amber-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {formatStatus(item.status)}
                      </span>
                    </div>

                    <strong className="mt-1 block text-sm font-bold text-slate-900 truncate">
                      {item.applicantName}
                    </strong>

                    <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
                      <span>{item.idType}</span>
                      <span className="font-mono">{item.phone}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Side: Selected Record Inspection */}
        {selected ? (
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="border-b border-slate-100 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold">
                    {selected.userType.toUpperCase()}
                  </span>
                  <h2 className="text-lg font-black text-slate-950">{selected.applicantName}</h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  ID: <span className="font-mono font-semibold">{selected.idType}</span> ({selected.idNumber})
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-black ${
                    selected.status.toLowerCase() === "approved"
                      ? "bg-emerald-100 text-emerald-800"
                      : selected.status.toLowerCase() === "rejected"
                      ? "bg-rose-100 text-rose-800"
                      : selected.status.toLowerCase().includes("upload")
                      ? "bg-amber-100 text-amber-800"
                      : "bg-blue-100 text-blue-800"
                  }`}
                >
              {isTa ? "நிலை:" : "Status:"} {formatStatus(selected.status)}
                </span>
              </div>
            </div>

            <div className="p-6 space-y-6 flex-1">
              {/* Applicant Metadata Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold uppercase text-slate-700 tracking-wider">
                      {isTa ? "சுயவிவர தகவல்கள்" : "Profile Details"}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowFullPhone(!showFullPhone)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      {showFullPhone ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      {showFullPhone ? (isTa ? "எண்ணை மறை" : "Mask") : (isTa ? "எண்ணைக் காட்டு" : "Reveal")}
                    </button>
                  </div>

                  <dl className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <dt className="text-slate-400 font-medium">{isTa ? "விண்ணப்பதாரர் பெயர்" : "Applicant Name"}</dt>
                      <dd className="font-bold text-slate-900 mt-0.5">{selected.applicantName}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400 font-medium">{isTa ? "மொபைல் எண்" : "Mobile Phone"}</dt>
                      <dd className="font-bold font-mono text-slate-900 mt-0.5">
                        {showFullPhone ? selected.phone : `${selected.phone.slice(0, 4)}••••••`}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-400 font-medium">{isTa ? "மின்னஞ்சல்" : "Email"}</dt>
                      <dd className="font-bold text-slate-900 mt-0.5 truncate">
                        {selected.email || (isTa ? "வழங்கப்படவில்லை" : "Not Provided")}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-400 font-medium">{isTa ? "அடையாள ஆவணம்" : "Document Type"}</dt>
                      <dd className="font-bold text-slate-900 mt-0.5">{selected.idType}</dd>
                    </div>
                  </dl>
                </div>

                {/* Uploaded Document Asset Card */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase text-slate-700 tracking-wider mb-2">
                      {isTa ? "அடையாள ஆவணக் கோப்பு" : "Identity Document File"}
                    </h3>

                    {selected.hasDocument && selected.documentUrl ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
                          <div className="w-10 h-10 rounded-lg bg-[#1e3a8a]/10 text-[#1e3a8a] flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <strong className="block text-xs font-bold text-slate-900 truncate">
                              {selected.idType}
                            </strong>
                            <span className="font-mono text-[10px] text-slate-500 block truncate">
                              {isTa ? "கோப்பு:" : "File:"} {selected.documentUrl}
                            </span>
                          </div>
                        </div>

                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] text-emerald-900 flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                          <span>
                            {isTa ? "அசல் ஆவணம் அமைப்பில் பாதுகாப்பாக உள்ளது." : "Real document file stored in system uploads."}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-5 bg-amber-50 border border-amber-200 rounded-xl text-center space-y-2">
                        <AlertCircle className="w-8 h-8 text-amber-600 mx-auto" />
                        <strong className="block text-xs font-bold text-amber-950">
                          {isTa ? "ஆவணக் கோப்பு பதிவேற்றப்படவில்லை" : "No Document File Uploaded"}
                        </strong>
                        <p className="text-[11px] text-amber-800">
                          {isTa
                            ? "விண்ணப்பதாரர் அடையாள ஆவணத்தை பதிவேற்றவில்லை. ஒப்புதல் அளிப்பதற்கு முன் பதிவேற்றக் கோரலாம்."
                            : "The applicant has not uploaded an identity proof scan. You can request them to upload it before approving."}
                        </p>
                        <button
                          type="button"
                          onClick={prefillDocumentRequest}
                          className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-200 hover:bg-amber-300 text-amber-900 cursor-pointer transition-colors"
                        >
                          <FileQuestion className="w-3.5 h-3.5" />
                          {isTa ? "ஆவணக் கோரிக்கையைத் தயார் செய்" : "Prepare Document Request"}
                        </button>
                      </div>
                    )}
                  </div>

                  {selected.hasDocument && selected.documentUrl && (
                    <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 font-mono truncate max-w-[200px]">
                        {selected.documentUrl}
                      </span>
                      <a
                        href={`/${selected.documentUrl.replace(/^\/+/, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#1e3a8a] text-white hover:bg-[#1e40af] transition-colors shadow-2xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        {isTa ? "ஆவணத்தை ஆய்வு செய்க" : "Inspect Document"}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {selected.userType === "customer" && selected.profileData && (
                <section className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                  {Array.isArray(selected.profileData.verificationFindings) && selected.profileData.verificationFindings.length > 0 && (
                    <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950">
                      <strong>Manual review required.</strong> Exact identifier or document matches need staff confirmation. Matched record references are restricted to reviewers.
                      <ul className="mt-2 list-disc pl-5">
                        {selected.profileData.verificationFindings.map((finding: Record<string, unknown>, index: number) => (
                          <li key={`${String(finding.code)}-${index}`}>{String(finding.category || "Verification item")}: {String(finding.code || "Match detected")}{finding.matchedDocumentType ? `; same file was uploaded as ${String(finding.matchedDocumentType)}` : ""} (record reference {String(finding.reference || "restricted")})</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <h3 className="text-xs font-bold uppercase text-slate-700 tracking-wider">All submitted profile details and documents</h3>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {[["Name (Tamil)", selected.profileData.fullNameTamil], ["Date of birth", selected.profileData.dob], ["Gender", selected.profileData.gender], ["Father / guardian", selected.profileData.fatherName], ["Mother", selected.profileData.motherName], ["Marital status", selected.profileData.maritalStatus], ["Category", selected.profileData.category], ["Differently abled", selected.profileData.differentlyAbled], ["Occupation", selected.profileData.occupation], ["Annual income", selected.profileData.annualIncome], ["Email", selected.profileData.email], ["Alternate phone", selected.profileData.alternatePhone], ["Address", selected.profileData.address], ["Village / town", selected.profileData.villageTown], ["PIN code", selected.profileData.pincode], ["Residence type", selected.profileData.residenceType], ["District", selected.profileData.districtName || selected.profileData.districtId], ["Taluk", selected.profileData.talukName || selected.profileData.talukId], ["Panchayat", selected.profileData.panchayatName || selected.profileData.panchayatId], ["PAN number", selected.profileData.panNumber], ["Aadhaar number", selected.profileData.aadhaarNumber], ["Voter ID number", selected.profileData.voterIdNumber], ["Bank account name", selected.profileData.bankAccountName], ["Bank account number", selected.profileData.bankAccountNumber], ["IFSC", selected.profileData.bankIfsc], ["Bank", selected.profileData.bankName], ["Branch", selected.profileData.bankBranch]].map(([label, value]) => value ? <div key={label}><dt className="text-slate-500">{label}</dt><dd className="font-semibold text-slate-900">{value}</dd></div> : null)}
                  </dl>
                  <div className="flex flex-wrap gap-3 text-xs font-semibold">
                    {[["PAN document", selected.profileData.panFile], ["Aadhaar document", selected.profileData.aadhaarFile], ["Voter ID document", selected.profileData.voterIdFile], ["Profession proof", selected.profileData.occupationFile]].map(([label, url]) => url ? <a key={label} href={url} target="_blank" rel="noopener noreferrer" className="text-blue-800 underline">Open {label}</a> : null)}
                  </div>
                </section>
              )}
              {selected.userType === "retailer" && selected.profileData && (
                <section className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
                  <h3 className="font-bold text-slate-900">Retail shop details</h3>
                  <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                    {[["Operator", selected.profileData.operatorName], ["Phone", selected.profileData.phone], ["Email", selected.profileData.email], ["Address", selected.profileData.address], ["District", selected.profileData.districtName], ["Taluk", selected.profileData.talukName], ["Panchayat", selected.profileData.panchayatName], ["Shop name", selected.profileData.shopName], ["Business type", selected.profileData.businessType], ["GSTIN", selected.profileData.gstNo], ["Shop link", selected.profileData.shopUrl]].map(([label, value]) => value ? <div key={label}><dt className="text-slate-500">{label}</dt><dd className="break-all font-semibold text-slate-900">{label === "Shop link" ? <a className="text-blue-800 underline" href={String(value)} target="_blank" rel="noreferrer">{String(value)}</a> : String(value)}</dd></div> : null)}
                  </dl>
                  <div className="mt-4 flex flex-wrap gap-3 text-sm">
                    {[["PAN proof", selected.profileData.panDocument], ["Aadhaar proof", selected.profileData.aadhaarDocument], ["Business proof", selected.profileData.businessDocument]].map(([label, url]) => url ? <a key={label} href={String(url)} target="_blank" rel="noreferrer" className="text-blue-800 underline">Open {label}</a> : null)}
                    {(selected.profileData.shopPhotos || (selected.profileData.shopPhoto ? [selected.profileData.shopPhoto] : [])).map((url: string, index: number) => <a key={url} href={url} target="_blank" rel="noreferrer" className="text-blue-800 underline">Open shop photo {index + 1}</a>)}
                  </div>
                </section>
              )}

              {/* Action Controls */}
              <div className="pt-4 border-t border-slate-200 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="approvalCommand" className="block text-xs font-bold uppercase text-slate-700 tracking-wider">Approval command</label>
                    <select id="approvalCommand" value={approvalCommand} onChange={(e) => setApprovalCommand(e.target.value)} className="mt-2 w-full p-2.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-900">
                      <option>Identity documents verified</option>
                      <option>Applicant details verified</option>
                      <option>Profile and eligibility verified</option>
                      <option>Documents checked and approved</option>
                      <option>Other</option>
                    </select>
                    <input value={approvalCustom} onChange={(e) => setApprovalCustom(e.target.value)} placeholder="Optional custom approval note" className="mt-2 w-full p-2.5 rounded-lg border border-slate-300 text-xs text-slate-900 placeholder-slate-400" />
                  </div>
                  <div>
                    <label htmlFor="rejectionReason" className="block text-xs font-bold uppercase text-slate-700 tracking-wider">Rejection reason</label>
                    <select id="rejectionReason" value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} className="mt-2 w-full p-2.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-900">
                      <option value="">Select a reason to reject</option>
                      <option>Identity document invalid or expired</option>
                      <option>Name or date of birth does not match</option>
                      <option>Duplicate identity or document</option>
                      <option>Eligibility requirements not met</option>
                      <option>Required information is incomplete</option>
                      <option>Document is unreadable or unclear</option>
                      <option>Other</option>
                    </select>
                    <input value={rejectionCustom} onChange={(e) => setRejectionCustom(e.target.value)} placeholder="Optional custom rejection details" className="mt-2 w-full p-2.5 rounded-lg border border-slate-300 text-xs text-slate-900 placeholder-slate-400" />
                  </div>
                </div>
                <div>
                  <label htmlFor="adminRemark" className="block text-xs font-bold uppercase text-slate-700 tracking-wider">
                    {isTa
                      ? "முதன்மை நிர்வாகி மதிப்பாய்வுக் குறிப்பு / முடிவின் விளக்கம்"
                      : "Super Admin Review Note / Decision Explanation"}
                  </label>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {isTa
                      ? "நிராகரிக்கும் போது அல்லது கூடுதல் ஆவணங்களைக் கோரும் போது அவசியம். நிரந்தர கேஒய்சி தணிக்கைப் பதிவில் பதிவு செய்யப்படும்."
                      : "For rejection, select a reason above. For additional documents, enter the request below. Decision notes are recorded in the audit log."}
                  </p>
                  <textarea
                    id="adminRemark"
                    rows={3}
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    placeholder={
                      isTa
                        ? "முடிவின் காரணத்தை உள்ளிடவும் அல்லது விண்ணப்பதாரரிடமிருந்து தேவைப்படும் குறிப்பிட்ட கூடுதல் ஆவணங்களைக் குறிப்பிடவும்..."
                        : "Enter decision rationale or specify exact additional documents required from the applicant..."
                    }
                    className="mt-2 w-full p-3 rounded-lg border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] bg-slate-50/50"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    disabled={actionInProgress}
                    onClick={() => handleReviewAction("REQUEST_DOCS")}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 disabled:opacity-50 cursor-pointer shadow-2xs"
                  >
                    <FileQuestion className="w-4 h-4 text-amber-700" />
                    {isTa ? "கூடுதல் ஆவணங்களைக் கோருங்கள்" : "Request Additional Documents"}
                  </button>

                  <button
                    type="button"
                    disabled={actionInProgress}
                    onClick={() => handleReviewAction("REJECT")}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold border border-rose-300 bg-rose-50 text-rose-900 hover:bg-rose-100 disabled:opacity-50 cursor-pointer shadow-2xs"
                  >
                    <XCircle className="w-4 h-4 text-rose-700" />
                    {isTa ? "சரிபார்ப்பை நிராகரி" : "Reject Verification"}
                  </button>

                  <button
                    type="button"
                    disabled={actionInProgress}
                    onClick={() => handleReviewAction("APPROVE")}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-xs font-bold bg-[#1e3a8a] text-white hover:bg-[#1e40af] disabled:opacity-50 shadow-sm cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {isTa ? "ஒப்புதல் அளி" : "Approve Verification"}
                  </button>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 text-xs">
            {isTa ? "விவரங்களை ஆய்வு செய்ய பட்டியலிலிருந்து ஒரு சரிபார்ப்புக் கோரிக்கையைத் தேர்ந்தெடுக்கவும்." : "Select a verification request from the list to inspect details."}
          </div>
        )}
      </div>
    </div>
  );
}
