"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Layers,
  FolderTree,
  Plus,
  Search,
  Eye,
  FileText,
  Trash2,
  Edit,
  ChevronRight,
  ClipboardCheck,
  RefreshCw,
  X,
  Sparkles,
  Info,
  Calendar,
  User,
  Upload,
  Vote,
  CreditCard,
  Building2,
  Award,
  GraduationCap,
  Shield,
  Briefcase,
  HeartPulse,
  Home,
  FileCheck2,
  BadgePercent,
  Car,
  Landmark,
  Scale,
  Settings2,
} from "lucide-react";

export const AVAILABLE_CATEGORY_ICONS = [
  { key: "Vote", label: "Voter / Election", Icon: Vote },
  { key: "CreditCard", label: "Identity / Cards", Icon: CreditCard },
  { key: "Building2", label: "Government / Municipal", Icon: Building2 },
  { key: "Award", label: "Certificates / Revenue", Icon: Award },
  { key: "GraduationCap", label: "Education / Scholarship", Icon: GraduationCap },
  { key: "Shield", label: "Welfare & Social Security", Icon: Shield },
  { key: "Briefcase", label: "Employment & Labour", Icon: Briefcase },
  { key: "HeartPulse", label: "Health & Medical", Icon: HeartPulse },
  { key: "Home", label: "Housing & Land Records", Icon: Home },
  { key: "FileCheck2", label: "Legal / Registrations", Icon: FileCheck2 },
  { key: "BadgePercent", label: "Subsidies & Schemes", Icon: BadgePercent },
  { key: "Car", label: "Transport & Driving", Icon: Car },
  { key: "Landmark", label: "Treasury / Financial", Icon: Landmark },
  { key: "Scale", label: "Judicial & Grievance", Icon: Scale },
  { key: "FolderTree", label: "Catalog / General", Icon: FolderTree },
  { key: "Layers", label: "Service / Utility", Icon: Layers },
];

export const getLucideCategoryIcon = (keyOrUrl?: string) => {
  if (!keyOrUrl) return FolderTree;
  const match = AVAILABLE_CATEGORY_ICONS.find(
    (item) => item.key.toLowerCase() === keyOrUrl.trim().toLowerCase()
  );
  if (match) return match.Icon;
  const lower = keyOrUrl.toLowerCase();
  if (lower.includes("voter") || lower.includes("election")) return Vote;
  if (lower.includes("card") || lower.includes("pan") || lower.includes("aadhaar")) return CreditCard;
  if (lower.includes("cert") || lower.includes("revenue")) return Award;
  if (lower.includes("welfare") || lower.includes("pension")) return Shield;
  if (lower.includes("job") || lower.includes("employ") || lower.includes("labour")) return Briefcase;
  if (lower.includes("health") || lower.includes("medic")) return HeartPulse;
  if (lower.includes("land") || lower.includes("patta") || lower.includes("home")) return Home;
  if (lower.includes("scheme")) return BadgePercent;
  if (lower.includes("transport") || lower.includes("license")) return Car;
  return FolderTree;
};

interface FormFieldItem {
  key: string;
  id?: number;
  type: string;
  name: string;
  required: boolean;
  options: string;
}

interface MainCategory {
  id: number;
  name: string;
  logo: string;
  description: string;
  status: "active" | "inactive";
  createdAt?: string;
  children: SubCategory[];
}

interface SubCategory {
  id: number;
  name: string;
  mainCategoryId: number;
  status: "active" | "inactive";
  serviceCount?: number;
  createdAt?: string;
}

interface ServiceRecordItem {
  id: number;
  code: string;
  name: string;
  cost: number;
  mainCategoryId: string;
  mainCategoryName: string;
  subCategoryId: string;
  subCategoryName: string;
  details: string;
  active: boolean;
  image?: string;
  fields: FormFieldItem[];
}

export default function AdminEsServicesPage() {
  const [activeTab, setActiveTab] = useState<"services" | "categories">("services");
  const [categories, setCategories] = useState<MainCategory[]>([]);
  const [services, setServices] = useState<ServiceRecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Search & filter
  const [search, setSearch] = useState("");
  const [selectedMainCatFilter, setSelectedMainCatFilter] = useState("ALL");

  // Main Category Modal State
  const [mainCatModalOpen, setMainCatModalOpen] = useState(false);
  const [editingMainCatId, setEditingMainCatId] = useState<number | null>(null);
  const [mainCatForm, setMainCatForm] = useState({
    name: "",
    iconKey: "Vote",
    description: "",
    status: "active" as "active" | "inactive",
  });

  // Sub Category Modal State
  const [subCatModalOpen, setSubCatModalOpen] = useState(false);
  const [editingSubCatId, setEditingSubCatId] = useState<number | null>(null);
  const [subCatForm, setSubCatForm] = useState({
    name: "",
    mainCategoryId: "",
    status: "active" as "active" | "inactive",
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [catRes, svcRes] = await Promise.all([
        fetch("/api/admin/es-categories").then((r) => r.json()),
        fetch("/api/admin/es-services").then((r) => r.json()),
      ]);

      if (catRes.ok && Array.isArray(catRes.categories)) {
        setCategories(catRes.categories);
      }
      if (svcRes.ok && Array.isArray(svcRes.services)) {
        setServices(svcRes.services);
      }
    } catch {
      showToast("Network notice: Unable to sync latest catalog.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Services
  const filteredServices = useMemo(() => {
    return services.filter((svc) => {
      const matchSearch =
        svc.name.toLowerCase().includes(search.toLowerCase()) ||
        svc.mainCategoryName.toLowerCase().includes(search.toLowerCase()) ||
        svc.subCategoryName.toLowerCase().includes(search.toLowerCase());
      const matchCat =
        selectedMainCatFilter === "ALL" || svc.mainCategoryId === selectedMainCatFilter;
      return matchSearch && matchCat;
    });
  }, [services, search, selectedMainCatFilter]);

  // Delete Service
  const handleDeleteService = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This removes its dynamic form.`)) return;
    try {
      setBusy(true);
      const res = await fetch(`/api/admin/es-services?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to delete.");
      showToast("Service deleted.");
      await loadData();
    } catch (err: any) {
      showToast(err.message || "Deletion failed.");
    } finally {
      setBusy(false);
    }
  };

  // Main Category Save
  const handleSaveMainCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mainCatForm.name.trim()) {
      showToast("Main Category name is required.");
      return;
    }
    try {
      setBusy(true);
      const payload = {
        kind: "main",
        id: editingMainCatId,
        name: mainCatForm.name.trim(),
        logo: mainCatForm.iconKey.trim(),
        description: mainCatForm.description.trim(),
        status: mainCatForm.status,
      };

      const res = await fetch("/api/admin/es-categories", {
        method: editingMainCatId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Save category failed.");

      showToast(editingMainCatId ? "Main category updated." : "Main category created.");
      setMainCatModalOpen(false);
      await loadData();
    } catch (err: any) {
      showToast(err.message || "Failed to save category.");
    } finally {
      setBusy(false);
    }
  };

  // Sub Category Save
  const handleSaveSubCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subCatForm.name.trim()) {
      showToast("Sub-category name is required.");
      return;
    }
    if (!subCatForm.mainCategoryId) {
      showToast("Parent Main Category is required.");
      return;
    }
    try {
      setBusy(true);
      const payload = {
        kind: "sub",
        id: editingSubCatId,
        name: subCatForm.name.trim(),
        mainCategoryId: Number(subCatForm.mainCategoryId),
        status: subCatForm.status,
      };

      const res = await fetch("/api/admin/es-categories", {
        method: editingSubCatId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Save subcategory failed.");

      showToast(editingSubCatId ? "Sub-category updated." : "Sub-category created.");
      setSubCatModalOpen(false);
      await loadData();
    } catch (err: any) {
      showToast(err.message || "Failed to save sub-category.");
    } finally {
      setBusy(false);
    }
  };

  // Delete Category
  const handleDeleteCategory = async (id: number, kind: "main" | "sub", name: string) => {
    if (!confirm(`Are you sure you want to delete ${kind === "main" ? "Main Category" : "Sub-Category"} "${name}"?`)) return;
    try {
      setBusy(true);
      const res = await fetch(`/api/admin/es-categories?id=${id}&kind=${kind}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Delete failed.");
      showToast(`${kind === "main" ? "Main category" : "Sub-category"} removed.`);
      await loadData();
    } catch (err: any) {
      showToast(err.message || "Delete failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-2xl animate-fade-in">
          <Info className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1e3a8a] via-[#1e40af] to-[#2563eb] p-6 text-white shadow-lg">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-blue-100 backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>LabourSeva Government Form Studio</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">E-Services &amp; Form Architecture</h1>
            <p className="text-xs text-blue-100 max-w-2xl leading-relaxed">
              Define Main Categories (with icons &amp; descriptions), organize Sub-Categories, and launch the dedicated Full-Screen Form Studio to customize dynamic fields with interactive preview.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => {
                setEditingMainCatId(null);
                setMainCatForm({ name: "", iconKey: "Vote", description: "", status: "active" });
                setMainCatModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3.5 py-2.5 text-xs font-bold text-white hover:bg-white/25 backdrop-blur-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Main Category</span>
            </button>
            <button
              onClick={() => {
                setEditingSubCatId(null);
                setSubCatForm({
                  name: "",
                  mainCategoryId: categories[0]?.id ? String(categories[0].id) : "",
                  status: "active",
                });
                setSubCatModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3.5 py-2.5 text-xs font-bold text-white hover:bg-white/25 backdrop-blur-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Sub-Category</span>
            </button>
            <Link
              href="/admin/studio"
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors shadow-md"
            >
              <Sparkles className="w-4 h-4" />
              <span>Open Form Studio ↗</span>
            </Link>
          </div>
        </div>
      </div>

      {/* View Switcher Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("services")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeTab === "services"
                ? "bg-[#1e3a8a] text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Active E-Services &amp; Forms ({services.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("categories")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeTab === "categories"
                ? "bg-[#1e3a8a] text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <FolderTree className="w-4 h-4" />
            <span>Main &amp; Sub Categories ({categories.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/es-records"
            className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-bold text-[#1e3a8a] hover:bg-blue-100 transition-colors"
          >
            <ClipboardCheck className="w-4 h-4 text-[#1e3a8a]" />
            <span>View Citizen Submissions</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={loadData}
            title="Refresh database records"
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* TAB 1: E-SERVICES & FORMS LIST */}
      {activeTab === "services" && (
        <div className="space-y-4">
          {/* Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
            <div className="relative flex-1 w-full sm:w-auto">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by service name, category, or subcategory..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs font-medium focus:border-[#1e3a8a] focus:bg-white focus:outline-hidden"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-semibold text-slate-500 shrink-0">Filter Main:</span>
              <select
                value={selectedMainCatFilter}
                onChange={(e) => setSelectedMainCatFilter(e.target.value)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 focus:border-[#1e3a8a] focus:bg-white focus:outline-hidden"
              >
                <option value="ALL">All Main Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Services Table / Cards */}
          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-400">
              Fetching catalog from database...
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center space-y-3">
              <Layers className="w-10 h-10 text-slate-400 mx-auto" />
              <div>
                <p className="text-sm font-bold text-slate-700">No Services Found</p>
                <p className="text-xs text-slate-500 mt-1">
                  Launch the Form Studio to create customized fields and publish your service.
                </p>
              </div>
              <Link
                href="/admin/studio"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a8a] px-4 py-2 text-xs font-bold text-white hover:bg-[#1e40af]"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Open Form Studio</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredServices.map((svc) => {
                const SvcIconComponent = getLucideCategoryIcon(svc.image);
                return (
                  <div
                    key={svc.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 text-[#1e3a8a]">
                            <SvcIconComponent className="w-6 h-6" />
                          </div>
                          <div>
                            <span className="inline-block rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-[#1e3a8a] border border-blue-100">
                              {svc.mainCategoryName}
                            </span>
                            {svc.subCategoryName && (
                              <span className="ml-1.5 inline-block text-[10px] font-semibold text-slate-500">
                                / {svc.subCategoryName}
                              </span>
                            )}
                            <h3 className="text-sm font-bold text-slate-900 mt-0.5">{svc.name}</h3>
                          </div>
                        </div>

                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            svc.active
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {svc.active ? "Active" : "Inactive"}
                        </span>
                      </div>

                      {svc.details && (
                        <p className="text-xs text-slate-600 line-clamp-2">{svc.details}</p>
                      )}

                      {/* Dynamic Form Schema Badge */}
                      <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-700 flex items-center gap-1.5">
                            <span>🧩 Studio Schema:</span>
                            <span className="text-[#1e3a8a]">{svc.fields.length} Custom Fields</span>
                          </span>
                          <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                            ₹{svc.cost.toFixed(2)} Fee
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {svc.fields.slice(0, 4).map((f, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 rounded-md bg-white border border-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-600"
                            >
                              <span>{f.name || f.type}</span>
                            </span>
                          ))}
                          {svc.fields.length > 4 && (
                            <span className="rounded-md bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                              +{svc.fields.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-4">
                      <Link
                        href={`/admin/es-records?service_id=${svc.id}`}
                        className="text-[11px] font-bold text-[#1e3a8a] hover:underline flex items-center gap-1"
                      >
                        <ClipboardCheck className="w-3.5 h-3.5" />
                        <span>Submissions</span>
                      </Link>

                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/admin/studio/service_${svc.id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <Settings2 className="w-3.5 h-3.5" />
                          <span>Open Studio</span>
                        </Link>
                        <button
                          onClick={() => handleDeleteService(svc.id, svc.name)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          title="Delete service"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MAIN & SUB CATEGORIES MANAGER */}
      {activeTab === "categories" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Main Categories Structure</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Each Main Category contains a vector icon, government title, descriptive narrative, and linked subcategories.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingMainCatId(null);
                setMainCatForm({ name: "", iconKey: "Vote", description: "", status: "active" });
                setMainCatModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a8a] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#1e40af] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Main Category</span>
            </button>
          </div>

          <div className="space-y-4">
            {categories.map((mainCat) => {
              const MainIconComponent = getLucideCategoryIcon(mainCat.logo);
              return (
                <div
                  key={mainCat.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-4">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 text-[#1e3a8a] shadow-xs">
                        <MainIconComponent className="w-7 h-7" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-slate-900">{mainCat.name}</h3>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              mainCat.status === "active"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {mainCat.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                          {mainCat.description || (
                            <span className="italic text-slate-400">No descriptive brief provided.</span>
                          )}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                            Icon: <span className="font-mono text-[#1e3a8a]">{mainCat.logo || "FolderTree"}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          setEditingSubCatId(null);
                          setSubCatForm({
                            name: "",
                            mainCategoryId: String(mainCat.id),
                            status: "active",
                          });
                          setSubCatModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg bg-blue-50 border border-blue-200 px-2.5 py-1.5 text-xs font-bold text-[#1e3a8a] hover:bg-blue-100"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Sub Category</span>
                      </button>
                      <button
                        onClick={() => {
                          setEditingMainCatId(mainCat.id);
                          setMainCatForm({
                            name: mainCat.name,
                            iconKey: mainCat.logo || "Vote",
                            description: mainCat.description,
                            status: mainCat.status,
                          });
                          setMainCatModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                        title="Edit Main Category"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(mainCat.id, "main", mainCat.name)}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        title="Delete Main Category"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Sub Categories List for this Main Category */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>Sub-Categories ({mainCat.children.length})</span>
                      <span className="text-[11px] text-slate-400">
                        Click &quot;+ Studio Form&quot; to open the dedicated full-screen editor
                      </span>
                    </div>

                    {mainCat.children.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-500">
                        No sub-categories created under {mainCat.name} yet.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {mainCat.children.map((sub) => {
                          const linkedServices = services.filter(
                            (s) => String(s.subCategoryId) === String(sub.id)
                          );
                          return (
                            <div
                              key={sub.id}
                              className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 flex flex-col justify-between hover:bg-slate-50 transition-colors"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-xs font-bold text-slate-900">{sub.name}</h4>
                                  <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[9px] font-bold text-slate-600">
                                    {linkedServices.length} Service(s)
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-500">
                                  Status: <span className="font-semibold">{sub.status}</span>
                                </p>
                              </div>

                              <div className="flex items-center justify-between border-t border-slate-200/70 pt-2 mt-2">
                                <Link
                                  href={`/admin/studio?main_id=${mainCat.id}&sub_id=${sub.id}`}
                                  className="text-[11px] font-bold text-[#1e3a8a] hover:underline inline-flex items-center gap-1"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>+ Studio Form</span>
                                </Link>

                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => {
                                      setEditingSubCatId(sub.id);
                                      setSubCatForm({
                                        name: sub.name,
                                        mainCategoryId: String(mainCat.id),
                                        status: sub.status,
                                      });
                                      setSubCatModalOpen(true);
                                    }}
                                    className="p-1 text-slate-500 hover:text-slate-800"
                                    title="Edit Sub-Category"
                                  >
                                    <Edit className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteCategory(sub.id, "sub", sub.name)}
                                    className="p-1 text-slate-400 hover:text-rose-600"
                                    title="Delete Sub-Category"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: MAIN CATEGORY MODAL */}
      {/* ========================================================================= */}
      {mainCatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">
                {editingMainCatId ? "Edit Main Category" : "Add Main Category"}
              </h3>
              <button
                onClick={() => setMainCatModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMainCategory} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700">
                  Main Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={mainCatForm.name}
                  onChange={(e) => setMainCatForm({ ...mainCatForm, name: e.target.value })}
                  placeholder="e.g. Voter ID வாக்காளர் அட்டை"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold focus:border-[#1e3a8a] focus:outline-hidden"
                />
              </div>

              {/* Icon Picker for Main Category */}
              <div>
                <label className="text-xs font-bold text-slate-700">Choose Icon</label>
                <div className="mt-2 grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1 border border-slate-200 rounded-xl bg-slate-50/50">
                  {AVAILABLE_CATEGORY_ICONS.map((ico) => {
                    const isSelected = mainCatForm.iconKey.toLowerCase() === ico.key.toLowerCase();
                    const IconComp = ico.Icon;
                    return (
                      <button
                        key={ico.key}
                        type="button"
                        onClick={() => setMainCatForm({ ...mainCatForm, iconKey: ico.key })}
                        className={`flex flex-col items-center justify-center p-2 rounded-lg text-center transition-all ${
                          isSelected
                            ? "bg-[#1e3a8a] text-white shadow-xs font-bold"
                            : "bg-white text-slate-700 hover:bg-blue-50/60 border border-slate-200/60"
                        }`}
                      >
                        <IconComp className="w-5 h-5" />
                        <span className="text-[10px] mt-1 truncate max-w-full leading-tight">
                          {ico.key}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Descriptive Overview</label>
                <textarea
                  rows={3}
                  value={mainCatForm.description}
                  onChange={(e) => setMainCatForm({ ...mainCatForm, description: e.target.value })}
                  placeholder="Official description of services covered under this category..."
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium focus:border-[#1e3a8a] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Status</label>
                <select
                  value={mainCatForm.status}
                  onChange={(e) =>
                    setMainCatForm({
                      ...mainCatForm,
                      status: e.target.value as "active" | "inactive",
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold focus:border-[#1e3a8a] focus:outline-hidden"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setMainCatModalOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-xl bg-[#1e3a8a] px-4 py-2 text-xs font-bold text-white hover:bg-[#1e40af] disabled:opacity-50"
                >
                  {busy ? "Saving..." : "Save Main Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: SUB CATEGORY MODAL */}
      {/* ========================================================================= */}
      {subCatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">
                {editingSubCatId ? "Edit Sub-Category" : "Add Sub-Category"}
              </h3>
              <button
                onClick={() => setSubCatModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSubCategory} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700">
                  Parent Main Category <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={subCatForm.mainCategoryId}
                  onChange={(e) => setSubCatForm({ ...subCatForm, mainCategoryId: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold focus:border-[#1e3a8a] focus:outline-hidden"
                >
                  <option value="">Select Main Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">
                  Sub-Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={subCatForm.name}
                  onChange={(e) => setSubCatForm({ ...subCatForm, name: e.target.value })}
                  placeholder="e.g. Apply New புதிதாக விண்ணப்பிக்க"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold focus:border-[#1e3a8a] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Status</label>
                <select
                  value={subCatForm.status}
                  onChange={(e) =>
                    setSubCatForm({
                      ...subCatForm,
                      status: e.target.value as "active" | "inactive",
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold focus:border-[#1e3a8a] focus:outline-hidden"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setSubCatModalOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-xl bg-[#1e3a8a] px-4 py-2 text-xs font-bold text-white hover:bg-[#1e40af] disabled:opacity-50"
                >
                  {busy ? "Saving..." : "Save Sub-Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
