"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CreditCard, Loader2, Plus, Save } from "lucide-react";

type Plan = {
  id: number;
  name: string;
  billingPeriod: string;
  price: string;
  benefits: { listingRights: boolean; marketplaceVisibility: boolean; maxProducts: number; features: string[] };
  active: boolean;
};

const emptyPlan = {
  name: "", billingPeriod: "MONTHLY", price: "",
  benefits: { listingRights: true, marketplaceVisibility: true, maxProducts: 10, features: [] as string[] },
};
const periods = [
  ["WEEKLY", "Weekly"], ["MONTHLY", "Monthly"], ["QUARTERLY", "Quarterly"],
  ["HALF_YEARLY", "Half-yearly"], ["YEARLY", "Full year"],
];

export default function MarketplaceSubscriptionPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [form, setForm] = useState(emptyPlan);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    try {
      const response = await fetch("/api/admin/marketplace-subscriptions", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not load plans.");
      setPlans(data.plans || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load plans.");
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/marketplace-subscriptions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, id: editingId, benefits: { ...form.benefits, features: form.benefits.features } }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not save this plan.");
      setMessage(data.message); setForm(emptyPlan); setEditingId(null); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save this plan."); }
    finally { setSaving(false); }
  }

  async function toggle(plan: Plan) {
    setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/marketplace-subscriptions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "TOGGLE", id: plan.id, active: !plan.active }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not update this plan.");
      setMessage(data.message); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not update this plan."); }
  }

  function edit(plan: Plan) {
    setEditingId(plan.id);
    setForm({ ...plan, benefits: { ...plan.benefits, features: plan.benefits.features || [] } });
    setMessage(""); setError("");
  }

  return <div className="mx-auto max-w-6xl space-y-6">
    <header className="border-b border-slate-200 pb-5">
      <p className="text-xs font-bold uppercase tracking-wider text-orange-700">Retail operations</p>
      <h1 className="mt-1 text-2xl font-black text-slate-900">Marketplace subscription plans</h1>
      <p className="mt-1 text-sm text-slate-600">Manage plan pricing and the listing benefits retailers receive.</p>
    </header>
    {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}
    {message && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</div>}

    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-100 p-4"><CreditCard size={18} className="text-blue-900" /><h2 className="font-bold">Plans</h2><span className="ml-auto text-xs text-slate-500">{plans.length} plans</span></div>
        {loading ? <div className="p-8 text-center text-sm text-slate-500"><Loader2 className="mx-auto mb-2 animate-spin" />Loading plans…</div> : plans.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">No subscription plans yet.</p> : <div className="divide-y divide-slate-100">
          {plans.map((plan) => <article key={plan.id} className="space-y-3 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold text-slate-900">{plan.name} <span className={`ml-1 rounded-full px-2 py-1 text-[10px] ${plan.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{plan.active ? "ACTIVE" : "INACTIVE"}</span></h3><p className="mt-1 text-sm text-slate-600">₹{plan.price} · {periods.find(([value]) => value === plan.billingPeriod)?.[1] || plan.billingPeriod}</p></div><div className="flex gap-2"><button type="button" onClick={() => edit(plan)} className="min-h-9 rounded-lg border border-slate-300 px-3 text-xs font-bold">Edit</button><button type="button" onClick={() => void toggle(plan)} className="min-h-9 rounded-lg border border-slate-300 px-3 text-xs font-bold">{plan.active ? "Deactivate" : "Activate"}</button></div></div>
            <p className="text-xs text-slate-600">Up to {plan.benefits.maxProducts} listings · {plan.benefits.listingRights ? "Can submit listings" : "Listings disabled"} · {plan.benefits.marketplaceVisibility ? "Marketplace visibility" : "No public visibility"}</p>
            {plan.benefits.features?.length > 0 && <ul className="list-disc pl-5 text-xs text-slate-500">{plan.benefits.features.map((feature, index) => <li key={`${plan.id}-${index}`}>{feature}</li>)}</ul>}
          </article>)}
        </div>}
      </section>

      <form onSubmit={save} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between"><div><h2 className="font-bold">{editingId ? "Edit plan" : "Create plan"}</h2><p className="mt-1 text-xs text-slate-500">Existing subscriptions keep their purchase-time benefits.</p></div><button type="button" onClick={() => { setEditingId(null); setForm(emptyPlan); }} className="text-xs font-semibold text-blue-800">New plan</button></div>
        <label className="block text-xs font-bold text-slate-700">Plan name<input required maxLength={120} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-normal" /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs font-bold text-slate-700">Billing period<select value={form.billingPeriod} onChange={(event) => setForm({ ...form, billingPeriod: event.target.value })} className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-normal">{periods.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="block text-xs font-bold text-slate-700">Price (₹)<input required inputMode="decimal" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-normal" /></label>
        </div>
        <label className="block text-xs font-bold text-slate-700">Maximum live and pending products<input required type="number" min={1} max={10000} value={form.benefits.maxProducts} onChange={(event) => setForm({ ...form, benefits: { ...form.benefits, maxProducts: Number(event.target.value) } })} className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-normal" /></label>
        <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={form.benefits.listingRights} onChange={(event) => setForm({ ...form, benefits: { ...form.benefits, listingRights: event.target.checked } })} />Retailer can submit products for review</label>
        <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={form.benefits.marketplaceVisibility} onChange={(event) => setForm({ ...form, benefits: { ...form.benefits, marketplaceVisibility: event.target.checked } })} />Approved products appear in customer marketplace</label>
        <label className="block text-xs font-bold text-slate-700">Included features and benefits<textarea rows={5} value={form.benefits.features.join("\n")} onChange={(event) => setForm({ ...form, benefits: { ...form.benefits, features: event.target.value.split("\n").map((item) => item.trim()).filter(Boolean) } })} placeholder="One benefit per line" className="mt-1.5 w-full rounded-lg border border-slate-300 p-3 text-sm font-normal" /></label>
        <button disabled={saving} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#1e3a8a] px-4 text-sm font-bold text-white disabled:opacity-60">{saving ? <Loader2 size={16} className="animate-spin" /> : editingId ? <Save size={16} /> : <Plus size={16} />}{editingId ? "Save changes" : "Create subscription plan"}</button>
      </form>
    </div>
  </div>;
}
