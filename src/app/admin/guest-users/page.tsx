"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  RefreshCw,
  Download,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  ExternalLink,
  ShoppingBag,
  ShieldCheck,
  ChevronRight,
  X,
  Filter,
} from "lucide-react";

interface GuestUser {
  id: number;
  name: string;
  phone: string;
  email: string;
  status: string;
  verificationStatus: string;
  profileStatus: string;
  district: string;
  address: string;
  idNumber: string;
  documentPath: string | null;
  hasDocument: boolean;
  ordersCount: number;
  ordersTotal: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export default function AdminGuestUsersPage() {
  const [guests, setGuests] = useState<GuestUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "approved" | "pending" | "with_orders">("all");
  const [selectedGuest, setSelectedGuest] = useState<GuestUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchGuests = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/guest-users");
      const data = await res.json();
      if (res.ok && data.ok) {
        setGuests(data.guests || []);
      } else {
        setError(data.error || "Failed to load guest users.");
      }
    } catch {
      setError("Network error fetching guest records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuests();
  }, []);

  // Filtered and searched records
  const filteredGuests = useMemo(() => {
    return guests.filter((g) => {
      // Tab filter
      if (filterTab === "approved") {
        const isApproved =
          g.verificationStatus.toLowerCase() === "approved" ||
          g.profileStatus.toLowerCase() === "verified";
        if (!isApproved) return false;
      } else if (filterTab === "pending") {
        if (g.verificationStatus.toLowerCase() !== "pending") return false;
      } else if (filterTab === "with_orders") {
        if (g.ordersCount === 0) return false;
      }

      // Text search
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        g.name.toLowerCase().includes(q) ||
        g.phone.includes(q) ||
        g.email.toLowerCase().includes(q) ||
        g.district.toLowerCase().includes(q) ||
        String(g.id).includes(q)
      );
    });
  }, [guests, filterTab, search]);

  // Aggregate stats
  const stats = useMemo(() => {
    const total = guests.length;
    const verified = guests.filter(
      (g) =>
        g.verificationStatus.toLowerCase() === "approved" ||
        g.profileStatus.toLowerCase() === "verified"
    ).length;
    const totalOrders = guests.reduce((sum, g) => sum + g.ordersCount, 0);
    const totalRevenue = guests.reduce((sum, g) => sum + g.ordersTotal, 0);
    return { total, verified, totalOrders, totalRevenue };
  }, [guests]);

  // CSV Export
  const exportCSV = () => {
    const headers = [
      "Guest ID",
      "Full Name",
      "Phone",
      "Email",
      "District",
      "Address",
      "Verification Status",
      "Orders Count",
      "Orders Total (INR)",
      "Registered Date",
    ];
    const rows = filteredGuests.map((g) => [
      g.id,
      `"${g.name.replace(/"/g, '""')}"`,
      `"${g.phone}"`,
      `"${g.email}"`,
      `"${g.district}"`,
      `"${(g.address || "").replace(/"/g, '""')}"`,
      g.verificationStatus,
      g.ordersCount,
      g.ordersTotal,
      g.createdAt ? new Date(g.createdAt).toISOString() : "",
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `labourseva_guest_users_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#ea580c]">
              Public Walk-in Registry
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-[#1e3a8a]">
              MySQL Database Connected
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
            Guest Users Directory
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            Real database records of citizens accessing non-registered services, tracking emergency claims, and guest orders.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchGuests}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            title="Refresh database records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>

          <button
            onClick={exportCSV}
            disabled={filteredGuests.length === 0}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold bg-[#1e3a8a] text-white rounded-lg hover:bg-[#1e40af] transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            title="Export filtered records to CSV"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-900 text-xs font-semibold flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-slate-400 hover:text-slate-700 ml-4">
            ×
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Walk-in Guests
            </span>
            <Users className="w-4 h-4 text-[#1e3a8a]" />
          </div>
          <p className="mt-2 text-2xl font-black text-slate-950">{stats.total}</p>
          <span className="text-[10px] text-slate-500">Live records in database</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              KYC Approved
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-700">{stats.verified}</p>
          <span className="text-[10px] text-slate-500">Verified identity documents</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Service Orders Placed
            </span>
            <ShoppingBag className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-slate-950">{stats.totalOrders}</p>
          <span className="text-[10px] text-slate-500">Single-use services availed</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Order Revenue
            </span>
            <span className="text-xs font-bold text-slate-400">INR</span>
          </div>
          <p className="mt-2 text-2xl font-black text-[#ea580c]">₹{stats.totalRevenue.toLocaleString()}</p>
          <span className="text-[10px] text-slate-500">Guest transaction volume</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center gap-1 text-xs font-bold text-slate-500 mr-1">
            <Filter className="w-3.5 h-3.5" /> View:
          </div>
          {[
            { id: "all", label: `All Guests (${guests.length})` },
            {
              id: "approved",
              label: `Approved (${
                guests.filter(
                  (g) =>
                    g.verificationStatus.toLowerCase() === "approved" ||
                    g.profileStatus.toLowerCase() === "verified"
                ).length
              })`,
            },
            {
              id: "pending",
              label: `Pending KYC (${
                guests.filter((g) => g.verificationStatus.toLowerCase() === "pending").length
              })`,
            },
            {
              id: "with_orders",
              label: `With Placed Orders (${guests.filter((g) => g.ordersCount > 0).length})`,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterTab === tab.id
                  ? "bg-[#1e3a8a] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[260px] flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, email, district..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] bg-slate-50/50"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto w-full scrollbar-thin">
          <table className="w-full min-w-[980px] text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4 whitespace-nowrap">Guest ID</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Citizen Name</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Contacts</th>
                <th className="py-3.5 px-4 whitespace-nowrap">District</th>
                <th className="py-3.5 px-4 whitespace-nowrap">KYC Status</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Service Orders</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Registered Date</th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap min-w-[110px]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {loading && guests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#1e3a8a]" />
                    Loading guest records from database...
                  </td>
                </tr>
              ) : filteredGuests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No guest users matching criteria.
                  </td>
                </tr>
              ) : (
                filteredGuests.map((guest) => {
                  const isVerified =
                    guest.verificationStatus.toLowerCase() === "approved" ||
                    guest.profileStatus.toLowerCase() === "verified";
                  return (
                    <tr
                      key={guest.id}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      onClick={() => setSelectedGuest(guest)}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700">
                          #{guest.id}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-950 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="truncate max-w-[180px]">{guest.name}</span>
                          {guest.hasDocument && (
                            <span
                              title="ID Document uploaded"
                              className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"
                            />
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <div className="font-mono text-slate-900 font-semibold flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{guest.phone || "—"}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 truncate max-w-[180px]">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{guest.email || "—"}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-medium text-slate-700 whitespace-nowrap">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{guest.district}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`shrink-0 whitespace-nowrap inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] capitalize ${
                            isVerified
                              ? "bg-emerald-100 text-emerald-800"
                              : guest.verificationStatus.toLowerCase() === "rejected"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {isVerified ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-700 shrink-0" />
                          ) : (
                            <Clock className="w-3 h-3 text-amber-700 shrink-0" />
                          )}
                          <span>{guest.verificationStatus}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono whitespace-nowrap">
                        {guest.ordersCount > 0 ? (
                          <div className="font-semibold text-slate-900">
                            {guest.ordersCount} orders{" "}
                            <span className="text-[#ea580c] font-bold">(₹{guest.ordersTotal})</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">0 orders</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {guest.createdAt
                          ? new Date(guest.createdAt).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap min-w-[110px]">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedGuest(guest);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-[#1e3a8a] bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer shrink-0"
                        >
                          <span>Inspect</span> <ChevronRight className="w-3 h-3 shrink-0" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Guest Details Drawer Modal */}
      {selectedGuest && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold">
                  Guest User #{selectedGuest.id}
                </span>
                <h2 className="mt-1 text-lg font-black text-slate-950">{selectedGuest.name}</h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedGuest(null)}
                className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Contact Information */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5 text-xs">
                <h3 className="font-bold uppercase tracking-wider text-slate-600 text-[11px]">
                  Contact & Identification
                </h3>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Mobile Phone</span>
                    <strong className="font-mono text-slate-900 font-bold block">
                      {selectedGuest.phone || "Not recorded"}
                    </strong>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px]">Email Address</span>
                    <strong className="text-slate-900 font-bold block truncate">
                      {selectedGuest.email || "Not recorded"}
                    </strong>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px]">District Jurisdiction</span>
                    <strong className="text-slate-900 font-bold block">{selectedGuest.district}</strong>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px]">Account Created</span>
                    <strong className="font-mono text-slate-900 font-bold block text-[11px]">
                      {selectedGuest.createdAt
                        ? new Date(selectedGuest.createdAt).toLocaleString("en-IN")
                        : "—"}
                    </strong>
                  </div>
                </div>

                {selectedGuest.address && (
                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-slate-400 block text-[10px]">Residential Address</span>
                    <p className="font-semibold text-slate-800 whitespace-pre-line mt-0.5 text-[11px]">
                      {selectedGuest.address}
                    </p>
                  </div>
                )}
              </div>

              {/* Service Orders Summary */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[10px]">Emergency / Service Orders</span>
                  <strong className="text-slate-900 font-bold text-sm">
                    {selectedGuest.ordersCount} orders placed
                  </strong>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px]">Total Amount</span>
                  <strong className="text-[#ea580c] font-black text-base">
                    ₹{selectedGuest.ordersTotal.toLocaleString()}
                  </strong>
                </div>
              </div>

              {/* KYC Document Card */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold uppercase tracking-wider text-slate-600 text-[11px]">
                    KYC Verification Asset
                  </h3>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize ${
                      selectedGuest.verificationStatus.toLowerCase() === "approved"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {selectedGuest.verificationStatus}
                  </span>
                </div>

                {selectedGuest.hasDocument && selectedGuest.documentPath ? (
                  <div className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[#1e3a8a]/10 text-[#1e3a8a] flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <strong className="block text-slate-900 truncate">Identity Proof File</strong>
                        <span className="font-mono text-[10px] text-slate-400 block truncate">
                          {selectedGuest.documentPath}
                        </span>
                      </div>
                    </div>
                    <a
                      href={`/${selectedGuest.documentPath.replace(/^\/+/, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-[#1e3a8a] text-white rounded-lg font-bold text-[11px] hover:bg-[#1e40af] transition-colors shrink-0 flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" /> Inspect
                    </a>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>No document uploaded yet by this guest applicant.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <Link
                href={`/admin/verification`}
                className="text-xs font-bold text-[#1e3a8a] hover:underline flex items-center gap-1"
              >
                Open in Verification Queue →
              </Link>
              <button
                type="button"
                onClick={() => setSelectedGuest(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
