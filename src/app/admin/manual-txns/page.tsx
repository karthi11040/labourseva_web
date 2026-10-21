"use client";

import { useState } from "react";
import AdminModulePage, { AdminRecord } from "@/components/AdminModulePage";
import { PlusCircle } from "lucide-react";

export default function AdminManualTxnsPage() {
  const records: AdminRecord[] = [];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-blue-900 uppercase">Emergency Ledger Tool</span>
          <p className="text-sm font-semibold text-blue-950 mt-1">Post Manual Credit or Debit Adjustments</p>
          <p className="text-xs text-blue-700 mt-0.5">All manual entries are signed by the administrator and permanently recorded in the immutable audit trail.</p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg bg-[#1e3a8a] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#1e40af] shrink-0"
        >
          <PlusCircle className="w-4 h-4" /> Create Adjustment Entry
        </button>
      </div>

      <AdminModulePage
        eyebrow="Special Accounting Entries"
        title="Manual Transactions Ledger"
        description="Record verified manual bank transfers, treasury receipts, dispute reversals, and compensatory float additions."
        records={records}
      />
    </div>
  );
}
