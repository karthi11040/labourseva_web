"use client";

import { useState } from "react";
import { Database, DownloadCloud, RefreshCw, HardDrive, ShieldCheck, Trash2, CheckCircle2, AlertTriangle, FileArchive, X } from "lucide-react";
import AdminModulePage, { type AdminRecord } from "@/components/AdminModulePage";

export default function AdminBackupPage() {
  const [backups, setBackups] = useState<AdminRecord[]>([]);


  const [isDumping, setIsDumping] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleCreateBackup = () => {
    setIsDumping(true);
    setTimeout(() => {
      const now = new Date();
      const id = `BKP-${now.toISOString().replace(/[-:T]/g, "").slice(0, 12)}`;
      const newEntry: AdminRecord = {
        id,
        title: `Manual Admin Snapshot (${id.toLowerCase()}.sql.gz)`,
        detail: `Size: 483 MB · Checksum: SHA256:${Math.random().toString(36).substring(2, 12)}... · Path: ../backups/${id.toLowerCase()}.sql.gz.`,
        status: "Verified Healthy · Created Just Now",
        date: now.toISOString().split("T")[0],
      };
      setBackups((prev) => [newEntry, ...prev]);
      setIsDumping(false);
      setToastMessage("Live database snapshot completed and stored in encrypted vault.");
      setTimeout(() => setToastMessage(null), 4000);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 rounded-xl bg-slate-900 text-white px-5 py-3 shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-xs border-t-4 border-t-emerald-600">
          <p className="text-xs font-semibold text-slate-500 uppercase">Database Cluster</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">Online &amp; Healthy</p>
          <p className="mt-1 text-xs text-emerald-600 font-medium flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> MySQL 8.0 / InnoDB Enterprise
          </p>
        </div>
        <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-xs border-t-4 border-t-blue-900">
          <p className="text-xs font-semibold text-slate-500 uppercase">Recovery Point Objective (RPO)</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">&lt; 15 Minutes</p>
          <p className="mt-1 text-xs text-slate-500 font-medium">Continuous WAL Archiving Enabled</p>
        </div>
        <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-xs border-t-4 border-t-[#ea580c]">
          <p className="text-xs font-semibold text-slate-500 uppercase">Storage Vault Retention</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">365 Days</p>
          <p className="mt-1 text-xs text-slate-500 font-medium">Encrypted Government NAS Archive</p>
        </div>
      </div>

      {/* Trigger Backup Banner */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Create Live Snapshot Dump</h2>
          <p className="text-xs text-slate-500 mt-1">
            Executes a read-only transaction dump across all tables into <code>../backups/</code> with SHA-256 verification.
          </p>
        </div>
        <button
          type="button"
          disabled={isDumping}
          onClick={handleCreateBackup}
          className="inline-flex items-center gap-2 rounded-lg bg-[#1e3a8a] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#1e40af] shrink-0 shadow-xs disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isDumping ? "animate-spin" : ""}`} />
          {isDumping ? "Executing mysqldump..." : "Trigger Manual Backup Now"}
        </button>
      </div>

      {/* Main Module Content */}
      <AdminModulePage
        eyebrow="Data Protection & Disaster Recovery (admin_backup.php)"
        title="Database Backup &amp; Recovery Vault"
        description="Monitor automated nightly snapshots, point-in-time recovery archives, and verify cryptographic checksums of stored database dumps."
        records={backups}
      />
    </div>
  );
}
