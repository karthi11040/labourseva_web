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
  Download,
  Store,
  UserCheck,
  UserPlus,
  MapPin,
  FileSpreadsheet,
  Check,
  Sparkles,
  CreditCard,
  Building2,
  HelpCircle,
  Copy,
} from "lucide-react";
import type { UnifiedRequestItem } from "@/app/api/admin/guest-requests/route";

interface StatsSummary {
  total: number;
  customerCount: number;
  retailerCount: number;
  guestCount: number;
  statutoryCount: number;
  eserviceCount: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  returnedCount: number;
}

export interface GuestRequestsPageProps {
  defaultRole?: "ALL" | "CUSTOMER" | "RETAILER" | "GUEST";
  customTitle?: string;
  customEyebrow?: string;
  customDescription?: string;
}

export default function GuestRequestsPage(props: GuestRequestsPageProps) {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-xs font-semibold text-slate-500 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-[#1e3a8a]" />
          <span>Loading Unified Service Requests Queue…</span>
        </div>
      }
    >
      <UnifiedRequestsWorkbench {...props} />
    </Suspense>
  );
}

function UnifiedRequestsWorkbench({
  defaultRole,
  customTitle,
  customEyebrow,
  customDescription,
}: GuestRequestsPageProps) {
  const searchParams = useSearchParams();
  const queryRole = (searchParams.get("role") || searchParams.get("requestor") || "").toUpperCase();
  const initialRole = queryRole || defaultRole || "ALL";
  const initialCategory = (searchParams.get("category") || "ALL").toUpperCase();

  const [records, setRecords] = useState<UnifiedRequestItem[]>([]);
  const [stats, setStats] = useState<StatsSummary>({
    total: 0,
    customerCount: 0,
    retailerCount: 0,
    guestCount: 0,
    statutoryCount: 0,
    eserviceCount: 0,
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    returnedCount: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [requestorTab, setRequestorTab] = useState<string>(initialRole);
  const [categoryFilter, setCategoryFilter] = useState<string>(initialCategory);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  // Modals & Feedback
  const [selectedRecord, setSelectedRecord] = useState<UnifiedRequestItem | null>(null);
  const [actionModal, setActionModal] = useState<{
    record: UnifiedRequestItem;
    actionType: "APPROVED" | "REJECTED" | "RETURNED";
  } | null>(null);
  const [adminRemark, setAdminRemark] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    showToast(`Copied "${text}" to clipboard.`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (requestorTab !== "ALL") params.set("requestor_type", requestorTab);
      if (categoryFilter !== "ALL") params.set("service_category", categoryFilter);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/admin/guest-requests?${params.toString()}`);
      const data = await res.json();
      if (data.ok) {
        setRecords(data.records || []);
        if (data.stats) setStats(data.stats);
      } else {
        showToast(data.error || "Failed to load service requests.");
      }
    } catch {
      showToast("Network error connecting to administration database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [requestorTab, categoryFilter, statusFilter]);

  const handleApplyAction = async () => {
    if (!actionModal) return;
    if (
      (actionModal.actionType === "RETURNED" || actionModal.actionType === "REJECTED") &&
      !adminRemark.trim()
    ) {
      showToast("An administrative reason is required for return or rejection.");
      return;
    }
    setActionBusy(true);
    try {
      const res = await fetch("/api/admin/guest-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: actionModal.record.id,
          sourceTable: actionModal.record.sourceTable,
          sourceId: actionModal.record.sourceId,
          status: actionModal.actionType,
          remark: adminRemark.trim(),
        }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast(data.message || `Application status updated to ${actionModal.actionType}.`);
        setActionModal(null);
        setAdminRemark("");
        if (selectedRecord && selectedRecord.id === actionModal.record.id) {
          setSelectedRecord(null);
        }
        fetchRecords();
      } else {
        showToast(data.error || "Failed to update record status.");
      }
    } catch {
      showToast("Network error updating application.");
    } finally {
      setActionBusy(false);
    }
  };

  const filteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;
    return records.filter((r) => {
      return (
        r.referenceNo.toLowerCase().includes(q) ||
        r.applicantName.toLowerCase().includes(q) ||
        r.applicantPhone.includes(q) ||
        r.serviceName.toLowerCase().includes(q) ||
        r.district.toLowerCase().includes(q) ||
        r.taluk.toLowerCase().includes(q) ||
        r.panchayat.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q)
      );
    });
  }, [records, search]);

  const exportRecords = () => {
    const escape = (val: unknown) => `"${String(val ?? "").replace(/"/g, '""')}"`;
    const headers = [
      "Record ID",
      "Reference No",
      "Requestor Type",
      "Requestor Label",
      "Category",
      "Service Name",
      "Applicant Name",
      "Phone",
      "District",
      "Taluk",
      "Panchayat",
      "Amount",
      "Payment Status",
      "Payment Method",
      "Application Status",
      "Submitted At",
      "Officer Remarks",
    ];

    const rows = filteredRecords.map((r) => [
      escape(r.id),
      escape(r.referenceNo),
      escape(r.requestorType),
      escape(r.requestorLabel),
      escape(r.serviceCategory),
      escape(r.serviceName),
      escape(r.applicantName),
      escape(r.applicantPhone),
      escape(r.district),
      escape(r.taluk),
      escape(r.panchayat),
      escape(r.amount),
      escape(r.paymentStatus),
      escape(r.paymentMethod),
      escape(r.status),
      escape(new Date(r.createdAt).toLocaleString("en-IN")),
      escape(r.officerRemarks),
    ]);

    const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `service_requests_${requestorTab.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("CSV export generated successfully.");
  };

  const roleTabItems = [
    { id: "ALL", label: "All Requests", count: stats.total, icon: Layers },
    { id: "CUSTOMER", label: "Citizen / Customer", count: stats.customerCount, icon: UserCheck },
    { id: "RETAILER", label: "Retailer (Kendra)", count: stats.retailerCount, icon: Store },
    { id: "GUEST", label: "Guest Applications", count: stats.guestCount, icon: UserPlus },
  ];

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-5 py-3 shadow-2xl text-xs font-semibold text-slate-800 animate-in fade-in slide-in-from-top-4">
          <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs border-t-4 border-t-[#1e3a8a]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-[#1e3a8a] border border-blue-100">
              <ClipboardCheck className="w-3.5 h-3.5" />
              <span>{customEyebrow || "Unified Operations Verification Hub"}</span>
            </div>
            <h1 className="mt-2 text-2xl font-black text-slate-900 tracking-tight sm:text-3xl">
              {customTitle || "Service & E-Service Requests Management"}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-600 max-w-3xl leading-relaxed">
              {customDescription ||
                "Consolidated administrative ledger reviewing applications submitted across all channels: Registered Citizens (Customer), CSC Kendra Nodes (Retailer), and Walk-in Public Filings (Guest)."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/admin/es-records"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors shadow-xs"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-600" />
              <span>E-Service Records</span>
            </Link>

            <button
              type="button"
              onClick={exportRecords}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={fetchRecords}
              className="inline-flex items-center gap-2 rounded-lg bg-[#1e3a8a] px-4 py-2 text-xs font-bold text-white hover:bg-[#1e40af] transition-colors shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh Queue</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs border-l-4 border-l-[#1e3a8a]">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Requests</p>
          <p className="text-2xl font-black text-slate-950 mt-1">{stats.total}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">All submission channels</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs border-l-4 border-l-blue-500 bg-blue-50/20">
          <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Citizen / User</p>
          <p className="text-2xl font-black text-blue-900 mt-1">{stats.customerCount}</p>
          <p className="text-[10px] text-blue-600 mt-0.5">Direct portal users</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs border-l-4 border-l-emerald-500 bg-emerald-50/20">
          <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Retailer Kendra</p>
          <p className="text-2xl font-black text-emerald-900 mt-1">{stats.retailerCount}</p>
          <p className="text-[10px] text-emerald-600 mt-0.5">Assisted desk filings</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs border-l-4 border-l-amber-500 bg-amber-50/20">
          <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Walk-in Guests</p>
          <p className="text-2xl font-black text-amber-900 mt-1">{stats.guestCount}</p>
          <p className="text-[10px] text-amber-600 mt-0.5">Public guest requests</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs border-l-4 border-l-purple-500 bg-purple-50/20">
          <p className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">Citizen E-Services</p>
          <p className="text-2xl font-black text-purple-900 mt-1">{stats.eserviceCount}</p>
          <p className="text-[10px] text-purple-600 mt-0.5">Dynamic form claims</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs border-l-4 border-l-amber-600 bg-amber-50/40">
          <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Pending Action</p>
          <p className="text-2xl font-black text-amber-900 mt-1">{stats.pendingCount}</p>
          <p className="text-[10px] text-amber-700 mt-0.5">Awaiting scrutiny/seal</p>
        </div>
      </div>

      {/* Role Navigation Tabs: based on User/Customer, Retailer, Guest */}
      <div className="border-b border-slate-200 bg-white rounded-t-xl px-4 pt-3">
        <div className="flex items-center justify-between pb-1 flex-wrap gap-2">
          <nav className="flex space-x-2 sm:space-x-6 overflow-x-auto" aria-label="Requestor roles">
            {roleTabItems.map((tab) => {
              const Icon = tab.icon;
              const isActive = requestorTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setRequestorTab(tab.id)}
                  className={`pb-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
                    isActive
                      ? "border-[#1e3a8a] text-[#1e3a8a]"
                      : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      isActive ? "bg-blue-100 text-[#1e3a8a]" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Filter Toolbar Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-600 tracking-wider">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#1e3a8a]" />
            <span>Search &amp; Filter Parameters</span>
          </div>
          <span className="text-[11px] font-medium text-slate-400">
            Showing {filteredRecords.length} of {records.length} applications
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Search by Reference, Citizen, Mobile, or Scheme
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="e.g. TN-DOC-2026, Muthukumar, 98401..., Voter ID..."
                className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-xs font-semibold focus:border-[#1e3a8a] focus:outline-hidden"
              />
            </div>
          </div>

          {/* Service Category (Statutory vs E-Service) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Service Classification</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 focus:border-[#1e3a8a] focus:outline-hidden"
            >
              <option value="ALL">All Services ({stats.total})</option>
              <option value="STATUTORY">Statutory Board Services ({stats.statutoryCount})</option>
              <option value="E_SERVICE">Citizen E-Services ({stats.eserviceCount})</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Application Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 focus:border-[#1e3a8a] focus:outline-hidden"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending Scrutiny ({stats.pendingCount})</option>
              <option value="APPROVED">Approved / Sanctioned ({stats.approvedCount})</option>
              <option value="RETURNED">Returned for Reupload ({stats.returnedCount})</option>
              <option value="REJECTED">Rejected / Ineligible ({stats.rejectedCount})</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between border-t border-slate-100 pt-3 gap-2">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Quick Filters:</span>
            <button
              type="button"
              onClick={() => setStatusFilter("PENDING")}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                statusFilter === "PENDING"
                  ? "bg-amber-100 text-amber-800 border-amber-300"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
            >
              Pending ({stats.pendingCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("APPROVED")}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                statusFilter === "APPROVED"
                  ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
            >
              Approved ({stats.approvedCount})
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setRequestorTab(defaultRole || "ALL");
              setCategoryFilter("ALL");
              setStatusFilter("ALL");
              setSearch("");
            }}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Requests Ledger Table Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-[#1e3a8a]" />
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Service Requests Ledger ({filteredRecords.length})
            </h2>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            Live database records from <code className="text-indigo-600">service_requests</code>,{" "}
            <code className="text-indigo-600">es_service_requests</code>,{" "}
            <code className="text-indigo-600">guest_service_orders</code>, &amp;{" "}
            <code className="text-indigo-600">retail_orders</code>
          </span>
        </div>

        <div className="overflow-x-auto w-full scrollbar-thin">
          <table className="w-full min-w-[1150px] text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5 whitespace-nowrap">Reference &amp; ID</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Service Scheme</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Applicant &amp; Jurisdiction</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Channel</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Fee &amp; Payment</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Status</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Date</th>
                <th className="px-4 py-3.5 text-right whitespace-nowrap min-w-[240px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin text-[#1e3a8a] mx-auto mb-2" />
                    <p className="font-bold text-slate-600">Querying live requests from MySQL…</p>
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-700">No Service Requests Matched</p>
                    <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
                      There are currently no active applications matching your search parameters. Citizen submissions,
                      Kendra retail orders, and guest filings will automatically populate here.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => {
                  const isPending = r.status === "PENDING" || r.status === "RETURNED";
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Ref & ID */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-indigo-700">{r.referenceNo}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(r.referenceNo, r.id)}
                            title="Copy reference number"
                            className="text-slate-400 hover:text-slate-600 p-0.5"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                          ID: {r.id} · <span className="uppercase">{r.sourceTable.replace("_", " ")}</span>
                        </div>
                      </td>

                      {/* Service Scheme */}
                      <td className="px-4 py-3.5 font-semibold text-slate-900 max-w-[220px]">
                        <div className="truncate font-bold" title={r.serviceName}>
                          {r.serviceName}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1">
                          <span
                            className={`shrink-0 whitespace-nowrap inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                              r.serviceCategory === "E_SERVICE"
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : "bg-blue-50 text-blue-700 border-blue-200"
                            }`}
                          >
                            {r.serviceCategory === "E_SERVICE" ? "E-Service" : "Statutory"}
                          </span>
                        </div>
                      </td>

                      {/* Applicant & Jurisdiction */}
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900">{r.applicantName}</div>
                        {r.applicantPhone && (
                          <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Phone className="w-2.5 h-2.5 text-slate-400" />
                            <span>{r.applicantPhone}</span>
                          </div>
                        )}
                        {(r.district || r.taluk) && (
                          <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-2.5 h-2.5 text-slate-400" />
                            <span>{[r.taluk, r.district].filter(Boolean).join(", ")}</span>
                          </div>
                        )}
                      </td>

                      {/* Channel */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`shrink-0 whitespace-nowrap inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase border ${
                            r.requestorType === "CUSTOMER"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : r.requestorType === "RETAILER"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {r.requestorType === "CUSTOMER" && <User className="w-2.5 h-2.5 shrink-0" />}
                          {r.requestorType === "RETAILER" && <Store className="w-2.5 h-2.5 shrink-0" />}
                          {r.requestorType === "GUEST" && <UserPlus className="w-2.5 h-2.5 shrink-0" />}
                          <span>{r.requestorType}</span>
                        </span>
                        <div className="text-[9px] text-slate-400 truncate max-w-[130px] mt-0.5" title={r.requestorLabel}>
                          {r.requestorLabel}
                        </div>
                      </td>

                      {/* Fee & Payment */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="font-mono font-bold text-emerald-700">₹{r.amount.toFixed(2)}</div>
                        <div className="text-[10px] font-semibold text-slate-500 mt-0.5 flex items-center gap-1">
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              r.paymentStatus === "PAID" ? "bg-emerald-500" : "bg-amber-500"
                            }`}
                          />
                          <span>{r.paymentStatus}</span>
                          <span className="text-[9px] text-slate-400">({r.paymentMethod})</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`shrink-0 whitespace-nowrap inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                            r.status === "APPROVED"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : r.status === "REJECTED"
                              ? "bg-red-50 text-red-700 border-red-200"
                              : r.status === "RETURNED"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              r.status === "APPROVED"
                                ? "bg-emerald-500"
                                : r.status === "REJECTED"
                                ? "bg-red-500"
                                : r.status === "RETURNED"
                                ? "bg-blue-500"
                                : "bg-amber-500"
                            }`}
                          />
                          <span>{r.statusDisplay || r.status}</span>
                        </span>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3.5 text-slate-500 text-[11px] whitespace-nowrap">
                        <div>
                          {new Date(r.createdAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(r.createdAt).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap min-w-[240px]">
                        <div className="flex items-center justify-end gap-1.5 flex-nowrap">
                          <button
                            type="button"
                            onClick={() => setSelectedRecord(r)}
                            className="rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100 transition-colors shrink-0"
                          >
                            👁 Inspect
                          </button>

                          {isPending ? (
                            <>
                              <button
                                type="button"
                                onClick={() => setActionModal({ record: r, actionType: "APPROVED" })}
                                className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 transition-colors shrink-0"
                                title="Approve & Sanction"
                              >
                                ✓ Sanction
                              </button>
                              <button
                                type="button"
                                onClick={() => setActionModal({ record: r, actionType: "RETURNED" })}
                                className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-100 transition-colors shrink-0"
                                title="Return for Resubmission"
                              >
                                ↺ Return
                              </button>
                              <button
                                type="button"
                                onClick={() => setActionModal({ record: r, actionType: "REJECTED" })}
                                className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-bold text-red-700 hover:bg-red-100 transition-colors shrink-0"
                                title="Reject Application"
                              >
                                ✕
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

      {/* Record Inspection Dossier Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-6 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Administrative Dossier Scrutiny
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-0.5">
                  Ref No: {selectedRecord.referenceNo}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  Record ID: {selectedRecord.id} · Table: {selectedRecord.sourceTable}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                <span className="block text-[10px] font-bold uppercase text-slate-500">Service Scheme</span>
                <span className="block text-xs font-bold text-slate-900 mt-0.5 truncate" title={selectedRecord.serviceName}>
                  {selectedRecord.serviceName}
                </span>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                <span className="block text-[10px] font-bold uppercase text-slate-500">Applicant</span>
                <span className="block text-xs font-bold text-slate-900 mt-0.5">
                  {selectedRecord.applicantName}
                </span>
                <span className="block text-[10px] text-slate-500">{selectedRecord.applicantPhone || "No Mobile"}</span>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                <span className="block text-[10px] font-bold uppercase text-slate-500">Submission Channel</span>
                <span className="block text-xs font-black text-[#1e3a8a] mt-0.5 uppercase">
                  {selectedRecord.requestorType}
                </span>
                <span className="block text-[10px] text-slate-500 truncate">{selectedRecord.requestorLabel}</span>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                <span className="block text-[10px] font-bold uppercase text-slate-500">Statutory Fee</span>
                <span className="block text-xs font-black text-emerald-700 mt-0.5">
                  ₹{selectedRecord.amount.toFixed(2)} ({selectedRecord.paymentStatus})
                </span>
                <span className="block text-[10px] text-slate-500">{selectedRecord.paymentMethod}</span>
              </div>
            </div>

            {/* Jurisdiction Details */}
            {(selectedRecord.district || selectedRecord.taluk || selectedRecord.panchayat || selectedRecord.address) && (
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  <MapPin className="w-3.5 h-3.5 text-[#1e3a8a]" />
                  <span>Administrative Jurisdiction &amp; Address</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">District:</span>
                    <p className="font-semibold text-slate-900">{selectedRecord.district || "Tamil Nadu"}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Taluk:</span>
                    <p className="font-semibold text-slate-900">{selectedRecord.taluk || "—"}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Panchayat / Local Body:</span>
                    <p className="font-semibold text-slate-900">{selectedRecord.panchayat || "—"}</p>
                  </div>
                </div>
                {selectedRecord.address && (
                  <div className="pt-1 border-t border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Full Residential Address:</span>
                    <p className="font-medium text-slate-800 mt-0.5">{selectedRecord.address}</p>
                  </div>
                )}
              </div>
            )}

            {/* Officer Remarks / Audit Note */}
            {selectedRecord.officerRemarks && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900">
                <strong className="block text-[11px] font-bold uppercase text-amber-800 mb-0.5">
                  Recorded Officer Audit Remark:
                </strong>
                {selectedRecord.officerRemarks}
              </div>
            )}

            {/* Citizen Submitted Form Payload */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-1">
                Submitted Application Data Payload
              </h4>
              {Object.keys(selectedRecord.submittedData || {}).length === 0 ? (
                <p className="text-xs text-slate-400 italic">No custom form payload attached.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {Object.entries(selectedRecord.submittedData).map(([key, val]) => (
                    <div key={key} className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 flex flex-col">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">{key}</span>
                      <span className="font-semibold text-slate-900 break-words mt-0.5">
                        {typeof val === "object" ? JSON.stringify(val) : String(val)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Uploaded Documents List */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-1">
                Attached Verification Proofs ({selectedRecord.submittedFiles.length})
              </h4>
              {selectedRecord.submittedFiles.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No document attachments uploaded.</p>
              ) : (
                <div className="space-y-2">
                  {selectedRecord.submittedFiles.map((doc, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span className="font-semibold text-slate-800">{doc.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.url && (
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded bg-[#1e3a8a] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-blue-900 transition"
                          >
                            <ExternalLink className="w-3 h-3" /> View Document
                          </a>
                        )}
                        <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                          <ShieldCheck className="w-3 h-3 text-blue-600" /> Attached
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="flex flex-wrap items-center justify-between border-t border-slate-100 pt-4 gap-2">
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200"
              >
                Close Dossier
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const rec = selectedRecord;
                    setActionModal({ record: rec, actionType: "RETURNED" });
                  }}
                  className="rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100"
                >
                  ↺ Request Re-Upload
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const rec = selectedRecord;
                    setActionModal({ record: rec, actionType: "REJECTED" });
                  }}
                  className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-bold text-red-700 hover:bg-red-100"
                >
                  ✕ Reject Application
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const rec = selectedRecord;
                    setActionModal({ record: rec, actionType: "APPROVED" });
                  }}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-xs"
                >
                  ✓ Sanction &amp; Sign
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Decision Action Modal (Approve, Return, Reject) */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              {actionModal.actionType === "APPROVED" && "✅ Sanction & Sign Application"}
              {actionModal.actionType === "RETURNED" && "↺ Return Application for Resubmission"}
              {actionModal.actionType === "REJECTED" && "❌ Issue Statutory Rejection Order"}
            </h3>

            <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5 text-xs text-slate-700 space-y-0.5">
              <p>
                Target Ref: <strong className="text-slate-900">{actionModal.record.referenceNo}</strong>
              </p>
              <p className="text-[11px] text-slate-500">
                Scheme: {actionModal.record.serviceName} · Channel: {actionModal.record.requestorType}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {actionModal.actionType === "APPROVED" && "Official Sanction Remark (Optional)"}
                {actionModal.actionType === "RETURNED" && "Specific Instructions for Applicant (Mandatory)"}
                {actionModal.actionType === "REJECTED" && "Statutory Rejection Reason (Mandatory)"}
              </label>
              <textarea
                rows={3}
                value={adminRemark}
                onChange={(e) => setAdminRemark(e.target.value)}
                placeholder={
                  actionModal.actionType === "REJECTED"
                    ? "State statutory grounds, e.g. Form 27 not enclosed, Aadhaar data mismatch..."
                    : actionModal.actionType === "RETURNED"
                    ? "Specify deficiency, e.g. Please re-upload clear color copy of front page..."
                    : "Enter digital signing directive or sanction order note..."
                }
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
                  actionModal.actionType === "APPROVED"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : actionModal.actionType === "RETURNED"
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {actionBusy ? "Saving…" : "Confirm Decision"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
