"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import {
  CheckCircle2,
  Eye,
  FileText,
  ShieldAlert,
  XCircle,
  FileQuestion,
  RefreshCw,
  Search,
  Filter,
  User,
  Clock,
  ShieldCheck,
} from "lucide-react";

interface VerificationItem {
  id: number;
  userType: "customer" | "guest" | "retailer" | "user";
  applicantName: string;
  phone: string;
  email: string;
  idType: string;
  idNumber: string;
  documentUrl: string;
  status: string;
  statusNote: string;
  rejectionReason: string;
  submittedAt: string;
  profileData?: Record<string, any>;
}

export default function StaffVerificationQueuePage() {
  const { language } = useLanguage();
  const isTa = language === "ta";

  const [items, setItems] = useState<VerificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [remark, setRemark] = useState("");
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
        setItems(data.requests || []);
        if (data.requests?.length > 0 && selectedId === null) {
          setSelectedId(data.requests[0].id);
        }
      }
    } catch {
      setMessage({
        type: "error",
        text: isTa ? "சேவையகத்திலிருந்து சரிபார்ப்பு வரிசையை ஏற்றுவதில் தோல்வி." : "Failed to load verification queue from server.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [typeFilter, statusFilter]);

  const selected = items.find((item) => item.id === selectedId) || items[0] || null;

  async function handleReviewAction(action: "APPROVE" | "REJECT" | "REQUEST_DOCS") {
    if (!selected) return;

    if ((action === "REJECT" || action === "REQUEST_DOCS") && !remark.trim()) {
      setMessage({
        type: "error",
        text: isTa
          ? `${action === "REJECT" ? "நிராகரிப்புக்கான" : "கூடுதல் ஆவணங்களைக் கோருவதற்கான"} காரணத்தை விளக்கும் முடிவுக் குறிப்பை உள்ளிடவும்.`
          : `Please provide a decision note explaining the reason for ${
              action === "REJECT" ? "rejection" : "requesting additional documents"
            }.`,
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
          notes: remark.trim(),
          examinationToken: examination.examinationToken,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setMessage({
          type: "error",
          text: data.error || (isTa ? "மதிப்பாய்வைச் சமர்ப்பிப்பதில் தோல்வி." : "Failed to submit review."),
        });
        return;
      }

      setMessage({
        type: "success",
        text: isTa
          ? `வழக்கு #${selected.id} (${selected.applicantName}) ${data.newStatus} ஆக புதுப்பிக்கப்பட்டது. தணிக்கைப் பதிவில் பதிவு செய்யப்பட்டது.`
          : `Case #${selected.id} (${selected.applicantName}) updated to ${data.newStatus}. Status change recorded in audit log.`,
      });
      setRemark("");
      setRevealed(false);

      // Refresh list
      await fetchRequests();
    } catch {
      setMessage({
        type: "error",
        text: isTa ? "மதிப்பாய்வு முடிவை சமர்ப்பிக்கும் போது பிழை ஏற்பட்டது." : "An error occurred while submitting review decision.",
      });
    } finally {
      setActionInProgress(false);
    }
  }

  const formatStatus = (st: string) => {
    const s = st.toLowerCase();
    if (s === "approved") return isTa ? "ஒப்புதல் அளிக்கப்பட்டது" : "Approved";
    if (s === "rejected") return isTa ? "நிராகரிக்கப்பட்டது" : "Rejected";
    if (s.includes("upload") || s.includes("docs")) return isTa ? "மறுபதிவேற்றம் தேவை" : "Re-Upload Required";
    return isTa ? "மதிப்பாய்வில் உள்ளது" : "Pending Review";
  };

  const formatUserType = (ut: string) => {
    if (ut === "all") return isTa ? "அனைத்து சுயவிவரங்களும்" : "All Profiles";
    if (ut === "customer") return isTa ? "வாடிக்கையாளர்" : "Customer";
    if (ut === "retailer") return isTa ? "சில்லறை வணிகர்" : "Retailer";
    if (ut === "guest") return isTa ? "விருந்தினர்" : "Guest";
    if (ut === "user") return isTa ? "பயனர்" : "User";
    return ut;
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#ea580c]">
            {isTa ? "பணியாளர் மையம் · சரிபார்ப்பு தொகுதி" : "Employee Desk · Verification Module"}
          </span>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
            {isTa ? "கணக்கு சரிபார்ப்பு & ஆவண மதிப்பாய்வு" : "Account Verification & Document Review"}
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            {isTa
              ? "அடையாள ஆவணங்களை மதிப்பாய்வு செய்யவும், கணக்குகளுக்கு ஒப்புதல் அளிக்கவும், தவறான சமர்ப்பிப்புகளை நிராகரிக்கவும் அல்லது கூடுதல் ஆதாரங்களைக் கோரவும்."
              : "Review identity documents, approve accounts, reject invalid submissions, or request additional proofs."}
          </p>
        </div>
        <button
          onClick={fetchRequests}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          {isTa ? "வரிசையை புதுப்பி" : "Refresh Queue"}
        </button>
      </div>

      {message && (
        <div
          className={`rounded-xl border p-4 text-xs font-semibold flex items-center justify-between ${
            message.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-700 ml-4">
            ×
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mr-2">
            <Filter className="w-3.5 h-3.5" /> {isTa ? "பயனர் வகை:" : "Filter User Type:"}
          </div>
          {["all", "customer", "guest", "retailer", "user"].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                typeFilter === t
                  ? "bg-[#1e3a8a] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {formatUserType(t)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">{isTa ? "நிலை:" : "Status:"}</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-semibold border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
          >
            <option value="all">{isTa ? "அனைத்து நிலைகளும்" : "All Statuses"}</option>
            <option value="pending">{isTa ? "மதிப்பாய்வு நிலுவையில்" : "Pending Review"}</option>
            <option value="re-upload">{isTa ? "மறுபதிவேற்றம் தேவை" : "Re-Upload Required"}</option>
            <option value="approved">{isTa ? "ஒப்புதல் அளிக்கப்பட்டது" : "Approved"}</option>
            <option value="rejected">{isTa ? "நிராகரிக்கப்பட்டது" : "Rejected"}</option>
          </select>
        </div>
      </div>

      {/* Main Review Grid */}
      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        {/* Cases List */}
        <aside className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col max-h-[750px]">
          <div className="border-b border-slate-100 p-4 bg-slate-50/50 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">
              {isTa ? "சரிபார்ப்பு வரிசை" : "Verification Queue"}
            </span>
            <span className="rounded-full bg-blue-100 text-[#1e3a8a] px-2.5 py-0.5 text-xs font-extrabold">
              {isTa ? `${items.length} வழக்குகள்` : `${items.length} ${items.length === 1 ? "case" : "cases"}`}
            </span>
          </div>

          <div className="divide-y divide-slate-100 overflow-y-auto flex-1">
            {loading && items.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                {isTa ? "வழக்குகள் ஏற்றப்படுகின்றன..." : "Loading cases..."}
              </div>
            ) : items.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                {isTa ? "தற்போதைய வடிகட்டலுக்கு பொருந்தும் சரிபார்ப்பு கோரிக்கைகள் எதுவும் இல்லை." : "No verification requests found matching current filters."}
              </div>
            ) : (
              items.map((item) => {
                const isSelected = selected?.id === item.id && selected?.userType === item.userType;
                return (
                  <button
                    key={`${item.userType}-${item.id}`}
                    type="button"
                    onClick={() => {
                      setSelectedId(item.id);
                      setMessage(null);
                      setRevealed(false);
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

        {/* Selected Case Inspection */}
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
                      {isTa ? "விண்ணப்பதாரர் விவரங்கள்" : "Applicant Details"}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setRevealed(!revealed)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      {revealed ? (isTa ? "தனிப்பட்ட தரவை மறை" : "Mask Personal Data") : (isTa ? "அடையாளத்தை வெளிப்படுத்து" : "Reveal Identity")}
                    </button>
                  </div>

                  <dl className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <dt className="text-slate-400 font-medium">{isTa ? "விண்ணப்பதாரர் பெயர்" : "Applicant Name"}</dt>
                      <dd className="font-bold text-slate-900 mt-0.5">
                        {revealed ? selected.applicantName : `${selected.applicantName.slice(0, 3)}••••••`}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-400 font-medium">{isTa ? "மொபைல் எண்" : "Mobile Phone"}</dt>
                      <dd className="font-bold font-mono text-slate-900 mt-0.5">
                        {revealed ? selected.phone : `${selected.phone.slice(0, 4)}••••••`}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-400 font-medium">{isTa ? "மின்னஞ்சல் முகவரி" : "Email Address"}</dt>
                      <dd className="font-bold text-slate-900 mt-0.5 truncate">
                        {revealed ? selected.email || (isTa ? "வழங்கப்படவில்லை" : "Not Provided") : "••••••••••@gov.in"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-400 font-medium">{isTa ? "அடையாளச் சான்று வகை" : "Identity Proof Type"}</dt>
                      <dd className="font-bold text-slate-900 mt-0.5">{selected.idType}</dd>
                    </div>
                  </dl>

                  {revealed && (
                    <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-lg text-[10px] text-amber-900 flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      {isTa
                        ? "DPDP சட்டத்தின் கீழ் பணியாளர் ஆய்வுப் பதிவில் தரவு வெளிப்பாடு பதிவு செய்யப்பட்டுள்ளது."
                        : "Data reveal recorded under staff inspection log (DPDP Act)."}
                    </div>
                  )}
                </div>

                {/* Document Viewer Preview Card */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase text-slate-700 tracking-wider mb-2">
                      {isTa ? "சமர்ப்பிக்கப்பட்ட ஆவண ஆதாரம்" : "Submitted Document Proof"}
                    </h3>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="w-10 h-10 rounded-lg bg-[#1e3a8a]/10 text-[#1e3a8a] flex items-center justify-center">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <strong className="block text-xs font-bold text-slate-900">{selected.idType} Scan</strong>
                        <span className="font-mono text-[10px] text-slate-500">
                          {isTa ? "எண்:" : "Number:"} {selected.idNumber}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 font-mono truncate max-w-[200px]">
                      {selected.documentUrl}
                    </span>
                    <a
                      href={selected.documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#1e3a8a] text-white hover:bg-[#1e40af]"
                    >
                      {isTa ? "கோப்பை ஆய்வு செய்க" : "Inspect File"}
                    </a>
                  </div>
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
                  <h3 className="text-xs font-bold uppercase text-slate-700 tracking-wider">Submitted profile and profession proof</h3>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {[["Date of birth", selected.profileData.dob], ["Gender", selected.profileData.gender], ["Father / guardian", selected.profileData.fatherName], ["Mother", selected.profileData.motherName], ["Marital status", selected.profileData.maritalStatus], ["Category", selected.profileData.category], ["Differently abled", selected.profileData.differentlyAbled], ["Occupation", selected.profileData.occupation], ["Annual income", selected.profileData.annualIncome], ["Email", selected.profileData.email], ["Alternate phone", selected.profileData.alternatePhone], ["Address", selected.profileData.address], ["Village / town", selected.profileData.villageTown], ["Pincode", selected.profileData.pincode], ["Residence type", selected.profileData.residenceType], ["District ID", selected.profileData.districtId], ["Taluk ID", selected.profileData.talukId], ["PAN number", selected.profileData.panNumber], ["Aadhaar number", selected.profileData.aadhaarNumber], ["Voter ID number", selected.profileData.voterIdNumber], ["Bank account name", selected.profileData.bankAccountName], ["Bank account number", selected.profileData.bankAccountNumber], ["IFSC", selected.profileData.bankIfsc], ["Bank", selected.profileData.bankName], ["Branch", selected.profileData.bankBranch]].map(([label, value]) => value ? <div key={label}><dt className="text-slate-500">{label}</dt><dd className="font-semibold text-slate-900">{value}</dd></div> : null)}
                  </dl>
                  <div className="flex flex-wrap gap-3 text-xs font-semibold">
                    {[["PAN document", selected.profileData.panFile], ["Aadhaar document", selected.profileData.aadhaarFile], ["Voter ID document", selected.profileData.voterIdFile], ["Profession proof", selected.profileData.occupationFile]].map(([label, url]) => url ? <a key={label} href={url} target="_blank" rel="noopener noreferrer" className="text-blue-800 underline">Open {label}</a> : null)}
                  </div>
                </section>
              )}

              {selected.userType === "retailer" && selected.profileData && (
                <section className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                  <h3 className="text-xs font-bold uppercase text-slate-700 tracking-wider">Retailer account details and proofs</h3>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {[["Operator", selected.profileData.operatorName], ["Phone", selected.profileData.phone], ["Email", selected.profileData.email], ["Shop", selected.profileData.shopName], ["Business type", selected.profileData.businessType], ["Address", selected.profileData.address], ["District", selected.profileData.districtName], ["Taluk", selected.profileData.talukName], ["Panchayat", selected.profileData.panchayatName], ["GSTIN", selected.profileData.gstNo], ["Shop link", selected.profileData.shopUrl], ["PAN / Aadhaar number", selected.idNumber]].map(([label, value]) => value ? <div key={label}><dt className="text-slate-500">{label}</dt><dd className="break-all font-semibold text-slate-900">{label === "Shop link" ? <a href={String(value)} target="_blank" rel="noreferrer" className="text-blue-800 underline">{String(value)}</a> : String(value)}</dd></div> : null)}
                  </dl>
                  <div className="flex flex-wrap gap-3 text-xs font-semibold">
                    {[["PAN proof", selected.profileData.panDocument], ["Aadhaar proof", selected.profileData.aadhaarDocument], ["Business proof", selected.profileData.businessDocument]].map(([label, url]) => url ? <a key={label} href={String(url)} target="_blank" rel="noopener noreferrer" className="text-blue-800 underline">Open {label}</a> : null)}
                    {(selected.profileData.shopPhotos || (selected.profileData.shopPhoto ? [selected.profileData.shopPhoto] : [])).map((url: string, index: number) => <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="text-blue-800 underline">Open shop photo {index + 1}</a>)}
                  </div>
                </section>
              )}

              {/* Action Decision Section */}
              <div className="pt-4 border-t border-slate-200 space-y-4">
                <div>
                  <label htmlFor="remark" className="block text-xs font-bold uppercase text-slate-700 tracking-wider">
                    {isTa
                      ? "பணியாளர் மதிப்பாய்வு முடிவு குறிப்பு / கோரிக்கை காரணம்"
                      : "Staff Review Decision Note / Request Reason"}
                  </label>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {isTa
                      ? "நிராகரிக்கும் போது அல்லது கூடுதல் ஆவணங்களைக் கோரும் போது அவசியம். இது தணிக்கைப் பதிவில் பதிவு செய்யப்பட்டு விண்ணப்பதாரருக்கு அனுப்பப்படும்."
                      : "Required when rejecting or requesting additional documents. Will be recorded in the audit trail and sent to the applicant."}
                  </p>
                  <textarea
                    id="remark"
                    rows={3}
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    placeholder={
                      isTa
                        ? "முடிவின் காரணத்தை உள்ளிடவும் அல்லது தேவைப்படும் கூடுதல் ஆவணங்களை விவரிக்கவும்..."
                        : "Enter decision rationale or describe specific additional documents required..."
                    }
                    className="mt-2 w-full p-3 rounded-lg border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    disabled={actionInProgress}
                    onClick={() => handleReviewAction("REQUEST_DOCS")}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 disabled:opacity-50 cursor-pointer"
                  >
                    <FileQuestion className="w-4 h-4 text-amber-700" />
                    {isTa ? "கூடுதல் ஆவணங்களைக் கோருங்கள்" : "Request Additional Documents"}
                  </button>

                  <button
                    type="button"
                    disabled={actionInProgress}
                    onClick={() => handleReviewAction("REJECT")}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold border border-rose-300 bg-rose-50 text-rose-900 hover:bg-rose-100 disabled:opacity-50 cursor-pointer"
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
                    {isTa ? "கணக்கு சரிபார்ப்புக்கு ஒப்புதல் அளி" : "Approve Account Verification"}
                  </button>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 text-xs">
            {isTa ? "மதிப்பாய்வு செய்ய வரிசையிலிருந்து ஒரு சரிபார்ப்புக் கோரிக்கையைத் தேர்ந்தெடுக்கவும்." : "Select a verification request from the queue to review."}
          </div>
        )}
      </div>
    </div>
  );
}
