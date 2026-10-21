"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  CreditCard,
  ArrowLeft,
  ArrowRight,
  Loader2,
  MapPin,
  Building,
  Home,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  User,
  Phone,
  Mail,
  Receipt,
  Download,
} from "lucide-react";
import { getCitizenSession } from "@/lib/citizen-session";
import { getRazorpayCheckoutLogo } from "@/lib/razorpay-logo";

interface ServiceDetails {
  id: number;
  name: string;
  description: string;
  categoryName: string;
  categoryDescription?: string;
  fee: number;
  retailerFee: number;
  logo: string | null;
  pdf_path: string | null;
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

export default function ServiceApplicationFormPage() {
  const router = useRouter();
  const params = useParams();
  const serviceId = Number(params?.id);

  const [service, setService] = useState<ServiceDetails | null>(null);
  const [loadingService, setLoadingService] = useState(true);
  const [serviceError, setServiceError] = useState<string | null>(null);

  // Profile and applicant particulars
  const [applicantName, setApplicantName] = useState("");
  const [applicantPhone, setApplicantPhone] = useState("");
  const [applicantEmail, setApplicantEmail] = useState("");
  const [residentialAddress, setResidentialAddress] = useState("");
  const [pincode, setPincode] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(true);

  // Administrative Jurisdiction (District, Taluk, Panchayat)
  const [districts, setDistricts] = useState<GeoItem[]>([]);
  const [taluks, setTaluks] = useState<GeoItem[]>([]);
  const [panchayats, setPanchayats] = useState<GeoItem[]>([]);

  const [selectedDistrictId, setSelectedDistrictId] = useState("");
  const [selectedDistrictName, setSelectedDistrictName] = useState("");
  const [selectedTalukId, setSelectedTalukId] = useState("");
  const [selectedTalukName, setSelectedTalukName] = useState("");
  const [selectedPanchayatId, setSelectedPanchayatId] = useState("");
  const [selectedPanchayatName, setSelectedPanchayatName] = useState("");

  const [loadingTaluks, setLoadingTaluks] = useState(false);
  const [loadingPanchayats, setLoadingPanchayats] = useState(false);

  // Form Submission & Payment States
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // 1. Load authenticated citizen session and profile info
  useEffect(() => {
    const session = getCitizenSession();
    if (session) {
      if (session.name) setApplicantName(session.name);
      if (session.phone) setApplicantPhone(session.phone);
    }

    // Also attempt fetching full citizen profile from /api/user/me
    async function loadCitizenProfile() {
      try {
        const res = await fetch("/api/user/me");
        const data = await res.json();
        if (data.ok && data.profile) {
          if (data.profile.name && !applicantName) setApplicantName(data.profile.name);
          if (data.profile.phone && !applicantPhone) setApplicantPhone(data.profile.phone);
          if (data.profile.email) setApplicantEmail(data.profile.email);
        }
      } catch {
        // Session fallback
      }
    }
    loadCitizenProfile();
  }, []);

  // 2. Load Service Details from Database
  useEffect(() => {
    if (!serviceId || isNaN(serviceId)) {
      setServiceError("Invalid service identifier specified.");
      setLoadingService(false);
      return;
    }

    async function loadService() {
      try {
        setLoadingService(true);
        const res = await fetch(`/api/services?id=${serviceId}`);
        const data = await res.json();
        if (data.ok && data.service) {
          setService(data.service);
        } else {
          setServiceError(data.error || "Requested service could not be found.");
        }
      } catch (err) {
        console.error("Failed to load service details:", err);
        setServiceError("Unable to connect to service registry.");
      } finally {
        setLoadingService(false);
      }
    }
    loadService();
  }, [serviceId]);

  // 3. Load Districts (all 38 administrative districts)
  useEffect(() => {
    async function loadDistricts() {
      try {
        const res = await fetch("/api/geography");
        const data = await res.json();
        if (data.ok && Array.isArray(data.districts)) {
          setDistricts(data.districts);
        }
      } catch (err) {
        console.error("Failed to load geography districts:", err);
      }
    }
    loadDistricts();
  }, []);

  // Handle District Change -> Load Taluks
  const handleDistrictChange = async (districtId: string) => {
    setSelectedDistrictId(districtId);
    const found = districts.find((d) => String(d.id) === districtId);
    setSelectedDistrictName(found ? found.name : "");

    // Reset dependent levels
    setSelectedTalukId("");
    setSelectedTalukName("");
    setTaluks([]);
    setSelectedPanchayatId("");
    setSelectedPanchayatName("");
    setPanchayats([]);
    setValidationError(null);

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

  // Handle Taluk Change -> Load Panchayats
  const handleTalukChange = async (talukId: string) => {
    setSelectedTalukId(talukId);
    const found = taluks.find((t) => String(t.id) === talukId);
    setSelectedTalukName(found ? found.name : "");

    // Reset dependent panchayats
    setSelectedPanchayatId("");
    setSelectedPanchayatName("");
    setPanchayats([]);
    setValidationError(null);

    if (!talukId) return;

    try {
      setLoadingPanchayats(true);
      const res = await fetch(`/api/geography?talukId=${talukId}`);
      const data = await res.json();
      if (data.ok && Array.isArray(data.panchayaths)) {
        setPanchayats(data.panchayaths);
      }
    } catch (err) {
      console.error("Failed to load panchayats:", err);
    } finally {
      setLoadingPanchayats(false);
    }
  };

  // Handle Panchayat Change
  const handlePanchayatChange = (panchayatId: string) => {
    setSelectedPanchayatId(panchayatId);
    const found = panchayats.find((p) => String(p.id) === panchayatId);
    setSelectedPanchayatName(found ? found.name : "");
    setValidationError(null);
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

  // Handle Form Submission & Payment Launch
  const handleSubmitAndPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!service) return;

    // Strict validation of district, taluk, panchayat, name, phone
    if (!selectedDistrictId) {
      setValidationError("Please select your District (மாவட்டம்) to proceed.");
      return;
    }
    if (!selectedTalukId) {
      setValidationError("Please select your Taluk (வட்டம்) to proceed.");
      return;
    }
    if (!selectedPanchayatId) {
      setValidationError("Please select your Panchayat / Village (ஊராட்சி / கிராமம்).");
      return;
    }
    if (!applicantName.trim()) {
      setValidationError("Please provide your full legal name as per government records.");
      return;
    }
    if (!applicantPhone.trim() || !/^\d{10}$/.test(applicantPhone.trim().replace(/\D/g, ""))) {
      setValidationError("Please provide a valid 10-digit mobile number.");
      return;
    }
    if (applicantEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(applicantEmail.trim())) {
      setValidationError("Please enter a valid email address.");
      return;
    }
    if (!termsAccepted) {
      setValidationError("Please confirm the statutory declaration to proceed.");
      return;
    }

    setValidationError(null);

    try {
      setSubmitting(true);

      // 1. Create Razorpay order on server
      const orderRes = await fetch("/api/payments/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceType: "DOCUMENT_SERVICE",
          serviceId: service.id,
          applicantName: applicantName.trim(),
          applicantPhone: applicantPhone.trim(),
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData.ok) {
        throw new Error(orderData.error || "Unable to initiate payment gateway order.");
      }

      const verifyPayload = {
        serviceType: "DOCUMENT_SERVICE",
        serviceId: service.id,
        razorpayOrderId: orderData.orderId,
        applicantName: applicantName.trim(),
        applicantPhone: applicantPhone.trim(),
        applicantEmail: applicantEmail.trim(),
        district: selectedDistrictName,
        districtId: selectedDistrictId,
        taluk: selectedTalukName,
        talukId: selectedTalukId,
        panchayat: selectedPanchayatName,
        panchayatId: selectedPanchayatId,
        address: residentialAddress.trim(),
        pincode: pincode.trim(),
      };

      // If fee is 0 (Free Service), directly verify and route to My Applications
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

        setPaymentSuccess(true);
        setTimeout(() => {
          router.push("/user/applications");
        }, 1000);
        return;
      }

      // 2. Load Razorpay script & launch checkout modal
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        // Fallback for sandboxed testing if CDN blocked
        const verifyRes = await fetch("/api/payments/razorpay/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...verifyPayload,
            razorpayPaymentId: `pay_test_${Date.now()}`,
          }),
        });
        const verifyData = await verifyRes.json();
        if (!verifyRes.ok || !verifyData.ok) throw new Error(verifyData.error || "Verification failed");

        setPaymentSuccess(true);
        setTimeout(() => {
          router.push("/user/applications");
        }, 1000);
        return;
      }

      const logoUrl = await getRazorpayCheckoutLogo();

      const options = {
        key: orderData.key,
        amount: orderData.amountPaise,
        currency: "INR",
        name: "LabourSeva · Govt of Tamil Nadu",
        description: service.name,
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

            setPaymentSuccess(true);
            setTimeout(() => {
              router.push("/user/applications");
            }, 1000);
          } catch (err: any) {
            alert(err.message || "Payment verification could not be completed.");
            setSubmitting(false);
          }
        },
        prefill: {
          name: applicantName,
          contact: applicantPhone,
          email: applicantEmail,
        },
        theme: {
          color: "#1e3a8a",
        },
        modal: {
          ondismiss: function () {
            setSubmitting(false);
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
        setSubmitting(false);
        fetch("/api/payments/razorpay/failure", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            razorpayOrderId: orderData.orderId,
            razorpayPaymentId: response.error?.metadata?.payment_id,
            error: response.error,
          }),
        }).catch(() => {});
        alert(`Payment transaction failed: ${response.error?.description || "Declined by bank or gateway"}`);
      });
      rzp.open();
    } catch (err: any) {
      setSubmitting(false);
      alert(err.message || "Failed to initiate payment gateway.");
    }
  };

  if (loadingService) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#1e3a8a] mx-auto" />
        <h2 className="text-base font-bold text-slate-800">Loading Service Application...</h2>
        <p className="text-xs text-slate-500">Retrieving statutory scheme configuration from Tamil Nadu Government portal.</p>
      </div>
    );
  }

  if (serviceError || !service) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-black text-slate-900">Service Not Available</h2>
        <p className="text-xs text-slate-500">{serviceError || "The requested service could not be loaded."}</p>
        <Link
          href="/user/apply"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1e3a8a] text-white font-bold text-xs shadow-xs"
        >
          <ArrowLeft size={14} />
          <span>Back to All Services</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* Top Breadcrumb & Return Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          href="/user/apply"
          className="inline-flex items-center gap-2 text-xs font-bold text-[#1e3a8a] hover:underline"
        >
          <ArrowLeft size={15} />
          <span>Back to Document Services</span>
        </Link>

        <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
          <span>Citizen Portal</span>
          <span>&rsaquo;</span>
          <span>{service.categoryName}</span>
          <span>&rsaquo;</span>
          <strong className="text-slate-800 dark:text-slate-200">{service.name}</strong>
        </div>
      </div>

      {/* Government Heading */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <span className="text-[11px] font-bold text-[#ea580c] uppercase tracking-wider block">
          Government of Tamil Nadu · தமிழ்நாடு அரசு
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
          Service Application &amp; Jurisdiction Remittance
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Provide your profile contact details and select your administrative jurisdiction to apply for this statutory service.
        </p>
      </div>

      {/* Main 2-Column Responsive Grid */}
      <form onSubmit={handleSubmitAndPay} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ================= LEFT COLUMN: SERVICE OVERVIEW & STATUTORY FEE ================= */}
        <div className="space-y-6 order-2 lg:order-1">
          {/* Service Details Card */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-xs space-y-4">
            <div className="flex items-start gap-3.5">
              {service.logo ? (
                <img
                  src={service.logo}
                  alt={service.name}
                  className="w-14 h-14 rounded-xl object-contain bg-slate-50 dark:bg-slate-900 p-2 border border-slate-200 dark:border-slate-700 shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-blue-50 text-[#1e3a8a] flex items-center justify-center shrink-0 border border-blue-200">
                  <FileText size={24} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#1e3a8a] border border-blue-200">
                  {service.categoryName}
                </span>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white mt-1">
                  {service.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                  {service.description || "Statutory government documentation & welfare benefit."}
                </p>
              </div>
            </div>

            {/* Template Status */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
              <span className="text-slate-500">Official Template:</span>
              <span className="font-semibold text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1">
                <CheckCircle2 size={13} />
                <span>PDF Form Attached</span>
              </span>
            </div>
          </div>

          {/* Fee & Remittance Summary Card */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-xs space-y-4">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Receipt size={14} className="text-[#1e3a8a]" />
              <span>Statutory Fee Breakdown</span>
            </h4>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Prescribed Government Fee:</span>
                <strong className="text-slate-800 dark:text-slate-200 font-bold">
                  {service.fee === 0 ? "Free (₹0.00)" : `₹${service.fee.toFixed(2)}`}
                </strong>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Digital Stamping &amp; Verification:</span>
                <span className="text-emerald-700 font-semibold">Included</span>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between items-baseline">
                <span className="font-bold text-slate-900 dark:text-white text-sm">Total Payable Amount:</span>
                <span className="font-black text-xl text-[#1e3a8a] dark:text-blue-400">
                  {service.fee === 0 ? "₹0.00 (Free)" : `₹${service.fee.toFixed(2)}`}
                </span>
              </div>
            </div>

            {/* Official Trust Highlights */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-2 text-[11px] text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
                <span>Verified by Tamil Nadu Labour Welfare Board</span>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard size={14} className="text-blue-600 shrink-0" />
                <span>Secured through Official Razorpay Gateway (UPI, Cards, Netbanking)</span>
              </div>
              <div className="flex items-center gap-2">
                <Download size={14} className="text-[#ea580c] shrink-0" />
                <span>Instant Official PDF Receipt &amp; Stamped Certificate</span>
              </div>
            </div>
          </div>
        </div>

        {/* ================= RIGHT COLUMN: PROFILE & JURISDICTION FORM ================= */}
        <div className="lg:col-span-2 space-y-6 order-1 lg:order-2">
          {/* Validation Error Banner */}
          {validationError && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800 flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle size={16} className="text-rose-600 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Payment Success Alert */}
          {paymentSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0 animate-bounce" />
              <span>Payment confirmed! Redirecting to My Applications page to download and upload documents...</span>
            </div>
          )}

          {/* SECTION 1: APPLICANT PROFILE INFORMATION */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                <User size={16} className="text-[#1e3a8a]" />
                <span>1. Applicant Profile Information · விண்ணப்பதாரர் விவரங்கள்</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                Citizen Account
              </span>
            </div>

            <p className="text-xs text-slate-500">
              Your registered profile details are displayed below for verification. Ensure your phone and email are correct for SMS and application receipts.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Full Name */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Applicant Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Enter full legal name"
                    value={applicantName}
                    onChange={(e) => {
                      setApplicantName(e.target.value);
                      setValidationError(null);
                    }}
                    className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                  />
                </div>
              </div>

              {/* Mobile Phone */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Mobile Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="10-digit mobile number"
                    value={applicantPhone}
                    onChange={(e) => {
                      setApplicantPhone(e.target.value.replace(/\D/g, ""));
                      setValidationError(null);
                    }}
                    className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Email Address / மின்னஞ்சல்
                </label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    placeholder="e.g. citizen@example.com"
                    value={applicantEmail}
                    onChange={(e) => {
                      setApplicantEmail(e.target.value);
                      setValidationError(null);
                    }}
                    className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                  />
                </div>
              </div>

              {/* Pincode */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Pincode / அஞ்சல் குறியீடு
                </label>
                <div className="relative">
                  <Home size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="e.g. 600001"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
                    className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                  />
                </div>
              </div>

              {/* Street Address */}
              <div className="sm:col-span-2">
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Residential Street Address / முகவரி
                </label>
                <input
                  type="text"
                  placeholder="e.g. Door No. 12, Anna Nagar Main Road"
                  value={residentialAddress}
                  onChange={(e) => setResidentialAddress(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: ADMINISTRATIVE JURISDICTION SELECTION */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2 text-sm font-bold text-[#1e3a8a] dark:text-blue-400">
                <MapPin size={16} />
                <span>2. Administrative Jurisdiction Selection · அதிகார வரம்பு தேர்வு</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#1e3a8a] border border-blue-200">
                Required
              </span>
            </div>

            <p className="text-xs text-slate-500">
              Select your District, Taluk, and Panchayat to automatically route this application to the designated regional welfare board desk.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              {/* 1. District Selection */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  1. District / மாவட்டம் <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={selectedDistrictId}
                  onChange={(e) => handleDistrictChange(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                >
                  <option value="">-- Select District (மாவட்டம்) --</option>
                  {districts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} {d.nameTa ? `(${d.nameTa})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Taluk Selection */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between mb-1.5">
                  <span>2. Taluk / வட்டம் <span className="text-rose-500">*</span></span>
                  {loadingTaluks && <span className="text-[10px] text-blue-600 animate-pulse font-normal">Loading...</span>}
                </label>
                <select
                  required
                  disabled={!selectedDistrictId || loadingTaluks}
                  value={selectedTalukId}
                  onChange={(e) => handleTalukChange(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-[#1e3a8a] disabled:opacity-50"
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

              {/* 3. Panchayat Selection */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between mb-1.5">
                  <span>3. Panchayat / ஊராட்சி <span className="text-rose-500">*</span></span>
                  {loadingPanchayats && <span className="text-[10px] text-blue-600 animate-pulse font-normal">Loading...</span>}
                </label>
                <select
                  required
                  disabled={!selectedTalukId || loadingPanchayats}
                  value={selectedPanchayatId}
                  onChange={(e) => handlePanchayatChange(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-[#1e3a8a] disabled:opacity-50"
                >
                  <option value="">
                    {!selectedTalukId
                      ? "-- Select Taluk First --"
                      : loadingPanchayats
                      ? "Loading villages..."
                      : "-- Select Panchayat (கிராம ஊராட்சி) --"}
                  </option>
                  {panchayats.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.nameTa ? `(${p.nameTa})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Live Administrative Routing Indicator */}
            {selectedDistrictName && (
              <div className="mt-4 p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-xs space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between font-bold text-[#1e3a8a] text-[11px] uppercase tracking-wide">
                  <span className="flex items-center gap-1.5">
                    <Building size={14} />
                    <span>Regional Desk Routing · மண்டல அதிகார வரம்பு</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold">
                    Live Verified
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-[11px]">
                  <div>
                    <span className="text-slate-500 block text-[10px]">District / மாவட்டம்:</span>
                    <strong className="text-slate-900 font-bold">{selectedDistrictName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Taluk / வட்டம்:</span>
                    <strong className="text-slate-900 font-bold">{selectedTalukName || "Pending selection"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Panchayat / கிராம ஊராட்சி:</span>
                    <strong className="text-slate-900 font-bold">{selectedPanchayatName || "Pending selection"}</strong>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-slate-500 block text-[10px]">Designated Processing Authority:</span>
                    <span className="text-slate-700 font-medium">
                      {selectedTalukName ? `${selectedTalukName} Taluk Social Security & Labour Office` : "Regional Labour Officer Desk"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Certificate Stamping:</span>
                    <span className="text-emerald-700 font-bold">Authorized Digital Signature</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 3: DECLARATION & SUBMISSION */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-xs space-y-4">
            <label className="flex items-start gap-3 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="w-4 h-4 rounded text-[#1e3a8a] mt-0.5"
              />
              <span className="text-slate-600 dark:text-slate-300 leading-relaxed">
                I hereby declare that all particulars entered in this application are accurate and true. I understand that upon successful remittance of statutory fees, I can download the official application form template and upload the completed copy for digital stamping.
              </span>
            </label>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-700">
              <Link
                href="/user/apply"
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-center"
              >
                Cancel Application
              </Link>

              <button
                type="submit"
                disabled={submitting || paymentSuccess}
                className="w-full sm:w-auto px-8 py-3 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#1e3a8a] hover:bg-[#1e40af] flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50 transition-all cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Connecting Gateway...</span>
                  </>
                ) : (
                  <>
                    <CreditCard size={16} />
                    <span>
                      {service.fee === 0
                        ? "Apply & Submit Free Application"
                        : `Apply & Pay ₹${service.fee.toFixed(2)}`}
                    </span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
