"use client";

import { DownloadCloud, FileSpreadsheet, FileText, Calendar, Filter } from "lucide-react";
import AdminModulePage, { AdminRecord } from "@/components/AdminModulePage";

export default function AdminReportsPage() {
  const records: AdminRecord[] = [];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Custom Export Generator</h2>
          <p className="text-xs text-slate-500 mt-1">Export transaction registries, scheme applications, or wallet audit trails for any custom date range.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">
            <Filter className="w-3.5 h-3.5" /> Filter Parameters
          </button>
          <button type="button" className="inline-flex items-center gap-2 rounded-lg bg-[#1e3a8a] px-4 py-2 text-xs font-bold text-white hover:bg-[#1e40af]">
            <DownloadCloud className="w-3.5 h-3.5" /> Download Full CSV
          </button>
        </div>
      </div>

      <AdminModulePage
        eyebrow="Financial Intelligence"
        title="Administrative Reports &amp; Exports"
        description="Audit reports, legislative disclosures, revenue summaries, and operational throughput archives available for departmental review."
        records={records}
      />
    </div>
  );
}
