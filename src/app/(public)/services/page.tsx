"use client";

import Link from "next/link";
import {
  Search,
  Clock,
  ChevronRight,
  ArrowRight,
  FileText,
  BadgeCheck,
  Shield,
  Layers,
  Sparkles,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";

interface ServiceItem {
  id: number;
  name: string;
  nameTa?: string;
  category: string;
  fee: string;
  time: string;
  description: string;
  logo?: string | null;
}

const defaultCategories = [
  { id: "all", label: "All Services", labelTa: "அனைத்து சேவைகள்" },
  { id: "welfare", label: "Welfare Board", labelTa: "நலவாரியம்" },
  { id: "licensing", label: "Statutory Licensing", labelTa: "உரிமம்" },
  { id: "schemes", label: "Social Schemes", labelTa: "திட்டங்கள்" },
  { id: "insurance", label: "Relief & Insurance", labelTa: "நிவாரணம்" },
];

export default function ServicesPage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch real services from API
  useEffect(() => {
    async function loadServices() {
      try {
        setIsLoading(true);
        const res = await fetch("/api/services", { cache: "no-store" });
        const data = await res.json();

        if (data.ok && Array.isArray(data.mainServices) && data.mainServices.length > 0) {
          const flatList: ServiceItem[] = [];
          for (const main of data.mainServices) {
            for (const sub of main.subServices || []) {
              flatList.push({
                id: sub.id,
                name: sub.name,
                nameTa: sub.nameTa,
                category: main.name || "General",
                fee: sub.fee === 0 ? "Free" : `₹${sub.fee}`,
                time: sub.time || "3-7 Days",
                description: sub.description || "",
                logo: sub.logo || main.logo,
              });
            }
          }
          setServices(flatList);
        } else {
          setServices([]);
        }
      } catch (err) {
        console.error("Failed to load services catalogue:", err);
        setServices([]);
      } finally {
        setIsLoading(false);
      }
    }

    loadServices();
  }, []);

  // Filtered services
  const filteredServices = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return services.filter((s) => {
      const matchesCategory =
        activeCategory === "all" ||
        s.category.toLowerCase().includes(activeCategory.toLowerCase());

      const matchesQuery =
        !q ||
        s.name.toLowerCase().includes(q) ||
        (s.nameTa && s.nameTa.toLowerCase().includes(q)) ||
        s.description.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q);

      return matchesCategory && matchesQuery;
    });
  }, [services, activeCategory, searchQuery]);

  return (
    <div style={{ background: "var(--bg-subtle)", minHeight: "100vh" }} suppressHydrationWarning>
      {/* Page Header */}
      <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#ea580c]">
              Government of Tamil Nadu
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#1e3a8a] border border-blue-200">
              Department of Labour &amp; Employment
            </span>
          </div>

          <h1 className="text-3xl font-extrabold sm:text-4xl text-slate-900 dark:text-white tracking-tight">
            All Services &amp; Schemes
          </h1>
          <p className="mt-1 text-base font-semibold text-[#1e3a8a] dark:text-blue-300 font-sans">
            அனைத்து அரசு மற்றும் நலவாரிய சேவைகள்
          </p>
          <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
            Browse and apply for official labour welfare services, statutory certificates, and government assistance schemes available in Tamil Nadu.
          </p>

          {/* Search Bar */}
          <div className="relative mt-6 max-w-xl">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search services, schemes and certificates..."
              className="w-full pl-11 pr-12 h-12 rounded-xl border border-slate-300 bg-white dark:bg-slate-800 dark:border-slate-700 text-sm text-slate-900 dark:text-white outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 transition-all shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold px-2 py-0.5 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-8 scrollbar-none">
          {defaultCategories.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`flex-shrink-0 min-h-10 px-4 rounded-xl text-xs sm:text-sm font-bold border transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 ${
                  isActive
                    ? "bg-[#1e3a8a] text-white border-[#1e3a8a] shadow-xs"
                    : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50"
                }`}
              >
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Results Count Strip */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400">
            Showing <strong className="text-slate-900 dark:text-white font-mono">{filteredServices.length}</strong> service
            {filteredServices.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 animate-pulse"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-slate-200 rounded-xl" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-4 bg-slate-200 rounded w-3/4" />
                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-14 bg-slate-100 rounded-lg" />
                <div className="h-9 bg-slate-200 rounded-lg" />
              </div>
            ))}
          </div>
        ) : filteredServices.length > 0 ? (
          /* Services Grid */
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredServices.map((service) => (
              <article
                key={service.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-2xs hover:shadow-md hover:border-blue-400 dark:hover:border-blue-600 transition-all duration-200 group"
              >
                <div>
                  <div className="flex items-start gap-3.5 mb-3">
                    <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs group-hover:scale-105 transition-transform">
                      {service.logo ? (
                        <img
                          src={service.logo}
                          alt={service.name}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <FileText size={20} className="text-[#1e3a8a] dark:text-blue-400" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h2 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-snug line-clamp-2 group-hover:text-[#1e3a8a] transition-colors">
                        {service.name}
                      </h2>
                      {service.nameTa && (
                        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 font-sans mt-0.5 line-clamp-1">
                          {service.nameTa}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                          Fee: {service.fee}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
                          <Clock size={11} /> {service.time}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4 line-clamp-3">
                    {service.description || "Review eligibility criteria and proceed with online application."}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2 mt-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    {service.category}
                  </span>
                  <Link
                    href={`/user/apply?serviceId=${service.id}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-bold transition-all active:scale-95 shadow-2xs"
                  >
                    <span>View &amp; Apply</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          /* Clean, standard Awaiting Catalogue State (No dummy services) */
          <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 p-12 text-center max-w-lg mx-auto shadow-2xs">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-[#1e3a8a] dark:text-blue-400 border border-blue-200 dark:border-blue-800 flex items-center justify-center mx-auto mb-3">
              <Layers size={22} />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Official Services Catalogue
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Official department services and welfare board schemes will be published here upon departmental confirmation.
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <Link
                href="/"
                className="px-4 py-2 rounded-lg bg-[#1e3a8a] text-white text-xs font-bold hover:bg-[#1e40af] transition-colors"
              >
                Back to Home
              </Link>
              <Link
                href="/track"
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 transition-colors"
              >
                Track Application
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
