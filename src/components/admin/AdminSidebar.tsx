"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef, useMemo, type ComponentType } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import {
  BarChart3,
  Bell,
  Briefcase,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  Clock,
  Database,
  DownloadCloud,
  FileBarChart,
  FileCog,
  FileText,
  Grid3X3,
  Home,
  ImageIcon,
  Landmark,
  Layers,
  LayoutDashboard,
  LayoutGrid,
  LayoutList,
  LayoutTemplate,
  LifeBuoy,
  ListTree,
  LogOut,
  Map,
  MapPin,
  Megaphone,
  Menu,
  Network,
  PencilRuler,
  PenTool,
  Percent,
  PlusCircle,
  Settings,
  ShieldAlert,
  ShoppingCart,
  ShoppingBag,
  Store,
  UserCircle,
  UserCog,
  UserPlus,
  Users,
  Wallet,
  X,
} from "lucide-react";

export interface NavCountMap {
  customer: number;
  retail: number;
  distributor: number;
  guest: number;
  all: number;
  pending_txns: number;
  unverified_accounts: number;
  es_pending: number;
  open_tickets: number;
}

export const DEFAULT_COUNTS: NavCountMap = {
  customer: 0,
  retail: 0,
  distributor: 0,
  guest: 0,
  all: 0,
  pending_txns: 0,
  unverified_accounts: 0,
  es_pending: 0,
  open_tickets: 0,
};

export interface PageSearchItem {
  name: string;
  nameTa: string;
  url: string;
  icon: ComponentType<{ className?: string; style?: React.CSSProperties }>;
  section: string;
  sectionTa: string;
  keys: string;
}

export const SB_PAGES: PageSearchItem[] = [
  // Main
  { name: "Dashboard", nameTa: "டாஷ்போர்டு", url: "/admin/dashboard", icon: LayoutDashboard, section: "Main", sectionTa: "முக்கிய பிரிவு", keys: "home overview stats admin_dashboard.php டாஷ்போர்டு" },
  { name: "Analytics", nameTa: "பகுப்பாய்வு", url: "/admin/analytics", icon: BarChart3, section: "Main", sectionTa: "முக்கிய பிரிவு", keys: "reports charts graphs data insights admin_analytics.php பகுப்பாய்வு" },
  { name: "Manage Registration", nameTa: "பதிவு மேலாண்மை", url: "/admin/manage-registration", icon: PencilRuler, section: "Main", sectionTa: "முக்கிய பிரிவு", keys: "registration form settings manage_registration.php பதிவு" },
  { name: "Account Verifications", nameTa: "கணக்கு சரிபார்ப்புகள்", url: "/admin/verification", icon: ShieldAlert, section: "Main", sectionTa: "முக்கிய பிரிவு", keys: "kyc pending verify documents admin_verification.php சரிபார்ப்பு" },

  // Customer
  { name: "Customers", nameTa: "வாடிக்கையாளர்கள்", url: "/admin/customers", icon: Users, section: "Customer", sectionTa: "வாடிக்கையாளர்", keys: "user member list admin_customers.php வாடிக்கையாளர்" },
  { name: "Customer Requests", nameTa: "வாடிக்கையாளர் கோரிக்கைகள்", url: "/admin/customer-requests", icon: FileText, section: "Customer", sectionTa: "வாடிக்கையாளர்", keys: "service orders pending customer_request.php கோரிக்கைகள்" },

  // Retail
  { name: "Retailers", nameTa: "சில்லறை விற்பனையாளர்கள்", url: "/admin/retail", icon: Store, section: "Retail", sectionTa: "சில்லறை வணிகம்", keys: "shop agent partner admin_retail_manager.php சில்லறை" },
  { name: "Retail Requests", nameTa: "சில்லறை கோரிக்கைகள்", url: "/admin/retail-requests", icon: ShoppingCart, section: "Retail", sectionTa: "சில்லறை வணிகம்", keys: "orders pending retail service retail_request.php கோரிக்கைகள்" },
  { name: "Product Reviews", nameTa: "தயாரிப்பு மதிப்பாய்வு", url: "/admin/marketplace-products", icon: ShoppingBag, section: "Retail", sectionTa: "சில்லறை வணிகம்", keys: "marketplace products retailer review approve reject listing" },
  { name: "Marketplace Plans", nameTa: "சந்தா திட்டங்கள்", url: "/admin/marketplace-subscriptions", icon: Wallet, section: "Retail", sectionTa: "சில்லறை வணிகம்", keys: "marketplace subscription plans billing price retailer" },

  // Distributor
  { name: "Distributors", nameTa: "விநியோகஸ்தர்கள்", url: "/admin/distributors", icon: Network, section: "Distributor", sectionTa: "விநியோகஸ்தர்", keys: "dealer channel partner admin_distributors.php விநியோகஸ்தர்" },
  { name: "Fee & Wallet Hub", nameTa: "கட்டணம் & வாலட் மையம்", url: "/admin/slide", icon: Wallet, section: "Distributor", sectionTa: "விநியோகஸ்தர்", keys: "fee wallet money balance credit slide.php வாலட்" },
  { name: "Distributor Requests", nameTa: "விநியோகஸ்தர் கோரிக்கைகள்", url: "/admin/distributor-requests", icon: Landmark, section: "Distributor", sectionTa: "விநியோகஸ்தர்", keys: "payout pending withdrawal admin_distributor_requests.php கோரிக்கைகள்" },

  // Guest
  { name: "Guest Users", nameTa: "விருந்தினர் பயனர்கள்", url: "/admin/guest-users", icon: UserCircle, section: "Guest", sectionTa: "விருந்தினர்", keys: "unregistered visitor walk-in admin_guest_users.php விருந்தினர்" },
  { name: "Guest Requests", nameTa: "விருந்தினர் கோரிக்கைகள்", url: "/admin/guest-requests", icon: UserPlus, section: "Guest", sectionTa: "விருந்தினர்", keys: "service orders walk-in guest_request.php கோரிக்கை" },
  { name: "Guest Orders", nameTa: "விருந்தினர் ஆர்டர்கள்", url: "/admin/guest-orders", icon: ClipboardList, section: "Guest", sectionTa: "விருந்தினர்", keys: "purchase service receipt admin_guest_orders.php ஆர்டர்கள்" },

  // Operations
  { name: "Manage Services", nameTa: "சேவைகள் மேலாண்மை", url: "/admin/services", icon: Layers, section: "Operations", sectionTa: "செயல்பாடுகள்", keys: "catalog service list add edit admin_services.php சேவைகள்" },
  { name: "Service Types", nameTa: "சேவை வகைகள்", url: "/admin/service-types", icon: LayoutList, section: "Operations", sectionTa: "செயல்பாடுகள்", keys: "category type group admin_service_types.php வகைகள்" },
  { name: "Employees", nameTa: "பணியாளர்கள்", url: "/admin/employees", icon: Users, section: "Operations", sectionTa: "செயல்பாடுகள்", keys: "staff team member role admin_employees.php பணியாளர்கள்" },
  { name: "Tickets", nameTa: "ஆதரவு கோரிக்கைகள்", url: "/admin/tickets", icon: LifeBuoy, section: "Operations", sectionTa: "செயல்பாடுகள்", keys: "helpdesk support ticket query grievance citizen புகார்கள்" },
  { name: "All Requests", nameTa: "அனைத்து கோரிக்கைகள்", url: "/admin/requests", icon: ClipboardList, section: "Operations", sectionTa: "செயல்பாடுகள்", keys: "service orders all pending admin_requests.php அனைத்து" },
  { name: "Districts", nameTa: "மாவட்டங்கள் (Districts)", url: "/admin/districts", icon: Map, section: "Operations", sectionTa: "செயல்பாடுகள்", keys: "location geo region admin_districts.php மாவட்டங்கள்" },
  { name: "Signatures", nameTa: "கையொப்பங்கள்", url: "/admin/signatures", icon: PenTool, section: "Operations", sectionTa: "செயல்பாடுகள்", keys: "sign digital officer admin_signature.php கையொப்பம்" },
  { name: "Manage Taluks", nameTa: "வட்டங்கள் மேலாண்மை (Taluks)", url: "/admin/taluks", icon: MapPin, section: "Operations", sectionTa: "செயல்பாடுகள்", keys: "block sub-district location admin_taluks.php வட்டங்கள்" },
  { name: "Manage Panchayats", nameTa: "ஊராட்சிகள் மேலாண்மை (Panchayats)", url: "/admin/panchayaths", icon: Home, section: "Operations", sectionTa: "செயல்பாடுகள்", keys: "village gram local body admin_panchayaths.php ஊராட்சிகள்" },

  // E-Service
  { name: "E-Service List", nameTa: "இ-சேவைகள் பட்டியல்", url: "/admin/es-services", icon: FileCog, section: "E-Service", sectionTa: "இ-சேவை", keys: "eservice items add manage es_service_list.php இ-சேவை" },
  { name: "Form Studio", nameTa: "படிவ அரங்கம்", url: "/admin/studio", icon: PenTool, section: "E-Service", sectionTa: "இ-சேவை", keys: "form builder studio customize preview dynamic fields schema வடிவம்" },
  { name: "E-Service Records", nameTa: "இ-சேவை பதிவுகள்", url: "/admin/es-records", icon: ClipboardCheck, section: "E-Service", sectionTa: "இ-சேவை", keys: "eservice orders pending history es_service_records.php பதிவுகள்" },

  // Finance
  { name: "Wallet & Payments", nameTa: "வாலட் & கட்டணங்கள்", url: "/admin/finance", icon: Wallet, section: "Finance", sectionTa: "நிதி & கணக்குகள்", keys: "balance money credit debit transaction admin_wallet.php வாலட்" },
  { name: "Commissions", nameTa: "கமிஷன்கள்", url: "/admin/commissions", icon: Percent, section: "Finance", sectionTa: "நிதி & கணக்குகள்", keys: "commission fee percentage split admin_commissions.php கமிஷன்" },
  { name: "Reports", nameTa: "அறிக்கைகள்", url: "/admin/reports", icon: FileBarChart, section: "Finance", sectionTa: "நிதி & கணக்குகள்", keys: "download export revenue summary admin_reports.php அறிக்கைகள்" },
  { name: "Manual Transactions", nameTa: "கைமுறை பரிவர்த்தனைகள்", url: "/admin/manual-txns", icon: PlusCircle, section: "Finance", sectionTa: "நிதி & கணக்குகள்", keys: "add credit debit manual entry admin_manual_txns.php பரிவர்த்தனை" },
  { name: "Pending Requests", nameTa: "நிலுவை கோரிக்கைகள்", url: "/admin/pending-txns", icon: Clock, section: "Finance", sectionTa: "நிதி & கணக்குகள்", keys: "pending hold approval transaction admin_pending_txns.php நிலுவை" },

  // System
  { name: "System Users", nameTa: "கணினி பயனர்கள்", url: "/admin/users", icon: UserCog, section: "System", sectionTa: "கணினி மேலாண்மை", keys: "admin superadmin login account admin_users.php பயனர்கள்" },
  { name: "Announcements", nameTa: "அறிவிப்புகள்", url: "/admin/announcements", icon: Megaphone, section: "System", sectionTa: "கணினி மேலாண்மை", keys: "notice alert popup message broadcast admin_announcements.php அறிவிப்பு" },
  { name: "Notice Management", nameTa: "சுற்றறிக்கைகள் மேலாண்மை", url: "/admin/notice", icon: Bell, section: "System", sectionTa: "கணினி மேலாண்மை", keys: "notice advisory circular official update admin_notice.php சுற்றறிக்கை" },
  { name: "Grievance Portal", nameTa: "குறைதீர்ப்பு தளம்", url: "/admin/grievance", icon: ShieldAlert, section: "System", sectionTa: "கணினி மேலாண்மை", keys: "grievance complaint SLA resolution dispute audit admin_grievance.php குறைதீர்ப்பு" },
  { name: "Ad Manager", nameTa: "விளம்பர மேலாண்மை", url: "/admin/ads", icon: ImageIcon, section: "System", sectionTa: "கணினி மேலாண்மை", keys: "advertise ad banner promotion campaign tariff pricing admin_ads.php விளம்பரம்" },
  { name: "Careers", nameTa: "வேலைவாய்ப்புகள்", url: "/admin/careers", icon: Briefcase, section: "System", sectionTa: "கணினி மேலாண்மை", keys: "job vacancy recruitment listing jd apply admin_careers.php வேலைவாய்ப்பு" },
  { name: "Schemes", nameTa: "நலத்திட்டங்கள்", url: "/admin/schemes", icon: LayoutTemplate, section: "System", sectionTa: "கணினி மேலாண்மை", keys: "scheme welfare government pension epf esic admin_schemes.php நலத்திட்டம்" },
  { name: "Download Manager", nameTa: "பதிவிறக்கங்கள்", url: "/admin/downloads", icon: DownloadCloud, section: "System", sectionTa: "கணினி மேலாண்மை", keys: "download forms notification act circular pdf admin_downloads.php பதிவிறக்கம்" },
  { name: "System Settings", nameTa: "கணினி அமைப்புகள்", url: "/admin/settings", icon: Settings, section: "System", sectionTa: "கணினி மேலாண்மை", keys: "config preferences site options admin_settings.php அமைப்புகள்" },
  { name: "Database Backup", nameTa: "தரவுத்தள காப்புப்பிரதி", url: "/admin/backup", icon: Database, section: "System", sectionTa: "கணினி மேலாண்மை", keys: "backup sql export restore data admin_backup.php காப்புப்பிரதி" },

  // Operations Approval queue
  { name: "Approval Decisions", nameTa: "ஒப்புதல் முடிவுகள்", url: "/admin/applications", icon: ClipboardCheck, section: "Operations", sectionTa: "செயல்பாடுகள்", keys: "applications approval decisions queue முடிவுகள்" },
  { name: "Audit Trail", nameTa: "தணிக்கை பதிவு", url: "/admin/audit", icon: ShieldAlert, section: "System", sectionTa: "கணினி மேலாண்மை", keys: "audit logs security trail தணிக்கை" },
];


export default function AdminSidebar({
  counts = DEFAULT_COUNTS,
  isOpen = false,
  onClose,
}: {
  counts?: NavCountMap;
  isOpen?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { language } = useLanguage();
  const isTa = language === "ta";

  // Active check helper
  const isPathActive = (hrefs: string[]) => {
    return hrefs.some((href) => pathname === href || (href !== "/admin/dashboard" && pathname?.startsWith(`${href}/`)));
  };

  const isEsActive = [
    "/admin/es-services",
    "/admin/es-records",
  ].some((href) => pathname?.startsWith(href));

  const [esOpen, setEsOpen] = useState(isEsActive);

  useEffect(() => {
    if (isEsActive) setEsOpen(true);
  }, [isEsActive]);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const activeLinkRef = useRef<HTMLAnchorElement | null>(null);

  // Global Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        setDropdownOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Filtered search results
  const filteredPages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const words = q.split(/\s+/);
    return SB_PAGES.filter((page) => {
      const haystack = `${page.name} ${page.nameTa} ${page.section} ${page.sectionTa} ${page.keys} ${page.url}`.toLowerCase();
      return words.every((w) => haystack.includes(w));
    });
  }, [searchQuery]);

  // Group search results by section
  const groupedResults = useMemo(() => {
    const groups: Record<string, PageSearchItem[]> = {};
    filteredPages.forEach((p) => {
      const sec = isTa ? p.sectionTa : p.section;
      if (!groups[sec]) groups[sec] = [];
      groups[sec].push(p);

    });
    return groups;
  }, [filteredPages]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setFocusedIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Smooth scroll active link into view on initial mount
  useEffect(() => {
    if (activeLinkRef.current) {
      activeLinkRef.current.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [pathname]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!filteredPages.length) {
      if (e.key === "Escape") {
        setDropdownOpen(false);
        searchInputRef.current?.blur();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((prev) => Math.min(prev + 1, filteredPages.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (focusedIndex >= 0 && filteredPages[focusedIndex]) {
        router.push(filteredPages[focusedIndex].url);
        setDropdownOpen(false);
        setSearchQuery("");
        onClose?.();
      } else if (filteredPages.length === 1) {
        router.push(filteredPages[0].url);
        setDropdownOpen(false);
        setSearchQuery("");
        onClose?.();
      }
    } else if (e.key === "Escape") {
      setDropdownOpen(false);
      setFocusedIndex(-1);
      searchInputRef.current?.blur();
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setDropdownOpen(false);
    setFocusedIndex(-1);
    searchInputRef.current?.focus();
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem("labourseva-admin-session");
    }
    router.replace("/admin/login");
  };

  // Helper for highlighting text matches
  const renderHighlighted = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={index} className="bg-transparent text-[#6366f1] font-bold">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <>
      <style jsx global>{`
        .sidebar-link {
          display: flex;
          align-items: center;
          padding: 9px 16px;
          font-size: 0.875rem;
          font-weight: 500;
          color: #475569;
          border-radius: 8px;
          margin-bottom: 2px;
          transition: background 0.15s, color 0.15s;
          position: relative;
          text-decoration: none;
        }
        .sidebar-link:hover {
          background: #f1f5f9;
          color: #1e3a8a;
        }
        .sidebar-link.active {
          background: #eff6ff;
          color: #000000;
          font-weight: 600;
          border-left: 3px solid #1e3a8a;
          padding-left: 13px;
        }
        .sidebar-link .nav-icon {
          width: 18px;
          height: 18px;
          margin-right: 10px;
          flex-shrink: 0;
          color: #94a3b8;
          transition: color 0.15s;
        }
        .sidebar-link:hover .nav-icon {
          color: #1e3a8a;
        }
        .sidebar-link.active .nav-icon {
          color: #000000;
        }
        .sidebar-section-label {
          padding: 0 16px;
          font-size: 10px;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 4px;
          margin-top: 4px;
        }
        .nav-badge {
          padding: 2px 7px;
          border-radius: 99px;
          background: #ef4444;
          color: white;
          font-size: 10px;
          font-weight: 700;
          line-height: 1.4;
          margin-left: auto;
        }
        .sidebar-scrollable::-webkit-scrollbar {
          width: 4px;
        }
        .sidebar-scrollable::-webkit-scrollbar-track {
          background: transparent;
        }
        .sidebar-scrollable::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 4px;
        }

        /* Search Styles */
        .sb-search-wrap {
          position: relative;
        }
        .sb-search-input {
          width: 100%;
          background: #f8fafc;
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          padding: 8px 36px 8px 34px;
          font-size: 0.8rem;
          color: #0f172a;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          font-family: inherit;
        }
        .sb-search-input:focus {
          border-color: #6366f1;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
        }
        .sb-search-icon {
          position: absolute;
          left: 10px;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
          color: #94a3b8;
          width: 15px;
          height: 15px;
        }
        .sb-search-clear {
          position: absolute;
          right: 9px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 2px;
          line-height: 1;
        }
        .sb-search-clear:hover {
          color: #ef4444;
        }
        .sb-dropdown {
          position: absolute;
          top: calc(100% + 5px);
          left: 0;
          right: 0;
          background: #fff;
          border: 1.5px solid #e2e8f0;
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
          z-index: 9999;
          max-height: 320px;
          overflow-y: auto;
        }
        .sb-result {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 12px;
          cursor: pointer;
          font-size: 0.8rem;
          color: #374151;
          border-radius: 8px;
          margin: 3px;
          transition: background 0.12s;
          text-decoration: none;
        }
        .sb-result:hover,
        .sb-result.focused {
          background: #eef2ff;
          color: #4f46e5;
        }
        .sb-result-icon {
          width: 28px;
          height: 28px;
          border-radius: 7px;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: #64748b;
        }
        .sb-result:hover .sb-result-icon,
        .sb-result.focused .sb-result-icon {
          background: #e0e7ff;
          color: #4f46e5;
        }
        .sb-result-name {
          font-weight: 600;
        }
        .sb-result-section {
          font-size: 0.68rem;
          color: #94a3b8;
          display: block;
          margin-top: 1px;
        }
        .sb-no-results {
          padding: 18px 12px;
          text-align: center;
          color: #94a3b8;
          font-size: 0.8rem;
        }
        .sb-section-header {
          padding: 6px 12px 2px;
          font-size: 0.65rem;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.07em;
        }
      `}</style>

      {/* Main Sidebar Aside */}
      <aside
        id="mainSidebar"
        className={`w-64 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col z-[90] fixed inset-y-0 left-0 md:sticky md:top-0 h-screen transition-transform duration-300 transform ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 shadow-2xl md:shadow-none`}
      >
        {/* Logo Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-200 flex-shrink-0">
          <Link href="/admin/dashboard" className="flex items-center gap-3" onClick={onClose}>
            <Image
              src="/images/Logo.webp"
              width={42}
              height={42}
              alt="LabourSeva"
              className="h-10 w-auto rounded object-contain"
              priority
            />
            <div>
              <span className="text-base font-bold text-slate-800 leading-tight block">LabourSeva</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wide">Admin Panel</span>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="md:hidden p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Advanced Search Input */}
        <div className="px-3 py-3 border-b border-slate-100 flex-shrink-0">
          <div className="sb-search-wrap" ref={searchWrapRef}>
            <svg
              className="sb-search-icon"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setDropdownOpen(true);
              }}
              onFocus={() => {
                if (searchQuery.trim()) setDropdownOpen(true);
              }}
              onKeyDown={handleSearchKeyDown}
              className="sb-search-input"
              placeholder={isTa ? "பக்கங்களைத் தேடுக… (Ctrl+K)" : "Search pages… (Ctrl+K)"}
              autoComplete="off"
              spellCheck="false"
              aria-label={isTa ? "நிர்வாக பக்கங்களைத் தேடுக" : "Search admin pages"}
              aria-autocomplete="list"
            />
            {searchQuery && (
              <button
                className="sb-search-clear"
                onClick={clearSearch}
                title={isTa ? "தேடலை நீக்குக" : "Clear search"}
                type="button"
              >
                ✕
              </button>
            )}

            {/* Live Search Dropdown */}
            {dropdownOpen && searchQuery.trim().length > 0 && (
              <div className="sb-dropdown open" role="listbox" aria-label={isTa ? "தேடல் முடிவுகள்" : "Search results"}>
                {filteredPages.length === 0 ? (
                  <div className="sb-no-results">
                    {isTa ? "பொருத்தமான பக்கங்கள் எதுவும் இல்லை" : "No pages found for"} &ldquo;<strong>{searchQuery}</strong>&rdquo;
                  </div>
                ) : (
                  Object.entries(groupedResults).map(([section, pages]) => (
                    <div key={section}>
                      <div className="sb-section-header">{section}</div>
                      {pages.map((p) => {
                        const globalIdx = filteredPages.indexOf(p);
                        const isFocused = globalIdx === focusedIndex;
                        const Icon = p.icon;
                        const pageLabel = isTa ? p.nameTa : p.name;
                        const secLabel = isTa ? p.sectionTa : p.section;
                        return (
                          <Link
                            key={p.url}
                            href={p.url}
                            onClick={() => {
                              setDropdownOpen(false);
                              setSearchQuery("");
                              onClose?.();
                            }}
                            className={`sb-result ${isFocused ? "focused" : ""}`}
                            role="option"
                            aria-selected={isFocused}
                          >
                            <span className="sb-result-icon">
                              <Icon className="w-3.5 h-3.5" />
                            </span>
                            <span>
                              <span className="sb-result-name">{renderHighlighted(pageLabel, searchQuery.trim())}</span>
                              <span className="sb-result-section">{secLabel}</span>
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>
            )}

          </div>
        </div>

        {/* Scrollable Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 sidebar-scrollable">
          {/* Main */}
          <p className="sidebar-section-label">{isTa ? "முக்கிய பிரிவு" : "Main"}</p>
          <Link
            href="/admin/dashboard"
            onClick={onClose}
            ref={isPathActive(["/admin/dashboard"]) ? activeLinkRef : undefined}
            className={`sidebar-link ${isPathActive(["/admin/dashboard"]) ? "active" : ""}`}
          >
            <LayoutDashboard className="nav-icon" /> {isTa ? "டாஷ்போர்டு" : "Dashboard"}
          </Link>
          <Link
            href="/admin/analytics"
            onClick={onClose}
            className={`sidebar-link ${isPathActive(["/admin/analytics"]) ? "active" : ""}`}
          >
            <BarChart3 className="nav-icon" /> {isTa ? "பகுப்பாய்வு" : "Analytics"}
          </Link>
          <Link
            href="/admin/manage-registration"
            onClick={onClose}
            className={`sidebar-link ${isPathActive(["/admin/manage-registration"]) ? "active" : ""}`}
          >
            <PencilRuler className="nav-icon" /> {isTa ? "பதிவு மேலாண்மை" : "Manage Registration"}
          </Link>
          <Link
            href="/admin/verification"
            onClick={onClose}
            className={`sidebar-link ${isPathActive(["/admin/verification"]) ? "active" : ""}`}
          >
            <ShieldAlert className="nav-icon" />
            <span className="flex-1">{isTa ? "கணக்கு சரிபார்ப்புகள்" : "Account Verifications"}</span>
            {counts.unverified_accounts > 0 && (
              <span className="nav-badge">{counts.unverified_accounts}</span>
            )}
          </Link>

          {/* Customer */}
          <p className="sidebar-section-label mt-3">{isTa ? "வாடிக்கையாளர்" : "Customer"}</p>
          <Link
            href="/admin/customers"
            onClick={onClose}
            className={`sidebar-link ${isPathActive(["/admin/customers"]) ? "active" : ""}`}
          >
            <Users className="nav-icon" /> {isTa ? "வாடிக்கையாளர்கள்" : "Customers"}
          </Link>
          <Link
            href="/admin/customer-requests"
            onClick={onClose}
            className={`sidebar-link ${isPathActive(["/admin/customer-requests"]) ? "active" : ""}`}
          >
            <FileText className="nav-icon" />
            <span className="flex-1">{isTa ? "வாடிக்கையாளர் கோரிக்கைகள்" : "Customer Requests"}</span>
            {counts.customer > 0 && <span className="nav-badge">{counts.customer}</span>}
          </Link>

          {/* Retail */}
          <p className="sidebar-section-label mt-3">{isTa ? "சில்லறை வணிகம்" : "Retail"}</p>
          <Link
            href="/admin/retail"
            onClick={onClose}
            className={`sidebar-link ${isPathActive(["/admin/retail"]) ? "active" : ""}`}
          >
            <Store className="nav-icon" /> {isTa ? "சில்லறை விற்பனையாளர்கள்" : "Retailers"}
          </Link>
          <Link
            href="/admin/retail-requests"
            onClick={onClose}
            className={`sidebar-link ${isPathActive(["/admin/retail-requests"]) ? "active" : ""}`}
          >
            <ShoppingCart className="nav-icon" />
            <span className="flex-1">{isTa ? "சில்லறை கோரிக்கைகள்" : "Retail Requests"}</span>
            {counts.retail > 0 && <span className="nav-badge">{counts.retail}</span>}
          </Link>
          <Link
            href="/admin/marketplace-products"
            onClick={onClose}
            className={`sidebar-link ${isPathActive(["/admin/marketplace-products"]) ? "active" : ""}`}
          >
            <ShoppingBag className="nav-icon" /> {isTa ? "சந்தைப் பொருட்கள்" : "Marketplace Products"}
          </Link>
          <Link
            href="/admin/marketplace-subscriptions"
            onClick={onClose}
            className={`sidebar-link ${isPathActive(["/admin/marketplace-subscriptions"]) ? "active" : ""}`}
          >
            <Wallet className="nav-icon" /> {isTa ? "சந்தா திட்டங்கள்" : "Marketplace Plans"}
          </Link>

          {/* Distributor */}
          <p className="sidebar-section-label mt-3">{isTa ? "விநியோகஸ்தர்" : "Distributor"}</p>
          <Link
            href="/admin/distributors"
            onClick={onClose}
            className={`sidebar-link ${isPathActive(["/admin/distributors"]) ? "active" : ""}`}
          >
            <Network className="nav-icon" /> {isTa ? "விநியோகஸ்தர்கள்" : "Distributors"}
          </Link>
          <Link
            href="/admin/slide"
            onClick={onClose}
            className={`sidebar-link ${isPathActive(["/admin/slide"]) ? "active" : ""}`}
          >
            <Wallet className="nav-icon" /> {isTa ? "கட்டணம் & வாலட் மையம்" : "Fee & Wallet Hub"}
          </Link>
          <Link
            href="/admin/distributor-requests"
            onClick={onClose}
            className={`sidebar-link ${isPathActive(["/admin/distributor-requests"]) ? "active" : ""}`}
          >
            <Landmark className="nav-icon" />
            <span className="flex-1">{isTa ? "விநியோகஸ்தர் கோரிக்கைகள்" : "Distributor Requests"}</span>
            {counts.distributor > 0 && <span className="nav-badge">{counts.distributor}</span>}
          </Link>

          {/* Guest */}
          <p className="sidebar-section-label mt-3">{isTa ? "விருந்தினர்" : "Guest"}</p>
          <Link
            href="/admin/guest-users"
            onClick={onClose}
            className={`sidebar-link ${isPathActive(["/admin/guest-users"]) ? "active" : ""}`}
          >
            <UserCircle className="nav-icon" /> {isTa ? "விருந்தினர் பயனர்கள்" : "Guest Users"}
          </Link>
          <Link
            href="/admin/guest-requests"
            onClick={onClose}
            className={`sidebar-link ${isPathActive(["/admin/guest-requests"]) ? "active" : ""}`}
          >
            <UserPlus className="nav-icon" />
            <span className="flex-1">{isTa ? "விருந்தினர் கோரிக்கைகள்" : "Guest Requests"}</span>
            {counts.guest > 0 && <span className="nav-badge">{counts.guest}</span>}
          </Link>
          <Link
            href="/admin/guest-orders"
            onClick={onClose}
            className={`sidebar-link ${isPathActive(["/admin/guest-orders"]) ? "active" : ""}`}
          >
            <ClipboardList className="nav-icon" /> {isTa ? "விருந்தினர் ஆர்டர்கள்" : "Guest Orders"}
          </Link>

          {/* Operations */}
          <p className="sidebar-section-label mt-3">{isTa ? "செயல்பாடுகள்" : "Operations"}</p>
          <Link
            href="/admin/services"
            onClick={onClose}
            className={`sidebar-link ${isPathActive(["/admin/services"]) ? "active" : ""}`}
          >
            <Layers className="nav-icon" /> {isTa ? "சேவைகள் மேலாண்மை" : "Manage Services"}
          </Link>
          <Link
            href="/admin/service-types"
            onClick={onClose}
            className={`sidebar-link ${isPathActive(["/admin/service-types"]) ? "active" : ""}`}
          >
            <LayoutList className="nav-icon" /> {isTa ? "சேவை வகைகள்" : "Service Types"}
          </Link>
          <Link
            href="/admin/employees"
            onClick={onClose}
            className={`sidebar-link ${isPathActive(["/admin/employees"]) ? "active" : ""}`}
          >
            <Users className="nav-icon" /> {isTa ? "பணியாளர்கள்" : "Employees"}
          </Link>
          <Link
            href="/admin/tickets"
            onClick={onClose}
            className={`sidebar-link ${isPathActive(["/admin/tickets"]) ? "active" : ""}`}
          >
            <LifeBuoy className="nav-icon" />
            <span className="flex-1">{isTa ? "ஆதரவு கோரிக்கைகள்" : "Tickets"}</span>
            {counts.open_tickets > 0 && <span className="nav-badge">{counts.open_tickets}</span>}
          </Link>
          <Link
            href="/admin/requests"
            onClick={onClose}
            className={`sidebar-link ${isPathActive(["/admin/requests"]) ? "active" : ""}`}
          >
            <ClipboardList className="nav-icon" />
            <span className="flex-1">{isTa ? "அனைத்து கோரிக்கைகள்" : "All Requests"}</span>
            {counts.all > 0 && <span className="nav-badge">{counts.all}</span>}
          </Link>
          <Link
            href="/admin/geography"
            onClick={onClose}
            className={`sidebar-link ${isPathActive(["/admin/geography", "/admin/districts", "/admin/taluks", "/admin/panchayaths"]) ? "active" : ""}`}
          >
            <Map className="nav-icon" /> {isTa ? "புவியியல் மேலாண்மை" : "Geography Management"}
          </Link>
          <div className="ml-4 space-y-0.5 border-l-2 border-slate-200 pl-2">
            <Link
              href="/admin/districts"
              onClick={onClose}
              className={`sidebar-link text-xs ${isPathActive(["/admin/districts"]) ? "active" : ""}`}
            >
              <MapPin className="nav-icon w-3.5 h-3.5" />
              <span>{isTa ? "மாவட்டங்கள் (Districts)" : "Districts / மாவட்டங்கள்"}</span>
            </Link>
            <Link
              href="/admin/taluks"
              onClick={onClose}
              className={`sidebar-link text-xs ${isPathActive(["/admin/taluks"]) ? "active" : ""}`}
            >
              <MapPin className="nav-icon w-3.5 h-3.5" />
              <span>{isTa ? "வட்டங்கள் (Taluks)" : "Taluks / வட்டங்கள்"}</span>
            </Link>
            <Link
              href="/admin/panchayaths"
              onClick={onClose}
              className={`sidebar-link text-xs ${isPathActive(["/admin/panchayaths"]) ? "active" : ""}`}
            >
              <Home className="nav-icon w-3.5 h-3.5" />
              <span>{isTa ? "ஊராட்சிகள் (Panchayats)" : "Panchayats / ஊராட்சிகள்"}</span>
            </Link>
          </div>
          <Link
            href="/admin/signatures"
            onClick={onClose}
            className={`sidebar-link ${isPathActive(["/admin/signatures"]) ? "active" : ""}`}
          >
            <PenTool className="nav-icon" /> {isTa ? "கையொப்பங்கள்" : "Signatures"}
          </Link>

          {/* E-Service Section */}
          <p className="sidebar-section-label mt-3">{isTa ? "இ-சேவை" : "E-Service"}</p>
          <button
            type="button"
            onClick={() => setEsOpen((prev) => !prev)}
            className={`sidebar-link w-full text-left ${isEsActive ? "active" : ""}`}
            aria-expanded={esOpen}
          >
            <Layers className="nav-icon" />
            <span className="flex-1">{isTa ? "இ-சேவை அரங்கம்" : "E-Service"}</span>
            {counts.es_pending > 0 && <span className="nav-badge mr-1">{counts.es_pending}</span>}
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${esOpen ? "rotate-180" : ""}`}
            />
          </button>
          <div
            className={`ml-4 space-y-0.5 overflow-hidden transition-all duration-200 ${
              esOpen ? "block" : "hidden"
            }`}
          >
            <Link
              href="/admin/es-services"
              onClick={onClose}
              className={`sidebar-link ${isPathActive(["/admin/es-services"]) ? "active" : ""}`}
            >
              <FileCog className="nav-icon" /> {isTa ? "இ-சேவைகள் பட்டியல்" : "E-Service List"}
            </Link>
            <Link
              href="/admin/studio"
              onClick={onClose}
              className={`sidebar-link ${isPathActive(["/admin/studio"]) ? "active" : ""}`}
            >
              <PenTool className="nav-icon text-amber-500" />
              <span className="flex-1">{isTa ? "படிவ அரங்கம்" : "Form Studio"}</span>
              <span className="rounded-md bg-amber-500/10 text-amber-600 px-1.5 py-0.2 text-[9px] font-bold">New</span>
            </Link>
            <Link
              href="/admin/es-records"
              onClick={onClose}
              className={`sidebar-link ${isPathActive(["/admin/es-records"]) ? "active" : ""}`}
            >
              <ClipboardCheck className="nav-icon" />
              <span className="flex-1">{isTa ? "இ-சேவை பதிவுகள்" : "E-Service Records"}</span>
              {counts.es_pending > 0 && <span className="nav-badge">{counts.es_pending}</span>}
            </Link>
          </div>

          {/* Finance */}
          <p className="sidebar-section-label mt-3">{isTa ? "நிதி & கணக்குகள்" : "Finance"}</p>
          <Link
            href="/admin/finance"
            onClick={onClose}
            className={`sidebar-link ${isPathActive(["/admin/finance", "/admin/wallet"]) ? "active" : ""}`}
          >
            <Wallet className="nav-icon" /> {isTa ? "வாலட் & கட்டணங்கள்" : "Wallet & Payments"}
          </Link>
          <Link
            href="/admin/razerpay"
            onClick={onClose}
            className={`sidebar-link ${isPathActive(["/admin/razerpay"]) ? "active" : ""}`}
          >
            <ShieldAlert className="nav-icon" /> {isTa ? "ரேஸர்பே அமைப்புகள்" : "Razer Pay Controls"}
          </Link>
          <Link
            href="/admin/commissions"
            onClick={onClose}
            className={`sidebar-link ${isPathActive(["/admin/commissions"]) ? "active" : ""}`}
          >
            <Percent className="nav-icon" /> {isTa ? "கமிஷன்கள்" : "Commissions"}
          </Link>
          <Link
            href="/admin/reports"
            onClick={onClose}
            className={`sidebar-link ${isPathActive(["/admin/reports"]) ? "active" : ""}`}
          >
            <FileBarChart className="nav-icon" /> {isTa ? "அறிக்கைகள்" : "Reports"}
          </Link>
          <Link
            href="/admin/manual-txns"
            onClick={onClose}
            className={`sidebar-link ${isPathActive(["/admin/manual-txns"]) ? "active" : ""}`}
          >
            <PlusCircle className="nav-icon" /> {isTa ? "கைமுறை பரிவர்த்தனைகள்" : "Manual Transactions"}
          </Link>
          <Link
            href="/admin/pending-txns"
            onClick={onClose}
            className={`sidebar-link ${isPathActive(["/admin/pending-txns"]) ? "active" : ""}`}
          >
            <Clock className="nav-icon" />
            <span className="flex-1">{isTa ? "நிலுவை கோரிக்கைகள்" : "Pending Requests"}</span>
            {counts.pending_txns > 0 && <span className="nav-badge">{counts.pending_txns}</span>}
          </Link>

          {/* System */}
          <p className="sidebar-section-label mt-3">{isTa ? "கணினி மேலாண்மை" : "System"}</p>
          <Link
            href="/admin/users"
            onClick={onClose}
            className={`sidebar-link ${isPathActive(["/admin/users"]) ? "active" : ""}`}
          >
            <UserCog className="nav-icon" /> {isTa ? "கணினி பயனர்கள்" : "System Users"}
          </Link>
          <Link
            href="/admin/announcements"
            onClick={onClose}
            className={`sidebar-link ${isPathActive(["/admin/announcements"]) ? "active" : ""}`}
          >
            <Megaphone className="nav-icon" /> {isTa ? "அறிவிப்புகள்" : "Announcements"}
          </Link>
          <Link
            href="/admin/notice"
            onClick={onClose}
            className={`sidebar-link ${isPathActive(["/admin/notice"]) ? "active" : ""}`}
          >
            <Bell className="nav-icon" /> {isTa ? "சுற்றறிக்கைகள் மேலாண்மை" : "Notice Management"}
          </Link>
          <Link
            href="/admin/grievance"
            onClick={onClose}
            className={`sidebar-link ${isPathActive(["/admin/grievance"]) ? "active" : ""}`}
          >
            <ShieldAlert className="nav-icon" /> {isTa ? "குறைதீர்ப்பு தளம்" : "Grievance Portal"}
          </Link>
          <Link
            href="/admin/ads"
            onClick={onClose}
            className={`sidebar-link ${isPathActive(["/admin/ads"]) ? "active" : ""}`}
          >
            <ImageIcon className="nav-icon" /> {isTa ? "விளம்பர மேலாண்மை" : "Ad Manager"}
          </Link>
          <Link
            href="/admin/careers"
            onClick={onClose}
            className={`sidebar-link ${isPathActive(["/admin/careers"]) ? "active" : ""}`}
          >
            <Briefcase className="nav-icon" /> {isTa ? "வேலைவாய்ப்புகள்" : "Careers"}
          </Link>
          <Link
            href="/admin/schemes"
            onClick={onClose}
            className={`sidebar-link ${isPathActive(["/admin/schemes"]) ? "active" : ""}`}
          >
            <LayoutTemplate className="nav-icon" /> {isTa ? "நலத்திட்டங்கள்" : "Schemes"}
          </Link>
          <Link
            href="/admin/downloads"
            onClick={onClose}
            className={`sidebar-link ${isPathActive(["/admin/downloads"]) ? "active" : ""}`}
          >
            <DownloadCloud className="nav-icon" /> {isTa ? "பதிவிறக்கங்கள்" : "Download Manager"}
          </Link>
          <Link
            href="/admin/settings"
            onClick={onClose}
            className={`sidebar-link ${isPathActive(["/admin/settings"]) ? "active" : ""}`}
          >
            <Settings className="nav-icon" /> {isTa ? "கணினி அமைப்புகள்" : "System Settings"}
          </Link>
          <Link
            href="/admin/backup"
            onClick={onClose}
            className={`sidebar-link ${isPathActive(["/admin/backup"]) ? "active" : ""}`}
          >
            <Database className="nav-icon" /> {isTa ? "தரவுத்தள காப்புப்பிரதி" : "Database Backup"}
          </Link>
        </nav>

        {/* Profile Footer */}
        <div className="px-4 py-3 border-t border-slate-200 flex-shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-sm font-bold flex-shrink-0">
              A
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">
                {isTa ? "நிர்வாக பயனர்" : "Admin User"}
              </p>
              <p className="text-xs text-slate-400 truncate">admin@labourseva.tn.gov.in</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
              title={isTa ? "வெளியேறு" : "Logout"}
              type="button"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

