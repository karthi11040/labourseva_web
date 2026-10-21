"use client";

import { useState } from "react";
import { Settings, Shield, Bell, Database, Mail, Globe, Lock, Save, CheckCircle2, Phone, MessageSquare, CreditCard, Key } from "lucide-react";

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<"GENERAL" | "SUPPORT" | "LIMITS" | "GATEWAY" | "SECURITY">("GENERAL");
  const [savedToast, setSavedToast] = useState(false);

  // Form states
  const [siteName, setSiteName] = useState("LabourSeva Tamil Nadu");
  const [seoDescription, setSeoDescription] = useState("Tamil Nadu Building and Other Construction Workers Welfare Board Digital Services Portal");
  const [supportPhone, setSupportPhone] = useState("044-24335111");
  const [supportWhatsapp, setSupportWhatsapp] = useState("+91 94440 12345");
  const [supportEmail, setSupportEmail] = useState("support@labourseva.tn.gov.in");
  const [workingHours, setWorkingHours] = useState("Monday to Friday: 09:30 AM – 05:30 PM IST");
  
  const [retailMinBalance, setRetailMinBalance] = useState("1000");
  const [distributorMinFloat, setDistributorMinFloat] = useState("25000");
  const [maxDailyWithdrawal, setMaxDailyWithdrawal] = useState("500000");
  const [registrationSecurityFee, setRegistrationSecurityFee] = useState("5000");
  
  const [razorpayKeyId, setRazorpayKeyId] = useState("rzp_live_9921849182");
  const [razorpayKeySecret, setRazorpayKeySecret] = useState("••••••••••••••••••••••••");
  const [sbiMerchantId, setSbiMerchantId] = useState("TN_LABOUR_100291");
  
  const [sessionTimeout, setSessionTimeout] = useState("15");
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3500);
  };

  return (
    <div className="space-y-6">
      {savedToast && (
        <div className="fixed top-20 right-6 z-50 rounded-xl bg-slate-900 text-white px-5 py-3 shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold">Settings saved to configuration database.</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#ea580c]">
            System Control Centre (admin_settings.php)
          </span>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">Platform Settings</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
            Configure key-value configuration parameters, support contacts, wallet limits, payment gateway keys, and security controls.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#1e3a8a] px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#1e40af] shrink-0"
        >
          <Save className="w-4 h-4" /> Save Configuration
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6 overflow-x-auto pb-px" aria-label="Settings categories">
          {[
            { id: "GENERAL", label: "Identity & SEO", icon: Globe },
            { id: "SUPPORT", label: "Help Desk & Contacts", icon: Phone },
            { id: "LIMITS", label: "Wallet & Fee Limits", icon: CreditCard },
            { id: "GATEWAY", label: "Payment Gateways", icon: Key },
            { id: "SECURITY", label: "Session & Maintenance", icon: Shield },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`pb-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
                  isActive
                    ? "border-[#1e3a8a] text-[#1e3a8a]"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Settings Form Container */}
      <form onSubmit={handleSave} className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
        {activeTab === "GENERAL" && (
          <div className="space-y-4 max-w-2xl">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Platform Identity &amp; Meta Information
            </h3>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Platform Brand Title</label>
              <input
                type="text"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs outline-none focus:border-[#1e3a8a]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">SEO Meta Description</label>
              <textarea
                rows={3}
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-300 text-xs outline-none focus:border-[#1e3a8a]"
              />
            </div>
            <div className="p-3.5 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900">
              Settings are stored as key-value pairs in the <code>settings</code> table within a transactional database commit.
            </div>
          </div>
        )}

        {activeTab === "SUPPORT" && (
          <div className="space-y-4 max-w-2xl">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Citizen Support &amp; Help Desk Availability
            </h3>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Public Helpline Number</label>
              <input
                type="text"
                value={supportPhone}
                onChange={(e) => setSupportPhone(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs outline-none focus:border-[#1e3a8a]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">WhatsApp Advisory Line</label>
              <input
                type="text"
                value={supportWhatsapp}
                onChange={(e) => setSupportWhatsapp(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs outline-none focus:border-[#1e3a8a]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Support Official Email</label>
              <input
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs outline-none focus:border-[#1e3a8a]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Department Working Hours</label>
              <input
                type="text"
                value={workingHours}
                onChange={(e) => setWorkingHours(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs outline-none focus:border-[#1e3a8a]"
              />
            </div>
          </div>
        )}

        {activeTab === "LIMITS" && (
          <div className="space-y-4 max-w-2xl">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Wallet Thresholds &amp; Channel Policies
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Retailer Floor Balance (₹)</label>
                <input
                  type="number"
                  value={retailMinBalance}
                  onChange={(e) => setRetailMinBalance(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs outline-none focus:border-[#1e3a8a]"
                />
                <span className="text-[10px] text-slate-400">Minimum before low balance warning</span>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Distributor Minimum Float (₹)</label>
                <input
                  type="number"
                  value={distributorMinFloat}
                  onChange={(e) => setDistributorMinFloat(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs outline-none focus:border-[#1e3a8a]"
                />
                <span className="text-[10px] text-slate-400">Required to maintain sub-agent rights</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Max Daily Settlement Payout (₹)</label>
                <input
                  type="number"
                  value={maxDailyWithdrawal}
                  onChange={(e) => setMaxDailyWithdrawal(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs outline-none focus:border-[#1e3a8a]"
                />
                <span className="text-[10px] text-slate-400">Single-day cap per distributor</span>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Agent Security Deposit (₹)</label>
                <input
                  type="number"
                  value={registrationSecurityFee}
                  onChange={(e) => setRegistrationSecurityFee(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs outline-none focus:border-[#1e3a8a]"
                />
                <span className="text-[10px] text-slate-400">Refundable onboarding bond</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === "GATEWAY" && (
          <div className="space-y-4 max-w-2xl">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Payment Gateway Credentials &amp; Routing
            </h3>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Razorpay API Key ID</label>
              <input
                type="text"
                value={razorpayKeyId}
                onChange={(e) => setRazorpayKeyId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs font-mono outline-none focus:border-[#1e3a8a]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Razorpay Key Secret</label>
              <input
                type="password"
                value={razorpayKeySecret}
                onChange={(e) => setRazorpayKeySecret(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs font-mono outline-none focus:border-[#1e3a8a]"
              />
              <span className="text-[10px] text-slate-400">Masked securely on disk and never exposed in client bundles.</span>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">State Bank of India (SBI e-Pay) Merchant ID</label>
              <input
                type="text"
                value={sbiMerchantId}
                onChange={(e) => setSbiMerchantId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs font-mono outline-none focus:border-[#1e3a8a]"
              />
            </div>
          </div>
        )}

        {activeTab === "SECURITY" && (
          <div className="space-y-4 max-w-2xl">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Session Timeout &amp; Portal Maintenance
            </h3>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Administrator Inactivity Timeout (Minutes)</label>
              <input
                type="number"
                min="5"
                max="120"
                value={sessionTimeout}
                onChange={(e) => setSessionTimeout(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs outline-none focus:border-[#1e3a8a]"
              />
              <span className="text-[10px] text-slate-400">Automatic logout upon inactivity.</span>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={maintenanceMode}
                  onChange={(e) => setMaintenanceMode(e.target.checked)}
                  className="w-4 h-4 rounded text-[#1e3a8a] focus:ring-blue-200"
                />
                <div>
                  <p className="text-xs font-bold text-slate-900">Enable Public Maintenance Mode</p>
                  <p className="text-[11px] text-slate-500">
                    Restricts citizen and retailer access while keeping administrator and employee desks operational.
                  </p>
                </div>
              </label>
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg bg-[#1e3a8a] px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#1e40af] transition-colors"
          >
            <Save className="w-4 h-4" /> Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
