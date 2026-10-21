"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Wallet,
  Users,
  Percent,
  TrendingUp,
  Building2,
  ArrowRight,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Loader2,
  AlertCircle,
  FileCheck2,
} from "lucide-react";

export default function DistributorDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        const res = await fetch("/api/distributor/dashboard");
        if (!res.ok) {
          throw new Error("Failed to load Distributor dashboard data");
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
        <Loader2 className="w-8 h-8 animate-spin text-[#0f172a] mx-auto mb-3" />
        <p className="text-sm font-bold text-slate-600">Loading Distributor Operations Hub...</p>
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

  const { distributor, stats, affiliatedRetailers, recentTransactions } = data || {};

  return (
    <div className="space-y-6">
      {/* 1. Welcome & Primary Float Hero */}
      <div className="bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#334155] rounded-2xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden border-t-4 border-t-[#ea580c]">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-semibold mb-3 border border-slate-700">
              <Building2 size={14} />
              <span>Distributor ID: {distributor?.registrationNo || `DIST-${distributor?.id}`}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Welcome, {distributor?.name}
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-xl">
              Territory Distribution Hub. Manage subordinate Kendra networks, distribute prepaid floats, and earn override commissions on all citizen applications.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 flex flex-col sm:flex-row items-center gap-4">
            <div>
              <span className="text-xs uppercase font-bold text-slate-400 tracking-wider block">
                Distributor Float Balance
              </span>
              <span className="text-3xl font-black tracking-tight">
                ₹{Number(stats?.walletBalance || 0).toFixed(2)}
              </span>
            </div>
            <div className="flex gap-2">
              <Link
                href="/distributor/retailers"
                className="px-5 py-2.5 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold text-sm shadow-md transition-all flex items-center gap-2"
              >
                <Users size={16} />
                <span>Fund Kendra</span>
              </Link>
              <Link
                href="/distributor/wallet"
                className="px-4 py-2.5 rounded-xl bg-white text-slate-900 font-bold text-sm hover:bg-slate-100 transition-all"
              >
                Add Float
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Affiliated Kendra Count */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm border-t-4 border-t-[#0f172a]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Affiliated Kendras
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-[#0f172a] flex items-center justify-center">
              <Users size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{stats?.totalRetailers || 0}</div>
          <p className="text-xs text-slate-500 mt-1">{stats?.activeRetailers || 0} active Kendra counters</p>
        </div>

        {/* Metric 2: Network Application Volume */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm border-t-4 border-t-blue-600">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Network Applications
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-700">{stats?.networkOrdersCount || 0}</div>
          <p className="text-xs text-slate-500 mt-1">₹{Number(stats?.networkOrdersVolume || 0).toFixed(2)} total volume</p>
        </div>

        {/* Metric 3: Lifetime Commissions Earned */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm border-t-4 border-t-emerald-600">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Override Commissions
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Percent size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700">
            ₹{Number(stats?.totalCommissionEarned || 0).toFixed(2)}
          </div>
          <p className="text-xs text-slate-500 mt-1">Settled automatically from applications</p>
        </div>

        {/* Metric 4: Mandatory KYC Status */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm border-t-4 border-t-[#ea580c]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Mandatory KYC
            </span>
            <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#ea580c] flex items-center justify-center">
              <FileCheck2 size={16} />
            </div>
          </div>
          <div className="text-base font-black text-emerald-700 uppercase">
            {distributor?.verificationStatus || "Approved"}
          </div>
          <p className="text-xs text-slate-500 mt-1">Enterprise credentials verified</p>
        </div>
      </div>

      {/* 3. Operational Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/distributor/retailers"
          className="bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-400 hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-slate-100 text-[#0f172a] flex items-center justify-center mb-3">
            <Users size={20} />
          </div>
          <h3 className="font-black text-base text-slate-900 group-hover:text-[#0f172a]">
            Fund Kendra Retailers
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Instantly transfer float balance to affiliated Kendra operators to keep citizen desks running.
          </p>
        </Link>

        <Link
          href="/distributor/wallet"
          className="bg-white rounded-xl border border-slate-200 p-5 hover:border-emerald-400 hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
            <Wallet size={20} />
          </div>
          <h3 className="font-black text-base text-slate-900 group-hover:text-emerald-700">
            Float Management & Ledger
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Recharge distributor float balance and inspect historical transfer debits and commission credits.
          </p>
        </Link>

        <Link
          href="/distributor/commissions"
          className="bg-white rounded-xl border border-slate-200 p-5 hover:border-orange-400 hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-orange-50 text-[#ea580c] flex items-center justify-center mb-3">
            <Percent size={20} />
          </div>
          <h3 className="font-black text-base text-slate-900 group-hover:text-[#ea580c]">
            Commission Reports
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Detailed breakdown of override earnings per Kendra operator and per welfare scheme category.
          </p>
        </Link>
      </div>

      {/* 4. Affiliated Kendra Network Snapshot */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-black text-base text-slate-900">Affiliated Kendra Counters</h2>
            <p className="text-xs text-slate-500 mt-0.5">Retailers operating under your distribution channel</p>
          </div>
          <Link
            href="/distributor/retailers"
            className="text-xs font-bold text-[#0f172a] hover:underline flex items-center gap-1"
          >
            <span>Manage All Retailers</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {affiliatedRetailers && affiliatedRetailers.length > 0 ? (
          <div className="overflow-x-auto w-full scrollbar-thin">
            <table className="w-full min-w-[850px] text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 whitespace-nowrap">Kendra Registration</th>
                  <th className="py-3 px-4 whitespace-nowrap">Shop Name</th>
                  <th className="py-3 px-4 whitespace-nowrap">Operator Contact</th>
                  <th className="py-3 px-4 whitespace-nowrap">Prepaid Balance</th>
                  <th className="py-3 px-4 whitespace-nowrap">Status</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap min-w-[120px]">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {affiliatedRetailers.map((ret: any) => (
                  <tr key={ret.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {ret.registration_no || `RET-${ret.id}`}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800 whitespace-nowrap">
                      {ret.shop_name || ret.name}
                    </td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {ret.phone}
                    </td>
                    <td className="py-3 px-4 font-black text-slate-900 whitespace-nowrap">
                      ₹{Number(ret.wallet_balance || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="shrink-0 whitespace-nowrap inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {ret.status || "Active"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap min-w-[120px]">
                      <Link
                        href="/distributor/retailers"
                        className="px-3 py-1 rounded-lg bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold text-[11px] shadow-sm inline-flex items-center shrink-0"
                      >
                        Transfer Float
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center text-slate-500 text-xs">
            No Kendra retailers affiliated yet. Click &quot;Manage All Retailers&quot; to onboard new Kendra counters.
          </div>
        )}
      </div>

      {/* 5. Recent Float & Transfer Ledger */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-black text-base text-slate-900">Recent Distributor Transactions</h2>
          <Link
            href="/distributor/wallet"
            className="text-xs font-bold text-[#0f172a] hover:underline flex items-center gap-1"
          >
            <span>Full Ledger</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {recentTransactions && recentTransactions.length > 0 ? (
          <div className="overflow-x-auto w-full scrollbar-thin">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 whitespace-nowrap">Transaction ID</th>
                  <th className="py-3 px-4 whitespace-nowrap">Type</th>
                  <th className="py-3 px-4 whitespace-nowrap">Amount</th>
                  <th className="py-3 px-4 whitespace-nowrap">Particulars</th>
                  <th className="py-3 px-4 whitespace-nowrap">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentTransactions.map((tx: any) => (
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
                          <span>Transfer Out</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-black text-slate-900 whitespace-nowrap">
                      {tx.type === "credit" ? "+" : "-"}₹{Number(tx.amount).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-slate-700 max-w-md">
                      <span className="truncate block" title={tx.description}>{tx.description}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {tx.createdAt ? new Date(tx.createdAt).toLocaleString("en-IN") : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-500 text-xs">
            No transactions recorded yet in the distributor ledger.
          </div>
        )}
      </div>
    </div>
  );
}
