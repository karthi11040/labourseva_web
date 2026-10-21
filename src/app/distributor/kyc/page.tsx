"use client";

import { useEffect, useState } from "react";
import {
  FileCheck2,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Building2,
  Loader2,
  Save,
} from "lucide-react";

export default function DistributorKycPage() {
  const [kyc, setKyc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [panNo, setPanNo] = useState("");
  const [aadhaarNo, setAadhaarNo] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    async function loadKyc() {
      try {
        setLoading(true);
        const res = await fetch("/api/distributor/kyc");
        const json = await res.json();
        if (json.ok && json.kyc) {
          const k = json.kyc;
          setKyc(k);
          setPanNo(k.panNo || "");
          setAadhaarNo(k.aadhaarNo || "");
          setAddress(k.address || "");
        } else {
          setError(json.error || "Failed to load KYC particulars");
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadKyc();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSuccess(null);
    setError(null);

    try {
      const res = await fetch("/api/distributor/kyc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ panNo, aadhaarNo, address }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error || "Failed to update KYC");
        return;
      }
      setSuccess(json.message || "KYC updated successfully");
    } catch (err: any) {
      setError(err.message || "Network error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-16 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0f172a] mx-auto mb-3" />
        <p className="text-xs font-bold text-slate-600">Verifying Enterprise KYC Records...</p>
      </div>
    );
  }

  const isApproved = kyc?.verificationStatus === "Approved";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Mandatory Enterprise KYC Verification
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Statutory compliance requirements per DPDP Act 2023 and Government of Tamil Nadu welfare distribution framework.
        </p>
      </div>

      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle size={16} className="text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KYC Status Verification Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm border-t-4 border-t-emerald-600 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <ShieldCheck size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-900">{kyc?.name}</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                <CheckCircle2 size={10} />
                <span>{kyc?.verificationStatus || "Approved"}</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Distributor Registration: <strong className="font-mono text-slate-900">{kyc?.registrationNo}</strong>
            </p>
          </div>
        </div>

        <div className="text-right text-xs">
          <span className="text-slate-400 block uppercase font-bold text-[10px]">Verification Tier</span>
          <span className="font-bold text-slate-800">Tier-1 Territory Partner</span>
        </div>
      </div>

      {/* Statutory Form */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 mb-4 pb-2 border-b border-slate-100">
          Statutory Business Credentials
        </h3>

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Permanent Account Number (PAN) *</label>
              <input
                type="text"
                required
                value={panNo}
                onChange={(e) => setPanNo(e.target.value.toUpperCase())}
                placeholder="e.g. ABCDE1234F"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-bold focus:ring-2 focus:ring-[#ea580c] focus:outline-none uppercase"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Aadhaar Card Reference *</label>
              <input
                type="text"
                required
                value={aadhaarNo}
                onChange={(e) => setAadhaarNo(e.target.value)}
                placeholder="XXXX-XXXX-1234"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-bold focus:ring-2 focus:ring-[#ea580c] focus:outline-none"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Stored with AES-256 GCM encryption.</span>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">Registered Business Territory Address *</label>
              <textarea
                rows={3}
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enterprise Head Office Address, District, PIN Code"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#ea580c] focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="py-2.5 px-6 rounded-xl bg-[#0f172a] hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Updating Dossier...</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>Update KYC Dossier</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
