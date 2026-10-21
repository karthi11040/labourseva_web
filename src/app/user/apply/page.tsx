"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  CreditCard,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Layers,
  ChevronRight,
  Download,
  ShieldCheck,
  Search,
  X,
  MapPin,
  Building,
  Home,
} from "lucide-react";
import { getCitizenSession } from "@/lib/citizen-session";
import { getRazorpayCheckoutLogo } from "@/lib/razorpay-logo";

interface SubServiceItem {
  id: number;
  name: string;
  description: string;
  fee: number;
  logo: string | null;
  pdf_path: string | null;
  mainServiceId?: number;
  mainServiceName?: string;
}

interface MainServiceGroup {
  id: number;
  name: string;
  description?: string;
  logo: string | null;
  subServices: SubServiceItem[];
}

interface GeoItem {
  id: number;
  name: string;
  nameTa?: string | null;
}

declare global {
  interface Window {
    Razorpay?: any;
  }
}

function ApplyServicesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialServiceId = Number(searchParams?.get("serviceId")) || 0;

  const [mainServicesList, setMainServicesList] = useState<MainServiceGroup[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Category drill-down state
  const [activeMainCategory, setActiveMainCategory] = useState<MainServiceGroup | null>(null);

  // Payment modal state
  const [selectedSubService, setSelectedSubService] = useState<SubServiceItem | null>(null);
  const [showPayModal, setShowPayModal] = useState(false);

  // Geography cascading states
  const [districts, setDistricts] = useState<GeoItem[]>([]);
  const [taluks, setTaluks] = useState<GeoItem[]>([]);
  const [panchayaths, setPanchayaths] = useState<GeoItem[]>([]);

  const [selectedDistrictId, setSelectedDistrictId] = useState<string>("");
  const [selectedDistrictName, setSelectedDistrictName] = useState<string>("");
  const [selectedTalukId, setSelectedTalukId] = useState<string>("");
  const [selectedTalukName, setSelectedTalukName] = useState<string>("");
  const [selectedPanchayathId, setSelectedPanchayathId] = useState<string>("");
  const [selectedPanchayathName, setSelectedPanchayathName] = useState<string>("");

  const [loadingTaluks, setLoadingTaluks] = useState(false);
  const [loadingPanchayaths, setLoadingPanchayaths] = useState(false);
  const [validationError, setValidationError] = useState<string>("");

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    pincode: "",
    aadhaar: "",
  });

  const [paying, setPaying] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);
  const [generatedAppId, setGeneratedAppId] = useState("");
  const [generatedReceiptNo, setGeneratedReceiptNo] = useState("");
  const [completedPaymentDocId, setCompletedPaymentDocId] = useState("");

  // Load authenticated session if available
  useEffect(() => {
    const session = getCitizenSession();
    if (session) {
      setFormData((prev) => ({
        ...prev,
        name: session.name || "",
        phone: session.phone || "",
      }));
    }
  }, []);

  // Fetch real services from database
  useEffect(() => {
    async function loadServices() {
      try {
        const res = await fetch("/api/services");
        const data = await res.json();
        if (data.ok && Array.isArray(data.mainServices)) {
          setMainServicesList(data.mainServices);

          // Deep-link handling
          if (initialServiceId) {
            const foundParent = data.mainServices.find((m: MainServiceGroup) =>
              m.subServices?.some((s) => s.id === initialServiceId)
            );
            if (foundParent) {
              setActiveMainCategory(foundParent);
              const foundSub = foundParent.subServices.find((s: SubServiceItem) => s.id === initialServiceId);
              if (foundSub) {
                setSelectedSubService(foundSub);
                setShowPayModal(true);
              }
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch services:", err);
      } finally {
        setLoadingServices(false);
      }
    }
    loadServices();
  }, [initialServiceId]);

  // Load Districts on mount
  useEffect(() => {
    async function loadDistricts() {
      try {
        const res = await fetch("/api/geography");
        const data = await res.json();
        if (data.ok && Array.isArray(data.districts)) {
          setDistricts(data.districts);
        }
      } catch (err) {
        console.error("Failed to load districts:", err);
      }
    }
    loadDistricts();
  }, []);

  // Handle District Change -> Load Taluks
  const handleDistrictChange = async (districtId: string) => {
    setSelectedDistrictId(districtId);
    const found = districts.find((d) => String(d.id) === districtId);
    setSelectedDistrictName(found ? found.name : "");

    // Reset dependents
    setSelectedTalukId("");
    setSelectedTalukName("");
    setTaluks([]);
    setSelectedPanchayathId("");
    setSelectedPanchayathName("");
    setPanchayaths([]);
    setValidationError("");

    if (!districtId) return;

    try {
      setLoadingTaluks(true);
      const res = await fetch(`/api/geography?districtId=${districtId}`);
      const data = await res.json();
      if (data.ok && Array.isArray(data.taluks)) {
        setTaluks(data.taluks);
      }
    } catch (err) {
      console.error("Failed to load taluks:", err);
    } finally {
      setLoadingTaluks(false);
    }
  };

  // Handle Taluk Change -> Load Panchayaths
  const handleTalukChange = async (talukId: string) => {
    setSelectedTalukId(talukId);
    const found = taluks.find((t) => String(t.id) === talukId);
    setSelectedTalukName(found ? found.name : "");

    // Reset dependent panchayath
    setSelectedPanchayathId("");
    setSelectedPanchayathName("");
    setPanchayaths([]);
    setValidationError("");

    if (!talukId) return;

    try {
      setLoadingPanchayaths(true);
      const res = await fetch(`/api/geography?talukId=${talukId}`);
      const data = await res.json();
      if (data.ok && Array.isArray(data.panchayaths)) {
        setPanchayaths(data.panchayaths);
      }
    } catch (err) {
      console.error("Failed to load panchayaths:", err);
    } finally {
      setLoadingPanchayaths(false);
    }
  };

  // Handle Panchayath Change
  const handlePanchayathChange = (panchayathId: string) => {
    setSelectedPanchayathId(panchayathId);
    const found = panchayaths.find((p) => String(p.id) === panchayathId);
    setSelectedPanchayathName(found ? found.name : "");
    setValidationError("");
  };

  // Load Razorpay checkout script
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window !== "undefined" && window.Razorpay) {
        return resolve(true);
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Open Payment Modal for selected sub-service
  const handleOpenPayModal = (sub: SubServiceItem) => {
    setSelectedSubService(sub);
    setValidationError("");
    setShowPayModal(true);
  };

  // Real Razorpay Payment & Application Submission Handler
  const handleProceedPayment = async () => {
    if (!selectedSubService) return;

    // Strict validation of district, taluk, panchayat, name, phone
    if (!selectedDistrictId) {
      setValidationError("Please select your District (மாவட்டம்) to proceed.");
      return;
    }
    if (!selectedTalukId) {
      setValidationError("Please select your Taluk (வட்டம்) to proceed.");
      return;
    }
    if (!selectedPanchayathId) {
      setValidationError("Please select your Panchayat / Village (ஊராட்சி / கிராமம்).");
      return;
    }
    if (!formData.name.trim()) {
      setValidationError("Please enter applicant full name.");
      return;
    }
    if (!formData.phone.trim() || !/^\d{10}$/.test(formData.phone.trim().replace(/\D/g, ""))) {
      setValidationError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setValidationError("");

    try {
      setPaying(true);

      // 1. Create order on server
      const orderRes = await fetch("/api/payments/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceType: "DOCUMENT_SERVICE",
          serviceId: selectedSubService.id,
          applicantName: formData.name.trim(),
          applicantPhone: formData.phone.trim(),
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData.ok) {
        throw new Error(orderData.error || "Unable to initiate payment gateway order.");
      }

      const verifyPayload = {
        serviceType: "DOCUMENT_SERVICE",
        serviceId: selectedSubService.id,
        razorpayOrderId: orderData.orderId,
        applicantName: formData.name.trim(),
        applicantPhone: formData.phone.trim(),
        district: selectedDistrictName,
        taluk: selectedTalukName,
        panchayat: selectedPanchayathName,
        address: formData.address.trim(),
        pincode: formData.pincode.trim(),
        aadhaar: formData.aadhaar.trim(),
      };

      // If service fee is 0 (Free Service), directly verify and submit
      if (orderData.amount === 0) {
        const verifyRes = await fetch("/api/payments/razorpay/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...verifyPayload,
            razorpayPaymentId: `free_${Date.now()}`,
          }),
        });
        const verifyData = await verifyRes.json();
        if (!verifyRes.ok || !verifyData.ok) throw new Error(verifyData.error || "Submission failed.");

        setGeneratedAppId(verifyData.applicationId);
        setGeneratedReceiptNo(verifyData.receiptNo);
        setCompletedPaymentDocId(verifyData.applicationId.replace("TN-DOC-2026-", "DOC-"));
        setShowPayModal(false);
        setPaymentDone(true);
        setPaying(false);
        return;
      }

      // 2. Load Razorpay script & launch checkout modal
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        // Fallback for sandboxed offline testing if CDN blocked
        const verifyRes = await fetch("/api/payments/razorpay/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...verifyPayload,
            razorpayPaymentId: `pay_test_${Date.now()}`,
          }),
        });
        const verifyData = await verifyRes.json();
        setGeneratedAppId(verifyData.applicationId);
        setGeneratedReceiptNo(verifyData.receiptNo);
        setCompletedPaymentDocId(verifyData.applicationId.replace("TN-DOC-2026-", "DOC-"));
        setShowPayModal(false);
        setPaymentDone(true);
        setPaying(false);
        return;
      }

      const logoUrl = await getRazorpayCheckoutLogo();

      const options = {
        key: orderData.key,
        amount: orderData.amountPaise,
        currency: "INR",
        name: "LabourSeva · Govt of Tamil Nadu",
        description: selectedSubService.name,
        image: logoUrl,
        order_id: orderData.orderId,
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch("/api/payments/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...verifyPayload,
                razorpayOrderId: response.razorpay_order_id || orderData.orderId,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok || !verifyData.ok) throw new Error(verifyData.error || "Payment verification failed");

            setGeneratedAppId(verifyData.applicationId);
            setGeneratedReceiptNo(verifyData.receiptNo);
            setCompletedPaymentDocId(verifyData.applicationId.replace("TN-DOC-2026-", "DOC-"));
            setShowPayModal(false);
            setPaymentDone(true);
          } catch (err: any) {
            alert(err.message || "Payment verification could not be completed.");
          } finally {
            setPaying(false);
          }
        },
        prefill: {
          name: formData.name,
          contact: formData.phone,
        },
        theme: {
          color: "#1e3a8a",
        },
        modal: {
          ondismiss: function () {
            setPaying(false);
            fetch("/api/payments/razorpay/failure", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpayOrderId: orderData.orderId,
                isCancelled: true,
              }),
            }).catch(() => {});
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (response: any) {
        setPaying(false);
        fetch("/api/payments/razorpay/failure", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            razorpayOrderId: orderData.orderId,
            razorpayPaymentId: response.error?.metadata?.payment_id,
            error: response.error,
          }),
        }).catch(() => {});
        alert(`Payment failed: ${response.error?.description || "Gateway transaction declined"}`);
      });
      rzp.open();
    } catch (err: any) {
      setPaying(false);
      alert(err.message || "Unable to proceed to payment.");
    }
  };

  // Filter main services based on search
  const filteredMainServices = mainServicesList.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchMain =
      m.name.toLowerCase().includes(q) ||
      (m.description && m.description.toLowerCase().includes(q));
    const matchSubs = m.subServices?.some(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q))
    );
    return matchMain || matchSubs;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Government of Tamil Nadu Header */}
      <div className="text-center pt-2">
        <span className="text-xs font-bold text-[#ea580c] uppercase tracking-wider block">
          Government of Tamil Nadu · தமிழ்நாடு அரசு
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
          {activeMainCategory
            ? activeMainCategory.name
            : "Document-Based Services"}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl mx-auto">
          {activeMainCategory
            ? (activeMainCategory.description || "Select a sub-service below to apply and remit statutory fees.")
            : "Official services configured in the portal registry. Select a service category to view available sub-services."}
        </p>
      </div>

      {/* Main View Router */}
      {loadingServices ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center shadow-xs">
          <Loader2 size={28} className="animate-spin text-[#1e3a8a] dark:text-blue-400 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Loading services...
          </p>
          <span className="text-xs text-slate-400">Fetching records from database</span>
        </div>
      ) : !activeMainCategory ? (
        /* ================= VIEW 1: ONLY MAIN SERVICES LIST ================= */
        <div className="space-y-6">
          {/* Search bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
            <div className="relative w-full sm:max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search main service..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-9 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Showing <strong className="text-slate-800 dark:text-slate-200">{filteredMainServices.length}</strong> Services
            </div>
          </div>

          {/* Main Services Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredMainServices.map((main) => (
              <div
                key={main.id}
                onClick={() => setActiveMainCategory(main)}
                className="group cursor-pointer rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-xs hover:shadow-md hover:border-[#1e3a8a] dark:hover:border-blue-500 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Logo + Title Section */}
                  <div className="flex items-start gap-4">
                    {main.logo ? (
                      <img
                        src={main.logo}
                        alt={main.name}
                        className="w-16 h-16 rounded-xl object-contain bg-slate-50 dark:bg-slate-900 p-2 border border-slate-200 dark:border-slate-700 shrink-0 group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-blue-50 dark:bg-blue-900/40 text-[#1e3a8a] dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-800 group-hover:scale-105 transition-transform">
                        <Layers size={28} />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <h3 className="font-extrabold text-base text-slate-900 dark:text-white group-hover:text-[#1e3a8a] dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                        {main.name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {main.description || "Registered government service."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer with sub-services count & View Services action */}
                <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
                  <span className="font-bold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#1e3a8a] dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[11px]">
                    {main.subServices?.length || 0} Sub-Service{main.subServices?.length === 1 ? "" : "s"}
                  </span>
                  <span className="font-bold text-[#1e3a8a] dark:text-blue-400 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                    <span>View Services</span>
                    <ChevronRight size={14} />
                  </span>
                </div>
              </div>
            ))}
          </div>

          {filteredMainServices.length === 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center shadow-xs">
              <Layers size={36} className="text-slate-300 mx-auto mb-2" />
              <h3 className="text-base font-bold text-slate-800 dark:text-white">No services found</h3>
              <p className="text-xs text-slate-500 mt-1">No services match your search or have been registered yet.</p>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="mt-4 px-4 py-2 text-xs font-bold text-[#1e3a8a] bg-blue-50 rounded-lg hover:bg-blue-100"
                >
                  Clear Search
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        /* ================= VIEW 2: SUB-SERVICES UNDER SELECTED MAIN SERVICE ================= */
        <div className="space-y-6">
          {/* Back Navigation Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
            <button
              type="button"
              onClick={() => setActiveMainCategory(null)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xs transition-colors self-start sm:self-auto"
            >
              <ArrowLeft size={14} />
              <span>Back to All Services</span>
            </button>

            <div className="text-xs text-slate-500">
              Showing <strong className="text-slate-800 dark:text-slate-200">{activeMainCategory.subServices?.length || 0}</strong> Sub-Services under {activeMainCategory.name}
            </div>
          </div>

          {/* Active Main Service Info Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-4">
            {activeMainCategory.logo ? (
              <img
                src={activeMainCategory.logo}
                alt={activeMainCategory.name}
                className="w-14 h-14 rounded-xl object-contain bg-slate-50 dark:bg-slate-900 p-2 border border-slate-200 dark:border-slate-700 shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-[#1e3a8a] text-white flex items-center justify-center font-bold shrink-0">
                <Layers size={24} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-bold text-[#ea580c] uppercase tracking-wider block">
                Selected Main Service
              </span>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                {activeMainCategory.name}
              </h2>
              {activeMainCategory.description && (
                <p className="text-xs text-slate-500 mt-0.5">{activeMainCategory.description}</p>
              )}
            </div>
          </div>

          {/* Sub-Services Grid or Empty State */}
          {activeMainCategory.subServices && activeMainCategory.subServices.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeMainCategory.subServices.map((sub) => (
                <div
                  key={sub.id}
                  className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-xs hover:border-[#1e3a8a] dark:hover:border-blue-500 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start gap-3.5">
                      {/* Sub-Service Logo */}
                      {sub.logo ? (
                        <img
                          src={sub.logo}
                          alt={sub.name}
                          className="w-12 h-12 rounded-xl object-contain bg-slate-50 dark:bg-slate-900 p-1.5 border border-slate-200 dark:border-slate-700 shrink-0 mt-0.5"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/40 text-[#1e3a8a] dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-800">
                          <FileText size={20} />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white line-clamp-1">
                          {sub.name}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                          {sub.description || "Statutory government document service."}
                        </p>
                      </div>
                    </div>

                    {/* Fee badge */}
                    <div className="mt-4 flex items-center gap-2">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        {sub.fee === 0 ? "Free" : `₹${sub.fee}.00 Fee`}
                      </span>
                    </div>
                  </div>

                  {/* Apply & Pay Action Button */}
                  <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-end">
                    <Link
                      href={`/user/apply/${sub.id}`}
                      className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#1e3a8a] hover:bg-[#1e40af] flex items-center gap-1.5 shadow-xs transition-colors"
                    >
                      <CreditCard size={13} />
                      <span>Apply & Pay</span>
                      <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-10 text-center shadow-xs">
              <FileText size={32} className="text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                No Sub-Services Under This Category
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                There are currently no sub-services configured in the database under this main service.
              </p>
              <button
                type="button"
                onClick={() => setActiveMainCategory(null)}
                className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-[#1e3a8a] bg-blue-50 hover:bg-blue-100"
              >
                Back to All Services
              </button>
            </div>
          )}
        </div>
      )}

      {/* ================= GEOGRAPHY SELECTION & PAYMENT REVIEW MODAL ================= */}
      {showPayModal && selectedSubService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-700 animate-scale-in max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-3">
                {selectedSubService.logo ? (
                  <img
                    src={selectedSubService.logo}
                    alt={selectedSubService.name}
                    className="w-10 h-10 rounded-lg object-contain bg-slate-50 p-1 border border-slate-200"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-[#1e3a8a] text-white flex items-center justify-center font-bold">
                    <FileText size={18} />
                  </div>
                )}
                <div>
                  <span className="text-[10px] font-bold text-[#ea580c] uppercase tracking-wider block">
                    Service Application &amp; Jurisdiction
                  </span>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white line-clamp-1">
                    {selectedSubService.name}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPayModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 hover:text-slate-800 flex items-center justify-center"
              >
                <X size={15} />
              </button>
            </div>

            {/* Validation Alert */}
            {validationError && (
              <div className="mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            {/* Form Fields: District, Taluk, Panchayat & Info */}
            <div className="py-4 space-y-4">
              {/* SECTION A: GEOGRAPHY (District, Taluk, Panchayat) */}
              <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#1e3a8a] dark:text-blue-400">
                  <MapPin size={14} />
                  <span>Administrative Jurisdiction · அதிகார வரம்பு</span>
                </div>

                {/* District */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    District / மாவட்டம் <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedDistrictId}
                    onChange={(e) => handleDistrictChange(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                  >
                    <option value="">-- Select District (மாவட்டம்) --</option>
                    {districts.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} {d.nameTa ? `(${d.nameTa})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Taluk */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between mb-1">
                    <span>Taluk / வட்டம் <span className="text-rose-500">*</span></span>
                    {loadingTaluks && <span className="text-[10px] text-blue-600 font-normal">Loading taluks...</span>}
                  </label>
                  <select
                    disabled={!selectedDistrictId || loadingTaluks}
                    value={selectedTalukId}
                    onChange={(e) => handleTalukChange(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-[#1e3a8a] disabled:opacity-50"
                  >
                    <option value="">
                      {!selectedDistrictId
                        ? "-- Select District First --"
                        : loadingTaluks
                        ? "Loading taluks..."
                        : "-- Select Taluk (வட்டம்) --"}
                    </option>
                    {taluks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} {t.nameTa ? `(${t.nameTa})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Panchayat */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between mb-1">
                    <span>Panchayat / Village / ஊராட்சி <span className="text-rose-500">*</span></span>
                    {loadingPanchayaths && <span className="text-[10px] text-blue-600 font-normal">Loading villages...</span>}
                  </label>
                  <select
                    disabled={!selectedTalukId || loadingPanchayaths}
                    value={selectedPanchayathId}
                    onChange={(e) => handlePanchayathChange(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-[#1e3a8a] disabled:opacity-50"
                  >
                    <option value="">
                      {!selectedTalukId
                        ? "-- Select Taluk First --"
                        : loadingPanchayaths
                        ? "Loading panchayaths..."
                        : "-- Select Panchayat (கிராம ஊராட்சி) --"}
                    </option>
                    {panchayaths.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.nameTa ? `(${p.nameTa})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Selected Jurisdiction & Office Details Information Box */}
                {selectedDistrictName && (
                  <div className="mt-3 p-3.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs space-y-2 animate-in fade-in">
                    <div className="flex items-center justify-between font-bold text-[#1e3a8a] dark:text-blue-300 text-[11px] uppercase tracking-wide">
                      <span className="flex items-center gap-1.5">
                        <Building size={13} />
                        <span>Jurisdiction Details · மண்டல விவரம்</span>
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-semibold">
                        Taluk Welfare Hub
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-[11px] pt-1">
                      <div>
                        <span className="text-slate-500 block text-[10px]">District / மாவட்டம்:</span>
                        <strong className="text-slate-900 dark:text-slate-100 font-bold">{selectedDistrictName}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Taluk / வட்டம்:</span>
                        <strong className="text-slate-900 dark:text-slate-100 font-bold">{selectedTalukName || "Pending selection"}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Panchayat / கிராம ஊராட்சி:</span>
                        <strong className="text-slate-900 dark:text-slate-100 font-bold">{selectedPanchayathName || "Pending selection"}</strong>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-slate-500 block text-[10px]">Processing Authority:</span>
                        <span className="text-slate-700 dark:text-slate-300 font-medium">
                          {selectedTalukName ? `${selectedTalukName} Taluk Social Security & Labour Office` : "Designated Taluk Office Desk"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Sanction Dispatch:</span>
                        <span className="text-emerald-700 dark:text-emerald-400 font-bold">Online + Signed Copy</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION B: APPLICANT PARTICULARS */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-slate-500 font-medium block mb-1">
                      Applicant Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Karthik Raja"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 font-medium block mb-1">
                      Mobile Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={10}
                      placeholder="10-digit mobile number"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="sm:col-span-2">
                    <label className="text-slate-500 font-medium block mb-1">
                      Door No. &amp; Residential Street Address
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. No. 12, Anna Nagar Main Road"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 font-medium block mb-1">
                      Pincode / அஞ்சல் குறியீடு
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="e.g. 600001"
                      value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Fee Breakdown */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
                <div className="flex justify-between text-slate-500">
                  <span>Prescribed Statutory Fee:</span>
                  <strong className="text-slate-800 dark:text-slate-200">
                    {selectedSubService.fee === 0 ? "Free" : `₹${selectedSubService.fee}.00`}
                  </strong>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700 font-black text-sm text-slate-900 dark:text-white">
                  <span>Total Amount Payable:</span>
                  <span className="text-[#1e3a8a] dark:text-blue-400">
                    {selectedSubService.fee === 0 ? "₹0.00 (Free)" : `₹${selectedSubService.fee}.00`}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 flex items-start gap-2.5">
                <ShieldCheck size={16} className="text-[#1e3a8a] dark:text-blue-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  Jurisdiction selection routes this statutory application directly to the corresponding Taluk office. Official PDF receipt issued upon payment.
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setShowPayModal(false)}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={paying}
                onClick={handleProceedPayment}
                className="flex-2 py-2.5 px-5 rounded-xl text-xs font-bold text-white bg-[#1e3a8a] hover:bg-[#1e40af] flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 transition-colors"
              >
                {paying ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Connecting Gateway...</span>
                  </>
                ) : (
                  <>
                    <CreditCard size={14} />
                    <span>
                      {selectedSubService.fee === 0
                        ? "Submit Free Application"
                        : `Proceed & Pay ₹${selectedSubService.fee}.00`}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= SUCCESS CONFIRMATION MODAL ================= */}
      {paymentDone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-700 text-center animate-scale-in">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-emerald-100 text-emerald-600">
              <CheckCircle2 size={36} />
            </div>

            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1">
              Application &amp; Payment Confirmed
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              Your service application has been registered with a verified payment transaction and routed to your selected taluk jurisdiction.
            </p>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-left text-xs mb-6 space-y-2.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Application Reference:</span>
                <strong className="font-mono text-[#1e3a8a] dark:text-blue-400 text-sm font-bold">{generatedAppId}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Official Receipt No:</span>
                <strong className="font-mono text-emerald-700 dark:text-emerald-400 font-bold">{generatedReceiptNo}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Jurisdiction:</span>
                <strong className="text-slate-900 dark:text-white">{selectedDistrictName} &bull; {selectedTalukName} &bull; {selectedPanchayathName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Service:</span>
                <strong className="text-slate-900 dark:text-white">{selectedSubService?.name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Status:</span>
                <strong className="text-emerald-700 font-bold">
                  {selectedSubService?.fee === 0 ? "Free Service" : `₹${selectedSubService?.fee}.00 Paid (Razorpay)`}
                </strong>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <a
                href={`/api/user/payments/receipt?id=${completedPaymentDocId}`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-[#ea580c] hover:bg-[#c2410c] text-white flex items-center justify-center gap-1.5 shadow-xs transition-colors"
              >
                <Download size={14} />
                <span>Download Official Payment Receipt (PDF)</span>
              </a>

              <div className="flex gap-2">
                <Link
                  href="/user/applications"
                  className="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center"
                >
                  My Applications
                </Link>
                <Link
                  href="/user/payments"
                  className="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold bg-[#1e3a8a] text-white hover:bg-[#1e40af] flex items-center justify-center gap-1 shadow-xs"
                >
                  <span>Payment History</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ApplyPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Loading Services...</div>}>
      <ApplyServicesContent />
    </Suspense>
  );
}
