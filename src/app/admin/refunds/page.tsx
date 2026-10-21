"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, ShieldCheck } from "lucide-react";

export default function RetailerWalletRefundsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | number | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/retailer-wallet-refunds", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Unable to load refund requests.");
      setRequests(data.requests || []);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load refund requests.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function review(id: string | number, action: "APPROVE" | "REJECT" | "MARK_PAID") {
    setBusyId(id);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/retailer-wallet-refunds", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, note: notes[String(id)] || "" }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Review action failed.");
      setMessage(data.message);
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Review action failed."); }
    finally { setBusyId(null); }
  }

  return <main className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
    <header className="flex items-center justify-between gap-3 border-b border-slate-200 pb-4">
      <div><p className="flex items-center gap-2 text-xs font-bold uppercase text-[#1e3a8a]"><ShieldCheck size={15} /> Finance review</p><h1 className="mt-1 text-2xl font-black text-slate-900">Retailer wallet refunds</h1><p className="mt-1 text-sm text-slate-600">Requests include pooled wallet funds from top-ups and commissions. Approve or reject requests; record payout as paid only after the retailer has received it.</p></div>
      <button onClick={() => void load()} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-semibold"><RefreshCw size={15} /> Refresh</button>
    </header>
    {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    {message && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
    {loading ? <p className="p-8 text-center text-sm text-slate-600">Loading requests…</p> : requests.length === 0 ? <p className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">No refund requests yet.</p> : <div className="space-y-3">{requests.map((item) => <section key={item.id} className="rounded-lg border border-slate-200 border-t-4 border-t-[#1e3a8a] bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold text-slate-900">{item.shop_name || item.retailer_name || `Retailer #${item.retailer_id}`}</h2><p className="text-xs text-slate-500">{item.registration_no || `Retailer ${item.retailer_id}`} · Request RF-{item.id} · Phone: {item.phone || "Not provided"}</p></div><span className="rounded border border-slate-300 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-800">{String(item.status).replaceAll("_", " ")}</span></div>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-xs text-slate-500">Refund amount (held in wallet)</dt><dd className="font-black">₹{Number(item.amount).toFixed(2)}</dd></div><div><dt className="text-xs text-slate-500">Requested</dt><dd>{item.requested_at ? new Date(item.requested_at).toLocaleString("en-IN") : "—"}</dd></div></dl>
      <p className="mt-3 rounded bg-slate-50 p-3 text-sm text-slate-700"><strong>Reason:</strong> {item.reason}</p>
      {item.status === "REQUESTED" || item.status === "APPROVED" ? <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end"><label className="text-xs font-semibold text-slate-700">Staff note (optional)<textarea maxLength={500} value={notes[String(item.id)] ?? item.staff_note ?? ""} onChange={(e) => setNotes((prev) => ({ ...prev, [String(item.id)]: e.target.value }))} className="mt-1 block min-h-11 w-full rounded-lg border border-slate-300 p-2 text-sm" /></label>{item.status === "REQUESTED" ? <><button disabled={busyId === item.id} onClick={() => void review(item.id, "REJECT")} className="min-h-11 rounded-lg border border-rose-300 px-4 text-sm font-bold text-rose-800 disabled:opacity-50">Reject & return funds</button><button disabled={busyId === item.id} onClick={() => void review(item.id, "APPROVE")} className="min-h-11 rounded-lg bg-[#1e3a8a] px-4 text-sm font-bold text-white disabled:opacity-50">Approve for payout</button></> : <><button disabled={busyId === item.id} onClick={() => void review(item.id, "REJECT")} className="min-h-11 rounded-lg border border-rose-300 px-4 text-sm font-bold text-rose-800 disabled:opacity-50">Cancel & return funds</button><button disabled={busyId === item.id} onClick={() => void review(item.id, "MARK_PAID")} className="min-h-11 rounded-lg bg-emerald-700 px-4 text-sm font-bold text-white disabled:opacity-50">{busyId === item.id ? "Saving…" : "Mark payout paid"}</button></>}</div> : <p className="mt-3 text-xs text-slate-600">{item.staff_note || ""}{item.paid_at ? ` · Payout recorded ${new Date(item.paid_at).toLocaleString("en-IN")}` : ""}</p>}
    </section>)}</div>}
  </main>;
}
