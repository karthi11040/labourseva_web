"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  Save,
  Upload,
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
  Eye,
  PenTool,
  RotateCcw,
  RotateCw,
  Plus,
  Layers,
  FileCheck,
  FileText,
  UserCheck,
  Check,
  X,
  ZoomIn,
  ZoomOut,
  Download,
} from "lucide-react";
import { stampAndDownloadPdf } from "@/lib/pdfStamper";
import { formatGeoBilingual } from "@/lib/geo-bilingual";
import { useLanguage } from "@/components/LanguageProvider";
import LanguageToggle from "@/components/LanguageToggle";

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
  sign_width?: number | null;
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
}

interface ServiceDocumentStudioProps {
  userRole: "admin" | "staff";
  serviceIdParam?: string;
  backUrl?: string;
}

export default function ServiceDocumentStudio({
  userRole,
  serviceIdParam,
  backUrl,
}: ServiceDocumentStudioProps) {
  const router = useRouter();
  const { isTamil } = useLanguage();
  const defaultBackUrl = userRole === "admin" ? "/admin/services" : "/staff/dashboard";
  const returnUrl = backUrl || defaultBackUrl;

  const [services, setServices] = useState<Service[]>([]);
  const [types, setTypes] = useState<ServiceType[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [currentService, setCurrentService] = useState<Service | null>(null);
  const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeInspectorTab, setActiveInspectorTab] = useState<"signature" | "details" | "districts">("signature");

  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Undo / Redo History for signature coordinates
  const [history, setHistory] = useState<Array<{ x: number; y: number; w: number; page: number }>>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // PDF & Canvas Rendering State
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageNum, setPageNum] = useState(1);
  const [pageTotal, setPageTotal] = useState(1);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [pdfJsReady, setPdfJsReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Signature Coordinates State
  const [markerX, setMarkerX] = useState(0.68);
  const [markerY, setMarkerY] = useState(0.8);
  const [markerW, setMarkerW] = useState(0.25);
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>("");
  const [districtSearch, setDistrictSearch] = useState("");
  const [isStamping, setIsStamping] = useState(false);

  const [docWidth, setDocWidth] = useState<number | null>(null);
  const [docHeight, setDocHeight] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const renderTaskRef = useRef<any>(null);
  const renderIdRef = useRef<number>(0);

  // Canvas Zoom State (50% - 250%)
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(2.5, Math.round((prev + 0.15) * 100) / 100));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(0.5, Math.round((prev - 0.15) * 100) / 100));
  };

  const handleZoomReset = () => {
    setZoomLevel(1.0);
  };

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

  // Clean up any ongoing render on unmount
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

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Load Initial Data
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/admin/services", { cache: "no-store" });
      const data = await res.json();
      if (data.ok) {
        const loadedServices: Service[] = data.services || [];
        const loadedDistricts: District[] = data.districts || [];
        setServices(loadedServices);
        setTypes(data.types || []);
        setDistricts(loadedDistricts);
        setEmployees(data.employees || []);

        // Find initial target service
        let target: Service | null = null;
        if (serviceIdParam && serviceIdParam !== "new") {
          target = loadedServices.find((s) => String(s.id) === String(serviceIdParam)) || null;
        }

        // Districts with an authorized signature stamp on file
        const signedDistrictIds = loadedDistricts.filter((d) => Boolean(d.signature_path)).map((d) => d.id);

        if (!target) {
          if (serviceIdParam === "new") {
            target = {
              name: "",
              description: "",
              type_id: data.types?.[0]?.id || 0,
              payment_amount: 0,
              retailer_amount: 0,
              status: "active",
              assigned_employee_id: null,
              sign_pos_x: 0.68,
              sign_pos_y: 0.8,
              sign_page: 1,
              sign_width: 0.25,
              sign_height: 0.12,
              online_districts: signedDistrictIds, // unsigned districts are turned off by default
            };
          } else if (loadedServices.length > 0) {
            target = loadedServices[0];
          }
        }

        if (target) {
          // Always ensure districts without signature are turned off
          const sanitizedTarget: Service = {
            ...target,
            online_districts: (target.online_districts || []).filter((id) =>
              loadedDistricts.some((d) => d.id === id && Boolean(d.signature_path))
            ),
          };
          setCurrentService(sanitizedTarget);
          const initialX = sanitizedTarget.sign_pos_x ?? 0.68;
          const initialY = sanitizedTarget.sign_pos_y ?? 0.8;
          const initialW = sanitizedTarget.sign_width ?? 0.25;
          const initialP = sanitizedTarget.sign_page || 1;
          setMarkerX(initialX);
          setMarkerY(initialY);
          setMarkerW(initialW);
          setPageNum(initialP);
          if (sanitizedTarget.doc_width) setDocWidth(sanitizedTarget.doc_width);
          if (sanitizedTarget.doc_height) setDocHeight(sanitizedTarget.doc_height);
          setHistory([{ x: initialX, y: initialY, w: initialW, page: initialP }]);
          setHistoryIndex(0);
        }

        // Set default district with signature
        const defaultDist = loadedDistricts.find((d) => Boolean(d.signature_path)) || loadedDistricts[0];
        if (defaultDist) {
          setSelectedDistrictId(String(defaultDist.id));
        }
      } else {
        showToast(data.error || "Failed to load services catalogue", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Error connecting to server", "error");
    } finally {
      setIsLoading(false);
    }
  }, [serviceIdParam]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 2. Load PDF.js Script from CDN
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

  // 3. Render PDF page on canvas (with cancel-safe task tracking and token protection)
  const renderPage = useCallback(
    async (num: number, doc: any, zoom = zoomLevel) => {
      if (!doc || !canvasRef.current) return;
      const currentRenderId = ++renderIdRef.current;

      // Cancel any ongoing render and await cancellation cleanup before starting a new one
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
          await renderTaskRef.current.promise.catch(() => {});
        } catch {
          // Ignore
        }
        renderTaskRef.current = null;
      }

      // Exit if a newer render request arrived while waiting for cancellation
      if (currentRenderId !== renderIdRef.current) return;

      try {
        setIsLoadingPdf(true);
        const page = await doc.getPage(num);
        if (currentRenderId !== renderIdRef.current) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext("2d");
        if (!context) return;

        const containerWidth = containerRef.current?.clientWidth || 760;
        const unscaledViewport = page.getViewport({ scale: 1 });
        const baseScale = Math.max(0.6, (containerWidth - 48) / unscaledViewport.width);
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

  // 4. Load PDF source (File or URL)
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
          setPageNum((prev) => Math.min(prev || 1, doc.numPages));

          try {
            const firstPage = await doc.getPage(1);
            const unscaled = firstPage.getViewport({ scale: 1 });
            const w = Math.round(unscaled.width);
            const h = Math.round(unscaled.height);
            setDocWidth(w);
            setDocHeight(h);
            setCurrentService((prev) => (prev ? { ...prev, doc_width: w, doc_height: h } : prev));
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

  // Load PDF document when file or path changes
  useEffect(() => {
    if (!pdfJsReady || !currentService) return;
    const source = selectedPdfFile || currentService.pdf_path;
    if (!source) {
      setPdfDoc(null);
      return;
    }
    loadPdfSource(source);
  }, [pdfJsReady, selectedPdfFile, currentService?.pdf_path, loadPdfSource]);

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
    showToast(`PDF loaded: ${file.name}`);
  };

  // Download PDF with signature placed at the exact configured coordinates
  const handleDownloadStampedPdf = async () => {
    const source = selectedPdfFile || currentService?.pdf_path;
    if (!source) {
      showToast("No PDF document available to stamp", "error");
      return;
    }

    try {
      setIsStamping(true);
      showToast("Stamping signature onto PDF document...");
      await stampAndDownloadPdf({
        pdfSource: source,
        signatureImageUrl: previewSignatureUrl,
        pageNum: pageNum,
        posX: markerX,
        posY: markerY,
        widthPercent: markerW,
        districtName: activeDistrict?.name,
        serviceName: currentService?.name,
      });
      showToast("Signed PDF downloaded with signature placed!");
    } catch (err: any) {
      console.error("Failed to stamp and download PDF:", err);
      showToast(err.message || "Failed to stamp PDF", "error");
    } finally {
      setIsStamping(false);
    }
  };

  const changePage = (delta: number) => {
    const next = pageNum + delta;
    if (next >= 1 && next <= pageTotal) {
      setPageNum(next);
      if (currentService) {
        setCurrentService({ ...currentService, sign_page: next });
      }
    }
  };

  // Undo / Redo helpers
  const pushHistory = (x: number, y: number, w: number, page: number) => {
    setHistory((prev) => {
      const upToCurrent = prev.slice(0, historyIndex + 1);
      return [...upToCurrent, { x, y, w, page }];
    });
    setHistoryIndex((prev) => prev + 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const nextIndex = historyIndex - 1;
      const state = history[nextIndex];
      setHistoryIndex(nextIndex);
      setMarkerX(state.x);
      setMarkerY(state.y);
      setMarkerW(state.w);
      if (state.page !== pageNum) {
        setPageNum(state.page);
      }
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      const state = history[nextIndex];
      setHistoryIndex(nextIndex);
      setMarkerX(state.x);
      setMarkerY(state.y);
      setMarkerW(state.w);
      if (state.page !== pageNum) {
        setPageNum(state.page);
      }
    }
  };

  // Keyboard shortcut for Undo (Ctrl+Z) and Redo (Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [historyIndex, history]);

  // Drag logic for marker
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

      const halfW = markerW / 2;
      const clampedX = Math.max(halfW, Math.min(1 - halfW, x));
      const clampedY = Math.max(0.06, Math.min(0.94, y));

      setMarkerX(clampedX);
      setMarkerY(clampedY);
    };

    const handleMouseMove = (e: MouseEvent) => {
      updatePosition(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) updatePosition(e.touches[0].clientX, e.touches[0].clientY);
    };

    const handleEnd = () => {
      if (isDragging.current) {
        isDragging.current = false;
        pushHistory(markerX, markerY, markerW, pageNum);
      }
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
  }, [markerW, markerX, markerY, pageNum]);

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
    pushHistory(px, py, markerW, pageNum);
  };

  const nudgeMarker = (dx: number, dy: number) => {
    const halfW = markerW / 2;
    const newX = Math.max(halfW, Math.min(1 - halfW, Math.round((markerX + dx) * 1000) / 1000));
    const newY = Math.max(0.06, Math.min(0.94, Math.round((markerY + dy) * 1000) / 1000));
    setMarkerX(newX);
    setMarkerY(newY);
    pushHistory(newX, newY, markerW, pageNum);
  };

  // Switch active service
  const handleSelectService = (idOrNew: string) => {
    const signedDistrictIds = districts.filter((d) => Boolean(d.signature_path)).map((d) => d.id);

    if (idOrNew === "new") {
      const newSvc: Service = {
        name: "",
        description: "",
        type_id: types[0]?.id || 0,
        payment_amount: 0,
        retailer_amount: 0,
        status: "active",
        assigned_employee_id: null,
        sign_pos_x: 0.68,
        sign_pos_y: 0.8,
        sign_page: 1,
        sign_width: 0.25,
        sign_height: 0.12,
        online_districts: signedDistrictIds, // Unsigned districts turned off
      };
      setCurrentService(newSvc);
      setSelectedPdfFile(null);
      setDocWidth(null);
      setDocHeight(null);
      setMarkerX(0.68);
      setMarkerY(0.8);
      setMarkerW(0.25);
      setPageNum(1);
    } else {
      const found = services.find((s) => String(s.id) === idOrNew);
      if (found) {
        const sanitizedOnline = (found.online_districts || []).filter((id) =>
          districts.some((d) => d.id === id && Boolean(d.signature_path))
        );
        setCurrentService({ ...found, online_districts: sanitizedOnline });
        setSelectedPdfFile(null);
        setDocWidth(found.doc_width ?? null);
        setDocHeight(found.doc_height ?? null);
        setMarkerX(found.sign_pos_x ?? 0.68);
        setMarkerY(found.sign_pos_y ?? 0.8);
        setMarkerW(found.sign_width ?? 0.25);
        setPageNum(found.sign_page || 1);
        setHistory([{ x: found.sign_pos_x ?? 0.68, y: found.sign_pos_y ?? 0.8, w: found.sign_width ?? 0.25, page: found.sign_page || 1 }]);
        setHistoryIndex(0);
      }
    }
  };

  // Save changes to API
  const handleSave = async () => {
    if (!currentService) return;
    if (!currentService.name.trim()) {
      showToast("Please enter a service name", "error");
      setActiveInspectorTab("details");
      return;
    }

    try {
      setIsSaving(true);
      const formData = new FormData();
      if (currentService.id) {
        formData.append("id", String(currentService.id));
      }
      formData.append("name", currentService.name.trim());
      formData.append("description", currentService.description || "");
      formData.append("type_id", String(currentService.type_id || 0));
      formData.append("payment_amount", String(currentService.payment_amount || 0));
      formData.append("retailer_amount", String(currentService.retailer_amount || 0));
      formData.append("status", currentService.status);
      if (currentService.assigned_employee_id) {
        formData.append("assigned_employee_id", String(currentService.assigned_employee_id));
      }
      formData.append("sign_pos_x", String(markerX));
      formData.append("sign_pos_y", String(markerY));
      formData.append("sign_page", String(pageNum));
      formData.append("sign_width", String(markerW));
      formData.append("sign_height", String(0.12));
      if (docWidth !== null && docWidth !== undefined) {
        formData.append("doc_width", String(docWidth));
      }
      if (docHeight !== null && docHeight !== undefined) {
        formData.append("doc_height", String(docHeight));
      }
      formData.append("online_districts", JSON.stringify(currentService.online_districts || []));

      if (selectedPdfFile) {
        formData.append("pdf_file", selectedPdfFile);
      } else if (currentService.pdf_path) {
        formData.append("pdf_path", currentService.pdf_path);
      }

      const method = currentService.id ? "PUT" : "POST";
      const res = await fetch("/api/admin/services", { method, body: formData });
      const result = await res.json();

      if (result.ok) {
        showToast(currentService.id ? "Service & Studio placement updated!" : "New service created successfully!");
        // Refresh catalog list
        const refreshRes = await fetch("/api/admin/services", { cache: "no-store" });
        const refreshData = await refreshRes.json();
        if (refreshData.ok) {
          setServices(refreshData.services || []);
          if (!currentService.id && result.serviceId) {
            const created = (refreshData.services as Service[]).find((s) => s.id === result.serviceId);
            if (created) setCurrentService(created);
          }
        }
      } else {
        showToast(result.error || "Save failed", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Error saving service", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const activeDistrict =
    districts.find((d) => String(d.id) === selectedDistrictId) ||
    districts.find((d) => Boolean(d.signature_path)) ||
    districts[0];
  const previewSignatureUrl = activeDistrict?.signature_path || null;
  const signedDistrictsCount = districts.filter((d) => Boolean(d.signature_path)).length;

  const filteredDistricts = districts.filter((d) =>
    d.name.toLowerCase().includes(districtSearch.toLowerCase())
  );

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100 font-sans text-slate-800">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-16 right-6 z-[200] rounded-xl px-5 py-3 shadow-2xl flex items-center gap-3 border text-xs font-semibold animate-in fade-in slide-in-from-top-4 duration-200 ${
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

      {/* Top Studio Application Header Bar */}
      <header className="h-14 bg-[#1e3a8a] text-white flex items-center justify-between px-4 border-b border-blue-900 shrink-0 z-30 shadow-md">
        {/* Left: Exit + Service Picker + Geometry */}
        <div className="flex items-center gap-3">
          <Link
            href={returnUrl}
            className="flex items-center gap-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors border border-white/20"
            title="Exit Studio"
          >
            <ArrowLeft size={15} /> <span className="hidden sm:inline">Exit Studio</span>
          </Link>

          <div className="h-5 w-px bg-white/20"></div>

          {/* Service Switcher */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-blue-200 hidden md:inline">
              Service:
            </span>
            <select
              value={currentService?.id ? String(currentService.id) : "new"}
              onChange={(e) => handleSelectService(e.target.value)}
              className="bg-blue-950/80 border border-blue-400/40 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white outline-none focus:border-amber-400 max-w-[180px] sm:max-w-[240px] md:max-w-[280px] truncate"
            >
              <option value="new">+ Add New Service...</option>
              {services.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {s.name} {s.status === "inactive" ? "(Inactive)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Document Acceptance Dimensions (W×H pt) */}
          {docWidth && docHeight ? (
            <span
              className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-950/60 border border-blue-400/30 text-blue-200 rounded-lg text-[11px] font-mono font-medium select-none"
              title="Official Document Page Dimensions (Required for Statutory Acceptance)"
            >
              <FileText size={12} className="text-amber-400" />
              <span>
                {docWidth === 595 || docWidth === 596 ? "ISO A4" : docWidth === 612 ? "US Letter" : "Doc"}: {docWidth} × {docHeight} pt
              </span>
            </span>
          ) : null}
        </div>

        {/* Center: Canvas View Controls (Page, Zoom, Undo/Redo) */}
        <div className="hidden md:flex items-center gap-2 bg-blue-950/70 px-2.5 py-1 rounded-xl border border-blue-400/30">
          {/* Page navigation */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => changePage(-1)}
              disabled={pageNum <= 1 || !pdfDoc}
              className="p-1 rounded text-white/80 hover:bg-white/15 hover:text-white disabled:opacity-30 transition-colors"
              title="Previous Page"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="text-[11px] font-bold text-white px-2 py-0.5 rounded bg-white/10 font-mono">
              Page {pageNum} / {pageTotal}
            </span>
            <button
              type="button"
              onClick={() => changePage(1)}
              disabled={pageNum >= pageTotal || !pdfDoc}
              className="p-1 rounded text-white/80 hover:bg-white/15 hover:text-white disabled:opacity-30 transition-colors"
              title="Next Page"
            >
              <ChevronRight size={15} />
            </button>
          </div>

          <div className="h-4 w-px bg-white/20"></div>

          {/* Zoom controls */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoomLevel <= 0.5 || !pdfDoc}
              className="p-1 rounded text-white/80 hover:bg-white/15 hover:text-white disabled:opacity-30 transition-colors"
              title="Zoom Out (-)"
            >
              <ZoomOut size={14} />
            </button>
            <button
              type="button"
              onClick={handleZoomReset}
              className="text-[11px] font-mono font-bold text-amber-300 hover:text-white px-1.5 min-w-[40px] text-center"
              title="Reset Zoom to 100%"
            >
              {Math.round(zoomLevel * 100)}%
            </button>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoomLevel >= 2.5 || !pdfDoc}
              className="p-1 rounded text-white/80 hover:bg-white/15 hover:text-white disabled:opacity-30 transition-colors"
              title="Zoom In (+)"
            >
              <ZoomIn size={14} />
            </button>
          </div>

          <div className="h-4 w-px bg-white/20"></div>

          {/* Undo / Redo */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="p-1 text-white/80 hover:bg-white/15 hover:text-white rounded disabled:opacity-30 transition-colors"
              title="Undo (Ctrl+Z)"
            >
              <RotateCcw size={14} />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="p-1 text-white/80 hover:bg-white/15 hover:text-white rounded disabled:opacity-30 transition-colors"
              title="Redo (Ctrl+Y)"
            >
              <RotateCw size={14} />
            </button>
          </div>
        </div>

        {/* Right Actions: Upload PDF, Download Stamped, Save + LanguageToggle */}
        <div className="flex items-center gap-2">
          {/* Language Toggle */}
          <div className="hidden sm:block">
            <LanguageToggle />
          </div>

          {/* Upload / Replace PDF */}
          <label
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white border border-white/25 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
            title={isTamil ? "அதிகாரப்பூர்வ மாதிரி PDF-ஐ பதிவேற்றவும்" : "Upload official statutory PDF template"}
          >
            <Upload size={14} />
            <span className="hidden sm:inline">
              {selectedPdfFile || currentService?.pdf_path
                ? (isTamil ? "PDF மாற்றுக" : "Replace PDF")
                : (isTamil ? "PDF பதிவேற்று" : "Upload PDF")}
            </span>
            <input type="file" accept="application/pdf" onChange={handleFileUpload} className="hidden" />
          </label>

          {/* Download Test Signed PDF */}
          {(selectedPdfFile || currentService?.pdf_path) && (
            <button
              type="button"
              disabled={isStamping}
              onClick={handleDownloadStampedPdf}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-emerald-500 shadow-xs transition-all active:scale-95 disabled:opacity-50"
              title={isTamil ? "முத்திரையிடப்பட்ட மாதிரி PDF-ஐ பதிவிறக்கவும்" : "Download signed test certificate with current placement"}
            >
              {isStamping ? (
                <RefreshCw size={14} className="animate-spin text-white" />
              ) : (
                <Download size={14} className="text-white" />
              )}
              <span className="hidden lg:inline">{isTamil ? "முத்திரையிட்ட PDF பதிவிறக்கு" : "Download Signed PDF"}</span>
            </button>
          )}

          {/* Primary Save Button */}
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="flex items-center gap-1.5 bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-bold px-4 py-1.5 rounded-lg shadow-sm transition-all active:scale-95 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>{isTamil ? "சேமிக்கப்படுகிறது..." : "Saving..."}</span>
              </>
            ) : (
              <>
                <Save size={14} />
                <span>{isTamil ? "சேவையைச் சேமி" : "Save Service"}</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Studio Workbench Area */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* CENTER / LEFT: Document Canvas Workbench */}
        <div className="flex-1 flex flex-col bg-slate-200/70 overflow-hidden relative border-r border-slate-300">
          {/* Interactive Document Viewport */}
          <div
            ref={containerRef}
            className="flex-1 overflow-auto p-6 relative custom-scrollbar"
          >
            {isLoadingPdf ? (
              <div className="flex flex-col items-center justify-center text-slate-500 py-16">
                <RefreshCw size={32} className="animate-spin text-[#1e3a8a] mb-3" />
                <p className="text-xs font-bold text-slate-700">Rendering Certificate Layout...</p>
              </div>
            ) : loadError ? (
              <div className="flex flex-col items-center justify-center text-red-600 max-w-md mx-auto text-center p-6 bg-white rounded-xl shadow-lg border border-red-200 my-8">
                <AlertCircle size={36} className="mb-2" />
                <h5 className="text-sm font-bold">{loadError}</h5>
                <p className="text-xs text-slate-500 mt-1">Please select or upload a valid statutory certificate PDF.</p>
              </div>
            ) : !pdfDoc && !currentService?.pdf_path && !selectedPdfFile ? (
              <div className="flex flex-col items-center justify-center text-center p-8 bg-white rounded-2xl shadow-xl border border-slate-300 max-w-md mx-auto my-8">
                <FileText size={56} className="text-slate-300 mb-3" />
                <h4 className="text-base font-bold text-slate-800">No PDF Document Attached</h4>
                <p className="text-xs text-slate-500 mt-1 mb-4 leading-relaxed">
                  Upload an official Tamil Nadu Welfare Board certificate or order template to begin placing district signatures.
                </p>
                <label className="flex items-center gap-2 px-5 py-2.5 bg-[#ea580c] hover:bg-[#c2410c] text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-md">
                  <Upload size={15} /> Upload PDF Document
                  <input type="file" accept="application/pdf" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
            ) : null}

            {/* Document Canvas Centered Frame */}
            <div className="min-w-full min-h-full flex items-center justify-center m-auto w-fit">
              <div className="relative inline-block bg-white shadow-2xl rounded border border-slate-300">
                <canvas ref={canvasRef} className="block max-w-none h-auto rounded" />

                {/* Draggable District Official Signature Stamp Overlay */}
                {canvasRef.current && canvasRef.current.width > 0 && (
                  <div
                    ref={markerRef}
                    onMouseDown={handleMouseDown}
                    onTouchStart={handleTouchStart}
                    className="absolute cursor-move select-none border-2 border-dashed border-[#ea580c] bg-orange-500/15 flex items-center justify-center z-20 shadow-xl group rounded hover:border-amber-600 transition-colors"
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
                        alt="District Seal Preview"
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

                    {/* Live Coordinates Tooltip on hover */}
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900/95 text-white text-[9px] font-mono font-bold px-2 py-0.5 rounded shadow pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                      X: {(markerX * 100).toFixed(1)}% · Y: {(markerY * 100).toFixed(1)}%
                    </div>

                    {/* Corner indicator dots */}
                    <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-[#ea580c] rounded-full border-2 border-white shadow-xs"></div>
                    <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-[#ea580c] rounded-full border-2 border-white shadow-xs"></div>
                    <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-[#ea580c] rounded-full border-2 border-white shadow-xs"></div>
                    <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-[#ea580c] rounded-full border-2 border-white shadow-xs"></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Studio Control Inspector Drawer */}
        <div className="w-full lg:w-96 bg-white border-l border-slate-200 flex flex-col shrink-0 shadow-lg z-20">
          {/* Inspector Tab Bar */}
          <div className="flex border-b border-slate-200 bg-slate-50">
            <button
              type="button"
              onClick={() => setActiveInspectorTab("signature")}
              className={`flex-1 py-3 text-center text-xs font-bold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                activeInspectorTab === "signature"
                  ? "border-[#ea580c] text-[#ea580c] bg-white"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              <PenTool size={14} /> {isTamil ? "முத்திரை வைப்பு" : "Stamp Placement"}
            </button>
            <button
              type="button"
              onClick={() => setActiveInspectorTab("details")}
              className={`flex-1 py-3 text-center text-xs font-bold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                activeInspectorTab === "details"
                  ? "border-[#1e3a8a] text-[#1e3a8a] bg-white"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileText size={14} /> {isTamil ? "சேவை விவரம்" : "Service Info"}
            </button>
            <button
              type="button"
              onClick={() => setActiveInspectorTab("districts")}
              className={`flex-1 py-3 text-center text-xs font-bold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                activeInspectorTab === "districts"
                  ? "border-[#1e3a8a] text-[#1e3a8a] bg-white"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              <MapPin size={14} /> {isTamil ? "மாவட்டங்கள்" : "Districts"} ({currentService?.online_districts.filter(id => districts.some(d => d.id === id && Boolean(d.signature_path))).length || 0})
            </button>
          </div>

          {/* Inspector Tab Contents */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* TAB 1: DISTRICT SIGNATURE CONTROLS */}
            {activeInspectorTab === "signature" && (
              <div className="space-y-4">
                {/* District Stamp Selector */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
                      <Eye size={14} className="text-[#1e3a8a]" /> {isTamil ? "மாவட்ட முத்திரை" : "District Signature Seal"}
                    </label>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      {signedDistrictsCount}/{districts.length || 38} {isTamil ? "தயார்" : "Ready"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>{isTamil ? "மாவட்ட முத்திரை முன்னோட்டம்:" : "Preview seal for district:"}</span>
                    <a
                      href="/admin/signatures"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-bold text-[#1e3a8a] hover:underline"
                    >
                      {isTamil ? "முத்திரைகள் மேலாளர் →" : "Signatures Manager →"}
                    </a>
                  </div>
                  <select
                    value={selectedDistrictId}
                    onChange={(e) => setSelectedDistrictId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-[#1e3a8a]"
                  >
                    <option value="">— {isTamil ? "மாவட்டத்தைத் தேர்ந்தெடுக்கவும்" : "Choose District"} —</option>
                    <optgroup label={isTamil ? "முத்திரை உள்ள மாவட்டங்கள்" : "Districts with Stamp Available"}>
                      {districts
                        .filter((d) => Boolean(d.signature_path))
                        .map((d) => (
                          <option key={d.id} value={String(d.id)}>
                            {formatGeoBilingual(d.name).bilingual} ✓ ({isTamil ? "செயலில்" : "Active"})
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label={isTamil ? "முத்திரை இல்லாத மாவட்டங்கள்" : "Districts without Stamp (Offline)"}>
                      {districts
                        .filter((d) => !d.signature_path)
                        .map((d) => (
                          <option key={d.id} value={String(d.id)}>
                            {formatGeoBilingual(d.name).bilingual} ({isTamil ? "முத்திரை இல்லை" : "No stamp on file"})
                          </option>
                        ))}
                    </optgroup>
                  </select>

                  {previewSignatureUrl ? (
                    <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200 flex items-center gap-3">
                      <img
                        src={previewSignatureUrl}
                        alt="District Seal"
                        className="w-14 h-10 object-contain bg-white rounded border border-emerald-200 p-0.5"
                      />
                      <div className="text-[11px] text-emerald-950">
                        <strong>{formatGeoBilingual(activeDistrict?.name).bilingual}</strong> {isTamil ? "முத்திரை ஏற்றப்பட்டது." : "seal loaded into canvas."}
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
                      {isTamil ? "முத்திரையை முன்னோட்டமிட அங்கீகரிக்கப்பட்ட மாவட்டத்தைத் தேர்ந்தெடுக்கவும்." : "Select an authorized district to preview their stamp."}
                    </div>
                  )}
                </div>

                {/* Placement Presets */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="block text-xs font-bold text-slate-700 uppercase">
                    Quick Placement Presets
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => applyPreset("bottom-right")}
                      className="py-1.5 px-2 text-[11px] font-bold rounded-lg bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 transition-colors shadow-xs"
                    >
                      Bottom Right
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset("bottom-center")}
                      className="py-1.5 px-2 text-[11px] font-bold rounded-lg bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 transition-colors shadow-xs"
                    >
                      Center
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset("bottom-left")}
                      className="py-1.5 px-2 text-[11px] font-bold rounded-lg bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 transition-colors shadow-xs"
                    >
                      Bottom Left
                    </button>
                  </div>
                </div>

                {/* Dimension & Scaling Slider */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <Sliders size={14} className="text-[#ea580c]" /> Stamp Width
                    </span>
                    <span className="text-[#ea580c] bg-orange-100 px-2 py-0.5 rounded-md font-mono text-[11px]">
                      {(markerW * 100).toFixed(0)}% · {Math.round((docWidth || 612) * markerW)} pt
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="70"
                    value={Math.round(markerW * 100)}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) / 100;
                      setMarkerW(val);
                      pushHistory(markerX, markerY, val, pageNum);
                    }}
                    className="w-full accent-[#ea580c] cursor-pointer"
                  />
                </div>

                {/* Precision Numeric Coordinates & Nudge Keypad */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase">
                      Fine-Tuning Calibration
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      Pg {pageNum} · X:{(markerX * 100).toFixed(1)}% · Y:{(markerY * 100).toFixed(1)}%
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-1">Target Page</label>
                      <input
                        type="number"
                        min="1"
                        max={pageTotal}
                        value={pageNum}
                        onChange={(e) => {
                          const p = parseInt(e.target.value) || 1;
                          setPageNum(p);
                        }}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-mono font-bold text-center"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-1">X Offset (%)</label>
                      <input
                        type="number"
                        min="5"
                        max="95"
                        step="0.5"
                        value={(markerX * 100).toFixed(1)}
                        onChange={(e) => {
                          const val = (parseFloat(e.target.value) || 50) / 100;
                          setMarkerX(val);
                          pushHistory(val, markerY, markerW, pageNum);
                        }}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-mono font-bold text-center"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-1">Y Offset (%)</label>
                      <input
                        type="number"
                        min="5"
                        max="95"
                        step="0.5"
                        value={(markerY * 100).toFixed(1)}
                        onChange={(e) => {
                          const val = (parseFloat(e.target.value) || 80) / 100;
                          setMarkerY(val);
                          pushHistory(markerX, val, markerW, pageNum);
                        }}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-mono font-bold text-center"
                      />
                    </div>
                  </div>

                  {/* Micro-Nudge Directional Keypad */}
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">
                      Micro-Nudge (0.5%)
                    </span>
                    <div className="inline-grid grid-cols-3 gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-2xs">
                      <div />
                      <button
                        type="button"
                        onClick={() => nudgeMarker(0, -0.005)}
                        className="w-7 h-6 rounded flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-95 transition-all"
                        title="Nudge Up (Y -0.5%)"
                      >
                        <ArrowUp size={12} />
                      </button>
                      <div />
                      <button
                        type="button"
                        onClick={() => nudgeMarker(-0.005, 0)}
                        className="w-7 h-6 rounded flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-95 transition-all"
                        title="Nudge Left (X -0.5%)"
                      >
                        <ArrowLeft size={12} />
                      </button>
                      <div className="w-7 h-6 flex items-center justify-center text-[9px] text-slate-400 font-mono font-bold">
                        •
                      </div>
                      <button
                        type="button"
                        onClick={() => nudgeMarker(0.005, 0)}
                        className="w-7 h-6 rounded flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-95 transition-all"
                        title="Nudge Right (X +0.5%)"
                      >
                        <ArrowRight size={12} />
                      </button>
                      <div />
                      <button
                        type="button"
                        onClick={() => nudgeMarker(0, 0.005)}
                        className="w-7 h-6 rounded flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-95 transition-all"
                        title="Nudge Down (Y +0.5%)"
                      >
                        <ArrowDown size={12} />
                      </button>
                      <div />
                    </div>
                  </div>
                </div>

                {/* Document Acceptance Dimensions (W×H) */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-1.5 text-slate-800">
                      <FileCheck size={14} className="text-[#1e3a8a]" /> Document Geometry (W×H)
                    </span>
                    <span className="font-mono text-[11px] font-bold text-[#1e3a8a] bg-blue-100/70 px-2 py-0.5 rounded">
                      {docWidth && docHeight ? `${docWidth} × ${docHeight} pt` : "Awaiting PDF"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-600 pt-1 border-t border-slate-200">
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-sans font-bold">Stamp W×H:</span>
                      <span className="font-bold text-slate-800">
                        {Math.round((docWidth || 612) * markerW)} × {Math.round((docWidth || 612) * markerW * (1.2 / 3))} pt
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-sans font-bold">Standard Format:</span>
                      <span className="font-bold text-slate-800">
                        {docWidth === 595 || docWidth === 596 ? "ISO A4" : docWidth === 612 ? "US Letter" : "Statutory Page"}
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 italic">
                    Mandatory W×H specifications required for statutory certificate acceptance.
                  </p>
                </div>

                {/* Statutory Stamp Notice */}
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900 leading-relaxed flex items-start gap-2">
                  <Move size={16} className="text-[#1e3a8a] mt-0.5 shrink-0" />
                  <p>
                    Normalized percentage coordinates survive dynamic paper sizes (A4, Letter) and high-resolution PDF generation with pixel-perfect stamp alignment.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 2: SERVICE DETAILS & PRICING */}
            {activeInspectorTab === "details" && currentService && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Service Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={currentService.name}
                    onChange={(e) => setCurrentService({ ...currentService, name: e.target.value })}
                    placeholder="e.g. Tamil Nadu Construction Worker Card"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-[#1e3a8a]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Description &amp; Scheme
                  </label>
                  <textarea
                    rows={3}
                    value={currentService.description || ""}
                    onChange={(e) => setCurrentService({ ...currentService, description: e.target.value })}
                    placeholder="Statutory scheme details and eligibility guidelines..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs outline-none focus:border-[#1e3a8a]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Category
                    </label>
                    <select
                      value={currentService.type_id || 0}
                      onChange={(e) =>
                        setCurrentService({ ...currentService, type_id: parseInt(e.target.value) || 0 })
                      }
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-2 text-xs outline-none focus:border-[#1e3a8a]"
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
                      Status
                    </label>
                    <select
                      value={currentService.status}
                      onChange={(e) =>
                        setCurrentService({
                          ...currentService,
                          status: e.target.value as "active" | "inactive",
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-2 text-xs outline-none focus:border-[#1e3a8a]"
                    >
                      <option value="active">Active (Online)</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Citizen Price (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={currentService.payment_amount ?? ""}
                      onChange={(e) =>
                        setCurrentService({
                          ...currentService,
                          payment_amount: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs outline-none focus:border-[#1e3a8a]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Retailer Price (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={currentService.retailer_amount ?? ""}
                      onChange={(e) =>
                        setCurrentService({
                          ...currentService,
                          retailer_amount: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs outline-none focus:border-[#1e3a8a]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center gap-1.5">
                    <UserCheck size={14} className="text-[#1e3a8a]" /> Assigned Department Officer
                  </label>
                  <select
                    value={currentService.assigned_employee_id || ""}
                    onChange={(e) =>
                      setCurrentService({
                        ...currentService,
                        assigned_employee_id: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs outline-none focus:border-[#1e3a8a]"
                  >
                    <option value="">— No Specific Officer (Pooled Queue) —</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* TAB 3: DISTRICT AVAILABILITY */}
            {activeInspectorTab === "districts" && currentService && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-700 uppercase block">
                      District Availability
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700">
                      {signedDistrictsCount} / {districts.length || 38} Districts (Signatures Present)
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px]">
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentService({
                          ...currentService,
                          online_districts: districts.filter((d) => Boolean(d.signature_path)).map((d) => d.id),
                        })
                      }
                      className="px-2 py-1 rounded bg-blue-50 text-[#1e3a8a] font-bold hover:bg-blue-100"
                    >
                      Enable Signed Districts
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentService({
                          ...currentService,
                          online_districts: [],
                        })
                      }
                      className="px-2 py-1 rounded bg-slate-100 text-slate-600 font-bold hover:bg-slate-200"
                    >
                      Disable All
                    </button>
                  </div>
                </div>

                <input
                  type="text"
                  placeholder="Filter districts..."
                  value={districtSearch}
                  onChange={(e) => setDistrictSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-[#1e3a8a]"
                />

                <div className="max-h-[380px] overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100">
                  {filteredDistricts.map((dist) => {
                    const hasSignature = Boolean(dist.signature_path);
                    const isOnline = hasSignature && currentService.online_districts.includes(dist.id);
                    return (
                      <div
                        key={dist.id}
                        className={`flex items-center justify-between py-2 text-xs px-2 rounded ${
                          !hasSignature ? "bg-slate-50/70 opacity-60" : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-slate-800 font-medium">{formatGeoBilingual(dist.name).bilingual}</span>
                          {hasSignature ? (
                            <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
                              {isTamil ? "முத்திரை தயார்" : "Stamp Ready"}
                            </span>
                          ) : (
                            <span className="text-[9px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded font-bold">
                              {isTamil ? "கையொப்பம் இல்லை (முடக்கப்பட்டது)" : "No Signature (Turned Off)"}
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
                              const next = isOnline
                                ? currentService.online_districts.filter((id) => id !== dist.id)
                                : [...currentService.online_districts, dist.id];
                              setCurrentService({ ...currentService, online_districts: next });
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-8 h-4 bg-slate-300 rounded-full peer peer-checked:bg-emerald-600 peer-disabled:bg-slate-200 peer-disabled:cursor-not-allowed transition-all after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-4"></div>
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Inspector Footer */}
          <div className="p-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 truncate max-w-[190px]">
              Active: <strong>{currentService?.name || "New Service"}</strong>
            </span>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="px-3.5 py-1.5 bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 disabled:opacity-50 transition-all active:scale-95"
            >
              <Save size={13} /> Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
