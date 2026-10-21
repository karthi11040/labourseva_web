"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Layers,
  Plus,
  Search,
  Filter,
  FileText,
  Edit2,
  Trash2,
  X,
  Upload,
  FileCheck,
  UserCheck,
  Save,
  ChevronLeft,
  ChevronRight,
  Move,
  MapPin,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Sliders,
  Check,
  PenTool,
  Maximize2,
  Eye,
  ZoomIn,
  ZoomOut,
  Download,
} from "lucide-react";
import { stampAndDownloadPdf } from "@/lib/pdfStamper";

// --- Types ---
interface Service {
  id?: number;
  name: string;
  description?: string;
  type_id: number;
  type_name?: string;
  payment_amount: number;
  retailer_amount: number;
  status: "active" | "inactive";
  assigned_employee_id?: number | null;
  assigned_employee_name?: string | null;
  image_path?: string | null;
  pdf_path?: string | null;
  sign_pos_x?: number | null;
  sign_pos_y?: number | null;
  sign_page?: number;
  sign_width?: number | null; // Stored as percentage (0.0 - 1.0)
  sign_height?: number | null;
  doc_width?: number | null;
  doc_height?: number | null;
  online_districts: number[];
}

interface District {
  id: number;
  name: string;
  signature_path?: string | null;
}

interface Employee {
  id: number;
  name: string;
}

interface ServiceType {
  id: number;
  name: string;
  description?: string;
  image_path?: string | null;
}

export default function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [types, setTypes] = useState<ServiceType[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Sub-Service Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Main Service (Service Type) Modal State
  const [isMainTypeModalOpen, setIsMainTypeModalOpen] = useState(false);
  const [editingMainType, setEditingMainType] = useState<{
    id?: number;
    name: string;
    description: string;
    image_path?: string | null;
  } | null>(null);
  const [mainTypeImageFile, setMainTypeImageFile] = useState<File | null>(null);
  const [isSavingMainType, setIsSavingMainType] = useState(false);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/admin/services", { cache: "no-store" });
      const data = await res.json();
      if (data.ok) {
        setServices(data.services || []);
        setTypes(data.types || []);
        setDistricts(data.districts || []);
        setEmployees(data.employees || []);
      } else {
        showToast(data.error || "Failed to load services catalogue", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Error connecting to server", "error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openModal = (service: Service | null = null, defaultTypeId: number = 0) => {
    setSelectedPdfFile(null);
    setSelectedImageFile(null);
    const signedDistrictIds = districts.filter((d) => Boolean(d.signature_path)).map((d) => d.id);
    if (service) {
      const sanitizedOnline = (service.online_districts || []).filter((id) =>
        districts.some((d) => d.id === id && Boolean(d.signature_path))
      );
      setEditingService({ ...service, online_districts: sanitizedOnline });
    } else {
      // Default new service with signed districts selected; unsigned turned off
      setEditingService({
        name: "",
        description: "",
        type_id: defaultTypeId || types[0]?.id || 0,
        payment_amount: 0,
        retailer_amount: 0,
        status: "active",
        assigned_employee_id: null,
        sign_pos_x: 0.68,
        sign_pos_y: 0.8,
        sign_page: 1,
        sign_width: 0.25,
        sign_height: 0.12,
        online_districts: signedDistrictIds,
      });
    }
    setIsModalOpen(true);
  };

  const openMainTypeModal = (mainType: ServiceType | null = null) => {
    setMainTypeImageFile(null);
    if (mainType) {
      setEditingMainType({
        id: mainType.id,
        name: mainType.name,
        description: mainType.description || "",
        image_path: mainType.image_path || null,
      });
    } else {
      setEditingMainType({
        name: "",
        description: "",
        image_path: null,
      });
    }
    setIsMainTypeModalOpen(true);
  };

  const handleSaveMainType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMainType || !editingMainType.name.trim()) {
      showToast("Main Service name is required", "error");
      return;
    }
    try {
      setIsSavingMainType(true);
      const fd = new FormData();
      if (editingMainType.id) fd.append("id", String(editingMainType.id));
      fd.append("name", editingMainType.name.trim());
      fd.append("description", editingMainType.description || "");
      if (mainTypeImageFile) {
        fd.append("image_file", mainTypeImageFile);
      } else if (editingMainType.image_path) {
        fd.append("image_path", editingMainType.image_path);
      }
      const res = await fetch("/api/admin/service-types", {
        method: editingMainType.id ? "PUT" : "POST",
        body: fd,
      });
      const data = await res.json();
      if (data.ok) {
        showToast(editingMainType.id ? "Main Service updated!" : "New Main Service created!");
        setIsMainTypeModalOpen(false);
        await loadData();
      } else {
        showToast(data.error || "Save failed", "error");
      }
    } catch {
      showToast("Failed to save Main Service", "error");
    } finally {
      setIsSavingMainType(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;
    if (!editingService.name.trim()) {
      showToast("Please enter a service name", "error");
      return;
    }

    try {
      setIsSaving(true);
      const formData = new FormData();
      if (editingService.id) {
        formData.append("id", String(editingService.id));
      }
      formData.append("name", editingService.name.trim());
      formData.append("description", editingService.description || "");
      formData.append("type_id", String(editingService.type_id || 0));
      formData.append("payment_amount", String(editingService.payment_amount || 0));
      formData.append("retailer_amount", String(editingService.retailer_amount || 0));
      formData.append("status", editingService.status);
      if (editingService.assigned_employee_id) {
        formData.append("assigned_employee_id", String(editingService.assigned_employee_id));
      }
      formData.append("sign_pos_x", String(editingService.sign_pos_x ?? 0.68));
      formData.append("sign_pos_y", String(editingService.sign_pos_y ?? 0.8));
      formData.append("sign_page", String(editingService.sign_page || 1));
      formData.append("sign_width", String(editingService.sign_width ?? 0.25));
      formData.append("sign_height", String(editingService.sign_height ?? 0.12));
      if (editingService.doc_width !== null && editingService.doc_width !== undefined) {
        formData.append("doc_width", String(editingService.doc_width));
      }
      if (editingService.doc_height !== null && editingService.doc_height !== undefined) {
        formData.append("doc_height", String(editingService.doc_height));
      }
      formData.append("online_districts", JSON.stringify(editingService.online_districts || []));

      if (selectedPdfFile) {
        formData.append("pdf_file", selectedPdfFile);
      } else if (editingService.pdf_path) {
        formData.append("pdf_path", editingService.pdf_path);
      }

      if (selectedImageFile) {
        formData.append("image_file", selectedImageFile);
      } else if (editingService.image_path) {
        formData.append("image_path", editingService.image_path);
      }

      const method = editingService.id ? "PUT" : "POST";
      const res = await fetch("/api/admin/services", {
        method,
        body: formData,
      });

      const result = await res.json();
      if (result.ok) {
        showToast(editingService.id ? "Sub-Service & Signature Studio updated!" : "New sub-service created successfully!");
        setIsModalOpen(false);
        await loadData();
      } else {
        showToast(result.error || "Save failed", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to save service", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleStatus = async (service: Service) => {
    const nextStatus = service.status === "active" ? "inactive" : "active";
    try {
      const res = await fetch("/api/admin/services", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: service.id, status: nextStatus }),
      });
      const data = await res.json();
      if (data.ok) {
        setServices((prev) =>
          prev.map((s) => (s.id === service.id ? { ...s, status: nextStatus } : s))
        );
        showToast(`Service marked as ${nextStatus}`);
      } else {
        showToast(data.error || "Status update failed", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to toggle status", "error");
    }
  };

  const deleteService = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to deactivate or remove "${name}"?`)) return;
    try {
      const res = await fetch(`/api/admin/services?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.ok) {
        setServices((prev) => prev.filter((s) => s.id !== id));
        showToast(`Service "${name}" removed from catalogue.`);
      } else {
        showToast(data.error || "Failed to remove service", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to delete service", "error");
    }
  };

  const filteredServices = services.filter((s) => {
    if (selectedType !== "ALL" && String(s.type_id) !== selectedType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q)) ||
        (s.type_name && s.type_name.toLowerCase().includes(q)) ||
        (s.assigned_employee_name && s.assigned_employee_name.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-20 right-6 z-50 rounded-xl px-5 py-3 shadow-2xl flex items-center gap-3 border text-xs font-semibold animate-in fade-in slide-in-from-top-4 duration-200 ${
            toastMessage.type === "success"
              ? "bg-slate-900 text-white border-slate-700"
              : "bg-red-900 text-white border-red-700"
          }`}
        >
          {toastMessage.type === "success" ? (
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#ea580c]">
              Statutory Services &amp; Digital Signatures
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#1e3a8a] border border-blue-200">
              Live Catalogue
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl flex items-center gap-2">
            <Layers className="text-[#1e3a8a] w-7 h-7" /> Services &amp; PDF Signature Studio
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Manage public welfare services, configure citizen pricing, assign officers, and position authorized district official signatures on PDF documents.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => openMainTypeModal()}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-emerald-700 shrink-0 transition-all hover:shadow-lg active:scale-95"
          >
            <Plus className="w-4 h-4" /> Add Main Service
          </button>
          <button
            type="button"
            onClick={() => openModal()}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#1e3a8a] px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-[#1e40af] shrink-0 transition-all hover:shadow-lg active:scale-95"
          >
            <Plus className="w-4 h-4" /> Add Sub-Service
          </button>
          <Link
            href="/admin/services/studio/new"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#ea580c] px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-[#c2410c] shrink-0 transition-all hover:shadow-lg active:scale-95"
          >
            <PenTool className="w-4 h-4" /> Open Signature Studio
          </Link>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs border-t-4 border-t-[#1e3a8a]">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Services</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {services.filter((s) => s.status === "active").length}{" "}
            <span className="text-xs font-normal text-slate-500">/ {services.length} Total</span>
          </p>
          <p className="mt-1 text-xs text-emerald-600 font-medium flex items-center gap-1">
            <CheckCircle2 size={13} /> Active across Tamil Nadu
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs border-t-4 border-t-blue-600">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Main Service Branches</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {types.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">Statutory categories configured</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs border-t-4 border-t-[#ea580c]">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Signature Placements</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {services.filter((s) => s.sign_pos_x !== null && s.sign_pos_y !== null).length}
          </p>
          <p className="mt-1 text-xs text-amber-600 font-medium">Calibrated for DSC &amp; Stamps</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs border-t-4 border-t-emerald-600">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">District Signatures</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {districts.filter((d) => d.signature_path).length}{" "}
            <span className="text-xs font-normal text-slate-500">/ 38 Districts</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">Authorized official stamps ready</p>
        </div>
      </div>

      {/* Services Catalogue Grouped by Main Service */}
      <div className="space-y-6">
        {/* Toolbar */}
        <div className="p-4 sm:p-5 rounded-xl border border-slate-200 bg-white shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search services, category, officer, or template..."
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-300 bg-white text-xs outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Category:
              </span>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="h-10 px-3 rounded-lg border border-slate-300 bg-white text-xs outline-none focus:border-[#1e3a8a]"
              >
                <option value="ALL">All Categories ({types.length})</option>
                {types.map((t) => (
                  <option key={t.id} value={String(t.id)}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={loadData}
              title="Refresh Catalogue"
              className="p-2.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <RefreshCw size={14} className={isLoading ? "animate-spin text-[#1e3a8a]" : ""} />
            </button>
          </div>
        </div>

        {/* Grouped by Main Service Sections */}
        {isLoading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-500 shadow-xs">
            <RefreshCw className="w-6 h-6 animate-spin text-[#1e3a8a] mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">Loading statutory services catalogue...</p>
          </div>
        ) : (
          (() => {
            const displayTypes = selectedType === "ALL" 
              ? types 
              : types.filter((t) => String(t.id) === selectedType);

            const orphanServices = filteredServices.filter(
              (s) => !types.some((t) => t.id === s.type_id)
            );

            if (displayTypes.length === 0 && orphanServices.length === 0) {
              return (
                <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-500 shadow-xs">
                  <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No services found</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Click &quot;Add Main Service&quot; or &quot;Add Sub-Service&quot; to begin.
                  </p>
                </div>
              );
            }

            return (
              <div className="space-y-8">
                {displayTypes.map((mainType) => {
                  const subServices = filteredServices.filter((s) => s.type_id === mainType.id);

                  return (
                    <section
                      key={mainType.id}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                    >
                      {/* Main Service Header (Logo Image, Name, Actions) */}
                      <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 via-blue-50/40 to-white border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5">
                          {mainType.image_path ? (
                            <img
                              src={mainType.image_path}
                              alt={mainType.name}
                              className="w-12 h-12 rounded-xl object-contain bg-white p-1.5 border border-slate-200 shadow-2xs shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-[#1e3a8a] text-white flex items-center justify-center font-bold text-sm shadow-2xs shrink-0">
                              <Layers size={22} />
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#ea580c] bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
                                Main Service Section
                              </span>
                              <span className="text-[11px] font-bold text-slate-500">
                                {subServices.length} sub-service{subServices.length === 1 ? "" : "s"}
                              </span>
                            </div>
                            <h2 className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
                              {mainType.name}
                            </h2>
                            {mainType.description && (
                              <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                                {mainType.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Actions for this Main Service */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => openMainTypeModal(mainType)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-all shadow-2xs"
                            title="Edit Main Service"
                          >
                            <Edit2 size={13} /> Edit Main Service
                          </button>
                          <button
                            type="button"
                            onClick={() => openModal(null, mainType.id)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-bold transition-all shadow-xs active:scale-95"
                          >
                            <Plus size={14} /> Add Sub-Service under {mainType.name}
                          </button>
                        </div>
                      </div>

                      {/* Sub-Services Table below Main Service */}
                      <div className="overflow-x-auto w-full scrollbar-thin">
                        <table className="w-full min-w-[1050px] text-left text-xs">
                          <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                            <tr>
                              <th className="px-5 py-3.5 min-w-[280px]">Sub-Service (Logo, Name, Short Description)</th>
                              <th className="px-5 py-3.5 whitespace-nowrap">Citizen Fee</th>
                              <th className="px-5 py-3.5 whitespace-nowrap">Retailer Fee</th>
                              <th className="px-5 py-3.5 whitespace-nowrap">Assigned Officer</th>
                              <th className="px-5 py-3.5 whitespace-nowrap">PDF &amp; Signature Studio</th>
                              <th className="px-5 py-3.5 text-center whitespace-nowrap">Status</th>
                              <th className="px-5 py-3.5 text-right whitespace-nowrap">Coverage</th>
                              <th className="px-5 py-3.5 text-right whitespace-nowrap min-w-[200px]">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {subServices.length === 0 ? (
                              <tr>
                                <td colSpan={8} className="px-5 py-8 text-center text-slate-500">
                                  <Layers className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
                                  <p className="text-xs font-semibold text-slate-700">
                                    No sub-services added under {mainType.name} yet
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => openModal(null, mainType.id)}
                                    className="mt-2 text-xs font-bold text-[#1e3a8a] hover:underline inline-flex items-center gap-1"
                                  >
                                    <Plus size={12} /> Add the first sub-service now
                                  </button>
                                </td>
                              </tr>
                            ) : (
                              subServices.map((svc) => (
                                <tr key={svc.id} className="hover:bg-slate-50/80 transition-colors">
                                  {/* Sub-Service Logo, Name & Short Description */}
                                  <td className="px-5 py-4 min-w-[280px] max-w-sm">
                                    <div className="flex items-start gap-3">
                                      {svc.image_path ? (
                                        <img
                                          src={svc.image_path}
                                          alt=""
                                          className="w-10 h-10 rounded-lg object-contain bg-white border border-slate-200 p-1 shrink-0 mt-0.5"
                                        />
                                      ) : (
                                        <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-[#1e3a8a] shrink-0 font-bold text-xs mt-0.5">
                                          <FileText size={18} />
                                        </div>
                                      )}
                                      <div>
                                        <strong className="block text-slate-900 font-bold text-xs">
                                          {svc.name}
                                        </strong>
                                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                                          {svc.description || "Official welfare service under this branch."}
                                        </p>
                                      </div>
                                    </div>
                                  </td>

                                  {/* Customer Price */}
                                  <td className="px-5 py-4 text-emerald-700 font-bold whitespace-nowrap">
                                    {svc.payment_amount === 0 ? "Free (₹0)" : `₹${Number(svc.payment_amount).toFixed(2)}`}
                                  </td>

                                  {/* Retailer Price */}
                                  <td className="px-5 py-4 text-blue-700 font-semibold whitespace-nowrap">
                                    ₹{Number(svc.retailer_amount).toFixed(2)}
                                  </td>

                                  {/* Assigned Officer */}
                                  <td className="px-5 py-4 text-slate-700 whitespace-nowrap">
                                    {svc.assigned_employee_name ? (
                                      <span className="shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                        <UserCheck size={12} /> {svc.assigned_employee_name}
                                      </span>
                                    ) : (
                                      <span className="text-xs text-slate-400 italic">— None Assigned —</span>
                                    )}
                                  </td>

                                  {/* PDF & Signature Placement */}
                                  <td className="px-5 py-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                                    <div className="flex items-center gap-1.5 flex-nowrap">
                                      {svc.pdf_path ? (
                                        <span className="shrink-0 whitespace-nowrap inline-flex items-center gap-1 text-emerald-600 font-semibold text-[11px]">
                                          <FileCheck size={14} /> PDF Attached
                                        </span>
                                      ) : (
                                        <span className="text-slate-400 text-[10px] whitespace-nowrap">No PDF template</span>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-slate-500 block mt-0.5 whitespace-nowrap">
                                      {svc.sign_pos_x !== null
                                        ? `Pg ${svc.sign_page || 1} @ X: ${(Number(svc.sign_pos_x) * 100).toFixed(0)}% Y: ${(Number(svc.sign_pos_y) * 100).toFixed(0)}%`
                                        : "No coordinates"}
                                    </span>
                                  </td>

                                  {/* Status */}
                                  <td className="px-5 py-4 text-center whitespace-nowrap">
                                    <label className="relative inline-flex items-center cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={svc.status === "active"}
                                        onChange={() => toggleStatus(svc)}
                                        className="sr-only peer"
                                      />
                                      <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-emerald-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                                      <span
                                        className={`ml-2 text-[10px] font-bold ${
                                          svc.status === "active" ? "text-emerald-700" : "text-slate-400"
                                        }`}
                                      >
                                        {svc.status === "active" ? "Active" : "Inactive"}
                                      </span>
                                    </label>
                                  </td>

                                  {/* District Coverage */}
                                  <td className="px-5 py-4 text-right whitespace-nowrap">
                                    <span className="text-slate-900 font-bold">
                                      {svc.online_districts ? svc.online_districts.length : 38}
                                    </span>
                                    <span className="text-slate-400 text-[10px]"> / 38 Districts</span>
                                  </td>

                                  {/* Actions */}
                                  <td className="px-5 py-4 text-right whitespace-nowrap min-w-[200px]">
                                    <div className="flex items-center justify-end gap-2 flex-nowrap">
                                      <Link
                                        href={`/admin/services/studio/${svc.id}`}
                                        className="shrink-0 px-3 py-1.5 rounded-lg bg-[#1e3a8a] text-white hover:bg-[#1e40af] transition-all font-bold text-xs flex items-center gap-1.5 shadow-xs whitespace-nowrap"
                                        title="Open Standalone Studio"
                                      >
                                        <PenTool size={13} /> Studio
                                      </Link>
                                      <button
                                        type="button"
                                        onClick={() => openModal(svc, mainType.id)}
                                        className="shrink-0 px-2.5 py-1.5 rounded-lg bg-blue-50 text-[#1e3a8a] hover:bg-blue-100 border border-blue-200 transition-all font-bold text-xs flex items-center gap-1 shadow-xs whitespace-nowrap"
                                        title="Quick Edit Modal"
                                      >
                                        <Edit2 size={13} /> Edit
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => deleteService(svc.id!, svc.name)}
                                        className="shrink-0 p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-all"
                                        title="Delete service"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  );
                })}

                {/* Orphan / General Sub-Services */}
                {orphanServices.length > 0 && (
                  <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="p-4 sm:p-5 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                      <div>
                        <h2 className="text-base font-black text-slate-900">
                          Other Statutory Services (Uncategorized)
                        </h2>
                        <p className="text-xs text-slate-500">
                          {orphanServices.length} sub-service{orphanServices.length === 1 ? "" : "s"} not classified under specific branch
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => openModal(null, 0)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1e3a8a] text-white text-xs font-bold"
                      >
                        <Plus size={14} /> Add Sub-Service
                      </button>
                    </div>

                    <div className="overflow-x-auto w-full scrollbar-thin">
                      <table className="w-full min-w-[850px] text-left text-xs">
                        <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="px-5 py-3.5 min-w-[280px]">Sub-Service (Logo, Name, Short Description)</th>
                            <th className="px-5 py-3.5 whitespace-nowrap">Citizen Fee</th>
                            <th className="px-5 py-3.5 whitespace-nowrap">Retailer Fee</th>
                            <th className="px-5 py-3.5 whitespace-nowrap">Assigned Officer</th>
                            <th className="px-5 py-3.5 text-center whitespace-nowrap">Status</th>
                            <th className="px-5 py-3.5 text-right whitespace-nowrap min-w-[100px]">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {orphanServices.map((svc) => (
                            <tr key={svc.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="px-5 py-4 min-w-[280px] max-w-sm">
                                <div className="flex items-start gap-3">
                                  {svc.image_path ? (
                                    <img
                                      src={svc.image_path}
                                      alt=""
                                      className="w-10 h-10 rounded-lg object-contain bg-white border border-slate-200 p-1 shrink-0 mt-0.5"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-[#1e3a8a] shrink-0 font-bold text-xs mt-0.5">
                                      <FileText size={18} />
                                    </div>
                                  )}
                                  <div>
                                    <strong className="block text-slate-900 font-bold text-xs">
                                      {svc.name}
                                    </strong>
                                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                                      {svc.description}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-4 text-emerald-700 font-bold whitespace-nowrap">
                                {svc.payment_amount === 0 ? "Free" : `₹${Number(svc.payment_amount).toFixed(2)}`}
                              </td>
                              <td className="px-5 py-4 text-blue-700 font-semibold whitespace-nowrap">
                                ₹{Number(svc.retailer_amount).toFixed(2)}
                              </td>
                              <td className="px-5 py-4 text-slate-700 whitespace-nowrap">
                                {svc.assigned_employee_name || "— None —"}
                              </td>
                              <td className="px-5 py-4 text-center whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => toggleStatus(svc)}
                                  className={`shrink-0 whitespace-nowrap inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                                    svc.status === "active"
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : "bg-slate-100 text-slate-600 border-slate-200"
                                  }`}
                                >
                                  {svc.status === "active" ? "Active" : "Inactive"}
                                </button>
                              </td>
                              <td className="px-5 py-4 text-right whitespace-nowrap min-w-[100px]">
                                <button
                                  type="button"
                                  onClick={() => openModal(svc, 0)}
                                  className="shrink-0 whitespace-nowrap px-2.5 py-1.5 rounded-lg bg-blue-50 text-[#1e3a8a] font-bold text-xs"
                                >
                                  Edit
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}
              </div>
            );
          })()
        )}
      </div>

      {/* Integrated Service Modal for Sub-Services */}
      {isModalOpen && editingService && (
        <ServiceModal
          service={editingService}
          setService={setEditingService}
          types={types}
          districts={districts}
          employees={employees}
          selectedPdfFile={selectedPdfFile}
          setSelectedPdfFile={setSelectedPdfFile}
          selectedImageFile={selectedImageFile}
          setSelectedImageFile={setSelectedImageFile}
          isSaving={isSaving}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
        />
      )}

      {/* Main Service Modal */}
      {isMainTypeModalOpen && editingMainType && (
        <MainServiceModal
          mainType={editingMainType}
          setMainType={setEditingMainType}
          imageFile={mainTypeImageFile}
          setImageFile={setMainTypeImageFile}
          isSaving={isSavingMainType}
          onClose={() => setIsMainTypeModalOpen(false)}
          onSave={handleSaveMainType}
        />
      )}
    </div>
  );
}

// ============================================================================
// Service Modal with 2 Tabs: Details & PDF Signature Studio
// ============================================================================
interface ServiceModalProps {
  service: Service;
  setService: React.Dispatch<React.SetStateAction<Service | null>>;
  types: ServiceType[];
  districts: District[];
  employees: Employee[];
  selectedPdfFile: File | null;
  setSelectedPdfFile: (f: File | null) => void;
  selectedImageFile: File | null;
  setSelectedImageFile: (f: File | null) => void;
  isSaving: boolean;
  onClose: () => void;
  onSave: (e: React.FormEvent) => void;
}

function ServiceModal({
  service,
  setService,
  types,
  districts,
  employees,
  selectedPdfFile,
  setSelectedPdfFile,
  selectedImageFile,
  setSelectedImageFile,
  isSaving,
  onClose,
  onSave,
}: ServiceModalProps) {
  const [activeTab, setActiveTab] = useState<"details" | "studio">("details");
  const [districtSearch, setDistrictSearch] = useState("");

  const filteredDistricts = districts.filter((d) =>
    d.name.toLowerCase().includes(districtSearch.toLowerCase())
  );

  const toggleAllDistricts = (selectAll: boolean) => {
    if (selectAll) {
      setService((prev) =>
        prev
          ? {
              ...prev,
              online_districts: districts.filter((d) => Boolean(d.signature_path)).map((d) => d.id),
            }
          : prev
      );
    } else {
      setService((prev) => (prev ? { ...prev, online_districts: [] } : prev));
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-6xl shadow-2xl border border-slate-200 flex flex-col max-h-[94vh] animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-[#1e3a8a] text-white">
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-blue-200" />
            <div>
              <h3 className="text-base font-bold">
                {service.id ? `Edit Service: ${service.name}` : "Add New Statutory Service"}
              </h3>
              <p className="text-xs text-blue-200">
                Configure service details and district signature placement on PDF certificate
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={service.id ? `/admin/services/studio/${service.id}` : "/admin/services/studio/new"}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-bold transition-all shadow-xs"
              title="Open Separate Fullscreen Studio without sidebar"
            >
              <Maximize2 size={13} /> Open Standalone Studio
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 px-6 bg-slate-50/70">
          <button
            type="button"
            onClick={() => setActiveTab("details")}
            className={`py-3 px-5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === "details"
                ? "border-[#1e3a8a] text-[#1e3a8a] bg-white"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <FileText size={15} /> 1. Service Details &amp; District Availability
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("studio")}
            className={`py-3 px-5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === "studio"
                ? "border-[#ea580c] text-[#ea580c] bg-white"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <PenTool size={15} /> 2. PDF Signature Studio
            {service.pdf_path || selectedPdfFile ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            ) : null}
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={onSave} className="flex-1 overflow-y-auto flex flex-col">
          <div className="flex-1 p-6">
            {activeTab === "details" ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Core Fields */}
                <div className="lg:col-span-7 space-y-4">
                  {/* Sub-Service Logo Image */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                      Sub-Service Logo Image
                    </label>
                    <div className="flex items-center gap-3.5">
                      {selectedImageFile ? (
                        <img
                          src={URL.createObjectURL(selectedImageFile)}
                          alt="Preview"
                          className="w-12 h-12 rounded-xl object-contain bg-white border border-slate-300 p-1 shrink-0"
                        />
                      ) : service.image_path ? (
                        <img
                          src={service.image_path}
                          alt="Sub-service logo"
                          className="w-12 h-12 rounded-xl object-contain bg-white border border-slate-300 p-1 shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-[11px] shrink-0">
                          No Logo
                        </div>
                      )}
                      <div className="flex-1 space-y-1.5">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) setSelectedImageFile(f);
                          }}
                          className="block w-full text-xs text-slate-600 file:mr-2.5 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[11px] file:font-bold file:bg-blue-50 file:text-[#1e3a8a] hover:file:bg-blue-100"
                        />
                        <input
                          type="text"
                          placeholder="Or existing path: /assets/uploads/services/..."
                          value={service.image_path || ""}
                          onChange={(e) => setService({ ...service, image_path: e.target.value })}
                          className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1 text-[11px] text-slate-600"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Service Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={service.name}
                      onChange={(e) => setService({ ...service, name: e.target.value })}
                      placeholder="e.g. Tamil Nadu Construction Worker Identity Card"
                      className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-xs font-medium focus:outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Description &amp; Welfare Board Scheme
                    </label>
                    <textarea
                      value={service.description || ""}
                      onChange={(e) => setService({ ...service, description: e.target.value })}
                      rows={3}
                      placeholder="Brief description of eligibility and statutory scheme benefits..."
                      className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-xs font-medium focus:outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Service Category
                      </label>
                      <select
                        value={service.type_id || 0}
                        onChange={(e) =>
                          setService({ ...service, type_id: parseInt(e.target.value) || 0 })
                        }
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-xs font-medium focus:outline-none focus:border-[#1e3a8a]"
                      >
                        <option value={0}>General Category</option>
                        {types.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Service Status
                      </label>
                      <select
                        value={service.status}
                        onChange={(e) =>
                          setService({ ...service, status: e.target.value as "active" | "inactive" })
                        }
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-xs font-medium focus:outline-none focus:border-[#1e3a8a]"
                      >
                        <option value="active">Active (Online)</option>
                        <option value="inactive">Inactive (Disabled)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Citizen Application Price (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={service.payment_amount ?? ""}
                        onChange={(e) =>
                          setService({ ...service, payment_amount: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-xs font-medium focus:outline-none focus:border-[#1e3a8a]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Retailer Agent Price (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={service.retailer_amount ?? ""}
                        onChange={(e) =>
                          setService({ ...service, retailer_amount: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-xs font-medium focus:outline-none focus:border-[#1e3a8a]"
                      />
                    </div>
                  </div>

                  {/* Assign Employee */}
                  <div className="p-4 bg-blue-50/70 rounded-xl border border-blue-200">
                    <label className="block text-xs font-bold text-[#1e3a8a] uppercase mb-1.5 flex items-center gap-1.5">
                      <UserCheck size={14} /> Assigned Department Officer / Verifier
                    </label>
                    <select
                      value={service.assigned_employee_id || ""}
                      onChange={(e) =>
                        setService({
                          ...service,
                          assigned_employee_id: e.target.value ? parseInt(e.target.value) : null,
                        })
                      }
                      className="w-full bg-white border border-blue-300 rounded-lg px-3 py-2.5 text-xs font-medium focus:outline-none focus:border-[#1e3a8a]"
                    >
                      <option value="">— No Specific Officer (Pooled Queue) —</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-blue-900/70 mt-1.5">
                      Assigned officer scrutinizes verification documents before certificate generation.
                    </p>
                  </div>
                </div>

                {/* Right Column: District Availability */}
                <div className="lg:col-span-5 bg-slate-900 rounded-xl p-5 border border-slate-800 flex flex-col text-white">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                        <MapPin size={14} /> District Availability ({service.online_districts.length}/38 online)
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        {districts.filter((d) => Boolean(d.signature_path)).length} / {districts.length || 38} Districts (Signatures Present) — unsigned districts are safely turned off.
                      </p>
                    </div>
                  </div>

                  {/* Search and Bulk Toggles */}
                  <div className="space-y-2 mb-3">
                    <input
                      type="text"
                      placeholder="Filter district..."
                      value={districtSearch}
                      onChange={(e) => setDistrictSearch(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-400 outline-none focus:border-amber-400"
                    />
                    <div className="flex items-center justify-end gap-2 text-[10px]">
                      <button
                        type="button"
                        onClick={() => toggleAllDistricts(true)}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                      >
                        Enable Signed Districts
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleAllDistricts(false)}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                      >
                        Disable All
                      </button>
                    </div>
                  </div>

                  {/* District List with Switch */}
                  <div className="overflow-y-auto max-h-[380px] pr-2 space-y-1.5 divide-y divide-slate-800">
                    {filteredDistricts.map((dist) => {
                      const hasSignature = Boolean(dist.signature_path);
                      const isOnline = hasSignature && service.online_districts.includes(dist.id);
                      return (
                        <div
                          key={dist.id}
                          className={`flex items-center justify-between py-2 pt-2 text-xs px-2 rounded transition-colors ${
                            !hasSignature ? "bg-slate-800/20 opacity-60" : "hover:bg-slate-800/40"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-slate-200 font-medium">{dist.name}</span>
                            {hasSignature ? (
                              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded-full border border-emerald-500/30">
                                Stamp Ready
                              </span>
                            ) : (
                              <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded-full font-bold">
                                No Signature (Turned Off)
                              </span>
                            )}
                          </div>
                          <label
                            className={`relative inline-flex items-center ${
                              hasSignature ? "cursor-pointer" : "cursor-not-allowed"
                            }`}
                            title={!hasSignature ? "Disabled: District lacks official signature stamp" : "Toggle district availability"}
                          >
                            <input
                              type="checkbox"
                              checked={isOnline}
                              disabled={!hasSignature}
                              onChange={() => {
                                if (!hasSignature) return;
                                const newIds = isOnline
                                  ? service.online_districts.filter((id) => id !== dist.id)
                                  : [...service.online_districts, dist.id];
                                setService({ ...service, online_districts: newIds });
                              }}
                              className="sr-only peer"
                            />
                            <div className="w-8 h-4 bg-slate-700 rounded-full peer peer-checked:bg-emerald-500 peer-disabled:opacity-40 transition-all after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-4"></div>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              /* PDF Signature Studio Tab */
              <PdfSignatureStudio
                service={service}
                setService={setService}
                districts={districts}
                selectedPdfFile={selectedPdfFile}
                setSelectedPdfFile={setSelectedPdfFile}
              />
            )}
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200">
            {activeTab === "studio" ? (
              <button
                type="button"
                onClick={() => setActiveTab("details")}
                className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1.5"
              >
                <ChevronLeft size={16} /> Back to Details
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveTab("studio")}
                className="px-4 py-2 rounded-lg bg-slate-900 text-xs font-bold text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5"
              >
                Proceed to PDF Studio <ChevronRight size={16} />
              </button>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2 rounded-lg bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-bold shadow-md shadow-blue-900/20 flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" /> Saving Service...
                  </>
                ) : (
                  <>
                    <Save size={14} /> Save Service &amp; Studio
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// PDF Signature Studio Sub-Component
// ============================================================================
interface PdfSignatureStudioProps {
  service: Service;
  setService: React.Dispatch<React.SetStateAction<Service | null>>;
  districts: District[];
  selectedPdfFile: File | null;
  setSelectedPdfFile: (f: File | null) => void;
}

function PdfSignatureStudio({
  service,
  setService,
  districts,
  selectedPdfFile,
  setSelectedPdfFile,
}: PdfSignatureStudioProps) {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageNum, setPageNum] = useState(service.sign_page || 1);
  const [pageTotal, setPageTotal] = useState(1);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [pdfJsReady, setPdfJsReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [isStamping, setIsStamping] = useState(false);

  // Zoom handlers
  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(2.5, Math.round((prev + 0.15) * 100) / 100));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(0.5, Math.round((prev - 0.15) * 100) / 100));
  };

  const handleZoomReset = () => {
    setZoomLevel(1.0);
  };

  // Marker State in normalized percentages (0.0 to 1.0)
  const [markerX, setMarkerX] = useState<number>(service.sign_pos_x ?? 0.68);
  const [markerY, setMarkerY] = useState<number>(service.sign_pos_y ?? 0.8);
  const [markerW, setMarkerW] = useState<number>(service.sign_width ?? 0.25); // 25% page width

  // Selected district stamp for live preview
  const defaultDistrict = districts.find((d) => d.signature_path) || districts[0];
  const [selectedSigDistrictId, setSelectedSigDistrictId] = useState<string>(
    defaultDistrict ? String(defaultDistrict.id) : ""
  );

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const renderTaskRef = useRef<any>(null);
  const renderIdRef = useRef<number>(0);

  // Pinch/Wheel zoom with Ctrl or Meta key
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (e.deltaY < 0) {
          setZoomLevel((prev) => Math.min(2.5, Math.round((prev + 0.1) * 100) / 100));
        } else {
          setZoomLevel((prev) => Math.max(0.5, Math.round((prev - 0.1) * 100) / 100));
        }
      }
    };

    container.addEventListener("wheel", onWheel, { passive: false });
    return () => container.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    return () => {
      renderIdRef.current++;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // Ignore
        }
      }
    };
  }, []);

  // Get current signature preview image
  const activeDistrict =
    districts.find((d) => String(d.id) === selectedSigDistrictId) ||
    districts.find((d) => Boolean(d.signature_path)) ||
    districts[0];
  const previewSignatureUrl = activeDistrict?.signature_path || null;
  const signedDistrictsCount = districts.filter((d) => Boolean(d.signature_path)).length;

  // Load PDF.js from CDN dynamically
  useEffect(() => {
    if ((window as any).pdfjsLib) {
      setPdfJsReady(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.async = true;
    script.onload = () => {
      if ((window as any).pdfjsLib) {
        (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        setPdfJsReady(true);
      }
    };
    script.onerror = () => {
      setLoadError("Unable to load PDF.js renderer.");
    };
    document.body.appendChild(script);
  }, []);

  // Render a specific page of PDF on canvas (with cancel-safe task tracking and zoom scaling)
  const renderPage = useCallback(
    async (num: number, doc: any, zoom = zoomLevel) => {
      if (!doc || !canvasRef.current) return;
      const currentRenderId = ++renderIdRef.current;

      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
          await renderTaskRef.current.promise.catch(() => {});
        } catch {
          // Ignore
        }
        renderTaskRef.current = null;
      }

      if (currentRenderId !== renderIdRef.current) return;

      try {
        setIsLoadingPdf(true);
        const page = await doc.getPage(num);
        if (currentRenderId !== renderIdRef.current) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext("2d");
        if (!context) return;

        const containerWidth = containerRef.current?.clientWidth || 700;
        const unscaledViewport = page.getViewport({ scale: 1 });
        const baseScale = Math.max(0.6, (containerWidth - 40) / unscaledViewport.width);
        const finalScale = baseScale * (zoom || 1.0);
        const viewport = page.getViewport({ scale: finalScale });

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const task = page.render({ canvasContext: context, viewport });
        renderTaskRef.current = task;

        await task.promise;
      } catch (err: any) {
        if (err?.name === "RenderingCancelledException") {
          return;
        }
        console.error("renderPage error:", err);
      } finally {
        if (currentRenderId === renderIdRef.current) {
          renderTaskRef.current = null;
          setIsLoadingPdf(false);
        }
      }
    },
    [zoomLevel]
  );

  // Load PDF document from file or URL
  const loadPdfSource = useCallback(
    async (source: File | string) => {
      if (!(window as any).pdfjsLib) return;
      try {
        setIsLoadingPdf(true);
        setLoadError(null);
        let doc: any = null;

        if (source instanceof File) {
          const buffer = await source.arrayBuffer();
          const typedArray = new Uint8Array(buffer);
          const loadingTask = (window as any).pdfjsLib.getDocument({ data: typedArray });
          doc = await loadingTask.promise;
        } else if (typeof source === "string" && source.trim()) {
          const loadingTask = (window as any).pdfjsLib.getDocument(source);
          doc = await loadingTask.promise;
        }

        if (doc) {
          setPdfDoc(doc);
          setPageTotal(doc.numPages);
          setPageNum((prev: number) => Math.min(prev || 1, doc.numPages));

          try {
            const firstPage = await doc.getPage(1);
            const unscaled = firstPage.getViewport({ scale: 1 });
            const w = Math.round(unscaled.width);
            const h = Math.round(unscaled.height);
            setService((prev) => (prev ? { ...prev, doc_width: w, doc_height: h } : prev));
          } catch (e) {
            console.warn("Could not extract unscaled PDF dimensions:", e);
          }
        }
      } catch (err: any) {
        console.error("loadPdfSource error:", err);
        setLoadError(err.message || "Could not parse PDF template.");
      } finally {
        setIsLoadingPdf(false);
      }
    },
    []
  );

  // Automatically load existing PDF if available when PDF.js is ready
  useEffect(() => {
    if (!pdfJsReady) return;
    const source = selectedPdfFile || service.pdf_path;
    if (!source) {
      setPdfDoc(null);
      return;
    }
    loadPdfSource(source);
  }, [pdfJsReady, selectedPdfFile, service.pdf_path, loadPdfSource]);

  // Dedicated Render Effect: triggers safely whenever pdfDoc, pageNum, or zoomLevel changes
  useEffect(() => {
    if (pdfDoc && pageNum >= 1 && pageNum <= pageTotal) {
      renderPage(pageNum, pdfDoc, zoomLevel);
    }
  }, [pdfDoc, pageNum, pageTotal, zoomLevel, renderPage]);

  // Handle local PDF upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      alert("Please upload a PDF document (.pdf)");
      return;
    }
    setSelectedPdfFile(file);
    loadPdfSource(file);
  };

  // Handle downloading the PDF with signature stamped at the configured coordinates
  const handleDownloadStampedPdf = async () => {
    const source = selectedPdfFile || service.pdf_path;
    if (!source) return;

    try {
      setIsStamping(true);
      await stampAndDownloadPdf({
        pdfSource: source,
        signatureImageUrl: previewSignatureUrl,
        pageNum: pageNum,
        posX: markerX,
        posY: markerY,
        widthPercent: markerW,
        districtName: activeDistrict?.name,
        serviceName: service?.name,
      });
    } catch (err: any) {
      console.error("PDF stamping error:", err);
      if (service.pdf_path) {
        window.open(service.pdf_path, "_blank");
      }
    } finally {
      setIsStamping(false);
    }
  };

  const changePage = (delta: number) => {
    const next = pageNum + delta;
    if (next >= 1 && next <= pageTotal) {
      setPageNum(next);
      setService((prev) => (prev ? { ...prev, sign_page: next } : prev));
    }
  };

  // --- Drag & Drop Math ---
  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    e.preventDefault();
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const currentCenterX = rect.left + markerX * rect.width;
      const currentCenterY = rect.top + markerY * rect.height;
      dragOffsetRef.current = {
        x: (e.clientX - currentCenterX) / rect.width,
        y: (e.clientY - currentCenterY) / rect.height,
      };
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    isDragging.current = true;
    if (canvasRef.current && e.touches[0]) {
      const rect = canvasRef.current.getBoundingClientRect();
      const currentCenterX = rect.left + markerX * rect.width;
      const currentCenterY = rect.top + markerY * rect.height;
      dragOffsetRef.current = {
        x: (e.touches[0].clientX - currentCenterX) / rect.width,
        y: (e.touches[0].clientY - currentCenterY) / rect.height,
      };
    }
  };

  useEffect(() => {
    const updatePosition = (clientX: number, clientY: number) => {
      if (!isDragging.current || !markerRef.current || !canvasRef.current) return;
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();

      let x = (clientX - rect.left) / rect.width - dragOffsetRef.current.x;
      let y = (clientY - rect.top) / rect.height - dragOffsetRef.current.y;

      // Clamp within canvas boundaries
      const halfW = markerW / 2;
      const clampedX = Math.max(halfW, Math.min(1 - halfW, x));
      const clampedY = Math.max(0.06, Math.min(0.94, y));

      setMarkerX(clampedX);
      setMarkerY(clampedY);

      setService((prev) =>
        prev
          ? {
              ...prev,
              sign_pos_x: clampedX,
              sign_pos_y: clampedY,
              sign_width: markerW,
              sign_page: pageNum,
            }
          : prev
      );
    };

    const handleMouseMove = (e: MouseEvent) => {
      updatePosition(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) {
        updatePosition(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleEnd = () => {
      isDragging.current = false;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleEnd);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleEnd);
    };
  }, [markerW, pageNum, setService]);

  // Apply Quick Presets
  const applyPreset = (preset: "bottom-right" | "bottom-center" | "bottom-left") => {
    let px = 0.72;
    let py = 0.82;
    if (preset === "bottom-center") {
      px = 0.5;
      py = 0.82;
    } else if (preset === "bottom-left") {
      px = 0.28;
      py = 0.82;
    }
    setMarkerX(px);
    setMarkerY(py);
    setService((prev) =>
      prev
        ? {
            ...prev,
            sign_pos_x: px,
            sign_pos_y: py,
            sign_width: markerW,
            sign_page: pageNum,
          }
        : prev
    );
  };

  const handleWidthChange = (newWidthFrac: number) => {
    setMarkerW(newWidthFrac);
    setService((prev) => (prev ? { ...prev, sign_width: newWidthFrac } : prev));
  };

  return (
    <div className="space-y-4">
      {/* Studio Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 text-white">
        <div>
          <h4 className="text-sm font-bold flex items-center gap-2 text-amber-400">
            <PenTool size={16} /> District Signature Studio Canvas
          </h4>
          <p className="text-xs text-slate-300 mt-0.5">
            Upload the certificate PDF template, then drag the signature box to the exact location where the official district seal/signature must land.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(selectedPdfFile || service.pdf_path) && (
            <button
              type="button"
              disabled={isStamping}
              onClick={handleDownloadStampedPdf}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg transition-colors border border-emerald-600 text-xs font-bold shadow-sm disabled:opacity-50"
              title="Download PDF stamped with official signature at placed position"
            >
              {isStamping ? (
                <>
                  <RefreshCw size={14} className="animate-spin text-white" /> Stamping...
                </>
              ) : (
                <>
                  <Download size={14} className="text-emerald-200" /> Download with Signature
                </>
              )}
            </button>
          )}

          <label className="flex items-center gap-2 px-4 py-2 bg-[#ea580c] hover:bg-[#c2410c] text-white rounded-lg cursor-pointer transition-colors shadow-md text-xs font-bold shrink-0">
            <Upload size={14} /> Upload / Replace PDF
            <input type="file" accept="application/pdf" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive Canvas Area */}
        <div className="lg:col-span-8 bg-slate-100 p-4 rounded-xl border border-slate-200 shadow-inner flex flex-col items-center">
          {/* Page Navigator Toolbar */}
          <div className="w-full flex items-center justify-between mb-3 px-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => changePage(-1)}
                disabled={pageNum <= 1 || !pdfDoc}
                className="p-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors shadow-xs"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs font-bold bg-white px-3 py-1 rounded-lg border border-slate-300 text-slate-800 shadow-xs">
                Page {pageNum} of {pageTotal}
              </span>
              <button
                type="button"
                onClick={() => changePage(1)}
                disabled={pageNum >= pageTotal || !pdfDoc}
                className="p-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors shadow-xs"
              >
                <ChevronRight size={16} />
              </button>

              {/* Zoom Toolbar Controls */}
              <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-300 shadow-xs ml-1">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  disabled={zoomLevel <= 0.5 || !pdfDoc}
                  className="p-1 rounded text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 transition-colors"
                  title="Zoom Out (-)"
                >
                  <ZoomOut size={14} />
                </button>
                <button
                  type="button"
                  onClick={handleZoomReset}
                  className="text-[11px] font-mono font-bold text-slate-700 hover:text-[#1e3a8a] px-1.5 min-w-[42px] text-center"
                  title="Click to reset zoom to 100%"
                >
                  {Math.round(zoomLevel * 100)}%
                </button>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  disabled={zoomLevel >= 2.5 || !pdfDoc}
                  className="p-1 rounded text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 transition-colors"
                  title="Zoom In (+)"
                >
                  <ZoomIn size={14} />
                </button>
              </div>

              {/* Document Dimensions (W×H pt) for Statutory Acceptance */}
              {service.doc_width && service.doc_height ? (
                <div
                  className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-blue-50/90 border border-blue-200 text-[#1e3a8a] rounded-lg text-xs font-mono font-bold shadow-xs select-none ml-1"
                  title="Official Document Page Dimensions (Required for Statutory Acceptance)"
                >
                  <FileText size={13} className="text-[#1e3a8a]" />
                  <span>W×H: {service.doc_width} × {service.doc_height} pt</span>
                  <span className="text-blue-300 font-sans">|</span>
                  <span className="text-slate-600 font-sans font-medium text-[11px]">
                    Stamp: <strong className="font-mono text-slate-800">{Math.round(service.doc_width * markerW)} × {Math.round(service.doc_width * markerW * (1.2 / 3))} pt</strong>
                  </span>
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-500">Quick Placements:</span>
              <button
                type="button"
                onClick={() => applyPreset("bottom-right")}
                className="px-2 py-1 rounded bg-white hover:bg-slate-50 text-[10px] font-bold text-slate-700 border border-slate-200"
              >
                Bottom Right
              </button>
              <button
                type="button"
                onClick={() => applyPreset("bottom-center")}
                className="px-2 py-1 rounded bg-white hover:bg-slate-50 text-[10px] font-bold text-slate-700 border border-slate-200"
              >
                Center
              </button>
              <button
                type="button"
                onClick={() => applyPreset("bottom-left")}
                className="px-2 py-1 rounded bg-white hover:bg-slate-50 text-[10px] font-bold text-slate-700 border border-slate-200"
              >
                Bottom Left
              </button>
            </div>
          </div>

          {/* Interactive Document Viewport */}
          <div className="relative w-full">
            <div
              ref={containerRef}
              className="w-full min-h-[480px] max-h-[640px] bg-slate-200/80 rounded-xl border border-slate-300 p-4 overflow-auto shadow-inner custom-scrollbar"
            >
              {isLoadingPdf ? (
                <div className="flex flex-col items-center justify-center p-12 text-slate-500">
                  <RefreshCw size={28} className="animate-spin text-[#1e3a8a] mb-2" />
                  <p className="text-xs font-bold text-slate-700">Rendering PDF Page...</p>
                </div>
              ) : loadError ? (
                <div className="flex flex-col items-center justify-center p-8 text-center text-red-600">
                  <AlertCircle size={32} className="mb-2" />
                  <p className="text-xs font-bold">{loadError}</p>
                  <p className="text-[11px] text-slate-500 mt-1">Please upload a valid PDF document.</p>
                </div>
              ) : !pdfDoc && !service.pdf_path && !selectedPdfFile ? (
                /* Empty Placeholder */
                <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400">
                  <FileText size={48} className="mb-3 opacity-40 text-slate-600" />
                  <h5 className="text-sm font-bold text-slate-700">No PDF Template Loaded</h5>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm">
                    Click &quot;Upload / Replace PDF&quot; above to load your department certificate layout.
                  </p>
                </div>
              ) : null}

              {/* Centered Document Canvas Frame */}
              <div className="min-w-full min-h-full flex items-center justify-center m-auto w-fit">
                <div className="relative inline-block bg-white shadow-xl rounded">
                  <canvas ref={canvasRef} className="block max-w-none h-auto rounded" />

                  {/* Draggable District Signature Marker */}
                  {canvasRef.current && canvasRef.current.width > 0 && (
                    <div
                      ref={markerRef}
                      onMouseDown={handleMouseDown}
                      onTouchStart={handleTouchStart}
                      className="absolute cursor-move select-none border-2 border-dashed border-[#ea580c] bg-orange-500/15 flex items-center justify-center z-20 shadow-lg group rounded hover:border-amber-600 transition-colors"
                      style={{
                        width: `${markerW * 100}%`,
                        aspectRatio: "3 / 1.2",
                        left: `${markerX * 100}%`,
                        top: `${markerY * 100}%`,
                        transform: "translate(-50%, -50%)",
                      }}
                      title="Click & Drag to reposition district signature"
                    >
                      {previewSignatureUrl ? (
                        <img
                          src={previewSignatureUrl}
                          alt="District Signature Preview"
                          className="w-full h-full object-contain p-0 opacity-90 pointer-events-none drop-shadow-xs"
                        />
                      ) : (
                        <div className="p-1 text-center pointer-events-none">
                          <span className="block text-[10px] font-bold text-[#ea580c] tracking-wider uppercase">
                            District Stamp
                          </span>
                          <span className="text-[8px] text-slate-500 block">
                            Authorized Official Area
                          </span>
                        </div>
                      )}

                      {/* Corner indicator dots */}
                      <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-[#ea580c] rounded-full border border-white"></div>
                      <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#ea580c] rounded-full border border-white"></div>
                      <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-[#ea580c] rounded-full border border-white"></div>
                      <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-[#ea580c] rounded-full border border-white"></div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Floating Zoom Controls In Canvas Position (Fixed on screen in canvas view) */}
            {pdfDoc && (
              <div
                className="absolute bottom-4 right-4 z-30 flex items-center gap-1 bg-slate-900/95 hover:bg-slate-950 text-white p-1 rounded-xl shadow-2xl border border-slate-700/80 backdrop-blur-md transition-all select-none"
                title="Canvas Zoom Controls"
              >
                <button
                  type="button"
                  onClick={handleZoomOut}
                  disabled={zoomLevel <= 0.5}
                  className="p-1.5 rounded-lg hover:bg-white/20 active:scale-95 disabled:opacity-30 transition-all text-slate-200"
                  title="Zoom Out (-)"
                  aria-label="Zoom Out"
                >
                  <ZoomOut size={15} />
                </button>
                <button
                  type="button"
                  onClick={handleZoomReset}
                  className="px-2 py-0.5 text-xs font-mono font-bold rounded-md hover:bg-white/15 text-amber-300 transition-colors"
                  title="Reset Zoom (100%)"
                >
                  {Math.round(zoomLevel * 100)}%
                </button>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  disabled={zoomLevel >= 2.5}
                  className="p-1.5 rounded-lg hover:bg-white/20 active:scale-95 disabled:opacity-30 transition-all text-slate-200"
                  title="Zoom In (+)"
                  aria-label="Zoom In"
                >
                  <ZoomIn size={15} />
                </button>

                <div className="h-3.5 w-px bg-white/20 mx-0.5" />

                <button
                  type="button"
                  disabled={isStamping}
                  onClick={handleDownloadStampedPdf}
                  className="p-1.5 rounded-lg hover:bg-white/20 active:scale-95 transition-all text-emerald-400 hover:text-emerald-300 disabled:opacity-50"
                  title="Download PDF with signature at placed position"
                  aria-label="Download Signed PDF"
                >
                  {isStamping ? (
                    <RefreshCw size={15} className="animate-spin text-emerald-400" />
                  ) : (
                    <Download size={15} />
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Studio Settings & Signature Controls */}
        <div className="lg:col-span-4 space-y-4">
          {/* Signature Preview Picker */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                <Eye size={14} className="text-[#1e3a8a]" /> District Signature Preview
              </h5>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                {signedDistrictsCount} / {districts.length || 38} Districts (Signatures Present)
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                <label className="font-bold text-slate-600">
                  Select District to Preview Stamp
                </label>
                <a
                  href="/admin/signatures"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] font-bold text-[#1e3a8a] hover:underline"
                >
                  Signatures Manager →
                </a>
              </div>
              <select
                value={selectedSigDistrictId}
                onChange={(e) => setSelectedSigDistrictId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:border-[#1e3a8a]"
              >
                <option value="">— Select District —</option>
                <optgroup label="Districts with Stamp Available">
                  {districts
                    .filter((d) => Boolean(d.signature_path))
                    .map((d) => (
                      <option key={d.id} value={String(d.id)}>
                        {d.name} ✓ (Active)
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Districts without Stamp (Offline)">
                  {districts
                    .filter((d) => !d.signature_path)
                    .map((d) => (
                      <option key={d.id} value={String(d.id)}>
                        {d.name} (No stamp on file)
                      </option>
                    ))}
                </optgroup>
              </select>
            </div>

            {previewSignatureUrl ? (
              <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-2">
                <img
                  src={previewSignatureUrl}
                  alt="Official Seal"
                  className="w-12 h-8 object-contain bg-white rounded border border-emerald-200 p-0.5"
                />
                <div className="text-[10px] text-emerald-900 leading-tight">
                  <strong>{activeDistrict?.name}</strong> official stamp loaded in placement preview.
                </div>
              </div>
            ) : (
              <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-[10px] text-amber-900 leading-tight">
                Showing default watermark placeholder. Select a district with an uploaded signature to preview their actual seal.
              </div>
            )}
          </div>

          {/* Sizing & Coordinate Calibration */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <h5 className="text-xs font-bold uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
              <Sliders size={14} className="text-[#ea580c]" /> Dimension &amp; Scaling
            </h5>

            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-600 mb-1">
                <span>Stamp Width Scaling</span>
                <span className="text-[#ea580c] bg-orange-50 px-2 py-0.5 rounded-full font-mono text-[11px] border border-orange-200">
                  {(markerW * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="70"
                value={Math.round(markerW * 100)}
                onChange={(e) => handleWidthChange(parseFloat(e.target.value) / 100)}
                className="w-full accent-[#ea580c] cursor-pointer"
              />
            </div>

            {/* Normalized Coordinates Display */}
            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 text-center">
                <span className="block text-[10px] text-slate-500 font-bold uppercase">X Offset</span>
                <span className="font-mono text-slate-900 font-bold text-xs">
                  {(markerX * 100).toFixed(1)}%
                </span>
              </div>
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 text-center">
                <span className="block text-[10px] text-slate-500 font-bold uppercase">Y Offset</span>
                <span className="font-mono text-slate-900 font-bold text-xs">
                  {(markerY * 100).toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Manual Fine Tuning Inputs */}
            <div className="pt-2 border-t border-slate-100">
              <span className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">
                Manual Fine-Tuning
              </span>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 block">Page</label>
                  <input
                    type="number"
                    min="1"
                    max={pageTotal}
                    value={pageNum}
                    onChange={(e) => {
                      const p = parseInt(e.target.value) || 1;
                      setPageNum(p);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block">X (%)</label>
                  <input
                    type="number"
                    min="5"
                    max="95"
                    step="0.5"
                    value={(markerX * 100).toFixed(1)}
                    onChange={(e) => {
                      const val = (parseFloat(e.target.value) || 50) / 100;
                      setMarkerX(val);
                      setService((prev) => (prev ? { ...prev, sign_pos_x: val } : prev));
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block">Y (%)</label>
                  <input
                    type="number"
                    min="5"
                    max="95"
                    step="0.5"
                    value={(markerY * 100).toFixed(1)}
                    onChange={(e) => {
                      const val = (parseFloat(e.target.value) || 80) / 100;
                      setMarkerY(val);
                      setService((prev) => (prev ? { ...prev, sign_pos_y: val } : prev));
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Document Acceptance Specifications (W×H) */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5 text-slate-800">
                <FileCheck size={14} className="text-[#1e3a8a]" /> Document Geometry (W×H)
              </span>
              <span className="font-mono text-[11px] font-bold text-[#1e3a8a] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                {service.doc_width && service.doc_height ? `${service.doc_width} × ${service.doc_height} pt` : "Awaiting PDF"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-600 pt-1.5 border-t border-slate-100">
              <div>
                <span className="text-slate-400 block text-[9px] uppercase font-sans font-bold">Stamp W×H:</span>
                <span className="font-bold text-slate-800">
                  {Math.round((service.doc_width || 612) * markerW)} × {Math.round((service.doc_width || 612) * markerW * (1.2 / 3))} pt
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px] uppercase font-sans font-bold">Standard Spec:</span>
                <span className="font-bold text-slate-800">
                  {service.doc_width === 595 || service.doc_width === 596 ? "ISO A4" : service.doc_width === 612 ? "US Letter" : "Statutory Page"}
                </span>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 italic">
              Mandatory W×H specifications required for statutory certificate acceptance.
            </p>
          </div>

          {/* Quick Notice */}
          <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200 text-xs text-amber-900 leading-relaxed flex items-start gap-2">
            <Move size={16} className="text-amber-600 mt-0.5 shrink-0" />
            <p>
              Normalized percentage coordinates survive dynamic paper sizes (A4, Letter) and high-resolution PDF generation with pixel-perfect stamp alignment.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Service Modal (Logo image, Name, Description)
// ============================================================================
interface MainServiceModalProps {
  mainType: { id?: number; name: string; description: string; image_path?: string | null };
  setMainType: React.Dispatch<React.SetStateAction<{ id?: number; name: string; description: string; image_path?: string | null } | null>>;
  imageFile: File | null;
  setImageFile: (f: File | null) => void;
  isSaving: boolean;
  onClose: () => void;
  onSave: (e: React.FormEvent) => void;
}

function MainServiceModal({
  mainType,
  setMainType,
  imageFile,
  setImageFile,
  isSaving,
  onClose,
  onSave,
}: MainServiceModalProps) {
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 bg-[#1e3a8a] text-white">
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-blue-200" />
            <div>
              <h3 className="text-base font-bold">
                {mainType.id ? `Edit Main Service: ${mainType.name}` : "Add New Main Service"}
              </h3>
              <p className="text-xs text-blue-200">
                Configure primary branch name, logo, and classification
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSave} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Main Service Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={mainType.name}
              onChange={(e) => setMainType({ ...mainType, name: e.target.value })}
              placeholder="e.g. Aadhaar Services / PAN Card / Labour Welfare Board"
              className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-xs font-medium focus:outline-none focus:border-[#1e3a8a]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Short Description / Welfare Program Note
            </label>
            <textarea
              rows={2}
              value={mainType.description}
              onChange={(e) => setMainType({ ...mainType, description: e.target.value })}
              placeholder="e.g. Statutory identification and direct welfare enrollment services"
              className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 text-xs font-medium focus:outline-none focus:border-[#1e3a8a]"
            />
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
              Main Service Logo Image
            </label>
            <div className="flex items-center gap-4">
              {imageFile ? (
                <img
                  src={URL.createObjectURL(imageFile)}
                  alt="Preview"
                  className="w-14 h-14 rounded-xl object-contain bg-white border border-slate-300 p-1 shrink-0"
                />
              ) : mainType.image_path ? (
                <img
                  src={mainType.image_path}
                  alt="Current Logo"
                  className="w-14 h-14 rounded-xl object-contain bg-white border border-slate-300 p-1 shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-xs shrink-0">
                  No Logo
                </div>
              )}
              <div className="flex-1 space-y-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setImageFile(f);
                  }}
                  className="block w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#1e3a8a] hover:file:bg-blue-100"
                />
                <input
                  type="text"
                  placeholder="Or relative image path (/assets/uploads/types/...)"
                  value={mainType.image_path || ""}
                  onChange={(e) => setMainType({ ...mainType, image_path: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-600"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-lg bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-bold shadow-sm flex items-center gap-2"
            >
              {isSaving && <RefreshCw size={12} className="animate-spin" />}
              <span>{mainType.id ? "Update Main Service" : "Create Main Service"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

