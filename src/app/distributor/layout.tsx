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
  CreditCard,
  Plus,
} from "lucide-react";
import { getDistributorSession, clearDistributorSession, DistributorSessionData } from "@/lib/distributor-session";

export default function DistributorLayout({ children }: { children: React.ReactNode }) {
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

    // Fetch fresh balance from API
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

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a] flex flex-col font-sans">
      {/* 1. Top Utility Header */}
      <header className="bg-[#0f172a] text-white border-b-2 border-[#ea580c]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <span className="font-bold tracking-wide">தமிழ்நாடு அரசு தொழிலாளர் நல வாரியம்</span>
            <span className="hidden md:inline text-slate-500">|</span>
            <span className="hidden md:inline text-slate-300 font-medium">Territory Distributor Operations Hub</span>
          </div>

          <div className="flex items-center gap-4">
            {session && (
              <span className="hidden sm:inline bg-slate-800 text-slate-200 px-3 py-1 rounded-full text-[11px] font-semibold border border-slate-700">
                Distributor ID: {session.registrationNo || `DIST-${session.id}`}
              </span>
            )}
            <Link href="/" className="hover:text-amber-400 transition-colors">
              Public Portal
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Distributor Branding & Live Float Balance */}
      <div className="bg-white border-b border-[#cbd5e1] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#0f172a] text-white flex items-center justify-center font-black text-xl shadow-md border-t-2 border-[#ea580c]">
              வி
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-[#0f172a] tracking-tight">
                  {session?.name || "Territory Distributor Hub"}
                </h1>
                <span className="text-[10px] font-bold uppercase bg-blue-100 text-[#1e3a8a] px-2 py-0.5 rounded border border-blue-200">
                  Regional Channel Partner
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Kendra Network Management • Float Funding & Override Commissions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Float Balance Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 flex items-center gap-3 shadow-inner">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#1e3a8a] flex items-center justify-center font-bold">
                <Wallet size={18} />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Distributor Float Balance
                </span>
                <span className="text-lg font-black text-slate-900">
                  ₹{Number(balance).toFixed(2)}
                </span>
              </div>
              <Link
                href="/distributor/wallet"
                className="ml-2 px-3 py-1.5 bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-bold rounded-lg transition-colors shadow-sm flex items-center gap-1"
              >
                <Plus size={14} />
                <span>Add Float</span>
              </Link>
            </div>

            {/* Mobile menu toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* 3. Primary Navigation Row */}
        <nav className="hidden md:block bg-[#0f172a]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
            <div className="flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-all border-b-4 ${
                      active
                        ? "border-[#ea580c] text-white bg-slate-800"
                        : "border-transparent text-slate-300 hover:text-white hover:bg-slate-800/60"
                    }`}
                  >
                    <Icon size={16} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white font-bold py-2 px-3 rounded hover:bg-slate-800 transition-colors"
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        </nav>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#0f172a] border-t border-slate-800 px-4 py-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold ${
                    active
                      ? "bg-[#ea580c] text-white"
                      : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <Icon size={16} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-rose-300 hover:bg-rose-900/40 mt-2 border-t border-slate-800 pt-3"
            >
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </div>

      {/* 4. Main Body Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>

      {/* 5. Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs border-t-4 border-[#ea580c] mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} LabourSeva Channel Operations. Territory Distribution Division.</p>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Prepaid Float Protocol</span>
            <span>•</span>
            <span>Real-time Retailer Wallet Funding</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
