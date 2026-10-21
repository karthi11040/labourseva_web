import Link from "next/link";
import {
  Shield,
  Users,
  Award,
  Building2,
  CheckCircle2,
  HeartHandshake,
  TrendingUp,
  MapPin,
  Phone,
  ArrowRight,
} from "lucide-react";

export default function AboutPage() {
  const stats = [
    { label: "Registered Workers", labelTa: "பதிவுசெய்த தொழிலாளர்கள்", value: "35,00,000+" },
    { label: "Welfare Boards", labelTa: "நல வாரியங்கள்", value: "17" },
    { label: "DBT Benefits Disbursed", labelTa: "வழங்கப்பட்ட நேரடி நிதி", value: "₹480+ Cr" },
    { label: "District Centres", labelTa: "மாவட்ட அலுவலகங்கள்", value: "38" },
  ];

  const boards = [
    "Tamil Nadu Construction Workers Welfare Board",
    "Tamil Nadu Manual Workers Social Security and Welfare Board",
    "Tamil Nadu Auto Rickshaw and Taxi Drivers Welfare Board",
    "Tamil Nadu Agricultural Labourers Welfare Board",
    "Tamil Nadu Domestic Workers Welfare Board",
    "Tamil Nadu Tailoring and Garment Workers Welfare Board",
    "Tamil Nadu Hairdressers Welfare Board",
    "Tamil Nadu Washermen Welfare Board",
    "Tamil Nadu Pottery Workers Welfare Board",
    "Tamil Nadu Handicrafts and Artisans Welfare Board",
    "Tamil Nadu Footwear and Leather Workers Welfare Board",
    "Tamil Nadu Handloom and Silk Weaving Workers Welfare Board",
  ];

  return (
    <div style={{ background: "var(--bg-subtle)", minHeight: "100vh" }} className="py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold mb-3 border shadow-xs"
            style={{
              background: "var(--color-12)",
              color: "var(--color-dark-blue-1)",
              borderColor: "var(--color-11)",
            }}
          >
            <Shield size={14} style={{ color: "var(--color-6)" }} />
            <span>Tamil Nadu Labour Welfare Initiative · சமூகப் பாதுகாப்பு இயக்கம்</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight mb-2">
            About LabourSeva
          </h1>
          <p className="text-base sm:text-lg font-semibold mb-3" style={{ color: "var(--color-8)", fontFamily: "var(--font-sans-ta)" }}>
            தொழிலாளர் நலன் மற்றும் சமூகப் பாதுகாப்பு தளம்
          </p>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Empowering millions of unorganised and manual labourers across Tamil Nadu through transparent digital welfare delivery, accident security, and direct financial entitlements.
          </p>
        </div>

        {/* Impact Numbers */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {stats.map((s, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl border p-6 text-center shadow-xs"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="text-2xl sm:text-3xl lg:text-4xl font-black mb-1" style={{ color: "var(--color-6)" }}>
                {s.value}
              </div>
              <div className="text-xs sm:text-sm font-bold text-slate-900">{s.label}</div>
              <div className="text-[11px] text-slate-500 mt-0.5" style={{ fontFamily: "var(--font-sans-ta)" }}>
                {s.labelTa}
              </div>
            </div>
          ))}
        </div>

        {/* Mission and Vision Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div
            className="bg-white rounded-3xl border p-8 shadow-xs flex flex-col justify-between"
            style={{ borderColor: "var(--border)" }}
          >
            <div>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5" style={{ background: "var(--color-12)", color: "var(--color-6)" }}>
                <TrendingUp size={24} />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Our Mission · எங்கள் நோக்கம்</h2>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                To guarantee comprehensive social security, health protection, education scholarships, and pension safety for every unorganised worker in Tamil Nadu by removing intermediaries and digitising application processes.
              </p>
              <ul className="space-y-2 text-xs sm:text-sm text-slate-700">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-[#1e3a8a] flex-shrink-0" />
                  <span>100% paperless Direct Benefit Transfer (DBT) directly into worker bank accounts.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-[#1e3a8a] flex-shrink-0" />
                  <span>Accidental death and disability protection up to ₹5,00,000 for every registered worker.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-[#1e3a8a] flex-shrink-0" />
                  <span>Bilingual access in Tamil and English accessible on any mobile device.</span>
                </li>
              </ul>
            </div>
          </div>

          <div
            className="bg-white rounded-3xl border p-8 shadow-xs flex flex-col justify-between"
            style={{ borderColor: "var(--border)" }}
          >
            <div>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5" style={{ background: "var(--color-12)", color: "var(--color-8)" }}>
                <HeartHandshake size={24} />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Citizen Charter · குடிமக்கள் சாசனம்</h2>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                We are committed to delivering prompt, courteous, and rule-bound administrative services with published SLA turnaround times:
              </p>
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Worker ID Card Issuance:</span>
                  <span className="text-xs font-semibold text-[#1e3a8a]">Within 3 to 5 Days</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Accident Relief Sanction:</span>
                  <span className="text-xs font-semibold text-[#1e3a8a]">Within 7 to 10 Days</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Grievance Redressal:</span>
                  <span className="text-xs font-semibold text-[#1e3a8a]">Within 7 Days Maximum</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Unorganised Welfare Boards List */}
        <div
          className="bg-white rounded-3xl border p-8 sm:p-10 mb-12 shadow-xs"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="max-w-2xl mb-8">
            <span className="text-xs font-bold text-[#1e3a8a] uppercase tracking-wider block mb-1">
              Statutory Coverage
            </span>
            <h2 className="text-2xl font-black text-slate-900">
              The 17 Welfare Boards of Tamil Nadu · தமிழ்நாடு நல வாரியங்கள்
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              LabourSeva supports beneficiaries registered under all autonomous welfare boards established under the Tamil Nadu Manual Workers (Regulation of Employment and Conditions of Work) Act:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {boards.map((board, i) => (
              <div
                key={i}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center gap-3 text-xs sm:text-sm font-semibold text-slate-800"
              >
                <div className="w-6 h-6 rounded-lg bg-blue-100 text-[#1e3a8a] flex items-center justify-center flex-shrink-0 text-xs font-bold">
                  {i + 1}
                </div>
                <span className="leading-snug">{board}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Strip */}
        <div
          className="rounded-3xl p-8 sm:p-10 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-6"
          style={{ background: "var(--color-dark-blue-1)" }}
        >
          <div>
            <h3 className="text-xl sm:text-2xl font-black mb-2">Are you an unorganised worker?</h3>
            <p className="text-xs sm:text-sm text-blue-100 max-w-xl">
              Register today with your Aadhaar card and gain access to insurance, maternity benefits, children scholarships, and retirement pensions.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/register"
              className="px-6 py-3 rounded-xl bg-white text-[#1e3a8a] text-xs sm:text-sm font-bold shadow-md hover:bg-blue-50 transition-colors whitespace-nowrap"
            >
              Register Now
            </Link>
            <Link
              href="/services"
              className="px-5 py-3 rounded-xl border border-white/40 text-white text-xs sm:text-sm font-semibold hover:bg-white/10 transition-colors whitespace-nowrap"
            >
              Browse Services
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
