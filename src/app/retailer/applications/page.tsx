"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ClipboardList,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Download,
  Printer,
  X,
  Eye,
  Loader2,
  FileText,
} from "lucide-react";

export default function RetailerApplicationsPage() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedApp, setSelectedApp] = useState<any | null>(null);

  useEffect(() => {
    async function loadApplications() {
      try {
        setLoading(true);
        const res = await fetch("/api/retailer/applications");
        const json = await res.json();
        if (json.ok) {
          setApplications(json.applications || []);
        } else {
          setError(json.error || "Failed to load applications");
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadApplications();
  }, []);

  const getStatusMeta = (statusRaw: string | undefined | null) => {
    const s = String(statusRaw || "pending").toLowerCase();
    if (["approved", "accepted", "completed", "issued"].includes(s)) {
      let label = "Approved";
      if (s === "accepted") label = "Approved (Accepted)";
      else if (s === "issued") label = "Certificate Issued";
      else if (s === "completed") label = "Completed";
      return {
        badgeClass: "bg-emerald-100 text-emerald-800",
        isApproved: true,
        isRejected: false,
        label,
        textColor: "text-emerald-700",
      };
    }
    if (["rejected", "returned", "cancelled"].includes(s)) {
      let label = "Rejected";
      if (s === "returned") label = "Returned for Clarification";
      else if (s === "cancelled") label = "Cancelled";
      return {
        badgeClass: "bg-rose-100 text-rose-800",
        isApproved: false,
        isRejected: true,
        label,
        textColor: "text-rose-700",
      };
    }
    return {
      badgeClass: "bg-amber-100 text-amber-800",
      isApproved: false,
      isRejected: false,
      label: "Pending Scrutiny",
      textColor: "text-amber-700",
    };
  };

  const filtered = applications.filter((app) => {
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch = !term || Boolean(
      (app.appRef && String(app.appRef).toLowerCase().includes(term)) ||
      (app.applicantName && String(app.applicantName).toLowerCase().includes(term)) ||
      (app.applicantPhone && String(app.applicantPhone).toLowerCase().includes(term)) ||
      (app.serviceName && String(app.serviceName).toLowerCase().includes(term))
    );

    const normStatus = String(app.status || "pending").toLowerCase();
    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "PENDING" && (normStatus === "pending" || !app.status)) ||
      (statusFilter === "APPROVED" && (["approved", "accepted", "completed", "issued"].includes(normStatus))) ||
      (statusFilter === "REJECTED" && (["rejected", "returned", "cancelled"].includes(normStatus)));

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 font-sans antialiased">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4 print:hidden">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            Kendra Assisted Applications & Orders
          </h1>
          <p className="text-sm text-slate-500 mt-1 leading-relaxed">
            Monitor scrutiny statuses, reprint citizen receipts, and download signed welfare certificates.
          </p>
        </div>

        <Link
          href="/retailer/apply"
          className="min-h-10 px-4 rounded-lg bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 flex items-center justify-center gap-2 whitespace-nowrap self-start sm:self-auto"
        >
          <span>Lodge New Application</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row items-center gap-3 print:hidden">
        <div className="relative flex-1 w-full">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Applicant Name, Phone, or Application Ref..."
            className="w-full h-10 pl-10 pr-4 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-4 focus:ring-slate-100 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter size={16} className="text-slate-400 flex-shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:border-slate-900 focus:ring-4 focus:ring-slate-100 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Under Scrutiny (Pending)</option>
            <option value="APPROVED">Approved / Issued</option>
            <option value="REJECTED">Clarification Needed / Rejected</option>
          </select>
        </div>
      </div>

      {/* Content Table */}
      {loading ? (
        <div className="p-16 text-center print:hidden">
          <Loader2 className="w-8 h-8 animate-spin text-[#1e3a8a] mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-600">Retrieving assisted applications from database...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center print:hidden">
          <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <p className="font-bold text-slate-700">No applications matching criteria</p>
          <p className="text-xs text-slate-500 mt-1">
            {searchTerm || statusFilter !== "ALL"
              ? "Try adjusting your search filters."
              : "No assisted applications lodged yet."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden print:hidden">
          <div className="overflow-x-auto w-full scrollbar-thin">
            <table className="w-full min-w-[980px] text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4 whitespace-nowrap">Application Ref</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Citizen Applicant</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Service Scheme</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Fee Deducted</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Scrutiny Status</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Submission Date</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap min-w-[120px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((app) => {
                  const meta = getStatusMeta(app.status);
                  return (
                    <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {app.appRef}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900">{app.applicantName}</div>
                        <div className="text-[11px] text-slate-500">{app.applicantPhone}</div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800 whitespace-nowrap max-w-[220px]">
                        <span className="truncate block" title={app.serviceName}>{app.serviceName}</span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                        ₹{Number(app.amount).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`shrink-0 whitespace-nowrap inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${meta.badgeClass}`}
                        >
                          {meta.isApproved ? (
                            <CheckCircle2 size={10} className="shrink-0" />
                          ) : meta.isRejected ? (
                            <AlertCircle size={10} className="shrink-0" />
                          ) : (
                            <Clock size={10} className="shrink-0" />
                          )}
                          <span>{meta.label}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        {app.createdAt ? new Date(app.createdAt).toLocaleDateString("en-IN") : "-"}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap min-w-[120px]">
                        <button
                          type="button"
                          onClick={() => setSelectedApp(app)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold shrink-0"
                        >
                          <Eye size={12} />
                          <span>Details</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Details & Print Receipt Modal */}
      {selectedApp && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:static print:inset-auto print:p-0 print:bg-white print:backdrop-none print:block">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative print:max-w-none print:w-full print:p-8 print:shadow-none print:rounded-none print:border-none">
            {/* Print Official Government Header */}
            <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-6 text-center">
              <div className="text-xs font-bold uppercase tracking-widest text-slate-700">
                Government of Tamil Nadu • Labour & Employment Department
              </div>
              <div className="text-lg font-black text-slate-900 mt-1">
                LabourSeva Kendra Official Acknowledgment Receipt
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Assisted Citizen Welfare Application & Scrutiny Docket
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedApp(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 print:hidden"
            >
              <X size={20} />
            </button>

            <h2 className="text-base font-black text-slate-900 mb-1">
              Application Particulars
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Reference: <strong className="font-mono text-slate-900">{selectedApp.appRef}</strong>
            </p>

            <div className="space-y-2.5 text-xs border-y border-slate-100 py-4 mb-4 print:border-slate-300 print:space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-500 print:text-slate-700">Receipt / Transaction No:</span>
                <span className="font-mono font-bold text-slate-900">{selectedApp.receiptNo || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 print:text-slate-700">Citizen Beneficiary:</span>
                <span className="font-bold text-slate-900">{selectedApp.applicantName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 print:text-slate-700">Contact Number:</span>
                <span className="font-bold text-slate-900">{selectedApp.applicantPhone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 print:text-slate-700">Applied Scheme:</span>
                <span className="font-bold text-slate-900">{selectedApp.serviceName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 print:text-slate-700">Fee Deducted from Wallet:</span>
                <span className="font-black text-slate-900">₹{Number(selectedApp.amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 print:text-slate-700">Scrutiny Status:</span>
                <span className={`font-bold capitalize ${getStatusMeta(selectedApp.status).textColor} print:text-slate-900`}>
                  {getStatusMeta(selectedApp.status).label}
                </span>
              </div>
              {selectedApp.adminRemark && (
                <div className="p-2.5 rounded-lg bg-amber-50 text-amber-900 text-[11px] border border-amber-200 mt-2 print:bg-slate-50 print:border-slate-300 print:text-slate-900">
                  <strong>Officer Remark:</strong> {selectedApp.adminRemark}
                </div>
              )}
            </div>

            {/* Print Official Footer */}
            <div className="hidden print:block mt-8 pt-4 border-t border-slate-300 text-[10px] text-slate-600">
              <div className="flex justify-between items-center">
                <span>Generated electronically via LabourSeva Portal • Valid without physical signature</span>
                <span>Date: {new Date().toLocaleDateString("en-IN")}</span>
              </div>
            </div>

            <div className="flex gap-2 print:hidden">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2 px-3 rounded-xl bg-[#1e3a8a] text-white font-bold text-xs hover:bg-[#1e40af] flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Printer size={14} />
                <span>Print Kendra Receipt</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                className="py-2 px-4 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
