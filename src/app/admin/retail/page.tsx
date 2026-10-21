"use client";

import { useState, useMemo } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { formatGeoBilingual, TN_DISTRICT_MAP } from "@/lib/geo-bilingual";
import {
  Store,
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
  Key,
  ShieldCheck,
  ShieldAlert,
  FileText,
  UserCheck,
  UserX,
  X,
  ExternalLink,
  Wallet,
  ShoppingBag,
} from "lucide-react";

interface Retailer {
  id: string;
  storeName: string;
  agentName: string;
  mobile: string;
  email: string;
  district: string;
  taluk: string;
  panchayat: string;
  shopAddress: string;
  referralCode: string;
  distributorId: string;
  distributorName: string;
  biometricDevice: string;
  walletFloat: number;
  ordersCount: number;
  kycStatus: "VERIFIED" | "PENDING_KYC" | "REUPLOAD_REQUIRED" | "BLOCKED";
  joinedDate: string;
}

const initialRetailers: Retailer[] = [];

export default function AdminRetailPage() {
  const { isTamil } = useLanguage();
  const [retailers, setRetailers] = useState<Retailer[]>(initialRetailers);
  const [search, setSearch] = useState("");
  const [districtFilter, setDistrictFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "VERIFIED" | "PENDING_KYC" | "REUPLOAD_REQUIRED" | "BLOCKED">("ALL");

  // Modals
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [kycModalOpen, setKycModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [selectedRetailer, setSelectedRetailer] = useState<Retailer | null>(null);
  const [toastMessage, setToastMessage] = useState("");

  // New retailer form
  const [newStore, setNewStore] = useState("");
  const [newAgent, setNewAgent] = useState("");
  const [newMobile, setNewMobile] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newDistrict, setNewDistrict] = useState("Madurai");
  const [newTaluk, setNewTaluk] = useState("");
  const [newPanchayat, setNewPanchayat] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newReferral, setNewReferral] = useState("DIST-KONGU-12");
  const [newDevice, setNewDevice] = useState("Mantra MFS100 RD");

  // Password reset form
  const [newPassword, setNewPassword] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  const filteredRetailers = useMemo(() => {
    return retailers.filter((ret) => {
      const matchesSearch =
        ret.storeName.toLowerCase().includes(search.toLowerCase()) ||
        ret.agentName.toLowerCase().includes(search.toLowerCase()) ||
        ret.id.toLowerCase().includes(search.toLowerCase()) ||
        ret.mobile.includes(search) ||
        ret.referralCode.toLowerCase().includes(search.toLowerCase());
      const matchesDistrict = districtFilter === "ALL" || ret.district === districtFilter;
      const matchesStatus = statusFilter === "ALL" || ret.kycStatus === statusFilter;
      return matchesSearch && matchesDistrict && matchesStatus;
    });
  }, [retailers, search, districtFilter, statusFilter]);

  const handleRegisterRetailer = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = `RET-${20100 + retailers.length + 1}`;
    const newEntry: Retailer = {
      id: newId,
      storeName: newStore,
      agentName: newAgent,
      mobile: newMobile,
      email: newEmail,
      district: newDistrict,
      taluk: newTaluk || "Headquarters",
      panchayat: newPanchayat || "Town Ward 1",
      shopAddress: newAddress,
      referralCode: newReferral,
      distributorId: "DIST-102",
      distributorName: "Kongu Zonal Distribution Agency",
      biometricDevice: newDevice,
      walletFloat: 0,
      ordersCount: 0,
      kycStatus: "PENDING_KYC",
      joinedDate: "Today",
    };

    setRetailers([newEntry, ...retailers]);
    setRegisterModalOpen(false);
    showToast(`New retailer ${newStore} registered with ID ${newId}. KYC pending.`);
    // Reset form
    setNewStore("");
    setNewAgent("");
    setNewMobile("");
    setNewEmail("");
    setNewAddress("");
  };

  const handleOpenKyc = (ret: Retailer) => {
    setSelectedRetailer(ret);
    setKycModalOpen(true);
  };

  const handleUpdateKycStatus = (retId: string, status: "VERIFIED" | "REUPLOAD_REQUIRED" | "BLOCKED") => {
    setRetailers((prev) =>
      prev.map((r) => (r.id === retId ? { ...r, kycStatus: status } : r))
    );
    setKycModalOpen(false);
    showToast(`Retailer ${retId} KYC status updated to ${status}.`);
  };

  const handleOpenPassword = (ret: Retailer) => {
    setSelectedRetailer(ret);
    setNewPassword("");
    setPasswordModalOpen(true);
  };

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRetailer || !newPassword) return;
    setPasswordModalOpen(false);
    showToast(`Temporary password for ${selectedRetailer.agentName} set and encrypted.`);
  };

  const toggleRetailerStatus = (ret: Retailer) => {
    const nextStatus = ret.kycStatus === "BLOCKED" ? "VERIFIED" : "BLOCKED";
    setRetailers((prev) =>
      prev.map((r) => (r.id === ret.id ? { ...r, kycStatus: nextStatus } : r))
    );
    showToast(`Retailer ${ret.storeName} is now ${nextStatus}.`);
  };

  const exportCSV = () => {
    const headers = ["Retailer ID", "Store Name", "Agent", "Mobile", "Email", "District", "Distributor", "Wallet Float", "Orders", "KYC Status"];
    const rows = filteredRetailers.map((r) => [
      r.id,
      r.storeName,
      r.agentName,
      r.mobile,
      r.email,
      r.district,
      r.distributorName,
      r.walletFloat,
      r.ordersCount,
      r.kycStatus,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "labourseva_retailers_directory.csv");
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
                <Store className="w-3.5 h-3.5 text-amber-300" />
                {isTamil ? "சி.எஸ்.சி சில்லறை விற்பனையாளர் மேலாண்மை (admin_retail_manager.php)" : "CSC Retailer Management (admin_retail_manager.php)"}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                {isTamil ? "சில்லறை சி.எஸ்.சி முகவர் வலையமைப்பு" : "Retail CSC Agent Network"}
              </h1>
              <p className="mt-1 text-sm sm:text-base text-blue-100 max-w-2xl">
                {isTamil
                  ? "பொது சேவை மையங்களை இணைக்கவும், பயோமெட்ரிக் சாதனங்களை சரிபார்க்கவும், வணிக உரிமங்களை ஆய்வு செய்யவும், தமிழ்நாடு மாவட்டங்களில் பணப்பை இருப்பை கண்காணிக்கவும்."
                  : "Onboard Common Service Centers, verify biometric devices, inspect trade licenses, and monitor wallet balances across Tamil Nadu districts."}
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
                onClick={() => setRegisterModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] text-white text-sm font-bold shadow-md hover:shadow-lg transition-all"
              >
                <Plus className="w-4 h-4" />
                {isTamil ? "புதிய விற்பனையாளரை சேர்க்கவும்" : "Onboard New Retailer"}
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/15">
            <div>
              <p className="text-xs text-blue-200 font-medium">{isTamil ? "செயலில் உள்ள முகவர்கள்" : "Active Retailers"}</p>
              <p className="text-2xl font-black mt-1">
                {retailers.filter((r) => r.kycStatus === "VERIFIED").length.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-blue-200 font-medium">{isTamil ? "நிலுவையில் உள்ள கேஒய்சி" : "Pending KYC Scrutiny"}</p>
              <p className="text-2xl font-black mt-1 text-amber-300">
                {retailers.filter((r) => r.kycStatus === "PENDING_KYC" || r.kycStatus === "REUPLOAD_REQUIRED").length.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-blue-200 font-medium">{isTamil ? "மொத்த மிதவை இருப்பு" : "Total Retailer Float"}</p>
              <p className="text-2xl font-black mt-1 text-emerald-300">
                ₹{retailers.reduce((sum, r) => sum + r.walletFloat, 0).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-blue-200 font-medium">{isTamil ? "நிறைவேற்றப்பட்ட ஆர்டர்கள்" : "Orders Fulfilled"}</p>
              <p className="text-2xl font-black mt-1 text-white">
                {retailers.reduce((sum, r) => sum + r.ordersCount, 0).toLocaleString()}
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
              placeholder={isTamil ? "கடையின் பெயர், முகவர், ஐடி, மொபைல், அல்லது பரிந்துரைக் குறியீடு மூலம் தேடுக..." : "Search by Store Name, Agent Name, ID, Mobile, or Referral Code..."}
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:bg-white transition-all"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <select
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              className="text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
            >
              <option value="ALL">{isTamil ? "அனைத்து மாவட்டங்கள்" : "All Districts"}</option>
              {Object.keys(TN_DISTRICT_MAP).map((dist) => (
                <option key={dist} value={dist}>
                  {formatGeoBilingual(dist).bilingual}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            {(["ALL", "VERIFIED", "PENDING_KYC", "REUPLOAD_REQUIRED", "BLOCKED"] as const).map((st) => (
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
                  : st === "PENDING_KYC"
                  ? (isTamil ? "கேஒய்சி நிலுவை" : "Pending KYC")
                  : st === "REUPLOAD_REQUIRED"
                  ? (isTamil ? "மறுபதிவேற்றம் தேவை" : "Re-upload")
                  : (isTamil ? "முடக்கப்பட்டது" : "Blocked")}
              </button>
            ))}
          </div>
        </div>
      </div>      {/* Retailer Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto w-full scrollbar-thin">
          <table className="w-full min-w-[980px] text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-700">
              <tr>
                <th className="px-5 py-4 whitespace-nowrap">{isTamil ? "சில்லறை சி.எஸ்.சி மையம்" : "Retail CSC Center"}</th>
                <th className="px-5 py-4 whitespace-nowrap">{isTamil ? "இடம் & சாதனம்" : "Location & Device"}</th>
                <th className="px-5 py-4 whitespace-nowrap">{isTamil ? "மண்டல விநியோகஸ்தர்" : "Zonal Distributor"}</th>
                <th className="px-5 py-4 whitespace-nowrap">{isTamil ? "மிதவை இருப்பு" : "Float Balance"}</th>
                <th className="px-5 py-4 whitespace-nowrap">{isTamil ? "கேஒய்சி நிலை" : "KYC Status"}</th>
                <th className="px-5 py-4 text-right whitespace-nowrap min-w-[140px]">{isTamil ? "நடவடிக்கைகள்" : "Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRetailers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    {isTamil ? "உங்கள் தேடல் வடிப்பான்களுக்கு ஏற்ற சில்லறை கூட்டாளர்கள் யாரும் இல்லை." : "No retail partners match your search filters."}
                  </td>
                </tr>
              ) : (
                filteredRetailers.map((ret) => (
                  <tr key={ret.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900 text-base flex items-center gap-2">
                        {ret.storeName}
                        {ret.kycStatus === "VERIFIED" && <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />}
                      </div>
                      <div className="text-xs font-medium text-slate-700 mt-0.5">
                        Prop: <strong className="text-slate-900">{ret.agentName}</strong> · {ret.mobile}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5">{ret.id}</div>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {formatGeoBilingual(ret.taluk).bilingual}, {formatGeoBilingual(ret.district).bilingual}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 font-mono">{ret.biometricDevice}</div>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="text-xs font-bold text-slate-800">{ret.distributorName}</div>
                      <div className="text-[11px] font-mono text-[#1e3a8a] mt-0.5">Ref: {ret.referralCode}</div>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="font-mono font-bold text-slate-900 text-sm">₹{ret.walletFloat.toLocaleString()}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <ShoppingBag className="w-3 h-3 text-slate-400 shrink-0" />
                        {ret.ordersCount} orders fulfilled
                      </div>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <span
                        className={`shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                          ret.kycStatus === "VERIFIED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : ret.kycStatus === "PENDING_KYC"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : ret.kycStatus === "REUPLOAD_REQUIRED"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}
                      >
                        {ret.kycStatus === "VERIFIED" ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : ret.kycStatus === "PENDING_KYC" ? (
                          <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin shrink-0" />
                        ) : ret.kycStatus === "REUPLOAD_REQUIRED" ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                        )}
                        <span>{ret.kycStatus.replace("_", " ")}</span>
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right whitespace-nowrap min-w-[140px]">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        <button
                          type="button"
                          onClick={() => handleOpenKyc(ret)}
                          title="Inspect KYC Documents & Decisions"
                          className="p-1.5 text-slate-600 hover:text-[#1e3a8a] hover:bg-slate-100 rounded-lg transition-colors shrink-0"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenPassword(ret)}
                          title="Set / Reset Retailer Portal Password"
                          className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors shrink-0"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleRetailerStatus(ret)}
                          title={ret.kycStatus === "BLOCKED" ? "Unblock Retailer" : "Block Retailer"}
                          className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                            ret.kycStatus === "BLOCKED"
                              ? "text-emerald-600 hover:bg-emerald-50"
                              : "text-red-500 hover:bg-red-50"
                          }`}
                        >
                          {ret.kycStatus === "BLOCKED" ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
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

      {/* MODAL 1: Onboard New Retailer */}
      {registerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 bg-[#1e3a8a] text-white flex items-center justify-between">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-blue-200">
                  Partner Intake · admin_retail_manager.php
                </span>
                <h3 className="text-xl font-bold mt-0.5">Onboard New Retail CSC Partner</h3>
              </div>
              <button
                type="button"
                onClick={() => setRegisterModalOpen(false)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterRetailer} className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Store / Center Trade Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newStore}
                    onChange={(e) => setNewStore(e.target.value)}
                    placeholder="e.g. Marutham Digital e-Seva"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Proprietor / Agent Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newAgent}
                    onChange={(e) => setNewAgent(e.target.value)}
                    placeholder="e.g. M. Manikandan"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Mobile Phone (OTP Verification)
                  </label>
                  <input
                    type="text"
                    required
                    value={newMobile}
                    onChange={(e) => setNewMobile(e.target.value)}
                    placeholder="98765-XXXXX"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="agent@csc.tn.gov.in"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    {isTamil ? "மாவட்டம்" : "District"}
                  </label>
                  <select
                    value={newDistrict}
                    onChange={(e) => setNewDistrict(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                  >
                    {Object.keys(TN_DISTRICT_MAP).map((dist) => (
                      <option key={dist} value={dist}>
                        {formatGeoBilingual(dist).bilingual}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Taluk
                  </label>
                  <input
                    type="text"
                    value={newTaluk}
                    onChange={(e) => setNewTaluk(e.target.value)}
                    placeholder="e.g. Madurai West"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Panchayat / Ward
                  </label>
                  <input
                    type="text"
                    value={newPanchayat}
                    onChange={(e) => setNewPanchayat(e.target.value)}
                    placeholder="e.g. Kochadai"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Shop Physical Address
                </label>
                <textarea
                  rows={2}
                  required
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="Door No, Street Name, Landmark..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Distributor Referral Code
                  </label>
                  <input
                    type="text"
                    required
                    value={newReferral}
                    onChange={(e) => setNewReferral(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Biometric Scanner Registered
                  </label>
                  <select
                    value={newDevice}
                    onChange={(e) => setNewDevice(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                  >
                    <option value="Mantra MFS100 RD">Mantra MFS100 RD</option>
                    <option value="Morpho MSO1300 E3">Morpho MSO1300 E3</option>
                    <option value="Startek FM220U">Startek FM220U</option>
                    <option value="SecuGen Hamster Pro 20">SecuGen Hamster Pro 20</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setRegisterModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-bold bg-[#1e3a8a] text-white rounded-lg hover:bg-[#1e40af]"
                >
                  Register Retailer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: KYC Inspection Modal */}
      {kycModalOpen && selectedRetailer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 bg-[#1e3a8a] text-white flex items-center justify-between">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-blue-200">
                  KYC Verification Desk · {selectedRetailer.id}
                </span>
                <h3 className="text-xl font-bold mt-0.5">{selectedRetailer.storeName}</h3>
              </div>
              <button
                type="button"
                onClick={() => setKycModalOpen(false)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5 text-xs text-slate-700">
                <p>
                  <strong>Proprietor:</strong> {selectedRetailer.agentName} ({selectedRetailer.mobile})
                </p>
                <p>
                  <strong>{isTamil ? "இடம்:" : "Location:"}</strong> {selectedRetailer.shopAddress}, {formatGeoBilingual(selectedRetailer.taluk).bilingual}, {formatGeoBilingual(selectedRetailer.district).bilingual}
                </p>
                <p>
                  <strong>Biometric RD:</strong> {selectedRetailer.biometricDevice}
                </p>
                <p>
                  <strong>Distributor:</strong> {selectedRetailer.distributorName} ({selectedRetailer.referralCode})
                </p>
              </div>

              {/* Uploaded KYC Documents */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Uploaded KYC Credentials
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="border border-slate-200 rounded-xl p-3 flex items-center justify-between hover:bg-slate-50">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-medium text-slate-800">Trade License (Panchayat / Corp)</span>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">PDF</span>
                  </div>
                  <div className="border border-slate-200 rounded-xl p-3 flex items-center justify-between hover:bg-slate-50">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-medium text-slate-800">Aadhaar Card Front & Back</span>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">JPG</span>
                  </div>
                  <div className="border border-slate-200 rounded-xl p-3 flex items-center justify-between hover:bg-slate-50">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-medium text-slate-800">Shop Physical Board Photo</span>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">JPG</span>
                  </div>
                  <div className="border border-slate-200 rounded-xl p-3 flex items-center justify-between hover:bg-slate-50">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-medium text-slate-800">Cancelled Bank Cheque</span>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">PDF</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => handleUpdateKycStatus(selectedRetailer.id, "REUPLOAD_REQUIRED")}
                className="px-4 py-2 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200"
              >
                Request Document Re-Upload
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleUpdateKycStatus(selectedRetailer.id, "BLOCKED")}
                  className="px-4 py-2 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200"
                >
                  Reject & Block
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateKycStatus(selectedRetailer.id, "VERIFIED")}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
                >
                  Approve KYC & Activate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Reset Password Modal */}
      {passwordModalOpen && selectedRetailer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden">
            <div className="px-6 py-5 bg-[#1e3a8a] text-white flex items-center justify-between">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-blue-200">
                  Credential Reset
                </span>
                <h3 className="text-lg font-bold mt-0.5">Reset Password: {selectedRetailer.storeName}</h3>
              </div>
              <button
                type="button"
                onClick={() => setPasswordModalOpen(false)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePassword} className="p-6 space-y-4">
              <p className="text-xs text-slate-500">
                Generate a temporary password for agent <strong>{selectedRetailer.agentName}</strong> ({selectedRetailer.mobile}). Passwords are automatically hashed with <code>password_hash(PASSWORD_BCRYPT)</code>.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  New Temporary Password
                </label>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="e.g. Retailer@2026!#"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] font-mono"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPasswordModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-bold bg-[#1e3a8a] text-white rounded-lg hover:bg-[#1e40af]"
                >
                  Save & Notify Agent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
