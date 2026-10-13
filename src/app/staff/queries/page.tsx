"use client";

import { useState, useEffect, useCallback } from "react";
import { CheckCircle2, Send, RefreshCw, Loader2 } from "lucide-react";

interface Ticket {
  id: number;
  reference_no: string;
  status: string;
  priority: string;
  category: string | null;
  subject: string;
  assigned_employee_id: number | null;
  assigned_employee_name: string | null;
  message_count: number;
  created_at: string;
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
}

interface Message {
  id: number;
  author_type: string;
  author_name: string;
  body: string;
  created_at: string;
}

const EMPLOYEE_ID = 10;
const EMPLOYEE_NAME = "P. Vignesh";

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

export default function QueryDeskPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<TicketDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/tickets?employeeId=${EMPLOYEE_ID}`);
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
      const res = await fetch(`/api/admin/tickets/${ticketId}`);
      const data = await res.json();
      if (data.ok) {
        setSelectedTicket(data.ticket);
        setMessages(data.messages);
      }
    } catch (err) {
      console.error("Failed to load ticket:", err);
    }
  }

  async function sendReply(event: React.FormEvent) {
    event.preventDefault();
    if (!reply.trim() || !selectedTicket) return;

    const replyBody = reply.trim();
    setReply("");

    // Optimistic update - show message immediately
    const optimisticMsg: Message = {
      id: Date.now(),
      author_type: "STAFF",
      author_name: EMPLOYEE_NAME,
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
          author_name: EMPLOYEE_NAME,
          body: replyBody,
        }),
      });
      await openTicketDetail(selectedTicket.id);
      await fetchTickets();
    } catch (err) {
      console.error("Failed to send reply:", err);
    }
  }

  async function resolve() {
    if (!selectedTicket) return;
    try {
      await fetch(`/api/admin/tickets/${selectedTicket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "RESOLVED",
          resolution_note: "Resolved by employee",
        }),
      });
      await openTicketDetail(selectedTicket.id);
      await fetchTickets();
    } catch (err) {
      console.error("Failed to resolve ticket:", err);
    }
  }

  const selected = selectedTicket || tickets[0] || null;

  useEffect(() => {
    if (tickets.length > 0 && !selectedTicket) {
      openTicketDetail(tickets[0].id);
    }
  }, [tickets]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wide text-[#ea580c]">Employee desk · query desk</span>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 dark:text-white">Support and enquiry requests</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Reply with a clear resolution and close only after the requested assistance has been provided.</p>
        </div>
        <button
          onClick={fetchTickets}
          className="px-4 py-2 rounded-lg text-sm font-bold border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <aside className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
          <div className="border-b border-slate-100 dark:border-slate-700 p-4">
            <strong className="text-sm text-slate-900 dark:text-white">Assigned requests ({tickets.length})</strong>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-[#1e3a8a] dark:text-blue-400" size={24} />
            </div>
          ) : tickets.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
              No support requests assigned.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  type="button"
                  onClick={() => openTicketDetail(ticket.id)}
                  className={`w-full p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 ${selectedTicket?.id === ticket.id ? "border-l-4 border-l-[#ea580c] bg-blue-50/50 dark:bg-blue-900/20" : ""}`}
                >
                  <div className="flex justify-between gap-3">
                    <span className="font-mono text-xs text-slate-400 dark:text-slate-500">{ticket.reference_no}</span>
                    <span className={`text-xs font-bold ${ticket.status === "RESOLVED" ? "text-emerald-700 dark:text-emerald-400" : ticket.status === "OPEN" ? "text-amber-700 dark:text-amber-400" : "text-[#1e3a8a] dark:text-blue-400"}`}>
                      {ticket.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <strong className="mt-2 block text-sm text-slate-900 dark:text-white line-clamp-1">{ticket.subject}</strong>
                  {ticket.category && (
                    <span className="mt-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">{ticket.category}</span>
                  )}
                  <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500">
                    <span>{formatTimeAgo(ticket.created_at)}</span>
                    <span>{ticket.message_count} msgs</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </aside>

        <section className="flex min-h-[570px] flex-col rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
          {!selectedTicket ? (
            <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-slate-500 dark:text-slate-400">
              Select or wait for an assigned support request to view thread details.
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3 border-b border-slate-100 dark:border-slate-700 p-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <span className="font-mono text-xs text-slate-400 dark:text-slate-500">{selectedTicket.reference_no}</span>
                  <h2 className="mt-1 text-lg font-bold text-slate-950 dark:text-white">{selectedTicket.subject}</h2>
                  <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                    {selectedTicket.category || "General"} · SLA: {selectedTicket.sla_hours}h · {selectedTicket.contact_name || "Anonymous"}
                  </span>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                  selectedTicket.status === "RESOLVED" ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" :
                  selectedTicket.status === "OPEN" ? "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" :
                  "bg-blue-50 dark:bg-blue-900/30 text-[#1e3a8a] dark:text-blue-400"
                }`}>
                  {selectedTicket.status.replace(/_/g, " ")}
                </span>
              </div>

              <div className="flex-1 space-y-4 p-5 overflow-y-auto max-h-[400px]">
                {messages.length === 0 ? (
                  <div className="text-center py-8 text-sm text-slate-500 dark:text-slate-400">No messages yet.</div>
                ) : (
                  messages.map((message) => (
                    <div key={message.id} className={`flex flex-col ${message.author_type === "STAFF" ? "items-end" : "items-start"}`}>
                      <span className="mb-1 text-xs text-slate-500 dark:text-slate-400">
                        {message.author_name} · {formatTimeAgo(message.created_at)}
                      </span>
                      <p className={`max-w-xl rounded-lg p-3 text-sm leading-6 ${
                        message.author_type === "STAFF"
                          ? "bg-[#1e3a8a] text-white"
                          : "border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                      }`}>
                        {message.body}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {selectedTicket.status !== "RESOLVED" && selectedTicket.status !== "CLOSED" ? (
                <form onSubmit={sendReply} className="border-t border-slate-100 dark:border-slate-700 p-4">
                  <label htmlFor="reply" className="sr-only">Reply to request</label>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <textarea
                      id="reply"
                      value={reply}
                      onChange={(event) => setReply(event.target.value)}
                      rows={2}
                      placeholder="Write a clear response for the requester"
                      className="min-h-11 flex-1 rounded-md border border-slate-300 dark:border-slate-600 p-3 text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    />
                    <div className="flex gap-2 sm:flex-col">
                      <button type="submit" className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md bg-[#1e3a8a] px-4 text-sm font-bold text-white hover:bg-[#1e40af]">
                        <Send size={16} /> Reply
                      </button>
                      <button type="button" onClick={resolve} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md border border-emerald-200 dark:border-emerald-800 px-4 text-sm font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20">
                        <CheckCircle2 size={16} /> Resolve
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <p className="flex items-center gap-2 border-t border-emerald-100 dark:border-emerald-900/30 bg-emerald-50 dark:bg-emerald-900/10 p-4 text-sm font-semibold text-emerald-800 dark:text-emerald-400">
                  <CheckCircle2 size={17} /> Resolution recorded. This request is closed.
                </p>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
