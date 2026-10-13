"use client";

import { useState, useEffect, useCallback } from "react";
import {
  LifeBuoy,
  Search,
  Filter,
  Eye,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  X,
  Send,
  RefreshCw,
  ChevronDown,
  MessageSquare,
  ArrowUpRight,
  Loader2,
} from "lucide-react";

interface Ticket {
  id: number;
  reference_no: string;
  type: string;
  status: string;
  priority: string;
  category: string | null;
  subject: string;
  description: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  user_id: number | null;
  assigned_employee_id: number | null;
  assigned_employee_name: string | null;
  sla_hours: number;
  resolution_note: string | null;
  message_count: number;
  last_message: string | null;
  created_at: string;
  updated_at: string;
}

interface TicketDetail {
  id: number;
  reference_no: string;
  type: string;
  status: string;
  priority: string;
  category: string | null;
  subject: string;
  description: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  assigned_employee_id: number | null;
  assigned_employee_name: string | null;
  sla_hours: number;
  resolution_note: string | null;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: number;
  author_type: string;
  author_name: string;
  body: string;
  created_at: string;
}

interface Employee {
  id: number;
  name: string;
}

interface Counts {
  total: number;
  open: number;
  in_progress: number;
  escalated: number;
  resolved: number;
  closed: number;
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400",
  IN_PROGRESS: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400",
  WAITING_ON_CITIZEN: "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400",
  ESCALATED: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400",
  RESOLVED: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400",
  CLOSED: "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400",
};

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
  HIGH: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800",
  NORMAL: "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600",
  LOW: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800",
};

function formatTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [counts, setCounts] = useState<Counts>({ total: 0, open: 0, in_progress: 0, escalated: 0, resolved: 0, closed: 0 });
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedTicket, setSelectedTicket] = useState<TicketDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  const [replyText, setReplyText] = useState("");

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignEmployeeId, setAssignEmployeeId] = useState<number | "">("");
  const [assigning, setAssigning] = useState(false);

  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [resolveNote, setResolveNote] = useState("");
  const [resolving, setResolving] = useState(false);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (priorityFilter) params.set("priority", priorityFilter);
      if (employeeFilter) params.set("employeeId", employeeFilter);
      if (searchQuery) params.set("search", searchQuery);

      const res = await fetch(`/api/admin/tickets?${params.toString()}`);
      const data = await res.json();
      if (data.ok) {
        setTickets(data.tickets);
        setCounts(data.counts);
        setEmployees(data.employees);
      }
    } catch (err) {
      console.error("Failed to fetch tickets:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, employeeFilter, searchQuery]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  async function openTicketDetail(ticketId: number) {
    setSelectedTicket(null);
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}`);
      const data = await res.json();
      if (data.ok) {
        setSelectedTicket(data.ticket);
        setMessages(data.messages);
        if (data.employees.length > 0) {
          setEmployees(data.employees);
        }
      }
    } catch (err) {
      console.error("Failed to load ticket detail:", err);
    }
  }

  async function handleSendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicket) return;
    
    const replyBody = replyText.trim();
    setReplyText("");
    
    // Optimistic update - show message immediately
    const optimisticMsg: Message = {
      id: Date.now(),
      author_type: "STAFF",
      author_name: "Admin Officer",
      body: replyBody,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);
    
    try {
      await fetch(`/api/admin/tickets/${selectedTicket.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author_type: "STAFF",
          author_name: "Admin Officer",
          body: replyBody,
        }),
      });
      await openTicketDetail(selectedTicket.id);
      await fetchTickets();
    } catch (err) {
      console.error("Failed to send reply:", err);
    }
  }

  async function handleAssignEmployee() {
    if (!selectedTicket || !assignEmployeeId) return;
    setAssigning(true);
    try {
      const res = await fetch(`/api/admin/tickets/${selectedTicket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assigned_employee_id: assignEmployeeId,
          status: "IN_PROGRESS",
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setAssignModalOpen(false);
        setAssignEmployeeId("");
        await openTicketDetail(selectedTicket.id);
        await fetchTickets();
      }
    } catch (err) {
      console.error("Failed to assign employee:", err);
    } finally {
      setAssigning(false);
    }
  }

  async function handleUpdateStatus(newStatus: string) {
    if (!selectedTicket) return;
    try {
      const res = await fetch(`/api/admin/tickets/${selectedTicket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.ok) {
        await openTicketDetail(selectedTicket.id);
        await fetchTickets();
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  }

  async function handleEscalate() {
    if (!selectedTicket) return;
    await handleUpdateStatus("ESCALATED");
  }

  async function handleResolve() {
    if (!selectedTicket || !resolveNote.trim()) return;
    setResolving(true);
    try {
      const res = await fetch(`/api/admin/tickets/${selectedTicket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "RESOLVED",
          resolution_note: resolveNote.trim(),
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setResolveModalOpen(false);
        setResolveNote("");
        await openTicketDetail(selectedTicket.id);
        await fetchTickets();
      }
    } catch (err) {
      console.error("Failed to resolve ticket:", err);
    } finally {
      setResolving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <LifeBuoy className="text-[#1e3a8a] dark:text-blue-400" size={28} />
            Helpdesk Ticket Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage citizen queries, assign to employees, track SLAs, and resolve support requests.
          </p>
        </div>
        <button
          onClick={fetchTickets}
          className="px-4 py-2 rounded-lg text-sm font-bold border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Total", value: counts.total, color: "text-slate-900 dark:text-white", bg: "bg-slate-50 dark:bg-slate-800" },
          { label: "Open", value: counts.open, color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20" },
          { label: "In Progress", value: counts.in_progress, color: "text-blue-700 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20" },
          { label: "Escalated", value: counts.escalated, color: "text-red-700 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/20" },
          { label: "Resolved", value: counts.resolved, color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
          { label: "Closed", value: counts.closed, color: "text-slate-600 dark:text-slate-400", bg: "bg-slate-50 dark:bg-slate-800" },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4 border border-slate-200 dark:border-slate-700`}>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{s.label}</p>
            <p className={`text-2xl font-black mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by subject, reference, name, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-lg border border-slate-200 dark:border-slate-600 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#1e3a8a] dark:focus:ring-blue-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-600 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#1e3a8a]"
          >
            <option value="">All Status</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="ESCALATED">Escalated</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-600 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#1e3a8a]"
          >
            <option value="">All Priority</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="NORMAL">Normal</option>
            <option value="LOW">Low</option>
          </select>

          <select
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
            className="h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-600 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#1e3a8a]"
          >
            <option value="">All Employees</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-[#1e3a8a] dark:text-blue-400" size={32} />
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4">
              <MessageSquare size={28} className="text-slate-400 dark:text-slate-500" />
            </div>
            <p className="font-bold text-slate-700 dark:text-slate-200">No Tickets Found</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {searchQuery || statusFilter || priorityFilter
                ? "Try adjusting your filters."
                : "Tickets raised by citizens will appear here."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-600">
                  <th className="text-left px-4 py-3 font-bold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wide">Ticket</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wide">Subject</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wide">Citizen</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wide">Priority</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wide">Assigned To</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wide">Messages</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wide">Created</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {tickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer"
                    onClick={() => openTicketDetail(ticket.id)}
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-bold text-[#1e3a8a] dark:text-blue-400">
                        {ticket.reference_no}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-[250px]">
                      <p className="font-semibold text-slate-900 dark:text-white truncate">{ticket.subject}</p>
                      {ticket.category && (
                        <span className="text-xs text-slate-500 dark:text-slate-400">{ticket.category}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-900 dark:text-white font-medium text-xs">{ticket.contact_name || "—"}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{ticket.contact_phone || ""}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${PRIORITY_COLORS[ticket.priority] || PRIORITY_COLORS.NORMAL}`}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold ${STATUS_COLORS[ticket.status] || STATUS_COLORS.OPEN}`}>
                        {ticket.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {ticket.assigned_employee_name ? (
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          {ticket.assigned_employee_name}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 dark:text-slate-500 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
                        <MessageSquare size={12} />
                        {ticket.message_count}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                      {formatTimeAgo(ticket.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openTicketDetail(ticket.id);
                        }}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-400 hover:text-[#1e3a8a] dark:hover:text-blue-400"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ticket Detail Panel */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-2xl h-full bg-white dark:bg-slate-800 shadow-2xl flex flex-col overflow-hidden">
            {/* Detail Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 flex-shrink-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-mono text-xs font-bold text-[#1e3a8a] dark:text-blue-400">
                      {selectedTicket.reference_no}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_COLORS[selectedTicket.status]}`}>
                      {selectedTicket.status.replace(/_/g, " ")}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${PRIORITY_COLORS[selectedTicket.priority]}`}>
                      {selectedTicket.priority}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white truncate">
                    {selectedTicket.subject}
                  </h2>
                  {selectedTicket.category && (
                    <span className="text-xs font-semibold text-[#ea580c] dark:text-orange-400 mt-0.5 block">
                      {selectedTicket.category}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex-shrink-0"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Ticket Meta */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Citizen</p>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                    {selectedTicket.contact_name || "—"}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{selectedTicket.contact_phone || ""}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Assigned To</p>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                    {selectedTicket.assigned_employee_name || "Unassigned"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">SLA</p>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                    {selectedTicket.sla_hours}h
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Created</p>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                    {new Date(selectedTicket.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 mt-4">
                {selectedTicket.status !== "IN_PROGRESS" && selectedTicket.status !== "RESOLVED" && selectedTicket.status !== "CLOSED" && (
                  <button
                    onClick={() => handleUpdateStatus("IN_PROGRESS")}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 flex items-center gap-1"
                  >
                    <Clock size={12} /> Mark In Progress
                  </button>
                )}
                <button
                  onClick={() => {
                    setAssignEmployeeId(selectedTicket.assigned_employee_id || "");
                    setAssignModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 flex items-center gap-1"
                >
                  <UserCheck size={12} /> Assign Employee
                </button>
                {selectedTicket.status !== "ESCALATED" && selectedTicket.status !== "RESOLVED" && selectedTicket.status !== "CLOSED" && (
                  <button
                    onClick={handleEscalate}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 flex items-center gap-1"
                  >
                    <AlertTriangle size={12} /> Escalate
                  </button>
                )}
                {selectedTicket.status !== "RESOLVED" && selectedTicket.status !== "CLOSED" && (
                  <button
                    onClick={() => setResolveModalOpen(true)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 flex items-center gap-1"
                  >
                    <CheckCircle2 size={12} /> Resolve
                  </button>
                )}
                {selectedTicket.status === "RESOLVED" && (
                  <button
                    onClick={() => handleUpdateStatus("CLOSED")}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center gap-1"
                  >
                    <CheckCircle2 size={12} /> Close Ticket
                  </button>
                )}
              </div>
            </div>

            {/* Messages Thread */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">No messages yet.</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.author_type === "CITIZEN" ? "items-end" : "items-start"}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 text-[11px] text-slate-400 dark:text-slate-500">
                      <strong className={msg.author_type === "STAFF" ? "text-[#1e3a8a] dark:text-blue-400" : "text-slate-700 dark:text-slate-300"}>
                        {msg.author_name}
                      </strong>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        msg.author_type === "STAFF"
                          ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                          : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                      }`}>
                        {msg.author_type}
                      </span>
                      <span>·</span>
                      <span>{formatTimeAgo(msg.created_at)}</span>
                    </div>
                    <div
                      className={`max-w-md p-3.5 rounded-xl text-sm leading-relaxed ${
                        msg.author_type === "CITIZEN"
                          ? "bg-[#1e3a8a] text-white rounded-tr-sm"
                          : "bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-sm border border-slate-200 dark:border-slate-600"
                      }`}
                    >
                      {msg.body}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Reply Input */}
            {selectedTicket.status !== "CLOSED" && (
              <form
                onSubmit={handleSendReply}
                className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex gap-2 flex-shrink-0"
              >
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your reply to the citizen..."
                  className="flex-1 h-11 px-4 rounded-lg border border-slate-200 dark:border-slate-600 text-sm outline-none focus:ring-2 focus:ring-[#1e3a8a] dark:focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim()}
                  className="px-5 h-11 rounded-lg bg-[#1e3a8a] text-white font-bold text-sm flex items-center gap-1.5 disabled:opacity-50 hover:bg-[#1e40af] shadow-sm"
                >
                  <Send size={14} />
                  <span>Send</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Assign Employee Modal */}
      {assignModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700 mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Assign Employee</h3>
              <button onClick={() => setAssignModalOpen(false)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Select Employee</label>
                <select
                  value={assignEmployeeId}
                  onChange={(e) => setAssignEmployeeId(e.target.value ? Number(e.target.value) : "")}
                  className="w-full h-11 px-3.5 rounded-lg border border-slate-200 dark:border-slate-600 text-sm outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-[#1e3a8a]"
                >
                  <option value="">Choose an employee...</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAssignModalOpen(false)}
                  className="flex-1 py-2.5 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignEmployee}
                  disabled={!assignEmployeeId || assigning}
                  className="flex-1 py-2.5 rounded-lg text-xs font-bold bg-[#1e3a8a] text-white hover:bg-[#1e40af] shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {assigning ? <Loader2 size={12} className="animate-spin" /> : <UserCheck size={12} />}
                  Assign
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      {resolveModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700 mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-600" />
                Resolve Ticket
              </h3>
              <button onClick={() => setResolveModalOpen(false)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Resolution Notes</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Describe how the issue was resolved..."
                  value={resolveNote}
                  onChange={(e) => setResolveNote(e.target.value)}
                  className="w-full p-3.5 rounded-lg border border-slate-200 dark:border-slate-600 text-sm outline-none resize-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResolveModalOpen(false)}
                  className="flex-1 py-2.5 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResolve}
                  disabled={!resolveNote.trim() || resolving}
                  className="flex-1 py-2.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {resolving ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                  Mark Resolved
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
