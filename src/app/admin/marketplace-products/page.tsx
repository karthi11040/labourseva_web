"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Clock3, Loader2, Package, Plus, Search, X } from "lucide-react";
import type { FormEvent } from "react";
import { categoryNeedsExpiryDate } from "@/lib/marketplace-product-rules";

type Product = {
  id: number;
  retailerId: number;
  retailerName: string;
  shopName: string;
  registrationNo: string | null;
  name: string;
  category: string;
  description: string;
  pricePaise: string;
  stock: number;
  photos: string[];
  expiryDate: string | null;
  status: string;
  rejectionReason: string | null;
  createdAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
};

type RetailerOption = {
  id: number;
  name: string;
  shopName: string;
  registrationNo: string | null;
  status: string;
  approved: boolean;
};

const emptyDraft = { retailerId: "", name: "", category: "", description: "", price: "", stock: "0", expiryDate: "" };

export default function MarketplaceProductReviewsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"PENDING" | "DRAFT" | "HISTORY">("PENDING");
  const [search, setSearch] = useState("");
  const [rejecting, setRejecting] = useState<Product | null>(null);
  const [reason, setReason] = useState("");
  const [retailers, setRetailers] = useState<RetailerOption[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);

  async function load() {
    try {
      const response = await fetch("/api/admin/marketplace-products", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not load listings.");
      const listings = data.products || [];
      setProducts(listings);
      setRetailers(data.retailers || []);
      if (!listings.some((product: Product) => product.status === "PENDING") && listings.some((product: Product) => product.status === "DRAFT")) setTab("DRAFT");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load listings.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const visible = useMemo(() => products.filter((product) => {
    const isPending = product.status === "PENDING";
    const term = search.trim().toLowerCase();
    const matchesTab = tab === "PENDING"
      ? isPending
      : tab === "DRAFT"
        ? product.status === "DRAFT"
        : ["APPROVED", "REJECTED"].includes(product.status);
    const matchesSearch = !term || [product.name, product.category, product.retailerName, product.shopName, String(product.retailerId)].some((value) => value.toLowerCase().includes(term));
    return matchesTab && matchesSearch;
  }), [products, search, tab]);

  async function decide(product: Product, decision: "APPROVE" | "REJECT", rejectionReason = "") {
    setSavingId(product.id);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/marketplace-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: product.id, decision, reason: rejectionReason }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not save this decision.");
      setMessage(data.message);
      setRejecting(null);
      setReason("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this decision.");
    } finally {
      setSavingId(null);
    }
  }

  async function createDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAdding(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/marketplace-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CREATE_DRAFT", ...draft }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not add the product draft.");
      setMessage(data.message);
      setDraft(emptyDraft);
      setAddOpen(false);
      setTab("DRAFT");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add the product draft.");
    } finally {
      setAdding(false);
    }
  }

  async function publishDraft(product: Product) {
    setSavingId(product.id);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/marketplace-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "PUBLISH_DRAFT", id: product.id }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not publish this product.");
      setMessage(data.message);
      await load();
      setTab("HISTORY");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not publish this product.");
    } finally {
      setSavingId(null);
    }
  }

  const pendingCount = products.filter((product) => product.status === "PENDING").length;
  const draftCount = products.filter((product) => product.status === "DRAFT").length;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center">
        <div><p className="text-xs font-bold uppercase tracking-wider text-orange-700">Retail operations</p><h1 className="mt-1 text-2xl font-black text-slate-900">Marketplace product review</h1><p className="mt-1 text-sm text-slate-600">Review retailer listings before they appear to buyers.</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900"><Clock3 size={15} />{pendingCount} awaiting review</span>
          <button type="button" onClick={() => setAddOpen(true)} disabled={retailers.length === 0} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-blue-900 px-4 text-xs font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"><Plus size={15} />Add product</button>
        </div>
      </header>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}
      {message && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</div>}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
          <button type="button" onClick={() => setTab("PENDING")} className={`rounded-md px-3 py-2 text-xs font-bold ${tab === "PENDING" ? "bg-blue-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}>New requests ({pendingCount})</button>
          <button type="button" onClick={() => setTab("DRAFT")} className={`rounded-md px-3 py-2 text-xs font-bold ${tab === "DRAFT" ? "bg-blue-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}>Draft listings ({draftCount})</button>
          <button type="button" onClick={() => setTab("HISTORY")} className={`rounded-md px-3 py-2 text-xs font-bold ${tab === "HISTORY" ? "bg-blue-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}>Review history</button>
        </div>
        <label className="relative block w-full sm:max-w-sm"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search product, shop, or retailer" className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-blue-700" /></label>
      </div>

      {loading ? <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500"><Loader2 className="mx-auto mb-2 animate-spin" />Loading product requests…</div> : visible.length === 0 ? <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500"><Package className="mx-auto mb-2" />No {tab === "PENDING" ? "new requests" : tab === "DRAFT" ? "draft listings" : "review history"} found.</div> : <div className="space-y-4">
        {visible.map((product) => <article key={product.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 p-5 lg:flex-row">
            <div className="flex gap-2 overflow-x-auto lg:w-48 lg:shrink-0">
              {product.photos.map((photo) => <img key={photo} src={photo} alt={`${product.name} product photo`} className="h-24 w-24 shrink-0 rounded-lg border border-slate-200 object-cover" />)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-bold text-slate-900">{product.name}</h2><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${product.status === "APPROVED" ? "bg-emerald-50 text-emerald-700" : product.status === "REJECTED" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-800"}`}>{product.status}</span></div>
              <p className="mt-1 text-xs text-slate-500">{product.category} · ₹{(Number(product.pricePaise) / 100).toFixed(2)} · Stock {product.stock}</p>
              {product.expiryDate && <p className="mt-1 text-xs text-slate-600">Expiry date: {product.expiryDate}</p>}
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{product.description}</p>
              <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-600"><strong className="text-slate-900">{product.shopName}</strong> · {product.retailerName}{product.registrationNo ? ` · ${product.registrationNo}` : ` · Retailer #${product.retailerId}`}</div>
              {product.rejectionReason && <p className="mt-2 text-xs text-rose-700">Rejection note: {product.rejectionReason}</p>}
              {product.status === "DRAFT" && <p className="mt-2 text-xs text-amber-800">Drafts can go live immediately after an approved retailer adds at least one photo{categoryNeedsExpiryDate(product.category) ? " and the required expiry date" : ""}.</p>}
              {product.reviewedAt && <p className="mt-2 text-[11px] text-slate-500">Reviewed {new Date(product.reviewedAt).toLocaleString("en-IN")}{product.reviewedBy ? ` by ${product.reviewedBy}` : ""}</p>}
            </div>
            {product.status === "DRAFT" && <div className="flex shrink-0 gap-2 self-end lg:flex-col lg:self-start">
              <button type="button" disabled={savingId === product.id || product.photos.length === 0 || (categoryNeedsExpiryDate(product.category) && !product.expiryDate)} onClick={() => void publishDraft(product)} title={product.photos.length === 0 ? "The retailer must add a product photo first." : categoryNeedsExpiryDate(product.category) && !product.expiryDate ? "Add the required expiry date in the retailer product form." : "Publish this product to the marketplace now."} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-blue-900 px-3 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"><Check size={15} />{savingId === product.id ? "Publishing…" : "Make live"}</button>
            </div>}
            {product.status === "PENDING" && <div className="flex shrink-0 gap-2 self-end lg:flex-col lg:self-start">
              <button type="button" disabled={savingId === product.id} onClick={() => void decide(product, "APPROVE")} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-3 text-xs font-bold text-white disabled:opacity-50"><Check size={15} />Approve</button>
              <button type="button" disabled={savingId === product.id} onClick={() => { setRejecting(product); setReason(""); }} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-rose-300 px-3 text-xs font-bold text-rose-800 disabled:opacity-50"><X size={15} />Reject</button>
            </div>}
          </div>
        </article>)}
      </div>}

      {rejecting && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setRejecting(null); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="reject-product-title" className="w-full max-w-lg rounded-xl bg-white p-5 shadow-2xl">
          <h2 id="reject-product-title" className="text-lg font-bold text-slate-900">Reject product listing</h2>
          <p className="mt-1 text-sm text-slate-600">Give {rejecting.shopName} a reason so they can correct and resubmit the product.</p>
          <label className="mt-4 block text-xs font-bold text-slate-700">Reason<textarea autoFocus maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} rows={4} className="mt-1.5 w-full rounded-lg border border-slate-300 p-3 text-sm font-normal outline-none focus:border-blue-700" /></label>
          <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setRejecting(null)} className="min-h-10 rounded-lg border border-slate-300 px-4 text-xs font-bold text-slate-700">Cancel</button><button type="button" disabled={!reason.trim() || savingId === rejecting.id} onClick={() => void decide(rejecting, "REJECT", reason)} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-rose-700 px-4 text-xs font-bold text-white disabled:opacity-50">{savingId === rejecting.id && <Loader2 size={14} className="animate-spin" />}Reject listing</button></div>
        </section>
      </div>}

      {addOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !adding) setAddOpen(false); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="add-product-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-2xl">
          <div className="flex items-start justify-between border-b border-slate-200 p-5">
            <div><h2 id="add-product-title" className="text-lg font-bold text-slate-900">Add product draft</h2><p className="mt-1 text-sm text-slate-600">This stays private until the retailer adds photos and submits it for review.</p></div>
            <button type="button" disabled={adding} onClick={() => setAddOpen(false)} aria-label="Close add product form" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"><X size={18} /></button>
          </div>
          <form onSubmit={createDraft} className="space-y-4 p-5">
            <label className="block text-xs font-bold text-slate-700">Retailer / shop<select required value={draft.retailerId} onChange={(event) => setDraft({ ...draft, retailerId: event.target.value })} className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal"><option value="">Choose a retailer</option>{retailers.map((retailer) => <option key={retailer.id} value={retailer.id}>{retailer.shopName} · {retailer.name} · {retailer.approved ? "Approved" : retailer.status}</option>)}</select></label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-xs font-bold text-slate-700">Product name<input required maxLength={120} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 px-3 text-sm font-normal" /></label>
              <label className="block text-xs font-bold text-slate-700">Category<input required maxLength={80} value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} placeholder="e.g. Clothing, groceries, tools" className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 px-3 text-sm font-normal" /></label>
            </div>
            <label className="block text-xs font-bold text-slate-700">Description<textarea required maxLength={5000} rows={4} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-300 p-3 text-sm font-normal" /></label>
            <label className="block text-xs font-bold text-slate-700">Expiry date {categoryNeedsExpiryDate(draft.category) ? "(required before publishing)" : "(if applicable)"}<input type="date" value={draft.expiryDate} onChange={(event) => setDraft({ ...draft, expiryDate: event.target.value })} className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 px-3 text-sm font-normal" /></label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-xs font-bold text-slate-700">Price (₹)<input required inputMode="decimal" value={draft.price} onChange={(event) => setDraft({ ...draft, price: event.target.value })} placeholder="0.00" className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 px-3 text-sm font-normal" /></label>
              <label className="block text-xs font-bold text-slate-700">Stock<input required type="number" min={0} max={1000000} step={1} value={draft.stock} onChange={(event) => setDraft({ ...draft, stock: event.target.value })} className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 px-3 text-sm font-normal" /></label>
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end"><button type="button" disabled={adding} onClick={() => setAddOpen(false)} className="min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-bold text-slate-700 disabled:opacity-50">Cancel</button><button type="submit" disabled={adding || retailers.length === 0} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-900 px-4 text-sm font-bold text-white disabled:opacity-50">{adding && <Loader2 size={15} className="animate-spin" />}Add draft</button></div>
          </form>
        </section>
      </div>}
    </div>
  );
}
