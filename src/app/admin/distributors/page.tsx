"use client";

import { useState, useMemo } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { formatGeoBilingual } from "@/lib/geo-bilingual";
import {
  Building2,
  Search,
  Filter,
  Download,
  Plus,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  ShieldAlert,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  Store,
  MessageSquare,
  Send,
  Building,
  CreditCard,
  UserCheck,
  UserX,
  Clock,
} from "lucide-react";

interface Distributor {
  id: string;
  agencyName: string;
  directorName: string;
  mobile: string;
  email: string;
  gstin: string;
  pan: string;
  territoryDistricts: string[];
  connectedRetailersCount: number;
  walletBalance: number;
  pendingPayoutAmount: number;
  bankAccount: string;
  bankIfsc: string;
  bankName: string;
  status: "VERIFIED" | "PENDING_REVIEW" | "SUSPENDED";
  joinedDate: string;
}

const initialDistributors: Distributor[] = [];

const mockConnectedRetailers: { id: string; name: string; district: string; balance: string; orders: number }[] = [];

export default function AdminDistributorsPage() {
  const { isTamil } = useLanguage();
  const [distributors, setDistributors] = useState<Distributor[]>(initialDistributors);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "VERIFIED" | "PENDING_REVIEW" | "SUSPENDED">("ALL");

  // Modals
  const [onboardModalOpen, setOnboardModalOpen] = useState(false);
  const [retailersDrawerOpen, setRetailersDrawerOpen] = useState(false);
  const [settlementModalOpen, setSettlementModalOpen] = useState(false);
  const [selectedDistributor, setSelectedDistributor] = useState<Distributor | null>(null);
  const [toastMessage, setToastMessage] = useState("");

  // Onboard form state
  const [newAgency, setNewAgency] = useState("");
  const [newDirector, setNewDirector] = useState("");
  const [newMobile, setNewMobile] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newGstin, setNewGstin] = useState("");
  const [newTerritory, setNewTerritory] = useState("Madurai, Dindigul");
  const [newAccount, setNewAccount] = useState("");
  const [newIfsc, setNewIfsc] = useState("");

  // Settlement form state
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutMode, setPayoutMode] = useState<"NEFT" | "RTGS" | "IMPS">("NEFT");
  const [utrNumber, setUtrNumber] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  const filteredDistributors = useMemo(() => {
    return distributors.filter((dist) => {
      const matchesSearch =
        dist.agencyName.toLowerCase().includes(search.toLowerCase()) ||
        dist.directorName.toLowerCase().includes(search.toLowerCase()) ||
        dist.id.toLowerCase().includes(search.toLowerCase()) ||
        dist.mobile.includes(search) ||
        dist.gstin.toLowerCase().includes(search.toLowerCase()) ||
        dist.territoryDistricts.some((d) => d.toLowerCase().includes(search.toLowerCase()));
      const matchesStatus = statusFilter === "ALL" || dist.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [distributors, search, statusFilter]);

  const handleOnboardDistributor = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = `DIST-${100 + distributors.length + 1}`;
    const newEntry: Distributor = {
      id: newId,
      agencyName: newAgency,
      directorName: newDirector,
      mobile: newMobile,
      email: newEmail,
      gstin: newGstin || "33XXXXXXXXXX1Z1",
      pan: newGstin.substring(2, 12) || "XXXXXXXXXX",
      territoryDistricts: newTerritory.split(",").map((s) => s.trim()),
      connectedRetailersCount: 0,
      walletBalance: 0,
      pendingPayoutAmount: 0,
      bankAccount: newAccount,
      bankIfsc: newIfsc,
      bankName: "Verified Scheduled Bank",
      status: "PENDING_REVIEW",
      joinedDate: "Today",
    };

    setDistributors([newEntry, ...distributors]);
    setOnboardModalOpen(false);
    showToast(`Distributor ${newAgency} registered with ID ${newId}.`);
    // Reset form
    setNewAgency("");
    setNewDirector("");
    setNewMobile("");
    setNewEmail("");
    setNewGstin("");
    setNewAccount("");
    setNewIfsc("");
  };

  const handleOpenRetailers = (dist: Distributor) => {
    setSelectedDistributor(dist);
    setRetailersDrawerOpen(true);
  };

  const handleOpenSettlement = (dist: Distributor) => {
    setSelectedDistributor(dist);
    setPayoutAmount(dist.pendingPayoutAmount > 0 ? String(dist.pendingPayoutAmount) : "10000");
    setUtrNumber("");
    setSettlementModalOpen(true);
  };

  const handleSaveSettlement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDistributor) return;
    const amt = parseFloat(payoutAmount);
    if (isNaN(amt) || amt <= 0) return;

    if (amt > selectedDistributor.walletBalance) {
      alert("Settlement amount cannot exceed distributor's available float balance.");
      return;
    }

    setDistributors((prev) =>
      prev.map((d) => {
        if (d.id !== selectedDistributor.id) return d;
        return {
          ...d,
          walletBalance: d.walletBalance - amt,
          pendingPayoutAmount: Math.max(0, d.pendingPayoutAmount - amt),
        };
      })
    );

    setSettlementModalOpen(false);
    showToast(`Settlement of ₹${amt.toLocaleString()} processed via ${payoutMode} (UTR: ${utrNumber || "AUTO-DISPATCH"}).`);
  };

  const toggleDistributorStatus = (dist: Distributor) => {
    const nextStatus = dist.status === "SUSPENDED" ? "VERIFIED" : "SUSPENDED";
    setDistributors((prev) =>
      prev.map((d) => (d.id === dist.id ? { ...d, status: nextStatus } : d))
    );
    showToast(`Distributor ${dist.agencyName} status updated to ${nextStatus}.`);
  };

  const openWhatsApp = (mobile: string) => {
    const cleanNumber = mobile.replace(/[^0-9]/g, "");
    window.open(`https://wa.me/91${cleanNumber}?text=LabourSeva%20Administration%20Notice`, "_blank");
  };

  const exportCSV = () => {
    const headers = ["Distributor ID", "Agency Name", "Director", "Mobile", "Email", "GSTIN", "Territory", "Retailers", "Wallet Float", "Status"];
    const rows = filteredDistributors.map((d) => [
      d.id,
      d.agencyName,
      d.directorName,
      d.mobile,
      d.email,
      d.gstin,
      d.territoryDistricts.join("; "),
      d.connectedRetailersCount,
      d.walletBalance,
      d.status,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "labourseva_distributors.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 rounded-xl bg-slate-900 text-white px-5 py-3 shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#1e3a8a] via-[#1e40af] to-[#2563eb] rounded-2xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold uppercase tracking-wider backdrop-blur-sm border border-white/10 mb-3">
                <Building2 className="w-3.5 h-3.5 text-amber-300" />
                {isTamil ? "மண்டல விநியோக மேலாண்மை (admin_distributors.php)" : "Zonal Distribution Management (admin_distributors.php)"}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                {isTamil ? "மண்டல விநியோகஸ்தர்கள்" : "Zonal Distributors"}
              </h1>
              <p className="mt-1 text-sm sm:text-base text-blue-100 max-w-2xl">
                {isTamil
                  ? "பிராந்திய விநியோக கூட்டாளர்களை மேற்பார்வையிடவும், மிதவை இருப்பை பராமரிக்கவும், வங்கி கொடுப்பனவு தீர்வுகளை செயல்படுத்தவும், இணைக்கப்பட்ட சி.எஸ்.சி நெட்வொர்க்குகளை ஆய்வு செய்யவும்."
                  : "Supervise regional distribution partners, maintain wallet float balances, execute bank payout settlements, and inspect connected CSC networks."}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={exportCSV}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold border border-white/20 transition-all backdrop-blur-sm shadow-sm"
              >
                <Download className="w-4 h-4" />
                {isTamil ? "CSV ஏற்றுமதி" : "Export CSV"}
              </button>
              <button
                type="button"
                onClick={() => setOnboardModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] text-white text-sm font-bold shadow-md hover:shadow-lg transition-all"
              >
                <Plus className="w-4 h-4" />
                {isTamil ? "விநியோகஸ்தரை சேர்க்கவும்" : "Onboard Distributor"}
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/15">
            <div>
              <p className="text-xs text-blue-200 font-medium">{isTamil ? "மண்டல முகமைகள்" : "Zonal Agencies"}</p>
              <p className="text-2xl font-black mt-1">
                {distributors.filter((d) => d.status === "VERIFIED").length} Active
              </p>
            </div>
            <div>
              <p className="text-xs text-blue-200 font-medium">Retail CSCs Supervised</p>
              <p className="text-2xl font-black mt-1 text-emerald-300">
                {distributors.reduce((sum, d) => sum + d.connectedRetailersCount, 0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-blue-200 font-medium">Total Distributor Float</p>
              <p className="text-2xl font-black mt-1 text-white">
                ₹{distributors.reduce((sum, d) => sum + d.walletBalance, 0).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-blue-200 font-medium">Pending Payout Requests</p>
              <p className="text-2xl font-black mt-1 text-amber-300">
                ₹{distributors.reduce((sum, d) => sum + d.pendingPayoutAmount, 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-3 min-w-[280px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isTamil ? "முகமை, இயக்குனர், மொபைல், ஜிஎஸ்டிஐஎன், அல்லது மண்டல மாவட்டங்கள் மூலம் தேடுக..." : "Search by Agency Name, Director, Mobile, GSTIN, or Territory Districts..."}
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:bg-white transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          {(["ALL", "VERIFIED", "PENDING_REVIEW", "SUSPENDED"] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                statusFilter === st
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {st === "ALL"
                ? (isTamil ? "அனைத்து நிலைகளும்" : "All Status")
                : st === "VERIFIED"
                ? (isTamil ? "சரிபார்க்கப்பட்டது" : "Verified")
                : st === "PENDING_REVIEW"
                ? (isTamil ? "ஆய்வு நிலுவை" : "Pending Review")
                : (isTamil ? "இடைநிறுத்தப்பட்டது" : "Suspended")}
            </button>
          ))}
        </div>
      </div>

      {/* Distributors Directory Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto w-full scrollbar-thin">
          <table className="w-full min-w-[980px] text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-700">
              <tr>
                <th className="px-5 py-4 whitespace-nowrap">{isTamil ? "நிறுவனம் & இயக்குனர்" : "Agency & Director"}</th>
                <th className="px-5 py-4 whitespace-nowrap">{isTamil ? "மண்டல வரம்பு" : "Territory Jurisdiction"}</th>
                <th className="px-5 py-4 whitespace-nowrap">{isTamil ? "இணைக்கப்பட்ட சி.எஸ்.சி" : "Connected CSCs"}</th>
                <th className="px-5 py-4 whitespace-nowrap">{isTamil ? "பணப்பை இருப்பு" : "Wallet Balance"}</th>
                <th className="px-5 py-4 whitespace-nowrap">{isTamil ? "நிலை" : "Status"}</th>
                <th className="px-5 py-4 text-right whitespace-nowrap min-w-[140px]">{isTamil ? "நடவடிக்கைகள்" : "Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDistributors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    {isTamil ? "உங்கள் தேடல் வடிப்பான்களுக்கு ஏற்ற விநியோகஸ்தர்கள் யாரும் இல்லை." : "No distributors match your search filters."}
                  </td>
                </tr>
              ) : (
                filteredDistributors.map((dist) => (
                  <tr key={dist.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900 text-base flex items-center gap-2">
                        {dist.agencyName}
                        {dist.status === "VERIFIED" && <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />}
                      </div>
                      <div className="text-xs font-medium text-slate-700 mt-0.5">
                        Lead: <strong className="text-slate-900">{dist.directorName}</strong> · {dist.mobile}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                        {dist.id} · GSTIN: {dist.gstin}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {dist.territoryDistricts.map((d) => (
                          <span
                            key={d}
                            className="shrink-0 whitespace-nowrap px-2 py-0.5 bg-blue-50 text-[#1e3a8a] text-xs font-semibold rounded-md border border-blue-200/60"
                          >
                            {formatGeoBilingual(d).bilingual}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleOpenRetailers(dist)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors shrink-0"
                      >
                        <Store className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>{dist.connectedRetailersCount} Retailers</span>
                      </button>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="font-mono font-bold text-slate-900 text-sm">
                        ₹{dist.walletBalance.toLocaleString()}
                      </div>
                      {dist.pendingPayoutAmount > 0 && (
                        <div className="text-[11px] text-amber-700 font-bold flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 shrink-0" />
                          <span>₹{dist.pendingPayoutAmount.toLocaleString()} pending payout</span>
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <span
                        className={`shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                          dist.status === "VERIFIED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : dist.status === "PENDING_REVIEW"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}
                      >
                        {dist.status === "VERIFIED" ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : dist.status === "PENDING_REVIEW" ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                        )}
                        <span>{dist.status.replace("_", " ")}</span>
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right whitespace-nowrap min-w-[140px]">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        <button
                          type="button"
                          onClick={() => handleOpenSettlement(dist)}
                          title="Execute Payout Settlement (admin_distributor_requests.php)"
                          className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors shrink-0"
                        >
                          <Wallet className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openWhatsApp(dist.mobile)}
                          title="Chat on WhatsApp"
                          className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors shrink-0"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleDistributorStatus(dist)}
                          title={dist.status === "SUSPENDED" ? "Activate Distributor" : "Suspend Distributor"}
                          className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                            dist.status === "SUSPENDED"
                              ? "text-emerald-600 hover:bg-emerald-50"
                              : "text-red-500 hover:bg-red-50"
                          }`}
                        >
                          {dist.status === "SUSPENDED" ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Onboard New Distributor */}
      {onboardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 bg-[#1e3a8a] text-white flex items-center justify-between">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-blue-200">
                  New Zonal Partner · admin_distributors.php
                </span>
                <h3 className="text-xl font-bold mt-0.5">Onboard Zonal Distribution Agency</h3>
              </div>
              <button
                type="button"
                onClick={() => setOnboardModalOpen(false)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleOnboardDistributor} className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Agency Corporate Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newAgency}
                    onChange={(e) => setNewAgency(e.target.value)}
                    placeholder="e.g. Kaveri Regional Hub"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Managing Director / Partner
                  </label>
                  <input
                    type="text"
                    required
                    value={newDirector}
                    onChange={(e) => setNewDirector(e.target.value)}
                    placeholder="e.g. S. Ramanathan"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Contact Mobile Number
                  </label>
                  <input
                    type="text"
                    required
                    value={newMobile}
                    onChange={(e) => setNewMobile(e.target.value)}
                    placeholder="94430-XXXXX"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Official Email
                  </label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="distributor@agency.com"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    GSTIN / Tax ID
                  </label>
                  <input
                    type="text"
                    value={newGstin}
                    onChange={(e) => setNewGstin(e.target.value)}
                    placeholder="33AAAAA0000A1Z5"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Allocated Territory Districts (Comma-separated)
                  </label>
                  <input
                    type="text"
                    required
                    value={newTerritory}
                    onChange={(e) => setNewTerritory(e.target.value)}
                    placeholder="e.g. Madurai, Theni, Dindigul"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                  />
                </div>
              </div>

              {/* Bank Settlement Account Details */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-blue-700" />
                  Payout Settlement Bank Account
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Account Number</label>
                    <input
                      type="text"
                      required
                      value={newAccount}
                      onChange={(e) => setNewAccount(e.target.value)}
                      placeholder="e.g. 50100291823901"
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">IFSC Code</label>
                    <input
                      type="text"
                      required
                      value={newIfsc}
                      onChange={(e) => setNewIfsc(e.target.value)}
                      placeholder="e.g. HDFC0001242"
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg font-mono uppercase focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setOnboardModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-bold bg-[#1e3a8a] text-white rounded-lg hover:bg-[#1e40af]"
                >
                  Confirm Registration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Connected Retailers Drawer */}
      {retailersDrawerOpen && selectedDistributor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-5 bg-[#1e3a8a] text-white flex items-center justify-between">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-blue-200">
                  CSC Network Roster · {selectedDistributor.id}
                </span>
                <h3 className="text-lg font-bold mt-0.5">{selectedDistributor.agencyName}</h3>
              </div>
              <button
                type="button"
                onClick={() => setRetailersDrawerOpen(false)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-3">
              <p className="text-xs text-slate-500">
                Connected retail outlets registered using referral code of <strong>{selectedDistributor.agencyName}</strong>:
              </p>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {mockConnectedRetailers.length === 0 ? (
                  <p className="p-8 text-center text-xs text-slate-400">No retail partners connected under this distributor yet.</p>
                ) : (
                  mockConnectedRetailers.map((ret) => (
                    <div key={ret.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50 text-xs">
                      <div>
                        <strong className="text-slate-900 text-sm block">{ret.name}</strong>
                        <span className="text-slate-500 font-mono text-[11px]">{ret.id} · {formatGeoBilingual(ret.district).bilingual}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-900 font-mono">{ret.balance}</div>
                        <span className="text-[11px] text-slate-400">{ret.orders} orders</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setRetailersDrawerOpen(false)}
                className="px-4 py-2 text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Payout Settlement (admin_distributor_requests.php) */}
      {settlementModalOpen && selectedDistributor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden">
            <div className="px-6 py-5 bg-[#1e3a8a] text-white flex items-center justify-between">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-blue-200">
                  Settlement Queue · admin_distributor_requests.php
                </span>
                <h3 className="text-lg font-bold mt-0.5">Execute Payout: {selectedDistributor.agencyName}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSettlementModalOpen(false)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSettlement} className="p-6 space-y-4">
              <div className="bg-blue-50/70 border border-blue-200/60 rounded-xl p-3 text-xs text-blue-900 space-y-1">
                <div className="flex justify-between">
                  <span>Current Available Float:</span>
                  <strong className="font-mono text-blue-950 font-bold">₹{selectedDistributor.walletBalance.toLocaleString()}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Bank Account:</span>
                  <strong className="font-mono text-blue-950 font-bold">{selectedDistributor.bankAccount} ({selectedDistributor.bankIfsc})</strong>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Settlement Amount (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₹</span>
                  <input
                    type="number"
                    min="1"
                    max={selectedDistributor.walletBalance}
                    required
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Transfer Mode
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["NEFT", "RTGS", "IMPS"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPayoutMode(mode)}
                      className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                        payoutMode === mode
                          ? "bg-[#1e3a8a] text-white border-[#1e3a8a]"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Bank UTR Reference Number
                </label>
                <input
                  type="text"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value)}
                  placeholder="e.g. HDFC20261012998410"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] font-mono"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSettlementModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm"
                >
                  Disburse & Deduct Float
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
