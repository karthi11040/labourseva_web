"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Loader2, PhoneCall, Search, ShoppingBag, Store } from "lucide-react";

type MarketplaceProduct = {
  id: number;
  retailerId: number;
  shopName: string;
  registrationNo: string | null;
  retailerPhone: string | null;
  name: string;
  category: string;
  description: string;
  pricePaise: string;
  stock: number;
  photos: string[];
  expiryDate: string | null;
};

export default function MarketplaceBrowser({ buyerMode = false }: { buyerMode?: boolean }) {
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [cursor, setCursor] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [buyerSignedIn, setBuyerSignedIn] = useState(false);
  const [preferencesReady, setPreferencesReady] = useState(!buyerMode);

  useEffect(() => {
    if (!buyerMode) return;
    try {
      const saved = JSON.parse(localStorage.getItem("labourseva-marketplace-preferences") || "{}");
      if (typeof saved.search === "string") {
        setQuery(saved.search);
        setSearch(saved.search);
      }
      if (typeof saved.category === "string") setCategory(saved.category);
    } catch { /* Ignore invalid local preferences and start with the full catalogue. */ }
    setPreferencesReady(true);
  }, [buyerMode]);

  useEffect(() => {
    if (buyerMode && preferencesReady) {
      try {
        localStorage.setItem("labourseva-marketplace-preferences", JSON.stringify({ search, category }));
      } catch { /* Browsing still works when this browser blocks local storage. */ }
    }
  }, [buyerMode, preferencesReady, search, category]);

  const loadProducts = useCallback(async (reset = true, afterCursor: number | null = null) => {
    if (reset) setLoading(true);
    else setLoadingMore(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (category) params.set("category", category);
      if (!reset && afterCursor) params.set("cursor", String(afterCursor));
      const response = await fetch(`/api/marketplace/products?${params}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not load products.");
      setBuyerSignedIn(Boolean(data.buyerSignedIn));
      setProducts((current) => reset ? data.products : [...current, ...data.products]);
      setCategories(data.categories || []);
      setCursor(data.nextCursor);
      setHasMore(Boolean(data.hasMore));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load products.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [category, search]);

  useEffect(() => {
    if (preferencesReady) void loadProducts(true);
  }, [loadProducts, preferencesReady]);

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    setSearch(query.trim());
  }

  function resetPreferences() {
    setQuery("");
    setSearch("");
    setCategory("");
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 py-5">
      <header className="rounded-2xl bg-gradient-to-r from-blue-950 to-blue-800 px-6 py-9 text-white sm:px-10">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-300">{buyerMode ? "Customer & user marketplace" : "LabourSeva marketplace"}</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">{buyerMode ? "Your marketplace" : "Products from local retailers"}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">{buyerMode ? "Find products from verified local retailers. Your search and category preferences are remembered on this device." : "Browse products published by verified Kendra shops across Tamil Nadu."}</p>
        <form onSubmit={submitSearch} className="mt-6 flex max-w-2xl gap-2 rounded-xl bg-white p-1.5">
          <Search className="ml-2 mt-2.5 shrink-0 text-slate-400" size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products or categories" className="h-10 min-w-0 flex-1 border-0 px-2 text-sm text-slate-900 outline-none" />
          <button type="submit" className="rounded-lg bg-[#ea580c] px-4 text-sm font-bold text-white hover:bg-orange-700">Search</button>
        </form>
      </header>

      {buyerMode && (search || category) && <div className="flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-950"><span>Your saved marketplace filters are active.</span><button type="button" onClick={resetPreferences} className="font-bold underline underline-offset-2">Clear preferences</button></div>}

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setCategory("")} className={`rounded-full border px-3 py-2 text-xs font-bold ${!category ? "border-blue-900 bg-blue-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>All products</button>
        {categories.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={`rounded-full border px-3 py-2 text-xs font-bold ${category === item ? "border-blue-900 bg-blue-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>{item}</button>)}
      </div>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error} <button type="button" onClick={() => void loadProducts(true)} className="ml-2 font-bold underline">Retry</button></div>}
      {loading ? <div className="p-14 text-center text-sm text-slate-500"><Loader2 className="mx-auto mb-2 animate-spin" />Loading products…</div> : products.length === 0 ? <div className="rounded-xl border border-slate-200 bg-white p-14 text-center"><ShoppingBag className="mx-auto mb-3 text-slate-400" /><p className="font-bold text-slate-800">No products found</p><p className="mt-1 text-sm text-slate-500">Try another search or category.</p></div> : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => <article key={product.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {product.photos[0] ? <img src={product.photos[0]} alt={product.name} className="h-52 w-full bg-slate-100 object-cover" /> : <div className="flex h-52 items-center justify-center bg-slate-100 text-slate-400"><ShoppingBag size={32} /></div>}
          <div className="p-4">
            <span className="text-[10px] font-bold uppercase tracking-wide text-orange-700">{product.category}</span>
            <h2 className="mt-1 line-clamp-1 text-base font-bold text-slate-900">{product.name}</h2>
            <p className="mt-1 line-clamp-2 min-h-10 text-xs leading-5 text-slate-600">{product.description}</p>
            <p className="mt-3 text-xl font-black text-blue-900">₹{(Number(product.pricePaise) / 100).toFixed(2)}</p>
            {product.expiryDate && <p className="mt-1 text-xs font-medium text-amber-800">Expiry date: {product.expiryDate}</p>}
            <div className="mt-3 flex items-center gap-1.5 border-t border-slate-100 pt-3 text-[11px] text-slate-500"><Store size={13} className="shrink-0" /><span className="truncate">{product.shopName}</span>{product.registrationNo && <span className="ml-auto shrink-0 font-mono">{product.registrationNo}</span>}</div>
            <p className={`mt-2 text-[11px] font-semibold ${product.stock > 0 ? "text-emerald-700" : "text-slate-500"}`}>{product.stock > 0 ? "Available" : "Currently out of stock"}</p>
            {product.stock > 0 && (product.retailerPhone
              ? <a href={`tel:${product.retailerPhone}`} className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#1e3a8a] px-3 text-sm font-bold text-white hover:bg-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2" aria-label={`Call ${product.shopName} to order ${product.name}`}><PhoneCall size={15} />Call retailer to order</a>
              : !buyerSignedIn && <Link href="/user/login" className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-blue-900 px-3 text-sm font-bold text-blue-900 hover:bg-blue-50">Sign in to contact retailer</Link>)}
          </div>
        </article>)}
      </div>}

      {!loading && hasMore && <div className="flex justify-center"><button type="button" disabled={loadingMore} onClick={() => void loadProducts(false, cursor)} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">{loadingMore && <Loader2 size={15} className="animate-spin" />}Load more</button></div>}
      <p className="text-center text-xs text-slate-500">Customers and users can contact retailers directly to buy. Payment and delivery are arranged with the retailer.</p>
    </div>
  );
}
