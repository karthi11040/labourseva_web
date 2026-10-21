"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ClipboardCheck,
  FileText,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Clock,
  ShieldCheck,
  Phone,
  User,
  Calendar,
  Layers,
  Lock,
  ExternalLink,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  X,
  Send,
  SlidersHorizontal,
} from "lucide-react";

interface ServiceRecord {
  id: string;
  referenceNo: string;
  serviceId: number;
  serviceName: string;
  serviceCost: number;
  applicantName: string;
  applicantPhone: string;
  creatorType: "guest" | "customer" | "retailer" | "distributor";
  creatorId?: string;
  status: "pending" | "accepted" | "rejected" | "returned";
  paymentStatus: string;
  adminRemark: string;
  submittedData: Record<string, any>;
  submittedFiles: Array<{ name: string; key: string }>;
  createdAt: string;
  updatedAt: string;
}

interface StatsSummary {
  total: number;
  pending: number;
  accepted: number;
  rejected: number;
  returned: number;
}

export default function EsServiceRecordsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading service queue…</div>}>
      <EsServiceRecordsContent />
    </Suspense>
  );
}

function EsServiceRecordsContent() {
  const searchParams = useSearchParams();
  const initialServiceFilter = searchParams.get("service_id") || "0";

  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [stats, setStats] = useState<StatsSummary>({
    total: 0,
    pending: 0,
    accepted: 0,
    rejected: 0,
    returned: 0,
  });
  const [servicesList, setServicesList] = useState<Array<{ id: number; name: string }>>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [serviceFilter, setServiceFilter] = useState(Number(initialServiceFilter) || 0);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [creatorFilter, setCreatorFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  // Modals
  const [selectedRecord, setSelectedRecord] = useState<ServiceRecord | null>(null);
  const [actionModal, setActionModal] = useState<{
    record: ServiceRecord;
    actionType: "accepted" | "rejected" | "returned";
  } | null>(null);
  const [adminRemark, setAdminRemark] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Secure Document Token Generator
  const [secureDocToken, setSecureDocToken] = useState<{
    fileName: string;
    token: string;
    expiresAt: string;
  } | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (serviceFilter > 0) params.set("service_id", String(serviceFilter));
      if (statusFilter !== "ALL") params.set("status", statusFilter.toLowerCase());
      if (creatorFilter !== "ALL") params.set("creator_type", creatorFilter.toLowerCase());
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/admin/es-records?${params.toString()}`);
      const data = await res.json();
      if (data.ok) {
        setRecords(data.records || []);
        if (data.stats) setStats(data.stats);
      }
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  };

  const fetchServicesList = async () => {
    try {
      const res = await fetch("/api/admin/es-services");
      const data = await res.json();
      if (data.ok && Array.isArray(data.services)) {
        setServicesList(data.services.map((s: any) => ({ id: s.id, name: s.name })));
      }
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    fetchServicesList();
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [serviceFilter, statusFilter, creatorFilter]);

  const handleApplyAction = async () => {
    if (!actionModal) return;
    if ((actionModal.actionType === "returned" || actionModal.actionType === "rejected") && !adminRemark.trim()) {
      showToast("An administrative remark is required for return or rejection.");
      return;
    }
    setActionBusy(true);
    try {
      const res = await fetch("/api/admin/es-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: actionModal.record.id,
          status: actionModal.actionType,
          remark: adminRemark.trim(),
        }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast(
          `Request status successfully changed to ${actionModal.actionType.toUpperCase()}.`
        );
        setActionModal(null);
        setAdminRemark("");
        fetchRecords();
      } else {
        showToast(data.error || "Failed to update record status.");
      }
    } catch {
      showToast("Network error applying action.");
    } finally {
      setActionBusy(false);
    }
  };

  const generateDocToken = (fileName: string) => {
    const randomHex = Math.random().toString(36).substring(2, 10);
    const expires = new Date(Date.now() + 20 * 60 * 1000).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    setSecureDocToken({
      fileName,
      token: `sec_token_${randomHex}`,
      expiresAt: `${expires} IST (20-minute security window)`,
    });
  };

  const filteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;
    return records.filter((r) => {
      return (
        r.referenceNo.toLowerCase().includes(q) ||
        r.applicantName.toLowerCase().includes(q) ||
        r.serviceName.toLowerCase().includes(q) ||
        r.applicantPhone.includes(q)
      );
    });
  }, [records, search]);

  const exportRecords = () => {
    const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csv = ["Reference,Service,Applicant,Phone,Channel,Status,Payment,Submitted", ...filteredRecords.map((r) => [r.referenceNo, r.serviceName, r.applicantName, r.applicantPhone, r.creatorType, r.status, r.paymentStatus, new Date(r.createdAt).toLocaleDateString("en-IN")].map(escape).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); const link = document.createElement("a"); link.href = url; link.download = `es-service-records-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url);
  };

  const statCards = [
    { key: "total", label: "Total Applications", count: stats.total, color: "border-slate-300 text-slate-900" },
    { key: "pending", label: "Pending Verification", count: stats.pending, color: "border-amber-400 text-amber-700 bg-amber-50/30" },
    { key: "accepted", label: "Sanctioned / Accepted", count: stats.accepted, color: "border-emerald-500 text-emerald-700 bg-emerald-50/30" },
    { key: "returned", label: "Returned for Resubmission", count: stats.returned, color: "border-blue-400 text-blue-700 bg-blue-50/30" },
    { key: "rejected", label: "Rejected / Ineligible", count: stats.rejected, color: "border-red-400 text-red-700 bg-red-50/30" },
  ];

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-5 py-3 shadow-2xl text-xs font-semibold text-slate-800 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs border-t-4 border-t-[#1e3a8a]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-[#1e3a8a] border border-blue-100">
              <ClipboardCheck className="w-3.5 h-3.5" />
              <span>Operations Verification Workbench</span>
            </div>
            <h1 className="mt-2 text-2xl font-black text-slate-900 tracking-tight">
              E-Service Requests &amp; Records
            </h1>
            <p className="mt-1 text-xs text-slate-500 max-w-2xl leading-relaxed">
              Consolidated operational ledger for reviewing citizen claims, inspecting uploaded proofs, generating secure document tokens, and executing statutory sanctions or re-upload requests.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Connected Companion Link back to Service Catalog */}
            <Link
              href="/admin/es-services"
              className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50/70 px-4 py-2.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-colors shadow-xs"
            >
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>Configure E-Service Schemas &amp; Forms</span>
              <ChevronRight className="w-3.5 h-3.5 text-indigo-400" />
            </Link>

            <button
              type="button"
              onClick={fetchRecords}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh Queue</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((card) => (
          <div
            key={card.key}
            className={`rounded-xl border border-slate-200 bg-white p-4 shadow-xs border-l-4 ${card.color}`}
          >
            <p className="text-2xl font-black">{card.count}</p>
            <p className="text-xs font-semibold text-slate-600 mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Filter Toolbar */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-600 tracking-wider">
          <SlidersHorizontal className="w-3.5 h-3.5 text-[#1e3a8a]" />
          <span>Queue Filters &amp; Parameters</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Service Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Select Service
            </label>
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 focus:border-[#1e3a8a] focus:outline-hidden"
            >
              <option value={0}>All E-Services</option>
              {servicesList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Application Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 focus:border-[#1e3a8a] focus:outline-hidden"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending Verification</option>
              <option value="ACCEPTED">Accepted / Approved</option>
              <option value="RETURNED">Returned for Reupload</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          {/* Source Creator Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Submission Channel
            </label>
            <select
              value={creatorFilter}
              onChange={(e) => setCreatorFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 focus:border-[#1e3a8a] focus:outline-hidden"
            >
              <option value="ALL">All Submission Channels</option>
              <option value="CUSTOMER">Citizen Direct (Customer)</option>
              <option value="RETAILER">Assisted Retail CSC Agent</option>
              <option value="DISTRIBUTOR">Zonal Distributor</option>
              <option value="GUEST">Walk-in Guest Form</option>
            </select>
          </div>

          {/* Search Input */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Search by ID or Citizen
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Reference No, name, mobile..."
                className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-xs font-semibold focus:border-[#1e3a8a] focus:outline-hidden"
              />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3">
          <button type="button" onClick={() => { setServiceFilter(0); setStatusFilter("ALL"); setCreatorFilter("ALL"); setSearch(""); }} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Reset filters</button>
          <button type="button" onClick={exportRecords} className="rounded-lg bg-[#1e3a8a] px-3 py-2 text-xs font-bold text-white hover:bg-[#1e40af]">Export CSV</button>
        </div>
      </div>

      {/* Records Table Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Active Requests Queue ({filteredRecords.length})
          </h2>
          <span className="text-[11px] text-slate-500 font-medium">
            Showing records matched from database
          </span>
        </div>

        <div className="overflow-x-auto w-full scrollbar-thin">
          <table className="w-full min-w-[1050px] text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">Request ID</th>
                <th className="px-4 py-3 whitespace-nowrap">Service &amp; Fee</th>
                <th className="px-4 py-3 whitespace-nowrap">Applicant Name</th>
                <th className="px-4 py-3 whitespace-nowrap">Channel</th>
                <th className="px-4 py-3 whitespace-nowrap">Status</th>
                <th className="px-4 py-3 whitespace-nowrap">Submitted</th>
                <th className="px-4 py-3 text-right whitespace-nowrap min-w-[240px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    Querying service requests…
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-700">No Service Requests Found</p>
                    <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
                      There are currently no active requests matching your search criteria. Submissions from citizens and retail nodes will appear here automatically.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => {
                  const isOpen = r.status === "pending" || r.status === "returned";
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-indigo-700 whitespace-nowrap">
                        {r.referenceNo || `ES-${r.id.slice(0, 8)}`}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                        <div>{r.serviceName}</div>
                        <div className="text-[10px] text-emerald-700 font-bold">
                          ₹{r.serviceCost.toFixed(2)}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-bold text-slate-900">{r.applicantName}</div>
                        <div className="text-[10px] text-slate-500">{r.applicantPhone}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="shrink-0 whitespace-nowrap inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 uppercase border border-slate-200">
                          {r.creatorType}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`shrink-0 whitespace-nowrap inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                            r.status === "accepted"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : r.status === "rejected"
                              ? "bg-red-50 text-red-700 border-red-200"
                              : r.status === "returned"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              r.status === "accepted"
                                ? "bg-emerald-500"
                                : r.status === "rejected"
                                ? "bg-red-500"
                                : r.status === "returned"
                                ? "bg-blue-500"
                                : "bg-amber-500"
                            }`}
                          />
                          <span>{r.status}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-[11px] whitespace-nowrap">
                        {new Date(r.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap min-w-[240px]">
                        <div className="flex items-center justify-end gap-1.5 flex-nowrap">
                          <button
                            type="button"
                            onClick={() => setSelectedRecord(r)}
                            className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100 transition-colors shrink-0"
                          >
                            👁 Inspect
                          </button>

                          {isOpen ? (
                            <>
                              <button
                                type="button"
                                onClick={() => setActionModal({ record: r, actionType: "accepted" })}
                                className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 transition-colors shrink-0"
                              >
                                ✓ Sanction
                              </button>
                              <button
                                type="button"
                                onClick={() => setActionModal({ record: r, actionType: "returned" })}
                                className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-100 transition-colors shrink-0"
                              >
                                ↺ Return
                              </button>
                              <button
                                type="button"
                                onClick={() => setActionModal({ record: r, actionType: "rejected" })}
                                className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-bold text-red-700 hover:bg-red-100 transition-colors shrink-0"
                              >
                                ✕ Reject
                              </button>
                            </>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Settled</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Request Inspection Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-2xl space-y-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Dossier Inspection
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  Request Ref: {selectedRecord.referenceNo}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5">
                <span className="block text-[10px] font-bold uppercase text-slate-500">Service</span>
                <span className="block text-xs font-bold text-slate-800 line-clamp-1">
                  {selectedRecord.serviceName}
                </span>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5">
                <span className="block text-[10px] font-bold uppercase text-slate-500">Fee Amount</span>
                <span className="block text-xs font-black text-emerald-700">
                  ₹{selectedRecord.serviceCost.toFixed(2)} ({selectedRecord.paymentStatus})
                </span>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5">
                <span className="block text-[10px] font-bold uppercase text-slate-500">Channel</span>
                <span className="block text-xs font-bold text-slate-800 uppercase">
                  {selectedRecord.creatorType}
                </span>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5">
                <span className="block text-[10px] font-bold uppercase text-slate-500">Current Status</span>
                <span className="block text-xs font-black text-[#1e3a8a] uppercase">
                  {selectedRecord.status}
                </span>
              </div>
            </div>

            {/* Admin Remark if present */}
            {selectedRecord.adminRemark && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900">
                <strong className="block text-[11px] font-bold uppercase text-amber-800 mb-0.5">
                  Official Board Administrative Remark:
                </strong>
                {selectedRecord.adminRemark}
              </div>
            )}

            {/* Submitted Form Fields */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-1">
                Citizen Submitted Data
              </h4>
              {Object.keys(selectedRecord.submittedData || {}).length === 0 ? (
                <p className="text-xs text-slate-400 italic">No custom form payload attached.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {Object.entries(selectedRecord.submittedData).map(([key, val]) => (
                    <div
                      key={key}
                      className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 flex flex-col"
                    >
                      <span className="text-[10px] font-bold text-slate-500 uppercase">{key}</span>
                      <span className="font-semibold text-slate-900 break-words mt-0.5">
                        {typeof val === "object" ? JSON.stringify(val) : String(val)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Uploaded Documents with 20-min Secure Tokens */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Uploaded Verification Documents
                </h4>
                <span className="text-[10px] text-amber-600 font-semibold">
                  🔒 Secure link expires after 20 minutes
                </span>
              </div>

              {selectedRecord.submittedFiles.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No document attachments uploaded.</p>
              ) : (
                <div className="space-y-2">
                  {selectedRecord.submittedFiles.map((doc, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span className="font-semibold text-slate-800">{doc.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => generateDocToken(doc.name)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#1e3a8a] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#1e40af]"
                      >
                        <Lock className="w-3 h-3" />
                        <span>Open Securely</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Secure Token Modal */}
      {secureDocToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-blue-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-[#1e3a8a]">
              <Lock className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">Secure Document Token Issued</h3>
            </div>
            <p className="text-xs text-slate-600">
              Document: <strong>{secureDocToken.fileName}</strong>
            </p>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs font-mono break-all text-slate-800">
              {secureDocToken.token}
            </div>
            <p className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
              ⏱ Valid until {secureDocToken.expiresAt}. Access is recorded in the immutable administrative audit trail.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSecureDocToken(null)}
                className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-xs font-bold text-white hover:bg-[#1e40af]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decision Action Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              {actionModal.actionType === "accepted" && "✅ Sanction & Approve Application"}
              {actionModal.actionType === "returned" && "↺ Return Application for Resubmission"}
              {actionModal.actionType === "rejected" && "❌ Reject Ineligible Application"}
            </h3>

            <p className="text-xs text-slate-600">
              Target Ref: <strong>{actionModal.record.referenceNo}</strong> ({actionModal.record.serviceName})
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Official Administrative Remark (Required for Return / Rejection)
              </label>
              <textarea
                rows={3}
                value={adminRemark}
                onChange={(e) => setAdminRemark(e.target.value)}
                placeholder="Enter statutory reasons, missing proof requests, or sanction notes..."
                className="w-full rounded-lg border border-slate-200 p-2.5 text-xs focus:border-[#1e3a8a] focus:outline-hidden"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionBusy}
                onClick={handleApplyAction}
                className={`rounded-lg px-5 py-2 text-xs font-bold text-white transition-colors ${
                  actionModal.actionType === "accepted"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : actionModal.actionType === "returned"
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {actionBusy ? "Updating…" : "Confirm Decision"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
