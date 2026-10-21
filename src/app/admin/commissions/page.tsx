"use client";

import { useState, useMemo } from "react";
import {
  Percent,
  Search,
  Filter,
  Download,
  Edit,
  Save,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Building,
  Store,
  Wallet,
  DollarSign,
  Calculator,
  X,
  Layers,
  ArrowRight,
  ShieldCheck,
  Sliders,
} from "lucide-react";

interface ServiceCommission {
  id: string;
  serviceCode: string;
  serviceName: string;
  category: string;
  govtFee: number;
  citizenTotal: number;
  retailerCut: number;
  distributorCut: number;
  platformFee: number;
  welfareCessPct: number;
  status: "ACTIVE" | "REVISED";
  lastUpdated: string;
}

const initialCommissions: ServiceCommission[] = [];


export default function AdminCommissionsPage() {
  const [commissions, setCommissions] = useState<ServiceCommission[]>(initialCommissions);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  // Modals
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [calcModalOpen, setCalcModalOpen] = useState(false);
  const [selectedCommission, setSelectedCommission] = useState<ServiceCommission | null>(null);
  const [toastMessage, setToastMessage] = useState("");

  // Edit form state
  const [editGovtFee, setEditGovtFee] = useState(0);
  const [editCitizenTotal, setEditCitizenTotal] = useState(0);
  const [editRetailerCut, setEditRetailerCut] = useState(0);
  const [editDistributorCut, setEditDistributorCut] = useState(0);
  const [editPlatformFee, setEditPlatformFee] = useState(0);
  const [editCessPct, setEditCessPct] = useState(0);

  // Calculator simulation state
  const [simServiceId, setSimServiceId] = useState("COM-01");
  const [simVolume, setSimVolume] = useState("500");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  const filteredCommissions = useMemo(() => {
    return commissions.filter((c) => {
      const matchesSearch =
        c.serviceName.toLowerCase().includes(search.toLowerCase()) ||
        c.serviceCode.toLowerCase().includes(search.toLowerCase()) ||
        c.category.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === "ALL" || c.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [commissions, search, categoryFilter]);

  const handleOpenEdit = (comm: ServiceCommission) => {
    setSelectedCommission(comm);
    setEditGovtFee(comm.govtFee);
    setEditCitizenTotal(comm.citizenTotal);
    setEditRetailerCut(comm.retailerCut);
    setEditDistributorCut(comm.distributorCut);
    setEditPlatformFee(comm.platformFee);
    setEditCessPct(comm.welfareCessPct);
    setEditModalOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCommission) return;

    setCommissions((prev) =>
      prev.map((c) =>
        c.id === selectedCommission.id
          ? {
              ...c,
              govtFee: editGovtFee,
              citizenTotal: editCitizenTotal,
              retailerCut: editRetailerCut,
              distributorCut: editDistributorCut,
              platformFee: editPlatformFee,
              welfareCessPct: editCessPct,
              status: "REVISED",
              lastUpdated: "Today",
            }
          : c
      )
    );

    setEditModalOpen(false);
    showToast(`Commission splits for ${selectedCommission.serviceCode} updated.`);
  };

  const simSelected = commissions.find((c) => c.id === simServiceId) || commissions[0];
  const volumeNum = parseInt(simVolume) || 0;
  const simTotalRevenue = volumeNum * simSelected.citizenTotal;
  const simRetailerPayout = volumeNum * simSelected.retailerCut;
  const simDistributorPayout = volumeNum * simSelected.distributorCut;
  const simPlatformNet = volumeNum * simSelected.platformFee;

  const exportCSV = () => {
    const headers = ["Service Code", "Service Name", "Category", "Govt Fee", "Citizen Total", "Retailer Cut", "Distributor Cut", "Platform Fee", "Cess %"];
    const rows = filteredCommissions.map((c) => [
      c.serviceCode,
      c.serviceName,
      c.category,
      c.govtFee,
      c.citizenTotal,
      c.retailerCut,
      c.distributorCut,
      c.platformFee,
      c.welfareCessPct,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "labourseva_commissions_matrix.csv");
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
                <Percent className="w-3.5 h-3.5 text-amber-300" />
                Commission Rules Matrix (admin_commissions.php)
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Service Pricing & Commission Splits</h1>
              <p className="mt-1 text-sm sm:text-base text-blue-100 max-w-2xl">
                Define statutory government fees, CSC retailer margins, zonal distributor royalties, and platform maintenance fees across services.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={exportCSV}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold border border-white/20 transition-all backdrop-blur-sm shadow-sm"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              <button
                type="button"
                onClick={() => setCalcModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] text-white text-sm font-bold shadow-md hover:shadow-lg transition-all"
              >
                <Calculator className="w-4 h-4" />
                Revenue Simulator
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/15">
            <div>
              <p className="text-xs text-blue-200 font-medium">Configured Services</p>
              <p className="text-2xl font-black mt-1">{commissions.length} Active</p>
            </div>
            <div>
              <p className="text-xs text-blue-200 font-medium">Avg Retailer Margin</p>
              <p className="text-2xl font-black mt-1 text-emerald-300">
                ₹{commissions.length ? Math.round(commissions.reduce((s, c) => s + c.retailerCut, 0) / commissions.length) : 0} / order
              </p>
            </div>
            <div>
              <p className="text-xs text-blue-200 font-medium">Avg Distro Royalty</p>
              <p className="text-2xl font-black mt-1 text-blue-200">
                ₹{commissions.length ? Math.round(commissions.reduce((s, c) => s + c.distributorCut, 0) / commissions.length) : 0} / order
              </p>
            </div>
            <div>
              <p className="text-xs text-blue-200 font-medium">Statutory Cess Rate</p>
              <p className="text-2xl font-black mt-1 text-amber-300">
                {commissions.length ? (commissions.reduce((s, c) => s + c.welfareCessPct, 0) / commissions.length).toFixed(1) : "0.0"}% BOCW
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
              placeholder="Search by Service Code, Service Name, or Category..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:bg-white transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
          >
            <option value="ALL">All Categories</option>
            <option value="Welfare Card">Welfare Card</option>
            <option value="Welfare Grants">Welfare Grants</option>
            <option value="Education">Education</option>
            <option value="Equipment">Equipment</option>
            <option value="Social Security">Social Security</option>
          </select>
        </div>
      </div>

      {/* Commissions Matrix Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto w-full scrollbar-thin">
          <table className="w-full min-w-[900px] text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-700">
              <tr>
                <th className="px-5 py-4 whitespace-nowrap">Service &amp; Code</th>
                <th className="px-5 py-4 whitespace-nowrap">Citizen Total</th>
                <th className="px-5 py-4 whitespace-nowrap">Govt Fee</th>
                <th className="px-5 py-4 whitespace-nowrap">Retailer Cut</th>
                <th className="px-5 py-4 whitespace-nowrap">Distributor Cut</th>
                <th className="px-5 py-4 whitespace-nowrap">Platform Fee</th>
                <th className="px-5 py-4 text-right whitespace-nowrap min-w-[70px]">Edit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCommissions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                    <Sliders className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No Commission Tariffs Configured</p>
                    <p className="text-xs text-slate-500 mt-1">Configure service commission split rules to display rates here.</p>
                  </td>
                </tr>
              ) : (
                filteredCommissions.map((comm) => (
                  <tr key={comm.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900 text-base">{comm.serviceName}</div>
                      <div className="text-xs font-mono text-[#1e3a8a] font-semibold mt-0.5">
                        {comm.serviceCode} · <span className="text-slate-500">{comm.category}</span>
                      </div>
                    </td>

                    <td className="px-5 py-4 font-mono font-bold text-slate-900 text-sm whitespace-nowrap">
                      {comm.citizenTotal === 0 ? "FREE" : `₹${comm.citizenTotal}`}
                    </td>

                    <td className="px-5 py-4 font-mono font-medium text-slate-700 whitespace-nowrap">
                      {comm.govtFee === 0 ? "₹0 (Subs)" : `₹${comm.govtFee}`}
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="font-mono font-bold text-emerald-700">₹{comm.retailerCut}</span>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="font-mono font-bold text-blue-700">₹{comm.distributorCut}</span>
                    </td>

                    <td className="px-5 py-4 font-mono text-slate-700 whitespace-nowrap">
                      ₹{comm.platformFee}
                    </td>

                    <td className="px-5 py-4 text-right whitespace-nowrap min-w-[70px]">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(comm)}
                        className="p-1.5 text-slate-600 hover:text-[#1e3a8a] hover:bg-slate-100 rounded-lg transition-colors shrink-0"
                        title="Edit Split Rules"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Edit Commission Splits */}
      {editModalOpen && selectedCommission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden">
            <div className="px-6 py-5 bg-[#1e3a8a] text-white flex items-center justify-between">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-blue-200">
                  Tariff Configuration · {selectedCommission.serviceCode}
                </span>
                <h3 className="text-lg font-bold mt-0.5">{selectedCommission.serviceName}</h3>
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Citizen Total Payable (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editCitizenTotal}
                    onChange={(e) => setEditCitizenTotal(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Statutory Government Fee (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editGovtFee}
                    onChange={(e) => setEditGovtFee(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">
                    Retailer Cut (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editRetailerCut}
                    onChange={(e) => setEditRetailerCut(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-emerald-300 bg-emerald-50/40 rounded-lg font-mono font-bold text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-blue-800 uppercase tracking-wider mb-1">
                    Distro Cut (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editDistributorCut}
                    onChange={(e) => setEditDistributorCut(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-blue-300 bg-blue-50/40 rounded-lg font-mono font-bold text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Platform (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editPlatformFee}
                    onChange={(e) => setEditPlatformFee(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Welfare Board Statutory Cess (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  required
                  value={editCessPct}
                  onChange={(e) => setEditCessPct(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                />
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
                  Save Split Rules
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Revenue Simulation Calculator */}
      {calcModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden">
            <div className="px-6 py-5 bg-[#1e3a8a] text-white flex items-center justify-between">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-blue-200">
                  Revenue Simulation
                </span>
                <h3 className="text-lg font-bold mt-0.5">Partner Margin Projection</h3>
              </div>
              <button
                type="button"
                onClick={() => setCalcModalOpen(false)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Select Benchmark Service
                </label>
                <select
                  value={simServiceId}
                  onChange={(e) => setSimServiceId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                >
                  {commissions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.serviceName} ({c.serviceCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Estimated Monthly Order Volume
                </label>
                <input
                  type="number"
                  min="1"
                  value={simVolume}
                  onChange={(e) => setSimVolume(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                />
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600">Total Citizen Collections:</span>
                  <strong className="font-mono text-slate-900">₹{simTotalRevenue.toLocaleString()}</strong>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-emerald-700 font-semibold">CSC Retailer Cumulative Earnings:</span>
                  <strong className="font-mono text-emerald-700">₹{simRetailerPayout.toLocaleString()}</strong>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-blue-700 font-semibold">Zonal Distributor Royalties:</span>
                  <strong className="font-mono text-blue-700">₹{simDistributorPayout.toLocaleString()}</strong>
                </div>
                <div className="flex justify-between text-xs pt-2 border-t border-slate-200">
                  <span className="text-slate-800 font-bold">LabourSeva Platform Retained:</span>
                  <strong className="font-mono text-slate-900 font-bold">₹{simPlatformNet.toLocaleString()}</strong>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setCalcModalOpen(false)}
                className="px-4 py-2 text-xs font-bold bg-[#1e3a8a] text-white rounded-lg hover:bg-[#1e40af]"
              >
                Close Calculator
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
