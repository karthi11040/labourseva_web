"use client";

import Link from "next/link";
import {
  Search, Filter, UserRound, Shield, Star, Heart, MapPin, Zap,
  FileText, Scissors, HardHat, Wheat, ChevronRight, Clock, BadgeCheck,
} from "lucide-react";
import { useState } from "react";

const categories = [
  { id: "all", label: "All Services" },
  { id: "construction", label: "Construction" },
  { id: "agriculture", label: "Agriculture" },
  { id: "textile", label: "Textile" },
  { id: "industrial", label: "Industrial" },
  { id: "domestic", label: "Domestic" },
];

const services = [
  { id: 1, name: "Worker Registration", fee: "₹50", cat: "all", icon: UserRound, time: "3-5 days", desc: "Register as a labour welfare beneficiary and access all welfare schemes." },
  { id: 2, name: "Accident Relief Fund", fee: "Free", cat: "construction", icon: Shield, time: "7-10 days", desc: "Financial assistance for workplace accidents and injuries." },
  { id: 3, name: "Children's Scholarship", fee: "Free", cat: "all", icon: Star, time: "15-30 days", desc: "Education scholarships for school and college-going children of workers." },
  { id: 4, name: "Housing Loan Subsidy", fee: "₹100", cat: "construction", icon: MapPin, time: "30-60 days", desc: "Subsidised home loan assistance for registered workers." },
  { id: 5, name: "Maternity Benefit", fee: "Free", cat: "textile", icon: Heart, time: "7-15 days", desc: "Financial support for women workers during maternity leave." },
  { id: 6, name: "Tool Kit Assistance", fee: "Free", cat: "industrial", icon: Zap, time: "10-15 days", desc: "Free tool kit for skilled artisan and industrial workers." },
  { id: 7, name: "Death Relief Fund", fee: "Free", cat: "all", icon: FileText, time: "15-30 days", desc: "Financial assistance to family in case of worker's death." },
  { id: 8, name: "Marriage Assistance", fee: "Free", cat: "textile", icon: Heart, time: "15-20 days", desc: "One-time financial assistance for marriage of worker or daughter." },
  { id: 9, name: "Disability Benefit", fee: "Free", cat: "industrial", icon: Shield, time: "20-30 days", desc: "Monthly assistance for workers with permanent disability." },
  { id: 10, name: "Crop Loss Compensation", fee: "Free", cat: "agriculture", icon: Wheat, time: "30-45 days", desc: "Compensation for crop loss due to natural calamities." },
  { id: 11, name: "Pension Scheme", fee: "₹50/month", cat: "all", icon: BadgeCheck, time: "60-90 days", desc: "Monthly pension after retirement for registered workers." },
  { id: 12, name: "Medical Assistance", fee: "Free", cat: "all", icon: Shield, time: "10-20 days", desc: "Financial support for major illness and hospitalisation." },
];

export default function ServicesPage() {
  const [active, setActive] = useState("all");
  const [query, setQuery] = useState("");

  const filtered = services.filter(
    (s) =>
      (active === "all" || s.cat === active || s.cat === "all") &&
      (query === "" || s.name.toLowerCase().includes(query.toLowerCase()) || s.desc.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div style={{ background: "var(--bg-subtle)", minHeight: "100vh" }}>
      {/* Page header */}
      <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <h1 className="text-4xl font-bold mb-2" style={{ color: "var(--text)" }}>
            All Services
          </h1>
          <p style={{ color: "var(--text-secondary)" }}>
            Browse and apply for labour welfare services available in Tamil Nadu.
          </p>

          {/* Search */}
          <div className="relative mt-6 max-w-lg">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2"
              style={{ color: "var(--text-muted)" }}
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search services..."
              className="w-full pl-11 pr-4 h-12 rounded-full border text-sm outline-none"
              style={{
                background: "var(--surface)",
                borderColor: "var(--border-strong)",
                color: "var(--text)",
              }}
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Category tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-8">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActive(cat.id)}
              className="flex-shrink-0 h-9 px-4 rounded-full text-sm font-medium border transition-all"
              style={
                active === cat.id
                  ? { background: "var(--primary)", color: "var(--on-primary)", borderColor: "var(--primary)" }
                  : { background: "var(--surface)", color: "var(--text-secondary)", borderColor: "var(--border)" }
              }
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Results count */}
        <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
          Showing {filtered.length} service{filtered.length !== 1 ? "s" : ""}
        </p>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((service) => {
            const Icon = service.icon;
            return (
              <article
                key={service.id}
                className="flex flex-col rounded-[var(--radius-lg)] border transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]"
                style={{ background: "var(--surface)", borderColor: "var(--border)", padding: 20 }}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div
                    className="w-12 h-12 rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0"
                    style={{ background: "var(--primary-tint)" }}
                  >
                    <Icon size={22} style={{ color: "var(--primary)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-base" style={{ color: "var(--text)" }}>
                      {service.name}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: "var(--success-bg)", color: "var(--success-text)" }}
                      >
                        Fee: {service.fee}
                      </span>
                      <span
                        className="text-xs flex items-center gap-1"
                        style={{ color: "var(--text-muted)" }}
                      >
                        <Clock size={11} /> {service.time}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-sm leading-relaxed mb-5 flex-1" style={{ color: "var(--text-secondary)" }}>
                  {service.desc}
                </p>
                <Link
                  href={`/services/${service.id}`}
                  className="flex items-center justify-center gap-2 h-10 rounded-full text-sm font-semibold border-2 transition-all hover:bg-[var(--primary-tint)] active:scale-[0.98]"
                  style={{ borderColor: "var(--primary)", color: "var(--primary)" }}
                >
                  View & Apply <ChevronRight size={14} />
                </Link>
              </article>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20">
            <Search size={48} className="mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
            <h2 className="font-semibold text-lg mb-1" style={{ color: "var(--text)" }}>
              No services found
            </h2>
            <p style={{ color: "var(--text-muted)" }}>
              Try a different search term or category.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
