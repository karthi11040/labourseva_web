"use client";

import { useState, useMemo } from "react";
import {
  Bell,
  Search,
  Filter,
  Download,
  Plus,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ExternalLink,
  Trash2,
  X,
  Volume2,
  Users,
  Store,
  Building2,
  Calendar,
  Layers,
  Megaphone,
} from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  titleTamil: string;
  message: string;
  slot: "POPUP_MODAL" | "HEADER_TICKER" | "DASHBOARD_BANNER";
  targetAudience: "ALL" | "CUSTOMERS" | "RETAILERS" | "DISTRIBUTORS";
  actionUrl?: string;
  viewsCount: number;
  status: "ACTIVE" | "SCHEDULED" | "EXPIRED";
  publishDate: string;
  expiryDate: string;
}

const initialAnnouncements: Announcement[] = [];


export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>(initialAnnouncements);
  const [search, setSearch] = useState("");
  const [slotFilter, setSlotFilter] = useState("ALL");
  const [audienceFilter, setAudienceFilter] = useState("ALL");

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Create form state
  const [newTitle, setNewTitle] = useState("");
  const [newTitleTamil, setNewTitleTamil] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [newSlot, setNewSlot] = useState<Announcement["slot"]>("POPUP_MODAL");
  const [newAudience, setNewAudience] = useState<Announcement["targetAudience"]>("ALL");
  const [newUrl, setNewUrl] = useState("");
  const [newExpiry, setNewExpiry] = useState("31-Dec-2026");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  const filteredAnnouncements = useMemo(() => {
    return announcements.filter((a) => {
      const matchesSearch =
        a.title.toLowerCase().includes(search.toLowerCase()) ||
        a.titleTamil.toLowerCase().includes(search.toLowerCase()) ||
        a.message.toLowerCase().includes(search.toLowerCase());
      const matchesSlot = slotFilter === "ALL" || a.slot === slotFilter;
      const matchesAudience = audienceFilter === "ALL" || a.targetAudience === audienceFilter;
      return matchesSearch && matchesSlot && matchesAudience;
    });
  }, [announcements, search, slotFilter, audienceFilter]);

  const handleCreateAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = `ANN-${String(announcements.length + 1).padStart(2, "0")}`;
    const newEntry: Announcement = {
      id: newId,
      title: newTitle,
      titleTamil: newTitleTamil,
      message: newMessage,
      slot: newSlot,
      targetAudience: newAudience,
      actionUrl: newUrl || undefined,
      viewsCount: 0,
      status: "ACTIVE",
      publishDate: "Today",
      expiryDate: newExpiry,
    };

    setAnnouncements([newEntry, ...announcements]);
    setCreateModalOpen(false);
    showToast(`Notice ${newTitle} published live.`);
    // Reset form
    setNewTitle("");
    setNewTitleTamil("");
    setNewMessage("");
    setNewUrl("");
  };

  const toggleAnnouncementStatus = (aId: string) => {
    setAnnouncements((prev) =>
      prev.map((a) => {
        if (a.id !== aId) return a;
        const nextStatus = a.status === "ACTIVE" ? "EXPIRED" : "ACTIVE";
        return { ...a, status: nextStatus };
      })
    );
    showToast(`Announcement status updated.`);
  };

  const handleDeleteAnnouncement = (aId: string) => {
    if (!confirm("Are you sure you want to remove this announcement broadcast?")) return;
    setAnnouncements((prev) => prev.filter((a) => a.id !== aId));
    showToast(`Announcement removed.`);
  };

  const exportCSV = () => {
    const headers = ["ID", "Title (English)", "Title (Tamil)", "Slot", "Target Audience", "Views", "Status", "Expiry"];
    const rows = filteredAnnouncements.map((a) => [
      a.id,
      a.title,
      a.titleTamil,
      a.slot,
      a.targetAudience,
      a.viewsCount,
      a.status,
      a.expiryDate,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "labourseva_announcements.csv");
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
                <Volume2 className="w-3.5 h-3.5 text-amber-300" />
                Public Broadcasts & Tickers (admin_announcements.php)
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Announcements & News Tickers</h1>
              <p className="mt-1 text-sm sm:text-base text-blue-100 max-w-2xl">
                Broadcast official government notifications, live ticker updates, and popup warnings across citizen, retailer, and distributor portals.
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
                onClick={() => setCreateModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] text-white text-sm font-bold shadow-md hover:shadow-lg transition-all"
              >
                <Plus className="w-4 h-4" />
                New Broadcast
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/15">
            <div>
              <p className="text-xs text-blue-200 font-medium">Live Broadcasts</p>
              <p className="text-2xl font-black mt-1">
                {announcements.filter((a) => a.status === "ACTIVE").length} Active
              </p>
            </div>
            <div>
              <p className="text-xs text-blue-200 font-medium">Header Ticker</p>
              <p className="text-2xl font-black mt-1 text-emerald-300">
                {announcements.filter((a) => a.status === "ACTIVE" && a.slot === "HEADER_TICKER").length} Online
              </p>
            </div>
            <div>
              <p className="text-xs text-blue-200 font-medium">Total Impressions</p>
              <p className="text-2xl font-black mt-1 text-white">
                {announcements.reduce((s, a) => s + a.viewsCount, 0).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-blue-200 font-medium">Scheduled Future</p>
              <p className="text-2xl font-black mt-1 text-amber-300">
                {announcements.filter((a) => a.status === "SCHEDULED").length} Pipeline
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
              placeholder="Search announcements by English or Tamil title..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:bg-white transition-all"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <select
              value={slotFilter}
              onChange={(e) => setSlotFilter(e.target.value)}
              className="text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
            >
              <option value="ALL">All Slots</option>
              <option value="POPUP_MODAL">Popup Modal</option>
              <option value="HEADER_TICKER">Header Ticker</option>
              <option value="DASHBOARD_BANNER">Dashboard Banner</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={audienceFilter}
              onChange={(e) => setAudienceFilter(e.target.value)}
              className="text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
            >
              <option value="ALL">All Audiences</option>
              <option value="CUSTOMERS">Workers (Customers)</option>
              <option value="RETAILERS">CSC Retailers</option>
              <option value="DISTRIBUTORS">Zonal Distributors</option>
            </select>
          </div>
        </div>
      </div>

      {/* Announcements Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto w-full scrollbar-thin">
          <table className="w-full min-w-[950px] text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-700">
              <tr>
                <th className="px-5 py-4 min-w-[280px]">Title & Message</th>
                <th className="px-5 py-4 whitespace-nowrap">Placement Slot</th>
                <th className="px-5 py-4 whitespace-nowrap">Target Audience</th>
                <th className="px-5 py-4 whitespace-nowrap">Impressions</th>
                <th className="px-5 py-4 whitespace-nowrap">Status</th>
                <th className="px-5 py-4 whitespace-nowrap text-right min-w-[100px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAnnouncements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                    <Megaphone className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No Announcements Published</p>
                    <p className="text-xs text-slate-500 mt-1">Create official broadcasts or marquee tickers to notify platform users.</p>
                  </td>
                </tr>
              ) : (
                filteredAnnouncements.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4 max-w-md">
                      <div className="font-bold text-slate-900 text-base">{a.title}</div>
                      <div className="text-xs text-[#1e3a8a] font-medium mt-0.5">{a.titleTamil}</div>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{a.message}</p>
                      <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                        <span>Expires: {a.expiryDate}</span>
                        {a.actionUrl && (
                          <span className="font-mono text-[#1e3a8a] font-semibold">Link: {a.actionUrl}</span>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="shrink-0 whitespace-nowrap inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800">
                        {a.slot.replace("_", " ")}
                      </span>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="shrink-0 whitespace-nowrap inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-[#1e3a8a] border border-blue-200/60">
                        {a.targetAudience}
                      </span>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap font-mono font-bold text-slate-900 text-sm">
                      {a.viewsCount.toLocaleString()} views
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <span
                        className={`shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                          a.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : a.status === "SCHEDULED"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}
                      >
                        {a.status}
                      </span>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap text-right min-w-[100px]">
                      <div className="inline-flex items-center gap-1.5 justify-end flex-nowrap">
                        <button
                          type="button"
                          onClick={() => toggleAnnouncementStatus(a.id)}
                          className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                            a.status === "ACTIVE" ? "text-amber-600 hover:bg-amber-50" : "text-emerald-600 hover:bg-emerald-50"
                          }`}
                          title={a.status === "ACTIVE" ? "Pause / Expire" : "Make Live"}
                        >
                          {a.status === "ACTIVE" ? <Clock className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAnnouncement(a.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                          title="Delete Broadcast"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* MODAL: Create New Announcement */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 bg-[#1e3a8a] text-white flex items-center justify-between">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-blue-200">
                  New Broadcast · admin_announcements.php
                </span>
                <h3 className="text-lg font-bold mt-0.5">Publish Official Notice</h3>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAnnouncement} className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Notice Title (English)
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Welfare Board Pension Renewal Deadline"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  அறிவிப்பு தலைப்பு (Tamil Title)
                </label>
                <input
                  type="text"
                  required
                  value={newTitleTamil}
                  onChange={(e) => setNewTitleTamil(e.target.value)}
                  placeholder="எ.கா. ஓய்வூதிய புதுப்பித்தல் காலக்கெடு"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Full Announcement Text
                </label>
                <textarea
                  rows={3}
                  required
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Detailed notification content for citizens or partners..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Placement Slot
                  </label>
                  <select
                    value={newSlot}
                    onChange={(e) => setNewSlot(e.target.value as Announcement["slot"])}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                  >
                    <option value="POPUP_MODAL">Popup Modal Dialog</option>
                    <option value="HEADER_TICKER">Top News Ticker</option>
                    <option value="DASHBOARD_BANNER">Dashboard Hero Banner</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Target Audience
                  </label>
                  <select
                    value={newAudience}
                    onChange={(e) => setNewAudience(e.target.value as Announcement["targetAudience"])}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                  >
                    <option value="ALL">All Audiences (Public)</option>
                    <option value="CUSTOMERS">Workers / Citizens Only</option>
                    <option value="RETAILERS">CSC Retailers Only</option>
                    <option value="DISTRIBUTORS">Zonal Distributors Only</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Action URL (Optional)
                  </label>
                  <input
                    type="text"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="/schemes or https://..."
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Auto-Expiry Date
                  </label>
                  <input
                    type="text"
                    value={newExpiry}
                    onChange={(e) => setNewExpiry(e.target.value)}
                    placeholder="31-Dec-2026"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-bold bg-[#1e3a8a] text-white rounded-lg hover:bg-[#1e40af]"
                >
                  Publish Announcement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
