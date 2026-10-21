"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Search, ShieldAlert, XCircle } from "lucide-react";

type ApprovalStatus = "Awaiting review" | "Approved" | "Returned";

type Approval = {
  id: string;
  title: string;
  subject: string;
  type: "Access" | "Service" | "Partner";
  submitted: string;
  risk: "High" | "Standard";
  status: ApprovalStatus;
};

const initialApprovals: Approval[] = [];


export default function AdminApprovalsPage() {
  const [approvals, setApprovals] = useState(initialApprovals);
  const [filter, setFilter] = useState<ApprovalStatus | "All">("Awaiting review");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  const displayed = useMemo(() => approvals.filter((approval) => {
    const matchesFilter = filter === "All" || approval.status === filter;
    const query = search.toLowerCase();
    return matchesFilter && (!query || `${approval.id} ${approval.title} ${approval.subject}`.toLowerCase().includes(query));
  }), [approvals, filter, search]);

  function decide(id: string, status: "Approved" | "Returned") {
    setApprovals((current) => current.map((approval) => approval.id === id ? { ...approval, status } : approval));
    setMessage(status === "Approved" ? `${id} was approved and queued for audit logging.` : `${id} was returned for correction.`);
  }

  return (
    <div className="space-y-6">
      <div>
        <span className="text-xs font-bold uppercase tracking-wide text-[#ea580c]">Governance</span>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">Approval queue</h1>
        <p className="mt-2 text-sm text-slate-600">Review sensitive access, service, and partner decisions. High-risk items need evidence before approval.</p>
      </div>

      {message && <p role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{message}</p>}

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2" aria-label="Approval status filter">
            {(["Awaiting review", "Approved", "Returned", "All"] as const).map((item) => (
              <button key={item} type="button" onClick={() => setFilter(item)} className={`min-h-11 rounded-md px-3 text-xs font-bold ${filter === item ? "bg-[#1e3a8a] text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{item}</button>
            ))}
          </div>
          <label className="flex min-h-11 items-center gap-2 rounded-md border border-slate-300 px-3 sm:w-72"><Search size={16} className="text-slate-400" /><span className="sr-only">Search approval queue</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search an approval" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400" /></label>
        </div>

        <div className="overflow-x-auto w-full scrollbar-thin">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-600">
              <tr>
                <th className="px-5 py-3 font-semibold min-w-[240px]">Request</th>
                <th className="px-5 py-3 font-semibold whitespace-nowrap">Type</th>
                <th className="px-5 py-3 font-semibold whitespace-nowrap">Submitted</th>
                <th className="px-5 py-3 font-semibold whitespace-nowrap">Risk</th>
                <th className="px-5 py-3 font-semibold whitespace-nowrap">Status</th>
                <th className="px-5 py-3 text-right font-semibold whitespace-nowrap min-w-[170px]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayed.map((approval) => (
                <tr key={approval.id} className="hover:bg-slate-50/70">
                  <td className="px-5 py-4">
                    <span className="font-mono text-xs text-slate-400">{approval.id}</span>
                    <strong className="mt-1 block text-sm text-slate-900">{approval.title}</strong>
                    <span className="text-xs text-slate-500">{approval.subject}</span>
                  </td>
                  <td className="px-5 py-4 text-slate-600 whitespace-nowrap">{approval.type}</td>
                  <td className="px-5 py-4 text-slate-600 whitespace-nowrap">{approval.submitted}</td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className={`shrink-0 whitespace-nowrap inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${approval.risk === "High" ? "bg-red-50 text-red-700 border border-red-200" : "bg-slate-100 text-slate-700"}`}>
                      {approval.risk}
                    </span>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className={`shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 text-xs font-bold ${approval.status === "Approved" ? "text-emerald-700" : approval.status === "Returned" ? "text-red-700" : "text-amber-700"}`}>
                      {approval.status === "Approved" ? <CheckCircle2 size={14} className="shrink-0" /> : approval.status === "Returned" ? <XCircle size={14} className="shrink-0" /> : <ShieldAlert size={14} className="shrink-0" />}
                      {approval.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right whitespace-nowrap min-w-[170px]">
                    {approval.status === "Awaiting review" ? (
                      <div className="flex justify-end gap-2 flex-nowrap">
                        <button type="button" onClick={() => decide(approval.id, "Returned")} className="min-h-9 rounded-md border border-red-200 px-3 text-xs font-bold text-red-700 hover:bg-red-50 shrink-0 whitespace-nowrap">Return</button>
                        <button type="button" onClick={() => decide(approval.id, "Approved")} className="min-h-9 rounded-md bg-[#1e3a8a] px-3 text-xs font-bold text-white hover:bg-[#1e40af] shrink-0 whitespace-nowrap">Approve</button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Decision recorded</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {displayed.length === 0 && <p className="p-10 text-center text-sm text-slate-500">No approvals match the selected filter.</p>}
      </section>
    </div>
  );
}
