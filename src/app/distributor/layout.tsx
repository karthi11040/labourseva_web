"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  Wallet,
  Percent,
  FileCheck2,
  Building2,
  LogOut,
  Menu,
  X,
  Plus,
  ExternalLink,
  Circle,
  Shield,
  ChevronRight,
} from "lucide-react";
import {
  getDistributorSession,
  clearDistributorSession,
  DistributorSessionData,
} from "@/lib/distributor-session";

export default function DistributorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<DistributorSessionData | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [balance, setBalance] = useState<number>(0);

  const isLoginPage = pathname === "/distributor/login";

  useEffect(() => {
    if (isLoginPage) return;
    const sess = getDistributorSession();
    if (sess) {
      setSession(sess);
      setBalance(sess.walletBalance || 0);
    }

    async function fetchLiveBalance() {
      try {
        const res = await fetch("/api/distributor/dashboard");
        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.distributor) {
            setBalance(data.distributor.walletBalance || 0);
          }
        }
      } catch {}
    }
    fetchLiveBalance();
  }, [pathname, isLoginPage]);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  function handleLogout() {
    clearDistributorSession();
    router.push("/distributor/login");
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  const navItems = [
    { name: "Dashboard", href: "/distributor/dashboard", icon: LayoutDashboard },
    { name: "Kendra Network", href: "/distributor/retailers", icon: Users },
    { name: "Wallet & Transfers", href: "/distributor/wallet", icon: Wallet },
    { name: "Commission Reports", href: "/distributor/commissions", icon: Percent },
    { name: "Mandatory KYC", href: "/distributor/kyc", icon: FileCheck2 },
    { name: "Territory Profile", href: "/distributor/profile", icon: Building2 },
  ];

  const brandName = session?.name || "Territory Distributor";
  const distributorId = session?.registrationNo || `DIST-${session?.id}`;
  const balanceDisplay = Number(balance).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // Reusable sidebar content — same markup for desktop sidebar and mobile drawer
  const sidebarContent = (
    <div className="flex flex-col h-full bg-white">
      {/* ───── Brand ───── */}
      <div className="px-5 h-16 flex items-center justify-between border-b border-slate-200 shrink-0">
        <Link
          href="/distributor/dashboard"
          className="flex items-center gap-2.5 group"
        >
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 text-white flex items-center justify-center font-black text-base shrink-0">
            <span className="block h-0.5 w-5 bg-[#ea580c] -mt-3" />
            வி
          </div>
          <div className="leading-tight">
            <div className="text-[15px] font-bold text-slate-900 tracking-tight">
              Labour<span className="text-[#ea580c]">Seva</span>
            </div>
            <div className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
              Distributor Hub
            </div>
          </div>
        </Link>
      </div>

      {/* ───── Distributor identity card ───── */}
      <div className="px-3 pt-4 pb-3 shrink-0">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-start justify-between gap-2 mb-2.5">
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                Signed in as
              </div>
              <div className="text-sm font-bold text-slate-900 truncate mt-0.5">
                {brandName}
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full border border-blue-200 shrink-0">
              <Shield size={8} />
              Regional
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-mono">
            <Circle size={9} className="fill-emerald-500 text-emerald-500" />
            <span className="text-slate-400">ID:</span>
            <span className="font-semibold text-slate-900">{distributorId}</span>
          </div>
        </div>
      </div>

      {/* ───── Float balance mini-card ───── */}
      <div className="px-3 pb-4 shrink-0">
        <Link
          href="/distributor/wallet"
          onClick={() => setMobileMenuOpen(false)}
          className="block rounded-lg border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 p-3 hover:border-slate-300 transition-colors group"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Float Balance
            </span>
            <Wallet size={13} className="text-slate-400" />
          </div>
          <div className="flex items-end justify-between">
            <div className="text-base font-bold text-slate-900 tabular-nums leading-none">
              ₹{balanceDisplay}
            </div>
            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-[#ea580c] group-hover:gap-1 transition-all">
              <Plus size={11} />
              Add Float
            </span>
          </div>
        </Link>
      </div>

      {/* ───── Nav ───── */}
      <nav className="flex-1 overflow-y-auto px-3 pb-3">
        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2 mb-1">
          Operations
        </div>
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`relative flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-medium transition-colors ${
                  active
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {active && (
                  <span className="absolute left-0 top-2 bottom-2 w-1 bg-[#ea580c] rounded-full" />
                )}
                <Icon
                  size={15}
                  className={active ? "text-[#ea580c]" : "text-slate-400"}
                />
                <span className="flex-1">{item.name}</span>
                {active && (
                  <ChevronRight size={13} className="text-[#ea580c]" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ───── Footer (public portal + sign out) ───── */}
      <div className="border-t border-slate-200 p-3 shrink-0 space-y-1">
        <Link
          href="/"
          onClick={() => setMobileMenuOpen(false)}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[12px] font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
        >
          <span className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center">
            <ExternalLink size={12} />
          </span>
          <span className="flex-1">Public Portal</span>
        </Link>
        <button
          type="button"
          onClick={() => {
            setMobileMenuOpen(false);
            handleLogout();
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-medium text-rose-600 hover:bg-rose-50 transition-colors"
        >
          <span className="w-7 h-7 rounded-md bg-rose-50 flex items-center justify-center">
            <LogOut size={13} />
          </span>
          <span className="flex-1">Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased flex flex-col">
      {/* ───────────── Top Utility Strip ───────────── */}
      <header className="bg-[#0f172a] text-white shrink-0 z-40 relative">
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#ea580c] to-transparent" />

        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-9 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold tracking-wide whitespace-nowrap">
              தமிழ்நாடு அரசு தொழிலாளர் நல வாரியம்
            </span>
            <span className="hidden md:inline text-slate-600">·</span>
            <span className="hidden md:inline text-slate-300 font-medium truncate">
              Territory Distributor Operations Hub
            </span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="inline-flex items-center gap-1.5 text-emerald-300 text-[10px] font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              System Live
            </span>
          </div>
        </div>
      </header>

      {/* ───────────── Body: Sidebar + Main ───────────── */}
      <div className="flex-1 flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex w-[256px] shrink-0 border-r border-slate-200 bg-white sticky top-9 h-[calc(100vh-2.25rem)]">
          {sidebarContent}
        </aside>

        {/* Mobile menu button (floating) */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="lg:hidden fixed top-12 right-4 z-30 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0f172a] text-white text-xs font-bold shadow-lg"
          aria-label="Open menu"
        >
          <Menu size={14} />
          Menu
        </button>

        {/* Mobile drawer */}
        <div
          className={`lg:hidden fixed inset-0 z-50 transition-all ${
            mobileMenuOpen ? "visible" : "invisible"
          }`}
        >
          <div
            className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity ${
              mobileMenuOpen ? "opacity-100" : "opacity-0"
            }`}
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside
            className={`absolute top-0 left-0 h-full w-[280px] max-w-[85vw] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
              mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
              aria-label="Close menu"
            >
              <X size={16} />
            </button>
            {sidebarContent}
          </aside>
        </div>

        {/* Main content + footer */}
        <div className="flex-1 flex flex-col min-w-0">
          <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </main>

          {/* Footer */}
          <footer className="bg-white border-t border-slate-200 shrink-0">
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500">
                <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
                  <span className="font-semibold text-slate-700">
                    © {new Date().getFullYear()} LabourSeva
                  </span>
                  <span className="text-slate-300">·</span>
                  <span>Channel Operations</span>
                  <span className="text-slate-300 hidden sm:inline">·</span>
                  <span className="hidden sm:inline">
                    Territory Distribution Division
                  </span>
                </div>
                <div className="flex items-center gap-4 flex-wrap justify-center">
                  <span className="inline-flex items-center gap-1.5">
                    <Shield size={11} className="text-slate-400" />
                    Prepaid Float Protocol
                  </span>
                  <span className="text-slate-300">·</span>
                  <span>Realtime Retailer Wallet Funding</span>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}