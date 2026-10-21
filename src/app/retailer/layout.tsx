"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  FilePlus2,
  ClipboardList,
  Wallet,
  Percent,
  Store,
  LogOut,
  Shield,
  CreditCard,
  Menu,
  X,
  ChevronRight,
  ExternalLink,
  Circle,
  ShoppingBag,
} from "lucide-react";
import {
  getRetailerSession,
  clearRetailerSession,
  RetailerSessionData,
} from "@/lib/retailer-session";

export default function RetailerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [clientPathname, setClientPathname] = useState("");
  const [session, setSession] = useState<RetailerSessionData | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [balance, setBalance] = useState<number>(0);
  const [balanceLoaded, setBalanceLoaded] = useState(false);

  const isLoginPage = pathname === "/retailer/login";

  useEffect(() => {
    setClientPathname(pathname);
  }, [pathname]);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (isLoginPage) return;
    setBalanceLoaded(false);
    const sess = getRetailerSession();
    if (sess) {
      setSession(sess);
    }

    async function fetchLiveBalance() {
      try {
        const res = await fetch("/api/retailer/dashboard", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.retailer) {
            const currentBalance = Number(data.retailer.walletBalance);
            if (Number.isFinite(currentBalance)) {
              setBalance(currentBalance);
              setBalanceLoaded(true);
            }
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
    clearRetailerSession();
    router.push("/retailer/login");
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  const navItems = [
    { name: "Dashboard", href: "/retailer/dashboard", icon: LayoutDashboard },
    { name: "Assisted Apply", href: "/retailer/apply", icon: FilePlus2 },
    { name: "Applications", href: "/retailer/applications", icon: ClipboardList },
    { name: "Wallet", href: "/retailer/wallet", icon: Wallet },
    { name: "Commissions", href: "/retailer/commissions", icon: Percent },
    { name: "Products", href: "/retailer/marketplace", icon: ShoppingBag },
    { name: "Kendra Profile", href: "/retailer/profile", icon: Store },
  ];

  const brandName =
    session?.shopName || session?.name || "LabourSeva Kendra";
  const kendraId = session?.registrationNo || `RET-${session?.id}`;
  const balanceDisplay = Number(balance).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white">
      {/* Brand */}
      <div className="px-5 h-16 flex items-center justify-between border-b border-slate-200 shrink-0">
        <Link href="/retailer/dashboard" className="flex items-center gap-2.5 group">
          <div className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
            <Image
              src="/images/Logo.png"
              alt="LabourSeva"
              width={32}
              height={32}
              className="h-full w-full object-contain p-0.5"
              priority
            />
          </div>
          <div className="leading-tight">
            <div className="text-[15px] font-bold text-slate-900 tracking-tight">
              Labour<span className="text-[#ea580c]">Seva</span>
            </div>
            <div className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
              Kendra Desk
            </div>
          </div>
        </Link>
      </div>

      {/* Wallet card */}
      <div className="px-3 pt-4 pb-3 shrink-0">
        <Link
          href="/retailer/wallet"
          onClick={() => setMobileMenuOpen(false)}
          className="block rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 transition-colors p-3 group"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Wallet Balance
            </span>
            <Wallet size={13} className="text-slate-400" />
          </div>
          <div className="flex items-end justify-between">
            <div className="text-lg font-bold text-slate-900 tabular-nums leading-none">
              {balanceLoaded ? `₹${balanceDisplay}` : "—"}
            </div>
            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-[#ea580c] group-hover:gap-1 transition-all">
              Top up
              <ChevronRight size={11} />
            </span>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2 mb-1">
          Menu
        </div>
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = clientPathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-medium transition-colors ${
                  active
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon
                  size={15}
                  className={active ? "text-[#ea580c]" : "text-slate-400"}
                />
                <span className="flex-1">{item.name}</span>
                {active && (
                  <span className="w-1 h-1 rounded-full bg-[#ea580c]" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User + Sign out */}
      <div className="border-t border-slate-200 p-3 shrink-0">
        <div className="flex items-center gap-2.5 px-2 py-2 mb-1">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
            {brandName?.charAt(0)?.toUpperCase() || "K"}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="text-[13px] font-semibold text-slate-900 truncate">
              {brandName}
            </div>
            <div className="text-[11px] text-slate-500 font-mono truncate">
              {kendraId}
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">
            <Circle size={6} className="fill-emerald-500" />
            Active
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
          >
            <ExternalLink size={12} />
            Public Portal
          </Link>
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              handleLogout();
            }}
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-medium text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
          >
            <LogOut size={12} />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased flex flex-col">
      {/* Top utility strip */}
      <header className="sticky top-0 w-full bg-[#0f172a] text-white shrink-0 z-40 border-b border-[#ea580c]">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-9 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold tracking-wide whitespace-nowrap">
              தமிழ்நாடு அரசு தொழிலாளர் நல வாரியம்
            </span>
            <span className="hidden md:inline text-slate-600">·</span>
            <span className="hidden md:inline text-slate-300 truncate">
              LabourSeva Citizen Service Kendra Desk
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


      {/* Body: Sidebar + Main */}
      <div className="flex-1 flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex w-[256px] shrink-0 border-r border-slate-200 bg-white sticky top-9 h-[calc(100vh-2.25rem)]">
          {sidebarContent}
        </aside>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="lg:hidden fixed top-12 right-4 z-30 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-semibold shadow-sm"
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

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-w-0">
          <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </main>

          {/* Footer */}
          <footer className="bg-white border-t border-slate-200 shrink-0">
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-700">
                    © {new Date().getFullYear()} LabourSeva
                  </span>
                  <span className="text-slate-300">·</span>
                  <span>Official Kendra Network</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="inline-flex items-center gap-1.5">
                    <Shield size={11} className="text-slate-400" />
                    Prepaid Wallet
                  </span>
                  <span className="text-slate-300">·</span>
                  <span>Row-Lock Deductions</span>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
