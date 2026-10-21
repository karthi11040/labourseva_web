"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Search,
  Plus,
  Wallet,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  X,
  Store,
  Phone,
  Mail,
  Building,
  Loader2,
} from "lucide-react";

export default function DistributorRetailersPage() {
  const [retailers, setRetailers] = useState<any[]>([]);
  const [distributorBalance, setDistributorBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fund Modal state
  const [fundModal, setFundModal] = useState(false);
  const [selectedRetailer, setSelectedRetailer] = useState<any | null>(null);
  const [transferAmount, setTransferAmount] = useState("1000");
  const [transferNote, setTransferNote] = useState("");
  const [transferLoading, setTransferLoading] = useState(false);

  // Onboard Modal state
  const [onboardModal, setOnboardModal] = useState(false);
  const [newOpName, setNewOpName] = useState("");
  const [newShopName, setNewShopName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("Kendra@2026");
  const [newAddress, setNewAddress] = useState("");
  const [onboardLoading, setOnboardLoading] = useState(false);

  async function loadRetailers() {
    try {
      setLoading(true);
      const res = await fetch("/api/distributor/retailers");
      const json = await res.json();
      if (json.ok) {
        setRetailers(json.retailers || []);
        setDistributorBalance(json.distributorWalletBalance || 0);
      } else {
        setError(json.error || "Failed to load Kendra retailers");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRetailers();
  }, []);

  // Handle Fund Retailer Wallet
  async function handleTransferSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRetailer) return;

    setTransferLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/distributor/retailers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "fund_retailer",
          retailerId: selectedRetailer.id,
          amount: Number(transferAmount),
          note: transferNote,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error || "Fund transfer failed");
        return;
      }

      setSuccess(json.message);
      setDistributorBalance(json.newDistributorBalance);
      setFundModal(false);
      loadRetailers();
    } catch (err: any) {
      setError(err.message || "Failed to transfer funds");
    } finally {
      setTransferLoading(false);
    }
  }

  // Handle Onboard New Kendra
  async function handleOnboardSubmit(e: React.FormEvent) {
    e.preventDefault();
    setOnboardLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/distributor/retailers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "onboard_retailer",
          name: newOpName,
          shopName: newShopName,
          phone: newPhone,
          email: newEmail,
          password: newPassword,
          address: newAddress,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error || "Onboarding failed");
        return;
      }

      setSuccess(json.message);
      setOnboardModal(false);
      setNewOpName("");
      setNewShopName("");
      setNewPhone("");
      setNewEmail("");
      loadRetailers();
    } catch (err: any) {
      setError(err.message || "Failed to onboard retailer");
    } finally {
      setOnboardLoading(false);
    }
  }

  const filtered = retailers.filter((r) => {
    const term = searchTerm.toLowerCase();
    return (
      r.name?.toLowerCase().includes(term) ||
      r.shopName?.toLowerCase().includes(term) ||
      r.phone?.includes(term) ||
      r.registrationNo?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Kendra Network & Float Distribution
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage subordinate Kendra service counters and transfer prepaid operating balances in real-time.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setOnboardModal(true)}
            className="px-4 py-2.5 rounded-xl bg-[#0f172a] hover:bg-slate-800 text-white font-bold text-xs shadow-md flex items-center gap-2"
          >
            <Plus size={16} />
            <span>Onboard Kendra</span>
          </button>
        </div>
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

      {/* Distributor Float Summary Bar */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0f172a] text-white flex items-center justify-center font-bold">
            <Wallet size={20} />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              Available Distributor Float for Transfer
            </span>
            <span className="text-xl font-black text-slate-900">
              ₹{Number(distributorBalance || 0).toFixed(2)}
            </span>
          </div>
        </div>

        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search Kendra name, phone, or ID..."
            className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#ea580c] focus:outline-none bg-white"
          />
        </div>
      </div>

      {/* Retailers Table */}
      {loading ? (
        <div className="p-16 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#0f172a] mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-600">Loading Kendra network from database...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <p className="font-bold text-slate-700">No Kendra retailers found</p>
          <p className="text-xs text-slate-500 mt-1">
            Click &quot;Onboard Kendra&quot; above to register new operators under your territory.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto w-full scrollbar-thin">
            <table className="w-full min-w-[950px] text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4 whitespace-nowrap">Kendra ID</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Shop Particulars</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Contact</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Territory District</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Prepaid Wallet</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Applications</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap min-w-[140px]">Transfer Float</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((ret) => (
                  <tr key={ret.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {ret.registrationNo}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900">{ret.shopName}</div>
                      <div className="text-[11px] text-slate-500">In-Charge: {ret.name}</div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-800">{ret.phone}</div>
                      <div className="text-[11px] text-slate-500">{ret.email || "No email"}</div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700 whitespace-nowrap">
                      {ret.district}
                    </td>
                    <td className="py-3.5 px-4 font-black text-slate-900 whitespace-nowrap">
                      ₹{Number(ret.walletBalance).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-blue-700 whitespace-nowrap">
                      {ret.orderCount} Orders
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap min-w-[140px]">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRetailer(ret);
                          setFundModal(true);
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold text-xs shadow-sm inline-flex items-center gap-1.5 shrink-0"
                      >
                        <Wallet size={12} className="shrink-0" />
                        <span>Fund Wallet</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Fund Retailer Wallet Modal */}
      {fundModal && selectedRetailer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border-t-8 border-t-[#ea580c] relative">
            <button
              type="button"
              onClick={() => setFundModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X size={20} />
            </button>

            <h2 className="text-base font-black text-slate-900 mb-1">
              Fund Kendra Prepaid Wallet
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Transfer operating balance from your distributor float to{" "}
              <strong>{selectedRetailer.shopName}</strong>.
            </p>

            <form onSubmit={handleTransferSubmit} className="space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Target Kendra:</span>
                  <span className="font-bold text-slate-900">{selectedRetailer.shopName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Kendra ID:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedRetailer.registrationNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Current Kendra Balance:</span>
                  <span className="font-bold text-slate-900">₹{Number(selectedRetailer.walletBalance).toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200">
                  <span className="text-slate-500">Your Available Float:</span>
                  <span className="font-black text-blue-700">₹{Number(distributorBalance).toFixed(2)}</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Transfer Amount (₹)</label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {["500", "1000", "2000", "5000"].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setTransferAmount(amt)}
                      className={`py-2 rounded-lg border font-bold ${
                        transferAmount === amt
                          ? "bg-[#0f172a] text-white border-[#0f172a]"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min="100"
                  max={distributorBalance}
                  required
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm font-bold focus:ring-2 focus:ring-[#ea580c] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Remarks / Note (Optional)</label>
                <input
                  type="text"
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  placeholder="e.g. Weekly operating float allocation"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#ea580c] focus:outline-none"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="submit"
                  disabled={transferLoading || Number(transferAmount) > distributorBalance}
                  className="flex-1 py-3 px-4 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold text-xs shadow-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {transferLoading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Transferring Balance...</span>
                    </>
                  ) : (
                    <span>Confirm Transfer of ₹{Number(transferAmount || 0).toFixed(2)}</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setFundModal(false)}
                  className="py-3 px-4 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Onboard New Kendra Modal */}
      {onboardModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border-t-8 border-t-[#0f172a] relative">
            <button
              type="button"
              onClick={() => setOnboardModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X size={20} />
            </button>

            <h2 className="text-base font-black text-slate-900 mb-1">
              Onboard New Kendra Retailer
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Register an authorized Kendra service counter under your distribution territory.
            </p>

            <form onSubmit={handleOnboardSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kendra Shop Name *</label>
                  <input
                    type="text"
                    required
                    value={newShopName}
                    onChange={(e) => setNewShopName(e.target.value)}
                    placeholder="e.g. Murugan Common Service Centre"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#ea580c] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Operator In-Charge Name *</label>
                  <input
                    type="text"
                    required
                    value={newOpName}
                    onChange={(e) => setNewOpName(e.target.value)}
                    placeholder="e.g. S. Murugan"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#ea580c] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Contact Phone Number *</label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, ""))}
                    placeholder="10-digit mobile number"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#ea580c] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Operator Email</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="kendra@example.com"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#ea580c] focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Temporary Initial Password *</label>
                  <input
                    type="text"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#ea580c] focus:outline-none font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Shop Address</label>
                  <textarea
                    rows={2}
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    placeholder="Door No, Street Name, Village / City"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#ea580c] focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="submit"
                  disabled={onboardLoading}
                  className="flex-1 py-3 px-4 rounded-xl bg-[#0f172a] hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {onboardLoading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Registering Kendra...</span>
                    </>
                  ) : (
                    <span>Register Kendra Operator</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setOnboardModal(false)}
                  className="py-3 px-4 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
