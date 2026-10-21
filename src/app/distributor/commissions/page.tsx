"use client";

import { useEffect, useState } from "react";
import {
  Percent,
  TrendingUp,
  Users,
  CheckCircle2,
  AlertCircle,
  FileText,
  Loader2,
  Building,
} from "lucide-react";

export default function DistributorCommissionsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCommissions() {
      try {
        setLoading(true);
        const res = await fetch("/api/distributor/commissions");
        const json = await res.json();
        if (json.ok) {
          setData(json);
        } else {
          setError(json.error || "Failed to load distributor commissions");
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadCommissions();
  }, []);

  if (loading) {
    return (
      <div className="p-16 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0f172a] mx-auto mb-3" />
        <p className="text-xs font-bold text-slate-600">Loading Distributor Commission Statements...</p>
      </div>
    );
  }

  const { totalCommissionEarned, rules, retailerBreakdown, history } = data || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Distributor Channel Commissions & Reports
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Real-time channel override revenue accrued from citizen applications lodged by your subordinate Kendra network.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle size={16} className="text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Hero Card */}
      <div className="bg-gradient-to-r from-emerald-700 to-teal-800 rounded-2xl p-6 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-200 block mb-1">
            Total Settled Override Commissions
          </span>
          <div className="text-3xl font-black">₹{Number(totalCommissionEarned || 0).toFixed(2)}</div>
          <p className="text-xs text-emerald-100 mt-1">
            Flows up the hierarchy automatically on every successful Kendra assisted submission
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 text-xs max-w-sm">
          <span className="font-bold block mb-1">✓ Multi-Tier Economy Protocol</span>
          Distributors earn passive volume commissions across all affiliated Kendra counters in their designated territory.
        </div>
      </div>

      {/* Retailer-by-Retailer Performance Breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h2 className="font-black text-sm text-slate-900">Network Kendra Performance & Override Accrual</h2>
          <p className="text-[11px] text-slate-500">Breakdown by subordinate Kendra operator</p>
        </div>

        {retailerBreakdown && retailerBreakdown.length > 0 ? (
          <div className="overflow-x-auto w-full scrollbar-thin">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 whitespace-nowrap">Kendra Counter</th>
                  <th className="py-3 px-4 whitespace-nowrap">Operator In-Charge</th>
                  <th className="py-3 px-4 whitespace-nowrap">Total Applications</th>
                  <th className="py-3 px-4 whitespace-nowrap">Application Turnover</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Estimated Override</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {retailerBreakdown.map((r: any) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900">{r.shopName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{r.registrationNo}</div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700 whitespace-nowrap">
                      {r.name}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                      {r.totalOrders} filings
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800 whitespace-nowrap">
                      ₹{Number(r.totalOrderVolume).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-emerald-700 whitespace-nowrap">
                      ₹{Number(r.estimatedOverride).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center text-slate-500 text-xs">
            No subordinate Kendra activity recorded yet.
          </div>
        )}
      </div>

      {/* Rules Schedule */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h2 className="font-black text-sm text-slate-900">Statutory Commission Hierarchy Rules</h2>
          <p className="text-[11px] text-slate-500">Per-application revenue distribution matrix</p>
        </div>

        {rules && rules.length > 0 ? (
          <div className="overflow-x-auto w-full scrollbar-thin">
            <table className="w-full min-w-[650px] text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 whitespace-nowrap">Service Name</th>
                  <th className="py-3 px-4 whitespace-nowrap">Citizen Statutory Fee</th>
                  <th className="py-3 px-4 whitespace-nowrap">Kendra Retailer Profit</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Distributor Override Cut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rules.map((rule: any) => (
                  <tr key={rule.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                      {rule.serviceName}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700 whitespace-nowrap">
                      ₹{Number(rule.serviceFee).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 font-bold text-blue-700 whitespace-nowrap">
                      +₹{Number(rule.retailerProfit).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-emerald-700 whitespace-nowrap">
                      +₹{Number(rule.distributorOverride).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-500 text-xs">
            Standard platform rate: ₹5.00 distributor override per assisted application.
          </div>
        )}
      </div>
    </div>
  );
}
