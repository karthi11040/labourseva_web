"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import LanguageToggle from "@/components/LanguageToggle";
import { useLanguage } from "@/components/LanguageProvider";
import {
  Bell,
  ClipboardCheck,
  FileStack,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  Network,
  PenTool,
  Search,
  ShieldCheck,
  UserCog,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";

type PortalMode = "admin" | "staff";

const adminNavigation = [
  { href: "/admin/dashboard", label: "Dashboard", labelTa: "டாஷ்போர்டு", icon: LayoutDashboard },
  { href: "/admin/applications", label: "Approval queue", labelTa: "ஒப்புதல் வரிசை", icon: ClipboardCheck },
  { href: "/admin/users", label: "Users & partners", labelTa: "பயனர்கள் & கூட்டாளர்கள்", icon: UsersRound },
  { href: "/admin/services", label: "Service catalogue", labelTa: "சேவைகள் பட்டியல்", icon: FileStack },
  { href: "/admin/services/studio", label: "PDF Signing Studio", labelTa: "கையொப்ப அரங்கம்", icon: PenTool },
  { href: "/admin/ads", label: "Ads & announcements", labelTa: "விளம்பரங்கள் & அறிவிப்புகள்", icon: Bell },
  { href: "/admin/finance", label: "Wallet & payments", labelTa: "வாலட் & கட்டணங்கள்", icon: WalletCards },
  { href: "/admin/audit", label: "Audit trail", labelTa: "தணிக்கை பதிவு", icon: ShieldCheck },
];

const staffNavigation = [
  { href: "/staff/dashboard", label: "Work dashboard", labelTa: "பணி டாஷ்போர்டு", icon: LayoutDashboard },
  { href: "/staff/verification", label: "Verification queue", labelTa: "சரிபார்ப்பு வரிசை", icon: ClipboardCheck },
  { href: "/staff/services/studio", label: "PDF Document Studio", labelTa: "ஆவண வடிவமைப்பு அரங்கம்", icon: PenTool },
  { href: "/staff/queries", label: "Query desk", labelTa: "வினவல் மையம்", icon: LifeBuoy },
  { href: "/staff/iam", label: "IAM requests", labelTa: "அடையாள அணுகல் கோரிக்கைகள்", icon: UserCog },
];

const portalDetails = {
  admin: {
    title: "Administration",
    titleTa: "நிர்வாகம்",
    subtitle: "Governance and platform controls",
    subtitleTa: "நிர்வாக மற்றும் தள கட்டுப்பாடுகள்",
    initials: "AD",
    user: "Platform administrator",
    userTa: "தள நிர்வாகி",
    role: "Superadmin",
    roleTa: "முதன்மை நிர்வாகி",
    signOut: "/login",
  },
  staff: {
    title: "Employee desk",
    titleTa: "பணியாளர் தளம்",
    subtitle: "Verification, queries and identity access",
    subtitleTa: "சரிபார்ப்பு, வினவல்கள் மற்றும் அணுகல் மேலாண்மை",
    initials: "LS",
    user: "LabourSeva employee",
    userTa: "தொழிலாளர்சேவா பணியாளர்",
    role: "Operations staff",
    roleTa: "செயல்பாட்டு பணியாளர்",
    signOut: "/staff/login",
  },
} as const;

export default function OperationsPortalShell({
  mode,
  children,
}: {
  mode: PortalMode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const { language, t } = useLanguage();
  const isTa = language === "ta";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [navigationQuery, setNavigationQuery] = useState("");
  const details = portalDetails[mode];
  const hasAttachedSidebar = mode === "admin" || mode === "staff";
  const rawNavigation = mode === "admin" ? adminNavigation : staffNavigation;
  const navigation = rawNavigation.map((item) => ({
    ...item,
    label: isTa ? item.labelTa : item.label,
  }));
  const filteredNavigation = navigation.filter((item) =>
    item.label.toLowerCase().includes(navigationQuery.trim().toLowerCase())
  );

  return (
    <div className={`min-h-screen text-slate-900 ${mode === "admin" ? "bg-[#f1f5f8]" : "bg-slate-50"}`}>
      <header className="sticky top-0 z-40 border-b border-slate-200 border-t-4 border-t-[#ea580c] bg-white shadow-sm">
        <div className={`mx-auto flex h-16 items-center justify-between gap-3 ${hasAttachedSidebar ? "w-full px-5 lg:px-8" : "max-w-7xl px-4 sm:px-6 lg:px-8"}`}>
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (window.matchMedia("(min-width: 1024px)").matches) setDesktopSidebarOpen((open) => !open);
                else setMobileMenuOpen((open) => !open);
              }}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50"
              aria-label={desktopSidebarOpen ? (isTa ? "பக்கப்பட்டியை மூடுக" : "Close navigation sidebar") : (isTa ? "பக்கப்பட்டியை திறக்குக" : "Open navigation sidebar")}
              aria-expanded={desktopSidebarOpen}
            >
              <span className="hidden lg:inline-flex">{desktopSidebarOpen ? <X size={20} /> : <Menu size={20} />}</span>
              <span className="inline-flex lg:hidden">{mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}</span>
            </button>
            <Link href={`/${mode}/dashboard`} className="flex min-w-0 items-center gap-3">
              <Image src="/images/Logo.webp" alt="LabourSeva logo" width={36} height={36} className="h-9 w-9 shrink-0 rounded-md object-contain" />
              <span className="min-w-0">
                <span className="block truncate text-base font-extrabold tracking-tight text-[#1e3a8a]">LabourSeva</span>
                <span className="hidden truncate text-xs text-slate-500 sm:block">{isTa ? details.subtitleTa : details.subtitle}</span>
              </span>
              <span className="hidden rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-[#1e3a8a] md:inline-flex">
                {isTa ? details.titleTa : details.title}
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language Switch Toggle */}
            <LanguageToggle />

            <div className="relative">
              <button
                type="button"
                onClick={() => setNotificationsOpen((open) => !open)}
                className="relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
                aria-label={isTa ? "அறிவிப்புகள்" : "Notifications"}
                aria-expanded={notificationsOpen}
              >
                <Bell size={17} />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#ea580c] ring-2 ring-white" />
              </button>
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-lg border border-slate-200 bg-white p-4 shadow-lg z-50">
                  <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
                    <strong className="text-sm">{isTa ? "அறிவிப்புகள்" : "Notifications"}</strong>
                    <button type="button" onClick={() => setNotificationsOpen(false)} className="text-xs font-semibold text-[#1e3a8a] hover:underline">
                      {isTa ? "மூடு" : "Close"}
                    </button>
                  </div>
                  <div className="space-y-3 text-xs">
                    <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900">
                      {mode === "admin"
                        ? (isTa ? "இன்று மூன்று ஒப்புதல் முடிவுகள் பரிசீலனைக்கு உள்ளன." : "Three approval decisions need review today.")
                        : (isTa ? "ஐந்து சரிபார்ப்புக் கோப்புகள் காலக்கெடுவுக்குள் உள்ளன." : "Five verification files are within their SLA window.")}
                    </p>
                    <p className="rounded-md border border-blue-200 bg-blue-50 p-3 text-blue-900">
                      {isTa ? "இந்த தளத்தில் செய்யப்படும் அனைத்து நடவடிக்கைகளும் தணிக்கை பதிவேட்டில் பதிவு செய்யப்படுகின்றன." : "All actions in this portal are recorded in the audit trail."}
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div className="hidden border-l border-slate-200 pl-3 text-right sm:block">
              <span className="block text-xs font-bold text-slate-900">{isTa ? details.userTa : details.user}</span>
              <span className="block text-[11px] text-slate-500">{isTa ? details.roleTa : details.role}</span>
            </div>
            <span className="grid h-9 w-9 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white">{details.initials}</span>
            <Link
              href={details.signOut}
              onClick={(event) => {
                if (mode === "admin") {
                  window.sessionStorage.removeItem("labourseva-admin-session");
                  return;
                }
                event.preventDefault();
                void fetch("/api/staff/logout", { method: "POST", credentials: "same-origin" })
                  .finally(() => window.location.assign("/staff/login"));
              }}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
              aria-label={isTa ? "வெளியேறு" : "Sign out"}
              title={isTa ? "வெளியேறு" : "Sign out"}
            >
              <LogOut size={17} />
            </Link>
          </div>
        </div>
      </header>


      <div className={`mx-auto flex w-full ${hasAttachedSidebar ? "max-w-none gap-0 p-0" : "max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8"}`}>
        <aside className={`hidden shrink-0 overflow-hidden transition-[width] duration-200 lg:block ${desktopSidebarOpen ? "w-64" : "w-0"} ${mode === "admin" ? "bg-[#032b4d]" : hasAttachedSidebar ? "border-r border-slate-200 bg-white" : ""}`} aria-hidden={!desktopSidebarOpen}>
          <div className={`sticky ${hasAttachedSidebar ? "top-0 h-[calc(100vh-4.25rem)] min-h-[calc(100vh-4.25rem)] overflow-y-auto" : "top-22"} p-3 shadow-sm ${mode === "admin" ? "bg-[#032b4d] text-white" : hasAttachedSidebar ? "bg-white" : "rounded-lg border border-slate-200 bg-white"}`}>
            {mode === "admin" && (
              <label className="relative mb-3 block">
                <span className="sr-only">Search admin navigation</span>
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={navigationQuery}
                  onChange={(event) => setNavigationQuery(event.target.value)}
                  placeholder="Search admin menu"
                className={`h-10 w-full rounded-md border pl-9 pr-3 text-sm outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100 ${mode === "admin" ? "border-blue-200/40 bg-[#0b3b61] text-white placeholder:text-blue-100/70" : "border-slate-200 bg-white"}`}
                />
              </label>
            )}
            <PortalNavigation navigation={filteredNavigation} pathname={pathname} dark={mode === "admin"} />
            {mode === "admin" && filteredNavigation.length === 0 && <p className="rounded-md bg-[#0b3b61] px-3 py-3 text-xs text-blue-100">No admin pages match “{navigationQuery}”.</p>}
            {mode === "admin" && (
              <Link href="/staff/dashboard" className="mt-4 flex items-center gap-2 border-t border-slate-100 px-3 pt-4 text-xs font-semibold text-slate-600 hover:text-[#1e3a8a]">
                <Network size={15} /> Open employee desk
              </Link>
            )}
          </div>
        </aside>

        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button type="button" className="absolute inset-0 h-full w-full bg-slate-950/40" aria-label="Close navigation" onClick={() => setMobileMenuOpen(false)} />
            <aside className={`relative h-full w-72 max-w-[86vw] overflow-y-auto p-5 shadow-xl ${mode === "admin" ? "bg-[#032b4d] text-white" : "bg-white"}`}>
              <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-4">
                <strong>{details.title}</strong>
                <button type="button" onClick={() => setMobileMenuOpen(false)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md hover:bg-white/10" aria-label="Close navigation"><X size={19} /></button>
              </div>
              {mode === "admin" && (
                <label className="relative mb-3 block">
                  <span className="sr-only">Search admin navigation</span>
                  <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="search" value={navigationQuery} onChange={(event) => setNavigationQuery(event.target.value)} placeholder="Search admin menu" className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100" />
                </label>
              )}
              <PortalNavigation navigation={navigationQuery.trim() ? filteredNavigation : navigation} pathname={pathname} onNavigate={() => setMobileMenuOpen(false)} dark={mode === "admin"} />
            </aside>
          </div>
        )}

        <main id={`${mode}-content`} className={`min-w-0 flex-1 pb-10 ${hasAttachedSidebar ? "px-5 py-6 lg:px-8" : ""}`}>{children}</main>
      </div>
    </div>
  );
}

function PortalNavigation({
  navigation,
  pathname,
  onNavigate,
  dark = false,
}: {
  navigation: { href: string; label: string; icon: typeof LayoutDashboard }[];
  pathname: string;
  onNavigate?: () => void;
  dark?: boolean;
}) {
  return (
    <nav className="space-y-1" aria-label="Portal navigation">
      {navigation.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            className={`relative flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold transition-colors ${isActive ? (dark ? "bg-[#168cf0] text-white" : "bg-blue-50 text-[#1e3a8a]") : dark ? "text-white/85 hover:bg-[#0b3b61] hover:text-white" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
          >
            {isActive && <span className="absolute inset-y-2 left-0 w-1 rounded-r bg-[#ea580c]" />}
            <Icon size={17} aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
