"use client";

import { useEffect, useState } from "react";
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileText,
  X,
  Loader2,
} from "lucide-react";

export default function DistributorWalletPage() {
  const [walletData, setWalletData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Topup modal state
  const [topupModal, setTopupModal] = useState(false);
  const [amount, setAmount] = useState("5000");
  const [paymentMethod, setPaymentMethod] = useState("Corporate Net Banking");
  const [referenceNote, setReferenceNote] = useState("");
  const [topupLoading, setTopupLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function loadWallet() {
    try {
      setLoading(true);
      const res = await fetch("/api/distributor/wallet");
      const json = await res.json();
      if (json.ok) {
        setWalletData(json);
      } else {
        setError(json.error || "Failed to load distributor wallet");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWallet();
  }, []);

  async function handleTopupSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTopupLoading(true);
    setSuccessMsg(null);
    setError(null);

    try {
      const res = await fetch("/api/distributor/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount),
          paymentMethod,
          referenceNote,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error || "Top-up failed");
        return;
      }

      setSuccessMsg(json.message);
      setTopupModal(false);
      loadWallet();
    } catch (err: any) {
      setError(err.message || "Failed to replenish float");
    } finally {
      setTopupLoading(false);
    }
  }

  if (loading && !walletData) {
    return (
      <div className="p-16 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0f172a] mx-auto mb-3" />
        <p className="text-xs font-bold text-slate-600">Loading Distributor Float & Ledger...</p>
      </div>
    );
  }

  const { walletBalance, totalCommissionEarned, totalCredited, totalTransferredToKendra, transactions } = walletData || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Distributor Float & Capital Transfers
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Recharge distributor float balances and audit all capital transfers to subordinate Kendra operators.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setTopupModal(true)}
          className="px-5 py-2.5 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>Replenish Float Balance</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle size={16} className="text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Float Balance */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm border-t-4 border-t-[#0f172a]">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
            Available Operating Float
          </span>
          <div className="text-3xl font-black text-[#0f172a]">
            ₹{Number(walletBalance || 0).toFixed(2)}
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Liquid balance ready for Kendra wallet allocations
          </p>
        </div>

        {/* Card 2: Total Transferred */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm border-t-4 border-t-blue-600">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
            Total Transferred to Kendras
          </span>
          <div className="text-3xl font-black text-blue-700">
            ₹{Number(totalTransferredToKendra || 0).toFixed(2)}
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Disbursed across subordinate Kendra network
          </p>
        </div>

        {/* Card 3: Lifetime Commission */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm border-t-4 border-t-emerald-600">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
            Lifetime Override Commissions
          </span>
          <div className="text-3xl font-black text-emerald-700">
            ₹{Number(totalCommissionEarned || 0).toFixed(2)}
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Channel revenue from citizen filings
          </p>
        </div>
      </div>

      {/* Transactions Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-black text-sm text-slate-900">Distributor Capital Transaction Ledger</h2>
          <button
            type="button"
            onClick={loadWallet}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"
          >
            <RefreshCw size={12} />
            <span>Refresh</span>
          </button>
        </div>

        {transactions && transactions.length > 0 ? (
          <div className="overflow-x-auto w-full scrollbar-thin">
            <table className="w-full min-w-[850px] text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 whitespace-nowrap">Transaction ID</th>
                  <th className="py-3 px-4 whitespace-nowrap">Type</th>
                  <th className="py-3 px-4 whitespace-nowrap">Amount</th>
                  <th className="py-3 px-4 whitespace-nowrap">Particulars</th>
                  <th className="py-3 px-4 whitespace-nowrap">Reference ID</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((tx: any) => (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                      DTX-{tx.id}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {tx.type === "credit" ? (
                        <span className="shrink-0 whitespace-nowrap inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <ArrowDownLeft size={10} className="shrink-0" />
                          <span>Credit</span>
                        </span>
                      ) : (
                        <span className="shrink-0 whitespace-nowrap inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                          <ArrowUpRight size={10} className="shrink-0" />
                          <span>Debit (Transfer)</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-black text-slate-900 whitespace-nowrap">
                      {tx.type === "credit" ? "+" : "-"}₹{Number(tx.amount).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-slate-700 max-w-md">
                      <span className="truncate block" title={tx.description}>{tx.description}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {tx.referenceId || "-"}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500 whitespace-nowrap">
                      {tx.createdAt ? new Date(tx.createdAt).toLocaleString("en-IN") : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-500">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-700">No transactions recorded yet</p>
            <p className="text-xs mt-1">Float deposits and transfers to Kendra operators will appear here in real-time.</p>
          </div>
        )}
      </div>

      {/* Topup Float Modal */}
      {topupModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border-t-8 border-t-[#ea580c] relative">
            <button
              type="button"
              onClick={() => setTopupModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X size={20} />
            </button>

            <h2 className="text-base font-black text-slate-900 mb-1">
              Replenish Distributor Float Balance
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Add capital to your distributor account to allocate operating funds to Kendra operators.
            </p>

            <form onSubmit={handleTopupSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Recharge Amount (₹)</label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {["2000", "5000", "10000", "25000"].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAmount(val)}
                      className={`py-2 rounded-lg border font-bold ${
                        amount === val
                          ? "bg-[#0f172a] text-white border-[#0f172a]"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      ₹{val}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min="500"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm font-bold focus:ring-2 focus:ring-[#ea580c] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-[#ea580c] bg-white"
                >
                  <option value="Corporate Net Banking">Corporate Net Banking / RTGS</option>
                  <option value="Instant UPI / Business Gateway">Instant Business UPI / Razorpay Gateway</option>
                  <option value="Direct NEFT Transfer">Direct Bank NEFT</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Bank Reference / UTR Number</label>
                <input
                  type="text"
                  value={referenceNote}
                  onChange={(e) => setReferenceNote(e.target.value)}
                  placeholder="e.g. UTR / Transaction Ref"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#ea580c] focus:outline-none"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="submit"
                  disabled={topupLoading}
                  className="flex-1 py-3 px-4 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold text-xs shadow-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {topupLoading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Processing Float...</span>
                    </>
                  ) : (
                    <span>Credit ₹{Number(amount || 0).toFixed(2)} to Float</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setTopupModal(false)}
                  className="py-3 px-4 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
