"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  ShieldCheck,
  Percent,
  Share2,
  AlertCircle,
  Loader2,
  Save,
} from "lucide-react";

export default function DistributorProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Editable fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        const res = await fetch("/api/distributor/profile");
        const json = await res.json();
        if (json.ok && json.profile) {
          const p = json.profile;
          setProfile(p);
          setName(p.name || "");
          setPhone(p.phone || "");
          setAddress(p.address || "");
        } else {
          setError(json.error || "Failed to load distributor profile");
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSuccess(null);
    setError(null);

    try {
      const res = await fetch("/api/distributor/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, address }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error || "Failed to update profile");
        return;
      }
      setSuccess("Distributor territory particulars updated successfully");
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
        <p className="text-xs font-bold text-slate-600">Loading Distributor Profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Territory Distributor Profile & Channel Credentials
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Authorized territory franchise details, partner referral codes, and contact particulars.
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

      {/* Main Profile Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm border-t-4 border-t-[#0f172a] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-[#0f172a] flex items-center justify-center font-bold">
            <Building2 size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-900">{profile?.name}</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                <CheckCircle2 size={10} />
                <span>{profile?.verificationStatus || "Approved"}</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Registration No: <strong className="font-mono text-slate-900">{profile?.registrationNo}</strong>
            </p>
          </div>
        </div>

        <div className="text-right text-xs">
          <span className="text-slate-400 block uppercase font-bold text-[10px]">Partner Referral Code</span>
          <span className="font-mono font-black text-blue-700 bg-blue-50 px-2.5 py-1 rounded border border-blue-200 inline-block mt-1">
            {profile?.referralCode}
          </span>
        </div>
      </div>

      {/* Profile Form */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 mb-4 pb-2 border-b border-slate-100">
          Commercial Particulars & Territory Office
        </h3>

        <form onSubmit={handleUpdate} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Distributor Entity / Legal Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#ea580c] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Contact Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#ea580c] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Primary Login Email</label>
              <input
                type="email"
                disabled
                value={profile?.email || ""}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 text-xs cursor-not-allowed"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Email is locked to primary registration.</span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Commission Rate Override</label>
              <input
                type="text"
                disabled
                value={`${profile?.commissionPercentage || 5}% Platform Override`}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-bold text-xs cursor-not-allowed"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">Territory Hub / Office Address</label>
              <textarea
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
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
                  <span>Saving Updates...</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>Save Particulars</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
