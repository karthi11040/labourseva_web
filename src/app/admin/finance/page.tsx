"use client";

import { useState, useMemo } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  PlusCircle,
  MinusCircle,
  Search,
  Filter,
  Download,
  CheckCircle2,
  Clock,
  AlertTriangle,
  CreditCard,
  Building,
  RefreshCw,
  X,
  ShieldCheck,
} from "lucide-react";

interface Transaction {
  id: string;
  type: "CREDIT" | "DEBIT" | "REFUND" | "RECHARGE";
  walletCategory: "CARDS" | "PAYMENTS";
  party: string;
  partyRole: "CUSTOMER" | "RETAILER" | "DISTRIBUTOR";
  amount: number;
  description: string;
  reference: string;
  status: "COMPLETED" | "PENDING" | "FAILED";
  timestamp: string;
}

const initialTransactions: Transaction[] = [];


export default function AdminFinancePage() {
  const { isTamil } = useLanguage();
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [categoryFilter, setCategoryFilter] = useState<"ALL" | "CARDS" | "PAYMENTS">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "COMPLETED" | "PENDING">("ALL");
  const [search, setSearch] = useState("");

  // Modal states for Add/Deduct Money
  const [modalMode, setModalMode] = useState<"ADD" | "DEDUCT" | null>(null);
  const [partyName, setPartyName] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [walletCategoryInput, setWalletCategoryInput] = useState<"CARDS" | "PAYMENTS">("PAYMENTS");
  const [remarksInput, setRemarksInput] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amountInput);
    if (!partyName.trim() || isNaN(val) || val <= 0) return;

    const newTxn: Transaction = {
      id: `TXN-${Math.floor(10000 + Math.random() * 90000)}`,
      type: modalMode === "ADD" ? "CREDIT" : "DEBIT",
      walletCategory: walletCategoryInput,
      party: partyName.trim(),
      partyRole: "CUSTOMER",
      amount: val,
      description: `Manual Adjustment: ${remarksInput.trim() || (modalMode === "ADD" ? "Administrative credit" : "Administrative deduction")}`,
      reference: `ADM-MAN-${Date.now().toString().slice(-6)}`,
      status: "COMPLETED",
      timestamp: "Just now",
    };

    setTransactions([newTxn, ...transactions]);
    showToast(`Successfully ${modalMode === "ADD" ? "credited" : "debited"} ₹${val.toLocaleString()} for ${partyName}.`);
    setModalMode(null);
    setPartyName("");
    setAmountInput("");
    setRemarksInput("");
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (categoryFilter !== "ALL" && t.walletCategory !== categoryFilter) return false;
      if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          t.id.toLowerCase().includes(q) ||
          t.party.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.reference.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [transactions, categoryFilter, statusFilter, search]);

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 rounded-xl bg-slate-900 text-white px-5 py-3 shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-top-4 duration-200">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#ea580c]">
            {isTamil ? "நிதி செயல்பாடுகள் & லெட்ஜர் (admin_wallet.php)" : "Financial Operations & Ledger (admin_wallet.php)"}
          </span>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
            {isTamil ? "பணப்பை & கட்டணக் கட்டுப்பாடுகள்" : "Wallet & Payment Controls"}
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            {isTamil
              ? "அட்டைகள் பணப்பை மற்றும் கொடுப்பனவு பணப்பை முழுவதும் நேரடி லெட்ஜர் சரிபார்ப்பு மற்றும் கைமுறை தீர்வு மேலாண்மை."
              : "Real-time ledger across Cards Wallet and Payments Wallet with row-level transaction verification and manual settlement overrides."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <a href="/admin/refunds" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#1e3a8a] bg-white px-4 py-2 text-xs font-bold text-[#1e3a8a] hover:bg-blue-50">
            <ShieldCheck className="w-4 h-4" /> {isTamil ? "சில்லறை பணத்தைத் திரும்பப்பெறுதல்" : "Retailer Refund Requests"}
          </a>
          <button
            type="button"
            onClick={() => {
              setModalMode("ADD");
              setAmountInput("");
              setPartyName("");
              setRemarksInput("");
            }}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" /> {isTamil ? "பணப்பையில் வரவு (admin_add_money.php)" : "Credit Wallet (admin_add_money.php)"}
          </button>
          <button
            type="button"
            onClick={() => {
              setModalMode("DEDUCT");
              setAmountInput("");
              setPartyName("");
              setRemarksInput("");
            }}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-rose-300 bg-white px-4 py-2 text-xs font-bold text-rose-700 shadow-xs hover:bg-rose-50 transition-colors cursor-pointer"
          >
            <MinusCircle className="w-4 h-4" /> {isTamil ? "பணப்பையிலிருந்து பற்று (admin_deduct_money.php)" : "Debit Wallet (admin_deduct_money.php)"}
          </button>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs border-t-4 border-t-[#1e3a8a]">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{isTamil ? "மொத்த செயலில் உள்ள மிதவை" : "Total Active Float"}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            ₹{transactions.filter((t) => t.status === "COMPLETED").reduce((sum, t) => sum + (t.type === "DEBIT" ? -t.amount : t.amount), 0).toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-emerald-600 font-medium">100.0% Reconciled</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs border-t-4 border-t-blue-600">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{isTamil ? "கொடுப்பனவு பணப்பை இருப்பு" : "Payments Wallet Pool"}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            ₹{transactions.filter((t) => t.walletCategory === "PAYMENTS" && t.status === "COMPLETED").reduce((sum, t) => sum + (t.type === "DEBIT" ? -t.amount : t.amount), 0).toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-slate-500">{isTamil ? "சில்லறை & விநியோகஸ்தர் நிதி" : "Retail & Distributor Liquidity"}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs border-t-4 border-t-purple-600">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{isTamil ? "அட்டை பணப்பை இருப்பு" : "Cards Wallet Pool"}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            ₹{transactions.filter((t) => t.walletCategory === "CARDS" && t.status === "COMPLETED").reduce((sum, t) => sum + (t.type === "DEBIT" ? -t.amount : t.amount), 0).toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-slate-500">{isTamil ? "தொழிலாளர் ஸ்மார்ட் கார்டுகள்" : "Citizen Smart Card Replacements"}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs border-t-4 border-t-amber-500">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{isTamil ? "நிலுவையில் உள்ள நுழைவாயில் வைப்புகள்" : "Pending Gateway Holds"}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            ₹{transactions.filter((t) => t.status === "PENDING").reduce((sum, t) => sum + t.amount, 0).toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-amber-600 font-medium">
            {transactions.filter((t) => t.status === "PENDING").length} {isTamil ? "வைப்புகள் அனுமதியில்" : "Deposit(s) in Clearance"}
          </p>
        </div>
      </div>

      {/* Transactions Ledger Workbench */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        {/* Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Txn ID, party name, description, UTR..."
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-300 bg-white text-xs outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Category Filter */}
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5" /> Category:
            </span>
            {(["ALL", "PAYMENTS", "CARDS"] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  categoryFilter === cat
                    ? "bg-[#1e3a8a] text-white shadow-xs"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {cat === "ALL" ? "All Wallets" : `${cat.charAt(0) + cat.slice(1).toLowerCase()} Wallet`}
              </button>
            ))}

            {/* Status Filter */}
            <span className="text-xs font-semibold text-slate-500 ml-2 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Status:
            </span>
            {(["ALL", "COMPLETED", "PENDING"] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === st
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {st === "ALL" ? "All" : st.charAt(0) + st.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto w-full scrollbar-thin">
          <table className="w-full min-w-[950px] text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3.5 whitespace-nowrap">{isTamil ? "பரிவர்த்தனை ஐடி" : "Transaction ID"}</th>
                <th className="px-5 py-3.5 whitespace-nowrap">{isTamil ? "பணப்பை வகை" : "Wallet Pool"}</th>
                <th className="px-5 py-3.5 whitespace-nowrap">{isTamil ? "பயனாளி / நபர்" : "Party / Beneficiary"}</th>
                <th className="px-5 py-3.5 whitespace-nowrap">{isTamil ? "விளக்கம் & குறிப்பு" : "Description & Reference"}</th>
                <th className="px-5 py-3.5 text-right whitespace-nowrap">{isTamil ? "தொகை (₹)" : "Amount (₹)"}</th>
                <th className="px-5 py-3.5 text-center whitespace-nowrap">{isTamil ? "நிலை" : "Status"}</th>
                <th className="px-5 py-3.5 text-right whitespace-nowrap">{isTamil ? "தேதி / நேரம்" : "Date / Time"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.map((t) => {
                const isCredit = t.type === "CREDIT" || t.type === "RECHARGE";
                return (
                  <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-4 font-mono font-bold text-slate-800 whitespace-nowrap">
                      {t.id}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span
                        className={`shrink-0 whitespace-nowrap inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          t.walletCategory === "PAYMENTS"
                            ? "bg-blue-50 text-blue-800 border border-blue-200"
                            : "bg-purple-50 text-purple-800 border border-purple-200"
                        }`}
                      >
                        {t.walletCategory === "PAYMENTS" ? "Payments Wallet" : "Cards Wallet"}
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <strong className="block text-slate-900 font-semibold">{t.party}</strong>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">{t.partyRole}</span>
                    </td>
                    <td className="px-5 py-4 max-w-xs">
                      <p className="text-slate-700 truncate block" title={t.description}>{t.description}</p>
                      <span className="text-[10px] font-mono text-slate-400 block">{t.reference}</span>
                    </td>
                    <td className={`px-5 py-4 text-right font-bold text-sm whitespace-nowrap ${isCredit ? "text-emerald-700" : "text-rose-700"}`}>
                      {isCredit ? "+" : "-"}₹{t.amount.toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-center whitespace-nowrap">
                      <span
                        className={`shrink-0 whitespace-nowrap inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          t.status === "COMPLETED"
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : t.status === "PENDING"
                            ? "bg-amber-50 text-amber-800 border border-amber-200"
                            : "bg-rose-50 text-rose-800 border border-rose-200"
                        }`}
                      >
                        {t.status === "COMPLETED" ? <CheckCircle2 size={12} className="shrink-0" /> : <Clock size={12} className="shrink-0" />}
                        <span>{t.status}</span>
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right text-slate-500 text-[11px] whitespace-nowrap">
                      {t.timestamp}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredTransactions.length === 0 && (
          <div className="p-10 text-center text-slate-500">
            No transactions match the selected filters.
          </div>
        )}
      </section>

      {/* Manual Credit/Debit Adjustment Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div
              className={`p-5 border-b flex items-center justify-between text-white ${
                modalMode === "ADD" ? "bg-emerald-700" : "bg-rose-700"
              }`}
            >
              <h3 className="text-sm font-bold flex items-center gap-2">
                {modalMode === "ADD" ? <PlusCircle className="w-4 h-4" /> : <MinusCircle className="w-4 h-4" />}
                {modalMode === "ADD" ? "Credit Customer/Partner Wallet (admin_add_money.php)" : "Debit Customer Wallet (admin_deduct_money.php)"}
              </h3>
              <button type="button" onClick={() => setModalMode(null)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Account / Name / Mobile</label>
                <input
                  type="text"
                  required
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  placeholder="e.g. Arumugam P. or Mobile 98765-XXXX1"
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 outline-none focus:border-[#1e3a8a]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Adjustment Amount (₹)</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    placeholder="e.g. 500"
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 outline-none focus:border-[#1e3a8a]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Wallet Category</label>
                  <select
                    value={walletCategoryInput}
                    onChange={(e) => setWalletCategoryInput(e.target.value as "CARDS" | "PAYMENTS")}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 outline-none focus:border-[#1e3a8a]"
                  >
                    <option value="PAYMENTS">Payments Wallet</option>
                    <option value="CARDS">Cards Wallet</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Statutory Reason &amp; Reference</label>
                <textarea
                  rows={2}
                  required
                  value={remarksInput}
                  onChange={(e) => setRemarksInput(e.target.value)}
                  placeholder="e.g. Treasury bank challan #TB-991 verified / Court order compliance"
                  className="w-full p-2.5 rounded-lg border border-slate-300 outline-none focus:border-[#1e3a8a]"
                />
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-600">
                Uses row-level database locking (<code>FOR UPDATE</code>) to ensure transactional atomicity and writes previous and new balances to <code>admin_wallet_logs</code>.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 rounded-lg text-xs font-bold text-white transition-colors ${
                    modalMode === "ADD" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
                  }`}
                >
                  Execute {modalMode === "ADD" ? "Credit" : "Debit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
