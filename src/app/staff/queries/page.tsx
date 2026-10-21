"use client";

import { useState, useEffect, useCallback } from "react";
import { CheckCircle2, Send, RefreshCw, Loader2, X } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

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

function formatTimeAgo(dateStr: string, isTa: boolean): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return isTa ? "இப்போதுதான்" : "Just now";
  if (diffMins < 60) return isTa ? `${diffMins} நிமிடம் முன்` : `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return isTa ? `${diffHours} மணி நேரம் முன்` : `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return isTa ? `${diffDays} நாள் முன்` : `${diffDays}d ago`;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export default function QueryDeskPage() {
  const { language } = useLanguage();
  const isTa = language === "ta";

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<TicketDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);

  // Auto-refresh chat every 5 seconds when a ticket is selected
  useEffect(() => {
    if (!selectedTicket) return;
    const interval = setInterval(() => {
      openTicketDetail(selectedTicket.id);
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedTicket?.id]);

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
    if (selectedTicket?.id !== ticketId) {
      setSelectedTicket(null);
      setMessages([]);
    }
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
    setMessages((prev) => [...prev, optimisticMsg]);

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
          resolution_note: isTa ? "பணியாளரால் தீர்க்கப்பட்டது" : "Resolved by employee",
        }),
      });
      await openTicketDetail(selectedTicket.id);
      await fetchTickets();
    } catch (err) {
      console.error("Failed to resolve ticket:", err);
    }
  }

  useEffect(() => {
    if (tickets.length > 0 && !selectedTicket) {
      openTicketDetail(tickets[0].id);
    }
  }, [tickets]);

  const getStatusLabel = (st: string) => {
    const s = st.toUpperCase();
    if (s === "RESOLVED") return isTa ? "தீர்க்கப்பட்டது" : "Resolved";
    if (s === "OPEN") return isTa ? "திறந்துள்ளது" : "Open";
    if (s === "CLOSED") return isTa ? "மூடப்பட்டது" : "Closed";
    return isTa ? "செயல்பாட்டில் உள்ளது" : "In Progress";
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wide text-[#ea580c]">
            {isTa ? "பணியாளர் மையம் · வினவல் மையம்" : "Employee desk · query desk"}
          </span>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 dark:text-white">
            {isTa ? "ஆதரவு மற்றும் விசாரணை கோரிக்கைகள்" : "Support and enquiry requests"}
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {isTa
              ? "தெளிவான தீர்வுடன் பதிலளிக்கவும், கோரப்பட்ட உதவி வழங்கப்பட்ட பின்னரே கோரிக்கையை மூடவும்."
              : "Reply with a clear resolution and close only after the requested assistance has been provided."}
          </p>
        </div>
        <button
          onClick={fetchTickets}
          className="px-4 py-2 rounded-lg text-sm font-bold border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          {isTa ? "புதுப்பி" : "Refresh"}
        </button>
      </div>

      <div className="grid gap-6">
        <aside className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
          <div className="border-b border-slate-100 dark:border-slate-700 p-4">
            <strong className="text-sm text-slate-900 dark:text-white">
              {isTa ? `ஒதுக்கப்பட்ட கோரிக்கைகள் (${tickets.length})` : `Assigned requests (${tickets.length})`}
            </strong>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-[#1e3a8a] dark:text-blue-400" size={24} />
            </div>
          ) : tickets.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
              {isTa ? "எந்த ஆதரவு கோரிக்கைகளும் ஒதுக்கப்படவில்லை." : "No support requests assigned."}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  type="button"
                  onClick={() => openTicketDetail(ticket.id)}
                  className={`w-full p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${
                    selectedTicket?.id === ticket.id
                      ? "border-l-4 border-l-[#ea580c] bg-blue-50/50 dark:bg-blue-900/20"
                      : ""
                  }`}
                >
                  <div className="flex justify-between gap-3">
                    <span className="font-mono text-xs text-slate-400 dark:text-slate-500">
                      {ticket.reference_no}
                    </span>
                    <span
                      className={`text-xs font-bold ${
                        ticket.status === "RESOLVED"
                          ? "text-emerald-700 dark:text-emerald-400"
                          : ticket.status === "OPEN"
                          ? "text-amber-700 dark:text-amber-400"
                          : "text-[#1e3a8a] dark:text-blue-400"
                      }`}
                    >
                      {getStatusLabel(ticket.status)}
                    </span>
                  </div>
                  <strong className="mt-2 block text-sm text-slate-900 dark:text-white line-clamp-1">
                    {ticket.subject}
                  </strong>
                  {ticket.category && (
                    <span className="mt-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {ticket.category}
                    </span>
                  )}
                  <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500">
                    <span>{formatTimeAgo(ticket.created_at, isTa)}</span>
                    <span>{ticket.message_count} {isTa ? "செய்திகள்" : "msgs"}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </aside>
      </div>

      {/* Chat Popup */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-2xl h-[85vh] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
            {/* Popup Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 rounded-t-2xl flex-shrink-0">
              <div>
                <span className="font-mono text-xs text-slate-400 dark:text-slate-500">
                  {selectedTicket.reference_no}
                </span>
                <h2 className="text-lg font-bold text-slate-950 dark:text-white">{selectedTicket.subject}</h2>
                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  {selectedTicket.category || (isTa ? "பொது" : "General")} · {isTa ? "இலக்கு நேரம்" : "SLA"}: {selectedTicket.sla_hours}h · {selectedTicket.contact_name || (isTa ? "பெயரற்றவர்" : "Anonymous")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    selectedTicket.status === "RESOLVED"
                      ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                      : selectedTicket.status === "OPEN"
                      ? "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                      : "bg-blue-50 dark:bg-blue-900/30 text-[#1e3a8a] dark:text-blue-400"
                  }`}
                >
                  {getStatusLabel(selectedTicket.status)}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Messages Thread */}
            <div className="flex-1 space-y-4 p-5 overflow-y-auto">
              {messages.length === 0 ? (
                <div className="text-center py-8 text-sm text-slate-500 dark:text-slate-400">
                  {isTa ? "செய்திகள் எதுவும் இல்லை." : "No messages yet."}
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex flex-col ${
                      message.author_type === "STAFF" ? "items-end" : "items-start"
                    }`}
                  >
                    <span className="mb-1 text-xs text-slate-500 dark:text-slate-400">
                      {message.author_name} · {formatTimeAgo(message.created_at, isTa)}
                    </span>
                    <p
                      className={`max-w-xl rounded-lg p-3 text-sm leading-6 ${
                        message.author_type === "STAFF"
                          ? "bg-[#1e3a8a] text-white"
                          : "border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                      }`}
                    >
                      {message.body}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Reply Input */}
            {selectedTicket.status !== "RESOLVED" && selectedTicket.status !== "CLOSED" ? (
              <form onSubmit={sendReply} className="border-t border-slate-100 dark:border-slate-700 p-4">
                <label htmlFor="reply" className="sr-only">
                  {isTa ? "கோரிக்கைக்கு பதிலளிக்கவும்" : "Reply to request"}
                </label>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <textarea
                    id="reply"
                    value={reply}
                    onChange={(event) => setReply(event.target.value)}
                    rows={2}
                    placeholder={isTa ? "கோரிக்கையாளருக்கான தெளிவான பதிலை எழுதவும்..." : "Write a clear response for the requester"}
                    className="min-h-11 flex-1 rounded-md border border-slate-300 dark:border-slate-600 p-3 text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  />
                  <div className="flex gap-2 sm:flex-col">
                    <button
                      type="submit"
                      className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md bg-[#1e3a8a] px-4 text-sm font-bold text-white hover:bg-[#1e40af] transition-colors"
                    >
                      <Send size={16} /> {isTa ? "பதிலளி" : "Reply"}
                    </button>
                    <button
                      type="button"
                      onClick={resolve}
                      className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md border border-emerald-200 dark:border-emerald-800 px-4 text-sm font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                    >
                      <CheckCircle2 size={16} /> {isTa ? "தீர்க்கப்பட்டது" : "Resolve"}
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <p className="flex items-center gap-2 border-t border-emerald-100 dark:border-emerald-900/30 bg-emerald-50 dark:bg-emerald-900/10 p-4 text-sm font-semibold text-emerald-800 dark:text-emerald-400">
                <CheckCircle2 size={17} />{" "}
                {isTa ? "தீர்வு பதிவு செய்யப்பட்டது. இந்த கோரிக்கை மூடப்பட்டுள்ளது." : "Resolution recorded. This request is closed."}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
