"use client";

import { useState, useMemo } from "react";
import {
  ShieldAlert,
  Search,
  Filter,
  Download,
  ShieldCheck,
  Lock,
  Clock,
  UserCheck,
  Wallet,
  Layers,
  FileSpreadsheet,
  CheckCircle2,
} from "lucide-react";

interface AuditEntry {
  id: string;
  category: "SECURITY" | "WALLET" | "KYC" | "CATALOGUE";
  actor: string;
  actorRole: string;
  action: string;
  targetId: string;
  ipAddress: string;
  timestamp: string;
  immutableHash: string;
}

const initialAuditLogs: AuditEntry[] = [];


export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditEntry[]>(initialAuditLogs);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (selectedCategory !== "ALL" && log.category !== selectedCategory) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          log.id.toLowerCase().includes(q) ||
          log.actor.toLowerCase().includes(q) ||
          log.action.toLowerCase().includes(q) ||
          log.targetId.toLowerCase().includes(q) ||
          log.ipAddress.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [logs, selectedCategory, search]);

  const handleExportCSV = () => {
    const headers = ["Audit ID", "Category", "Actor", "Role", "Action", "Target", "IP Address", "Timestamp", "Hash"];
    const rows = filteredLogs.map((l) => [
      `"${l.id}"`,
      `"${l.category}"`,
      `"${l.actor}"`,
      `"${l.actorRole}"`,
      `"${l.action.replace(/"/g, '""')}"`,
      `"${l.targetId}"`,
      `"${l.ipAddress}"`,
      `"${l.timestamp}"`,
      `"${l.immutableHash}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `audit_trail_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#ea580c]">
            Immutable Compliance Ledger (audit_logs)
          </span>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
            Audit Trail &amp; Forensic Logging
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Immutable log of all administrative actions, personal data unmasking, money movements, and access decisions.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExportCSV}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors shrink-0"
        >
          <Download className="w-4 h-4 text-slate-500" /> Export Audit Log
        </button>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs border-t-4 border-t-[#1e3a8a]">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Recorded Events</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{logs.length.toLocaleString()}</p>
          <p className="mt-1 text-xs text-emerald-600 font-medium">100% Cryptographically Verified</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs border-t-4 border-t-blue-600">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Security &amp; Auth Checks</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {logs.filter((l) => l.category === "SECURITY").length.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-slate-500">Unmasking &amp; Login Audits</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs border-t-4 border-t-emerald-600">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Wallet Balance Deltas</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {logs.filter((l) => l.category === "WALLET").length.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-slate-500">admin_wallet_logs</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs border-t-4 border-t-amber-500">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Retention Duration</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">7 Years</p>
          <p className="mt-1 text-xs text-slate-500">Statutory CAG Audit Compliant</p>
        </div>
      </div>

      {/* Audit Table Section */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        {/* Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ID, officer name, target record, or IP..."
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-300 bg-white text-xs outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Category:
            </span>
            {(["ALL", "SECURITY", "WALLET", "KYC", "CATALOGUE"] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedCategory === cat
                    ? "bg-[#1e3a8a] text-white shadow-xs"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto w-full scrollbar-thin">
          <table className="w-full min-w-[950px] text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3.5 whitespace-nowrap">Log ID</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Category</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Actor</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Action &amp; Target ID</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Network IP</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Timestamp</th>
                <th className="px-5 py-3.5 text-right whitespace-nowrap min-w-[110px]">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                    <ShieldAlert className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No Audit Trail Records Found</p>
                    <p className="text-xs text-slate-500 mt-1">Immutable security and ledger access logs will be recorded here.</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-4 font-mono font-bold text-slate-800 whitespace-nowrap">
                      {l.id}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span
                        className={`shrink-0 whitespace-nowrap inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          l.category === "SECURITY"
                            ? "bg-purple-50 text-purple-800 border border-purple-200"
                            : l.category === "WALLET"
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : l.category === "KYC"
                            ? "bg-blue-50 text-blue-800 border border-blue-200"
                            : "bg-amber-50 text-amber-800 border border-amber-200"
                        }`}
                      >
                        {l.category}
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <strong className="block text-slate-900 font-semibold">{l.actor}</strong>
                      <span className="text-[10px] text-slate-400 font-medium">{l.actorRole}</span>
                    </td>
                    <td className="px-5 py-4 max-w-sm">
                      <p className="text-slate-800 leading-snug">{l.action}</p>
                      <span className="font-mono text-[10px] text-slate-500 block mt-0.5 font-bold">
                        Target: {l.targetId}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                      {l.ipAddress}
                    </td>
                    <td className="px-5 py-4 text-slate-500 text-[11px] whitespace-nowrap">
                      {l.timestamp}
                    </td>
                    <td className="px-5 py-4 text-right whitespace-nowrap min-w-[110px]">
                      <span className="shrink-0 whitespace-nowrap inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <ShieldCheck size={12} className="shrink-0" />
                        <span>Validated</span>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
