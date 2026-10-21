"use client";

import { BarChart3, TrendingUp, Users, Wallet, ArrowUpRight } from "lucide-react";

export default function AdminAnalyticsPage() {
  const stats = [
    { label: "Total Registrations", value: "0", change: "Awaiting live sync", positive: true },
    { label: "Daily Applications", value: "0", change: "Today's intake", positive: true },
    { label: "Service Fulfillment Rate", value: "0%", change: "SLA adherence", positive: true },
    { label: "Monthly Gross Revenue", value: "₹0.00", change: "Settlement total", positive: true },
  ];

  const districtDistribution: { district: string; count: number; share: string }[] = [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wide text-[#ea580c]">Executive Intelligence</span>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">Platform Analytics</h1>
          <p className="mt-1 text-sm text-slate-600">
            Real-time telemetry and operational throughput across Tamil Nadu Labour Welfare initiatives.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live Telemetry
          </span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs border-t-4 border-t-[#1e3a8a]">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{s.label}</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{s.value}</p>
            <p className="mt-1 flex items-center text-xs font-medium text-slate-500">
              <TrendingUp className="w-3.5 h-3.5 mr-1" /> {s.change}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
          <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#1e3a8a]" /> District Volume Share
          </h2>
          {districtDistribution.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              <BarChart3 className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-600">No district volume data recorded</p>
              <p className="mt-0.5">District distribution will calculate as citizen applications are filed.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {districtDistribution.map((d) => (
                <div key={d.district}>
                  <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                    <span>{d.district}</span>
                    <span className="font-bold text-slate-900">{d.count.toLocaleString()} ({d.share})</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className="bg-[#1e3a8a] h-2 rounded-full"
                      style={{ width: d.share }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
          <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-[#1e3a8a]" /> User Role Breakdown
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-blue-50/60 border border-blue-100">
              <span className="text-xs text-blue-700 font-semibold">Registered Workers</span>
              <p className="text-xl font-bold text-blue-950 mt-1">0</p>
              <span className="text-[11px] text-blue-600">Active userbase</span>
            </div>
            <div className="p-4 rounded-lg bg-amber-50/60 border border-amber-100">
              <span className="text-xs text-amber-700 font-semibold">Active Retailers</span>
              <p className="text-xl font-bold text-amber-950 mt-1">0</p>
              <span className="text-[11px] text-amber-600">CSC / e-Seva operators</span>
            </div>
            <div className="p-4 rounded-lg bg-purple-50/60 border border-purple-100">
              <span className="text-xs text-purple-700 font-semibold">Distributor Hubs</span>
              <p className="text-xl font-bold text-purple-950 mt-1">0</p>
              <span className="text-[11px] text-purple-600">Zonal distribution partners</span>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-xs text-slate-600 font-semibold">Guest Users</span>
              <p className="text-xl font-bold text-slate-900 mt-1">0</p>
              <span className="text-[11px] text-slate-500">Walk-in citizen requests</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
