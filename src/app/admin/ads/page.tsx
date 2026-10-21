"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Megaphone,
  Plus,
  Pause,
  Play,
  Trash2,
  Search,
  CheckCircle2,
  Clock,
  DollarSign,
  Layout,
  ExternalLink,
  ShieldCheck,
  X,
  Globe,
  Code,
  Copy,
  Sliders,
  Check,
  AlertCircle,
  FileCode,
  Layers,
  Sparkles,
  BarChart3,
  Eye,
  Settings,
  Upload,
  ImageIcon,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  ListOrdered,
  Edit3,
  RefreshCw,
  Info,
} from "lucide-react";
import ManualAdSlider, { ManualAdItem } from "@/components/ads/ManualAdSlider";

interface AdSenseUnitConfig {
  id: string;
  name: string;
  slotId: string;
  format: "horizontal" | "rectangle" | "vertical" | "fluid" | "auto";
  recommendedSize: string;
  placement: string;
  status: "ACTIVE" | "PAUSED";
}

interface ManualAd {
  id: string;
  title: string;
  image: string;
  link: string;
  placement: string;
  sortOrder: number;
  targetGroup: string;
  status: "ACTIVE" | "PAUSED";
  views: number;
  clicks: number;
  createdAt?: string;
}

export default function AdsPage() {
  const [activeTab, setActiveTab] = useState<"MANUAL_ADS" | "LOGIN_ADS" | "ADSENSE">("MANUAL_ADS");
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Manual Ads State
  const [manualAds, setManualAds] = useState<ManualAd[]>([]);
  const [manualSearch, setManualSearch] = useState("");
  const [manualPlacementFilter, setManualPlacementFilter] = useState("ALL");
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [editingManualAd, setEditingManualAd] = useState<ManualAd | null>(null);

  // Manual Ad Form
  const [formTitle, setFormTitle] = useState("");
  const [formImage, setFormImage] = useState("");
  const [formLink, setFormLink] = useState("");
  const [formPlacement, setFormPlacement] = useState("HOME_SLIDER");
  const [formPlacements, setFormPlacements] = useState<string[]>(["HOME_SLIDER"]);
  const [formSortOrder, setFormSortOrder] = useState("1");
  const [isAutoOrder, setIsAutoOrder] = useState(true);
  const [formTargetGroup, setFormTargetGroup] = useState("retailer,distributor,customer,guest");
  const [formStatus, setFormStatus] = useState<"ACTIVE" | "PAUSED">("ACTIVE");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AdSense State
  const [adSenseUnits, setAdSenseUnits] = useState<AdSenseUnitConfig[]>([]);
  const [publisherId, setPublisherId] = useState("ca-pub-3642883735997037");
  const [autoAdsEnabled, setAutoAdsEnabled] = useState(true);
  const [governmentSafeZone, setGovernmentSafeZone] = useState(true);
  const [homeAdMode, setHomeAdMode] = useState<"MANUAL" | "ADSENSE" | "BOTH">("MANUAL");

  // AdSense Modals
  const [adSenseModalOpen, setAdSenseModalOpen] = useState(false);
  const [adsTxtModalOpen, setAdsTxtModalOpen] = useState(false);
  const [codeSnippetModalOpen, setCodeSnippetModalOpen] = useState(false);
  const [selectedUnitForCode, setSelectedUnitForCode] = useState<AdSenseUnitConfig | null>(null);
  const [copiedSlot, setCopiedSlot] = useState<string | null>(null);

  // New AdSense Unit Form
  const [unitName, setUnitName] = useState("");
  const [unitSlotId, setUnitSlotId] = useState("");
  const [unitFormat, setUnitFormat] = useState<AdSenseUnitConfig["format"]>("horizontal");
  const [unitPlacement, setUnitPlacement] = useState("HOME_SLIDER");
  const [unitSize, setUnitSize] = useState("Responsive (728x90)");

  // Notification Toast Helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // AdBlocker-resilient API fetcher for promotion management
  const fetchPromoApi = async (
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> => {
    const primaryUrl = `/api/admin/promotions${endpoint}`;
    const fallbackUrl = `/api/admin/ads${endpoint}`;

    try {
      const res = await fetch(primaryUrl, options);
      if (res.ok) return res;
      const fallbackRes = await fetch(fallbackUrl, options).catch(() => null);
      return (fallbackRes && fallbackRes.ok) ? fallbackRes : res;
    } catch {
      return await fetch(fallbackUrl, options);
    }
  };

  // Fetch initial data from API
  const fetchAdsData = async () => {
    setLoading(true);
    try {
      const res = await fetchPromoApi("");
      if (!res.ok) throw new Error("Failed to load ads");
      const data = await res.json();
      if (data.success) {
        setManualAds(data.manualAds || []);
        if (data.googleAdSense) {
          setAdSenseUnits(data.googleAdSense.units || []);
          if (data.googleAdSense.publisherId) setPublisherId(data.googleAdSense.publisherId);
          if (data.googleAdSense.autoAdsEnabled !== undefined) setAutoAdsEnabled(data.googleAdSense.autoAdsEnabled);
          if (data.googleAdSense.safeZone !== undefined) setGovernmentSafeZone(data.googleAdSense.safeZone);
          if (data.googleAdSense.homeAdMode) setHomeAdMode(data.googleAdSense.homeAdMode);
        }
      }
    } catch (err: any) {
      console.error("Fetch ads error:", err);
      showToast("Could not load promotional ads data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdsData();
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSlot(id);
    showToast("Copied to clipboard!");
    setTimeout(() => setCopiedSlot(null), 2500);
  };

  // --- MANUAL ADS HANDLERS ---
  const nextSequenceFor = (placement: string) => manualAds
    .filter((ad) => ad.placement === placement)
    .reduce((max, ad) => Math.max(max, ad.sortOrder || 0), 0) + 1;

  const handleOpenCreateManual = (placement = "HOME_SLIDER") => {
    setEditingManualAd(null);
    setFormTitle("");
    setFormImage("");
    setFormLink("");
    setFormPlacement(placement);
    setFormPlacements([placement]);
    setIsAutoOrder(true);
    setFormSortOrder(String(nextSequenceFor(placement)));
    setFormTargetGroup("retailer,distributor,customer,guest");
    setFormStatus("ACTIVE");
    setManualModalOpen(true);
  };

  const handleOpenEditManual = (ad: ManualAd) => {
    setEditingManualAd(ad);
    setFormTitle(ad.title);
    setFormImage(ad.image);
    setFormLink(ad.link);
    setFormPlacement(ad.placement);
    setFormPlacements([ad.placement]);
    setIsAutoOrder(false); // keep custom/existing order
    setFormSortOrder(String(ad.sortOrder || 1));
    setFormTargetGroup(ad.targetGroup);
    setFormStatus(ad.status);
    setManualModalOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      showToast("Choose a JPG, PNG, WebP, or GIF image.");
      e.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("Image must be 5 MB or smaller.");
      e.target.value = "";
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      let res: Response | null = null;
      try {
        res = await fetch("/api/admin/promotions/upload", {
          method: "POST",
          body: formData,
        });
      } catch {
        res = null;
      }
      if (!res || !res.ok) {
        res = await fetch("/api/admin/ads/upload", {
          method: "POST",
          body: formData,
        });
      }
      const data = await res.json();
      if (data.success && data.url) {
        setFormImage(data.url);
        showToast("Banner image uploaded successfully!");
      } else {
        showToast(data.message || "Upload failed");
      }
    } catch (err: any) {
      showToast(err.message || "Error uploading banner image");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveManualAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUploading) {
      showToast("Wait for the image upload to finish before saving.");
      return;
    }
    if (!formTitle.trim() || !formImage.trim() || !formPlacements.length) {
      showToast("Provide a title, image, and at least one placement.");
      return;
    }

    try {
      if (editingManualAd) {
        // Update existing ad
        const res = await fetchPromoApi("", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "MANUAL",
            id: editingManualAd.id,
            title: formTitle.trim(),
            image: formImage.trim(),
            link: formLink.trim(),
            placement: formPlacements[0] || formPlacement,
            isAutoOrder,
            sortOrder: isAutoOrder ? undefined : parseInt(formSortOrder, 10) || 1,
            targetGroup: formTargetGroup,
            status: formStatus,
          }),
        });
        const data = await res.json();
        if (data.success) {
          showToast(`Banner "${formTitle}" updated.`);
          setManualModalOpen(false);
          fetchAdsData();
        } else {
          showToast(data.message || "Failed to update ad.");
        }
      } else {
        // Create new ad with auto-order support
        const res = await fetchPromoApi("", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "MANUAL",
            title: formTitle.trim(),
            image: formImage.trim(),
            link: formLink.trim(),
            placements: formPlacements,
            isAutoOrder,
            sortOrder: isAutoOrder ? undefined : parseInt(formSortOrder, 10) || 1,
            targetGroup: formTargetGroup,
            status: formStatus,
          }),
        });
        const data = await res.json();
        if (data.success) {
          showToast(`Banner created in ${formPlacements.length} placement${formPlacements.length === 1 ? "" : "s"}.`);
          setManualModalOpen(false);
          fetchAdsData();
        } else {
          showToast(data.message || "Failed to create ad.");
        }
      }
    } catch (err: any) {
      showToast(err.message || "Error saving manual ad.");
    }
  };

  // Reordering handler: Move Up or Down with single click
  const handleMoveBanner = async (ad: ManualAd, direction: "UP" | "DOWN") => {
    const currentIndex = filteredManualAds.findIndex((item) => item.id === ad.id);
    if (currentIndex === -1) return;

    const targetIndex = direction === "UP" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= filteredManualAds.length) return;

    const targetAd = filteredManualAds[targetIndex];

    let newAdOrder = targetAd.sortOrder;
    let newTargetOrder = ad.sortOrder;

    if (newAdOrder === newTargetOrder) {
      if (direction === "UP") {
        newAdOrder = Math.max(1, newTargetOrder - 1);
      } else {
        newAdOrder = newTargetOrder + 1;
      }
    }

    // Optimistically update order in state
    setManualAds((prev) =>
      prev
        .map((item) => {
          if (item.id === ad.id) return { ...item, sortOrder: newAdOrder };
          if (item.id === targetAd.id) return { ...item, sortOrder: newTargetOrder };
          return item;
        })
        .sort((a, b) => a.sortOrder - b.sortOrder)
    );

    try {
      const res = await fetchPromoApi("", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "REORDER_SWAP",
          id1: ad.id,
          order1: newAdOrder,
          id2: targetAd.id,
          order2: newTargetOrder,
        }),
      });
      if (res.ok) {
        showToast(`Banner "${ad.title.slice(0, 24)}" moved ${direction === "UP" ? "up" : "down"}.`);
      } else {
        fetchAdsData();
      }
    } catch {
      fetchAdsData();
    }
  };

  // Resequence all banners to clean 1, 2, 3...
  const handleAutoResequenceAll = async () => {
    if (!confirm("Automatically re-sequence all banners into clean 1, 2, 3... order?")) return;
    try {
      const res = await fetchPromoApi("", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "AUTO_RESEQUENCE",
          placement: manualPlacementFilter,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        showToast(data?.message || "All banners re-sequenced automatically (1, 2, 3...).");
        fetchAdsData();
      } else {
        showToast(data?.message || "Failed to auto-resequence banners.");
      }
    } catch (err: any) {
      showToast(err.message || "Error during auto-resequence.");
    }
  };

  const handleToggleManualStatus = async (ad: ManualAd) => {
    const nextStatus = ad.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    try {
      const res = await fetchPromoApi("", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "MANUAL",
          id: ad.id,
          status: nextStatus,
        }),
      });
      if (res.ok) {
        setManualAds((prev) =>
          prev.map((item) => (item.id === ad.id ? { ...item, status: nextStatus } : item))
        );
        showToast(`Ad status changed to ${nextStatus}.`);
      } else {
        const data = await res.json().catch(() => null);
        showToast(data?.message || "Error updating status.");
      }
    } catch (err: any) {
      showToast(err.message || "Error updating status.");
    }
  };

  const handleDeleteManualAd = async (id: string) => {
    if (!confirm("Are you sure you want to delete this promotional banner?")) return;
    try {
      // Step 1: Attempt DELETE on /api/admin/promotions
      let res: Response | null = null;
      try {
        res = await fetch(`/api/admin/promotions?id=${encodeURIComponent(id)}&type=MANUAL`, {
          method: "DELETE",
        });
      } catch {
        res = null;
      }

      // Step 2: Attempt POST { action: "DELETE" } on /api/admin/promotions
      if (!res || !res.ok) {
        try {
          res = await fetch("/api/admin/promotions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "DELETE", id, type: "MANUAL" }),
          });
        } catch {
          res = null;
        }
      }

      // Step 3: Attempt DELETE on /api/admin/ads
      if (!res || !res.ok) {
        try {
          res = await fetch(`/api/admin/ads?id=${encodeURIComponent(id)}&type=MANUAL`, {
            method: "DELETE",
          });
        } catch {
          res = null;
        }
      }

      // Step 4: Attempt POST { action: "DELETE" } on /api/admin/ads
      if (!res || !res.ok) {
        try {
          res = await fetch("/api/admin/ads", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "DELETE", id, type: "MANUAL" }),
          });
        } catch {
          res = null;
        }
      }

      if (res && res.ok) {
        const data = await res.json().catch(() => ({}));
        setManualAds((prev) => prev.filter((a) => String(a.id) !== String(id)));
        showToast(data.message || "Banner deleted successfully.");
      } else {
        const data = res ? await res.json().catch(() => null) : null;
        showToast(data?.message || "Failed to delete banner. Please try again.");
      }
    } catch (err: any) {
      console.error("Delete banner error:", err);
      showToast(err.message || "Error deleting banner.");
    }
  };

  // --- GOOGLE ADSENSE HANDLERS ---
  const handleUpdateAdSenseSettings = async (updates: Partial<{
    publisherId: string;
    autoAdsEnabled: boolean;
    safeZone: boolean;
    homeAdMode: "MANUAL" | "ADSENSE" | "BOTH";
  }>) => {
    try {
      const res = await fetchPromoApi("", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "SETTINGS",
          ...updates,
        }),
      });
      if (res.ok) {
        showToast("AdSense settings saved.");
      } else {
        const data = await res.json().catch(() => null);
        showToast(data?.message || "Error saving settings.");
      }
    } catch (err: any) {
      showToast(err.message || "Error saving settings.");
    }
  };

  const handleCreateAdSenseUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitName.trim() || !unitSlotId.trim()) return;

    try {
      const res = await fetchPromoApi("", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "GOOGLE_ADSENSE",
          name: unitName.trim(),
          slotId: unitSlotId.trim(),
          format: unitFormat,
          placement: unitPlacement,
          size: unitSize,
          status: "ACTIVE",
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Google AdSense Unit "${unitName}" added.`);
        setAdSenseModalOpen(false);
        setUnitName("");
        setUnitSlotId("");
        fetchAdsData();
      } else {
        showToast(data.message || "Error adding AdSense unit.");
      }
    } catch (err: any) {
      showToast(err.message || "Error adding unit.");
    }
  };

  const handleToggleAdSenseStatus = async (unit: AdSenseUnitConfig) => {
    const nextStatus = unit.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    try {
      const res = await fetchPromoApi("", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "GOOGLE_ADSENSE",
          id: unit.id,
          status: nextStatus,
        }),
      });
      if (res.ok) {
        setAdSenseUnits((prev) =>
          prev.map((u) => (u.id === unit.id ? { ...u, status: nextStatus } : u))
        );
        showToast(`Ad unit ${unit.name} set to ${nextStatus}.`);
      } else {
        const data = await res.json().catch(() => null);
        showToast(data?.message || "Error updating ad unit status.");
      }
    } catch (err: any) {
      showToast(err.message || "Error updating ad unit status.");
    }
  };

  const handleDeleteAdSenseUnit = async (id: string) => {
    if (!confirm("Are you sure you want to remove this AdSense unit?")) return;
    try {
      let res: Response | null = null;
      try {
        res = await fetch(`/api/admin/promotions?id=${encodeURIComponent(id)}&type=GOOGLE_ADSENSE`, {
          method: "DELETE",
        });
      } catch {
        res = null;
      }

      if (!res || !res.ok) {
        try {
          res = await fetch("/api/admin/promotions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "DELETE", id, type: "GOOGLE_ADSENSE" }),
          });
        } catch {
          res = null;
        }
      }

      if (!res || !res.ok) {
        try {
          res = await fetch(`/api/admin/ads?id=${encodeURIComponent(id)}&type=GOOGLE_ADSENSE`, {
            method: "DELETE",
          });
        } catch {
          res = null;
        }
      }

      if (res && res.ok) {
        const data = await res.json().catch(() => ({}));
        setAdSenseUnits((prev) => prev.filter((u) => String(u.id) !== String(id)));
        showToast(data.message || "AdSense unit deleted.");
      } else {
        const data = res ? await res.json().catch(() => null) : null;
        showToast(data?.message || "Failed to delete AdSense unit.");
      }
    } catch (err: any) {
      console.error("Delete AdSense unit error:", err);
      showToast(err.message || "Error deleting AdSense unit.");
    }
  };

  const openCodeSnippet = (unit: AdSenseUnitConfig) => {
    setSelectedUnitForCode(unit);
    setCodeSnippetModalOpen(true);
  };

  // Filtered manual ads
  const filteredManualAds = manualAds.filter((ad) => {
    if (manualPlacementFilter !== "ALL" && ad.placement !== manualPlacementFilter) return false;
    if (manualSearch.trim()) {
      const q = manualSearch.toLowerCase();
      return (
        ad.title.toLowerCase().includes(q) ||
        ad.link.toLowerCase().includes(q) ||
        ad.placement.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Active items for live preview
  const activePreviewAds: ManualAdItem[] = manualAds
    .filter((a) => a.status === "ACTIVE" && a.placement === "HOME_SLIDER")
    .map((a) => ({
      id: a.id,
      title: a.title,
      image: a.image,
      link: a.link,
    }));

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 rounded-xl bg-slate-900 text-white px-5 py-3 shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-top-4 duration-200">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#ea580c]">
            Monetization &amp; Advertisements Manager
          </span>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
            Ads Manager
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Easily manage both <strong>Google AdSense</strong> display ads and <strong>Manual Promotional Banners</strong> (slider carousel).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeTab !== "ADSENSE" ? (
            <button
              type="button"
              onClick={() => {
                handleOpenCreateManual(activeTab === "LOGIN_ADS" ? "CUSTOMER_LOGIN" : "HOME_SLIDER");
              }}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#1e3a8a] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#1e40af] transition-colors"
            >
              <Plus className="w-4 h-4" /> {activeTab === "LOGIN_ADS" ? "Add Login Advertisement" : "Add Manual Banner Ad"}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAdsTxtModalOpen(true)}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
              >
                <FileCode className="w-4 h-4 text-blue-600" /> ads.txt Status
              </button>
              <button
                type="button"
                onClick={() => setAdSenseModalOpen(true)}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#1e3a8a] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#1e40af] transition-colors"
              >
                <Plus className="w-4 h-4" /> New AdSense Unit
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Tab Switcher */}
      <div className="border-b border-slate-200">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("MANUAL_ADS")}
            className={`flex items-center gap-2.5 px-5 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === "MANUAL_ADS"
                ? "border-[#1e3a8a] text-[#1e3a8a] bg-blue-50/60 rounded-t-lg"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <ImageIcon className="w-4 h-4 text-[#ea580c]" />
            Manual Ads &amp; Banner Carousel
            <span className="ml-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
              {manualAds.length} Banners
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("LOGIN_ADS")}
            className={`flex items-center gap-2.5 px-5 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${activeTab === "LOGIN_ADS" ? "border-[#1e3a8a] text-[#1e3a8a] bg-blue-50/60 rounded-t-lg" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            <ImageIcon className="w-4 h-4 text-[#ea580c]" /> Login Advertisements
            <span className="ml-1.5 rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900">
              {manualAds.filter((ad) => ad.placement.endsWith("_LOGIN") || ad.placement.endsWith("_SIGNUP")).length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ADSENSE")}
            className={`flex items-center gap-2.5 px-5 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === "ADSENSE"
                ? "border-[#1e3a8a] text-[#1e3a8a] bg-blue-50/60 rounded-t-lg"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Globe className="w-4 h-4 text-blue-600" />
            Google AdSense Network
            <span className="ml-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              {adSenseUnits.length} Units
            </span>
          </button>
        </div>
      </div>

      {/* TAB 1: MANUAL ADS (BANNER CAROUSEL) */}
      {activeTab === "MANUAL_ADS" && (
        <div className="space-y-6">
          {/* Top Quick Stats Strip */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs border-t-4 border-t-[#ea580c]">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Manual Ads</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{manualAds.length}</p>
              <p className="mt-1 text-xs text-slate-500">Stored in database</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs border-t-4 border-t-emerald-600">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active in Home Carousel</p>
              <p className="mt-2 text-2xl font-bold text-emerald-700">
                {manualAds.filter((a) => a.status === "ACTIVE" && a.placement === "HOME_SLIDER").length}
              </p>
              <p className="mt-1 text-xs text-slate-500">Rotating above Browse Services</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs border-t-4 border-t-[#1e3a8a]">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Banner Views</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {manualAds.reduce((sum, a) => sum + (a.views || 0), 0).toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-slate-500">Logged impressions</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs border-t-4 border-t-blue-600">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Clicks</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {manualAds.reduce((sum, a) => sum + (a.clicks || 0), 0).toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-slate-500">Redirects to service schemes</p>
            </div>
          </div>

          {/* Interactive Live Preview Box matching User's Screenshot */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-[#ea580c]" />
                  Live Preview: Home Banner Carousel (Above Browse Our Services)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  This interactive preview demonstrates how visitors see your banners on the public portal.
                </p>
              </div>
              <span className="text-[11px] font-mono bg-blue-50 text-[#1e3a8a] border border-blue-200 px-3 py-1 rounded-full font-bold">
                {activePreviewAds.length} Active Slides
              </span>
            </div>

            {/* The Live Carousel Preview Container */}
            <div className="bg-slate-50/70 p-4 sm:p-6 rounded-xl border border-slate-200/80">
              {activePreviewAds.length === 0 ? (
                <div className="w-full h-44 rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center p-6 text-center text-slate-400 bg-white">
                  <ImageIcon className="w-10 h-10 text-slate-300 mb-2" />
                  <p className="text-sm font-bold text-slate-700">No active banners in Home Carousel</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-md">
                    Add a banner or toggle an existing banner to <strong>Active</strong> with placement <strong>HOME_SLIDER</strong>.
                  </p>
                </div>
              ) : (
                <ManualAdSlider initialAds={activePreviewAds} previewMode={true} />
              )}

              {/* Exact sub-heading from screenshot */}
              <div className="mt-6 text-center">
                <h4 className="text-lg font-bold text-slate-900 tracking-tight">
                  Browse Our Services
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  (Preview: Service directory cards appear below this banner)
                </p>
              </div>
            </div>
          </div>

          {/* Filters, Search & Add Action */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search manual ads by title or link..."
                value={manualSearch}
                onChange={(e) => setManualSearch(e.target.value)}
                className="w-full h-10 pl-9 pr-4 text-xs rounded-lg border border-slate-300 outline-none focus:border-[#1e3a8a]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600 uppercase">Placement:</span>
                <select
                  value={manualPlacementFilter}
                  onChange={(e) => setManualPlacementFilter(e.target.value)}
                  className="h-10 px-3 text-xs rounded-lg border border-slate-300 outline-none focus:border-[#1e3a8a] bg-white cursor-pointer"
                >
                  <option value="ALL">All Placements</option>
                  <option value="HOME_SLIDER">Home Carousel (Above Services)</option>
                  <option value="DISTRIBUTOR_LOGIN">Distributor Login Panel</option>
                  <option value="USER_LOGIN">User Login Side Panel</option>
                  <option value="CUSTOMER_LOGIN">Customer Login Side Panel</option>
                  <option value="RETAILER_LOGIN">Retailer Login Side Panel</option>
                  <option value="USER_SIGNUP">User Signup Side Panel</option>
                  <option value="CUSTOMER_SIGNUP">Customer Signup Side Panel</option>
                  <option value="RETAILER_SIGNUP">Retailer Signup Side Panel</option>
                  <option value="HEADER">Top Header Banner</option>
                  <option value="SIDEBAR">Citizen Portal Sidebar</option>
                  <option value="FOOTER">Footer Banner</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => handleOpenCreateManual()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1e3a8a] text-xs font-bold text-white hover:bg-[#1e40af] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Banner
              </button>
            </div>
          </div>

          {/* Manual Ads Table / List */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Manual Banner Ads Directory ({filteredManualAds.length})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Promotional banners, cooperative product showcases, and official government announcements.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAutoResequenceAll}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-[#1e3a8a] transition-colors shadow-2xs cursor-pointer"
                  title="Automatically re-sequence all banners (1, 2, 3...)"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Auto-Sequence All (1, 2, 3...)
                </button>
                <button
                  type="button"
                  onClick={fetchAdsData}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
                  title="Refresh List"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto w-full scrollbar-thin">
              <table className="w-full min-w-[950px] text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-700">
                  <tr>
                    <th className="px-5 py-4 min-w-[140px]">Banner Preview</th>
                    <th className="px-5 py-4 min-w-[220px]">Campaign Title</th>
                    <th className="px-5 py-4 min-w-[180px]">Placement Slot</th>
                    <th className="px-5 py-4 min-w-[160px]">Target Destination</th>
                    <th className="px-5 py-4 whitespace-nowrap">Order</th>
                    <th className="px-5 py-4 whitespace-nowrap">Status</th>
                    <th className="px-5 py-4 whitespace-nowrap text-right min-w-[140px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredManualAds.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                        <ImageIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-semibold text-slate-700">No manual ads found</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Click &quot;Add Manual Banner Ad&quot; above to upload your first promotional slide.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredManualAds.map((ad, idx) => (
                      <tr key={ad.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Image Thumbnail */}
                        <td className="px-5 py-4">
                          <div className="relative w-28 h-14 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={ad.image}
                              alt={ad.title}
                              className="max-h-full max-w-full object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  "https://placehold.co/300x100?text=Banner+Image";
                              }}
                            />
                          </div>
                        </td>

                        {/* Title & ID */}
                        <td className="px-5 py-4">
                          <div className="font-bold text-slate-900 text-sm leading-snug">
                            {ad.title}
                          </div>
                          <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                            ID: #{ad.id}
                          </div>
                        </td>

                        {/* Placement */}
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1.5 bg-blue-50 text-[#1e3a8a] border border-blue-200 px-2.5 py-1 rounded-md text-xs font-semibold">
                            <Layers className="w-3 h-3" />
                            {ad.placement === "HOME_SLIDER"
                              ? "Home Carousel (Above Services)"
                              : ad.placement === "DISTRIBUTOR_LOGIN"
                                ? "Distributor Login Panel"
                                : ({ USER_LOGIN: "User Login Side Panel", CUSTOMER_LOGIN: "Customer Login Side Panel", RETAILER_LOGIN: "Retailer Login Side Panel", USER_SIGNUP: "User Signup Side Panel", CUSTOMER_SIGNUP: "Customer Signup Side Panel", RETAILER_SIGNUP: "Retailer Signup Side Panel" } as Record<string, string>)[ad.placement] || ad.placement.replace("_", " ")}
                          </span>
                        </td>

                        {/* Target Link */}
                        <td className="px-5 py-4 text-xs font-mono">
                          {ad.link ? (
                            <a
                              href={ad.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline max-w-[200px] truncate"
                              title={ad.link}
                            >
                              {ad.link}
                              <ExternalLink className="w-3 h-3 shrink-0" />
                            </a>
                          ) : (
                            <span className="text-slate-400 italic">None (Informational only)</span>
                          )}
                        </td>

                        {/* Order & Reordering */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold bg-slate-100 text-slate-800 px-2.5 py-1 rounded border border-slate-200">
                              #{ad.sortOrder}
                            </span>
                            <div className="flex flex-col gap-0.5">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => handleMoveBanner(ad, "UP")}
                                className={`p-0.5 rounded transition-colors ${
                                  idx === 0
                                    ? "text-slate-300 cursor-not-allowed"
                                    : "text-slate-600 hover:text-white hover:bg-[#1e3a8a] cursor-pointer"
                                }`}
                                title="Move Up (Display earlier in carousel)"
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === filteredManualAds.length - 1}
                                onClick={() => handleMoveBanner(ad, "DOWN")}
                                className={`p-0.5 rounded transition-colors ${
                                  idx === filteredManualAds.length - 1
                                    ? "text-slate-300 cursor-not-allowed"
                                    : "text-slate-600 hover:text-white hover:bg-[#1e3a8a] cursor-pointer"
                                }`}
                                title="Move Down (Display later in carousel)"
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* Status Toggle */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleToggleManualStatus(ad)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                              ad.status === "ACTIVE"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                                : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
                            }`}
                            title="Click to toggle status"
                          >
                            {ad.status === "ACTIVE" ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Active
                              </>
                            ) : (
                              <>
                                <Pause className="w-3.5 h-3.5 text-slate-500" /> Paused
                              </>
                            )}
                          </button>
                        </td>

                        {/* Action Buttons */}
                        <td className="px-5 py-4 whitespace-nowrap text-right min-w-[140px]">
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            <button
                              type="button"
                              onClick={() => handleOpenEditManual(ad)}
                              className="p-1.5 text-slate-600 hover:text-[#1e3a8a] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Edit Banner"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteManualAd(ad.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete Banner"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "LOGIN_ADS" && (
        <section className="space-y-5">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
            Create a separate image ad for each sign-in or registration side panel. Only active ads assigned to that exact placement appear on its page.
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[
              ["USER_LOGIN", "User Login"], ["USER_SIGNUP", "User Sign Up"], ["CUSTOMER_LOGIN", "Customer Login"], ["RETAILER_LOGIN", "Retailer Login"], ["DISTRIBUTOR_LOGIN", "Distributor Login"],
              ["CUSTOMER_SIGNUP", "Customer Sign Up"], ["RETAILER_SIGNUP", "Retailer Sign Up"],
            ].map(([placement, label]) => {
              const ads = manualAds.filter((ad) => ad.placement === placement);
              return (
                <article key={placement} className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-slate-900">{label}</h3>
                    <span className="text-xs text-slate-500">{ads.filter((ad) => ad.status === "ACTIVE").length} active</span>
                  </div>
                  {ads.length ? <ul className="mt-3 space-y-2">{ads.map((ad) => (
                    <li key={ad.id} className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2 text-sm">
                      <span className="min-w-0 truncate">{ad.title}</span>
                      <div className="flex shrink-0 gap-2">
                        <button type="button" onClick={() => handleOpenEditManual(ad)} className="text-xs font-semibold text-blue-700 hover:underline">Edit</button>
                        <button type="button" onClick={() => handleToggleManualStatus(ad)} className="text-xs font-semibold text-slate-600 hover:underline">{ad.status === "ACTIVE" ? "Pause" : "Activate"}</button>
                      </div>
                    </li>
                  ))}</ul> : <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">No ads assigned yet.</p>}
                  <button type="button" onClick={() => handleOpenCreateManual(placement)} className="mt-3 text-xs font-bold text-[#1e3a8a] hover:underline">Add ad to this panel</button>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* TAB 2: GOOGLE ADSENSE NETWORK */}
      {activeTab === "ADSENSE" && (
        <div className="space-y-6">
          {/* AdSense Publisher Configuration Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                    Google AdSense Network v2
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Publisher Connected
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 mt-2 flex items-center gap-2">
                  Publisher ID:{" "}
                  <code className="font-mono text-[#1e3a8a] bg-slate-100 px-2.5 py-0.5 rounded-md text-base">
                    {publisherId}
                  </code>
                </h2>
                <p className="text-xs text-slate-500">
                  Global script tag executes across public pages via Next.js Script strategy (afterInteractive).
                </p>
              </div>

              {/* Toggles & Display Mode */}
              <div className="flex flex-wrap items-center gap-5 border-t lg:border-t-0 lg:border-l border-slate-200 pt-4 lg:pt-0 lg:pl-6">
                {/* Homepage Display Mode */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Home Page Ad Slot Display
                  </label>
                  <select
                    value={homeAdMode}
                    onChange={(e) => {
                      const next = e.target.value as "MANUAL" | "ADSENSE" | "BOTH";
                      setHomeAdMode(next);
                      handleUpdateAdSenseSettings({ homeAdMode: next });
                    }}
                    className="h-9 px-3 text-xs font-semibold rounded-lg border border-slate-300 outline-none focus:border-[#1e3a8a] bg-white cursor-pointer"
                  >
                    <option value="MANUAL">Manual Ads Carousel Only</option>
                    <option value="ADSENSE">Google AdSense Banner Only</option>
                    <option value="BOTH">Both (Google AdSense + Carousel)</option>
                  </select>
                </div>

                {/* Auto Ads */}
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-xs font-bold text-slate-800">Auto Ads</p>
                    <p className="text-[11px] text-slate-500">Google ML placements</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !autoAdsEnabled;
                      setAutoAdsEnabled(next);
                      handleUpdateAdSenseSettings({ autoAdsEnabled: next });
                    }}
                    className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                      autoAdsEnabled ? "bg-emerald-600" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`block w-5 h-5 bg-white rounded-full shadow-md transition-transform transform ${
                        autoAdsEnabled ? "translate-x-6" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>

                {/* Safe Zone */}
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-xs font-bold text-slate-800">Govt Safe-Zone</p>
                    <p className="text-[11px] text-slate-500">Mute ads on payment &amp; KYC</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !governmentSafeZone;
                      setGovernmentSafeZone(next);
                      handleUpdateAdSenseSettings({ safeZone: next });
                    }}
                    className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                      governmentSafeZone ? "bg-[#1e3a8a]" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`block w-5 h-5 bg-white rounded-full shadow-md transition-transform transform ${
                        governmentSafeZone ? "translate-x-6" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* AdSense Units Table */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
            <div className="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Configured Google Ad Units (data-ad-slot)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Responsive Google AdSense slots placed across citizen and public informational templates.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAdSenseModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1e3a8a] text-xs font-bold text-white hover:bg-[#1e40af] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> New AdSense Unit
              </button>
            </div>

            <div className="overflow-x-auto w-full scrollbar-thin">
              <table className="w-full min-w-[950px] text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-700">
                  <tr>
                    <th className="px-5 py-4 min-w-[220px]">Ad Unit &amp; Name</th>
                    <th className="px-5 py-4 whitespace-nowrap">Slot ID (data-ad-slot)</th>
                    <th className="px-5 py-4 whitespace-nowrap">Format &amp; Dimensions</th>
                    <th className="px-5 py-4 min-w-[200px]">Placement Region</th>
                    <th className="px-5 py-4 whitespace-nowrap">Status</th>
                    <th className="px-5 py-4 whitespace-nowrap text-right min-w-[120px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {adSenseUnits.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                        <Layout className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-semibold text-slate-700">No Google AdSense units created yet</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Click &quot;New AdSense Unit&quot; above to configure your slot IDs.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    adSenseUnits.map((unit) => (
                      <tr key={unit.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                            <Layout className="w-4 h-4 text-blue-600 shrink-0" />
                            {unit.name}
                          </div>
                          <div className="text-[11px] font-mono text-slate-400 mt-0.5">ID: {unit.id}</div>
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md font-mono text-xs font-bold text-slate-800">
                            {unit.slotId}
                            <button
                              type="button"
                              onClick={() => copyToClipboard(unit.slotId, unit.id)}
                              className="text-slate-400 hover:text-slate-700 shrink-0 cursor-pointer"
                              title="Copy Slot ID"
                            >
                              {copiedSlot === unit.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="font-semibold text-slate-800 text-xs">
                            {unit.recommendedSize}
                          </span>
                          <div className="text-[11px] text-slate-400 capitalize">{unit.format} format</div>
                        </td>

                        <td className="px-5 py-4 text-xs text-slate-600 max-w-xs">
                          <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded text-xs font-medium">
                            {unit.placement}
                          </span>
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleToggleAdSenseStatus(unit)}
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold cursor-pointer transition-all ${
                              unit.status === "ACTIVE"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-slate-100 text-slate-600 border border-slate-200"
                            }`}
                            title="Click to toggle status"
                          >
                            {unit.status === "ACTIVE" ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Pause className="w-3.5 h-3.5 text-slate-500" />
                            )}
                            {unit.status}
                          </button>
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap text-right min-w-[120px]">
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            <button
                              type="button"
                              onClick={() => openCodeSnippet(unit)}
                              className="p-1.5 text-slate-600 hover:text-[#1e3a8a] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="View Code Snippet"
                            >
                              <Code className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteAdSenseUnit(unit.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete Unit"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD / EDIT MANUAL BANNER AD */}
      {manualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-[#1e3a8a] text-white">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#ea580c]" />
                {editingManualAd ? "Edit Banner Ad" : "Add New Manual Banner Ad"}
              </h3>
              <button
                type="button"
                onClick={() => setManualModalOpen(false)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveManualAd} className="p-5 space-y-4 text-xs overflow-y-auto">
              {/* Ad Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Banner Title / Campaign Name *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. வாகை எண்ணெய் வகைகள் (Vaagai Oil Varieties)"
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 outline-none focus:border-[#1e3a8a]"
                />
              </div>

              {/* Banner Image (File upload & URL) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Banner Image Source *
                </label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={formImage}
                      onChange={(e) => setFormImage(e.target.value)}
                      placeholder="Upload an image or enter its URL"
                      className="flex-1 h-10 px-3 rounded-lg border border-slate-300 outline-none focus:border-[#1e3a8a]"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 text-white font-bold hover:bg-slate-900 transition-colors cursor-pointer shrink-0"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {isUploading ? "Uploading..." : "Upload File"}
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                    />
                  </div>

                  {/* Thumbnail Preview */}
                  {formImage && (
                    <div className="mt-2 p-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-3">
                      <div className="relative w-24 h-12 bg-white rounded border border-slate-200 overflow-hidden flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={formImage}
                          alt="Banner Preview"
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <span className="text-[11px] text-slate-600 truncate flex-1 font-mono">
                        {formImage}
                      </span>
                    </div>
                  )}
                  <p className="text-[10px] text-slate-500">{isUploading ? "Uploading image… please wait before saving." : formImage ? "Image is ready. Check the preview before saving." : "One image per banner. Choose JPG, PNG, WebP, or GIF up to 5 MB. Landscape artwork displays best in the side panel."}</p>
                </div>
              </div>

              {/* Target / Redirect URL */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                    Target Link (Optional)
                </label>
                <input
                  type="text"
                  value={formLink}
                  onChange={(e) => setFormLink(e.target.value)}
                  placeholder="Leave blank, or enter /services or https://..."
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 outline-none focus:border-[#1e3a8a]"
                />
              </div>

              {/* Placement Slot & Sort Order */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Placement Slot(s)</label>
                  <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-slate-300 bg-white p-2">
                    {[
                      ["HOME_SLIDER", "Home Carousel (Above Services)"], ["DISTRIBUTOR_LOGIN", "Distributor Login"],
                      ["USER_LOGIN", "User Login"], ["CUSTOMER_LOGIN", "Customer Login"], ["RETAILER_LOGIN", "Retailer Login"],
                      ["USER_SIGNUP", "User Sign Up"], ["CUSTOMER_SIGNUP", "Customer Sign Up"], ["RETAILER_SIGNUP", "Retailer Sign Up"],
                      ["HEADER", "Top Header Banner"], ["SIDEBAR", "Citizen Portal Sidebar"], ["FOOTER", "Footer Banner"],
                    ].map(([placement, label]) => (
                      <label key={placement} className="flex min-h-8 cursor-pointer items-center gap-2 rounded px-1 text-xs text-slate-700 hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={formPlacements.includes(placement)}
                          onChange={(event) => {
                            const next = editingManualAd ? [placement] : event.target.checked ? [...formPlacements, placement] : formPlacements.filter((item) => item !== placement);
                            if (!next.length) return;
                            setFormPlacements(next);
                            setFormPlacement(next[0]);
                            if (isAutoOrder) setFormSortOrder(String(Math.max(...next.map(nextSequenceFor))));
                          }}
                          className="rounded text-[#1e3a8a] focus:ring-0"
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                  <p className="mt-1 text-[10px] text-slate-500">{editingManualAd ? "Editing changes this ad's single destination. Create a new banner to copy it to more destinations." : "Select one or more destinations. One ad entry is created per destination, each with its own sequence."}</p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Display Sequence
                    </label>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-[#1e3a8a]">
                      <input
                        type="checkbox"
                        checked={isAutoOrder}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setIsAutoOrder(checked);
                          if (checked) {
                            setFormSortOrder(String(Math.max(...formPlacements.map(nextSequenceFor))));
                          }
                        }}
                        className="rounded text-[#1e3a8a] focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                      />
                      Auto Order
                    </label>
                  </div>

                  {isAutoOrder ? (
                    <div className="min-h-10 w-full rounded-lg border border-emerald-300 bg-emerald-50/80 px-3 py-2 text-emerald-900 text-xs font-bold">
                      <span className="flex items-center gap-1.5 text-emerald-800">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        Auto sequence by destination
                      </span>
                      <span className="mt-1 block text-[11px] font-medium leading-relaxed">
                        {formPlacements.map((placement) => `${placement.replaceAll("_", " ")} #${nextSequenceFor(placement)}`).join(" · ")}
                      </span>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        value={formSortOrder}
                        onChange={(e) => setFormSortOrder(e.target.value)}
                        placeholder="e.g. 1"
                        className="w-full h-10 px-3 rounded-lg border border-slate-300 outline-none focus:border-[#1e3a8a]"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-semibold pointer-events-none">
                        Custom Position
                      </span>
                    </div>
                  )}
                  <p className="text-[10px] text-slate-500 mt-1">
                    {isAutoOrder
                    ? "Each destination gets its own next sequence. Lower numbers display first; final order is assigned when saved."
                      : `The same sequence number is used in all ${formPlacements.length} selected destination(s). Lower numbers display first.`}
                  </p>
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Initial Status</label>
                <div className="flex items-center gap-4 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="adStatus"
                      checked={formStatus === "ACTIVE"}
                      onChange={() => setFormStatus("ACTIVE")}
                      className="text-[#1e3a8a]"
                    />
                    <span className="font-semibold text-slate-800">Active (Visible)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="adStatus"
                      checked={formStatus === "PAUSED"}
                      onChange={() => setFormStatus("PAUSED")}
                      className="text-[#1e3a8a]"
                    />
                    <span className="font-semibold text-slate-600">Paused (Hidden)</span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setManualModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !formTitle.trim() || !formImage.trim()}
                  className="px-5 py-2 rounded-lg bg-[#1e3a8a] text-white hover:bg-[#1e40af] disabled:cursor-not-allowed disabled:opacity-50 font-bold shadow-xs transition-colors cursor-pointer"
                >
                  {isUploading ? "Wait for image upload…" : editingManualAd ? "Save Changes" : "Create Banner"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD GOOGLE ADSENSE UNIT */}
      {adSenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-[#1e3a8a] text-white">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-400" /> New Google AdSense Unit
              </h3>
              <button
                type="button"
                onClick={() => setAdSenseModalOpen(false)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAdSenseUnit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ad Unit Friendly Name *
                </label>
                <input
                  type="text"
                  required
                  value={unitName}
                  onChange={(e) => setUnitName(e.target.value)}
                  placeholder="e.g. Services Page Mid-Article Banner"
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 outline-none focus:border-[#1e3a8a]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Google Ad Slot ID (data-ad-slot) *
                </label>
                <input
                  type="text"
                  required
                  value={unitSlotId}
                  onChange={(e) => setUnitSlotId(e.target.value)}
                  placeholder="e.g. 7162534891"
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 outline-none focus:border-[#1e3a8a] font-mono text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Format</label>
                  <select
                    value={unitFormat}
                    onChange={(e) => setUnitFormat(e.target.value as any)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 outline-none focus:border-[#1e3a8a] bg-white cursor-pointer"
                  >
                    <option value="horizontal">Horizontal (Leaderboard)</option>
                    <option value="rectangle">Medium Rectangle</option>
                    <option value="vertical">Vertical Skyscraper</option>
                    <option value="fluid">In-Article Fluid</option>
                    <option value="auto">Auto Responsive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Placement</label>
                  <select
                    value={unitPlacement}
                    onChange={(e) => setUnitPlacement(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 outline-none focus:border-[#1e3a8a] bg-white cursor-pointer"
                  >
                    <option value="HOME_SLIDER">Home Page Top Banner</option>
                    <option value="BETWEEN_SERVICES">Services Directory Mid-Page</option>
                    <option value="SIDEBAR">Citizen Portal Sidebar</option>
                    <option value="FOOTER">Footer Ad Unit</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Size Specification</label>
                <input
                  type="text"
                  value={unitSize}
                  onChange={(e) => setUnitSize(e.target.value)}
                  placeholder="e.g. Responsive (728x90)"
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 outline-none focus:border-[#1e3a8a]"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAdSenseModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#1e3a8a] text-white hover:bg-[#1e40af] font-bold shadow-xs transition-colors cursor-pointer"
                >
                  Save Ad Unit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CODE SNIPPET INSPECTOR */}
      {codeSnippetModalOpen && selectedUnitForCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Code className="w-4 h-4 text-emerald-400" />
                AdSense Embed Snippet: {selectedUnitForCode.name}
              </h3>
              <button
                type="button"
                onClick={() => setCodeSnippetModalOpen(false)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <p className="font-bold text-slate-700 mb-1">Next.js Component JSX:</p>
                <div className="relative rounded-lg bg-slate-950 p-3.5 text-emerald-400 font-mono text-[11px] overflow-x-auto">
                  <code>{`<AdSenseUnit slot="${selectedUnitForCode.slotId}" format="${selectedUnitForCode.format}" />`}</code>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        `<AdSenseUnit slot="${selectedUnitForCode.slotId}" format="${selectedUnitForCode.format}" />`,
                        "jsx"
                      )
                    }
                    className="absolute right-2 top-2 p-1.5 bg-slate-800 text-slate-200 rounded hover:bg-slate-700 cursor-pointer"
                    title="Copy JSX"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div>
                <p className="font-bold text-slate-700 mb-1">Standard HTML &lt;ins&gt; Snippet:</p>
                <div className="relative rounded-lg bg-slate-950 p-3.5 text-emerald-400 font-mono text-[11px] overflow-x-auto">
                  <code>{`<ins class="adsbygoogle"
     style="display:block"
     data-ad-client="${publisherId}"
     data-ad-slot="${selectedUnitForCode.slotId}"
     data-ad-format="${selectedUnitForCode.format}"
     data-full-width-responsive="true"></ins>
<script>
     (adsbygoogle = window.adsbygoogle || []).push({});
</script>`}</code>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        `<ins class="adsbygoogle" style="display:block" data-ad-client="${publisherId}" data-ad-slot="${selectedUnitForCode.slotId}" data-ad-format="${selectedUnitForCode.format}" data-full-width-responsive="true"></ins><script>(adsbygoogle = window.adsbygoogle || []).push({});</script>`,
                        "html"
                      )
                    }
                    className="absolute right-2 top-2 p-1.5 bg-slate-800 text-slate-200 rounded hover:bg-slate-700 cursor-pointer"
                    title="Copy HTML"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setCodeSnippetModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-white font-bold hover:bg-slate-900 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: ADS.TXT STATUS INSPECTOR */}
      {adsTxtModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <FileCode className="w-4 h-4 text-emerald-400" />
                ads.txt Authorization Status
              </h3>
              <button
                type="button"
                onClick={() => setAdsTxtModalOpen(false)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3.5 flex items-start gap-3 text-emerald-900">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Authorized Digital Seller Verified</p>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    Your ads.txt file is publicly accessible at <code>/ads.txt</code> and ready for Google crawlers.
                  </p>
                </div>
              </div>

              <div>
                <p className="font-bold text-slate-700 mb-1">Live ads.txt Record:</p>
                <div className="rounded-lg bg-slate-950 p-3 text-emerald-400 font-mono text-[11px]">
                  google.com, {publisherId}, DIRECT, f08c47fec0942fa0
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setAdsTxtModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-white font-bold hover:bg-slate-900 transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
