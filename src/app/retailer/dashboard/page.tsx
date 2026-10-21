"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Wallet,
  FilePlus2,
  ClipboardList,
  Clock,
  CheckCircle2,
  Percent,
  ArrowRight,
  TrendingUp,
  Receipt,
  Store,
  Loader2,
  AlertCircle,
  Download,
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
} from "lucide-react";

interface RetailerDashboardData {
  ok: boolean;
  retailer?: {
    id: number;
    registrationNo?: string;
    name?: string;
    shopName?: string;
    email?: string;
    phone?: string;
    walletBalance?: number;
    status?: string;
  };
  stats?: {
    walletBalance?: number;
    totalOrders?: number;
    pendingCount?: number;
    completedCount?: number;
    rejectedCount?: number;
    totalCommission?: number;
  };
  recentOrders?: any[];
  recentTransactions?: any[];
}

export default function RetailerDashboardPage() {
  const [data, setData] = useState<RetailerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        const res = await fetch("/api/retailer/dashboard");
        if (!res.ok) {
          throw new Error("Failed to load Kendra dashboard data");
        }
        const json = await res.json();
        if (json.ok) {
          setData(json);
        } else {
          setError(json.error || "Failed to load");
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="p-16 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#1e3a8a] mx-auto mb-3" />
        <p className="text-sm font-bold text-slate-600">Loading Kendra Operations Desk...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-xl mx-auto bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-sm flex items-start gap-3">
        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600" />
        <div>
          <strong className="block font-bold">Error loading dashboard</strong>
          <span>{error}</span>
        </div>
      </div>
    );
  }

  const { retailer, stats, recentOrders, recentTransactions } = data || {};

  return (
    <div className="space-y-6 font-sans antialiased">
      {/* 1. Welcome & Primary Balance Hero */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          
           <div className="space-y-2">
        {/* Compact ID Badge */}
        <div className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-slate-600 select-none">
          <Store size={12} className="shrink-0 text-slate-500" />
          <span>Kendra ID: {retailer?.registrationNo || `RET-${retailer?.id}`}</span>
        </div>
          
        {/* Heading Title */}
        <h1 className="text-xl font-black tracking-tight leading-tight text-slate-900">
          Welcome, {retailer?.shopName || retailer?.name}
        </h1>
        
        {/* Content Body */}
        <p className="max-w-lg text-sm leading-relaxed font-normal text-slate-600">
          Assisted Citizen Services Counter. Lodge welfare schemes, verify documents, and deduct fees from your prepaid balance.
        </p>
      </div>

      {/* RIGHT SECTION: PREPAID WALLET CONTROLS WIDGET */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 shrink-0 md:max-w-xl">
        
        {/* Balance Stack Indicator */}
        <div className="pr-4 sm:border-r border-slate-200 space-y-0.5 min-w-[140px]">
          <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase block">
            Prepaid Wallet Balance
          </span>
          <span className="text-2xl font-black tracking-tight text-slate-900 tabular-nums block">
            ₹{Number(retailer?.walletBalance ?? stats?.walletBalance ?? 0).toFixed(2)}
          </span>
        </div>

        {/* Action Button Set */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {/* New Application Orange CTA */}
          <Link
            href="/retailer/apply"
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-lg transition-colors shrink-0"
          >
            <FilePlus2 size={14} className="shrink-0" />
            <span>New Application</span>
          </Link>

          {/* Top-Up White Accent Button */}
          <Link
            href="/retailer/wallet"
            className="flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-lg border border-slate-200 transition-colors shrink-0"
          >
            <Landmark size={14} className="shrink-0 text-[#1e3a8a]" />
            <span>Top-Up</span>
          </Link>
        </div>

      </div>

        </div>
      </div>

      {/* 2. Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Assisted Applications */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Applications
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1e3a8a] flex items-center justify-center">
              <ClipboardList size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{stats?.totalOrders || 0}</div>
          <p className="text-xs text-slate-500 mt-1">Lodge on behalf of citizens</p>
        </div>

        {/* Metric 2: Under Scrutiny */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              In Verification
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600">{stats?.pendingCount || 0}</div>
          <p className="text-xs text-slate-500 mt-1">Welfare officer review queue</p>
        </div>

        {/* Metric 3: Approved & Certificates Issued */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Approved / Certificates
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600">{stats?.completedCount || 0}</div>
          <p className="text-xs text-slate-500 mt-1">Ready for PDF download</p>
        </div>

        {/* Metric 4: Total Commission Earned */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Kendra Commission
            </span>
            <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#ea580c] flex items-center justify-center">
              <Percent size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-[#ea580c]">
            ₹{Number(stats?.totalCommission || 0).toFixed(2)}
          </div>
          <p className="text-xs text-slate-500 mt-1">Credited directly to wallet</p>
        </div>
      </div>

      {/* 3. Operational Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/retailer/apply"
          className="bg-white rounded-xl border border-slate-200 p-5 hover:border-blue-400 hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-[#1e3a8a] flex items-center justify-center mb-3">
            <FilePlus2 size={20} />
          </div>
          <h3 className="font-black text-base text-slate-900 group-hover:text-[#1e3a8a]">
            Assisted Service Application
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Lodge applications for walk-in citizens with instant fee deduction from Kendra balance.
          </p>
        </Link>

        <Link
          href="/retailer/wallet"
          className="bg-white rounded-xl border border-slate-200 p-5 hover:border-emerald-400 hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
            <Wallet size={20} />
          </div>
          <h3 className="font-black text-base text-slate-900 group-hover:text-emerald-700">
            Wallet & Transaction Ledger
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Inspect all historical debits, credits, and request top-up balance from territory distributor.
          </p>
        </Link>

        <Link
          href="/retailer/commissions"
          className="bg-white rounded-xl border border-slate-200 p-5 hover:border-orange-400 hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-orange-50 text-[#ea580c] flex items-center justify-center mb-3">
            <Percent size={20} />
          </div>
          <h3 className="font-black text-base text-slate-900 group-hover:text-[#ea580c]">
            Commission Profit Rates
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Review rule-based earnings per welfare scheme and download commission statements.
          </p>
        </Link>
      </div>

      {/* 4. Recent Assisted Orders Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-black text-base text-slate-900">Recent Assisted Citizen Applications</h2>
            <p className="text-xs text-slate-500 mt-0.5">Live records from Kendra operations</p>
          </div>
          <Link
            href="/retailer/applications"
            className="text-xs font-bold text-[#1e3a8a] hover:underline flex items-center gap-1"
          >
            <span>View All Applications</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {recentOrders && recentOrders.length > 0 ? (
          <div className="overflow-x-auto w-full scrollbar-thin">
            <table className="w-full min-w-[850px] text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 whitespace-nowrap">Order ID</th>
                  <th className="py-3 px-4 whitespace-nowrap">Service</th>
                  <th className="py-3 px-4 whitespace-nowrap">Fee Deducted</th>
                  <th className="py-3 px-4 whitespace-nowrap">Payment</th>
                  <th className="py-3 px-4 whitespace-nowrap">Scrutiny Status</th>
                  <th className="py-3 px-4 whitespace-nowrap">Date</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap min-w-[100px]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentOrders.map((ord: any) => (
                  <tr key={ord.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                      ORD-{ord.id}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800 whitespace-nowrap max-w-[220px]">
                      <span className="truncate block" title={ord.service_name || "Statutory Benefit Scheme"}>
                        {ord.service_name || "Statutory Benefit Scheme"}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                      ₹{Number(ord.amount || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="shrink-0 whitespace-nowrap inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Wallet Deducted
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`shrink-0 whitespace-nowrap inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          ord.status === "completed" || ord.status === "approved"
                            ? "bg-emerald-100 text-emerald-800"
                            : ord.status === "rejected"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {ord.status || "Pending Scrutiny"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {ord.created_at ? new Date(ord.created_at).toLocaleDateString("en-IN") : "-"}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap min-w-[100px]">
                      <Link
                        href="/retailer/applications"
                        className="text-xs font-bold text-[#1e3a8a] hover:underline"
                      >
                        Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-500">
            <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-700">No applications placed yet</p>
            <p className="text-xs mt-1">Start assisting walk-in citizens with government welfare schemes.</p>
            <Link
              href="/retailer/apply"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl bg-[#1e3a8a] text-white text-xs font-bold hover:bg-[#1e40af]"
            >
              <FilePlus2 size={14} />
              <span>Lodge New Application</span>
            </Link>
          </div>
        )}
      </div>

      {/* 5. Recent Wallet Activity & Receipts */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-black text-base text-slate-900">Recent Wallet Ledger Activity</h2>
            <p className="text-xs text-slate-500 mt-0.5">Auditable records of top-ups, deductions, and payment receipts</p>
          </div>
          <Link
            href="/retailer/wallet"
            className="text-xs font-bold text-[#1e3a8a] hover:underline flex items-center gap-1"
          >
            <span>Full Transaction Ledger</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {recentTransactions && recentTransactions.length > 0 ? (
          <div className="overflow-x-auto w-full scrollbar-thin">
            <table className="w-full min-w-[750px] text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 whitespace-nowrap">Txn ID</th>
                  <th className="py-3 px-4 whitespace-nowrap">Type</th>
                  <th className="py-3 px-4 whitespace-nowrap">Amount</th>
                  <th className="py-3 px-4 whitespace-nowrap">Description</th>
                  <th className="py-3 px-4 whitespace-nowrap">Date</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap min-w-[120px]">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentTransactions.map((tx: any) => (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                      TXN-{tx.id}
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
                          <span>Debit</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-black text-slate-900 whitespace-nowrap">
                      {tx.type === "credit" ? "+" : "-"}₹{Number(tx.amount || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-slate-700 max-w-sm">
                      <span className="truncate block" title={tx.description}>{tx.description}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString("en-IN") : "-"}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {tx.type === "credit" ? (
                        <a
                          href={tx.receiptUrl || `/api/retailer/wallet/receipt?id=${tx.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-[#1e3a8a] bg-blue-50 border border-blue-200 hover:bg-[#1e3a8a] hover:text-white transition-all shadow-2xs group"
                          title="Download Official Payment Receipt PDF"
                        >
                          <Download size={11} className="group-hover:translate-y-0.5 transition-transform" />
                          <span>Receipt (PDF)</span>
                        </a>
                      ) : (
                        <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                          Debit
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-500">
            <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-700 text-xs">No wallet transactions recorded yet</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Top up your prepaid balance to begin assisting walk-in citizens.</p>
          </div>
        )}
      </div>
    </div>
  );
}
