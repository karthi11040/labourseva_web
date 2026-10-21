"use client";

import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import {
  ClipboardList,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Download,
  FileText,
  Calendar,
  Plus,
  Filter,
  Layers,
  Clock,
  Eye,
  X,
  Upload,
  Check,
  Loader2,
  ShieldCheck,
  Receipt,
  ChevronRight,
  RotateCcw,
  FileCheck,
} from "lucide-react";

interface ApplicationRecord {
  id: string; // e.g. DOC-1 or ES-1
  dbId: number;
  appNumber: string;
  receiptNo: string;
  serviceType: "DOCUMENT_SERVICE" | "E_SERVICE";
  serviceId: number;
  serviceName: string;
  categoryName: string;
  status: string;
  amount: number;
  appliedDate: string;
  paymentDate?: string;
  templatePdfPath?: string | null;
  uploadedDocPath?: string | null;
  uploadDate?: string | null;
  signedPdfPath?: string | null;
  signedAt?: string | null;
  rejectionReason?: string | null;
  adminRemark?: string | null;
  submittedData?: Record<string, any>;
  submittedFiles?: Record<string, any>;
}

export default function MyApplicationsPage() {
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [query, setQuery] = useState("");

  // Modals
  const [selectedApp, setSelectedApp] = useState<ApplicationRecord | null>(null);
  const [uploadModalApp, setUploadModalApp] = useState<ApplicationRecord | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Template download tracking: user must download PDF at least once to unlock upload
  const [downloadedDocs, setDownloadedDocs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem("labourseva_downloaded_templates");
      if (saved) {
        setDownloadedDocs(JSON.parse(saved));
      }
    } catch {}
  }, []);

  const markDocDownloaded = (appId: string) => {
    setDownloadedDocs((prev) => {
      const updated = { ...prev, [appId]: true };
      try {
        localStorage.setItem("labourseva_downloaded_templates", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const loadApplications = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/user/applications");
      const data = await res.json();
      if (data.ok && Array.isArray(data.applications)) {
        setApplications(data.applications);
      }
    } catch (err) {
      console.error("Failed to load applications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

  const handleRealUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadModalApp || !uploadedFile) return;

    try {
      setUploading(true);
      setUploadError(null);

      const formData = new FormData();
      formData.append("file", uploadedFile);
      formData.append("applicationId", uploadModalApp.id);

      const res = await fetch("/api/user/applications/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to upload and stamp document");
      }

      setUploadSuccess(true);
      await loadApplications();

      setTimeout(() => {
        setUploadSuccess(false);
        setUploadModalApp(null);
        setUploadedFile(null);
        setUploadedFileName(null);
      }, 1000);
    } catch (err: any) {
      setUploadError(err.message || "Failed to process document upload.");
    } finally {
      setUploading(false);
    }
  };

  const filtered = useMemo(() => {
    return applications.filter((app) => {
      const matchType = filterType === "ALL" || app.serviceType === filterType;
      const s = app.status.toLowerCase();
      let matchStatus = true;
      if (filterStatus === "review") {
        matchStatus = s === "in_review" || s === "paid" || s === "confirmed" || s === "accepted" || s === "pending";
      } else if (filterStatus === "approved") {
        matchStatus = s === "approved" || s === "completed";
      } else if (filterStatus === "action") {
        matchStatus = s === "returned" || s === "rejected";
      }

      const q = query.toLowerCase().trim();
      const matchQuery =
        !q ||
        app.appNumber.toLowerCase().includes(q) ||
        app.serviceName.toLowerCase().includes(q) ||
        app.categoryName.toLowerCase().includes(q) ||
        app.receiptNo.toLowerCase().includes(q);

      return matchType && matchStatus && matchQuery;
    });
  }, [applications, filterStatus, filterType, query]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-[#ea580c] uppercase tracking-wider block">
            Government of Tamil Nadu · Citizen Services
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
            My Applications &amp; Status Tracking
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track real-time progress across Document-Based Services and Online E-Services.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/user/es-services"
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 shadow-2xs whitespace-nowrap"
          >
            Explore E-Services
          </Link>
          <Link
            href="/user/apply"
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-[#1e3a8a] hover:bg-[#1e40af] shadow-xs flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            <Plus size={15} />
            <span>Apply Welfare Scheme</span>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative w-full flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by Application Reference, Scheme Name, or Receipt Number..."
              className="w-full pl-10 pr-4 h-11 rounded-xl border border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-[#1e3a8a] bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            {/* Service Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 outline-none"
            >
              <option value="ALL">All Service Types</option>
              <option value="DOCUMENT_SERVICE">Document Services</option>
              <option value="E_SERVICE">Online E-Services</option>
            </select>

            {/* Status Quick Filters */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
              {[
                { id: "ALL", label: `All (${applications.length})` },
                { id: "review", label: "In Review" },
                { id: "approved", label: "Approved" },
                { id: "action", label: "Needs Action" },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilterStatus(f.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    filterStatus === f.id
                      ? "bg-[#1e3a8a] text-white shadow-2xs"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Applications List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-slate-500 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200">
            <Loader2 size={24} className="animate-spin text-[#1e3a8a] mx-auto mb-2" />
            <span className="text-sm">Retrieving application records...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200">
            <ClipboardList size={36} className="text-slate-400 mx-auto mb-2" />
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">No applications found</h3>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or apply for a new welfare service.</p>
          </div>
        ) : (
          filtered.map((app) => {
            const isDocService = app.serviceType === "DOCUMENT_SERVICE";
            const s = (app.status || "").toLowerCase();
            const isApproved = s === "completed" || s === "approved" || !!app.signedPdfPath;
            const isRejected = s === "rejected" || s === "failed";
            const isReturned = s === "returned";
            const isReuploadNeeded = isReturned || isRejected;
            const isDocUploaded = !!app.uploadedDocPath;
            const hasDownloaded = Boolean(downloadedDocs[app.id] || isDocUploaded || isApproved);

            return (
              <div
                key={app.id}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 sm:p-6 shadow-2xs hover:shadow-md transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          isDocService
                            ? "bg-blue-50 text-[#1e3a8a] border border-blue-200"
                            : "bg-purple-50 text-purple-700 border border-purple-200"
                        }`}
                      >
                        {isDocService ? "Document-Based Service" : "Form-Based E-Service"}
                      </span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="font-mono text-xs font-bold text-[#1e3a8a] dark:text-blue-400">
                        {app.appNumber}
                      </span>
                    </div>

                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                      {app.serviceName}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {app.categoryName} · Remitted: <strong className="text-slate-800 dark:text-slate-200">₹{app.amount.toFixed(2)}</strong> (Receipt #{app.receiptNo})
                    </p>
                  </div>

                  <div className="flex sm:flex-col items-end justify-between sm:justify-start gap-1">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        isApproved
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : isReturned
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : isRejected
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : "bg-blue-50 text-[#1e3a8a] border border-blue-200"
                      }`}
                    >
                      {isApproved ? "✓ Approved & Signed" : isReturned ? "↺ Re-Upload Requested" : isRejected ? "✕ Rejected" : "In Review"}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Applied: {new Date(app.appliedDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                  </div>
                </div>

                {/* Workflow Rules Display */}
                {isDocService ? (
                  /* 3 CORE WORKFLOW ACTIONS (Right-Aligned Buttons) */
                  <div className="bg-slate-50/80 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Left Side: Context & Bilingual Instructions (English & Tamil) */}
                    <div className="text-xs space-y-1.5 max-w-lg">
                      {!hasDownloaded ? (
                        <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                          <Download size={15} className="text-[#1e3a8a] dark:text-blue-400 shrink-0 mt-0.5" />
                          <div className="space-y-0.5">
                            <p className="font-semibold text-slate-800 dark:text-slate-200">
                              Please download the PDF template first to unlock document upload.
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              படிவத்தைப் பதிவேற்ற முதலில் PDF படிவத்தைப் பதிவிறக்கவும்.
                            </p>
                          </div>
                        </div>
                      ) : !isDocUploaded && !isReuploadNeeded ? (
                        <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                          <Upload size={15} className="text-[#ea580c] shrink-0 mt-0.5" />
                          <div className="space-y-0.5">
                            <p className="font-semibold text-slate-800 dark:text-slate-200">
                              Fill and sign the downloaded document, then click <strong className="text-[#ea580c] font-bold">Upload PDF</strong> on the right.
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              படிவத்தைப் பூர்த்தி செய்து கையொப்பமிட்ட பின், வலதுபுறமுள்ள &quot;Upload PDF&quot; கிளிக் செய்து பதிவேற்றவும்.
                            </p>
                          </div>
                        </div>
                      ) : isReuploadNeeded ? (
                        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200">
                          <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                          <div className="space-y-0.5">
                            <p className="font-semibold text-amber-800 dark:text-amber-300">
                              {app.rejectionReason ? `Remark: ${app.rejectionReason} — ` : ""}Please click <strong className="text-amber-700 dark:text-amber-300 font-bold">Re-upload PDF</strong> on the right to submit corrections.
                            </p>
                            <p className="text-[11px] text-amber-700/90 dark:text-amber-400">
                              ஆவணத்தில் திருத்தம் தேவை. சரியான ஆவணத்தைச் சமர்ப்பிக்க வலதுபுறமுள்ள &quot;Re-upload PDF&quot; கிளிக் செய்யவும்.
                            </p>
                          </div>
                        </div>
                      ) : !app.signedPdfPath ? (
                        <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                          <Clock size={15} className="text-blue-600 shrink-0 mt-0.5" />
                          <div className="space-y-0.5">
                            <p className="font-semibold text-slate-800 dark:text-slate-200">
                              Document submitted. Awaiting verification and district seal approval by Team.
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              ஆவணம் சமர்ப்பிக்கப்பட்டது. குழுவினரால் சரிபார்க்கப்பட்டு மாவட்ட டிஜிட்டல் முத்திரைக்கு காத்திருக்கிறது.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-2 text-emerald-800 dark:text-emerald-300">
                          <CheckCircle2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                          <div className="space-y-0.5">
                            <p className="font-semibold text-emerald-800 dark:text-emerald-300">
                              Application verified &amp; digitally signed. Click <strong className="text-emerald-700 dark:text-emerald-300 font-bold">Download Signed PDF</strong> on the right.
                            </p>
                            <p className="text-[11px] text-emerald-700/90 dark:text-emerald-400">
                              விண்ணப்பம் சரிபார்க்கப்பட்டு மாவட்ட அலுவலரால் கையொப்பமிடப்பட்டது. சான்றிதழைப் பெற &quot;Download Signed PDF&quot; கிளிக் செய்யவும்.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Side: 3 Action Buttons */}
                    <div className="flex flex-wrap items-center justify-end gap-2.5 shrink-0 md:ml-auto">
                      {/* BUTTON 1: Download PDF */}
                      {app.templatePdfPath ? (
                        <a
                          href={app.templatePdfPath}
                          download
                          target="_blank"
                          rel="noreferrer"
                          onClick={() => markDocDownloaded(app.id)}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#1e3a8a] hover:bg-[#1e40af] text-white shadow-xs transition"
                        >
                          <Download size={14} />
                          <span>Download PDF</span>
                        </a>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-75"
                          title="PDF template pre-verified"
                        >
                          <Download size={14} />
                          <span>Download PDF</span>
                        </button>
                      )}

                      {/* BUTTON 2: Upload PDF (Only visible once downloaded!) */}
                      {hasDownloaded && (
                        isReuploadNeeded ? (
                          <button
                            type="button"
                            onClick={() => {
                              setUploadModalApp(app);
                              setUploadedFile(null);
                              setUploadedFileName(null);
                              setUploadError(null);
                            }}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition"
                          >
                            <RotateCcw size={14} />
                            <span>Re-upload PDF</span>
                          </button>
                        ) : isDocUploaded ? (
                          <button
                            type="button"
                            disabled
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-80"
                            title="Document submitted. Awaiting administrative review."
                          >
                            <CheckCircle2 size={14} className="text-emerald-600" />
                            <span>Upload PDF</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setUploadModalApp(app);
                              setUploadedFile(null);
                              setUploadedFileName(null);
                              setUploadError(null);
                            }}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#ea580c] hover:bg-[#c2410c] text-white shadow-xs transition"
                          >
                            <Upload size={14} />
                            <span>Upload PDF</span>
                          </button>
                        )
                      )}

                      {/* BUTTON 3: Download Signed PDF */}
                      {app.signedPdfPath ? (
                        <a
                          href={app.signedPdfPath}
                          download
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition"
                        >
                          <FileCheck size={14} />
                          <span>Download Signed PDF</span>
                        </a>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-75"
                          title="Available once Admin or Staff employee reviews and verifies your document"
                        >
                          <Clock size={14} />
                          <span>Download Signed PDF</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  /* E-SERVICE WORKFLOW ACTIONS */
                  <div className="p-4 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="font-bold text-purple-900 dark:text-purple-300 block mb-0.5">
                        Dynamic Form Submission Logged
                      </span>
                      <p className="text-slate-600 dark:text-slate-400">
                        Form schema inputs and verified statutory payment are recorded under public reference <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{app.appNumber}</span>.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setSelectedApp(app)}
                        className="px-3 py-1.5 rounded-lg border border-purple-200 dark:border-purple-700 text-xs font-bold text-purple-800 dark:text-purple-300 bg-white dark:bg-slate-800 hover:bg-purple-50 shadow-2xs inline-flex items-center gap-1"
                      >
                        <Eye size={12} />
                        <span>View Form Answers</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Bottom Bar: Action Links */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700 text-xs">
                  <span className="text-slate-400 font-mono text-[11px]">
                    Internal ID: {app.id}
                  </span>

                  <div className="flex items-center gap-3">
                    <a
                      href={`/api/user/payments/receipt?id=${app.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold text-[#1e3a8a] dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                    >
                      <Receipt size={13} />
                      <span>Download Receipt (PDF)</span>
                    </a>

                    <Link
                      href="/user/payments"
                      className="font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 inline-flex items-center gap-1"
                    >
                      <span>Payment History</span>
                      <ChevronRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* VIEW SUBMITTED FORM ANSWERS MODAL (E-Services) */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div>
                <span className="text-[10px] font-bold text-purple-700 uppercase">E-Service Response Record</span>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">{selectedApp.serviceName}</h3>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs space-y-2 max-h-80 overflow-y-auto">
              <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-1.5 font-bold">
                <span className="text-slate-500">Field Parameter</span>
                <span className="text-slate-800 dark:text-slate-200">Citizen Response</span>
              </div>
              {selectedApp.submittedData && Object.keys(selectedApp.submittedData).length > 0 ? (
                Object.entries(selectedApp.submittedData)
                  .filter(([k]) => !k.startsWith("_"))
                  .map(([key, val]) => (
                    <div key={key} className="flex justify-between border-b border-slate-200/60 pb-1.5">
                      <span className="text-slate-500 capitalize">{key}:</span>
                      <strong className="text-slate-800 dark:text-slate-200">
                        {typeof val === "object" ? JSON.stringify(val) : String(val)}
                      </strong>
                    </div>
                  ))
              ) : (
                <p className="text-slate-400 italic">No custom fields submitted.</p>
              )}

              {selectedApp.submittedFiles && Object.keys(selectedApp.submittedFiles).length > 0 && (
                <div className="pt-2">
                  <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Attached Supporting Files:</span>
                  {Object.entries(selectedApp.submittedFiles).map(([fKey, fVal]) => (
                    <div key={fKey} className="flex items-center justify-between text-[11px] text-emerald-700">
                      <span>{fKey}:</span>
                      <span className="font-mono">{String(fVal)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#1e3a8a] text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENT UPLOAD MODAL (Document-Based Services) */}
      {uploadModalApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div>
                <span className="text-[10px] font-bold text-blue-700 uppercase">Document Verification</span>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Upload Completed Document</h3>
              </div>
              <button
                onClick={() => setUploadModalApp(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRealUpload} className="space-y-4 text-xs">
              <p className="text-slate-500">
                Please upload the signed &amp; completed PDF template for <strong className="text-slate-800">{uploadModalApp.serviceName}</strong> ({uploadModalApp.appNumber}).
              </p>

              {uploadError && (
                <div className="p-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold">
                  {uploadError}
                </div>
              )}

              <div className="p-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 text-center space-y-2">
                <FileText size={28} className="mx-auto text-slate-400" />
                <div className="text-xs">
                  {uploadedFileName ? (
                    <span className="font-bold text-emerald-700 block">Selected: {uploadedFileName}</span>
                  ) : (
                    <span className="text-slate-500 block">Choose filled PDF file (Max 10 MB)</span>
                  )}
                </div>
                <label className="cursor-pointer inline-block px-3 py-1.5 rounded-lg bg-[#1e3a8a] text-white font-bold text-xs hover:bg-[#1e40af]">
                  <span>Browse File</span>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setUploadedFile(f);
                        setUploadedFileName(f.name);
                        setUploadError(null);
                      }
                    }}
                  />
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => setUploadModalApp(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!uploadedFile || uploading || uploadSuccess}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#1e3a8a] text-white hover:bg-[#1e40af] disabled:opacity-50 flex items-center gap-1.5"
                >
                  {uploading ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Uploading Document...</span>
                    </>
                  ) : uploadSuccess ? (
                    <>
                      <Check size={13} />
                      <span>Submitted for Verification!</span>
                    </>
                  ) : (
                    <span>Submit Completed Document</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
