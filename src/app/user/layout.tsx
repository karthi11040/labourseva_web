"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { clearCitizenSession } from "@/lib/citizen-session";
import { NotificationBell } from "@/modules/notifications/components/NotificationBell";
import {
  LayoutDashboard,
  FilePlus2,
  Layers,
  ClipboardList,
  Receipt,
  LifeBuoy,
  UserCheck,
  Bell,
  LogOut,
  Menu,
  X,
  Shield,
  Sun,
  Moon,
  Globe,
  CheckCircle2,
  FileText,
  AlertCircle,
  Phone,
  ChevronRight,
  Store,
} from "lucide-react";

const navigationItems = [
  { href: "/user/dashboard", label: "Dashboard", labelTa: "முகப்பு", icon: LayoutDashboard },
  { href: "/user/apply", label: "Document Services", labelTa: "ஆவண சேவைகள்", icon: FilePlus2 },
  { href: "/user/es-services", label: "Online E-Services", labelTa: "மின் சேவைகள்", icon: Layers },
  { href: "/user/applications", label: "My Applications", labelTa: "விண்ணப்பங்கள்", icon: ClipboardList },
  { href: "/user/payments", label: "Payments & Receipts", labelTa: "கட்டண ரசீதுகள்", icon: Receipt },
  { href: "/user/tickets", label: "Helpdesk Tickets", labelTa: "குறைதீர்ப்பு", icon: LifeBuoy },
  { href: "/user/marketplace", label: "Marketplace", labelTa: "சந்தை", icon: Store },
  { href: "/user/profile", label: "Profile & Security", labelTa: "சுயவிவரம்", icon: UserCheck },
];

const mobileNavigationItems = [
  { ...navigationItems[0], mobileLabel: "Home", mobileLabelTa: "முகப்பு" },
  { ...navigationItems[1], mobileLabel: "Services", mobileLabelTa: "சேவைகள்" },
  { ...navigationItems[2], mobileLabel: "E-Services", mobileLabelTa: "மின் சேவைகள்" },
  { ...navigationItems[3], mobileLabel: "Applications", mobileLabelTa: "விண்ணப்பங்கள்" },
  { ...navigationItems[7], mobileLabel: "Profile", mobileLabelTa: "சுயவிவரம்" },
];

export default function UserPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname?.startsWith("/user/login") || pathname?.startsWith("/user/register") || false;

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [citizenName, setCitizenName] = useState("Citizen");
  const citizenInitials = citizenName.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join("") || "C";
  const { language: lang, setLanguage } = useLanguage();

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("labourseva-theme") as "light" | "dark" | null;
    if (savedTheme === "light" || savedTheme === "dark") {
      setTheme(savedTheme);
      document.documentElement.dataset.theme = savedTheme;
    }
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileMenuOpen]);

  useEffect(() => {
    let active = true;
    const loadSavedName = async () => {
      try {
        const response = await fetch("/api/verification/status?userType=customer");
        const data = await response.json();
        const savedName = String(data?.profileData?.fullName || data?.profileData?.applicantName || "").trim();
        if (active && response.ok && data.ok && savedName) setCitizenName(savedName);
      } catch { /* retain the neutral account label until profile data loads */ }
    };
    const onProfileDraftSaved = (event: Event) => {
      const savedName = String((event as CustomEvent<{ name?: string }>).detail?.name || "").trim();
      setCitizenName(savedName || "Citizen");
    };
    void loadSavedName();
    window.addEventListener("citizen-profile-draft-saved", onProfileDraftSaved);
    return () => {
      active = false;
      window.removeEventListener("citizen-profile-draft-saved", onProfileDraftSaved);
    };
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("labourseva-theme", nextTheme);
  }

  function toggleLang() {
    const nextLang = lang === "en" ? "ta" : "en";
    setLanguage(nextLang);
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className={`min-h-screen flex ${theme === "dark" ? "dark bg-slate-900" : "bg-slate-50"}`}>
      {/* Left Sidebar - Desktop */}
      <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:inset-y-0 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 shadow-sm z-30">
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 border-b border-slate-200 dark:border-slate-700">
          <Link href="/user/dashboard" className="flex items-center gap-3">
            <Image src="/images/Logo.webp" alt="LabourSeva logo" width={36} height={36} className="h-9 w-9 rounded-lg object-contain" />
            <div>
              <span className="text-lg font-black tracking-tight text-[#1e3a8a] dark:text-blue-400">
                Labour<span className="text-[#ea580c] dark:text-orange-400">Seva</span>
              </span>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium -mt-0.5">Citizen Portal</p>
            </div>
          </Link>
        </div>

        {/* User Profile Card */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
            <div className="w-11 h-11 rounded-full bg-[#1e3a8a] flex items-center justify-center text-white font-bold text-sm shadow-sm">
              {citizenInitials}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">{citizenName}</h3>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold flex items-center gap-1 mt-0.5">
                <CheckCircle2 size={10} /> Citizen account
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 mb-2">Menu</p>
          {navigationItems.map((item) => {
            const isActive = pathname === item.href || Boolean(pathname?.startsWith(`${item.href}/`));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group ${
                  isActive
                    ? "border-l-2 border-[#ea580c] bg-blue-50 dark:bg-blue-950/40 text-[#1e3a8a] dark:text-blue-300"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Icon size={18} className={isActive ? "text-[#ea580c]" : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"} />
                <span className="flex-1">{lang === "ta" ? item.labelTa : item.label}</span>
                {isActive && <ChevronRight size={16} className="text-[#ea580c]" />}
              </Link>
            );
          })}
        </nav>

        {/* Help & Logout */}
        <div className="px-4 py-4 border-t border-slate-100 dark:border-slate-700 space-y-2">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-1">Need help with claims?</p>
            <a
              href="tel:18004251234"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1e3a8a] dark:text-blue-400 hover:underline"
            >
              <Phone size={12} />
              <span>1800 425 1234</span>
            </a>
          </div>

          <Link
            href="/login"
            onClick={clearCitizenSession}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </Link>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 z-40 flex items-center justify-between gap-2 px-3 shadow-sm">
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="min-h-11 min-w-11 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
          aria-label="Toggle Navigation Menu"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <Link href="/user/dashboard" className="flex items-center gap-2">
          <Image src="/images/Logo.webp" alt="LabourSeva logo" width={32} height={32} className="h-8 w-8 rounded-lg object-contain" />
          <span className="text-base font-black tracking-tight text-[#1e3a8a] dark:text-blue-400">
            Labour<span className="text-[#ea580c] dark:text-orange-400">Seva</span>
          </span>
        </Link>

        <div className="flex items-center gap-1.5">
          {/* Mobile Notifications Bell */}
          <NotificationBell dropdownAlign="right" locale={lang} />

          <button
            type="button"
            onClick={toggleLang}
            className="min-h-11 min-w-11 px-2 rounded-lg border border-slate-200 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-300"
            aria-label={lang === "en" ? "Switch language to Tamil" : "Switch language to English"}
          >
            {lang === "en" ? "தமிழ்" : "EN"}
          </button>

          <div className="w-8 h-8 rounded-full bg-[#1e3a8a] flex items-center justify-center text-white font-bold text-xs">
            {citizenInitials}
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex" role="dialog" aria-modal="true" aria-label={lang === "ta" ? "வழிசெலுத்தல் மெனு" : "Navigation menu"}>
          <button
            type="button"
            className="fixed inset-0 bg-black/40"
            aria-label={lang === "ta" ? "மெனுவை மூடு" : "Close navigation menu"}
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] bg-white dark:bg-slate-800 h-full shadow-xl flex flex-col z-10">
            <div className="p-5 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3 mb-4">
                <Image src="/images/Logo.webp" alt="LabourSeva logo" width={36} height={36} className="h-9 w-9 rounded-lg object-contain" />
                <span className="text-lg font-black tracking-tight text-[#1e3a8a] dark:text-blue-400">
                  Labour<span className="text-[#ea580c] dark:text-orange-400">Seva</span>
                </span>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
                <div className="w-11 h-11 rounded-full bg-[#1e3a8a] flex items-center justify-center text-white font-bold text-sm">
                  {citizenInitials}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{citizenName}</h3>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold">Citizen account</p>
                </div>
              </div>
            </div>

            <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
              {navigationItems.map((item) => {
                const isActive = pathname === item.href || Boolean(pathname?.startsWith(`${item.href}/`));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "border-l-2 border-[#ea580c] bg-blue-50 dark:bg-blue-950/40 text-[#1e3a8a] dark:text-blue-300"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                    }`}
                  >
                    <Icon size={18} />
                    <span>{lang === "ta" ? item.labelTa : item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-2 p-4 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={toggleTheme}
                className="min-h-11 min-w-11 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 flex items-center justify-center"
                aria-label={lang === "ta" ? "தோற்றத்தை மாற்று" : "Toggle theme"}
              >
                {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
              </button>
              <Link
                href="/login"
                onClick={() => {
                  clearCitizenSession();
                  setMobileMenuOpen(false);
                }}
                className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg text-sm font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30"
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      <nav aria-label={lang === "ta" ? "விரைவு வழிசெலுத்தல்" : "Quick navigation"} className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden dark:border-slate-700 dark:bg-slate-800/95">
        {mobileNavigationItems.map((item) => {
          const isActive = pathname === item.href || Boolean(pathname?.startsWith(`${item.href}/`));
          const Icon = item.icon;
          const label = lang === "ta" ? item.mobileLabelTa : item.mobileLabel;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-center text-[10px] font-semibold leading-tight ${isActive ? "text-[#1e3a8a] dark:text-blue-300" : "text-slate-500 dark:text-slate-400"}`}
            >
              <Icon size={18} className={isActive ? "text-[#ea580c]" : ""} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 lg:ml-72 min-w-0 pt-16 lg:pt-0">
        {/* Top Bar - Desktop only since mobile has fixed mobile header */}
        <header className="hidden lg:block sticky top-0 z-20 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <div className="lg:hidden w-8 h-8 rounded-full bg-[#1e3a8a] flex items-center justify-center text-white font-bold text-xs">
            {citizenInitials}
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-900 dark:text-white">Citizen Portal</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">Tamil Nadu Labour Welfare Board</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Language Switch */}
              <button
                type="button"
                onClick={toggleLang}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1.5"
              >
                <Globe size={13} />
                <span>{lang === "en" ? "தமிழ்" : "English"}</span>
              </button>

              {/* Theme Switch */}
              <button
                type="button"
                onClick={toggleTheme}
                className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 hidden sm:flex"
                aria-label="Toggle Theme"
              >
                {theme === "light" ? <Moon size={15} /> : <Sun size={15} />}
              </button>

              {/* Notifications */}
              <NotificationBell dropdownAlign="right" locale={lang} />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 sm:p-6 lg:p-8 pb-32">
          {children}
        </main>
      </div>
    </div>
  );
}
