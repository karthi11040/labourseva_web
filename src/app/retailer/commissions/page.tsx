"use client";

import { useEffect, useState } from "react";
import {
  Percent,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  FileText,
  Loader2,
  Shield,
  HelpCircle,
} from "lucide-react";

export default function RetailerCommissionsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCommissions() {
      try {
        setLoading(true);
        const res = await fetch("/api/retailer/commissions");
        const json = await res.json();
        if (json.ok) {
          setData(json);
        } else {
          setError(json.error || "Failed to load commission data");
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
        <Loader2 className="w-8 h-8 animate-spin text-[#1e3a8a] mx-auto mb-3" />
        <p className="text-xs font-bold text-slate-600">Loading Commission Rules & Earnings...</p>
      </div>
    );
  }

  const { totalEarned, rules, history } = data || {};

  return (
    <div className="space-y-6 font-sans antialiased">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-xl font-black text-slate-900 tracking-tight">
          Kendra Commission Profit Matrix
        </h1>
        <p className="text-sm leading-relaxed text-slate-500 mt-1">
          Rule-based commission schedule for each assisted welfare filing. Profits are credited directly to your Kendra wallet.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle size={16} className="text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Top Hero Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
            Lifetime Commission Earnings
          </span>
          <div className="text-2xl font-black tabular-nums text-slate-900">₹{Number(totalEarned || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <p className="text-sm text-slate-500 mt-1">
            Automatically reconciled upon successful application submission
          </p>
        </div>

        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 text-sm text-slate-600 max-w-sm">
          <span className="font-bold block mb-1 text-slate-900"><CheckCircle2 size={14} className="inline mr-1.5 text-emerald-600" />Instant settlement</span>
          Retailer profits are credited to your wallet when an application is submitted.
        </div>
      </div>

      {/* Active Rules Matrix Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-black text-sm text-slate-900">Active Commission Rates by Service</h2>
            <p className="text-[11px] text-slate-500">Configured in state administration table</p>
          </div>
        </div>

        {rules && rules.length > 0 ? (
          <div className="overflow-x-auto w-full scrollbar-thin">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 whitespace-nowrap">Service Scheme</th>
                  <th className="py-3 px-4 whitespace-nowrap">Citizen Service Fee</th>
                  <th className="py-3 px-4 whitespace-nowrap">Model</th>
                  <th className="py-3 px-4 whitespace-nowrap">Kendra Profit</th>
                  <th className="py-3 px-4 whitespace-nowrap">Territory Distributor Share</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rules.map((r: any) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                      {r.serviceName}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700 whitespace-nowrap">
                      ₹{Number(r.serviceFee || 50).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 uppercase text-[10px] font-bold text-slate-500 whitespace-nowrap">
                      {r.commissionModel || "Fixed"}
                    </td>
                    <td className="py-3 px-4 font-black text-emerald-700 whitespace-nowrap">
                      +₹{Number(r.retailerProfit || 10).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      ₹{Number(r.distributorValue || 5).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <span className="shrink-0 whitespace-nowrap inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Active Rule
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-500 text-xs">
            Default platform rate: ₹10.00 profit per assisted application.
          </div>
        )}
      </div>

      {/* Historical Commission Credits */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h2 className="font-black text-sm text-slate-900">Commission Settlement History</h2>
          <p className="text-[11px] text-slate-500">Live ledger entries for retailer profit credits</p>
        </div>

        {history && history.length > 0 ? (
          <div className="overflow-x-auto w-full scrollbar-thin">
            <table className="w-full min-w-[650px] text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 whitespace-nowrap">Settlement ID</th>
                  <th className="py-3 px-4 whitespace-nowrap">Profit Credited</th>
                  <th className="py-3 px-4 whitespace-nowrap">Description</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((h: any) => (
                  <tr key={h.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                      COM-{h.id}
                    </td>
                    <td className="py-3 px-4 font-black text-emerald-700 whitespace-nowrap">
                      +₹{Number(h.amount).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      <span className="truncate block max-w-sm" title={h.description}>{h.description}</span>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500 whitespace-nowrap">
                      {h.createdAt ? new Date(h.createdAt).toLocaleDateString("en-IN") : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center text-slate-500">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-700 text-xs">No commission settlements logged yet</p>
            <p className="text-[11px] mt-1">Earnings will accumulate as you assist citizens with applications.</p>
          </div>
        )}
      </div>
    </div>
  );
}
