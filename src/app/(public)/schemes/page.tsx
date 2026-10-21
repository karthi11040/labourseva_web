"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Shield,
  Search,
  Filter,
  CheckCircle2,
  ArrowRight,
  Calculator,
  Heart,
  Star,
  Users,
  Building,
  GraduationCap,
  Sparkles,
} from "lucide-react";

interface Scheme {
  id: string;
  name: string;
  nameTa: string;
  category: "all" | "construction" | "manual" | "transport" | "women" | "education";
  categoryLabel: string;
  maxBenefit: string;
  eligibility: string;
  eligibilityTa: string;
  description: string;
  serviceId: number;
}

const schemes: Scheme[] = [
  {
    id: "sch-1",
    name: "Accident Death and Disability Relief",
    nameTa: "விபத்து மரணம் மற்றும் ஊனமுற்றோர் நிவாரணம்",
    category: "manual",
    categoryLabel: "All Manual Workers",
    maxBenefit: "₹5,00,000",
    eligibility: "Registered worker involved in fatal or severe disabling workplace accident",
    eligibilityTa: "பணியிட விபத்தில் பாதிக்கப்பட்ட பதிவுபெற்ற தொழிலாளர்கள்",
    description: "Financial grant provided to legal heirs upon accidental death, or to the worker in case of loss of limbs or total permanent disability.",
    serviceId: 2,
  },
  {
    id: "sch-2",
    name: "Dr. Muthulakshmi Reddy Maternity Assistance",
    nameTa: "மகப்பேறு நிதியுதவி மற்றும் ஊட்டச்சத்து திட்டம்",
    category: "women",
    categoryLabel: "Women Workers",
    maxBenefit: "₹6,000 + Nutrition Kit",
    eligibility: "Registered female worker for first two live births with active membership",
    eligibilityTa: "முதல் இரு பிரசவங்களுக்கு பதிவுபெற்ற பெண் தொழிலாளர்கள்",
    description: "Financial allowance and nutritional supplements to safeguard maternal health and reduce infant mortality among unorganised labourers.",
    serviceId: 5,
  },
  {
    id: "sch-3",
    name: "Higher Education Merit Scholarship",
    nameTa: "உயர் கல்வி சிறப்பு உதவித்தொகை",
    category: "education",
    categoryLabel: "Children Education",
    maxBenefit: "₹12,000 / year",
    eligibility: "Children of registered workers enrolled in Engineering, Medical, Polytechnic, or Degree courses",
    eligibilityTa: "பொறியியல், மருத்துவம் மற்றும் பட்டப்படிப்பு பயிலும் தொழிலாளர்களின் பிள்ளைகள்",
    description: "Annual financial support disbursed directly to student bank accounts to cover tuition and textbook fees.",
    serviceId: 3,
  },
  {
    id: "sch-4",
    name: "Affordable Housing Construction Subsidy",
    nameTa: "சொந்த வீடு கட்டும் மானியத் திட்டம்",
    category: "construction",
    categoryLabel: "Construction Workers",
    maxBenefit: "₹4,00,000",
    eligibility: "Registered construction worker with at least 3 years standing owning residential site",
    eligibilityTa: "சொந்த வீட்டுமனை வைத்துள்ள குறைந்தபட்சம் 3 ஆண்டுகள் பதிவுபெற்ற கட்டுமானத் தொழிலாளி",
    description: "Financial grant under the Tamil Nadu Construction Workers Welfare Board for building a permanent disaster-resistant pucca house.",
    serviceId: 4,
  },
  {
    id: "sch-5",
    name: "Artisan Modern Tool Kit Grant",
    nameTa: "கைவினைஞர் நவீன கருவிகள் உதவித் திட்டம்",
    category: "manual",
    categoryLabel: "Skilled Artisans",
    maxBenefit: "₹5,000 Value Kit",
    eligibility: "Registered carpenters, electricians, plumbers, welders, and masons",
    eligibilityTa: "தச்சர், எலக்ட்ரீஷியன், பிளம்பர், வெல்டர் மற்றும் கொத்தனார் தொழிலாளர்கள்",
    description: "Distribution of ISI-certified professional trade tools to improve worker productivity, safety, and daily earning potential.",
    serviceId: 6,
  },
  {
    id: "sch-6",
    name: "Old Age Welfare Pension Scheme",
    nameTa: "முதியோர் சமூகப் பாதுகாப்பு ஓய்வூதியம்",
    category: "manual",
    categoryLabel: "Senior Workers",
    maxBenefit: "₹1,000 / month for life",
    eligibility: "Registered worker completing 60 years of age with 5 years active subscription",
    eligibilityTa: "60 வயது பூர்த்தியடைந்த 5 ஆண்டுகள் உறுப்பினர் பதிவை நிறைவுசெய்த தொழிலாளர்கள்",
    description: "Lifelong monthly pension deposited through Direct Benefit Transfer into bank accounts on the 1st of every month.",
    serviceId: 11,
  },
  {
    id: "sch-7",
    name: "Daughter Marriage Financial Grant",
    nameTa: "மகள் திருமண உதவித்தொகை",
    category: "women",
    categoryLabel: "Family Welfare",
    maxBenefit: "₹10,000",
    eligibility: "Registered manual labourer solemnising marriage of self (female) or daughter (18+ yrs)",
    eligibilityTa: "18 வயது பூர்த்தியடைந்த பெண் தொழிலாளி அல்லது அவரது மகளின் திருமணம்",
    description: "One-time financial contribution to assist wedding expenses and family social security.",
    serviceId: 8,
  },
  {
    id: "sch-8",
    name: "Critical Illness Hospitalisation Reimbursement",
    nameTa: "தீவிர நோய் மருத்துவ சிகிச்சை உதவி",
    category: "manual",
    categoryLabel: "Healthcare Support",
    maxBenefit: "₹1,00,000",
    eligibility: "Major surgery, heart surgery, renal failure, cancer treatment in recognised hospital",
    eligibilityTa: "இதய அறுவை சிகிச்சை, புற்றுநோய் போன்ற தீவிர நோய்களுக்கு சிகிச்சை பெறுவோர்",
    description: "Medical reimbursement for inpatient treatment, diagnostics, and surgical interventions.",
    serviceId: 12,
  },
  {
    id: "sch-9",
    name: "Agricultural Calamity Relief Fund",
    nameTa: "விவசாய பேரிடர் நிவாரண நிதி",
    category: "manual",
    categoryLabel: "Agricultural Workers",
    maxBenefit: "₹10,000",
    eligibility: "Registered farm labourers in notified cyclone, flood, or drought districts",
    eligibilityTa: "இயற்கை பேரிடரால் வாழ்வாதாரம் பாதிக்கப்பட்ட விவசாய தொழிலாளர்கள்",
    description: "Immediate relief support to agricultural workers facing livelihood interruption due to climate extremes.",
    serviceId: 10,
  },
];

export default function SchemesPage() {
  const [selectedCat, setSelectedCat] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Benefit Estimator state
  const [estBoard, setEstBoard] = useState("construction");
  const [estYears, setEstYears] = useState("3");
  const [estChildren, setEstChildren] = useState("1");
  const [estimatedTotal, setEstimatedTotal] = useState<number | null>(null);

  const filteredSchemes = schemes.filter((s) => {
    const matchCat = selectedCat === "all" || s.category === selectedCat;
    const matchSearch =
      searchQuery === "" ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.nameTa.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  function calculateEstimate() {
    let base = 500000; // Accident base
    if (estBoard === "construction") base += 400000; // Housing option
    base += Number(estChildren) * 12000; // Education
    setEstimatedTotal(base);
  }

  return (
    <div style={{ background: "var(--bg-subtle)", minHeight: "100vh" }} className="py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold mb-3 border shadow-xs"
            style={{
              background: "var(--color-12)",
              color: "var(--color-dark-blue-1)",
              borderColor: "var(--color-11)",
            }}
          >
            <Shield size={14} style={{ color: "var(--color-6)" }} />
            <span>Tamil Nadu Unorganised Workers Welfare Boards · அதிகாரப்பூர்வ நலத்திட்டங்கள்</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-2">
            Welfare Schemes Directory
          </h1>
          <p className="text-base font-semibold mb-3" style={{ color: "var(--color-8)", fontFamily: "var(--font-sans-ta)" }}>
            அமைப்புசாரா தொழிலாளர்கள் நலத்திட்டங்கள்
          </p>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Discover all 17 welfare board assistance schemes available for workers in Tamil Nadu. Check eligibility, maximum benefits, and apply online.
          </p>
        </div>

        {/* Search & Categories Bar */}
        <div className="bg-white rounded-2xl border p-4 sm:p-6 mb-8 shadow-xs" style={{ borderColor: "var(--border)" }}>
          <div className="flex flex-col md:flex-row items-center gap-4 mb-5">
            <div className="relative w-full flex-1">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search schemes by name, keyword or benefit..."
                className="w-full pl-11 pr-4 h-12 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-[#1e3a8a] transition-all"
                style={{ borderColor: "var(--border)" }}
              />
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {[
              { id: "all", label: "All Schemes" },
              { id: "construction", label: "Construction" },
              { id: "manual", label: "Manual Labour" },
              { id: "women", label: "Women & Maternity" },
              { id: "education", label: "Education" },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCat(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
                  selectedCat === cat.id
                    ? "bg-[#1e3a8a] text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Schemes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {filteredSchemes.map((scheme) => (
            <article
              key={scheme.id}
              className="bg-white rounded-2xl border p-6 flex flex-col justify-between shadow-xs hover:shadow-md transition-all group"
              style={{ borderColor: "var(--border)" }}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span
                    className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border"
                    style={{ background: "var(--color-14)", color: "var(--color-dark-blue-1)", borderColor: "var(--color-11)" }}
                  >
                    {scheme.categoryLabel}
                  </span>
                  <span
                    className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                    style={{ background: "var(--success-bg)", color: "var(--success-text)" }}
                  >
                    Max: {scheme.maxBenefit}
                  </span>
                </div>

                <h2 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-[#1e3a8a] transition-colors">
                  {scheme.name}
                </h2>
                <p className="text-xs font-semibold mt-1 mb-3" style={{ color: "var(--color-8)", fontFamily: "var(--font-sans-ta)" }}>
                  {scheme.nameTa}
                </p>

                <p className="text-xs sm:text-sm text-slate-600 line-clamp-3 mb-4 leading-relaxed">
                  {scheme.description}
                </p>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mb-6">
                  <span className="text-[11px] font-bold text-slate-700 block mb-1">Eligibility:</span>
                  <p className="text-xs text-slate-600">{scheme.eligibility}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <Link
                  href={`/services/${scheme.serviceId}`}
                  className="text-xs font-bold text-[#1e3a8a] hover:underline"
                >
                  View Scheme Guidelines →
                </Link>
                <Link
                  href={`/user/apply?serviceId=${scheme.serviceId}`}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#1e3a8a] text-white hover:opacity-95 transition-opacity"
                >
                  Apply
                </Link>
              </div>
            </article>
          ))}
        </div>

        {/* Interactive Eligibility & Benefit Estimator */}
        <div
          className="rounded-3xl border p-6 sm:p-10 mb-12 shadow-sm relative overflow-hidden"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div className="max-w-2xl mb-6">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1e3a8a] uppercase tracking-wider mb-2">
              <Calculator size={16} /> Interactive Tool
            </span>
            <h2 className="text-2xl font-black text-slate-900">
              Welfare Benefit Estimator · நல உதவி மதிப்பீட்டாளர்
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Select your trade board and family details to estimate the cumulative welfare benefits and insurance cover you qualify for.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-2">Welfare Board / Trade</label>
              <select
                value={estBoard}
                onChange={(e) => setEstBoard(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border text-sm outline-none bg-slate-50 font-medium"
                style={{ borderColor: "var(--border)" }}
              >
                <option value="construction">Construction Workers Board</option>
                <option value="manual">Manual Labourers Board</option>
                <option value="transport">Auto & Taxi Drivers Board</option>
                <option value="agriculture">Agricultural Labourers Board</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-2">Years of Registered Standing</label>
              <select
                value={estYears}
                onChange={(e) => setEstYears(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border text-sm outline-none bg-slate-50 font-medium"
                style={{ borderColor: "var(--border)" }}
              >
                <option value="1">1 Year (Basic Coverage)</option>
                <option value="3">3 Years (Eligible for Housing)</option>
                <option value="5">5+ Years (Full Benefits & Pension)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-2">School / College-going Children</label>
              <select
                value={estChildren}
                onChange={(e) => setEstChildren(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border text-sm outline-none bg-slate-50 font-medium"
                style={{ borderColor: "var(--border)" }}
              >
                <option value="0">None</option>
                <option value="1">1 Child</option>
                <option value="2">2 Children</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={calculateEstimate}
              className="h-11 px-6 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 shadow-xs hover:opacity-95 transition-opacity"
              style={{ background: "var(--color-6)" }}
            >
              <Calculator size={16} />
              <span>Calculate Total Entitlements</span>
            </button>

            {estimatedTotal !== null && (
              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
                <Sparkles size={20} className="text-emerald-600" />
                <div>
                  <span className="text-xs font-semibold text-emerald-800">Estimated Welfare Cover:</span>
                  <span className="text-lg font-black text-emerald-700 ml-2">₹{estimatedTotal.toLocaleString("en-IN")}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
