"use client";

import { useState, useEffect, useCallback } from "react";
import {
  LifeBuoy,
  Plus,
  MessageSquare,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Send,
  Loader2,
  RefreshCw,
} from "lucide-react";

interface Ticket {
  id: number;
  reference_no: string;
  status: string;
  priority: string;
  category: string | null;
  subject: string;
  sla_hours: number;
  assigned_employee_name: string | null;
  message_count: number;
  last_message: string | null;
  created_at: string;
  updated_at: string;
}

interface TicketDetail {
  id: number;
  reference_no: string;
  status: string;
  priority: string;
  category: string | null;
  subject: string;
  description: string;
  contact_name: string | null;
  sla_hours: number;
  resolution_note: string | null;
  assigned_employee_name: string | null;
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

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  WAITING_ON_CITIZEN: "Awaiting Your Reply",
  ESCALATED: "Escalated",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400",
  IN_PROGRESS: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400",
  WAITING_ON_CITIZEN: "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400",
  ESCALATED: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400",
  RESOLVED: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400",
  CLOSED: "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400",
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

const USER_ID = 1;
const USER_NAME = "Citizen";

export default function UserTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<TicketDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newModalOpen, setNewModalOpen] = useState(false);

  const [newCategory, setNewCategory] = useState("Application Verification Delay");
  const [newSubject, setNewSubject] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  const [replyText, setReplyText] = useState("");

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/user/tickets?userId=${USER_ID}`);
      const data = await res.json();
      if (data.ok) {
        setTickets(data.tickets);
      }
    } catch (err) {
      console.error("Failed to fetch tickets:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  async function openTicketDetail(ticketId: number) {
    setSelectedTicket(null);
    try {
      const res = await fetch(`/api/user/tickets/${ticketId}`);
      const data = await res.json();
      if (data.ok) {
        setSelectedTicket(data.ticket);
        setMessages(data.messages);
      }
    } catch (err) {
      console.error("Failed to load ticket:", err);
    }
  }

  async function handleCreateTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!newSubject.trim() || !newDesc.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/user/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: newCategory,
          subject: newSubject.trim(),
          description: newDesc.trim(),
          contact_name: USER_NAME,
          user_id: USER_ID,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setCreateSuccess(data.reference_no);
        setNewSubject("");
        setNewDesc("");
        await fetchTickets();
        setTimeout(() => {
          setNewModalOpen(false);
          setCreateSuccess(null);
          if (data.ticket_id) {
            openTicketDetail(data.ticket_id);
          }
        }, 1500);
      }
    } catch (err) {
      console.error("Failed to create ticket:", err);
    } finally {
      setCreating(false);
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
      author_type: "CITIZEN",
      author_name: USER_NAME,
      body: replyBody,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);
    
    try {
      await fetch(`/api/user/tickets/${selectedTicket.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author_name: USER_NAME,
          author_id: USER_ID,
          body: replyBody,
        }),
      });
      // Refresh to get server timestamp
      await openTicketDetail(selectedTicket.id);
      await fetchTickets();
    } catch (err) {
      console.error("Failed to send reply:", err);
    }
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <LifeBuoy className="text-[#1e3a8a] dark:text-blue-400" size={28} />
            Helpdesk & Support Tickets
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Submit inquiries, track resolution times, and communicate directly with welfare board officials.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={fetchTickets}
            className="px-4 py-2.5 rounded-xl text-sm font-bold border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => {
              setCreateSuccess(null);
              setNewModalOpen(true);
            }}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-[#1e3a8a] hover:bg-[#1e40af] shadow-md flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <Plus size={16} />
            <span>Raise New Ticket</span>
          </button>
        </div>
      </div>

      {/* Tickets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Tickets List */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-[#1e3a8a] dark:text-blue-400" size={32} />
            </div>
          ) : tickets.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-3">
                <MessageSquare size={28} className="text-slate-400 dark:text-slate-500" />
              </div>
              <p className="font-bold text-slate-700 dark:text-slate-200">No Tickets Raised</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Raise a new support ticket to contact the helpdesk.</p>
            </div>
          ) : (
            tickets.map((ticket) => {
              const isSelected = selectedTicket?.id === ticket.id;
              return (
                <div
                  key={ticket.id}
                  onClick={() => openTicketDetail(ticket.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? "bg-white dark:bg-slate-800 border-[#1e3a8a] dark:border-blue-500 ring-2 ring-blue-100 dark:ring-blue-900/50 shadow-md"
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 shadow-sm"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">{ticket.reference_no}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${STATUS_COLORS[ticket.status] || STATUS_COLORS.OPEN}`}>
                      {STATUS_LABELS[ticket.status] || ticket.status}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                    {ticket.subject}
                  </h3>
                  {ticket.category && (
                    <span className="text-[11px] text-[#1e3a8a] dark:text-blue-400 font-semibold block mt-0.5">
                      {ticket.category}
                    </span>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 mt-3 pt-2 border-t border-slate-100 dark:border-slate-700">
                    <span>{formatTimeAgo(ticket.created_at)}</span>
                    <span className="flex items-center gap-1">
                      <MessageSquare size={10} />
                      {ticket.message_count}
                    </span>
                  </div>

                  {ticket.assigned_employee_name && (
                    <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                      Assigned: <span className="font-medium text-slate-700 dark:text-slate-300">{ticket.assigned_employee_name}</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Right: Conversation Thread */}
        <div className="lg:col-span-2">
          {selectedTicket ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col h-[580px] overflow-hidden">
              {/* Thread Header */}
              <div className="p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">{selectedTicket.reference_no}</span>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${STATUS_COLORS[selectedTicket.status] || STATUS_COLORS.OPEN}`}>
                    {STATUS_LABELS[selectedTicket.status] || selectedTicket.status}
                  </span>
                  {selectedTicket.category && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-blue-100 dark:bg-blue-900/30 text-[#1e3a8a] dark:text-blue-400">
                      {selectedTicket.category}
                    </span>
                  )}
                </div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {selectedTicket.subject}
                </h2>
                {selectedTicket.assigned_employee_name && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Assigned to: <span className="font-medium text-slate-700 dark:text-slate-300">{selectedTicket.assigned_employee_name}</span>
                    {" · "}SLA: {selectedTicket.sla_hours}h
                  </p>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 p-5 overflow-y-auto space-y-4">
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
                        <strong className={msg.author_type === "CITIZEN" ? "text-slate-700 dark:text-slate-300" : "text-[#1e3a8a] dark:text-blue-400"}>
                          {msg.author_name}
                        </strong>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          msg.author_type === "STAFF"
                            ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                            : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                        }`}>
                          {msg.author_type === "CITIZEN" ? "You" : "Officer"}
                        </span>
                        <span>·</span>
                        <span>{formatTimeAgo(msg.created_at)}</span>
                      </div>

                      <div
                        className={`max-w-lg p-3.5 rounded-xl text-sm leading-relaxed ${
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
              {selectedTicket.status !== "CLOSED" && selectedTicket.status !== "RESOLVED" && (
                <form onSubmit={handleSendReply} className="p-4 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex gap-2">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your response to the officer..."
                    className="flex-1 h-11 px-4 rounded-lg border border-slate-200 dark:border-slate-600 text-sm outline-none focus:ring-2 focus:ring-[#1e3a8a] dark:focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={!replyText.trim()}
                    className="px-5 h-11 rounded-lg bg-[#1e3a8a] text-white font-bold text-sm flex items-center gap-1.5 disabled:opacity-50 hover:bg-[#1e40af] shadow-sm"
                  >
                    <Send size={14} />
                    <span>Reply</span>
                  </button>
                </form>
              )}
              {(selectedTicket.status === "RESOLVED" || selectedTicket.status === "CLOSED") && (
                <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-emerald-50 dark:bg-emerald-900/10 text-center">
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 flex items-center justify-center gap-1.5">
                    <CheckCircle2 size={16} />
                    This ticket has been {selectedTicket.status === "RESOLVED" ? "resolved" : "closed"}.
                  </p>
                  {selectedTicket.resolution_note && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-1">
                      Resolution: {selectedTicket.resolution_note}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center h-[580px] p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-3">
                <MessageSquare size={28} className="text-slate-400 dark:text-slate-500" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white">Support Conversation Thread</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mt-1">
                Select a ticket from the list or click &ldquo;Raise New Ticket&rdquo; to begin a conversation with welfare board support officers.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* New Ticket Modal */}
      {newModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700 mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Raise New Support Ticket</h3>
              <button
                type="button"
                onClick={() => {
                  setNewModalOpen(false);
                  setCreateSuccess(null);
                }}
                className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            {createSuccess ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 size={32} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-white">Ticket Raised Successfully!</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Your reference number is
                </p>
                <p className="font-mono text-lg font-black text-[#1e3a8a] dark:text-blue-400 mt-1">{createSuccess}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">Opening your ticket...</p>
              </div>
            ) : (
              <form onSubmit={handleCreateTicket} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Issue Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-lg border border-slate-200 dark:border-slate-600 text-sm outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-[#1e3a8a]"
                  >
                    <option value="Application Verification Delay">Application Verification Delay</option>
                    <option value="Payment Issue">Payment Issue / Double Deduction</option>
                    <option value="Document Correction">Document Correction Request</option>
                    <option value="Service Eligibility Query">Service Eligibility Query</option>
                    <option value="e-Seva Kendra Query">e-Seva Kendra Operator Assistance</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Subject</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Need update on maternity grant claim"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-lg border border-slate-200 dark:border-slate-600 text-sm outline-none focus:ring-2 focus:ring-[#1e3a8a] bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Detailed Description</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Explain the problem clearly including any application reference numbers..."
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    className="w-full p-3.5 rounded-lg border border-slate-200 dark:border-slate-600 text-sm outline-none resize-none focus:ring-2 focus:ring-[#1e3a8a] bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setNewModalOpen(false)}
                    className="flex-1 py-2.5 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 py-2.5 rounded-lg text-xs font-bold bg-[#1e3a8a] text-white hover:bg-[#1e40af] shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {creating ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                    Submit Ticket
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
