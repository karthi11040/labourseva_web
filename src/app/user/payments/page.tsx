"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Receipt,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  X,
  Loader2,
  RefreshCw,
  Search,
  ArrowRight,
  ShieldAlert,
  CreditCard,
  RotateCcw,
  ExternalLink,
} from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

interface PaymentItem {
  id: string;
  dbId: number;
  serviceType: "DOCUMENT_SERVICE" | "E_SERVICE";
  receiptNo: string;
  paymentReference: string;
  applicationReference: string;
  categoryName: string;
  serviceName: string;
  amount: number;
  currency: string;
  provider: string;
  method: string;
  maskedMethod: string;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  status: "SUCCESS" | "PENDING" | "FAILED";
  displayStatus: string;
  statusLabel: string;
  statusLabelTa?: string;
  statusMessage: string;
  statusMessageTa?: string;
  badgeVariant: "success" | "warning" | "danger" | "info" | "neutral";
  errorReason?: string | null;
  suggestedAction?: string | null;
  refundStatus?: string | null;
  refundAmount?: number;
  refundReference?: string | null;
  paymentDate: string;
  capturedAt?: string | null;
  canDownloadReceipt: boolean;
  canRetry: boolean;
  canReconcile: boolean;
  timeline: Array<{ event: string; time: string; desc: string }>;
}

export default function PaymentsPage() {
  const router = useRouter();
  const { isTamil, language } = useLanguage();

  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [reconcilingId, setReconcilingId] = useState<string | null>(null);
  const [reconcileMessage, setReconcileMessage] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"date_desc" | "date_asc" | "amount_desc" | "amount_asc">("date_desc");

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Selected Detail / Timeline Modal
  const [selectedTimelinePayment, setSelectedTimelinePayment] = useState<PaymentItem | null>(null);

  async function loadPayments() {
    try {
      setLoading(true);
      const res = await fetch("/api/user/payments");
      const data = await res.json();
      if (data.ok && Array.isArray(data.payments)) {
        setPayments(data.payments);
      }
    } catch (err) {
      console.error("Failed to load payment history:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPayments();
  }, []);

  // Reconcile status with Gateway
  async function handleReconcile(p: PaymentItem) {
    if (!p.razorpayOrderId && !p.razorpayPaymentId) return;
    setReconcilingId(p.id);
    setReconcileMessage(null);
    try {
      const res = await fetch("/api/payments/razorpay/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razorpayOrderId: p.razorpayOrderId,
          razorpayPaymentId: p.razorpayPaymentId,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setReconcileMessage(data.statusMessage || (isTamil ? "நிலை வெற்றிகரமாக சரிபார்க்கப்பட்டது" : "Status successfully reconciled."));
        await loadPayments();
      } else {
        setReconcileMessage(data.error || (isTamil ? "சரிபார்ப்பு தோல்வியடைந்தது" : "Reconciliation failed."));
      }
    } catch (err: any) {
      setReconcileMessage(err.message || "Failed to reconcile status.");
    } finally {
      setReconcilingId(null);
      setTimeout(() => setReconcileMessage(null), 5000);
    }
  }

  // Handle Safe Retry
  function handleRetry(p: PaymentItem) {
    if (p.serviceType === "E_SERVICE") {
      router.push("/user/es-services");
    } else {
      router.push("/user/apply");
    }
  }

  // Filter & Sort
  const filteredPayments = useMemo(() => {
    return payments
      .filter((p) => {
        const matchStatus =
          statusFilter === "ALL" ||
          p.displayStatus === statusFilter ||
          (statusFilter === "SUCCESS" && (p.displayStatus === "SUCCESSFUL" || p.status === "SUCCESS")) ||
          (statusFilter === "FAILED" && (p.displayStatus === "FAILED" || p.displayStatus === "CANCELLED" || p.displayStatus === "TIMED_OUT")) ||
          (statusFilter === "PENDING" && (p.displayStatus === "PENDING" || p.displayStatus === "INITIATED" || p.displayStatus === "PROCESSING" || p.displayStatus === "VERIFICATION_PENDING")) ||
          (statusFilter === "REFUNDED" && (p.displayStatus === "REFUNDED" || p.displayStatus === "PARTIALLY_REFUNDED"));

        const matchType = typeFilter === "ALL" || p.serviceType === typeFilter;
        const query = search.toLowerCase().trim();
        const matchSearch =
          !query ||
          (p.receiptNo && p.receiptNo.toLowerCase().includes(query)) ||
          (p.applicationReference && p.applicationReference.toLowerCase().includes(query)) ||
          (p.serviceName && p.serviceName.toLowerCase().includes(query)) ||
          (p.categoryName && p.categoryName.toLowerCase().includes(query)) ||
          (p.razorpayPaymentId && p.razorpayPaymentId.toLowerCase().includes(query)) ||
          (p.razorpayOrderId && p.razorpayOrderId.toLowerCase().includes(query)) ||
          (p.errorReason && p.errorReason.toLowerCase().includes(query));

        return matchStatus && matchType && matchSearch;
      })
      .sort((a, b) => {
        if (sortBy === "date_desc") {
          return new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime();
        }
        if (sortBy === "date_asc") {
          return new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime();
        }
        if (sortBy === "amount_desc") {
          return b.amount - a.amount;
        }
        if (sortBy === "amount_asc") {
          return a.amount - b.amount;
        }
        return 0;
      });
  }, [payments, search, statusFilter, typeFilter, sortBy]);

  // Paginated records
  const totalPages = Math.ceil(filteredPayments.length / pageSize) || 1;
  const paginatedPayments = filteredPayments.slice((page - 1) * pageSize, page * pageSize);

  const totalSuccessfulAmount = payments
    .filter((p) => p.displayStatus === "SUCCESSFUL" || p.status === "SUCCESS")
    .reduce((sum, p) => sum + p.amount, 0);

  const successfulCount = payments.filter((p) => p.displayStatus === "SUCCESSFUL" || p.status === "SUCCESS").length;
  const failedCount = payments.filter((p) => p.displayStatus === "FAILED" || p.displayStatus === "CANCELLED" || p.displayStatus === "TIMED_OUT").length;
  const pendingCount = payments.filter((p) => p.displayStatus === "PENDING" || p.displayStatus === "INITIATED" || p.displayStatus === "VERIFICATION_PENDING").length;

  function getBadgeClasses(variant: string) {
    switch (variant) {
      case "success":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800";
      case "warning":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800";
      case "danger":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800";
      case "info":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-800";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
    }
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-16 w-full min-w-0">
      {/* Toast Announcement for Reconciliation */}
      {reconcileMessage && (
        <div className="bg-[#1e3a8a] text-white px-4 py-3 rounded-xl shadow-lg flex items-center justify-between text-xs sm:text-sm animate-fade-in">
          <span>{reconcileMessage}</span>
          <button
            onClick={() => setReconcileMessage(null)}
            className="p-1 rounded-md hover:bg-white/20 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header */}
      <div>
        <span className="text-xs font-bold text-[#ea580c] uppercase tracking-wider block">
          {isTamil ? "தமிழ்நாடு அரசு · கருவூலம் மற்றும் கட்டண மையம்" : "Government of Tamil Nadu · Treasury & Payments"}
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
          {isTamil ? "சட்டப்பூர்வ கட்டண மேலாண்மை மற்றும் ரசீதுகள்" : "Statutory Payment Management & Receipts"}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          {isTamil
            ? "அனைத்து அரசு நலத்திட்டங்கள் மற்றும் மின்-சேவைகளின் கட்டண பதிவேடு, ரசீது பதிவிறக்கம் மற்றும் நிலவர அறிக்கை."
            : "Authoritative ledger of welfare remittances, instant reconciliation, downloadable official PDF receipts, and guided retry workflows."}
        </p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Fees Paid */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {isTamil ? "செலுத்தப்பட்ட மொத்த கட்டணம்" : "Total Statutory Fees Paid"}
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/40 text-[#1e3a8a] dark:text-blue-400 flex items-center justify-center">
              <CreditCard size={18} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            ₹{totalSuccessfulAmount.toFixed(2)}
          </div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1">
            <CheckCircle2 size={12} /> {successfulCount} {isTamil ? "வெற்றிகரமான பரிவர்த்தனைகள்" : "Verified Transactions"}
          </span>
        </div>

        {/* Card 2: Failed / Retried */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {isTamil ? "தோல்வி / ரத்து செய்யப்பட்டவை" : "Declined / Cancelled"}
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-900/40 text-rose-600 flex items-center justify-center">
              <ShieldAlert size={18} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {failedCount}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
            {isTamil ? "பாதுகாப்பான மறுமுயற்சி கிடைக்கிறது" : "Safe retry available without duplicate charges"}
          </span>
        </div>

        {/* Card 3: Pending Verification */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {isTamil ? "செயலாக்கத்தில் உள்ளவை" : "Awaiting Verification"}
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-900/40 text-amber-600 flex items-center justify-center">
              <Clock size={18} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {pendingCount}
          </div>
          <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold mt-1 block">
            {isTamil ? "நேரடி வங்கி சரிபார்ப்பு வசதி" : "Instant bank sync & status check"}
          </span>
        </div>

        {/* Card 4: Security Guarantee */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {isTamil ? "பாதுகாப்பு தரநிலை" : "Gateway Security"}
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-900/40 text-purple-600 flex items-center justify-center">
              <RotateCcw size={18} />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
            Razorpay 256-Bit
          </div>
          <span className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold mt-1 block">
            {isTamil ? "தானியங்கி பணத்திருப்ப பாதுகாப்பு" : "Idempotent payment reconciliation"}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-3.5 sm:p-5 shadow-xs space-y-3">
        {/* Search */}
        <div className="relative w-full">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={
              isTamil
                ? "ரசீது எண், விண்ணப்ப எண், சேவை பெயர், பரிவர்த்தனை எண் மூலம் தேடுக..."
                : "Search by Receipt No, App Ref, Service Name, Order ID, Payment ID..."
            }
            className="w-full pl-10 pr-4 h-10 sm:h-11 rounded-xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-[#1e3a8a] bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full">
          {/* Service Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="col-span-2 sm:col-span-1 h-9 sm:h-10 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold bg-slate-50 sm:bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 outline-none truncate"
          >
            <option value="ALL">{isTamil ? "அனைத்து சேவைகள்" : "All Service Types"}</option>
            <option value="DOCUMENT_SERVICE">{isTamil ? "ஆவண சேவைகள்" : "Document Services"}</option>
            <option value="E_SERVICE">{isTamil ? "மின்-சேவைகள்" : "Online E-Services"}</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 sm:h-10 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold bg-slate-50 sm:bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 outline-none truncate"
          >
            <option value="ALL">{isTamil ? "அனைத்து நிலைகளும்" : "All Statuses"}</option>
            <option value="SUCCESS">{isTamil ? "வெற்றி பெற்றது" : "Successful / Captured"}</option>
            <option value="PENDING">{isTamil ? "நிலுவையில் உள்ளது" : "Pending / Processing"}</option>
            <option value="FAILED">{isTamil ? "தோல்வி / ரத்து" : "Declined / Cancelled"}</option>
            <option value="REFUNDED">{isTamil ? "பணத்திருப்பம் செய்யப்பட்டது" : "Refunded"}</option>
          </select>

          {/* Sort Filter */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="h-9 sm:h-10 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold bg-slate-50 sm:bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 outline-none truncate"
          >
            <option value="date_desc">{isTamil ? "புதியவை முதலில்" : "Newest First"}</option>
            <option value="date_asc">{isTamil ? "பழையவை முதலில்" : "Oldest First"}</option>
            <option value="amount_desc">{isTamil ? "அதிக கட்டணம்" : "Highest Fee"}</option>
            <option value="amount_asc">{isTamil ? "குறைந்த கட்டணம்" : "Lowest Fee"}</option>
          </select>
        </div>
      </div>

      {/* ================= MOBILE & TABLET RESPONSIVE CARDS VIEW ================= */}
      <div className="block xl:hidden space-y-3 w-full min-w-0">
        {loading ? (
          <div className="p-8 text-center text-slate-500 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200">
            <Loader2 size={24} className="animate-spin text-[#1e3a8a] mx-auto mb-2" />
            <span className="text-sm">{isTamil ? "கட்டண விவரங்கள் ஏற்றப்படுகின்றன..." : "Loading payments..."}</span>
          </div>
        ) : paginatedPayments.length === 0 ? (
          <div className="p-8 text-center text-slate-500 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200">
            <Receipt size={32} className="text-slate-400 mx-auto mb-2" />
            <p className="font-bold text-sm text-slate-800 dark:text-white">
              {isTamil ? "கட்டண பதிவுகள் எதுவும் இல்லை" : "No payment records found"}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {isTamil ? "வடிகட்டிகளை மாற்றி மீண்டும் முயற்சிக்கவும்." : "Try altering your search or status filters."}
            </p>
          </div>
        ) : (
          paginatedPayments.map((p) => {
            const isReconciling = reconcilingId === p.id;
            return (
              <div
                key={p.id}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-xs space-y-3 w-full overflow-hidden"
              >
                {/* Header: Receipt No + Amount & Status Badge */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700/80 pb-2.5">
                  <div className="min-w-0">
                    <span className="font-mono font-bold text-xs text-[#1e3a8a] dark:text-blue-400 block truncate">
                      {p.receiptNo}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono block truncate mt-0.5">
                      Ref: {p.applicationReference}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-base font-black text-slate-900 dark:text-white leading-tight">
                      ₹{p.amount.toFixed(2)}
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border mt-0.5 ${getBadgeClasses(
                        p.badgeVariant
                      )}`}
                    >
                      {p.displayStatus === "SUCCESSFUL" && <CheckCircle2 size={9} />}
                      {p.displayStatus === "FAILED" && <AlertCircle size={9} />}
                      {isTamil ? p.statusLabelTa || p.statusLabel : p.statusLabel}
                    </span>
                  </div>
                </div>

                {/* Service & Category */}
                <div className="space-y-1">
                  <div className="font-bold text-sm text-slate-900 dark:text-white leading-snug">
                    {p.serviceName}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        p.serviceType === "DOCUMENT_SERVICE"
                          ? "bg-blue-50 text-[#1e3a8a] border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800"
                          : "bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800"
                      }`}
                    >
                      {p.serviceType === "DOCUMENT_SERVICE"
                        ? isTamil
                          ? "ஆவண சேவை"
                          : "Document Service"
                        : isTamil
                        ? "மின்-சேவை"
                        : "E-Service"}
                    </span>
                    <span className="text-[11px] text-slate-500 truncate">• {p.categoryName}</span>
                  </div>
                </div>

                {/* Status Message or Suggested Action */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-xs space-y-1.5">
                  <div className="text-[11px] text-slate-600 dark:text-slate-300">
                    {isTamil ? p.statusMessageTa || p.statusMessage : p.statusMessage}
                  </div>
                  {p.suggestedAction && (
                    <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                      <ArrowRight size={11} className="shrink-0" />
                      <span>{p.suggestedAction}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-slate-400 text-[10px] pt-1 border-t border-slate-200/50 dark:border-slate-800">
                    <span>{p.maskedMethod || "UPI"}</span>
                    <span>
                      {new Date(p.paymentDate).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-700/80">
                  <button
                    type="button"
                    onClick={() => setSelectedTimelinePayment(p)}
                    className="w-full py-2 px-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                  >
                    <Clock size={13} className="shrink-0 text-slate-400" />
                    <span>{isTamil ? "காலவரிசை" : "Timeline"}</span>
                  </button>

                  {p.canDownloadReceipt ? (
                    <a
                      href={`/api/user/payments/${p.id}/receipt`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-2 px-2 rounded-xl text-xs font-bold bg-[#1e3a8a] text-white hover:bg-[#1e40af] flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                    >
                      <Download size={13} className="shrink-0" />
                      <span>{isTamil ? "ரசீது PDF" : "Receipt PDF"}</span>
                    </a>
                  ) : p.canReconcile ? (
                    <button
                      type="button"
                      disabled={isReconciling}
                      onClick={() => handleReconcile(p)}
                      className="w-full py-2 px-2 rounded-xl text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 flex items-center justify-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
                    >
                      <RefreshCw size={13} className={`shrink-0 ${isReconciling ? "animate-spin" : ""}`} />
                      <span>{isTamil ? "வங்கி சரிபார்" : "Check Bank"}</span>
                    </button>
                  ) : p.canRetry ? (
                    <button
                      type="button"
                      onClick={() => handleRetry(p)}
                      className="w-full py-2 px-2 rounded-xl text-xs font-bold bg-[#ea580c] text-white hover:bg-[#c2410c] flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                    >
                      <RotateCcw size={13} className="shrink-0" />
                      <span>{isTamil ? "மீண்டும் செலுத்து" : "Retry Payment"}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSelectedTimelinePayment(p)}
                      className="w-full py-2 px-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-500 hover:bg-slate-50 flex items-center justify-center gap-1.5"
                    >
                      <span>{isTamil ? "விவரங்கள்" : "Details"}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ================= DESKTOP TABLE VIEW ================= */}
      <div className="hidden xl:block bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto w-full scrollbar-thin">
          <table className="w-full min-w-[1080px] text-left text-sm divide-y divide-slate-100 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5 w-[200px] whitespace-nowrap">
                  {isTamil ? "ரசீது & குறிப்பு" : "Receipt & App Ref"}
                </th>
                <th className="px-5 py-3.5 min-w-[240px]">
                  {isTamil ? "சேவை மற்றும் பிரிவு" : "Service & Type"}
                </th>
                <th className="px-5 py-3.5 w-[180px] whitespace-nowrap">
                  {isTamil ? "கட்டண முறை" : "Payment Method"}
                </th>
                <th className="px-5 py-3.5 w-[160px] whitespace-nowrap">
                  {isTamil ? "தேதி & நேரம்" : "Date & Time"}
                </th>
                <th className="px-5 py-3.5 w-[110px] text-right whitespace-nowrap">
                  {isTamil ? "கட்டணம்" : "Amount"}
                </th>
                <th className="px-5 py-3.5 w-[150px] text-center whitespace-nowrap">
                  {isTamil ? "நிலை" : "Status"}
                </th>
                <th className="px-5 py-3.5 w-[230px] text-right whitespace-nowrap">
                  {isTamil ? "செயல்கள்" : "Actions"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                    <Loader2 size={24} className="animate-spin text-[#1e3a8a] mx-auto mb-2" />
                    <span>{isTamil ? "கட்டண தரவுகள் பதிவேற்றப்படுகின்றன..." : "Loading payment ledger from database..."}</span>
                  </td>
                </tr>
              ) : paginatedPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                    <Receipt size={32} className="text-slate-400 mx-auto mb-2" />
                    <p className="font-bold text-sm text-slate-700 dark:text-slate-300">
                      {isTamil ? "கட்டண பதிவுகள் எதுவும் இல்லை" : "No payment records found"}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {isTamil ? "வடிகட்டிகளை மாற்றி மீண்டும் முயற்சிக்கவும்." : "Try altering your search or status filters."}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedPayments.map((p) => {
                  const isReconciling = reconcilingId === p.id;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/40 transition-colors">
                      {/* Receipt & App Ref */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="font-mono font-bold text-[#1e3a8a] dark:text-blue-400 text-xs block">
                          {p.receiptNo}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 block mt-0.5">
                          Ref: {p.applicationReference}
                        </span>
                      </td>

                      {/* Service & Type */}
                      <td className="px-5 py-4 min-w-[240px]">
                        <span className="font-bold text-slate-900 dark:text-white block truncate" title={p.serviceName}>
                          {p.serviceName}
                        </span>
                        <div className="flex items-center gap-1.5 mt-1 min-w-0">
                          <span
                            className={`shrink-0 whitespace-nowrap inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              p.serviceType === "DOCUMENT_SERVICE"
                                ? "bg-blue-50 text-[#1e3a8a] border border-blue-200"
                                : "bg-purple-50 text-purple-700 border border-purple-200"
                            }`}
                          >
                            {p.serviceType === "DOCUMENT_SERVICE"
                              ? isTamil
                                ? "ஆவண சேவை"
                                : "Document Service"
                              : isTamil
                              ? "மின்-சேவை"
                              : "E-Service"}
                          </span>
                          <span className="text-[11px] text-slate-500 truncate" title={p.categoryName}>
                            • {p.categoryName}
                          </span>
                        </div>
                      </td>

                      {/* Method & Masked Info */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="font-medium text-xs text-slate-800 dark:text-slate-200 block">
                          {p.maskedMethod || "UPI"}
                        </span>
                        {p.razorpayPaymentId && (
                          <span className="text-[10px] font-mono text-slate-400 truncate block mt-0.5">
                            {p.razorpayPaymentId}
                          </span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                        {new Date(p.paymentDate).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>

                      {/* Amount */}
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <strong className="text-sm font-extrabold text-slate-900 dark:text-white">
                          ₹{p.amount.toFixed(2)}
                        </strong>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border shrink-0 ${getBadgeClasses(
                            p.badgeVariant
                          )}`}
                        >
                          {p.displayStatus === "SUCCESSFUL" && <CheckCircle2 size={10} />}
                          {p.displayStatus === "FAILED" && <AlertCircle size={10} />}
                          <span>{isTamil ? p.statusLabelTa || p.statusLabel : p.statusLabel}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right whitespace-nowrap w-[230px]">
                        <div className="inline-flex items-center justify-end gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setSelectedTimelinePayment(p)}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 inline-flex items-center gap-1 shadow-2xs transition-colors shrink-0"
                          >
                            <Clock size={12} className="shrink-0 text-slate-400" />
                            <span>{isTamil ? "காலவரிசை" : "Timeline"}</span>
                          </button>

                          {p.canDownloadReceipt ? (
                            <a
                              href={`/api/user/payments/${p.id}/receipt`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#1e3a8a] text-white hover:bg-[#1e40af] inline-flex items-center gap-1.5 shadow-2xs transition-colors shrink-0"
                            >
                              <Download size={12} className="shrink-0" />
                              <span>{isTamil ? "ரசீது" : "Receipt"}</span>
                            </a>
                          ) : p.canReconcile ? (
                            <button
                              type="button"
                              disabled={isReconciling}
                              onClick={() => handleReconcile(p)}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 inline-flex items-center gap-1.5 shadow-2xs transition-colors shrink-0 disabled:opacity-50"
                            >
                              <RefreshCw size={12} className={`shrink-0 ${isReconciling ? "animate-spin" : ""}`} />
                              <span>{isTamil ? "சரிபார்" : "Reconcile"}</span>
                            </button>
                          ) : p.canRetry ? (
                            <button
                              type="button"
                              onClick={() => handleRetry(p)}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#ea580c] text-white hover:bg-[#c2410c] inline-flex items-center gap-1.5 shadow-2xs transition-colors shrink-0"
                            >
                              <RotateCcw size={12} className="shrink-0" />
                              <span>{isTamil ? "மறுமுயற்சி" : "Retry"}</span>
                            </button>
                          ) : null}
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

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <span className="text-xs text-slate-500">
            {isTamil
              ? `${filteredPayments.length} பரிவர்த்தனைகளில் ${(page - 1) * pageSize + 1} - ${Math.min(
                  page * pageSize,
                  filteredPayments.length
                )} காட்டப்படுகிறது`
              : `Showing ${(page - 1) * pageSize + 1} - ${Math.min(page * pageSize, filteredPayments.length)} of ${
                  filteredPayments.length
                } transactions`}
          </span>
          <div className="flex gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 disabled:opacity-40"
            >
              {isTamil ? "முந்தையது" : "Previous"}
            </button>
            <span className="px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-white">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 disabled:opacity-40"
            >
              {isTamil ? "அடுத்தது" : "Next"}
            </button>
          </div>
        </div>
      )}

      {/* PAYMENT STATUS TIMELINE MODAL */}
      {selectedTimelinePayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5 animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#1e3a8a] dark:text-blue-400" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  {isTamil ? "பரிவர்த்தனை காலவரிசை மற்றும் நிலை" : "Payment Status & Gateway Audit"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTimelinePayment(null)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 hover:text-slate-800 flex items-center justify-center"
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Content Info */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">{isTamil ? "ரசீது எண்:" : "Receipt No:"}</span>
                <strong className="font-mono text-[#1e3a8a] dark:text-blue-400">
                  {selectedTimelinePayment.receiptNo}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{isTamil ? "சேவை:" : "Service:"}</span>
                <strong className="text-slate-900 dark:text-white truncate max-w-[200px]">
                  {selectedTimelinePayment.serviceName}
                </strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">{isTamil ? "தற்போதைய நிலை:" : "Current Status:"}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getBadgeClasses(
                    selectedTimelinePayment.badgeVariant
                  )}`}
                >
                  {isTamil
                    ? selectedTimelinePayment.statusLabelTa || selectedTimelinePayment.statusLabel
                    : selectedTimelinePayment.statusLabel}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{isTamil ? "கட்டண தொகை:" : "Amount Paid:"}</span>
                <strong className="text-slate-900 dark:text-white">₹{selectedTimelinePayment.amount.toFixed(2)}</strong>
              </div>
              {selectedTimelinePayment.maskedMethod && (
                <div className="flex justify-between">
                  <span className="text-slate-500">{isTamil ? "முறை:" : "Method:"}</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {selectedTimelinePayment.maskedMethod}
                  </span>
                </div>
              )}
              {selectedTimelinePayment.razorpayOrderId && (
                <div className="flex justify-between">
                  <span className="text-slate-500">{isTamil ? "ஆர்டர் ஐடி:" : "Order ID:"}</span>
                  <span className="font-mono text-[10px] text-slate-600 dark:text-slate-300">
                    {selectedTimelinePayment.razorpayOrderId}
                  </span>
                </div>
              )}
              {selectedTimelinePayment.razorpayPaymentId && (
                <div className="flex justify-between">
                  <span className="text-slate-500">{isTamil ? "பரிவர்த்தனை ஐடி:" : "Payment ID:"}</span>
                  <span className="font-mono text-[10px] text-slate-600 dark:text-slate-300">
                    {selectedTimelinePayment.razorpayPaymentId}
                  </span>
                </div>
              )}
            </div>

            {/* Customer Message & Suggested Next Action */}
            <div className="p-3.5 rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 text-xs space-y-1.5">
              <div className="font-bold text-slate-800 dark:text-slate-200">
                {isTamil
                  ? selectedTimelinePayment.statusMessageTa || selectedTimelinePayment.statusMessage
                  : selectedTimelinePayment.statusMessage}
              </div>
              {selectedTimelinePayment.suggestedAction && (
                <div className="text-amber-800 dark:text-amber-300 font-semibold flex items-center gap-1.5 mt-1">
                  <ArrowRight size={13} className="shrink-0" />
                  <span>{selectedTimelinePayment.suggestedAction}</span>
                </div>
              )}
            </div>

            {/* Timeline */}
            <div className="space-y-4 pt-1">
              <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {isTamil ? "நிகழ்வு காலவரிசை" : "Event Timeline"}
              </h4>

              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
                {selectedTimelinePayment.timeline.map((evt, idx) => (
                  <div key={idx} className="relative">
                    <span className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-[#1e3a8a] ring-4 ring-blue-50 dark:ring-blue-950" />
                    <div className="text-xs font-bold text-slate-900 dark:text-white">{evt.event}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{evt.desc}</div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      {new Date(evt.time).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
              {selectedTimelinePayment.canDownloadReceipt ? (
                <a
                  href={`/api/user/payments/${selectedTimelinePayment.id}/receipt`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-[#1e3a8a] hover:bg-[#1e40af] text-white flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Download size={13} />
                  <span>{isTamil ? "அரசு ரசீது பதிவிறக்கு" : "Download Official PDF Receipt"}</span>
                </a>
              ) : selectedTimelinePayment.canReconcile ? (
                <button
                  type="button"
                  disabled={reconcilingId === selectedTimelinePayment.id}
                  onClick={() => handleReconcile(selectedTimelinePayment)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  <RefreshCw size={13} className={reconcilingId === selectedTimelinePayment.id ? "animate-spin" : ""} />
                  <span>{isTamil ? "வங்கி கணக்கு சரிபார்" : "Reconcile with Gateway"}</span>
                </button>
              ) : selectedTimelinePayment.canRetry ? (
                <button
                  type="button"
                  onClick={() => handleRetry(selectedTimelinePayment)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-[#ea580c] hover:bg-[#c2410c] text-white flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <RotateCcw size={13} />
                  <span>{isTamil ? "மீண்டும் கட்டணம் செலுத்து" : "Retry Payment"}</span>
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => setSelectedTimelinePayment(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
              >
                {isTamil ? "மூடு" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
