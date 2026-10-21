"use client";

import { useState, useEffect, type ReactNode } from "react";
import Link from "next/link";
import { Bell, Menu, Network, ShieldCheck, X } from "lucide-react";
import AdminSidebar, { DEFAULT_COUNTS, type NavCountMap } from "./AdminSidebar";
import LanguageToggle from "@/components/LanguageToggle";
import { useLanguage } from "@/components/LanguageProvider";

export default function AdminPortalShell({
  children,
  counts = DEFAULT_COUNTS,
}: {
  children: ReactNode;
  counts?: NavCountMap;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [announcementDismissed, setAnnouncementDismissed] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [liveCounts, setLiveCounts] = useState<NavCountMap>(counts);
  const { language, t } = useLanguage();
  const isTa = language === "ta";

  useEffect(() => {
    let isMounted = true;
    fetch("/api/admin/request-counts")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data && typeof data === "object") {
          setLiveCounts((prev) => ({ ...prev, ...data }));
        }
      })
      .catch(() => {
        // Fallback gracefully to default empty counts
      });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col md:flex-row">
      {/* Mobile Floating Toggle Button */}
      <button
        id="mobileMenuBtn"
        type="button"
        onClick={() => setSidebarOpen((prev) => !prev)}
        className="md:hidden fixed bottom-6 right-6 z-[100] bg-indigo-600 text-white p-4 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgb(79,70,229,0.3)] hover:-translate-y-1 active:translate-y-0 transition-all flex items-center justify-center"
        aria-label={isTa ? "மெனுவை திறக்குக" : "Toggle navigation menu"}
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Mobile Backdrop Overlay */}
      <div
        id="sidebarOverlay"
        onClick={() => setSidebarOpen(false)}
        className={`md:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[80] transition-opacity duration-300 ${
          sidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!sidebarOpen}
      />

      {/* Admin Sidebar */}
      <AdminSidebar
        counts={liveCounts}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-40 bg-white border-b border-slate-200 border-t-4 border-t-[#ea580c] shadow-xs">
          <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen((prev) => !prev)}
                className="md:hidden p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                aria-label={isTa ? "மெனுவை மாற்றுக" : "Toggle menu"}
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Bilingual Language Switcher Toggle */}
              <LanguageToggle />

              {/* Quick link to employee desk */}
              <Link
                href="/staff/dashboard"
                className="hidden lg:inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-[#1e3a8a] hover:text-[#1e3a8a] transition-colors"
                title={isTa ? "பணியாளர் தளத்திற்கு செல்லவும்" : "Open Operations Employee Desk"}
              >
                <Network className="w-4 h-4 text-blue-600" />
                <span>{t("shell.employeeDesk", "Employee Desk")}</span>
              </Link>

              {/* Citizen Portal Link */}
              <Link
                href="/user/dashboard"
                className="hidden xl:inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-[#1e3a8a] hover:text-[#1e3a8a] transition-colors"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>{t("shell.citizenPortal", "Citizen Portal")}</span>
              </Link>

              {/* Notifications Toggle */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setNotificationsOpen((prev) => !prev)}
                  className="relative p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                  aria-label={isTa ? "நிர்வாக அறிவிப்புகள்" : "Admin notifications"}
                >
                  <Bell className="w-4 h-4" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#ea580c] ring-2 ring-white" />
                </button>

                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-4 shadow-xl z-50">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                      <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                        {t("shell.operationalAlerts", "Operational Alerts")}
                      </span>
                      <button
                        type="button"
                        onClick={() => setNotificationsOpen(false)}
                        className="text-xs font-bold text-[#1e3a8a] hover:underline"
                      >
                        {t("action.close", "Close")}
                      </button>
                    </div>
                    <div className="space-y-2 text-xs">
                      {liveCounts.unverified_accounts > 0 && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-amber-900">
                          <strong>
                            {liveCounts.unverified_accounts}{" "}
                            {isTa ? "சரிபார்ப்புக் கோரிக்கைகள்" : "Verification Requests"}
                          </strong>{" "}
                          {isTa
                            ? "KYC ஆவண மதிப்பாய்வுக்காக காத்திருக்கின்றன."
                            : "pending KYC document validation."}
                        </div>
                      )}
                      {liveCounts.customer > 0 && (
                        <div className="rounded-lg border border-blue-200 bg-blue-50 p-2.5 text-blue-900">
                          <strong>
                            {liveCounts.customer} {isTa ? "வாடிக்கையாளர் கோரிக்கைகள்" : "Customer Requests"}
                          </strong>{" "}
                          {isTa ? "பணி வரிசையில் காத்திருக்கின்றன." : "waiting in service dispatch queue."}
                        </div>
                      )}
                      {liveCounts.retail > 0 && (
                        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-2.5 text-indigo-900">
                          <strong>
                            {liveCounts.retail} {isTa ? "சில்லறை கோரிக்கைகள்" : "Retail Requests"}
                          </strong>{" "}
                          {isTa ? "செயலாக்கத்தில் உள்ளன." : "pending order processing."}
                        </div>
                      )}
                      {liveCounts.distributor > 0 && (
                        <div className="rounded-lg border border-purple-200 bg-purple-50 p-2.5 text-purple-900">
                          <strong>
                            {liveCounts.distributor} {isTa ? "விநியோகஸ்தர் கோரிக்கைகள்" : "Distributor Requests"}
                          </strong>{" "}
                          {isTa ? "பரிசீலனையில் உள்ளன." : "pending review."}
                        </div>
                      )}
                      {liveCounts.guest > 0 && (
                        <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-2.5 text-cyan-900">
                          <strong>
                            {liveCounts.guest} {isTa ? "விருந்தினர் கோரிக்கைகள்" : "Guest Requests"}
                          </strong>{" "}
                          {isTa ? "பரிசீலனையில் உள்ளன." : "pending review."}
                        </div>
                      )}
                      {liveCounts.all === 0 && liveCounts.unverified_accounts === 0 && (
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-slate-600 text-center">
                          {t("shell.noAlerts", "No pending requests or KYC alerts.")}
                        </div>
                      )}
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-emerald-900">
                        {isTa
                          ? "கணினி நிலை: நேரலை தரவுத்தள இணைப்பு செயலில் உள்ளது."
                          : "System status: Active live synchronization."}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Status Badge */}
              <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200 text-right">
                <div>
                  <span className="block text-xs font-bold text-slate-900">
                    {t("shell.adminSession", "Admin Session")}
                  </span>
                  <span className="block text-[10px] text-emerald-600 font-semibold flex items-center justify-end gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>{" "}
                    {t("shell.secureLive", "Secure Live")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Global Announcement Banner */}
        {!announcementDismissed && (
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-4 text-xs shadow-inner">
            <div className="flex items-center gap-2 min-w-0">
              <span className="inline-flex items-center justify-center bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                {isTa ? "அறிவிப்பு" : "Notice"}
              </span>
              <p className="truncate font-medium">
                {t(
                  "shell.globalNotice",
                  "FY 2026-27 Labour Welfare Board renewal audits and E-Service record sync in progress. Ensure taluk-level submissions are cleared before end of week."
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAnnouncementDismissed(true)}
              className="text-white/70 hover:text-white p-1 rounded-sm shrink-0"
              aria-label={isTa ? "அறிவிப்பை மூடு" : "Dismiss announcement"}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Main Content Container */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          {children}

        </main>
      </div>
    </div>
  );
}
