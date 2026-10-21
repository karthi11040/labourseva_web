"use client";

import { useState, useMemo } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { formatGeoBilingual, TN_DISTRICT_MAP } from "@/lib/geo-bilingual";
import {
  Users,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Wallet,
  ShieldCheck,
  ShieldAlert,
  CreditCard,
  Building,
  Phone,
  MapPin,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  UserCheck,
  UserX,
  Plus,
  X,
  RefreshCw,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";

interface Customer {
  id: string;
  name: string;
  mobile: string;
  aadhaarMasked: string;
  welfareCardNo: string;
  trade: string;
  district: string;
  taluk: string;
  panchayat: string;
  status: "ACTIVE" | "RENEWAL_DUE" | "SUSPENDED";
  cardsWalletBalance: number;
  paymentsWalletBalance: number;
  registeredDate: string;
  nomineeName: string;
  nomineeRelation: string;
  benefitsAvailedCount: number;
}

const initialCustomers: Customer[] = [];

const mockServiceHistory: { id: string; service: string; appliedDate: string; status: string; amount: string }[] = [];

export default function AdminCustomersPage() {
  const { isTamil } = useLanguage();
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [search, setSearch] = useState("");
  const [districtFilter, setDistrictFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "RENEWAL_DUE" | "SUSPENDED">("ALL");
  
  // Modals state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [dossierOpen, setDossierOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editMobile, setEditMobile] = useState("");
  const [editTrade, setEditTrade] = useState("");
  const [editDistrict, setEditDistrict] = useState("");

  // Wallet form state
  const [walletAction, setWalletAction] = useState<"CREDIT" | "DEBIT">("CREDIT");
  const [walletType, setWalletType] = useState<"CARDS" | "PAYMENTS">("CARDS");
  const [walletAmount, setWalletAmount] = useState("");
  const [walletRemarks, setWalletRemarks] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter((cust) => {
      const matchesSearch =
        cust.name.toLowerCase().includes(search.toLowerCase()) ||
        cust.id.toLowerCase().includes(search.toLowerCase()) ||
        cust.mobile.includes(search) ||
        cust.welfareCardNo.toLowerCase().includes(search.toLowerCase()) ||
        cust.trade.toLowerCase().includes(search.toLowerCase());
      const matchesDistrict = districtFilter === "ALL" || cust.district === districtFilter;
      const matchesStatus = statusFilter === "ALL" || cust.status === statusFilter;
      return matchesSearch && matchesDistrict && matchesStatus;
    });
  }, [customers, search, districtFilter, statusFilter]);

  const handleOpenDossier = (cust: Customer) => {
    setSelectedCustomer(cust);
    setDossierOpen(true);
  };

  const handleOpenEdit = (cust: Customer) => {
    setSelectedCustomer(cust);
    setEditName(cust.name);
    setEditMobile(cust.mobile);
    setEditTrade(cust.trade);
    setEditDistrict(cust.district);
    setEditModalOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === selectedCustomer.id
          ? { ...c, name: editName, mobile: editMobile, trade: editTrade, district: editDistrict }
          : c
      )
    );
    setEditModalOpen(false);
    showToast(`Customer profile for ${editName} updated successfully.`);
  };

  const handleOpenWallet = (cust: Customer) => {
    setSelectedCustomer(cust);
    setWalletAction("CREDIT");
    setWalletType("CARDS");
    setWalletAmount("");
    setWalletRemarks("");
    setWalletModalOpen(true);
  };

  const handleSaveWalletAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    const amt = parseFloat(walletAmount);
    if (isNaN(amt) || amt <= 0) return;

    if (walletAction === "DEBIT") {
      const currentBal = walletType === "CARDS" ? selectedCustomer.cardsWalletBalance : selectedCustomer.paymentsWalletBalance;
      if (amt > currentBal) {
        alert("Insufficient wallet balance for this deduction.");
        return;
      }
    }

    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id !== selectedCustomer.id) return c;
        const delta = walletAction === "CREDIT" ? amt : -amt;
        return {
          ...c,
          cardsWalletBalance: walletType === "CARDS" ? Math.max(0, c.cardsWalletBalance + delta) : c.cardsWalletBalance,
          paymentsWalletBalance: walletType === "PAYMENTS" ? Math.max(0, c.paymentsWalletBalance + delta) : c.paymentsWalletBalance,
        };
      })
    );

    setWalletModalOpen(false);
    showToast(`₹${amt} ${walletAction === "CREDIT" ? "credited to" : "deducted from"} ${selectedCustomer.name}'s ${walletType} wallet.`);
  };

  const toggleCustomerStatus = (cust: Customer) => {
    const nextStatus = cust.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";
    setCustomers((prev) =>
      prev.map((c) => (c.id === cust.id ? { ...c, status: nextStatus } : c))
    );
    showToast(`Account status for ${cust.name} set to ${nextStatus}.`);
  };

  const exportCSV = () => {
    const headers = ["Customer ID", "Name", "Mobile", "Aadhaar", "Welfare Card", "Trade", "District", "Status", "Cards Wallet", "Payments Wallet"];
    const rows = filteredCustomers.map((c) => [
      c.id,
      c.name,
      c.mobile,
      c.aadhaarMasked,
      c.welfareCardNo,
      c.trade,
      c.district,
      c.status,
      c.cardsWalletBalance,
      c.paymentsWalletBalance,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "labourseva_registered_customers.csv");
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
                <Users className="w-3.5 h-3.5 text-amber-300" />
                {isTamil ? "குடிமக்கள் தொழிலாளர் பதிவேடு (admin_customers.php)" : "Citizen Labour Registry (admin_customers.php)"}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                {isTamil ? "பதிவுசெய்த கட்டுமானத் தொழிலாளர்கள்" : "Registered Construction Workers"}
              </h1>
              <p className="mt-1 text-sm sm:text-base text-blue-100 max-w-2xl">
                {isTamil
                  ? "தமிழ்நாடு உடலுழைப்பு மற்றும் பிற கட்டுமானத் தொழிலாளர்கள் நல வாரியத்தின் கீழ் பதிவுசெய்யப்பட்ட நேரடி பயனாளிகள். சுயவிவரங்கள், கேஒய்சி சான்றுகள் மற்றும் நல வாரிய அட்டைகளை நிர்வகிக்கவும்."
                  : "Direct beneficiaries registered under the Tamil Nadu Building and Other Construction Workers Welfare Board. Manage profiles, KYC credentials, and welfare cards."}
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
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/15">
            <div>
              <p className="text-xs text-blue-200 font-medium">{isTamil ? "மொத்தம் பதிவு செய்தவர்கள்" : "Total Registered"}</p>
              <p className="text-2xl font-black mt-1">{customers.length.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-blue-200 font-medium">{isTamil ? "செயலில் உள்ள நல அட்டைகள்" : "Active Welfare Cards"}</p>
              <p className="text-2xl font-black mt-1 text-emerald-300">
                {customers.filter((c) => c.status === "ACTIVE").length.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-blue-200 font-medium">{isTamil ? "புதுப்பிக்க வேண்டியவை" : "Renewal Due"}</p>
              <p className="text-2xl font-black mt-1 text-amber-300">
                {customers.filter((c) => c.status === "RENEWAL_DUE").length.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-blue-200 font-medium">{isTamil ? "இடைநிறுத்தப்பட்டது" : "Suspended"}</p>
              <p className="text-2xl font-black mt-1 text-red-300">
                {customers.filter((c) => c.status === "SUSPENDED").length.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-blue-200 font-medium">Total Float Held</p>
              <p className="text-2xl font-black mt-1 text-white">
                ₹{customers.reduce((sum, c) => sum + c.cardsWalletBalance + c.paymentsWalletBalance, 0).toLocaleString()}
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
              placeholder={isTamil ? "தொழிலாளி பெயர், மொபைல், ஆதார், நல அட்டை எண், அல்லது தொழில் மூலம் தேடுக..." : "Search by Worker Name, Mobile, Aadhaar, Welfare Card No, or Trade..."}
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
            {(["ALL", "ACTIVE", "RENEWAL_DUE", "SUSPENDED"] as const).map((st) => (
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
                  : st === "ACTIVE"
                  ? (isTamil ? "செயலில்" : "Active")
                  : st === "RENEWAL_DUE"
                  ? (isTamil ? "புதுப்பிக்க வேண்டியவை" : "Renewal Due")
                  : (isTamil ? "இடைநிறுத்தப்பட்டது" : "Suspended")}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Customer Directory Table */}
      {/* Customers Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto w-full scrollbar-thin">
          <table className="w-full min-w-[980px] text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-700">
              <tr>
                <th className="px-5 py-4 whitespace-nowrap">{isTamil ? "தொழிலாளி & அட்டை எண்" : "Worker & Card ID"}</th>
                <th className="px-5 py-4 whitespace-nowrap">{isTamil ? "தொழில் & மாவட்டம் / வட்டம்" : "Trade & District / Taluk"}</th>
                <th className="px-5 py-4 whitespace-nowrap">{isTamil ? "தொடர்பு & ஆதார்" : "Contact & Aadhaar"}</th>
                <th className="px-5 py-4 whitespace-nowrap">{isTamil ? "பணப்பை இருப்பு" : "Wallet Balances"}</th>
                <th className="px-5 py-4 whitespace-nowrap">{isTamil ? "நிலை" : "Status"}</th>
                <th className="px-5 py-4 text-right whitespace-nowrap min-w-[150px]">{isTamil ? "நடவடிக்கைகள்" : "Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    {isTamil ? "உங்கள் தேடலுக்கு ஏற்ற தொழிலாளர் பதிவுகள் எதுவும் கிடைக்கவில்லை." : "No worker records match your search query."}
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900 text-base flex items-center gap-2">
                        {cust.name}
                        {cust.status === "ACTIVE" && <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />}
                      </div>
                      <div className="text-xs font-mono text-[#1e3a8a] font-semibold mt-0.5">
                        {cust.welfareCardNo}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">{cust.id}</div>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-800">{cust.trade}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{formatGeoBilingual(cust.taluk).bilingual}, {formatGeoBilingual(cust.district).bilingual}</span>
                      </div>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="text-xs font-medium text-slate-700 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{cust.mobile}</span>
                      </div>
                      <div className="text-xs font-mono text-slate-500 mt-0.5">
                        Aadhaar: {cust.aadhaarMasked}
                      </div>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700">
                          <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
                          <span>Cards: <strong className="font-mono text-slate-900">₹{cust.cardsWalletBalance}</strong></span>
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                          <span>Payments: <strong className="font-mono text-slate-900">₹{cust.paymentsWalletBalance}</strong></span>
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <span
                        className={`shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                          cust.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : cust.status === "RENEWAL_DUE"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}
                      >
                        {cust.status === "ACTIVE" ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : cust.status === "RENEWAL_DUE" ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                        )}
                        <span>{cust.status.replace("_", " ")}</span>
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right whitespace-nowrap min-w-[150px]">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        <button
                          type="button"
                          onClick={() => handleOpenDossier(cust)}
                          title="View Worker Dossier"
                          className="p-1.5 text-slate-600 hover:text-[#1e3a8a] hover:bg-slate-100 rounded-lg transition-colors shrink-0"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(cust)}
                          title="Edit Worker Profile"
                          className="p-1.5 text-slate-600 hover:text-[#1e3a8a] hover:bg-slate-100 rounded-lg transition-colors shrink-0"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenWallet(cust)}
                          title="Adjust Wallet Balance (admin_add_money / deduct)"
                          className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors shrink-0"
                        >
                          <Wallet className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleCustomerStatus(cust)}
                          title={cust.status === "SUSPENDED" ? "Activate Account" : "Suspend Account"}
                          className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                            cust.status === "SUSPENDED"
                              ? "text-emerald-600 hover:bg-emerald-50"
                              : "text-red-500 hover:bg-red-50"
                          }`}
                        >
                          {cust.status === "SUSPENDED" ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
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

      {/* MODAL 1: Beneficiary Worker Dossier */}
      {dossierOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 bg-[#1e3a8a] text-white flex items-center justify-between">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-blue-200">
                  Beneficiary Dossier · {selectedCustomer.id}
                </span>
                <h3 className="text-xl font-bold mt-0.5">{selectedCustomer.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setDossierOpen(false)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {/* Identity & Welfare Board Card Details */}
              <div className="bg-blue-50/70 border border-blue-200/60 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-blue-800 font-semibold uppercase tracking-wider">
                    TN BOCW Welfare Board Registration No.
                  </p>
                  <p className="text-lg font-black text-[#1e3a8a] font-mono mt-0.5">
                    {selectedCustomer.welfareCardNo}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    Registered On: <strong className="text-slate-800">{selectedCustomer.registeredDate}</strong>
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white">
                    {selectedCustomer.status}
                  </span>
                  <p className="text-xs text-slate-500 mt-1 font-mono">
                    Aadhaar: {selectedCustomer.aadhaarMasked}
                  </p>
                </div>
              </div>

              {/* Demographics & Location Hierarchy */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Trade & Location
                  </h4>
                  <div className="text-sm">
                    <p className="text-slate-500">{isTamil ? "தொழில் பெயர்:" : "Designated Trade:"}</p>
                    <p className="font-bold text-slate-900">{selectedCustomer.trade}</p>
                  </div>
                  <div className="text-sm">
                    <p className="text-slate-500">{isTamil ? "மாவட்டம் & வட்டம்:" : "District & Taluk:"}</p>
                    <p className="font-semibold text-slate-800">
                      {formatGeoBilingual(selectedCustomer.taluk).bilingual}, {formatGeoBilingual(selectedCustomer.district).bilingual}
                    </p>
                  </div>
                  <div className="text-sm">
                    <p className="text-slate-500">{isTamil ? "கிராம ஊராட்சி:" : "Gram Panchayat:"}</p>
                    <p className="font-semibold text-slate-800">{formatGeoBilingual(selectedCustomer.panchayat).bilingual}</p>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Nominee & Contact
                  </h4>
                  <div className="text-sm">
                    <p className="text-slate-500">Registered Nominee:</p>
                    <p className="font-bold text-slate-900">{selectedCustomer.nomineeName}</p>
                  </div>
                  <div className="text-sm">
                    <p className="text-slate-500">Relationship:</p>
                    <p className="font-semibold text-slate-800">{selectedCustomer.nomineeRelation}</p>
                  </div>
                  <div className="text-sm">
                    <p className="text-slate-500">Mobile Phone:</p>
                    <p className="font-mono text-slate-800">{selectedCustomer.mobile}</p>
                  </div>
                </div>
              </div>

              {/* Wallet Balances */}
              <div className="border border-slate-200 rounded-xl p-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  LabourSeva Wallet Pools
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <p className="text-xs text-slate-500 font-medium">Cards Wallet Balance</p>
                    <p className="text-xl font-black text-blue-700 mt-1 font-mono">
                      ₹{selectedCustomer.cardsWalletBalance}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Used for statutory renewal & card issues</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <p className="text-xs text-slate-500 font-medium">Payments Wallet Balance</p>
                    <p className="text-xl font-black text-emerald-700 mt-1 font-mono">
                      ₹{selectedCustomer.paymentsWalletBalance}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Disbursed grants & service assistance</p>
                  </div>
                </div>
              </div>

              {/* Service Availment History */}
              <div className="border border-slate-200 rounded-xl p-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Recent Welfare Benefits Availed ({selectedCustomer.benefitsAvailedCount} total)
                </h4>
                <div className="space-y-2">
                  {mockServiceHistory.length === 0 ? (
                    <p className="text-xs text-slate-400 py-3 text-center">No recent welfare benefit claims recorded.</p>
                  ) : (
                    mockServiceHistory.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 text-xs border border-slate-200"
                      >
                        <div>
                          <span className="font-bold text-slate-900">{item.service}</span>
                          <div className="text-slate-500 font-mono text-[11px]">
                            {item.id} · Applied {item.appliedDate}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-slate-900 font-mono">{item.amount}</span>
                          <div className="text-emerald-700 font-bold">{item.status}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDossierOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setDossierOpen(false);
                  handleOpenWallet(selectedCustomer);
                }}
                className="px-4 py-2 text-sm font-bold bg-[#1e3a8a] text-white rounded-lg hover:bg-[#1e40af]"
              >
                Adjust Wallet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Edit Customer Profile */}
      {editModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden">
            <div className="px-6 py-5 bg-[#1e3a8a] text-white flex items-center justify-between">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-blue-200">
                  Edit Registry Record
                </span>
                <h3 className="text-lg font-bold mt-0.5">Edit {selectedCustomer.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Worker Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Mobile Number (OTP Registered)
                </label>
                <input
                  type="text"
                  required
                  value={editMobile}
                  onChange={(e) => setEditMobile(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Trade / Construction Category
                </label>
                <input
                  type="text"
                  required
                  value={editTrade}
                  onChange={(e) => setEditTrade(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {isTamil ? "மாவட்ட வரம்பு" : "District Jurisdiction"}
                </label>
                <select
                  value={editDistrict}
                  onChange={(e) => setEditDistrict(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                >
                  {Object.keys(TN_DISTRICT_MAP).map((dist) => (
                    <option key={dist} value={dist}>
                      {formatGeoBilingual(dist).bilingual}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-bold bg-[#1e3a8a] text-white rounded-lg hover:bg-[#1e40af]"
                >
                  Save Profile Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Wallet Adjustment (admin_add_money.php / admin_deduct_money.php) */}
      {walletModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden">
            <div className="px-6 py-5 bg-[#1e3a8a] text-white flex items-center justify-between">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-blue-200">
                  Ledger Modification · admin_wallet_logs
                </span>
                <h3 className="text-lg font-bold mt-0.5">Wallet Adjustment: {selectedCustomer.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setWalletModalOpen(false)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveWalletAdjustment} className="p-6 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Transaction Guarantee:</strong> Wallet mutations run inside an atomic transaction with row locking (<code>FOR UPDATE</code>) and log audit events to <code>admin_wallet_logs</code>.
                </span>
              </div>

              {/* Action Type */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setWalletAction("CREDIT")}
                  className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold text-sm transition-all ${
                    walletAction === "CREDIT"
                      ? "border-emerald-600 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500/30"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                  Credit (Add Money)
                </button>
                <button
                  type="button"
                  onClick={() => setWalletAction("DEBIT")}
                  className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold text-sm transition-all ${
                    walletAction === "DEBIT"
                      ? "border-red-600 bg-red-50 text-red-700 ring-2 ring-red-500/30"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4 text-red-600" />
                  Debit (Deduct)
                </button>
              </div>

              {/* Wallet Pool */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Target Wallet Pool
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`p-3 rounded-xl border text-xs cursor-pointer flex flex-col gap-1 ${walletType === "CARDS" ? "border-blue-600 bg-blue-50/50" : "border-slate-200"}`}>
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="walletPool"
                        checked={walletType === "CARDS"}
                        onChange={() => setWalletType("CARDS")}
                        className="text-[#1e3a8a]"
                      />
                      <span className="font-bold text-slate-800">Cards Wallet</span>
                    </div>
                    <span className="text-slate-500 font-mono">Current: ₹{selectedCustomer.cardsWalletBalance}</span>
                  </label>
                  <label className={`p-3 rounded-xl border text-xs cursor-pointer flex flex-col gap-1 ${walletType === "PAYMENTS" ? "border-blue-600 bg-blue-50/50" : "border-slate-200"}`}>
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="walletPool"
                        checked={walletType === "PAYMENTS"}
                        onChange={() => setWalletType("PAYMENTS")}
                        className="text-[#1e3a8a]"
                      />
                      <span className="font-bold text-slate-800">Payments Wallet</span>
                    </div>
                    <span className="text-slate-500 font-mono">Current: ₹{selectedCustomer.paymentsWalletBalance}</span>
                  </label>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Amount in Rupees (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₹</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={walletAmount}
                    onChange={(e) => setWalletAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full pl-8 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] font-mono font-bold"
                  />
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Statutory Audit Reason / Remarks
                </label>
                <textarea
                  required
                  rows={2}
                  value={walletRemarks}
                  onChange={(e) => setWalletRemarks(e.target.value)}
                  placeholder="e.g. Welfare Board tool kit refund or reconciliation correction..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setWalletModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 text-sm font-bold text-white rounded-lg ${
                    walletAction === "CREDIT"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  Confirm {walletAction === "CREDIT" ? "Credit" : "Debit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
