import React from "react";
import { Store, CheckCircle2, Clock } from "lucide-react";

export interface ProfileHeaderProps {
  shopName?: string;
  status?: string;
  registrationNo?: string;
  distributorName?: string;
  completedCount: number;
  totalRequired: number;
  progressPct: number;
}

export function ProfileHeader({
  shopName,
  status = "Approved",
  registrationNo,
  distributorName,
  completedCount,
  totalRequired,
  progressPct,
}: ProfileHeaderProps) {
  const statusLower = String(status).toLowerCase();
  const isApproved = statusLower === "approved";
  const isPending = statusLower === "pending";

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <div className="px-6 sm:px-8 py-6 flex flex-col sm:flex-row sm:items-center gap-5">
        <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 text-white flex items-center justify-center shrink-0 shadow-sm">
          <Store size={26} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {shopName || "Kendra Profile"}
            </h1>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                isApproved
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : isPending
                  ? "bg-amber-50 border-amber-200 text-amber-700"
                  : "bg-slate-50 border-slate-200 text-slate-600"
              }`}
            >
              {isApproved ? <CheckCircle2 size={11} /> : <Clock size={11} />}
              {status}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Authorized Kendra verification status and commercial operator particulars.
          </p>
          {/* Progress Bar */}
          <div className="mt-3 flex items-center gap-2.5">
            <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden max-w-[200px]">
              <div
                className="h-full bg-[#ea580c] transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-[11px] font-medium text-slate-500 tabular-nums">
              {completedCount}/{totalRequired} required
            </span>
          </div>
        </div>

        {/* Right column metadata */}
        <div className="sm:text-right shrink-0 space-y-1">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
              Registration No
            </div>
            <div className="text-sm font-mono font-bold text-slate-900">
              {registrationNo || "—"}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
              Affiliated Distributor
            </div>
            <div className="text-sm font-semibold text-slate-700">
              {distributorName || "—"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
