"use client";

import { useState } from "react";
import { Wallet, PlusCircle, ShieldCheck, X } from "lucide-react";
import AdminModulePage, { type AdminRecord } from "@/components/AdminModulePage";
import { useLanguage } from "@/components/LanguageProvider";

export default function FeeAndWalletHubPage() {
  const { isTamil } = useLanguage();
  const [topUpModalOpen, setTopUpModalOpen] = useState(false);
  const [selectedDistributor, setSelectedDistributor] = useState("DIST-501");
  const [amount, setAmount] = useState("");
  const [remarks, setRemarks] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const distributors: { id: string; name: string }[] = [];

  const handleTopUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;
    setToastMessage(
      isTamil
        ? `₹${Number(amount).toLocaleString()} விநியோகஸ்தர் ${selectedDistributor}-க்கு வெற்றிகரமாக வரவு வைக்கப்பட்டது.`
        : `Successfully credited ₹${Number(amount).toLocaleString()} to distributor ${selectedDistributor}.`
    );
    setTopUpModalOpen(false);
    setAmount("");
    setRemarks("");
    setTimeout(() => setToastMessage(null), 4000);
  };

  const records: AdminRecord[] = [];

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 rounded-xl bg-slate-900 text-white px-5 py-3 shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-top-4 duration-200">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-xs border-t-4 border-t-blue-900">
          <p className="text-xs font-semibold text-slate-500 uppercase">
            {isTamil ? "நெட்வொர்க்கில் உள்ள மொத்த மிதவை" : "Total Float In Network"}
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">₹0.00</p>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            {isTamil ? "0 மண்டல விநியோக மையங்களில்" : "Across 0 Zonal Distribution Hubs"}
          </p>
        </div>
        <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-xs border-t-4 border-t-emerald-600">
          <p className="text-xs font-semibold text-slate-500 uppercase">
            {isTamil ? "வழங்கப்பட்ட கமிஷன்கள் (MTD)" : "Commissions Paid (MTD)"}
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">₹0.00</p>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            {isTamil ? "செயலில் உள்ள முனையங்களுக்கு வழங்கப்பட்டது" : "Disbursed to active nodes"}
          </p>
        </div>
        <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-xs border-t-4 border-t-[#ea580c]">
          <p className="text-xs font-semibold text-slate-500 uppercase">
            {isTamil ? "நிலுவையில் உள்ள தீர்வு கோரிக்கைகள்" : "Pending Settlement Claims"}
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">₹0.00</p>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            {isTamil ? "0 விநியோகஸ்தர் செலுத்துதல் கோரிக்கைகள்" : "0 distributor payout requests"}
          </p>
        </div>
      </div>

      {/* Top Up Banner Action */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            {isTamil ? "விநியோகஸ்தர் மிதவை உட்செலுத்துதல்" : "Distributor Float Injection"}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {isTamil
              ? "வங்கி ஆர்டிஜிஎஸ்/என்இஎப்டி சான்று சரிபார்ப்பைத் தொடர்ந்து மண்டல விநியோகஸ்தர் பணப்பையில் நேரடியாக தொகையை வரவு வைக்கவும்."
              : "Deposit liquidity directly into a zonal distributor wallet following bank RTGS/NEFT proof verification."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setTopUpModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-[#1e3a8a] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#1e40af] shrink-0 shadow-xs cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" /> {isTamil ? "விநியோகஸ்தர் இருப்பைச் சேர்க்க" : "Add Distributor Balance"}
        </button>
      </div>

      {/* Main Module Content */}
      <AdminModulePage
        eyebrow={isTamil ? "சேனல் பணப்புழக்கம் & அமைப்புகள் (slide.php)" : "Channel Liquidity & Settings (slide.php)"}
        title={isTamil ? "விநியோகஸ்தர் மையம் & பணப்பை லெட்ஜர்" : "Distributor Hub & Wallet Ledger"}
        description={
          isTamil
            ? "விநியோகஸ்தர் பதிவு கட்டண அமைப்புகளை உள்ளமைக்கவும், பணப்புழக்க இருப்புகளைச் சேர்க்கவும், தினசரி கமிஷன் பிரிவுகளை மதிப்பாய்வு செய்யவும், விநியோகஸ்தர் பணப்பை பதிவுகளை ஆய்வு செய்யவும்."
            : "Configure distributor registration-fee settings, inject liquidity balances, review daily commission splits, and inspect distributor wallet logs."
        }
        records={records}
      />

      {/* Add Balance Modal */}
      {topUpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-[#1e3a8a] text-white">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Wallet className="w-4 h-4" /> {isTamil ? "விநியோகஸ்தர் பணப்பையில் வரவு வைக்க" : "Credit Distributor Wallet"}
              </h3>
              <button type="button" onClick={() => setTopUpModalOpen(false)} className="text-white/80 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTopUpSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isTamil ? "மண்டல விநியோகஸ்தரைத் தேர்ந்தெடுக்கவும்" : "Select Zonal Distributor"}
                </label>
                <select
                  value={selectedDistributor}
                  onChange={(e) => setSelectedDistributor(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs outline-none focus:border-[#1e3a8a]"
                >
                  {distributors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isTamil ? "வரவுத் தொகை (₹)" : "Credit Amount (₹)"}
                </label>
                <input
                  type="number"
                  min="1000"
                  step="500"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 50000"
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs outline-none focus:border-[#1e3a8a]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isTamil ? "வங்கி யுடிஆர் / பரிவர்த்தனை குறிப்பு" : "Bank UTR / Transaction Reference"}
                </label>
                <input
                  type="text"
                  required
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. RTGS-SBIN0029104812"
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs outline-none focus:border-[#1e3a8a]"
                />
              </div>

              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900">
                {isTamil
                  ? "இந்தப் பரிவர்த்தனை distributor_wallet_logs அட்டவணையில் நிரந்தரப் பதிவை ஏற்படுத்துகிறது."
                  : "This transaction writes an immutable entry to distributor_wallet_logs with row-level balance locking."}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTopUpModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  {isTamil ? "ரத்துசெய்" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#1e3a8a] text-xs font-bold text-white hover:bg-[#1e40af] cursor-pointer"
                >
                  {isTamil ? "வரவு வைக்க" : "Execute Float Credit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
