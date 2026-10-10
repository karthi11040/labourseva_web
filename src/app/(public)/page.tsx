"use client";

import Link from "next/link";
import {
  ArrowRight,
  Search,
  Shield,
  Network,
  Store,
  UserRound,
  FileText,
  CheckCircle2,
  Clock,
  ChevronRight,
  Phone,
  Mail,
  Headphones,
  BadgeCheck,
  Wallet,
  FileCheck,
  ReceiptText,
  Bell,
  Users,
  LayoutDashboard,
  Loader2,
  Lock,
  Star,
  MapPin,
  Calendar,
  ExternalLink,
  HardHat,
  Wheat,
  Scissors,
  Zap,
  Heart,
} from "lucide-react";
import { useState } from "react";

// ── Hero Section ────────────────────────────────────────────────────────────
function HeroSection() {
  const [search, setSearch] = useState("");

  return (
    <section
      className="relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #EEF2FB 0%, #DBEAFE 40%, #F0F4FF 100%)",
      }}
      aria-label="Hero"
    >
      {/* Decorative shapes */}
      <div
        className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-20 pointer-events-none"
        style={{
          background: "radial-gradient(circle, #1D3F8F 0%, transparent 70%)",
          transform: "translate(30%, -30%)",
        }}
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full opacity-10 pointer-events-none"
        style={{
          background: "radial-gradient(circle, #1D3F8F 0%, transparent 70%)",
          transform: "translate(-40%, 40%)",
        }}
        aria-hidden="true"
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Text */}
          <div>
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6 border"
              style={{
                background: "rgba(29,63,143,0.08)",
                borderColor: "rgba(29,63,143,0.2)",
                color: "var(--primary)",
              }}
            >
              <Shield size={12} />
              Secure & Official Platform
            </div>

            <h1
              className="text-4xl sm:text-5xl font-bold leading-tight mb-6"
              style={{ color: "var(--text)", lineHeight: "1.15" }}
            >
              Labour welfare{" "}
              <span style={{ color: "var(--primary)" }}>services,</span>
              <br />
              made simpler
            </h1>

            <p
              className="text-lg leading-relaxed mb-8"
              style={{ color: "var(--text-secondary)", maxWidth: 520 }}
            >
              Access government welfare schemes, certificates, financial
              assistance and more — all in one place. LabourSeva is committed
              to the well-being and growth of every worker in Tamil Nadu.
            </p>

            {/* Search bar */}
            <div className="relative mb-8 max-w-lg">
              <label htmlFor="hero-search" className="sr-only">
                Search services
              </label>
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: "var(--text-muted)" }}
                aria-hidden="true"
              />
              <input
                id="hero-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search for services, schemes, certificates..."
                className="w-full h-13 pl-11 pr-32 text-sm border rounded-full outline-none transition-all"
                style={{
                  height: 52,
                  background: "#fff",
                  borderColor: "var(--border-strong)",
                  color: "var(--text)",
                  boxShadow: "var(--shadow-sm)",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "var(--primary)";
                  e.target.style.boxShadow = "var(--shadow-focus)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "var(--border-strong)";
                  e.target.style.boxShadow = "var(--shadow-sm)";
                }}
              />
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 h-9 px-5 rounded-full text-sm font-medium transition-all hover:shadow-[var(--shadow-primary)] active:scale-[0.98]"
                style={{ background: "var(--primary)", color: "var(--on-primary)" }}
              >
                Search
              </button>
            </div>

            {/* CTA buttons */}
            <div className="flex flex-wrap gap-3 mb-6">
              <Link
                href="/services"
                className="inline-flex items-center gap-2 h-12 px-6 rounded-full text-sm font-semibold transition-all hover:shadow-[var(--shadow-primary)] active:scale-[0.98]"
                style={{ background: "var(--primary)", color: "var(--on-primary)" }}
              >
                Explore services
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/track"
                className="inline-flex items-center gap-2 h-12 px-6 rounded-full text-sm font-semibold border-2 transition-all hover:bg-[var(--primary-tint)] active:scale-[0.98]"
                style={{
                  borderColor: "var(--primary)",
                  color: "var(--primary)",
                }}
              >
                <FileText size={16} />
                Track application
              </Link>
            </div>

            {/* Trust badge */}
            <div
              className="inline-flex items-center gap-2 text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              <Lock size={13} />
              Your information is secure and used only for service delivery.
            </div>
          </div>

          {/* Illustration */}
          <div className="relative hidden lg:flex items-center justify-center">
            <WorkerIllustration />
          </div>
        </div>
      </div>
    </section>
  );
}

function WorkerIllustration() {
  const workers = [
    { icon: HardHat, label: "Construction", color: "#F59E0B", bg: "#FFFBEB" },
    { icon: Scissors, label: "Textile", color: "#EC4899", bg: "#FDF2F8" },
    { icon: Wheat, label: "Agriculture", color: "#10B981", bg: "#ECFDF5" },
    { icon: Zap, label: "Industrial", color: "#3B82F6", bg: "#EFF6FF" },
  ];

  return (
    <div className="relative w-[420px] h-[420px]">
      {/* Central card */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-52 rounded-2xl p-5 text-center z-10"
        style={{
          background: "white",
          boxShadow: "0 20px 60px rgba(29,63,143,0.15)",
        }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3"
          style={{ background: "var(--primary-tint)" }}
        >
          <Heart size={28} style={{ color: "var(--primary)" }} />
        </div>
        <div className="font-bold text-sm mb-1" style={{ color: "var(--text)" }}>
          10 Lakh+
        </div>
        <div className="text-xs" style={{ color: "var(--text-muted)" }}>
          Workers registered
        </div>
        <div className="mt-3 flex items-center justify-center gap-1">
          {[1,2,3,4,5].map(i => (
            <Star key={i} size={10} fill="#F59E0B" stroke="none" />
          ))}
        </div>
        <div className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
          Trusted platform
        </div>
      </div>

      {/* Worker cards orbiting */}
      {workers.map((w, i) => {
        const angles = [315, 45, 135, 225];
        const angle = (angles[i] * Math.PI) / 180;
        const r = 155;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        const Icon = w.icon;
        return (
          <div
            key={w.label}
            className="absolute w-28 rounded-xl p-3 text-center"
            style={{
              background: "white",
              boxShadow: "0 8px 24px rgba(29,63,143,0.10)",
              left: `calc(50% + ${x}px - 56px)`,
              top: `calc(50% + ${y}px - 40px)`,
            }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2"
              style={{ background: w.bg }}
            >
              <Icon size={20} style={{ color: w.color }} />
            </div>
            <div className="text-xs font-medium" style={{ color: "var(--text)" }}>
              {w.label}
            </div>
          </div>
        );
      })}

      {/* Decorative ring */}
      <div
        className="absolute inset-0 rounded-full border-2 border-dashed pointer-events-none"
        style={{ borderColor: "rgba(29,63,143,0.12)" }}
        aria-hidden="true"
      />
    </div>
  );
}

// ── Statistics Strip ─────────────────────────────────────────────────────────
function StatsSection() {
  const stats = [
    { value: "50+", label: "Services available", icon: FileCheck },
    { value: "25+", label: "Welfare schemes", icon: Heart },
    { value: "10L+", label: "Workers registered", icon: Users },
    { value: "99.9%", label: "Uptime reliability", icon: BadgeCheck },
  ];

  return (
    <section
      className="border-y"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      aria-label="Platform statistics"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map(({ value, label, icon: Icon }) => (
            <div
              key={label}
              className="flex items-center gap-4 p-4 rounded-[var(--radius-lg)] border transition-shadow hover:shadow-[var(--shadow-md)]"
              style={{ borderColor: "var(--border)", background: "var(--bg)" }}
            >
              <div
                className="w-12 h-12 rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--primary-tint)" }}
              >
                <Icon size={22} style={{ color: "var(--primary)" }} />
              </div>
              <div>
                <div
                  className="text-2xl font-bold tabular"
                  style={{ color: "var(--text)" }}
                >
                  {value}
                </div>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Portal Cards ─────────────────────────────────────────────────────────────
function PortalSection() {
  const portals = [
    {
      icon: Network,
      title: "Distributor",
      description:
        "Handle bulk service requests, manage regional logistics and monitor retailer networks across your territory.",
      cta: "Network Login",
      href: "/distributor/login",
      accent: "#3B82F6",
      accentBg: "#EFF6FF",
    },
    {
      icon: Store,
      title: "Retail Partner",
      description:
        "Business dashboard for managing customer applications, transactions and daily Kendra store operations.",
      cta: "Partner Login",
      href: "/retailer/login",
      accent: "#8B5CF6",
      accentBg: "#F5F3FF",
    },
    {
      icon: UserRound,
      title: "Customer Portal",
      description:
        "Track your applications, book appointments, access certificates and manage your personal profile securely.",
      cta: "Consumer Login",
      href: "/user/login",
      accent: "#1D3F8F",
      accentBg: "#EEF2FB",
      featured: true,
    },
    {
      icon: FileText,
      title: "New Registration",
      description:
        "New to LabourSeva? Explore services, check your eligibility and register for an account in minutes.",
      cta: "Get Started",
      href: "/register",
      accent: "#10B981",
      accentBg: "#ECFDF5",
    },
  ];

  return (
    <section
      className="py-16 lg:py-24"
      style={{ background: "var(--bg-subtle)" }}
      aria-labelledby="portals-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2
            id="portals-heading"
            className="text-3xl sm:text-4xl font-bold mb-4"
            style={{ color: "var(--text)" }}
          >
            Choose your portal
          </h2>
          <p className="text-lg max-w-xl mx-auto" style={{ color: "var(--text-secondary)" }}>
            Select the portal that matches your role to access your personalised
            dashboard and services.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {portals.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.title}
                className={`group relative flex flex-col rounded-[var(--radius-lg)] border transition-all duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-md)] ${
                  p.featured ? "ring-2 ring-[var(--primary)]" : ""
                }`}
                style={{
                  background: "var(--surface)",
                  borderColor: "var(--border)",
                  padding: "24px",
                }}
              >
                {p.featured && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-semibold"
                    style={{ background: "var(--primary)", color: "var(--on-primary)" }}
                  >
                    Most used
                  </div>
                )}

                <div
                  className="w-14 h-14 rounded-[var(--radius-md)] flex items-center justify-center mb-5"
                  style={{ background: p.accentBg }}
                >
                  <Icon size={26} style={{ color: p.accent }} />
                </div>

                <h3
                  className="font-bold text-lg mb-2"
                  style={{ color: "var(--text)" }}
                >
                  {p.title}
                </h3>
                <p
                  className="text-sm leading-relaxed mb-6 flex-1"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {p.description}
                </p>

                <Link
                  href={p.href}
                  className="flex items-center justify-center gap-2 h-11 rounded-full text-sm font-semibold transition-all border-2 hover:shadow-md active:scale-[0.98]"
                  style={
                    p.featured
                      ? {
                          background: "var(--primary)",
                          color: "var(--on-primary)",
                          borderColor: "var(--primary)",
                        }
                      : {
                          background: "transparent",
                          color: p.accent,
                          borderColor: p.accent,
                        }
                  }
                >
                  {p.cta}
                  <ChevronRight size={15} />
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── How it works ─────────────────────────────────────────────────────────────
function HowItWorksSection() {
  const steps = [
    {
      num: "01",
      icon: UserRound,
      title: "Register & verify",
      desc: "Create your account with your mobile number. Verify your identity with a one-time password sent to your phone.",
    },
    {
      num: "02",
      icon: FileText,
      title: "Choose a service",
      desc: "Browse our catalogue of 50+ welfare services and schemes. Check eligibility and required documents before applying.",
    },
    {
      num: "03",
      icon: ReceiptText,
      title: "Apply & pay",
      desc: "Fill in the application form and pay the service fee securely via UPI, card or net banking through Razorpay.",
    },
    {
      num: "04",
      icon: BadgeCheck,
      title: "Track & receive",
      desc: "Track your application status in real time. Receive your certificate or benefit digitally once approved.",
    },
  ];

  return (
    <section
      className="py-16 lg:py-24"
      style={{ background: "var(--bg)" }}
      aria-labelledby="how-it-works-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2
            id="how-it-works-heading"
            className="text-3xl sm:text-4xl font-bold mb-4"
            style={{ color: "var(--text)" }}
          >
            How it works
          </h2>
          <p className="text-lg" style={{ color: "var(--text-secondary)" }}>
            Get your welfare services in four simple steps.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={s.num} className="relative text-center">
                {/* Connector line */}
                {i < steps.length - 1 && (
                  <div
                    className="hidden lg:block absolute top-10 left-[calc(50%+3rem)] w-[calc(100%-6rem)] h-px"
                    style={{ background: "var(--border)" }}
                    aria-hidden="true"
                  />
                )}

                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 relative z-10"
                  style={{ background: "var(--primary-tint)" }}
                >
                  <Icon size={32} style={{ color: "var(--primary)" }} />
                  <span
                    className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: "var(--primary)", color: "var(--on-primary)" }}
                  >
                    {i + 1}
                  </span>
                </div>

                <h3 className="font-semibold text-base mb-2" style={{ color: "var(--text)" }}>
                  {s.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  {s.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── Featured Services ─────────────────────────────────────────────────────────
function ServicesSection() {
  const categories = [
    "All", "Construction", "Agriculture", "Textile", "Industrial", "Domestic",
  ];
  const [active, setActive] = useState("All");

  const services = [
    { name: "Worker Registration", fee: "₹50", category: "All", icon: UserRound, desc: "Register as a labour welfare beneficiary." },
    { name: "Accident Relief Fund", fee: "Free", category: "Construction", icon: Shield, desc: "Financial assistance for workplace accidents." },
    { name: "Scholarship Scheme", fee: "Free", category: "All", icon: Star, desc: "Education scholarships for workers' children." },
    { name: "Housing Loan Subsidy", fee: "₹100", category: "Construction", icon: MapPin, desc: "Subsidised home loan assistance for workers." },
    { name: "Maternity Benefit", fee: "Free", category: "Textile", icon: Heart, desc: "Financial support for women workers during maternity." },
    { name: "Tool Kit Assistance", fee: "Free", category: "Industrial", icon: Zap, desc: "Free tool kit for skilled artisan workers." },
  ];

  return (
    <section
      className="py-16 lg:py-24"
      style={{ background: "var(--bg-subtle)" }}
      aria-labelledby="services-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h2
              id="services-heading"
              className="text-3xl sm:text-4xl font-bold mb-2"
              style={{ color: "var(--text)" }}
            >
              Featured services
            </h2>
            <p style={{ color: "var(--text-secondary)" }}>
              Explore welfare services available for workers in Tamil Nadu.
            </p>
          </div>
          <Link
            href="/services"
            className="flex-shrink-0 inline-flex items-center gap-1.5 text-sm font-semibold transition-colors hover:opacity-80"
            style={{ color: "var(--primary)" }}
          >
            View all services <ArrowRight size={15} />
          </Link>
        </div>

        {/* Category filter */}
        <div
          className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none"
          role="tablist"
          aria-label="Service categories"
        >
          {categories.map((cat) => (
            <button
              key={cat}
              role="tab"
              aria-selected={active === cat}
              onClick={() => setActive(cat)}
              className="flex-shrink-0 h-8 px-4 rounded-full text-sm font-medium transition-all border"
              style={
                active === cat
                  ? {
                      background: "var(--primary)",
                      color: "var(--on-primary)",
                      borderColor: "var(--primary)",
                    }
                  : {
                      background: "var(--surface)",
                      color: "var(--text-secondary)",
                      borderColor: "var(--border)",
                    }
              }
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {services
            .filter((s) => active === "All" || s.category === active || active === "All")
            .map((service) => {
              const Icon = service.icon;
              return (
                <div
                  key={service.name}
                  className="group flex gap-4 p-5 rounded-[var(--radius-lg)] border transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] cursor-pointer"
                  style={{ background: "var(--surface)", borderColor: "var(--border)" }}
                >
                  <div
                    className="w-11 h-11 rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0"
                    style={{ background: "var(--primary-tint)" }}
                  >
                    <Icon size={20} style={{ color: "var(--primary)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3
                        className="font-semibold text-sm leading-tight"
                        style={{ color: "var(--text)" }}
                      >
                        {service.name}
                      </h3>
                      <span
                        className="flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{
                          background: "var(--success-bg)",
                          color: "var(--success-text)",
                        }}
                      >
                        {service.fee}
                      </span>
                    </div>
                    <p
                      className="text-xs mt-1 leading-relaxed"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {service.desc}
                    </p>
                    <div
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium group-hover:gap-2 transition-all"
                      style={{ color: "var(--primary)" }}
                    >
                      Apply now <ChevronRight size={12} />
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </section>
  );
}

// ── Help & Notices ────────────────────────────────────────────────────────────
function HelpAndNoticesSection() {
  const notices = [
    {
      date: "09 Oct 2026",
      title: "Extension of scholarship application deadline for construction workers",
      isNew: true,
    },
    {
      date: "05 Oct 2026",
      title: "Update of KYC details required for continued benefit eligibility",
      isNew: true,
    },
    {
      date: "01 Oct 2026",
      title: "Awareness camp on labour welfare schemes to be held in all districts",
      isNew: false,
    },
    {
      date: "25 Sep 2026",
      title: "New tool kit assistance scheme launched for artisan workers",
      isNew: false,
    },
  ];

  return (
    <section
      className="py-16 lg:py-24"
      style={{ background: "var(--bg)" }}
      aria-label="Help and notices"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-10">
          {/* Support panel */}
          <div
            className="rounded-[var(--radius-lg)] border p-8"
            style={{
              background: "linear-gradient(135deg, #EEF2FB 0%, #DBEAFE 100%)",
              borderColor: "rgba(29,63,143,0.15)",
            }}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
              style={{ background: "var(--primary)", boxShadow: "var(--shadow-primary)" }}
            >
              <Headphones size={28} color="white" />
            </div>
            <h2 className="text-2xl font-bold mb-3" style={{ color: "var(--text)" }}>
              Need assistance?
            </h2>
            <p className="leading-relaxed mb-6" style={{ color: "var(--text-secondary)" }}>
              Our support team is here to help you with portal access, service
              selection or technical issues. We respond within 24 hours.
            </p>

            <div className="space-y-3 mb-6">
              <a
                href="tel:18004251234"
                className="flex items-center gap-3 group"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "white", boxShadow: "var(--shadow-xs)" }}
                >
                  <Phone size={16} style={{ color: "var(--primary)" }} />
                </div>
                <div>
                  <div className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                    Toll-free helpline (placeholder)
                  </div>
                  <div
                    className="font-semibold group-hover:underline"
                    style={{ color: "var(--text)" }}
                  >
                    1800 425 1234
                  </div>
                </div>
              </a>

              <a
                href="mailto:support@labourseva.com"
                className="flex items-center gap-3 group"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "white", boxShadow: "var(--shadow-xs)" }}
                >
                  <Mail size={16} style={{ color: "var(--primary)" }} />
                </div>
                <div>
                  <div className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                    Email support
                  </div>
                  <div
                    className="font-semibold group-hover:underline"
                    style={{ color: "var(--text)" }}
                  >
                    support@labourseva.com
                  </div>
                </div>
              </a>
            </div>

            <Link
              href="/help"
              className="inline-flex items-center gap-2 h-11 px-6 rounded-full text-sm font-semibold transition-all hover:shadow-[var(--shadow-primary)] active:scale-[0.98]"
              style={{ background: "var(--primary)", color: "var(--on-primary)" }}
            >
              Visit Help Centre
              <ArrowRight size={16} />
            </Link>
          </div>

          {/* Notices */}
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
                Latest notices
              </h2>
              <Link
                href="/news"
                className="text-sm font-medium flex items-center gap-1 transition-colors hover:opacity-80"
                style={{ color: "var(--primary)" }}
              >
                View all <ChevronRight size={14} />
              </Link>
            </div>

            <div className="space-y-3">
              {notices.map((n, i) => (
                <article
                  key={i}
                  className="flex gap-4 p-4 rounded-[var(--radius-md)] border transition-all hover:shadow-[var(--shadow-sm)] hover:border-[var(--primary)] cursor-pointer group"
                  style={{
                    background: "var(--surface)",
                    borderColor: "var(--border)",
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: "var(--primary-tint)" }}
                  >
                    <Bell size={16} style={{ color: "var(--primary)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {n.date}
                      </span>
                      {n.isNew && (
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                          style={{
                            background: "var(--danger-bg)",
                            color: "var(--danger-text)",
                          }}
                        >
                          NEW
                        </span>
                      )}
                    </div>
                    <p
                      className="text-sm font-medium leading-snug group-hover:text-[var(--primary)] transition-colors"
                      style={{ color: "var(--text)" }}
                    >
                      {n.title}
                    </p>
                    <span
                      className="inline-flex items-center gap-0.5 text-xs mt-1 transition-colors group-hover:gap-1"
                      style={{ color: "var(--primary)" }}
                    >
                      Read more <ChevronRight size={10} />
                    </span>
                  </div>
                </article>
              ))}
            </div>

            <div
              className="mt-4 p-3 rounded-[var(--radius-sm)] text-xs text-center"
              style={{
                background: "var(--warning-bg)",
                color: "var(--warning-text)",
              }}
            >
              Sample notices shown for demonstration. Real announcements will be managed by administrators.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Trust banner ──────────────────────────────────────────────────────────────
function TrustBanner() {
  const items = [
    { icon: Shield, label: "Secure platform", desc: "256-bit encryption" },
    { icon: BadgeCheck, label: "Verified services", desc: "Government-linked" },
    { icon: Clock, label: "24×7 availability", desc: "Always accessible" },
    { icon: Wallet, label: "Safe payments", desc: "Razorpay powered" },
  ];

  return (
    <section
      className="py-10 border-y"
      style={{ background: "var(--bg-subtle)", borderColor: "var(--border)" }}
      aria-label="Trust signals"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--primary-tint)" }}
              >
                <Icon size={18} style={{ color: "var(--primary)" }} />
              </div>
              <div>
                <div className="font-semibold text-sm" style={{ color: "var(--text)" }}>
                  {label}
                </div>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Page assembly ─────────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <>
      <HeroSection />
      <StatsSection />
      <PortalSection />
      <HowItWorksSection />
      <ServicesSection />
      <HelpAndNoticesSection />
      <TrustBanner />
    </>
  );
}
