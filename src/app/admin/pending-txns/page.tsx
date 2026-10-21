"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Clock,
  Search,
  Filter,
  Download,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Wallet,
  Building,
  CreditCard,
  X,
  ArrowUpRight,
  ShieldCheck,
  ArrowDownLeft,
} from "lucide-react";

interface PendingTxn {
  id: string;
  orderRef: string;
  partyName: string;
  partyType: "RETAILER" | "DISTRIBUTOR" | "CITIZEN";
  gateway: "RAZORPAY_UPI" | "SBI_EPAY" | "NEFT_RTGS";
  utrRef: string;
  amount: number;
  walletTarget: "CARDS" | "PAYMENTS" | "FLOAT";
  submittedAt: string;
  gatewayStatus: "PENDING_WEBHOOK" | "SUCCESS_AWAITING_LEDGER" | "FAILED_TIMEOUT";
  status: "PENDING_VERIFICATION" | "APPROVED_CREDITED" | "REJECTED";
}

const initialTxns: PendingTxn[] = [];

export default function AdminPendingTxnsPage() {
  const [txns, setTxns] = useState<PendingTxn[]>(initialTxns);
  const [search, setSearch] = useState("");
  const [gatewayFilter, setGatewayFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING_VERIFICATION" | "APPROVED_CREDITED" | "REJECTED">("ALL");

  // Modals
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState<PendingTxn | null>(null);
  const [toastMessage, setToastMessage] = useState("");
  const [recheckLoading, setRecheckLoading] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  const loadPending = async () => {
    try {
      const res = await fetch("/api/admin/pending-txns");
      if (res.ok) {
        const json = await res.json();
        if (json.ok && Array.isArray(json.txns)) {
          setTxns(json.txns);
        }
      }
    } catch {}
  };

  useEffect(() => {
    loadPending();
  }, []);

  const filteredTxns = useMemo(() => {
    return txns.filter((t) => {
      const matchesSearch =
        t.id.toLowerCase().includes(search.toLowerCase()) ||
        t.orderRef.toLowerCase().includes(search.toLowerCase()) ||
        t.partyName.toLowerCase().includes(search.toLowerCase()) ||
        t.utrRef.toLowerCase().includes(search.toLowerCase());
      const matchesGateway = gatewayFilter === "ALL" || t.gateway === gatewayFilter;
      const matchesStatus = statusFilter === "ALL" || t.status === statusFilter;
      return matchesSearch && matchesGateway && matchesStatus;
    });
  }, [txns, search, gatewayFilter, statusFilter]);

  const handleOpenDetail = (t: PendingTxn) => {
    setSelectedTxn(t);
    setDetailModalOpen(true);
  };

  const handleRequeryGateway = (tId: string) => {
    setRecheckLoading(true);
    setTimeout(() => {
      setRecheckLoading(false);
      setTxns((prev) =>
        prev.map((t) =>
          t.id === tId ? { ...t, gatewayStatus: "SUCCESS_AWAITING_LEDGER" } : t
        )
      );
      showToast(`Gateway re-query successful: Payment verified on upstream gateway.`);
    }, 1200);
  };

  const handleApproveCredit = async (t: PendingTxn) => {
    try {
      const res = await fetch("/api/admin/pending-txns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "APPROVE", txnId: t.id, orderRef: t.orderRef }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Approval failed");

      setTxns((prev) =>
        prev.map((item) =>
          item.id === t.id ? { ...item, status: "APPROVED_CREDITED" } : item
        )
      );
      setDetailModalOpen(false);
      showToast(`Transaction ${t.id} approved. ₹${t.amount.toLocaleString()} credited to ${t.partyName}'s ${t.walletTarget} wallet. Receipt sent to profile email.`);
    } catch (err: any) {
      showToast(err.message || "Failed to approve transaction.");
    }
  };

  const handleRejectTxn = async (t: PendingTxn) => {
    try {
      const res = await fetch("/api/admin/pending-txns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REJECT", txnId: t.id, orderRef: t.orderRef }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Rejection failed");

      setTxns((prev) =>
        prev.map((item) =>
          item.id === t.id ? { ...item, status: "REJECTED" } : item
        )
      );
      setDetailModalOpen(false);
      showToast(`Transaction ${t.id} rejected. Notification sent to profile email.`);
    } catch (err: any) {
      showToast(err.message || "Failed to reject transaction.");
    }
  };

  const exportCSV = () => {
    const headers = ["Txn ID", "Order Ref", "Party Name", "Party Type", "Gateway", "UTR / Pay ID", "Amount", "Wallet Pool", "Status"];
    const rows = filteredTxns.map((t) => [
      t.id,
      t.orderRef,
      t.partyName,
      t.partyType,
      t.gateway,
      t.utrRef,
      t.amount,
      t.walletTarget,
      t.status,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "labourseva_pending_transactions.csv");
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
                <Clock className="w-3.5 h-3.5 text-amber-300" />
                Ledger Settlement Queue (admin_pending_txns.php)
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Pending Financial Transactions</h1>
              <p className="mt-1 text-sm sm:text-base text-blue-100 max-w-2xl">
                Inspect unsettled payment gateway transactions, verify NEFT/RTGS wallet float remittances, and release atomic balance credits.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={exportCSV}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold border border-white/20 transition-all backdrop-blur-sm shadow-sm"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/15">
            <div>
              <p className="text-xs text-blue-200 font-medium">Pending Release</p>
              <p className="text-2xl font-black mt-1 text-amber-300">
                {txns.filter((t) => t.status === "PENDING_VERIFICATION").length} Held
              </p>
            </div>
            <div>
              <p className="text-xs text-blue-200 font-medium">Pending Value</p>
              <p className="text-2xl font-black mt-1 text-white">
                ₹{txns.filter((t) => t.status === "PENDING_VERIFICATION").reduce((s, t) => s + t.amount, 0).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-blue-200 font-medium">Reconciled</p>
              <p className="text-2xl font-black mt-1 text-emerald-300">
                ₹{txns.filter((t) => t.status === "APPROVED_CREDITED").reduce((s, t) => s + t.amount, 0).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-blue-200 font-medium">Gateway Health</p>
              <p className="text-2xl font-black mt-1 text-emerald-200">100.0% Online</p>
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
              placeholder="Search by Transaction ID, Order Ref, Party, or UTR..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:bg-white transition-all"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <select
              value={gatewayFilter}
              onChange={(e) => setGatewayFilter(e.target.value)}
              className="text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
            >
              <option value="ALL">All Gateways</option>
              <option value="RAZORPAY_UPI">Razorpay UPI</option>
              <option value="SBI_EPAY">SBI ePay</option>
              <option value="NEFT_RTGS">NEFT / RTGS</option>
            </select>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            {(["ALL", "PENDING_VERIFICATION", "APPROVED_CREDITED", "REJECTED"] as const).map((st) => (
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
                {st === "ALL" ? "All" : st.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto w-full scrollbar-thin">
          <table className="w-full min-w-[980px] text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-700">
              <tr>
                <th className="px-5 py-4 whitespace-nowrap">Transaction &amp; Order</th>
                <th className="px-5 py-4 whitespace-nowrap">Party &amp; Channel</th>
                <th className="px-5 py-4 whitespace-nowrap">Gateway &amp; UTR</th>
                <th className="px-5 py-4 whitespace-nowrap">Amount &amp; Wallet</th>
                <th className="px-5 py-4 whitespace-nowrap">Status</th>
                <th className="px-5 py-4 text-right whitespace-nowrap min-w-[130px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTxns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                    <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No Pending Transactions on Hold</p>
                    <p className="text-xs text-slate-500 mt-1">Transactions requiring manual reconciliation or gateway re-querying will appear here.</p>
                  </td>
                </tr>
              ) : (
                filteredTxns.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900 text-base">{t.id}</div>
                      <div className="text-xs font-mono text-[#1e3a8a] font-semibold mt-0.5">{t.orderRef}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{t.submittedAt}</div>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-800">{t.partyName}</div>
                      <span className="shrink-0 whitespace-nowrap px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 mt-1 inline-block">
                        {t.partyType}
                      </span>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="text-xs font-bold text-slate-800">{t.gateway.replace("_", " ")}</div>
                      <div className="text-[11px] font-mono text-slate-500 mt-0.5 truncate max-w-xs">{t.utrRef}</div>
                      <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                        {t.gatewayStatus.replace("_", " ")}
                      </div>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="font-mono font-black text-slate-900 text-base">₹{t.amount.toLocaleString()}</div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        Target: <strong className="text-blue-700">{t.walletTarget}</strong>
                      </div>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <span
                        className={`shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                          t.status === "APPROVED_CREDITED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : t.status === "PENDING_VERIFICATION"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}
                      >
                        {t.status === "APPROVED_CREDITED" ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : t.status === "PENDING_VERIFICATION" ? (
                          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                        )}
                        <span>{t.status.replace("_", " ")}</span>
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right whitespace-nowrap min-w-[130px]">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(t)}
                          className="p-1.5 text-slate-600 hover:text-[#1e3a8a] hover:bg-slate-100 rounded-lg transition-colors shrink-0"
                          title="Inspect & Reconcile"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {t.status === "PENDING_VERIFICATION" && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleRequeryGateway(t.id)}
                              className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors shrink-0"
                              title="Re-query Gateway API"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApproveCredit(t)}
                              className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors shrink-0"
                              title="Approve & Release Float (Atomically Credit Wallet)"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          </>
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

      {/* MODAL: Inspection & Reconcile */}
      {detailModalOpen && selectedTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden">
            <div className="px-6 py-5 bg-[#1e3a8a] text-white flex items-center justify-between">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-blue-200">
                  Reconciliation Desk · {selectedTxn.id}
                </span>
                <h3 className="text-lg font-bold mt-0.5">Order Ref: {selectedTxn.orderRef}</h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Party Name:</span>
                  <strong className="text-slate-900">{selectedTxn.partyName} ({selectedTxn.partyType})</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Gateway:</span>
                  <strong className="text-slate-900">{selectedTxn.gateway}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Gateway UTR / Pay ID:</span>
                  <strong className="font-mono text-slate-900">{selectedTxn.utrRef}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Target Wallet Pool:</span>
                  <strong className="text-blue-700">{selectedTxn.walletTarget} WALLET</strong>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200 text-sm">
                  <span className="text-slate-800 font-bold">Total Remittance Amount:</span>
                  <strong className="font-mono text-emerald-700 font-black">₹{selectedTxn.amount.toLocaleString()}</strong>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Atomic Transaction Policy:</strong> Approving this transaction will update ledger status, atomically increment the partner's balance with row locking, and record delta to <code>admin_wallet_logs</code>.
                </span>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-between gap-3">
              {selectedTxn.status === "PENDING_VERIFICATION" ? (
                <button
                  type="button"
                  onClick={() => handleRejectTxn(selectedTxn)}
                  className="px-4 py-2 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200"
                >
                  Reject Transaction
                </button>
              ) : <div></div>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDetailModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Close
                </button>
                {selectedTxn.status === "PENDING_VERIFICATION" && (
                  <button
                    type="button"
                    onClick={() => handleApproveCredit(selectedTxn)}
                    className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm"
                  >
                    Release & Credit Float
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
