"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Building2,
  ListChecks,
  ShieldCheck,
  FileText,
  UploadCloud,
  CreditCard,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  FileCheck2,
  MapPin,
  Building,
  UserCheck,
  AlertCircle,
  Download,
  Printer,
  ChevronRight,
  PlusCircle,
  FileBox,
  Eye,
  Trash2,
  Check,
  HelpCircle,
  RefreshCw,
  ExternalLink,
  Layers,
  Sparkles,
  Phone,
  Mail,
  Home,
  User,
  Heart,
  Shield,
  Award,
  GraduationCap,
  Briefcase,
  FileBadge,
  Calendar,
  Receipt,
} from "lucide-react";
import { getRazorpayCheckoutLogo } from "@/lib/razorpay-logo";

declare global {
  interface Window {
    Razorpay?: any;
  }
}

interface GeoItem {
  id: number;
  name: string;
  nameTa?: string | null;
}

interface EServiceItem {
  id: number;
  name: string;
  nameTa?: string;
  category: string;
  fee: number;
  time?: string;
  description?: string;
  fields: EServiceField[];
}

interface EServiceField {
  id: number;
  key: string;
  name: string;
  type: string;
  required: boolean;
  options?: string | string[];
  placeholder?: string;
  helpText?: string;
  width?: string;
  section?: string;
}

interface FormState {
  // Personal Details
  aadhaar: string;
  appellation: string;
  applicantName: string;
  applicantNameTa: string;
  gender: string;
  maritalStatus: string;
  dob: string;
  relationship: string;
  fatherName: string;
  fatherNameTa: string;
  husbandName: string;
  husbandNameTa: string;
  motherName: string;
  motherNameTa: string;
  religion: string;
  community: string;
  occupation: string;
  education: string;

  // Current Address
  currentDistrict: string;
  currentTaluk: string;
  currentVillage: string;
  currentWard: string;
  currentStreet: string;
  currentDoorNo: string;
  currentPinCode: string;

  // Permanent Address
  sameAsCurrent: boolean;
  permanentDistrict: string;
  permanentTaluk: string;
  permanentVillage: string;
  permanentWard: string;
  permanentStreet: string;
  permanentDoorNo: string;
  permanentPinCode: string;

  // Contact
  mobileNumber: string;
  emailId: string;
}

interface DocumentItem {
  id: string;
  key: string;
  label: string;
  labelTa: string;
  description: string;
  fileUrl: string | null;
  fileName: string | null;
  fileSize?: number;
  uploaded: boolean;
  isUploading: boolean;
}

const MANDATORY_DOCS: Omit<DocumentItem, "fileUrl" | "fileName" | "uploaded" | "isUploading">[] = [
  {
    id: "photo",
    key: "passportPhoto",
    label: "Passport Photo",
    labelTa: "புகைப்படம்",
    description: "Recent color passport size photograph (JPG, PNG)",
  },
  {
    id: "aadhaar_front",
    key: "aadhaarFront",
    label: "Aadhaar Card - Front",
    labelTa: "ஆதார் அட்டை - முன் பக்கம்",
    description: "Front side scan of Aadhaar card clearly showing name & photo",
  },
  {
    id: "aadhaar_back",
    key: "aadhaarBack",
    label: "Aadhaar Card - Back",
    labelTa: "ஆதார் அட்டை - பின் பக்கம்",
    description: "Back side scan of Aadhaar card showing address",
  },
  {
    id: "ration_card",
    key: "rationCard",
    label: "Ration Card",
    labelTa: "குடும்ப அட்டை",
    description: "Smart Family Ration card copy with family member details",
  },
  {
    id: "signature",
    key: "signature",
    label: "Signature",
    labelTa: "கையொப்பம்",
    description: "Applicant's specimen signature or left thumb impression",
  },
  {
    id: "tax_receipt",
    key: "houseTaxReceipt",
    label: "House Tax Receipt",
    labelTa: "வீட்டு வரி ரசீது",
    description: "Latest property / house tax receipt or electricity bill",
  },
];

const INITIAL_FORM: FormState = {
  aadhaar: "",
  appellation: "",
  applicantName: "",
  applicantNameTa: "",
  gender: "",
  maritalStatus: "",
  dob: "",
  relationship: "",
  fatherName: "",
  fatherNameTa: "",
  husbandName: "",
  husbandNameTa: "",
  motherName: "",
  motherNameTa: "",
  religion: "",
  community: "",
  occupation: "",
  education: "",

  currentDistrict: "",
  currentTaluk: "",
  currentVillage: "",
  currentWard: "",
  currentStreet: "",
  currentDoorNo: "",
  currentPinCode: "",

  sameAsCurrent: true,
  permanentDistrict: "",
  permanentTaluk: "",
  permanentVillage: "",
  permanentWard: "",
  permanentStreet: "",
  permanentDoorNo: "",
  permanentPinCode: "",

  mobileNumber: "",
  emailId: "",
};

function EServicesPortalInner() {
  const searchParams = useSearchParams();

  // Mode: "LANDING" | "WIZARD" | "RECEIPT" | "MY_APPLICATIONS"
  const [viewMode, setViewMode] = useState<"LANDING" | "WIZARD" | "RECEIPT" | "MY_APPLICATIONS">("LANDING");
  const [tamil, setTamil] = useState(false);

  // 6-step Wizard State (1 to 6)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step 1: Select Centre (Jurisdiction)
  const [districts, setDistricts] = useState<GeoItem[]>([]);
  const [taluks, setTaluks] = useState<GeoItem[]>([]);
  const [villages, setVillages] = useState<GeoItem[]>([]);

  const [selectedDistrictId, setSelectedDistrictId] = useState<string>("");
  const [selectedDistrictName, setSelectedDistrictName] = useState<string>("");
  const [selectedTalukId, setSelectedTalukId] = useState<string>("");
  const [selectedTalukName, setSelectedTalukName] = useState<string>("");
  const [selectedVillageId, setSelectedVillageId] = useState<string>("");
  const [selectedVillageName, setSelectedVillageName] = useState<string>("");

  const [loadingTaluks, setLoadingTaluks] = useState(false);
  const [loadingVillages, setLoadingVillages] = useState(false);

  // Step 2: Services
  const [allServices, setAllServices] = useState<EServiceItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [serviceSearch, setServiceSearch] = useState<string>("");
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);

  // Step 3: Aadhaar Details
  const [aadhaarInput, setAadhaarInput] = useState<string>("");
  const [aadhaarName, setAadhaarName] = useState<string>("");
  const [aadhaarConsent, setAadhaarConsent] = useState<boolean>(false);
  const [isAadhaarProvided, setIsAadhaarProvided] = useState<boolean>(false);

  // Step 4: Fill Form
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [serviceFieldValues, setServiceFieldValues] = useState<Record<string, string>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Step 5: Upload Documents
  const [documents, setDocuments] = useState<DocumentItem[]>(
    MANDATORY_DOCS.map((doc) => ({
      ...doc,
      fileUrl: null,
      fileName: null,
      uploaded: false,
      isUploading: false,
    }))
  );

  // Step 6: Payment & Confirmation
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionComplete, setSubmissionComplete] = useState(false);
  const [generatedApplicationId, setGeneratedApplicationId] = useState("");
  const [generatedReceiptNo, setGeneratedReceiptNo] = useState("");
  const [submissionDetails, setSubmissionDetails] = useState<any>(null);

  // My Applications State
  const [myApplications, setMyApplications] = useState<any[]>([]);
  const [loadingMyApps, setLoadingMyApps] = useState(false);
  const [selectedAppModal, setSelectedAppModal] = useState<any>(null);

  // Toast feedback
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const copyToClipboard = (text: string, label: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      showToast(`${label} copied to clipboard ✓`);
    }
  };

  // 1. Load the authenticated profile and geography.
  useEffect(() => {
    let active = true;
    async function loadInitialData() {
      try {
        const [geoRes, profileRes] = await Promise.all([
          fetch("/api/geography").catch(() => null),
          fetch("/api/user/me").catch(() => null),
        ]);
        const [geo, profileData] = await Promise.all([
          geoRes?.json().catch(() => null),
          profileRes?.json().catch(() => null),
        ]);
        if (!active) return;

        const districtList = Array.isArray(geo?.districts) ? geo.districts : [];
        setDistricts(districtList);
        const profile = profileData?.ok ? profileData.profile : null;
        const profileDistrictId = String(profile?.districtId || "");
        const districtId = profileDistrictId;
        const selectedDistrict = districtList.find((item: GeoItem) => String(item.id) === districtId);

        setForm({
          ...INITIAL_FORM,
          applicantName: profile?.name || "",
          mobileNumber: profile?.phone || "",
          emailId: profile?.email || "",
          currentDistrict: selectedDistrict?.name || "",
          permanentDistrict: selectedDistrict?.name || "",
        });
        setAadhaarName(profile?.name || "");

        if (districtId && selectedDistrict) {
          setSelectedDistrictId(districtId);
          setSelectedDistrictName(selectedDistrict.name);
          const talukRes = await fetch(`/api/geography?districtId=${encodeURIComponent(districtId)}`).catch(() => null);
          const talukData = await talukRes?.json().catch(() => null);
          const talukList = Array.isArray(talukData?.taluks) ? talukData.taluks : [];
          if (!active) return;
          setTaluks(talukList);
          const talukId = String(profile?.talukId || "");
          const selectedTaluk = talukList.find((item: GeoItem) => String(item.id) === talukId);
          if (selectedTaluk) {
            setSelectedTalukId(talukId);
            setSelectedTalukName(selectedTaluk.name);
            setForm((current) => ({ ...current, currentTaluk: selectedTaluk.name, permanentTaluk: current.sameAsCurrent ? selectedTaluk.name : current.permanentTaluk }));
            const villageRes = await fetch(`/api/geography?talukId=${encodeURIComponent(talukId)}`).catch(() => null);
            const villageData = await villageRes?.json().catch(() => null);
            const villageList = Array.isArray(villageData?.panchayaths) ? villageData.panchayaths : [];
            if (!active) return;
            setVillages(villageList);
            const villageId = String(profile?.panchayatId || "");
            const selectedVillage = villageList.find((item: GeoItem) => String(item.id) === villageId);
            if (selectedVillage) {
              setSelectedVillageId(villageId);
              setSelectedVillageName(selectedVillage.name);
              setForm((current) => ({ ...current, currentVillage: selectedVillage.name, permanentVillage: current.sameAsCurrent ? selectedVillage.name : current.permanentVillage }));
            }
          }
        }

      } catch (err) {
        console.warn("Could not load E-service application profile:", err);
      }
    }
    loadInitialData();
    return () => { active = false; };
  }, []);

  // 2. Load Services Catalogue
  useEffect(() => {
    async function loadServices() {
      try {
        setLoadingServices(true);
        const res = await fetch("/api/es-services");
        const data = await res.json();
        if (data.ok && Array.isArray(data.services)) {
          setAllServices(
            data.services.map((s: any) => ({
              id: s.id,
              name: s.name,
              nameTa: s.nameTa || s.name,
              category: s.mainCategoryName || "General",
              fee: Number(s.fee || 60),
              time: s.estimatedDays || "3-5 Days",
              description: s.details || "Official statutory government application",
              fields: Array.isArray(s.fields) ? s.fields : [],
            }))
          );
        }
      } catch (err) {
        console.warn("Could not load e-services:", err);
      } finally {
        setLoadingServices(false);
      }
    }
    loadServices();
  }, []);

  // 3. Load Taluks on district selection
  const loadTaluksForDistrict = async (districtId: string) => {
    if (!districtId) return;
    try {
      setLoadingTaluks(true);
      const res = await fetch(`/api/geography?districtId=${districtId}`);
      const data = await res.json();
      if (data.ok && Array.isArray(data.taluks)) {
        setTaluks(data.taluks);
      }
    } catch (err) {
      console.warn("Failed to load taluks:", err);
    } finally {
      setLoadingTaluks(false);
    }
  };

  const handleDistrictChange = (distId: string) => {
    setSelectedDistrictId(distId);
    const d = districts.find((item) => String(item.id) === distId);
    const dName = d ? d.name : "";
    setSelectedDistrictName(dName);
    setForm((prev) => ({
      ...prev,
      currentDistrict: dName,
      currentTaluk: "",
      currentVillage: "",
      permanentDistrict: prev.sameAsCurrent ? dName : prev.permanentDistrict,
      permanentTaluk: prev.sameAsCurrent ? "" : prev.permanentTaluk,
      permanentVillage: prev.sameAsCurrent ? "" : prev.permanentVillage,
    }));
    setSelectedTalukId("");
    setSelectedTalukName("");
    setSelectedVillageId("");
    setSelectedVillageName("");
    setVillages([]);
    loadTaluksForDistrict(distId);
  };

  // 4. Load Villages on taluk selection
  const loadVillagesForTaluk = async (talukId: string) => {
    if (!talukId) return;
    try {
      setLoadingVillages(true);
      const res = await fetch(`/api/geography?talukId=${talukId}`);
      const data = await res.json();
      if (data.ok && Array.isArray(data.panchayaths)) {
        setVillages(data.panchayaths);
      }
    } catch (err) {
      console.warn("Failed to load villages:", err);
    } finally {
      setLoadingVillages(false);
    }
  };

  const handleTalukChange = (talukId: string) => {
    setSelectedTalukId(talukId);
    const t = taluks.find((item) => String(item.id) === talukId);
    const tName = t ? t.name : "";
    setSelectedTalukName(tName);
    setForm((prev) => ({
      ...prev,
      currentTaluk: tName,
      currentVillage: "",
      permanentTaluk: prev.sameAsCurrent ? tName : prev.permanentTaluk,
      permanentVillage: prev.sameAsCurrent ? "" : prev.permanentVillage,
    }));
    setSelectedVillageId("");
    setSelectedVillageName("");
    loadVillagesForTaluk(talukId);
  };

  const handleVillageChange = (villageId: string) => {
    setSelectedVillageId(villageId);
    const v = villages.find((item) => String(item.id) === villageId);
    const vName = v ? v.name : "";
    setSelectedVillageName(vName);
    setForm((prev) => ({
      ...prev,
      currentVillage: vName,
      permanentVillage: prev.sameAsCurrent ? vName : prev.permanentVillage,
    }));
  };

  // 5. Category Tabs for Step 2
  const categoriesList = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of allServices) {
      map.set(s.category, (map.get(s.category) || 0) + 1);
    }
    const list = [{ id: "All", label: "All", count: allServices.length }];
    map.forEach((count, cat) => {
      list.push({ id: cat, label: cat, count });
    });
    return list;
  }, [allServices]);

  // Filtered services for Step 2
  const filteredServices = useMemo(() => {
    const q = serviceSearch.toLowerCase().trim();
    return allServices.filter((s) => {
      const matchCat = activeCategory === "All" || s.category.toLowerCase() === activeCategory.toLowerCase();
      const matchSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        (s.nameTa && s.nameTa.toLowerCase().includes(q)) ||
        s.category.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [allServices, activeCategory, serviceSearch]);

  const toggleSelectService = (id: number) => {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Calculate selected services summary
  const selectedServicesObjects = useMemo(() => {
    return allServices.filter((s) => selectedServiceIds.includes(s.id));
  }, [allServices, selectedServiceIds]);

  const totalServicesFee = useMemo(() => {
    return selectedServicesObjects.reduce((acc, curr) => acc + curr.fee, 0);
  }, [selectedServicesObjects]);

  // Validate supplied Aadhaar details; this page does not perform UIDAI authentication.
  const handleVerifyAadhaar = () => {
    const clean = aadhaarInput.replace(/\s+/g, "");
    if (clean.length !== 12 || !/^\d{12}$/.test(clean)) {
      showToast("Please enter a valid 12-digit Aadhaar number");
      return false;
    }
    if (!aadhaarConsent) {
      showToast("Please check the consent authorization box");
      return false;
    }
    if (!aadhaarName.trim()) {
      showToast("Enter the name as printed on Aadhaar.");
      return false;
    }
    setIsAadhaarProvided(true);
    setForm((prev) => ({ ...prev, aadhaar: clean, applicantName: prev.applicantName || aadhaarName.trim() }));
    return true;
  };

  // Handle Document Upload
  const handleDocUpload = async (docKey: string, file: File) => {
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast("File size exceeds 5MB limit. Please upload a smaller file.");
      return;
    }

    setDocuments((prev) =>
      prev.map((d) => (d.key === docKey ? { ...d, isUploading: true } : d))
    );

    try {
      const fd = new FormData();
      fd.append("file", file);
      const docTypes: Record<string, string> = {
        passportPhoto: "es-passport-photo", aadhaarFront: "es-aadhaar-front", aadhaarBack: "es-aadhaar-back",
        rationCard: "es-ration-card", signature: "es-signature", houseTaxReceipt: "es-house-tax-receipt",
      };
      fd.append("docType", docTypes[docKey] || "es-service-file");

      const res = await fetch("/api/verification/upload", {
        method: "POST",
        body: fd,
      });

      const data = await res.json();
      if (data.ok && data.url) {
        setDocuments((prev) =>
          prev.map((d) =>
            d.key === docKey
              ? {
                  ...d,
                  fileUrl: data.url,
                  fileName: file.name,
                  fileSize: file.size,
                  uploaded: true,
                  isUploading: false,
                }
              : d
          )
        );
        showToast(`${file.name} uploaded successfully!`);
      } else {
        throw new Error(data.error || "Upload failed");
      }
    } catch (err: any) {
      showToast(err.message || "Document upload failed");
      setDocuments((prev) =>
        prev.map((d) => (d.key === docKey ? { ...d, isUploading: false } : d))
      );
    }
  };

  const handleServiceFileUpload = async (fieldKey: string, file: File) => {
    if (file.size > 5 * 1024 * 1024) return showToast("File size exceeds 5MB limit.");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("docType", "es-service-file");
    try {
      const response = await fetch("/api/verification/upload", { method: "POST", body: fd });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Upload failed");
      setServiceFieldValues((values) => ({ ...values, [fieldKey]: result.url }));
      showToast(`${file.name} uploaded and saved.`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not upload this file.");
    }
  };

  const removeDoc = (docKey: string) => {
    setDocuments((prev) =>
      prev.map((d) =>
        d.key === docKey
          ? { ...d, fileUrl: null, fileName: null, uploaded: false, isUploading: false }
          : d
      )
    );
  };

  const uploadedCount = useMemo(() => {
    return documents.filter((d) => d.uploaded).length;
  }, [documents]);

  // Load "My Applications"
  const fetchMyApplications = async () => {
    try {
      setLoadingMyApps(true);
      const res = await fetch("/api/es-services?type=my-applications");
      const data = await res.json();
      if (data.ok && Array.isArray(data.applications)) {
        setMyApplications(data.applications);
      }
    } catch (err) {
      console.warn("Could not load applications:", err);
    } finally {
      setLoadingMyApps(false);
    }
  };

  useEffect(() => {
    if (viewMode === "MY_APPLICATIONS") {
      fetchMyApplications();
    }
  }, [viewMode]);

  // Validate Step 4 Form
  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};

    if (!form.applicantName.trim()) errs.applicantName = "Applicant Name (English) is required";
    if (!form.appellation) errs.appellation = "Select a title";
    if (!form.gender) errs.gender = "Select gender";
    if (!form.maritalStatus) errs.maritalStatus = "Select marital status";
    if (!form.religion) errs.religion = "Select religion";
    if (!form.community) errs.community = "Select community";
    if (!form.occupation.trim()) errs.occupation = "Occupation is required";
    if (!form.relationship) errs.relationship = "Choose whose name should appear on the certificate";

    // Endorsement / Relationship specifics
    if (form.relationship === "Husband") {
      if (!form.husbandName.trim()) {
        errs.husbandName = "Husband / Spouse Name (English) is required";
      }
    } else if (form.relationship === "Mother") {
      if (!form.motherName.trim()) {
        errs.motherName = "Mother Name (English) is required";
      }
    } else {
      if (!form.fatherName.trim()) {
        errs.fatherName = "Father Name (English) is required";
      }
    }

    // Mother name check (only if not husband-endorsed)
    if (form.relationship !== "Husband" && !form.motherName.trim()) {
      errs.motherName = "Mother Name (English) is required";
    }

    if (!form.dob) errs.dob = "Date of Birth is required";
    if (!selectedDistrictId || !selectedTalukId || !selectedVillageId) errs.jurisdiction = "Select your district, taluk, and panchayat";
    if (!form.currentDoorNo.trim()) errs.currentDoorNo = "Door / Flat No. is required";
    if (!form.currentStreet.trim()) errs.currentStreet = "Street Name / No. is required";
    if (!form.currentPinCode.trim() || !/^\d{6}$/.test(form.currentPinCode.trim())) {
      errs.currentPinCode = "Valid 6-digit Pin Code is required";
    }
    if (!form.mobileNumber.trim() || !/^\d{10}$/.test(form.mobileNumber.replace(/\D/g, ""))) {
      errs.mobileNumber = "Valid 10-digit Mobile Number is required";
    }

    for (const service of selectedServicesObjects) {
      for (const field of service.fields) {
        if (field.required && !String(serviceFieldValues[field.key] || "").trim()) {
          errs[field.key] = `${field.name} is required`;
        }
      }
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Submit Application (Handles both Online Payment and Pending Submission)
  const handleSubmitApplication = async (paymentMode: "ONLINE" | "PENDING") => {
    try {
      setIsSubmitting(true);

      const docsObject: Record<string, string> = {};
      documents.forEach((d) => {
        if (d.fileUrl) docsObject[d.key] = d.fileUrl;
      });

      // 1. If Online Payment (Razorpay)
      if (paymentMode === "ONLINE" && totalServicesFee > 0) {
        // Load Razorpay script
        const scriptLoaded = await new Promise<boolean>((resolve) => {
          if (typeof window !== "undefined" && window.Razorpay) return resolve(true);
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.onload = () => resolve(true);
          script.onerror = () => resolve(false);
          document.body.appendChild(script);
        });

        if (scriptLoaded) {
          // Create Razorpay Order
          const orderRes = await fetch("/api/payments/razorpay/order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              serviceType: "E_SERVICE",
              serviceId: selectedServiceIds[0] || 2,
              serviceIds: selectedServiceIds,
              amount: totalServicesFee,
              applicantName: form.applicantName,
              applicantPhone: form.mobileNumber,
            }),
          });
          const orderData = await orderRes.json();

          if (orderData.ok && orderData.orderId) {
            const razorpayKey = orderData.key || orderData.keyId;
            if (!razorpayKey) {
              throw new Error("Online payment gateway key is missing. Please contact support or submit with Payment Pending.");
            }

            const logoUrl = await getRazorpayCheckoutLogo();

            const options = {
              key: razorpayKey,
              amount: orderData.amountPaise || Math.round(totalServicesFee * 100),
              currency: "INR",
              name: "Government of Tamil Nadu",
              description: `E-CSC Services: ${selectedServicesObjects.map((s) => s.name).join(", ")}`,
              image: logoUrl,
              order_id: orderData.orderId,
              handler: async function (response: any) {
                if (typeof document !== "undefined") {
                  document.body.style.overflow = "auto";
                  document.documentElement.style.overflow = "auto";
                }
                // Post success to /api/es-services
                await finalizeSubmission("ONLINE", "Success", response.razorpay_order_id, response.razorpay_payment_id, response.razorpay_signature);
              },
              prefill: {
                name: form.applicantName,
                contact: form.mobileNumber,
                email: form.emailId || "citizen@labourseva.gov.in",
              },
              theme: { color: "#1e3a8a" },
              modal: {
                ondismiss: function () {
                  if (typeof document !== "undefined") {
                    document.body.style.overflow = "auto";
                    document.documentElement.style.overflow = "auto";
                  }
                  setIsSubmitting(false);
                  fetch("/api/payments/razorpay/failure", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      razorpayOrderId: orderData.orderId,
                      isCancelled: true,
                    }),
                  }).catch(() => {});
                  showToast("Payment window closed. You can submit with Payment Pending or retry.");
                },
              },
            };

            const rzp = new window.Razorpay(options);
            rzp.on("payment.failed", function (failResp: any) {
              if (typeof document !== "undefined") {
                document.body.style.overflow = "auto";
                document.documentElement.style.overflow = "auto";
              }
              setIsSubmitting(false);
              fetch("/api/payments/razorpay/failure", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  razorpayOrderId: orderData.orderId,
                  razorpayPaymentId: failResp.error?.metadata?.payment_id,
                  error: failResp.error,
                }),
              }).catch(() => {});
              showToast(`Payment failed: ${failResp.error?.description || "Gateway error"}`);
            });
            rzp.open();
            return;
          } else {
            throw new Error(orderData.error || "Failed to initialize payment gateway order");
          }
        }
      }

      // 2. Direct or Pending Submission
      await finalizeSubmission(paymentMode, paymentMode === "ONLINE" && totalServicesFee === 0 ? "Success" : "Pending");
    } catch (err: any) {
      if (typeof document !== "undefined") {
        document.body.style.overflow = "auto";
        document.documentElement.style.overflow = "auto";
      }
      setIsSubmitting(false);
      showToast(err.message || "Failed to submit application");
    }
  };

  const finalizeSubmission = async (
    paymentMode: string,
    paymentStatus: string,
    orderId: string | null = null,
    paymentId: string | null = null,
    paymentSignature: string | null = null
  ) => {
    const docsObject: Record<string, string> = {};
    documents.forEach((d) => {
      if (d.fileUrl) docsObject[d.key] = d.fileUrl;
    });

    const res = await fetch("/api/es-services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceIds: selectedServiceIds,
        servicesDetails: selectedServicesObjects,
        district: selectedDistrictName,
        taluk: selectedTalukName,
        village: selectedVillageName,
        aadhaar: aadhaarInput.replace(/\s+/g, ""),
        aadhaarName,
        aadhaarConsent,
        formData: form,
        serviceFieldValues,
        documents: docsObject,
        paymentMode,
        paymentStatus,
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: paymentSignature,
        totalAmount: totalServicesFee,
      }),
    });

    const result = await res.json();
    setIsSubmitting(false);

    if (result.ok) {
      setGeneratedApplicationId(result.applicationId);
      setGeneratedReceiptNo(result.receiptNo);
      setSubmissionDetails({
        applicationId: result.applicationId,
        receiptNo: result.receiptNo,
        services: selectedServicesObjects,
        fee: totalServicesFee,
        district: selectedDistrictName,
        taluk: selectedTalukName,
        village: selectedVillageName,
        applicantName: form.applicantName,
        applicantNameTa: form.applicantNameTa,
        appellation: form.appellation,
        relationship: form.relationship,
        fatherName: form.fatherName,
        fatherNameTa: form.fatherNameTa,
        husbandName: form.husbandName,
        husbandNameTa: form.husbandNameTa,
        motherName: form.motherName,
        motherNameTa: form.motherNameTa,
        mobileNumber: form.mobileNumber,
        emailId: form.emailId,
        doorNo: form.currentDoorNo,
        street: form.currentStreet,
        pinCode: form.currentPinCode,
        paymentMode,
        paymentStatus,
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        date: new Date().toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      });
      setSubmissionComplete(true);
      setViewMode("RECEIPT");
      if (typeof document !== "undefined") {
        document.body.style.overflow = "auto";
        document.documentElement.style.overflow = "auto";
      }
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      showToast("Application submitted successfully! Official Receipt generated ✓");
    } else {
      throw new Error(result.error || "Submission failed");
    }
  };

  // Reset wizard to apply again
  const handleStartNewApplication = async () => {
    const accountName = form.applicantName;
    setCurrentStep(1);
    setSelectedServiceIds([]);
    setIsAadhaarProvided(false);
    setAadhaarInput("");
    setAadhaarName(accountName);
    setAadhaarConsent(false);
    setServiceFieldValues({});
    setFormErrors({});
    setForm({
      ...INITIAL_FORM,
      applicantName: accountName,
      mobileNumber: form.mobileNumber,
      emailId: form.emailId,
      currentDistrict: selectedDistrictName,
      currentTaluk: selectedTalukName,
      currentVillage: selectedVillageName,
      permanentDistrict: selectedDistrictName,
      permanentTaluk: selectedTalukName,
      permanentVillage: selectedVillageName,
    });
    setDocuments(
      MANDATORY_DOCS.map((doc) => ({
        ...doc,
        fileUrl: null,
        fileName: null,
        uploaded: false,
        isUploading: false,
      }))
    );
    setSubmissionComplete(false);
    setViewMode("WIZARD");
    if (typeof document !== "undefined") {
      document.body.style.overflow = "auto";
      document.documentElement.style.overflow = "auto";
    }
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-slate-900/60 pb-16 font-sans antialiased text-slate-800 dark:text-slate-100">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0f172a] text-white px-5 py-3 rounded-2xl shadow-xl border border-slate-700/80 text-xs sm:text-sm font-semibold flex items-center gap-2.5 animate-in slide-in-from-bottom-5">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* TOP GOVERNMENT BAR & BILINGUAL TOGGLE */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {viewMode !== "LANDING" && (
              <button
                type="button"
                onClick={() => {
                  if (viewMode === "RECEIPT") setViewMode("MY_APPLICATIONS");
                  else setViewMode("LANDING");
                }}
                className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                title="Back"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#ea580c] uppercase tracking-wider">
                <span>Government of Tamil Nadu</span>
                <span>•</span>
                <span className="text-[#1e3a8a] dark:text-blue-400">E-Governance Portal</span>
              </div>
              <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>E-CSC Services</span>
                <span className="text-xs font-normal text-slate-400 hidden sm:inline">| மின்-சேவை மையம்</span>
              </h1>
            </div>
          </div>

          {/* Action Tabs & Tamil Toggle */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => {
                if (viewMode === "WIZARD") setViewMode("LANDING");
                else handleStartNewApplication();
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === "WIZARD"
                  ? "bg-[#1e3a8a] text-white shadow-2xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              <PlusCircle size={14} />
              <span className="hidden sm:inline">{tamil ? "புதிய விண்ணப்பம்" : "New Application"}</span>
              <span className="sm:hidden">{tamil ? "புதிய" : "Apply"}</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode("MY_APPLICATIONS")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === "MY_APPLICATIONS"
                  ? "bg-[#1e3a8a] text-white shadow-2xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              <FileBox size={14} />
              <span className="hidden sm:inline">{tamil ? "எனது விண்ணப்பங்கள்" : "My Applications"}</span>
              <span className="sm:hidden">{tamil ? "நிலை" : "Track"}</span>
            </button>

            {submissionDetails && (
              <button
                type="button"
                onClick={() => {
                  setViewMode("RECEIPT");
                  if (typeof window !== "undefined") {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === "RECEIPT"
                    ? "bg-emerald-700 text-white shadow-2xs"
                    : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100"
                }`}
              >
                <Receipt size={14} />
                <span className="hidden sm:inline">{tamil ? "ரசீது அமர்வு" : "Receipt Session"}</span>
                <span className="sm:hidden">{tamil ? "ரசீது" : "Receipt"}</span>
              </button>
            )}

            {/* Tamil Toggle */}
            <button
              type="button"
              onClick={() => setTamil(!tamil)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-[#1e3a8a] dark:text-blue-400 hover:border-[#1e3a8a] transition-all cursor-pointer"
            >
              {tamil ? "English" : "தமிழ்"}
            </button>
          </div>
        </div>
      </header>

      {/* VIEW 1: LANDING SCREEN (Image 1 reference) */}
      {viewMode === "LANDING" && (
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8 animate-in fade-in">
          {/* Hero Banner */}
          <div className="text-center space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-[#1e3a8a] border border-blue-200 dark:bg-blue-950/40 dark:border-blue-900 dark:text-blue-300">
              <ShieldCheck size={13} />
              {tamil ? "தமிழ்நாடு அரசு" : "Government of Tamil Nadu"}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {tamil ? "இ-சேவை விண்ணப்பங்கள்" : "E-Services Portal"}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
              {tamil
                ? "சாதி, வருமானம், பிறப்பு மற்றும் அரசு நலத்திட்டங்களுக்கான சான்றிதழ்களுக்கு விண்ணப்பிக்கவும், நிலை அறியவும்."
                : "Apply for statutory certificates, community, income, nativity, welfare schemes, and track your application status online."}
            </p>
          </div>

  {/* Two Big Entrance Cards (Matching Image 1) */}
          <div className="grid grid-cols-1 gap-4 max-w-2xl mx-auto">
            {/* Card 1: New Application */}
            <button
              type="button"
              onClick={handleStartNewApplication}
              className="w-full text-left p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 shadow-xs hover:shadow-md hover:border-[#1e3a8a] dark:hover:border-blue-500 transition-all duration-200 group flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-[#1e3a8a] dark:text-blue-400 border border-blue-200 dark:border-blue-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <PlusCircle size={26} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-[#1e3a8a] dark:group-hover:text-blue-400 transition-colors">
                    {tamil ? "புதிய விண்ணப்பம்" : "New Application"}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    {tamil
                      ? "சாதி, வருமானச் சான்றிதழ்கள், நலத்திட்டங்கள் மற்றும் பலவற்றிற்கு விண்ணப்பிக்கவும்"
                      : "Apply for caste, income certificates & more"}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-[#1e3a8a] group-hover:translate-x-1 transition-all" />
            </button>

            {/* Card 2: My Applications */}
            <button
              type="button"
              onClick={() => setViewMode("MY_APPLICATIONS")}
              className="w-full text-left p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 shadow-xs hover:shadow-md hover:border-[#1e3a8a] dark:hover:border-blue-500 transition-all duration-200 group flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <FileBox size={26} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                    {tamil ? "எனது விண்ணப்பங்கள்" : "My Applications"}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    {tamil
                      ? "உங்கள் விண்ணப்பத்தின் நிலையை உடனுக்குடன் கண்காணிக்கவும்"
                      : "Track your application status and download receipts"}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
            </button>
          </div>
        </main>
      )}

      {/* VIEW 2: COMPACT 6-STEP APPLICATION WIZARD */}
      {viewMode === "WIZARD" && !submissionComplete && (
        <main className="max-w-6xl xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 space-y-6">
          {/* COMPACT STEPPER PROGRESS BAR */}
          <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-3 sm:px-4 sm:py-3 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="min-w-0">
                <span className="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-700/70 px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300">
                  {tamil ? "படிமுறை வழிகாட்டி" : "Application Wizard"}
                </span>
                <h3 className="mt-1 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white leading-tight">
                  <span className="text-[#1e3a8a] dark:text-blue-400">Step {currentStep} of 6</span>
                  <span className="text-slate-400 dark:text-slate-500 mx-1">/</span>
                  {currentStep === 1 && (tamil ? "மையம் தேர்வு" : "Select Centre")}
                  {currentStep === 2 && (tamil ? "சேவைகள் தேர்வு" : "Select Services")}
                  {currentStep === 3 && (tamil ? "ஆதார் விவரங்கள்" : "Aadhaar Details")}
                  {currentStep === 4 && (tamil ? "விண்ணப்பப் படிவம்" : "Fill Form")}
                  {currentStep === 5 && (tamil ? "ஆவணங்கள் பதிவேற்றம்" : "Upload Documents")}
                  {currentStep === 6 && (tamil ? "கட்டணம் & உறுதிப்படுத்தல்" : "Payment & Review")}
                </h3>
              </div>
              <span className="shrink-0 rounded-full border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 px-2 py-1 text-[10px] font-semibold tabular-nums text-[#1e3a8a] dark:text-blue-300">
                {currentStep}/6
              </span>
            </div>
            {/* Compact step selector */}
            <div className="grid grid-cols-6 gap-0.5 sm:gap-1 border-t border-slate-100 dark:border-slate-700/70 pt-2">
              {[
                { step: 1, label: "Select Centre", labelTa: "மையம்", icon: Building2 },
                { step: 2, label: "Select Services", labelTa: "சேவைகள்", icon: ListChecks },
                { step: 3, label: "Aadhaar Details", labelTa: "ஆதார்", icon: ShieldCheck },
                { step: 4, label: "Fill Form", labelTa: "படிவம்", icon: FileText },
                { step: 5, label: "Upload Documents", labelTa: "ஆவணங்கள்", icon: UploadCloud },
                { step: 6, label: "Payment", labelTa: "கட்டணம்", icon: CreditCard },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = currentStep === item.step;
                const isCompleted = currentStep > item.step;
                return (
                  <button
                    key={item.step}
                    type="button"
                    disabled={item.step > currentStep}
                    aria-current={isActive ? "step" : undefined}
                    onClick={() => setCurrentStep(item.step)}
                    className={`min-w-0 flex flex-col items-center gap-1 rounded-lg px-0.5 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a8a] focus-visible:ring-offset-1 dark:focus-visible:ring-offset-slate-800 ${
                      isActive
                        ? "text-[#1e3a8a] dark:text-blue-400 font-semibold"
                        : isCompleted
                        ? "text-emerald-700 dark:text-emerald-400 cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                        : "text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-70"
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full transition-colors ${
                        isActive
                          ? "bg-[#1e3a8a] text-white shadow-sm ring-2 ring-blue-100 dark:ring-blue-950/70"
                          : isCompleted
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900"
                          : "bg-slate-50 text-slate-400 border border-slate-200 dark:bg-slate-700/50 dark:text-slate-400 dark:border-slate-700"
                      }`}
                    >
                      {isCompleted ? <Check size={14} strokeWidth={2.5} /> : <Icon size={14} />}
                    </span>
                    <span className="w-full text-center text-[9px] sm:text-[10px] leading-tight line-clamp-2">
                      {tamil ? item.labelTa : item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* STEP 1: SELECT CENTRE (Image 2 reference) */}
          {currentStep === 1 && (
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 sm:p-8 shadow-xs space-y-6 animate-in fade-in">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                  {tamil ? "படி 1: உங்கள் சேவை மையத்தைத் தேர்ந்தெடுக்கவும்" : "Step 1: Select Your E-CSC Centre Jurisdiction"}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {tamil
                    ? "விண்ணப்பம் செயலாக்கப்பட வேண்டிய மாவட்டம், வட்டம் மற்றும் வருவாய் கிராமத்தைத் தேர்ந்தெடுக்கவும்."
                    : "Select your district, taluk, and panchayat or revenue village to assign the application to the correct officer."}
                </p>
              </div>

              <div className="space-y-4 max-w-2xl">
                {/* Step 1: Select District */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Step 1: Select District / மாவட்டம் <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedDistrictId}
                    onChange={(e) => handleDistrictChange(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#1e3a8a] transition-all"
                  >
                    <option value="">-- Select District (மாவட்டம்) --</option>
                    {districts.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} {d.nameTa ? `(${d.nameTa})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Step 2: Select Taluk */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between mb-1.5">
                    <span>Step 2: Select Taluk / வட்டம் <span className="text-rose-500">*</span></span>
                    {loadingTaluks && <span className="text-xs text-blue-600 font-semibold">Loading taluks...</span>}
                  </label>
                  <select
                    disabled={!selectedDistrictId || loadingTaluks}
                    value={selectedTalukId}
                    onChange={(e) => handleTalukChange(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#1e3a8a] transition-all disabled:opacity-50"
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

                {/* Step 3: Select Village */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between mb-1.5">
                    <span>Step 3: Select Panchayat / Village / ஊராட்சி <span className="text-rose-500">*</span></span>
                    {loadingVillages && <span className="text-xs text-blue-600 font-semibold">Loading villages...</span>}
                  </label>
                  <select
                    disabled={!selectedTalukId || loadingVillages}
                    value={selectedVillageId}
                    onChange={(e) => handleVillageChange(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#1e3a8a] transition-all disabled:opacity-50"
                  >
                    <option value="">
                      {!selectedTalukId
                        ? "-- Select Taluk First --"
                        : loadingVillages
                        ? "Loading villages..."
                        : "-- Select Village (கிராமம்) --"}
                    </option>
                    {villages.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} {v.nameTa ? `(${v.nameTa})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Centre Confirmation Box */}
              {selectedDistrictName && selectedTalukName && (
                <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 flex items-start gap-3 text-xs text-slate-700 dark:text-slate-300 animate-in fade-in">
                  <Building className="w-5 h-5 text-[#1e3a8a] dark:text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">
                      Selected Centre Jurisdiction
                    </h4>
                    <p className="mt-0.5">
                      District: <strong className="text-slate-900 dark:text-white">{selectedDistrictName}</strong> • Taluk:{" "}
                      <strong className="text-slate-900 dark:text-white">{selectedTalukName}</strong>
                      {selectedVillageName && (
                        <span>
                          {" "}• Village: <strong className="text-slate-900 dark:text-white">{selectedVillageName}</strong>
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                <button
                  type="button"
                  disabled={!selectedDistrictId || !selectedTalukId || !selectedVillageId}
                  onClick={() => setCurrentStep(2)}
                  className="px-6 py-3 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs sm:text-sm font-bold transition-all disabled:opacity-50 flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  <span>{tamil ? "அடுத்து: சேவைகள் தேர்வு" : "Next: Select Services"}</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: SELECT SERVICES (Image 3 reference) */}
          {currentStep === 2 && (
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 sm:p-8 shadow-xs space-y-6 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Select Services</span>
                    <span className="text-rose-500">*</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    {tamil ? "ஒன்று அல்லது அதற்கு மேற்பட்ட சேவைகளைத் தேர்ந்தெடுக்கவும்" : "Select one or more services"}
                  </p>
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-72">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={serviceSearch}
                    onChange={(e) => setServiceSearch(e.target.value)}
                    placeholder={tamil ? "சேவைகளைத் தேடுங்கள்..." : "Search services..."}
                    className="w-full pl-9 pr-4 h-10 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                  />
                </div>
              </div>

              {/* Category Filter Pills (Matching Image 3 counts) */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                {categoriesList.map((cat) => {
                  const isActive = activeCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setActiveCategory(cat.id)}
                      className={`flex-shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        isActive
                          ? "bg-[#1e3a8a] text-white border-[#1e3a8a] shadow-2xs"
                          : "bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {cat.label} ({cat.count})
                    </button>
                  );
                })}
              </div>

              {/* Services List Table / Cards with Checkboxes (Matching Image 3) */}
              <div className="space-y-2 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-700/60 max-h-[480px] overflow-y-auto">
                {loadingServices ? (
                  <div className="p-8 text-center text-xs text-slate-400">Loading services catalogue...</div>
                ) : filteredServices.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">No services found matching your criteria.</div>
                ) : (
                  filteredServices.map((service) => {
                    const isSelected = selectedServiceIds.includes(service.id);
                    return (
                      <label
                        key={service.id}
                        className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-blue-50/60 dark:bg-blue-950/30"
                            : "hover:bg-slate-50/80 dark:hover:bg-slate-900/40"
                        }`}
                      >
                        <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectService(service.id)}
                            className="w-5 h-5 rounded-md text-[#1e3a8a] focus:ring-[#1e3a8a] border-slate-300 dark:border-slate-700 shrink-0 cursor-pointer"
                          />
                          <div>
                            <span className="font-bold text-sm text-slate-900 dark:text-white block">
                              {service.name}
                            </span>
                            {service.nameTa && service.nameTa !== service.name && (
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-sans">
                                {service.nameTa}
                              </span>
                            )}
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                              {service.category}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-sm font-black text-slate-900 dark:text-white font-mono">
                            {service.fee === 0 ? "Free" : `₹${service.fee.toFixed(2)}`}
                          </span>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>

              {/* Bottom Sticky Selection Summary */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-slate-600 dark:text-slate-300">
                  <span>Selected: </span>
                  <strong className="text-slate-900 dark:text-white font-bold">{selectedServiceIds.length}</strong> service(s)
                  <span className="mx-2">•</span>
                  <span>Total Statutory Fee: </span>
                  <strong className="text-lg font-black text-[#1e3a8a] dark:text-blue-400 font-mono">
                    ₹{totalServicesFee.toFixed(2)}
                  </strong>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 transition-colors"
                  >
                    <ArrowLeft size={14} className="inline mr-1" />
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={selectedServiceIds.length === 0}
                    onClick={() => setCurrentStep(3)}
                    className="px-6 py-2.5 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs sm:text-sm font-bold transition-all disabled:opacity-50 flex items-center gap-2 shadow-xs cursor-pointer"
                  >
                    <span>Next: Aadhaar Details</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: AADHAAR DETAILS */}
          {currentStep === 3 && (
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 sm:p-8 shadow-xs space-y-6 animate-in fade-in">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                  Step 3: Aadhaar Details
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Enter your details as printed on Aadhaar. This form records the information but does not authenticate it with UIDAI.
                </p>
              </div>

              <div className="max-w-xl space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Aadhaar Number / ஆதார் எண் <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={14}
                    value={aadhaarInput}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "").slice(0, 12);
                      const formatted = v.replace(/(\d{4})(?=\d)/g, "$1 ");
                      setAadhaarInput(formatted);
                      setIsAadhaarProvided(false);
                    }}
                    placeholder="XXXX XXXX XXXX (12-digit Aadhaar number)"
                    className="w-full h-12 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono tracking-wider font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Applicant Name (As printed on Aadhaar) / ஆதார் பெயர் <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={aadhaarName}
                    onChange={(e) => setAadhaarName(e.target.value)}
                    placeholder="Enter full name as per Aadhaar Card"
                    className="w-full h-12 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                  />
                </div>

                {/* Statutory Consent Box */}
                <label className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aadhaarConsent}
                    onChange={(e) => setAadhaarConsent(e.target.checked)}
                    className="w-4 h-4 text-[#1e3a8a] focus:ring-[#1e3a8a] rounded-sm mt-0.5 shrink-0"
                  />
                  <span>
                    I voluntarily submit my Aadhaar number and declare that the information provided is accurate for
                    the purpose of processing this Government of Tamil Nadu E-CSC application.
                  </span>
                </label>

                {/* Aadhaar Verify Action */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleVerifyAadhaar}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                      isAadhaarProvided
                        ? "bg-emerald-600 text-white cursor-default"
                        : "bg-[#1e3a8a] hover:bg-[#1e40af] text-white shadow-xs cursor-pointer"
                    }`}
                  >
                    {isAadhaarProvided ? (
                      <>
                        <Check size={16} />
                        <span>Details recorded</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={16} />
                        <span>Check details</span>
                      </>
                    )}
                  </button>

                  {isAadhaarProvided && (
                    <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 size={14} /> Format and consent checked
                    </span>
                  )}
                </div>
              </div>

              {/* Navigation Buttons */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 transition-colors"
                >
                  <ArrowLeft size={14} className="inline mr-1" /> Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (handleVerifyAadhaar()) setCurrentStep(4);
                  }}
                  className="px-6 py-2.5 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  <span>Next: Fill Form</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: FILL FORM (Application Details - Fully Decongested, Expansive & Official) */}
          {currentStep === 4 && (
            <div className="space-y-8 animate-in fade-in">
              {/* Top Banner / Summary Header */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 sm:p-8 shadow-xs border-t-4 border-t-[#1e3a8a]">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-xs font-bold text-[#1e3a8a] dark:text-blue-400 mb-2">
                      <FileText size={14} />
                      <span>{tamil ? "படி 4 : விண்ணப்ப விவரங்கள்" : "Step 4 of 6 : Comprehensive Application Details"}</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                      {tamil ? "விண்ணப்பதாரர் மற்றும் முகவரி விவரங்கள்" : "Official Application & Domicile Particulars"}
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
                      {tamil
                        ? "அரசு வருவாய்த் துறை சான்றிதழ்களுக்காக விண்ணப்பதாரரின் அதிகாரப்பூர்வ விவரங்களை கீழே உள்ள படிவத்தில் தெளிவாக உள்ளிடவும். * குறியிடப்பட்டவை கட்டாயமானவை."
                        : "Enter the applicant's official particulars exactly as recorded in revenue and Aadhaar records. All fields marked with asterisk (*) are statutory requirements."}
                    </p>
                  </div>

                  {/* Summary Badges on the right */}
                  <div className="flex flex-wrap lg:flex-col gap-2 shrink-0">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <MapPin size={14} className="text-[#ea580c] shrink-0" />
                      <span>
                        <strong className="text-slate-900 dark:text-white">{selectedDistrictName || form.currentDistrict}</strong>
                        {selectedTalukName ? ` • ${selectedTalukName}` : ""}
                      </span>
                    </div>
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <Shield size={14} className="text-slate-500 shrink-0" />
                      <span>Aadhaar: <span className="font-mono font-bold">•••• •••• {(form.aadhaar || aadhaarInput).replace(/\D/g, "").slice(-4) || "Not entered"}</span></span>
                    </div>
                  </div>
                </div>
              </div>

              {Object.keys(formErrors).length > 0 && (
                <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
                  <p className="font-semibold">Please correct these required details before continuing:</p>
                  <ul className="mt-1 list-inside list-disc">{Object.values(formErrors).slice(0, 8).map((error, index) => <li key={`${index}-${error}`}>{error}</li>)}</ul>
                </div>
              )}

              {selectedServicesObjects.some((service) => service.fields.length > 0) && (
                <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 sm:p-7 shadow-xs space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Service-specific information</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Complete the extra details requested for each selected service.</p>
                  </div>
                  {selectedServicesObjects.filter((service) => service.fields.length > 0).map((service) => (
                    <div key={service.id} className="space-y-4">
                      <h4 className="border-b border-slate-100 dark:border-slate-700 pb-2 text-sm font-bold text-[#1e3a8a] dark:text-blue-300">{service.name}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {service.fields.map((field) => {
                          const fieldType = field.type.toLowerCase();
                          const value = serviceFieldValues[field.key] || "";
                          const controlClass = "w-full min-h-11 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]";
                          const options = Array.isArray(field.options) ? field.options : String(field.options || "").split(/[\n,|]/).map((option) => option.trim()).filter(Boolean);
                          return (
                            <div key={field.id} className={field.width === "full" ? "md:col-span-2" : ""}>
                              <label htmlFor={`service-field-${field.id}`} className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                                {field.name}{field.required && <span className="text-rose-500"> *</span>}
                              </label>
                              {fieldType === "file" ? (
                                <div className="space-y-2">
                                  <input id={`service-field-${field.id}`} type="file" accept=".pdf,.jpg,.jpeg,.png" className={controlClass} onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleServiceFileUpload(field.key, file); }} />
                                  {value && <a className="text-xs font-medium text-blue-700 underline" href={value} target="_blank" rel="noreferrer">Uploaded document</a>}
                                </div>
                              ) : fieldType === "select" || fieldType === "dropdown" || fieldType === "radio" ? (
                                fieldType === "radio" ? (
                                  <div className="flex flex-wrap gap-3">
                                    {options.map((option) => <label key={option} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm dark:border-slate-700"><input type="radio" name={`service-field-${field.id}`} value={option} checked={value === option} onChange={() => setServiceFieldValues((values) => ({ ...values, [field.key]: option }))} />{option}</label>)}
                                  </div>
                                ) : (
                                <select id={`service-field-${field.id}`} value={value} onChange={(event) => setServiceFieldValues((values) => ({ ...values, [field.key]: event.target.value }))} className={controlClass}>
                                  <option value="">Select {field.name}</option>
                                  {options.map((option) => <option key={option} value={option}>{option}</option>)}
                                </select>
                                )
                              ) : fieldType === "checkbox" ? (
                                <label className="flex min-h-11 items-center gap-2 text-sm text-slate-700 dark:text-slate-300"><input type="checkbox" checked={value === "true"} onChange={(event) => setServiceFieldValues((values) => ({ ...values, [field.key]: event.target.checked ? "true" : "" }))} />{field.placeholder || "I confirm"}</label>
                              ) : fieldType === "textarea" ? (
                                <textarea id={`service-field-${field.id}`} value={value} onChange={(event) => setServiceFieldValues((values) => ({ ...values, [field.key]: event.target.value }))} placeholder={field.placeholder || "Enter details"} rows={3} className={`${controlClass} py-2`} />
                              ) : (
                                <input id={`service-field-${field.id}`} type={["number", "date", "email", "tel", "phone"].includes(fieldType) ? (fieldType === "phone" ? "tel" : fieldType) : "text"} value={value} onChange={(event) => setServiceFieldValues((values) => ({ ...values, [field.key]: event.target.value }))} placeholder={field.placeholder || `Enter ${field.name.toLowerCase()}`} className={controlClass} />
                              )}
                              {field.helpText && <p className="mt-1 text-xs text-slate-500">{field.helpText}</p>}
                              {formErrors[field.key] && <p className="mt-1 text-xs text-rose-600">{formErrors[field.key]}</p>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </section>
              )}

              {/* CARD 1: PERSONAL PARTICULARS */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 sm:p-8 shadow-xs border-t-4 border-t-[#1e3a8a] space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/80 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#1e3a8a] dark:text-blue-400 border border-blue-200 dark:border-blue-800 flex items-center justify-center font-bold">
                      <User size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        {tamil ? "1. தனிப்பட்ட விவரங்கள்" : "1. Applicant Personal Particulars"}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {tamil ? "விண்ணப்பதாரரின் அடையாள விவரங்கள்" : "Identity details provided by the applicant"}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">
                    Section 1 / 6
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Aadhaar Number */}
                  <div>
                    <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between mb-2">
                      <span>Aadhaar Number <span className="text-rose-500">*</span></span>
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        Details provided
                      </span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        readOnly
                        value={(form.aadhaar || aadhaarInput).replace(/\D/g, "").length === 12 ? `XXXX XXXX ${(form.aadhaar || aadhaarInput).replace(/\D/g, "").slice(-4)}` : "12-digit Aadhaar"}
                        className="w-full h-12 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 text-sm font-mono font-bold text-slate-700 dark:text-slate-300 outline-none cursor-not-allowed"
                      />
                      <ShieldCheck className="w-5 h-5 text-emerald-600 absolute right-3.5 top-3.5 pointer-events-none" />
                    </div>
                  </div>

                  {/* Appellation */}
                  <div>
                    <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2">
                      Appellation / தலைப்பு விகுதி <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={form.appellation}
                      onChange={(e) => setForm({ ...form, appellation: e.target.value })}
                      className="w-full h-12 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#1e3a8a] transition-all"
                    >
                      <option value="">Select title</option>
                      <option value="Thiru">Thiru / திரு (Mr.)</option>
                      <option value="Thirumathi">Thirumathi / திருமதி (Mrs.)</option>
                      <option value="Selvi">Selvi / செல்வி (Ms. / Miss)</option>
                      <option value="Dr.">Dr. / மருத்துவர் (Doctor)</option>
                      <option value="Prof.">Prof. / பேராசிரியர் (Professor)</option>
                    </select>
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2">
                      Gender / பாலினம் <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={form.gender}
                      onChange={(e) => setForm({ ...form, gender: e.target.value })}
                      className="w-full h-12 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#1e3a8a] transition-all"
                    >
                      <option value="">Select gender</option>
                      <option value="Male">Male / ஆண்</option>
                      <option value="Female">Female / பெண்</option>
                      <option value="Transgender">Transgender / மூன்றாம் பாலினம்</option>
                    </select>
                  </div>

                  {/* Applicant Name (English) */}
                  <div>
                    <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between mb-2">
                      <span>Applicant Name (English) <span className="text-rose-500">*</span></span>
                      <span className="text-[11px] font-medium text-slate-400">As per Aadhaar</span>
                    </label>
                    <input
                      type="text"
                      value={form.applicantName}
                      onChange={(e) => {
                        setForm({ ...form, applicantName: e.target.value });
                        if (formErrors.applicantName) setFormErrors({ ...formErrors, applicantName: "" });
                      }}
                      placeholder="Enter full name in English (e.g. KARTHIKEYAN M)"
                      className={`w-full h-12 px-4 rounded-xl border ${
                        formErrors.applicantName
                          ? "border-rose-500 bg-rose-50/20 ring-1 ring-rose-400"
                          : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      } text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#1e3a8a] transition-all`}
                    />
                    {formErrors.applicantName && (
                      <p className="text-xs text-rose-600 font-semibold mt-1.5 flex items-center gap-1">
                        <AlertCircle size={13} /> {formErrors.applicantName}
                      </p>
                    )}
                  </div>

                  {/* Applicant Name (Tamil) */}
                  <div>
                    <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between mb-2">
                      <span>Applicant Name (Tamil)</span>
                      <span className="text-[11px] font-medium text-slate-400">விண்ணப்பதாரர் பெயர்</span>
                    </label>
                    <input
                      type="text"
                      value={form.applicantNameTa}
                      onChange={(e) => setForm({ ...form, applicantNameTa: e.target.value })}
                      placeholder="விண்ணப்பதாரர் பெயர் (எ.கா. கார்த்திகேயன்)"
                      className="w-full h-12 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#1e3a8a] transition-all"
                    />
                  </div>

                  {/* Marital Status */}
                  <div>
                    <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2">
                      Marital Status / திருமண நிலை <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={form.maritalStatus}
                      onChange={(e) => setForm({ ...form, maritalStatus: e.target.value })}
                      className="w-full h-12 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#1e3a8a] transition-all"
                    >
                      <option value="">Select marital status</option>
                      <option value="Single">Single / திருமணமாகாதவர்</option>
                      <option value="Married">Married / திருமணமானவர்</option>
                      <option value="Widowed">Widowed / கணவரை / மனைவியை இழந்தவர்</option>
                      <option value="Divorced">Divorced / விவாகரத்து பெற்றவர்</option>
                    </select>
                  </div>

                  {/* Date of Birth */}
                  <div className="md:col-span-2 lg:col-span-1">
                    <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between mb-2">
                      <span>Date of Birth / பிறந்த தேதி <span className="text-rose-500">*</span></span>
                      {form.dob && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-[#1e3a8a] border border-blue-200">
                          {(() => {
                            const y = new Date(form.dob).getFullYear();
                            const cur = new Date().getFullYear();
                            const a = cur - y;
                            return a > 0 ? `${a} yrs` : "";
                          })()}
                        </span>
                      )}
                    </label>
                    <input
                      type="date"
                      value={form.dob}
                      onChange={(e) => {
                        setForm({ ...form, dob: e.target.value });
                        if (formErrors.dob) setFormErrors({ ...formErrors, dob: "" });
                      }}
                      className={`w-full h-12 px-4 rounded-xl border ${
                        formErrors.dob
                          ? "border-rose-500 bg-rose-50/20 ring-1 ring-rose-400"
                          : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      } text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#1e3a8a] transition-all`}
                    />
                    {formErrors.dob && (
                      <p className="text-xs text-rose-600 font-semibold mt-1.5 flex items-center gap-1">
                        <AlertCircle size={13} /> {formErrors.dob}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* CARD 2: FAMILY & RELATIONSHIP PARTICULARS */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 sm:p-8 shadow-xs border-t-4 border-t-[#1e3a8a] space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/80 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800 flex items-center justify-center font-bold">
                      <Heart size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        {tamil ? "2. குடும்பம் & உறவுமுறை விவரங்கள்" : "2. Family & Relationship Particulars"}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {tamil
                          ? "சான்றிதழில் இடம்பெற வேண்டிய தந்தை, தாய் அல்லது கணவர் பெயர் விவரங்கள்"
                          : "Parental and spouse particulars to be endorsed on issued statutory certificates"}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">
                    Section 2 / 6
                  </span>
                </div>

                {/* Primary Endorsement Selector */}
                <div className="p-4 sm:p-5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <FileBadge size={16} className="text-[#1e3a8a]" />
                      <span>Whose name should appear on the certificate? / சான்றிதழில் இடம்பெற வேண்டிய உறவுமுறை <span className="text-rose-500">*</span></span>
                    </label>
                    <span className="text-[11px] font-semibold text-slate-500">Certificate Endorsement</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Select whose name will be officially printed under parentage / relationship (S/o, D/o, W/o, C/o) on the final digital revenue certificate.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    {[
                      { val: "Father", label: "Father Name", labelTa: "தந்தை பெயர்" },
                      { val: "Husband", label: "Husband Name", labelTa: "கணவர் பெயர்" },
                      { val: "Mother", label: "Mother Name", labelTa: "தாய் பெயர்" },
                      { val: "Guardian", label: "Guardian Name", labelTa: "பாதுகாவலர்" },
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => setForm({ ...form, relationship: opt.val })}
                        className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                          form.relationship === opt.val
                            ? "bg-[#1e3a8a] text-white border-[#1e3a8a] shadow-xs"
                            : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-slate-400"
                        }`}
                      >
                        <span className="text-xs font-bold">{opt.label}</span>
                        <span className={`text-[11px] ${form.relationship === opt.val ? "text-blue-100" : "text-slate-500"}`}>
                          {opt.labelTa}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Side-by-side Pairs for Parents & Spouse */}
                <div className="space-y-6 pt-2">
                  {/* Father Details Pair */}
                  <div className="p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#1e3a8a] dark:text-blue-400 mb-4 flex items-center gap-1.5">
                      <User size={14} /> Father's Particulars / தந்தை விவரங்கள்
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2">
                          Father Name (English) {form.relationship !== "Husband" && <span className="text-rose-500">*</span>}
                        </label>
                        <input
                          type="text"
                          value={form.fatherName}
                          onChange={(e) => {
                            setForm({ ...form, fatherName: e.target.value });
                            if (formErrors.fatherName) setFormErrors({ ...formErrors, fatherName: "" });
                          }}
                          placeholder="Father's full name in English"
                          className={`w-full h-12 px-4 rounded-xl border ${
                            formErrors.fatherName
                              ? "border-rose-500 bg-rose-50/20 ring-1 ring-rose-400"
                              : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                          } text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#1e3a8a] transition-all`}
                        />
                        {formErrors.fatherName && (
                          <p className="text-xs text-rose-600 font-semibold mt-1.5 flex items-center gap-1">
                            <AlertCircle size={13} /> {formErrors.fatherName}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2">
                          Father Name (Tamil) / தந்தை பெயர்
                        </label>
                        <input
                          type="text"
                          value={form.fatherNameTa}
                          onChange={(e) => setForm({ ...form, fatherNameTa: e.target.value })}
                          placeholder="தந்தை பெயர் (தமிழ்)"
                          className="w-full h-12 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#1e3a8a] transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Mother Details Pair */}
                  <div className="p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#1e3a8a] dark:text-blue-400 mb-4 flex items-center gap-1.5">
                      <User size={14} /> Mother's Particulars / தாய் விவரங்கள்
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2">
                          Mother Name (English) {form.relationship !== "Husband" && <span className="text-rose-500">*</span>}
                        </label>
                        <input
                          type="text"
                          value={form.motherName}
                          onChange={(e) => {
                            setForm({ ...form, motherName: e.target.value });
                            if (formErrors.motherName) setFormErrors({ ...formErrors, motherName: "" });
                          }}
                          placeholder="Mother's full name in English"
                          className={`w-full h-12 px-4 rounded-xl border ${
                            formErrors.motherName
                              ? "border-rose-500 bg-rose-50/20 ring-1 ring-rose-400"
                              : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                          } text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#1e3a8a] transition-all`}
                        />
                        {formErrors.motherName && (
                          <p className="text-xs text-rose-600 font-semibold mt-1.5 flex items-center gap-1">
                            <AlertCircle size={13} /> {formErrors.motherName}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2">
                          Mother Name (Tamil) / தாய் பெயர்
                        </label>
                        <input
                          type="text"
                          value={form.motherNameTa}
                          onChange={(e) => setForm({ ...form, motherNameTa: e.target.value })}
                          placeholder="தாய் பெயர் (தமிழ்)"
                          className="w-full h-12 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#1e3a8a] transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Husband / Spouse Details Pair */}
                  <div className="p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#1e3a8a] dark:text-blue-400 flex items-center gap-1.5">
                        <User size={14} /> Husband / Spouse Particulars / கணவர் விவரங்கள்
                      </h4>
                      <span className="text-[11px] font-semibold text-slate-400">
                        {form.relationship === "Husband" ? "Required (Certificate Endorsement)" : "Optional / If Married"}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2">
                          Husband Name (English) {form.relationship === "Husband" && <span className="text-rose-500">*</span>}
                        </label>
                        <input
                          type="text"
                          value={form.husbandName}
                          onChange={(e) => {
                            setForm({ ...form, husbandName: e.target.value });
                            if (formErrors.husbandName) setFormErrors({ ...formErrors, husbandName: "" });
                          }}
                          placeholder="Husband / Spouse full name in English"
                          className={`w-full h-12 px-4 rounded-xl border ${
                            formErrors.husbandName
                              ? "border-rose-500 bg-rose-50/20 ring-1 ring-rose-400"
                              : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                          } text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#1e3a8a] transition-all`}
                        />
                        {formErrors.husbandName && (
                          <p className="text-xs text-rose-600 font-semibold mt-1.5 flex items-center gap-1">
                            <AlertCircle size={13} /> {formErrors.husbandName}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2">
                          Husband Name (Tamil) / கணவர் பெயர்
                        </label>
                        <input
                          type="text"
                          value={form.husbandNameTa}
                          onChange={(e) => setForm({ ...form, husbandNameTa: e.target.value })}
                          placeholder="கணவர் பெயர் (தமிழ்)"
                          className="w-full h-12 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#1e3a8a] transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD 3: SOCIAL, COMMUNITY & OCCUPATION */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 sm:p-8 shadow-xs border-t-4 border-t-[#1e3a8a] space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/80 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center justify-center font-bold">
                      <Briefcase size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        {tamil ? "3. சமூகம், மதம் மற்றும் தொழில்" : "3. Social Category, Faith & Profession"}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {tamil ? "சாதி, மதம் மற்றும் தொழில் விவரங்கள்" : "Official classification for reservation, welfare, and socio-economic records"}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">
                    Section 3 / 6
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Religion */}
                  <div>
                    <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2">
                      Religion / மதம் <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={form.religion}
                      onChange={(e) => setForm({ ...form, religion: e.target.value })}
                      className="w-full h-12 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#1e3a8a] transition-all"
                    >
                      <option value="">Select religion</option>
                      <option value="Hindu">Hindu / இந்து</option>
                      <option value="Muslim">Muslim / முஸ்லிம்</option>
                      <option value="Christian">Christian / கிறிஸ்தவர்</option>
                      <option value="Sikh">Sikh / சீக்கியர்</option>
                      <option value="Jain">Jain / சமணர்</option>
                      <option value="Buddhist">Buddhist / பௌத்தர்</option>
                      <option value="Other">Other / பிற</option>
                    </select>
                  </div>

                  {/* Community */}
                  <div>
                    <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2">
                      Community / சாதிப் பிரிவு <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={form.community}
                      onChange={(e) => setForm({ ...form, community: e.target.value })}
                      className="w-full h-12 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#1e3a8a] transition-all"
                    >
                      <option value="">Select community</option>
                      <option value="OC">OC (Open Competition)</option>
                      <option value="BC">BC (Backward Class)</option>
                      <option value="BCM">BCM (Backward Class Muslim)</option>
                      <option value="MBC">MBC (Most Backward Class)</option>
                      <option value="DNC">DNC (Denotified Communities)</option>
                      <option value="SC">SC (Scheduled Caste)</option>
                      <option value="SC(A)">SC(A) (Arunthathiyar)</option>
                      <option value="ST">ST (Scheduled Tribe)</option>
                    </select>
                  </div>

                  {/* Occupation */}
                  <div>
                    <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2">
                      Occupation / தொழில் <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.occupation}
                      onChange={(e) => setForm({ ...form, occupation: e.target.value })}
                      placeholder="e.g. Agriculture & Allied / Private / Business / Student"
                      className="w-full h-12 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#1e3a8a] transition-all"
                    />
                  </div>

                  {/* Education Qualification */}
                  <div>
                    <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2">
                      Education Qualification / கல்வித் தகுதி
                    </label>
                    <input
                      type="text"
                      value={form.education}
                      onChange={(e) => setForm({ ...form, education: e.target.value })}
                      placeholder="e.g. SSLC / HSC / Graduate / Post Graduate / Diploma"
                      className="w-full h-12 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#1e3a8a] transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* CARD 4: CURRENT RESIDENTIAL ADDRESS */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 sm:p-8 shadow-xs border-t-4 border-t-[#1e3a8a] space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/80 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center font-bold">
                      <MapPin size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        {tamil ? "4. தற்போதைய வசிப்பிட முகவரி" : "4. Current Residential Address"}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {tamil
                          ? "விண்ணப்பதாரர் தற்போது வசிக்கும் உண்மையான முகவரி"
                          : "Actual place of ordinary residence where physical verification may be conducted"}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">
                    Section 4 / 6
                  </span>
                </div>

                {/* Pre-filled Jurisdiction Notification */}
                <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-[#1e3a8a] dark:text-blue-400 shrink-0" />
                  <div className="text-xs text-slate-700 dark:text-slate-300 flex-1">
                    <strong className="text-[#1e3a8a] dark:text-blue-300">Centre Jurisdiction Assigned:</strong>{" "}
                    District: <span className="font-semibold">{form.currentDistrict || selectedDistrictName}</span> • 
                    Taluk: <span className="font-semibold">{form.currentTaluk || selectedTalukName || "Not assigned"}</span> • 
                    Revenue Village: <span className="font-semibold">{form.currentVillage || selectedVillageName || "Not assigned"}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Building / Door / Flat No. */}
                  <div>
                    <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2">
                      Building / Door / Flat No. / கதவு எண் <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.currentDoorNo}
                      onChange={(e) => {
                        setForm({ ...form, currentDoorNo: e.target.value });
                        if (formErrors.currentDoorNo) setFormErrors({ ...formErrors, currentDoorNo: "" });
                      }}
                      placeholder="e.g. Door No. 12/4B, 2nd Floor, Sri Flats"
                      className={`w-full h-12 px-4 rounded-xl border ${
                        formErrors.currentDoorNo
                          ? "border-rose-500 bg-rose-50/20 ring-1 ring-rose-400"
                          : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      } text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#1e3a8a] transition-all`}
                    />
                    {formErrors.currentDoorNo && (
                      <p className="text-xs text-rose-600 font-semibold mt-1.5 flex items-center gap-1">
                        <AlertCircle size={13} /> {formErrors.currentDoorNo}
                      </p>
                    )}
                  </div>

                  {/* Street Name / No. / Hamlet */}
                  <div>
                    <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2">
                      Street Name / No. / Hamlet / தெரு பெயர் <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.currentStreet}
                      onChange={(e) => {
                        setForm({ ...form, currentStreet: e.target.value });
                        if (formErrors.currentStreet) setFormErrors({ ...formErrors, currentStreet: "" });
                      }}
                      placeholder="e.g. Gandhi Salai, Anna Nagar Main Road"
                      className={`w-full h-12 px-4 rounded-xl border ${
                        formErrors.currentStreet
                          ? "border-rose-500 bg-rose-50/20 ring-1 ring-rose-400"
                          : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      } text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#1e3a8a] transition-all`}
                    />
                    {formErrors.currentStreet && (
                      <p className="text-xs text-rose-600 font-semibold mt-1.5 flex items-center gap-1">
                        <AlertCircle size={13} /> {formErrors.currentStreet}
                      </p>
                    )}
                  </div>

                  {/* Area / Ward No. / Name */}
                  <div>
                    <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2">
                      Area / Ward No. / Locality / பகுதி / வார்டு எண்
                    </label>
                    <input
                      type="text"
                      value={form.currentWard}
                      onChange={(e) => setForm({ ...form, currentWard: e.target.value })}
                      placeholder="e.g. Ward 4 / East Zone"
                      className="w-full h-12 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#1e3a8a] transition-all"
                    />
                  </div>

                  {/* Pin Code */}
                  <div>
                    <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2">
                      Pin Code / அஞ்சல் குறியீட்டு எண் <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={form.currentPinCode}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        setForm({ ...form, currentPinCode: val });
                        if (formErrors.currentPinCode) setFormErrors({ ...formErrors, currentPinCode: "" });
                      }}
                      placeholder="6-digit Postal PIN Code (e.g. 638001)"
                      className={`w-full h-12 px-4 rounded-xl border ${
                        formErrors.currentPinCode
                          ? "border-rose-500 bg-rose-50/20 ring-1 ring-rose-400"
                          : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      } text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#1e3a8a] transition-all`}
                    />
                    {formErrors.currentPinCode && (
                      <p className="text-xs text-rose-600 font-semibold mt-1.5 flex items-center gap-1">
                        <AlertCircle size={13} /> {formErrors.currentPinCode}
                      </p>
                    )}
                  </div>
                </div>

                {/* District, Taluk, Village (3 columns) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
                  <div>
                    <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2">
                      District / மாவட்டம் <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.currentDistrict || selectedDistrictName}
                      onChange={(e) => setForm({ ...form, currentDistrict: e.target.value })}
                      className="w-full h-12 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2">
                      Taluk / வட்டம் <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.currentTaluk || selectedTalukName}
                      onChange={(e) => setForm({ ...form, currentTaluk: e.target.value })}
                      placeholder="Taluk name"
                      className="w-full h-12 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2">
                      Revenue Village / கிராமம் <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.currentVillage || selectedVillageName}
                      onChange={(e) => setForm({ ...form, currentVillage: e.target.value })}
                      placeholder="Village / Ward"
                      className="w-full h-12 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* CARD 5: PERMANENT RESIDENTIAL ADDRESS */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 sm:p-8 shadow-xs border-t-4 border-t-[#1e3a8a] space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700/80 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800 flex items-center justify-center font-bold">
                      <Home size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        {tamil ? "5. நிரந்தர வசிப்பிட முகவரி" : "5. Permanent Residential Address"}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {tamil ? "சொந்த ஊர் / நிரந்தர வசிப்பிட விவரங்கள்" : "Official domicile address of applicant's ancestral or permanent residence"}
                      </p>
                    </div>
                  </div>

                  {/* Accessible "Same as Current" Toggle Box */}
                  <label className="inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-blue-50/70 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 cursor-pointer hover:bg-blue-100/60 transition-all">
                    <input
                      type="checkbox"
                      checked={form.sameAsCurrent}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setForm((prev) => ({
                          ...prev,
                          sameAsCurrent: checked,
                          permanentDistrict: checked ? prev.currentDistrict : prev.permanentDistrict,
                          permanentTaluk: checked ? prev.currentTaluk : prev.permanentTaluk,
                          permanentVillage: checked ? prev.currentVillage : prev.permanentVillage,
                          permanentWard: checked ? prev.currentWard : prev.permanentWard,
                          permanentStreet: checked ? prev.currentStreet : prev.permanentStreet,
                          permanentDoorNo: checked ? prev.currentDoorNo : prev.permanentDoorNo,
                          permanentPinCode: checked ? prev.currentPinCode : prev.permanentPinCode,
                        }));
                      }}
                      className="w-4 h-4 text-[#1e3a8a] rounded-sm focus:ring-[#1e3a8a] cursor-pointer"
                    />
                    <span className="text-xs font-bold text-[#1e3a8a] dark:text-blue-300">
                      Same as Current Address / தற்போதைய முகவரியே
                    </span>
                  </label>
                </div>

                {/* If Same as Current is Checked */}
                {form.sameAsCurrent ? (
                  <div className="p-5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 flex items-center gap-3 text-xs text-emerald-900 dark:text-emerald-300">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <strong>Permanent Address Synchronized:</strong> Your permanent residence is officially registered as identical to your current residence.
                    </div>
                  </div>
                ) : (
                  /* If Unchecked, Spacious 2-Column Inputs */
                  <div className="space-y-6 animate-in fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2">
                          Door / Flat No. (Permanent)
                        </label>
                        <input
                          type="text"
                          value={form.permanentDoorNo}
                          onChange={(e) => setForm({ ...form, permanentDoorNo: e.target.value })}
                          placeholder="Building / Door / Flat No."
                          className="w-full h-12 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2">
                          Street Name (Permanent)
                        </label>
                        <input
                          type="text"
                          value={form.permanentStreet}
                          onChange={(e) => setForm({ ...form, permanentStreet: e.target.value })}
                          placeholder="Street Name / Hamlet"
                          className="w-full h-12 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2">
                          Area / Ward No. (Permanent)
                        </label>
                        <input
                          type="text"
                          value={form.permanentWard}
                          onChange={(e) => setForm({ ...form, permanentWard: e.target.value })}
                          placeholder="Area / Ward No."
                          className="w-full h-12 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2">
                          Pin Code (Permanent)
                        </label>
                        <input
                          type="text"
                          maxLength={6}
                          value={form.permanentPinCode}
                          onChange={(e) => setForm({ ...form, permanentPinCode: e.target.value.replace(/\D/g, "") })}
                          placeholder="6-digit Pin Code"
                          className="w-full h-12 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                      <div>
                        <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2">
                          District (Permanent)
                        </label>
                        <input
                          type="text"
                          value={form.permanentDistrict}
                          onChange={(e) => setForm({ ...form, permanentDistrict: e.target.value })}
                          className="w-full h-12 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2">
                          Taluk (Permanent)
                        </label>
                        <input
                          type="text"
                          value={form.permanentTaluk}
                          onChange={(e) => setForm({ ...form, permanentTaluk: e.target.value })}
                          className="w-full h-12 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2">
                          Revenue Village (Permanent)
                        </label>
                        <input
                          type="text"
                          value={form.permanentVillage}
                          onChange={(e) => setForm({ ...form, permanentVillage: e.target.value })}
                          className="w-full h-12 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* CARD 6: CONTACT & COMMUNICATION DETAILS */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 sm:p-8 shadow-xs border-t-4 border-t-[#1e3a8a] space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/80 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800 flex items-center justify-center font-bold">
                      <Phone size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        {tamil ? "6. தொடர்பு விவரங்கள்" : "6. Communication & Contact Particulars"}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {tamil
                          ? "விண்ணப்பத்தின் நிலை மற்றும் சான்றிதழ் குறித்த குறுஞ்செய்தி பெற"
                          : "Used for official SMS tracking notifications and digital certificate dispatch"}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">
                    Section 6 / 6
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Mobile Number with +91 Addon */}
                  <div>
                    <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2">
                      Mobile Number / அலைபேசி எண் <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex rounded-xl shadow-xs overflow-hidden">
                      <span className="inline-flex items-center px-4 rounded-l-xl border border-r-0 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-sm font-bold text-slate-600 dark:text-slate-300">
                        +91
                      </span>
                      <input
                        type="tel"
                        maxLength={10}
                        value={form.mobileNumber}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "");
                          setForm({ ...form, mobileNumber: val });
                          if (formErrors.mobileNumber) setFormErrors({ ...formErrors, mobileNumber: "" });
                        }}
                        placeholder="10-digit Mobile Number"
                        className={`flex-1 h-12 px-4 rounded-r-xl border ${
                          formErrors.mobileNumber
                            ? "border-rose-500 bg-rose-50/20 ring-1 ring-rose-400"
                            : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                        } text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#1e3a8a] transition-all`}
                      />
                    </div>
                    {formErrors.mobileNumber && (
                      <p className="text-xs text-rose-600 font-semibold mt-1.5 flex items-center gap-1">
                        <AlertCircle size={13} /> {formErrors.mobileNumber}
                      </p>
                    )}
                  </div>

                  {/* Email Id with Mail Icon */}
                  <div>
                    <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between mb-2">
                      <span>Email Id / மின்னஞ்சல் முகவரி</span>
                      <span className="text-[11px] font-semibold text-slate-400">Optional</span>
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={form.emailId}
                        onChange={(e) => setForm({ ...form, emailId: e.target.value })}
                        placeholder="e.g. citizen.applicant@gmail.com"
                        className="w-full h-12 pl-11 pr-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#1e3a8a] transition-all"
                      />
                      <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD 7: NAVIGATION ACTION BAR */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="w-full sm:w-auto h-12 px-6 rounded-xl border border-slate-300 text-slate-700 dark:text-slate-300 text-sm font-bold hover:bg-slate-100 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ArrowLeft size={16} />
                  <span>Back to Aadhaar</span>
                </button>

                <div className="text-xs text-slate-500 dark:text-slate-400 text-center sm:text-right hidden sm:block">
                  All mandatory entries must be verified before proceeding to document upload.
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (validateForm()) {
                      setCurrentStep(5);
                    } else {
                      showToast("Please complete all mandatory fields marked with *");
                    }
                  }}
                  className="w-full sm:w-auto h-12 px-8 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-sm font-bold transition-all flex items-center justify-center gap-2.5 shadow-md cursor-pointer hover:shadow-lg"
                >
                  <span>Next: Upload Documents</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: UPLOAD DOCUMENTS (0/6 mandatory as specified) */}
          {currentStep === 5 && (
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 sm:p-8 shadow-xs space-y-6 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    Step 5: Upload Supporting Documents
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    Upload clear scanned copies or photos (JPG, PNG, PDF up to 5MB):
                  </p>
                </div>

                {/* Counter Badge */}
                <div
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold border flex items-center gap-2 self-start sm:self-auto ${
                    uploadedCount === 6
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300"
                      : "bg-blue-50 text-[#1e3a8a] border-blue-200 dark:bg-blue-950/60 dark:text-blue-300"
                  }`}
                >
                  <UploadCloud size={16} />
                  <span>
                    {uploadedCount}/6 uploaded ({uploadedCount}/6 mandatory)
                  </span>
                </div>
              </div>

              {/* 6 Mandatory Documents Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      doc.uploaded
                        ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800"
                        : "bg-slate-50/60 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 hover:border-blue-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white block truncate">
                          {doc.label} <span className="text-rose-500">*</span>
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-sans truncate">
                          {doc.labelTa}
                        </span>
                      </div>
                      {doc.uploaded ? (
                        <span className="p-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300 shrink-0">
                          <Check size={14} strokeWidth={3} />
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                          Required
                        </span>
                      )}
                    </div>

                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-3 line-clamp-1">
                      {doc.description}
                    </p>

                    {/* Upload Controls */}
                    {doc.uploaded ? (
                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-900/50 flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 truncate block">
                            {doc.fileName || "Uploaded Document"}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {doc.fileSize ? `${(doc.fileSize / 1024).toFixed(0)} KB` : "Verified"}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeDoc(doc.key)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                          title="Remove & Re-upload"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ) : (
                      <label className="w-full h-20 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-[#1e3a8a] bg-white dark:bg-slate-800 flex flex-col items-center justify-center cursor-pointer transition-colors p-2 text-center group">
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          disabled={doc.isUploading}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleDocUpload(doc.key, file);
                          }}
                          className="hidden"
                        />
                        <UploadCloud className="w-5 h-5 text-slate-400 group-hover:text-[#1e3a8a] transition-colors mb-1" />
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 group-hover:text-[#1e3a8a]">
                          {doc.isUploading ? "Uploading..." : "Click to Upload File"}
                        </span>
                        <span className="text-[9px] text-slate-400">PDF, JPG or PNG (max 5MB)</span>
                      </label>
                    )}
                  </div>
                ))}
              </div>

              {/* Navigation Buttons */}
              <div className="pt-6 border-t border-slate-200 dark:border-slate-700 flex justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 transition-colors"
                >
                  <ArrowLeft size={14} className="inline mr-1" /> Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (uploadedCount < 6) {
                      showToast(`Please upload all 6 mandatory documents (${6 - uploadedCount} remaining)`);
                    } else {
                      setCurrentStep(6);
                    }
                  }}
                  className="px-6 py-2.5 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  <span>Next: Review &amp; Payment</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 6: PAYMENT & REVIEW */}
          {currentStep === 6 && (
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 sm:p-8 shadow-xs space-y-6 animate-in fade-in">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                  Step 6: Review &amp; Payment
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  Review your application particulars and remit the statutory fees:
                </p>
              </div>

              {/* Payment Pending Banner */}
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-center text-xs sm:text-sm font-black text-amber-900 dark:text-amber-300 tracking-wider uppercase">
                -- Payment Pending --
              </div>

              {/* Application Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Centre & Applicant Box */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-xs space-y-2.5">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 uppercase text-[11px] text-[#1e3a8a] dark:text-blue-400">
                    <UserCheck size={14} /> Applicant Particulars
                  </h4>
                  <div className="space-y-1 text-slate-600 dark:text-slate-300">
                    <p>
                      Name: <strong className="text-slate-900 dark:text-white">{form.appellation} {form.applicantName}</strong>
                    </p>
                    <p>
                      Aadhaar: <strong className="font-mono text-slate-900 dark:text-white">•••• •••• {(form.aadhaar || aadhaarInput).replace(/\D/g, "").slice(-4)}</strong>
                    </p>
                    <p>
                      Mobile: <strong className="text-slate-900 dark:text-white">{form.mobileNumber}</strong>
                    </p>
                    <p>
                      Jurisdiction: <strong className="text-slate-900 dark:text-white">{selectedDistrictName} / {selectedTalukName} / {selectedVillageName}</strong>
                    </p>
                  </div>
                </div>

                {/* Selected Services & Fee Box */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-xs space-y-2.5">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 uppercase text-[11px] text-[#1e3a8a] dark:text-blue-400">
                    <CreditCard size={14} /> Statutory Fee Breakdown
                  </h4>
                  <div className="space-y-1.5 text-slate-600 dark:text-slate-300">
                    {selectedServicesObjects.map((s) => (
                      <div key={s.id} className="flex justify-between items-center">
                        <span className="truncate pr-2">{s.name}</span>
                        <strong className="font-mono text-slate-900 dark:text-white shrink-0">
                          {s.fee === 0 ? "Free" : `₹${s.fee.toFixed(2)}`}
                        </strong>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-sm font-black text-slate-900 dark:text-white">
                      <span>Total Statutory Payable:</span>
                      <span className="text-[#1e3a8a] dark:text-blue-400 font-mono text-base">
                        ₹{totalServicesFee.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Uploaded Documents Checklist */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-xs">
                <h4 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-1.5 text-[11px] uppercase text-[#1e3a8a] dark:text-blue-400">
                  <FileCheck2 size={14} /> Uploaded Documents ({uploadedCount}/6)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {documents.map((d) => (
                    <div key={d.id} className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
                      <CheckCircle2 size={13} className="shrink-0" />
                      <span className="truncate">{d.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Action Buttons */}
              <div className="pt-6 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => setCurrentStep(5)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 transition-colors w-full sm:w-auto text-center"
                >
                  <ArrowLeft size={14} className="inline mr-1" /> Back to Documents
                </button>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                  {/* Option 1: Pay at Counter / Submit with Payment Pending */}
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleSubmitApplication("PENDING")}
                    className="w-full sm:w-auto px-5 py-3 rounded-xl border border-[#1e3a8a] text-[#1e3a8a] hover:bg-blue-50 dark:text-blue-300 dark:border-blue-700 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer text-center"
                  >
                    {isSubmitting ? "Submitting..." : "Submit with Payment Pending"}
                  </button>

                  {/* Option 2: Pay Online via Razorpay */}
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleSubmitApplication("ONLINE")}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs sm:text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md cursor-pointer"
                  >
                    <CreditCard size={16} />
                    <span>
                      {isSubmitting
                        ? "Processing..."
                        : totalServicesFee === 0
                        ? "Confirm Free Application"
                        : `Pay Online (₹${totalServicesFee.toFixed(2)})`}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      )}

      {/* VIEW 3: DEDICATED OFFICIAL SUBMISSION RECEIPT SESSION */}
      {viewMode === "RECEIPT" && submissionDetails && (
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 pb-36 space-y-6 animate-in fade-in">
          {/* Top Quick Actions Bar */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3 print:hidden">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Official E-CSC Acknowledgement &amp; Receipt Session
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined") window.print();
                }}
                className="px-3.5 py-2 rounded-xl bg-[#1e3a8a] text-white hover:bg-[#1e40af] text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <Printer size={14} />
                <span>{tamil ? "அச்சிடுக / Print" : "Print Receipt"}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("MY_APPLICATIONS")}
                className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <FileBox size={14} />
                <span>{tamil ? "எனது விண்ணப்பங்கள்" : "My Applications"}</span>
              </button>
              <button
                type="button"
                onClick={handleStartNewApplication}
                className="px-3.5 py-2 rounded-xl bg-orange-600 text-white hover:bg-orange-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <PlusCircle size={14} />
                <span>{tamil ? "புதிய சேவை விண்ணப்பிக்க" : "Apply Another"}</span>
              </button>
            </div>
          </div>

          {/* Official Letterhead Receipt Card */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl border-2 border-slate-300 dark:border-slate-700 shadow-xl print:border-none print:shadow-none">
            {/* Header Strip */}
            <div className="bg-[#1e3a8a] text-white p-6 sm:p-8 text-center space-y-1.5 rounded-t-[22px]">
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-xs font-extrabold tracking-widest uppercase text-amber-400">
                  Government of Tamil Nadu
                </span>
              </div>
              <h2 className="text-lg sm:text-2xl font-black tracking-tight">
                Department of E-Governance &amp; Citizen Service Centre (E-CSC)
              </h2>
              <p className="text-xs sm:text-sm text-blue-200 font-sans">
                மின்-மாவட்ட சேவை ஒப்புகை மற்றும் கட்டண ரசீது / Statutory Citizen Receipt
              </p>
            </div>

            {/* Application Acknowledgement Details */}
            <div className="p-6 sm:p-8 space-y-6">
              {/* Reference Number & Receipt Number Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-200 dark:border-emerald-800 text-xs">
                <div>
                  <span className="text-[11px] uppercase font-bold text-emerald-800 dark:text-emerald-300 block mb-0.5">
                    Application Reference No.
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-mono font-black text-emerald-900 dark:text-emerald-200 tracking-wide">
                      {submissionDetails.applicationId}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(submissionDetails.applicationId, "Application No.")}
                      className="p-1 rounded-md hover:bg-emerald-200/50 text-emerald-700 dark:text-emerald-300 print:hidden cursor-pointer"
                      title="Copy Application Number"
                    >
                      <Sparkles size={14} />
                    </button>
                  </div>
                </div>
                <div className="sm:text-right">
                  <span className="text-[11px] uppercase font-bold text-emerald-800 dark:text-emerald-300 block mb-0.5">
                    Receipt No. / ரசீது எண்
                  </span>
                  <span className="text-base font-mono font-bold text-slate-800 dark:text-slate-200">
                    {submissionDetails.receiptNo}
                  </span>
                </div>
              </div>

              {/* Table of Particulars */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-700 text-xs sm:text-sm">
                <div className="p-3.5 bg-slate-100 dark:bg-slate-900/60 flex justify-between font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px]">
                  <span>Particulars / விவரங்கள்</span>
                  <span>Details / விவர குறிப்பு</span>
                </div>
                <div className="p-3.5 flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Applicant Name / பெயர்</span>
                  <strong className="text-slate-900 dark:text-white">
                    {submissionDetails.appellation ? `${submissionDetails.appellation} ` : ""}{submissionDetails.applicantName}
                    {submissionDetails.applicantNameTa ? ` (${submissionDetails.applicantNameTa})` : ""}
                  </strong>
                </div>

                {/* Certificate Endorsement / Relationship */}
                <div className="p-3.5 flex justify-between items-center bg-blue-50/40 dark:bg-blue-950/20">
                  <span className="text-slate-600 dark:text-slate-300 font-medium">Certificate Endorsement / உறவுமுறை</span>
                  <span className="font-bold text-[#1e3a8a] dark:text-blue-300">
                    {submissionDetails.relationship === "Husband" && submissionDetails.husbandName
                      ? `W/o ${submissionDetails.husbandName}`
                      : submissionDetails.relationship === "Mother" && submissionDetails.motherName
                      ? `M/o ${submissionDetails.motherName}`
                      : submissionDetails.fatherName
                      ? `S/o or D/o ${submissionDetails.fatherName}`
                      : `${submissionDetails.relationship || "Father"}`}
                  </span>
                </div>

                {/* Husband / Spouse Name if present */}
                {submissionDetails.husbandName && (
                  <div className="p-3.5 flex justify-between items-center">
                    <span className="text-slate-500 dark:text-slate-400">Husband / Spouse Name / கணவர் பெயர்</span>
                    <strong className="text-slate-900 dark:text-white">
                      {submissionDetails.husbandName}
                      {submissionDetails.husbandNameTa ? ` (${submissionDetails.husbandNameTa})` : ""}
                    </strong>
                  </div>
                )}

                {/* Father's Name if present */}
                {submissionDetails.fatherName && (
                  <div className="p-3.5 flex justify-between items-center">
                    <span className="text-slate-500 dark:text-slate-400">Father's Name / தந்தை பெயர்</span>
                    <strong className="text-slate-900 dark:text-white">
                      {submissionDetails.fatherName}
                      {submissionDetails.fatherNameTa ? ` (${submissionDetails.fatherNameTa})` : ""}
                    </strong>
                  </div>
                )}

                {/* Mother's Name if present */}
                {submissionDetails.motherName && (
                  <div className="p-3.5 flex justify-between items-center">
                    <span className="text-slate-500 dark:text-slate-400">Mother's Name / தாய் பெயர்</span>
                    <strong className="text-slate-900 dark:text-white">
                      {submissionDetails.motherName}
                      {submissionDetails.motherNameTa ? ` (${submissionDetails.motherNameTa})` : ""}
                    </strong>
                  </div>
                )}

                <div className="p-3.5 flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Registered Mobile / அலைபேசி</span>
                  <strong className="font-mono text-slate-900 dark:text-white">{submissionDetails.mobileNumber}</strong>
                </div>

                <div className="p-3.5 flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Centre Jurisdiction / அதிகார வரம்பு</span>
                  <strong className="text-slate-900 dark:text-white">
                    {submissionDetails.district} / {submissionDetails.taluk} / {submissionDetails.village}
                  </strong>
                </div>

                <div className="p-3.5 flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Submission Date &amp; Time / சமர்ப்பித்த நாள்</span>
                  <strong className="text-slate-900 dark:text-white">{submissionDetails.date}</strong>
                </div>

                <div className="p-3.5 flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Payment Status / கட்டண நிலை</span>
                  <span
                    className={`font-bold px-3 py-1 rounded-full text-xs ${
                      submissionDetails.paymentStatus === "Success"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                    }`}
                  >
                    {submissionDetails.paymentStatus === "Success" ? "PAID (Online Verified)" : "PAYMENT PENDING (At CSC Desk)"}
                  </span>
                </div>

                {submissionDetails.razorpayPaymentId && (
                  <div className="p-3.5 flex justify-between items-center">
                    <span className="text-slate-500 dark:text-slate-400">Gateway Transaction ID</span>
                    <strong className="font-mono text-xs text-slate-900 dark:text-white">
                      {submissionDetails.razorpayPaymentId}
                    </strong>
                  </div>
                )}

                <div className="p-4 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 text-base font-black">
                  <span>Total Statutory Amount / மொத்தக் கட்டணம்</span>
                  <span className="text-[#1e3a8a] dark:text-blue-400 font-mono text-lg">
                    ₹{Number(submissionDetails.fee || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Services Breakdown */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                  <ListChecks size={15} /> Applied E-Services Breakdown
                </h4>
                <div className="space-y-2">
                  {submissionDetails.services.map((s: any) => (
                    <div
                      key={s.id}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs sm:text-sm"
                    >
                      <span className="font-medium">{s.name}</span>
                      <strong className="font-mono text-slate-900 dark:text-white">
                        {Number(s.fee) === 0 ? "Free / அரசு இலவச சேவை" : `₹${Number(s.fee).toFixed(2)}`}
                      </strong>
                    </div>
                  ))}
                </div>
              </div>

              {/* Security & Verification Disclaimer */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 text-center text-[11px] text-slate-500 space-y-1">
                <p className="font-medium text-slate-700 dark:text-slate-300">
                  This is a computer-generated statutory acknowledgment receipt issued by the Department of E-Governance, Government of Tamil Nadu.
                </p>
                <p>
                  No physical signature is required. For verification and certificate download, visit <span className="font-mono text-[#1e3a8a]">https://tnedistrict.tn.gov.in</span> with Application Reference No.
                </p>
              </div>

              {/* Bottom Action Buttons */}
              <div className="pt-6 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 print:hidden">
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== "undefined") window.print();
                  }}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Printer size={16} />
                  <span>{tamil ? "ரசீதை அச்சிடுக (Print)" : "Print Receipt"}</span>
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setViewMode("MY_APPLICATIONS")}
                    className="px-4 py-2.5 rounded-xl border border-[#1e3a8a] text-[#1e3a8a] dark:text-blue-300 text-xs font-bold hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <FileBox size={15} />
                    <span>{tamil ? "எனது விண்ணப்பங்கள்" : "Track in My Applications"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleStartNewApplication}
                    className="px-5 py-2.5 rounded-xl bg-[#1e3a8a] text-white text-xs font-bold hover:bg-[#1e40af] transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    <PlusCircle size={15} />
                    <span>{tamil ? "மற்றொரு சேவைக்கு விண்ணப்பிக்க" : "Apply Another Service"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* VIEW 4: MY APPLICATIONS (Image 1 reference) */}
      {viewMode === "MY_APPLICATIONS" && (
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewMode("LANDING")}
                  className="text-xs font-bold text-[#1e3a8a] dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <ArrowLeft size={13} /> Back to E-CSC
                </button>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
                {tamil ? "எனது விண்ணப்பங்கள்" : "My E-CSC Applications"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {tamil
                  ? "நீங்கள் சமர்ப்பித்த மின்-மாவட்ட விண்ணப்பங்களின் நேரலை நிலையை அறியவும்."
                  : "Review submission status, download receipts, and track officer decisions."}
              </p>
            </div>

            <button
              type="button"
              onClick={handleStartNewApplication}
              className="px-4 py-2.5 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-bold flex items-center gap-2 shadow-xs self-start sm:self-auto cursor-pointer"
            >
              <PlusCircle size={15} />
              <span>{tamil ? "புதிய விண்ணப்பம்" : "New Application"}</span>
            </button>
          </div>

          {/* Applications List */}
          {loadingMyApps ? (
            <div className="p-12 text-center text-xs text-slate-400 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#1e3a8a]" />
              <span>Loading applications ledger...</span>
            </div>
          ) : myApplications.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 space-y-3">
              <FileBox className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
                No E-CSC Applications Found
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                You have not submitted any e-district applications yet. Click "New Application" to get started.
              </p>
              <button
                type="button"
                onClick={handleStartNewApplication}
                className="mt-2 px-4 py-2 rounded-xl bg-[#1e3a8a] text-white text-xs font-bold hover:bg-[#1e40af]"
              >
                Apply Now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {myApplications.map((app) => (
                <div
                  key={app.id}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-[#1e3a8a] dark:text-blue-400">
                        {app.applicationNumber}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          app.paymentStatus === "Success"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        Payment: {app.paymentStatus}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          app.status === "accepted" || app.status === "approved"
                            ? "bg-emerald-50 text-emerald-700"
                            : app.status === "rejected"
                            ? "bg-rose-50 text-rose-700"
                            : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        Status: {app.status?.toUpperCase()}
                      </span>
                    </div>

                    <h3 className="font-bold text-base text-slate-900 dark:text-white truncate">
                      {app.serviceName}
                    </h3>

                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Applicant: <strong>{app.applicantName}</strong> • Centre: {app.district || "Erode"}
                      {app.createdAt && (
                        <span> • Submitted on {new Date(app.createdAt).toLocaleDateString("en-IN")}</span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 self-end md:self-auto">
                    <button
                      type="button"
                      onClick={() => setSelectedAppModal(app)}
                      className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye size={14} />
                      <span>View Details</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        let parsedForm: any = {};
                        try {
                          parsedForm = typeof app.formData === "string" ? JSON.parse(app.formData || "{}") : (app.formData || {});
                        } catch {
                          parsedForm = {};
                        }
                        setSubmissionDetails({
                          applicationId: app.applicationNumber,
                          receiptNo: app.receiptNo || `TN-RCP-${app.applicationNumber}`,
                          services: [{ id: app.id, name: app.serviceName, fee: Number(app.amount || 0) }],
                          fee: Number(app.amount || 0),
                          district: app.district || "Erode",
                          taluk: app.taluk || "Erode",
                          village: app.village || "Centre",
                          applicantName: app.applicantName,
                          applicantNameTa: parsedForm.applicantNameTa || "",
                          appellation: parsedForm.appellation || "Thiru",
                          relationship: parsedForm.relationship || parsedForm._relationship || "Father",
                          fatherName: parsedForm.fatherName || parsedForm._fatherName || "",
                          fatherNameTa: parsedForm.fatherNameTa || "",
                          husbandName: parsedForm.husbandName || parsedForm._husbandName || "",
                          husbandNameTa: parsedForm.husbandNameTa || "",
                          motherName: parsedForm.motherName || "",
                          motherNameTa: parsedForm.motherNameTa || "",
                          mobileNumber: app.applicantPhone,
                          doorNo: parsedForm.currentDoorNo || "",
                          street: parsedForm.currentStreet || "",
                          pinCode: parsedForm.currentPinCode || "",
                          paymentMode: app.paymentMode || "ONLINE",
                          paymentStatus: app.paymentStatus,
                          razorpayOrderId: app.razorpayOrderId || null,
                          razorpayPaymentId: app.razorpayPaymentId || null,
                          date: new Date(app.createdAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }),
                        });
                        setSubmissionComplete(true);
                        setViewMode("RECEIPT");
                        if (typeof document !== "undefined") {
                          document.body.style.overflow = "auto";
                          document.documentElement.style.overflow = "auto";
                        }
                        if (typeof window !== "undefined") {
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }
                      }}
                      className="px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Receipt size={14} />
                      <span>Receipt</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Details Modal */}
          {selectedAppModal && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-mono font-bold text-[#1e3a8a] dark:text-blue-400">
                      {selectedAppModal.applicationNumber}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {selectedAppModal.serviceName}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedAppModal(null)}
                    className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300 border-t border-b border-slate-100 dark:border-slate-700 py-3">
                  <p>Applicant: <strong>{selectedAppModal.applicantName}</strong></p>
                  <p>Mobile: <strong>{selectedAppModal.applicantPhone}</strong></p>
                  <p>Receipt No: <strong className="font-mono">{selectedAppModal.receiptNo}</strong></p>
                  <p>Statutory Fee: <strong className="font-mono">₹{selectedAppModal.amount.toFixed(2)}</strong></p>
                  <p>Payment Status: <strong>{selectedAppModal.paymentStatus}</strong></p>
                  <p>Application Status: <strong>{selectedAppModal.status?.toUpperCase()}</strong></p>
                  {selectedAppModal.adminRemark && (
                    <p className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border text-slate-700 dark:text-slate-300 mt-2">
                      Officer Remark: {selectedAppModal.adminRemark}
                    </p>
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setSelectedAppModal(null)}
                    className="px-4 py-2 rounded-xl bg-[#1e3a8a] text-white text-xs font-bold"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      )}
    </div>
  );
}

export default function EServicesPortal() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-8 bg-slate-50">
          <div className="text-xs font-semibold text-slate-500 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#1e3a8a]" />
            Loading E-CSC Services Portal...
          </div>
        </div>
      }
    >
      <EServicesPortalInner />
    </Suspense>
  );
}
