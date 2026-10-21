"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import {
  Building,
  User,
  MapPin,
  FileText,
  UploadCloud,
  Wallet,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Printer,
  X,
  CreditCard,
  Loader2,
  Search,
  Check,
  RotateCcw,
  Sparkles,
  HelpCircle,
  ChevronRight,
  Calendar,
  Layers,
  FileCheck2,
  Eye,
  Trash2,
  Phone,
  Mail,
  Home,
  Shield,
  ShieldCheck,
  Award,
  Clock,
  Landmark,
} from "lucide-react";

interface ServiceItem {
  id: number;
  name: string;
  description?: string;
  fee: number;
  retailerFee: number;
  type: "STATUTORY" | "E_SERVICE";
  mainCategoryId?: number;
  fields?: EServiceField[];
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
  validation?: string;
  width?: string;
  section?: string;
  sortOrder?: number;
}

interface GeoItem {
  id: number;
  name: string;
  nameTa?: string | null;
}

interface CategoryItem {
  id: number;
  name: string;
}

interface FormState {
  // Demographic
  aadhaar: string;
  aadhaarName: string;
  aadhaarConsent: boolean;
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

  // Contact
  mobileNumber: string;
  emailId: string;

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
}

interface DocumentItem {
  id: string;
  key: string;
  label: string;
  labelTa: string;
  description: string;
  required: boolean;
  fileUrl: string | null;
  fileName: string | null;
  fileSize?: number;
  uploaded: boolean;
  isUploading: boolean;
}

const MANDATORY_DOCS: Omit<DocumentItem, "fileUrl" | "fileName" | "fileSize" | "uploaded" | "isUploading">[] = [
  {
    id: "photo",
    key: "passportPhoto",
    label: "Passport Photograph",
    labelTa: "புகைப்படம்",
    description: "Recent color passport size photograph (JPG, PNG - max 5MB)",
    required: true,
  },
  {
    id: "aadhaar_front",
    key: "aadhaarFront",
    label: "Aadhaar Card (Front)",
    labelTa: "ஆதார் அட்டை (முன் பக்கம்)",
    description: "Front side scan of Aadhaar card clearly displaying name and photo",
    required: true,
  },
  {
    id: "aadhaar_back",
    key: "aadhaarBack",
    label: "Aadhaar Card (Back)",
    labelTa: "ஆதார் அட்டை (பின் பக்கம்)",
    description: "Back side scan of Aadhaar card displaying residential address",
    required: true,
  },
  {
    id: "ration_card",
    key: "rationCard",
    label: "Family Smart Ration Card",
    labelTa: "குடும்ப அட்டை",
    description: "Tamil Nadu Smart Family Card copy with family member listing",
    required: true,
  },
  {
    id: "signature",
    key: "signature",
    label: "Specimen Signature / Thumb",
    labelTa: "கையொப்பம் / கைரேகை",
    description: "Applicant's specimen signature or left thumb impression on plain white paper",
    required: true,
  },
  {
    id: "tax_receipt",
    key: "houseTaxReceipt",
    label: "Property Tax / Electricity Bill",
    labelTa: "வீட்டு வரி ரசீது / மின்கட்டணம்",
    description: "Latest local body property tax receipt, EB bill, or tenancy agreement",
    required: false,
  },
  {
    id: "supporting_doc",
    key: "supportingDoc",
    label: "Supporting Document / Certificate",
    labelTa: "துணை ஆவணம் / சான்றிதழ்",
    description: "Additional certificate required for the specific welfare scheme or e-service",
    required: false,
  },
];

const INITIAL_FORM: FormState = {
  aadhaar: "",
  aadhaarName: "",
  aadhaarConsent: true,
  appellation: "Thiru",
  applicantName: "",
  applicantNameTa: "",
  gender: "",
  maritalStatus: "",
  dob: "",
  relationship: "Father",
  fatherName: "",
  fatherNameTa: "",
  husbandName: "",
  husbandNameTa: "",
  motherName: "",
  motherNameTa: "",
  religion: "Hindu",
  community: "",
  occupation: "",
  education: "",

  mobileNumber: "",
  emailId: "",

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
};

const STEPS = [
  { id: 1, key: "service", label: "Select Service", labelTa: "சேவை தேர்வு", icon: Building },
  { id: 2, key: "citizen", label: "Citizen Particulars", labelTa: "பயனாளி விவரங்கள்", icon: User },
  { id: 3, key: "address", label: "Address & Jurisdiction", labelTa: "முகவரி & வரம்பு", icon: MapPin },
  { id: 4, key: "questionnaire", label: "Service Questionnaire", labelTa: "சேவை கேள்விகள்", icon: FileText },
  { id: 5, key: "documents", label: "Upload Documents", labelTa: "ஆவணங்கள் பதிவேற்றம்", icon: UploadCloud },
  { id: 6, key: "review", label: "Review & Pay", labelTa: "சரிபார்த்தல் & கட்டணம்", icon: Wallet },
];

export default function RetailerApplyPage() {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);
  const [draftKey, setDraftKey] = useState<string | null>(null);
  const [draftReady, setDraftReady] = useState(false);
  const [draftSaveState, setDraftSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const restoredLocation = useRef<{ districtId: string; talukId: string; panchayatId: string } | null>(null);

  // Master data
  const [retailerId, setRetailerId] = useState<number | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [statutoryServices, setStatutoryServices] = useState<ServiceItem[]>([]);
  const [esServices, setEsServices] = useState<ServiceItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [districts, setDistricts] = useState<GeoItem[]>([]);
  const [taluks, setTaluks] = useState<GeoItem[]>([]);
  const [panchayats, setPanchayats] = useState<GeoItem[]>([]);

  // Step 1: Service Selection state
  const [serviceType, setServiceType] = useState<"STATUTORY" | "E_SERVICE">("E_SERVICE");
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [serviceSearch, setServiceSearch] = useState<string>("");
  const [activeCategory, setActiveCategory] = useState<string>("All");

  // Step 2 & 3: Demographics & Address Form
  const [form, setForm] = useState<FormState>(INITIAL_FORM);

  // Cascading Geography selections
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>("");
  const [selectedTalukId, setSelectedTalukId] = useState<string>("");
  const [selectedPanchayatId, setSelectedPanchayatId] = useState<string>("");
  const [notes, setNotes] = useState("");

  const [loadingTaluks, setLoadingTaluks] = useState(false);
  const [loadingPanchayats, setLoadingPanchayats] = useState(false);

  // Step 4: Dynamic Service Questionnaire Fields
  const [serviceFieldValues, setServiceFieldValues] = useState<Record<string, string>>({});

  // Step 5: Document Uploads
  const [documents, setDocuments] = useState<DocumentItem[]>(
    MANDATORY_DOCS.map((doc) => ({
      ...doc,
      fileUrl: null,
      fileName: null,
      uploaded: false,
      isUploading: false,
    }))
  );
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Step 6 & Result State
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [receiptData, setReceiptData] = useState<any | null>(null);

  // 1. Initial Load of Master Data & Session Restore
  useEffect(() => {
    async function loadMasterData() {
      try {
        setLoading(true);
        const res = await fetch("/api/retailer/apply");
        const json = await res.json();
        if (json.ok) {
          const retId = Number(json.retailerId);
          setRetailerId(retId);
          const key = `labourseva-retailer-apply-${retId}`;
          setDraftKey(key);
          setWalletBalance(Number(json.walletBalance || 0));
          setStatutoryServices(json.statutoryServices || []);
          setEsServices(json.esServices || []);
          setCategories(json.categories || []);
          setDistricts(json.districts || []);

          // Try restore draft from sessionStorage
          try {
            const saved = sessionStorage.getItem(key);
            if (saved) {
              const draft = JSON.parse(saved);
              if (draft.currentStep) setCurrentStep(Math.min(6, Math.max(1, Number(draft.currentStep))));
              if (draft.serviceType) setServiceType(draft.serviceType === "STATUTORY" ? "STATUTORY" : "E_SERVICE");
              if (draft.selectedServiceId) setSelectedServiceId(String(draft.selectedServiceId));
              if (draft.serviceSearch) setServiceSearch(String(draft.serviceSearch));
              if (draft.activeCategory) setActiveCategory(String(draft.activeCategory));
              if (draft.form) setForm((prev) => ({ ...prev, ...draft.form }));
              if (draft.serviceFieldValues) setServiceFieldValues(draft.serviceFieldValues);
              if (Array.isArray(draft.documents)) {
                setDocuments((prev) =>
                  prev.map((d) => {
                    const match = draft.documents.find((savedDoc: any) => savedDoc.id === d.id);
                    return match ? { ...d, ...match, isUploading: false } : d;
                  })
                );
              }
              if (draft.notes) setNotes(String(draft.notes));

              restoredLocation.current = {
                districtId: String(draft.selectedDistrictId || ""),
                talukId: String(draft.selectedTalukId || ""),
                panchayatId: String(draft.selectedPanchayatId || ""),
              };
              if (draft.selectedDistrictId) setSelectedDistrictId(String(draft.selectedDistrictId));

              setLastSavedTime("Restored from session");
            } else if (json.esServices && json.esServices.length > 0) {
              setSelectedServiceId(String(json.esServices[0].id));
            } else if (json.statutoryServices && json.statutoryServices.length > 0) {
              setSelectedServiceId(String(json.statutoryServices[0].id));
            }
          } catch {
            sessionStorage.removeItem(key);
          }
        } else {
          setError(json.error || "Failed to load master catalogue");
        }
      } catch (err: any) {
        setError(err.message || "Failed to load master catalogue");
      } finally {
        setLoading(false);
        setDraftReady(true);
      }
    }
    loadMasterData();
  }, []);

  // 2. Debounced Session Auto-Save ("session to make complete the for fill")
  useEffect(() => {
    if (!draftKey || !draftReady || receiptData) return;
    const timer = window.setTimeout(() => {
      setDraftSaveState("saving");
      try {
        const draft = {
          currentStep,
          serviceType,
          selectedServiceId,
          serviceSearch,
          activeCategory,
          form,
          serviceFieldValues,
          documents: documents.map((d) => ({
            id: d.id,
            key: d.key,
            label: d.label,
            labelTa: d.labelTa,
            uploaded: d.uploaded,
            fileUrl: d.fileUrl,
            fileName: d.fileName,
            fileSize: d.fileSize,
          })),
          selectedDistrictId,
          selectedTalukId,
          selectedPanchayatId,
          notes,
        };

        sessionStorage.setItem(draftKey, JSON.stringify(draft));
        setDraftSaveState("saved");
        const now = new Date();
        setLastSavedTime(
          now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
        );
      } catch {
        setDraftSaveState("error");
      }
    }, 400);

    return () => window.clearTimeout(timer);
  }, [
    draftKey,
    draftReady,
    receiptData,
    currentStep,
    serviceType,
    selectedServiceId,
    serviceSearch,
    activeCategory,
    form,
    serviceFieldValues,
    documents,
    selectedDistrictId,
    selectedTalukId,
    selectedPanchayatId,
    notes,
  ]);

  // 3. Cascading Geography: Taluks
  useEffect(() => {
    if (!selectedDistrictId) {
      setTaluks([]);
      setPanchayats([]);
      setSelectedTalukId("");
      setSelectedPanchayatId("");
      return;
    }
    async function loadTaluks() {
      try {
        setLoadingTaluks(true);
        const res = await fetch(`/api/geography?type=taluks&districtId=${selectedDistrictId}`);
        const data = await res.json();
        if (data.ok) {
          const list = data.taluks || [];
          setTaluks(list);
          const targetTaluk = restoredLocation.current?.districtId === selectedDistrictId ? restoredLocation.current.talukId : "";
          setSelectedTalukId(targetTaluk);
          setPanchayats([]);

          // Update district name in form
          const dObj = districts.find((d) => String(d.id) === selectedDistrictId);
          if (dObj) {
            setForm((prev) => ({
              ...prev,
              currentDistrict: dObj.name,
              permanentDistrict: prev.sameAsCurrent ? dObj.name : prev.permanentDistrict,
            }));
          }
        }
      } catch {
      } finally {
        setLoadingTaluks(false);
      }
    }
    loadTaluks();
  }, [selectedDistrictId, districts]);

  // 4. Cascading Geography: Panchayats
  useEffect(() => {
    if (!selectedTalukId) {
      setPanchayats([]);
      setSelectedPanchayatId("");
      return;
    }
    async function loadPanchayats() {
      try {
        setLoadingPanchayats(true);
        const res = await fetch(`/api/geography?type=panchayaths&talukId=${selectedTalukId}`);
        const data = await res.json();
        if (data.ok) {
          const list = data.panchayaths || [];
          setPanchayats(list);
          const targetPanchayat = restoredLocation.current?.talukId === selectedTalukId ? restoredLocation.current.panchayatId : "";
          setSelectedPanchayatId(targetPanchayat);
          restoredLocation.current = null;

          // Update taluk name in form
          const tObj = taluks.find((t) => String(t.id) === selectedTalukId);
          if (tObj) {
            setForm((prev) => ({
              ...prev,
              currentTaluk: tObj.name,
              permanentTaluk: prev.sameAsCurrent ? tObj.name : prev.permanentTaluk,
            }));
          }
        }
      } catch {
      } finally {
        setLoadingPanchayats(false);
      }
    }
    loadPanchayats();
  }, [selectedTalukId, taluks]);

  // Derived Active Services & Selected Service details
  const activeServiceList = serviceType === "STATUTORY" ? statutoryServices : esServices;

  const filteredServices = useMemo(() => {
    let list = activeServiceList;

    if (serviceType === "E_SERVICE" && activeCategory !== "All") {
      const catObj = categories.find((c) => c.name === activeCategory);
      if (catObj) {
        list = list.filter((s) => s.mainCategoryId === catObj.id);
      }
    }

    if (!serviceSearch.trim()) return list;
    const q = serviceSearch.toLowerCase();
    return list.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q))
    );
  }, [activeServiceList, serviceType, activeCategory, categories, serviceSearch]);

  const currentService = useMemo(() => {
    return (
      activeServiceList.find((s) => String(s.id) === String(selectedServiceId)) ||
      activeServiceList[0] ||
      null
    );
  }, [activeServiceList, selectedServiceId]);

  const serviceFee = currentService ? Number(currentService.fee || currentService.retailerFee || 50) : 50;
  const estimatedCommission = 10;
  const hasSufficientBalance = walletBalance >= serviceFee;

  const selectedDistrict = useMemo(() => {
    return districts.find((d) => String(d.id) === String(selectedDistrictId)) || null;
  }, [districts, selectedDistrictId]);

  const selectedTaluk = useMemo(() => {
    return taluks.find((t) => String(t.id) === String(selectedTalukId)) || null;
  }, [taluks, selectedTalukId]);

  const selectedPanchayat = useMemo(() => {
    return panchayats.find((p) => String(p.id) === String(selectedPanchayatId)) || null;
  }, [panchayats, selectedPanchayatId]);

  // Live Age computation from DOB
  const applicantAge = useMemo(() => {
    if (!form.dob) return null;
    const birth = new Date(form.dob);
    if (isNaN(birth.getTime())) return null;
    const diff = Date.now() - birth.getTime();
    const ageDate = new Date(diff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  }, [form.dob]);

  // Form Field Updater
  function updateForm(field: keyof FormState, value: any) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "sameAsCurrent" && value === true) {
        next.permanentDoorNo = next.currentDoorNo;
        next.permanentStreet = next.currentStreet;
        next.permanentWard = next.currentWard;
        next.permanentVillage = next.currentVillage;
        next.permanentTaluk = next.currentTaluk;
        next.permanentDistrict = next.currentDistrict;
        next.permanentPinCode = next.currentPinCode;
      }
      return next;
    });
  }

  // Document Upload Handler via /api/es-services/upload
  async function handleFileUpload(docId: string, file: File) {
    setUploadError(null);
    setDocuments((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, isUploading: true } : d))
    );

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("documentType", docId);

      const res = await fetch("/api/es-services/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "File upload failed");
      }

      setDocuments((prev) =>
        prev.map((d) =>
          d.id === docId
            ? {
                ...d,
                uploaded: true,
                isUploading: false,
                fileUrl: data.url,
                fileName: file.name,
                fileSize: file.size,
              }
            : d
        )
      );
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload document");
      setDocuments((prev) =>
        prev.map((d) => (d.id === docId ? { ...d, isUploading: false } : d))
      );
    }
  }

  function handleRemoveFile(docId: string) {
    setDocuments((prev) =>
      prev.map((d) =>
        d.id === docId
          ? {
              ...d,
              uploaded: false,
              isUploading: false,
              fileUrl: null,
              fileName: null,
              fileSize: undefined,
            }
          : d
      )
    );
  }

  // Step Validation & Navigation
  function validateStep(step: number): boolean {
    setStepError(null);

    // Step 1: Service
    if (step === 1) {
      if (!selectedServiceId) {
        setStepError("Please select a statutory welfare scheme or citizen e-service to continue.");
        return false;
      }
      return true;
    }

    // Step 2: Citizen Particulars
    if (step === 2) {
      if (!form.applicantName.trim() || form.applicantName.trim().length < 2) {
        setStepError("Please enter the citizen applicant's full legal name.");
        return false;
      }
      const cleanPhone = form.mobileNumber.replace(/\D/g, "");
      if (cleanPhone.length !== 10) {
        setStepError("Please enter a valid 10-digit citizen mobile phone number.");
        return false;
      }
      const cleanAadhaar = form.aadhaar.replace(/\D/g, "");
      if (cleanAadhaar && cleanAadhaar.length !== 12 && cleanAadhaar.length !== 4) {
        setStepError("Enter a valid 12-digit Aadhaar number or 4-digit last characters.");
        return false;
      }
      if (!form.gender) {
        setStepError("Please select the applicant's gender.");
        return false;
      }
      if (!form.dob) {
        setStepError("Please enter the applicant's Date of Birth.");
        return false;
      }
      if (form.relationship === "Father" && !form.fatherName.trim()) {
        setStepError("Please enter the applicant's Father's name.");
        return false;
      }
      if (form.relationship === "Mother" && !form.motherName.trim()) {
        setStepError("Please enter the applicant's Mother's name.");
        return false;
      }
      if (form.relationship === "Husband" && !form.husbandName.trim()) {
        setStepError("Please enter the applicant's Husband's name.");
        return false;
      }
      return true;
    }

    // Step 3: Address & Jurisdiction
    if (step === 3) {
      if (!form.currentDoorNo.trim()) {
        setStepError("Please enter the Door / Flat Number for the residential address.");
        return false;
      }
      if (!form.currentStreet.trim()) {
        setStepError("Please enter the Street / Road Name.");
        return false;
      }
      if (!selectedDistrictId) {
        setStepError("Please select the administrative District for this application.");
        return false;
      }
      const cleanPin = form.currentPinCode.replace(/\D/g, "");
      if (cleanPin.length !== 6) {
        setStepError("Please enter a valid 6-digit Tamil Nadu Postal PIN Code.");
        return false;
      }
      return true;
    }

    // Step 4: Questionnaire
    if (step === 4) {
      if (currentService?.fields && currentService.fields.length > 0) {
        for (const f of currentService.fields) {
          if (f.required && !serviceFieldValues[f.key]?.trim()) {
            setStepError(`Please provide answer for required field: "${f.name}".`);
            return false;
          }
        }
      }
      return true;
    }

    // Step 5: Documents
    if (step === 5) {
      const missingRequired = documents.filter((d) => d.required && !d.uploaded);
      if (missingRequired.length > 0) {
        setStepError(
          `Please upload all mandatory documents (${missingRequired.map((m) => m.label).join(", ")}) before proceeding.`
        );
        return false;
      }
      return true;
    }

    // Step 6: Review & Wallet
    if (step === 6) {
      if (!hasSufficientBalance) {
        setStepError(
          `Insufficient Kendra wallet balance (Available: ₹${walletBalance.toFixed(2)}, Required: ₹${serviceFee.toFixed(2)}). Top up your wallet to submit.`
        );
        return false;
      }
      if (!termsAccepted) {
        setStepError("Please certify the operator declaration confirming verified citizen details.");
        return false;
      }
      return true;
    }

    return true;
  }

  function handleNext() {
    if (validateStep(currentStep)) {
      setStepError(null);
      setCurrentStep((prev) => Math.min(6, prev + 1));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function handleBack() {
    setStepError(null);
    setCurrentStep((prev) => Math.max(1, prev - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleStepClick(targetStep: number) {
    if (targetStep < currentStep) {
      setStepError(null);
      setCurrentStep(targetStep);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (targetStep === currentStep + 1) {
      handleNext();
    }
  }

  function clearApplicationDraft() {
    if (!draftKey) return;
    try {
      sessionStorage.removeItem(draftKey);
    } catch {}
  }

  // Clear Draft & Start Fresh Handler
  function handleClearDraft() {
    if (confirm("Are you sure you want to clear this saved draft and start fresh? All entered details will be reset.")) {
      clearApplicationDraft();
      setCurrentStep(1);
      setForm(INITIAL_FORM);
      setServiceFieldValues({});
      setDocuments(
        MANDATORY_DOCS.map((doc) => ({
          ...doc,
          fileUrl: null,
          fileName: null,
          uploaded: false,
          isUploading: false,
        }))
      );
      setSelectedDistrictId("");
      setSelectedTalukId("");
      setSelectedPanchayatId("");
      setNotes("");
      setError(null);
      setStepError(null);
      setLastSavedTime(null);
    }
  }

  // Final Submission
  async function handleSubmit() {
    if (!validateStep(6)) return;

    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/retailer/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          citizenName: form.applicantName.trim(),
          citizenPhone: form.mobileNumber.replace(/\D/g, ""),
          citizenAadhaar: form.aadhaar.replace(/\D/g, ""),
          citizenEmail: form.emailId.trim(),
          serviceType,
          serviceId: selectedServiceId,
          districtId: selectedDistrictId,
          talukId: selectedTalukId,
          panchayatId: selectedPanchayatId,
          address: `${form.currentDoorNo ? form.currentDoorNo + ", " : ""}${form.currentStreet}, ${form.currentVillage || ""}, Pin - ${form.currentPinCode || ""}`,
          notes: notes.trim(),
          formData: form,
          serviceFieldValues,
          documents,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Application submission failed. Please check Kendra wallet and inputs.");
        return;
      }

      clearApplicationDraft();
      setWalletBalance(data.closingBalance);
      setReceiptData(data);
    } catch (err: any) {
      setError(err.message || "Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleResetForm() {
    clearApplicationDraft();
    setReceiptData(null);
    setCurrentStep(1);
    setForm(INITIAL_FORM);
    setServiceFieldValues({});
    setDocuments(
      MANDATORY_DOCS.map((doc) => ({
        ...doc,
        fileUrl: null,
        fileName: null,
        uploaded: false,
        isUploading: false,
      }))
    );
    setSelectedDistrictId("");
    setSelectedTalukId("");
    setSelectedPanchayatId("");
    setNotes("");
    setError(null);
    setStepError(null);
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-24 text-center">
        <Loader2 className="w-10 h-10 animate-spin text-[#1e3a8a] mx-auto mb-4" />
        <h3 className="text-base font-bold text-slate-800">Initializing Kendra Application Desk...</h3>
        <p className="text-xs text-slate-500 mt-1">
          Loading statutory catalogue, e-Sevail service fields, live wallet balance, and Tamil Nadu geography
        </p>
      </div>
    );
  }

  // SUCCESS / RECEIPT VIEW
  if (receiptData) {
    return (
      <div className="max-w-3xl mx-auto py-6 space-y-6 font-sans antialiased">
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          {/* Official Header Banner */}
          <div className="border-b border-emerald-200 bg-emerald-50/70 p-6 text-center space-y-2">
            <div className="w-14 h-14 rounded-full bg-white border-2 border-emerald-300 text-emerald-700 flex items-center justify-center mx-auto mb-1 shadow-sm">
              <CheckCircle2 size={32} className="text-emerald-700" />
            </div>
            <span className="inline-block px-3 py-1 rounded-full bg-white text-emerald-800 border border-emerald-200 text-xs font-bold uppercase tracking-wider shadow-xs">
              Assisted Submission Successful
            </span>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Kendra Official Acknowledgement Receipt
            </h1>
            <p className="text-xs text-emerald-800 font-medium">
              Tamil Nadu Labour Welfare Board · Citizen Assisted Services Desk
            </p>
          </div>

          {/* Receipt Body */}
          <div className="p-6 sm:p-8 space-y-6">
            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Application No</span>
                <span className="text-xs font-mono font-bold text-slate-900 block truncate">
                  {receiptData.applicationNumber}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Receipt No</span>
                <span className="text-xs font-mono font-bold text-slate-900 block truncate">
                  {receiptData.receiptNo}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Deducted Fee</span>
                <span className="text-xs font-black text-rose-600 block">
                  ₹{Number(receiptData.deductedAmount).toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Kendra Profit</span>
                <span className="text-xs font-black text-emerald-600 block">
                  +₹{Number(receiptData.commissionEarned).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Line items */}
            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 text-xs overflow-hidden">
              <div className="flex justify-between p-3.5 bg-slate-50 font-bold text-slate-700">
                <span>Application Particulars</span>
                <span>Verified Details</span>
              </div>
              <div className="flex justify-between p-3.5">
                <span className="text-slate-500">Service Name / Scheme:</span>
                <strong className="text-slate-900 text-right">{receiptData.serviceName}</strong>
              </div>
              <div className="flex justify-between p-3.5">
                <span className="text-slate-500">Citizen Applicant Name:</span>
                <strong className="text-slate-900">{form.applicantName}</strong>
              </div>
              <div className="flex justify-between p-3.5">
                <span className="text-slate-500">Citizen Mobile Number:</span>
                <strong className="text-slate-900 font-mono">+91 {form.mobileNumber}</strong>
              </div>
              {form.aadhaar && (
                <div className="flex justify-between p-3.5">
                  <span className="text-slate-500">Aadhaar (Last 4 Digits):</span>
                  <strong className="text-slate-900 font-mono">XXXX-XXXX-{form.aadhaar.slice(-4)}</strong>
                </div>
              )}
              <div className="flex justify-between p-3.5">
                <span className="text-slate-500">Jurisdiction / District:</span>
                <strong className="text-slate-900">{selectedDistrict?.name || "Tamil Nadu"}</strong>
              </div>
              <div className="flex justify-between p-3.5">
                <span className="text-slate-500">Taluk / Village:</span>
                <strong className="text-slate-900">
                  {selectedTaluk?.name || "-"} / {selectedPanchayat?.name || "-"}
                </strong>
              </div>
              <div className="flex justify-between p-3.5">
                <span className="text-slate-500">Payment Mode:</span>
                <span className="font-semibold text-emerald-700">Kendra Prepaid Wallet (Debit)</span>
              </div>
              <div className="flex justify-between p-3.5 bg-slate-50/50">
                <span className="text-slate-500">Closing Kendra Wallet Balance:</span>
                <strong className="text-slate-900 font-mono text-sm">
                  ₹{Number(receiptData.closingBalance).toFixed(2)}
                </strong>
              </div>
            </div>

            {/* Documents attached summary */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <span className="font-bold text-slate-700 block">Uploaded Document Artifacts:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {documents
                  .filter((d) => d.uploaded)
                  .map((d) => (
                    <div key={d.id} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200">
                      <FileCheck2 size={14} className="text-emerald-600 shrink-0" />
                      <span className="truncate text-slate-800 font-medium">{d.label}</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Regulatory Footer Note */}
            <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200 text-blue-900 text-xs leading-relaxed flex items-start gap-2.5">
              <Shield size={16} className="text-[#1e3a8a] shrink-0 mt-0.5" />
              <div>
                <strong>Next Steps:</strong> The application record has been dispatched to the competent authority scrutiny ledger.
                Hand a copy of this printed acknowledgement to the citizen for status tracking.
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-5 py-2.5 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-bold text-xs flex items-center gap-2 shadow-sm transition"
                >
                  <Printer size={15} />
                  <span>Print Citizen Receipt</span>
                </button>

                <Link
                  href="/retailer/applications"
                  className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition"
                >
                  <Layers size={14} />
                  <span>View in Kendra Ledger</span>
                </Link>
              </div>

              <button
                type="button"
                onClick={handleResetForm}
                className="px-5 py-2.5 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
              >
                <RotateCcw size={14} />
                <span>Lodge Another Application</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16 font-sans antialiased">
      {/* Top Banner with Kendra Live Wallet & Session State */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-[#ea580c] bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200/60">
              Kendra Assisted Desk
            </span>
            {lastSavedTime && (
              <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Session draft saved ({lastSavedTime})</span>
              </span>
            )}
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            Assisted Service Application Wizard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            பயனாளி சேவை விண்ணப்ப வழிகாட்டி • Complete walk-in citizen applications with auto-saved session draft.
          </p>
        </div>

        {/* Right side controls: Clear draft + Wallet Balance Pill */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleClearDraft}
            title="Reset form and clear session draft"
            className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-xl transition flex items-center gap-1.5"
          >
            <RotateCcw size={13} />
            <span>Reset Draft</span>
          </button>

          {/* Wallet Balance Widget */}
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Wallet size={18} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Prepaid Wallet
              </span>
              <span className="text-sm font-black text-slate-900 font-mono">
                ₹{walletBalance.toFixed(2)}
              </span>
            </div>
            <Link
              href="/retailer/wallet"
              className="text-[11px] font-bold text-[#ea580c] hover:underline pl-2 border-l border-slate-200"
            >
              + Top-up
            </Link>
          </div>
        </div>
      </div>

      {/* Modern 6-Step Stepper Indicator */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        {/* Step Numbers & Labels */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
          {STEPS.map((s) => {
            const isCompleted = currentStep > s.id;
            const isCurrent = currentStep === s.id;
            const Icon = s.icon;

            return (
              <button
                key={s.id}
                type="button"
                onClick={() => handleStepClick(s.id)}
                disabled={s.id > currentStep}
                className={`flex items-center gap-2.5 p-2 rounded-xl text-left transition-all ${
                  isCurrent
                    ? "bg-blue-50/80 border border-blue-200 text-[#1e3a8a] font-bold"
                    : isCompleted
                    ? "text-emerald-700 hover:bg-slate-50 cursor-pointer"
                    : "text-slate-400 cursor-not-allowed opacity-60"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                    isCurrent
                      ? "bg-[#1e3a8a] text-white shadow-xs"
                      : isCompleted
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {isCompleted ? <Check size={13} /> : s.id}
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold leading-tight block truncate">{s.label}</span>
                  <span className="text-[10px] text-slate-400 font-normal block truncate">{s.labelTa}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-[#ea580c] h-full transition-all duration-300"
            style={{ width: `${((currentStep - 1) / 5) * 100}%` }}
          />
        </div>
      </div>

      {/* Validation / Step Error Notice */}
      {stepError && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-3 animate-shake shadow-xs">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-600" />
          <div className="flex-1 font-semibold">{stepError}</div>
          <button onClick={() => setStepError(null)} className="text-amber-500 hover:text-amber-700">
            <X size={15} />
          </button>
        </div>
      )}

      {/* Global API Error */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
          <div className="flex-1 font-semibold">{error}</div>
        </div>
      )}

      {/* ============================================================ */}
      {/* STEP 1: SERVICE & SCHEME SELECTION                           */}
      {/* ============================================================ */}
      {currentStep === 1 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
          <div className="border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2 text-[11px] font-bold text-[#1e3a8a] uppercase tracking-wider mb-1">
              <Building size={14} />
              <span>Step 1 of 6 • படி 1: சேவை தேர்வு</span>
            </div>
            <h2 className="text-lg font-black text-slate-900">
              Choose Citizen E-Service or Statutory Scheme
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select the e-Sevai or welfare board application requested by the citizen.
            </p>
          </div>

          {/* Service Category Switcher */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex rounded-xl bg-slate-100 p-1 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  setServiceType("E_SERVICE");
                  if (esServices.length > 0) setSelectedServiceId(String(esServices[0].id));
                }}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
                  serviceType === "E_SERVICE"
                    ? "bg-white text-[#1e3a8a] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Sparkles size={14} className="text-[#ea580c]" />
                <span>Citizen E-Services (e-Sevai / ECSC)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setServiceType("STATUTORY");
                  if (statutoryServices.length > 0) setSelectedServiceId(String(statutoryServices[0].id));
                }}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
                  serviceType === "STATUTORY"
                    ? "bg-white text-[#1e3a8a] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Building size={14} />
                <span>Statutory Welfare Schemes</span>
              </button>
            </div>

            {/* Live Search */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search service name, keyword..."
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a]"
              />
              {serviceSearch && (
                <button
                  type="button"
                  onClick={() => setServiceSearch("")}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Sub-Category Filter for E-Services */}
          {serviceType === "E_SERVICE" && categories.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveCategory("All")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition ${
                  activeCategory === "All"
                    ? "bg-[#1e3a8a] text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                All Categories ({esServices.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.name)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition ${
                    activeCategory === cat.name
                      ? "bg-[#1e3a8a] text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          {/* Service Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-[460px] overflow-y-auto pr-1">
            {filteredServices.map((service) => {
              const isSelected = String(service.id) === String(selectedServiceId);
              const fee = Number(service.fee || service.retailerFee || 50);

              return (
                <div
                  key={service.id}
                  onClick={() => setSelectedServiceId(String(service.id))}
                  className={`p-4 rounded-xl border text-left cursor-pointer transition relative flex flex-col justify-between gap-3 ${
                    isSelected
                      ? "border-[#1e3a8a] bg-blue-50/50 ring-2 ring-[#1e3a8a]/20 shadow-xs"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                          ID #{service.id}
                        </span>
                        {service.fields && service.fields.length > 0 && (
                          <span className="text-[10px] font-semibold text-blue-700 bg-blue-100/60 px-1.5 py-0.5 rounded">
                            {service.fields.length} Questionnaire Fields
                          </span>
                        )}
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center border transition ${
                          isSelected
                            ? "bg-[#1e3a8a] border-[#1e3a8a] text-white"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {isSelected && <Check size={12} />}
                      </div>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 mt-2 line-clamp-1">
                      {service.name}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {service.description || "Official Tamil Nadu statutory and citizen e-governance service."}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Fee</span>
                      <strong className="text-slate-900 font-mono text-sm">₹{fee.toFixed(2)}</strong>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Kendra Margin</span>
                      <span className="text-emerald-700 font-bold font-mono">+₹{estimatedCommission.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredServices.length === 0 && (
            <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl">
              <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">No services match your search</p>
              <p className="text-xs text-slate-400 mt-1">Try another keyword or category filter.</p>
            </div>
          )}

          {/* Step 1 Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <div className="text-xs text-slate-500">
              Selected: <strong className="text-slate-900">{currentService?.name || "None"}</strong>
            </div>
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-2.5 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-bold text-xs flex items-center gap-2 shadow-xs transition"
            >
              <span>Continue to Citizen Particulars</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* STEP 2: CITIZEN DEMOGRAPHICS & AADHAAR                       */}
      {/* ============================================================ */}
      {currentStep === 2 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
          <div className="border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2 text-[11px] font-bold text-[#1e3a8a] uppercase tracking-wider mb-1">
              <User size={14} />
              <span>Step 2 of 6 • படி 2: பயனாளி விவரங்கள்</span>
            </div>
            <h2 className="text-lg font-black text-slate-900">
              Citizen Identity & Demographic Profile
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter official details as printed on the citizen's Aadhaar and Smart Ration Card.
            </p>
          </div>

          {/* Aadhaar Verification Banner */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-[#1e3a8a]" />
                  <span>Aadhaar Identity Verification (UIDAI)</span>
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  12-digit Aadhaar number for statutory record matching and e-district verification.
                </p>
              </div>
              <div className="w-full sm:w-64">
                <input
                  type="text"
                  maxLength={14}
                  placeholder="XXXX XXXX XXXX"
                  value={form.aadhaar}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, "").slice(0, 12);
                    const formatted = raw.replace(/(\d{4})(?=\d)/g, "$1 ");
                    updateForm("aadhaar", formatted);
                  }}
                  className="w-full px-3 py-2 text-xs font-mono font-bold tracking-wider rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a]"
                />
              </div>
            </div>

            <label className="flex items-start gap-2.5 text-[11px] text-slate-600 cursor-pointer pt-1 border-t border-slate-200/60">
              <input
                type="checkbox"
                checked={form.aadhaarConsent}
                onChange={(e) => updateForm("aadhaarConsent", e.target.checked)}
                className="mt-0.5 text-[#1e3a8a] rounded"
              />
              <span>
                The citizen has physically appeared at this Kendra and consented to share their Aadhaar particulars for this application.
              </span>
            </label>
          </div>

          {/* Personal Particulars Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Appellation */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Appellation • பட்டப்பெயர் <span className="text-rose-500">*</span>
              </label>
              <select
                value={form.appellation}
                onChange={(e) => updateForm("appellation", e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#1e3a8a]"
              >
                <option value="Thiru">Thiru (திரு)</option>
                <option value="Thirumathi">Thirumathi (திருமதி)</option>
                <option value="Selvi">Selvi (செல்வி)</option>
                <option value="Dr">Dr. (மருத்துவர்)</option>
                <option value="Prof">Prof. (பேராசிரியர்)</option>
              </select>
            </div>

            {/* Full Name in English */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Citizen Full Name (English) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Full name as in Aadhaar"
                value={form.applicantName}
                onChange={(e) => updateForm("applicantName", e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#1e3a8a]"
              />
            </div>

            {/* Full Name in Tamil */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                பெயர் (தமிழ்) • Name in Tamil
              </label>
              <input
                type="text"
                placeholder="தமிழில் முழுப்பெயர்"
                value={form.applicantNameTa}
                onChange={(e) => updateForm("applicantNameTa", e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#1e3a8a]"
              />
            </div>

            {/* Gender */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Gender • பாலினம் <span className="text-rose-500">*</span>
              </label>
              <select
                value={form.gender}
                onChange={(e) => updateForm("gender", e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#1e3a8a]"
              >
                <option value="">Select Gender</option>
                <option value="Male">Male (ஆண்)</option>
                <option value="Female">Female (பெண்)</option>
                <option value="Transgender">Transgender (திருநங்கை/திருநம்பி)</option>
              </select>
            </div>

            {/* Date of Birth */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Date of Birth • பிறந்த தேதி <span className="text-rose-500">*</span>
                {applicantAge !== null && (
                  <span className="text-slate-400 font-normal ml-1">({applicantAge} years)</span>
                )}
              </label>
              <input
                type="date"
                value={form.dob}
                onChange={(e) => updateForm("dob", e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#1e3a8a]"
              />
            </div>

            {/* Marital Status */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Marital Status • திருமண நிலை
              </label>
              <select
                value={form.maritalStatus}
                onChange={(e) => updateForm("maritalStatus", e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#1e3a8a]"
              >
                <option value="">Select Status</option>
                <option value="Single">Single (திருமணமாகாதவர்)</option>
                <option value="Married">Married (திருமணமானவர்)</option>
                <option value="Widowed">Widowed (விதவை/கைம்பெண்)</option>
                <option value="Divorced">Divorced (விவாகரத்து பெற்றவர்)</option>
              </select>
            </div>

            {/* Relationship */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Family Relationship • உறவுமுறை <span className="text-rose-500">*</span>
              </label>
              <select
                value={form.relationship}
                onChange={(e) => updateForm("relationship", e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#1e3a8a]"
              >
                <option value="Father">Father (தந்தை)</option>
                <option value="Mother">Mother (தாய்)</option>
                <option value="Husband">Husband (கணவர்)</option>
                <option value="Guardian">Guardian (பாதுகாவலர்)</option>
              </select>
            </div>

            {/* Father's Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Father's Name (English) {form.relationship === "Father" && <span className="text-rose-500">*</span>}
              </label>
              <input
                type="text"
                placeholder="Father's legal name"
                value={form.fatherName}
                onChange={(e) => updateForm("fatherName", e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#1e3a8a]"
              />
            </div>

            {/* Mother's Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mother's Name (English) {form.relationship === "Mother" && <span className="text-rose-500">*</span>}
              </label>
              <input
                type="text"
                placeholder="Mother's legal name"
                value={form.motherName}
                onChange={(e) => updateForm("motherName", e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#1e3a8a]"
              />
            </div>

            {/* Husband's Name if Married */}
            {(form.relationship === "Husband" || form.maritalStatus === "Married") && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Husband / Spouse Name
                </label>
                <input
                  type="text"
                  placeholder="Spouse name"
                  value={form.husbandName}
                  onChange={(e) => updateForm("husbandName", e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#1e3a8a]"
                />
              </div>
            )}

            {/* Religion */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Religion • மதம்
              </label>
              <select
                value={form.religion}
                onChange={(e) => updateForm("religion", e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#1e3a8a]"
              >
                <option value="Hindu">Hindu (இந்து)</option>
                <option value="Muslim">Muslim (முஸ்லிம்)</option>
                <option value="Christian">Christian (கிறிஸ்தவர்)</option>
                <option value="Sikh">Sikh (சீக்கியர்)</option>
                <option value="Jain">Jain (சைனர்)</option>
                <option value="Buddhist">Buddhist (பௌத்தர்)</option>
                <option value="Other">Other (பிற)</option>
              </select>
            </div>

            {/* Community */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Community • சமூகம்
              </label>
              <select
                value={form.community}
                onChange={(e) => updateForm("community", e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#1e3a8a]"
              >
                <option value="">Select Community</option>
                <option value="OC">OC (முற்பட்ட வகுப்பு)</option>
                <option value="BC">BC (பிற்படுத்தப்பட்ட வகுப்பு)</option>
                <option value="BCM">BCM (பிற்படுத்தப்பட்ட முஸ்லிம்)</option>
                <option value="MBC">MBC (மிகவும் பிற்படுத்தப்பட்ட வகுப்பு)</option>
                <option value="DNC">DNC (சீர்மரபினர்)</option>
                <option value="SC">SC (ஆதிதிராவிடர்)</option>
                <option value="SCA">SCA (அருந்ததியர்)</option>
                <option value="ST">ST (பழங்குடியினர்)</option>
              </select>
            </div>

            {/* Occupation */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Occupation • தொழில்
              </label>
              <select
                value={form.occupation}
                onChange={(e) => updateForm("occupation", e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#1e3a8a]"
              >
                <option value="">Select Occupation</option>
                <option value="Unorganized Labour">Unorganized Labour (அமைப்புசாரா தொழிலாளி)</option>
                <option value="Construction Worker">Construction Worker (கட்டுமானத் தொழிலாளி)</option>
                <option value="Agricultural Labour">Agricultural Labour (விவசாய கூலி)</option>
                <option value="Driver">Driver / Auto Driver (ஓட்டுநர்)</option>
                <option value="Self Employed">Self Employed / Petty Shop (சுயதொழில்)</option>
                <option value="Private Employee">Private Sector Employee (தனியார் ஊழியர்)</option>
                <option value="Homemaker">Homemaker (குடும்பத்தலைவி)</option>
                <option value="Student">Student (மாணவர்)</option>
                <option value="Other">Other (பிற)</option>
              </select>
            </div>

            {/* Education */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Education • கல்வித்தகுதி
              </label>
              <select
                value={form.education}
                onChange={(e) => updateForm("education", e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#1e3a8a]"
              >
                <option value="">Select Qualification</option>
                <option value="Illiterate">Illiterate (படிப்பறிவில்லாதவர்)</option>
                <option value="Primary (1-5)">Primary (1-5)</option>
                <option value="Secondary (6-10)">Secondary (6-10 / SSLC)</option>
                <option value="Higher Secondary (HSC)">Higher Secondary (+2 / HSC)</option>
                <option value="Diploma">Diploma (பட்டயப்படிப்பு)</option>
                <option value="Graduate">Under Graduate (பட்டதாரி)</option>
                <option value="Post Graduate">Post Graduate (முதுகலை பட்டதாரி)</option>
              </select>
            </div>

            {/* Mobile Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mobile Number • மொபைல் <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">+91</span>
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="9876543210"
                  value={form.mobileNumber}
                  onChange={(e) => updateForm("mobileNumber", e.target.value.replace(/\D/g, ""))}
                  className="w-full pl-11 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#1e3a8a] font-mono"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Email Address (Optional)
              </label>
              <input
                type="email"
                placeholder="citizen@domain.com"
                value={form.emailId}
                onChange={(e) => updateForm("emailId", e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#1e3a8a]"
              />
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleBack}
              className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-2 transition"
            >
              <ArrowLeft size={14} />
              <span>Back to Services</span>
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-2.5 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-bold text-xs flex items-center gap-2 shadow-xs transition"
            >
              <span>Continue to Address & Jurisdiction</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* STEP 3: ADDRESS & ADMINISTRATIVE JURISDICTION                */}
      {/* ============================================================ */}
      {currentStep === 3 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
          <div className="border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2 text-[11px] font-bold text-[#1e3a8a] uppercase tracking-wider mb-1">
              <MapPin size={14} />
              <span>Step 3 of 6 • படி 3: முகவரி & அதிகார வரம்பு</span>
            </div>
            <h2 className="text-lg font-black text-slate-900">
              Residential Address & Administrative Jurisdiction
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Specify the citizen's residential jurisdiction for revenue division and taluk office routing.
            </p>
          </div>

          {/* Current Address Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 block">
              1. Current Residential Address • தற்போதைய முகவரி
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Door / Flat No. <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 12/4B, Flat 2"
                  value={form.currentDoorNo}
                  onChange={(e) => updateForm("currentDoorNo", e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#1e3a8a]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Street / Road Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Gandhi Nagar, Anna Salai"
                  value={form.currentStreet}
                  onChange={(e) => updateForm("currentStreet", e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#1e3a8a]"
                />
              </div>

              {/* Cascading District */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  District • மாவட்டம் <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedDistrictId}
                  onChange={(e) => setSelectedDistrictId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#1e3a8a]"
                >
                  <option value="">Select District</option>
                  {districts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} {d.nameTa ? `(${d.nameTa})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cascading Taluk */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Taluk • வட்டம் {loadingTaluks && <Loader2 className="inline w-3 h-3 animate-spin text-slate-400 ml-1" />}
                </label>
                <select
                  value={selectedTalukId}
                  disabled={!selectedDistrictId || loadingTaluks}
                  onChange={(e) => setSelectedTalukId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#1e3a8a] disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">{selectedDistrictId ? "Select Taluk" : "Choose district first"}</option>
                  {taluks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.nameTa ? `(${t.nameTa})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cascading Panchayat / Village */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Village / Panchayat • கிராமம் {loadingPanchayats && <Loader2 className="inline w-3 h-3 animate-spin text-slate-400 ml-1" />}
                </label>
                <select
                  value={selectedPanchayatId}
                  disabled={!selectedTalukId || loadingPanchayats}
                  onChange={(e) => {
                    setSelectedPanchayatId(e.target.value);
                    const pObj = panchayats.find((p) => String(p.id) === e.target.value);
                    if (pObj) {
                      updateForm("currentVillage", pObj.name);
                    }
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#1e3a8a] disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">{selectedTalukId ? "Select Village / Panchayat" : "Choose taluk first"}</option>
                  {panchayats.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.nameTa ? `(${p.nameTa})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Postal PIN Code */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  PIN Code • அஞ்சல் குறியீடு <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="600001"
                  value={form.currentPinCode}
                  onChange={(e) => updateForm("currentPinCode", e.target.value.replace(/\D/g, ""))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#1e3a8a] font-mono"
                />
              </div>

              {/* Ward / Area */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ward / Hamlet / Landmark
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ward 4, Near Mariamman Temple"
                  value={form.currentWard}
                  onChange={(e) => updateForm("currentWard", e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#1e3a8a]"
                />
              </div>
            </div>
          </div>

          {/* Permanent Address Toggle */}
          <div className="pt-2 border-t border-slate-100">
            <label className="flex items-center gap-2.5 text-xs font-bold text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={form.sameAsCurrent}
                onChange={(e) => updateForm("sameAsCurrent", e.target.checked)}
                className="text-[#1e3a8a] rounded"
              />
              <span>Permanent address is same as current residential address (நிரந்தர முகவரியும் தற்போதைய முகவரியும் ஒன்று)</span>
            </label>
          </div>

          {/* Permanent Address Fields if Different */}
          {!form.sameAsCurrent && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
                Permanent Address Particulars • நிரந்தர முகவரி
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Door No.</label>
                  <input
                    type="text"
                    value={form.permanentDoorNo}
                    onChange={(e) => updateForm("permanentDoorNo", e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Street / Village</label>
                  <input
                    type="text"
                    value={form.permanentStreet}
                    onChange={(e) => updateForm("permanentStreet", e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">District</label>
                  <input
                    type="text"
                    value={form.permanentDistrict}
                    onChange={(e) => updateForm("permanentDistrict", e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">PIN Code</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={form.permanentPinCode}
                    onChange={(e) => updateForm("permanentPinCode", e.target.value.replace(/\D/g, ""))}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Special Operator Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Kendra Assisted Operator Notes (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Any specific note regarding walk-in citizen, urgent request, or special instructions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#1e3a8a]"
            />
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleBack}
              className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-2 transition"
            >
              <ArrowLeft size={14} />
              <span>Back to Particulars</span>
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-2.5 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-bold text-xs flex items-center gap-2 shadow-xs transition"
            >
              <span>Continue to Service Questionnaire</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* STEP 4: DYNAMIC SERVICE QUESTIONNAIRE                        */}
      {/* ============================================================ */}
      {currentStep === 4 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
          <div className="border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2 text-[11px] font-bold text-[#1e3a8a] uppercase tracking-wider mb-1">
              <FileText size={14} />
              <span>Step 4 of 6 • படி 4: சேவை சார்ந்த கேள்விகள்</span>
            </div>
            <h2 className="text-lg font-black text-slate-900">
              Service Questionnaire & Scheme Particulars
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Specific questionnaire answers required for: <strong className="text-slate-800">{currentService?.name}</strong>
            </p>
          </div>

          {currentService?.fields && currentService.fields.length > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {currentService.fields.map((field) => {
                  const val = serviceFieldValues[field.key] || "";
                  const optionsArray = Array.isArray(field.options)
                    ? field.options
                    : typeof field.options === "string" && field.options.includes(",")
                    ? field.options.split(",").map((o) => o.trim())
                    : [];

                  return (
                    <div key={field.id} className={field.width === "full" ? "sm:col-span-2" : ""}>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {field.name} {field.required && <span className="text-rose-500">*</span>}
                      </label>

                      {field.type === "select" && optionsArray.length > 0 ? (
                        <select
                          value={val}
                          onChange={(e) =>
                            setServiceFieldValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                          }
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#1e3a8a]"
                        >
                          <option value="">Choose {field.name}</option>
                          {optionsArray.map((opt: string) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : field.type === "textarea" ? (
                        <textarea
                          rows={3}
                          placeholder={field.placeholder || `Enter ${field.name}`}
                          value={val}
                          onChange={(e) =>
                            setServiceFieldValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                          }
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#1e3a8a]"
                        />
                      ) : (
                        <input
                          type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                          placeholder={field.placeholder || `Enter ${field.name}`}
                          value={val}
                          onChange={(e) =>
                            setServiceFieldValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                          }
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#1e3a8a]"
                        />
                      )}

                      {field.helpText && (
                        <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                          <HelpCircle size={11} />
                          <span>{field.helpText}</span>
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2">
              <CheckCircle2 size={28} className="text-emerald-600 mx-auto" />
              <h4 className="text-sm font-bold text-slate-900">Standard Application Parameters</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                No customized questionnaire fields are required for this welfare scheme. The citizen demographic and address profile gathered in earlier steps will be utilized.
              </p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleBack}
              className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-2 transition"
            >
              <ArrowLeft size={14} />
              <span>Back to Address</span>
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-2.5 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-bold text-xs flex items-center gap-2 shadow-xs transition"
            >
              <span>Continue to Document Uploads</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* STEP 5: DOCUMENT ATTACHMENTS & UPLOAD                        */}
      {/* ============================================================ */}
      {currentStep === 5 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
          <div className="border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2 text-[11px] font-bold text-[#1e3a8a] uppercase tracking-wider mb-1">
              <UploadCloud size={14} />
              <span>Step 5 of 6 • படி 5: ஆவணங்கள் பதிவேற்றம்</span>
            </div>
            <h2 className="text-lg font-black text-slate-900">
              Upload Document Enclosures & Identity Proofs
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload scans of the applicant's official documents (PDF, JPG, PNG - Maximum 5MB per file).
            </p>
          </div>

          {uploadError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle size={15} className="text-rose-600 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Document Upload Cards */}
          <div className="grid grid-cols-1 gap-3.5">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className={`p-4 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  doc.uploaded
                    ? "bg-emerald-50/50 border-emerald-200"
                    : doc.required
                    ? "bg-white border-slate-200 hover:border-slate-300"
                    : "bg-slate-50/60 border-slate-200/80"
                }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{doc.label}</span>
                    <span className="text-[10px] text-slate-400 font-normal">({doc.labelTa})</span>
                    {doc.required ? (
                      <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded">
                        Mandatory
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                        Optional
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">{doc.description}</p>
                  {doc.uploaded && doc.fileName && (
                    <span className="text-[11px] text-emerald-700 font-mono flex items-center gap-1 font-medium pt-0.5">
                      <FileCheck2 size={13} />
                      <span>{doc.fileName}</span>
                      {doc.fileSize && (
                        <span className="text-slate-400">({(doc.fileSize / 1024).toFixed(0)} KB)</span>
                      )}
                    </span>
                  )}
                </div>

                {/* Upload action */}
                <div className="flex items-center gap-2 shrink-0">
                  {doc.uploaded ? (
                    <>
                      {doc.fileUrl && (
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-lg border border-emerald-300 bg-white text-emerald-800 text-xs font-bold hover:bg-emerald-50 flex items-center gap-1.5 transition"
                        >
                          <Eye size={13} />
                          <span>View</span>
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(doc.id)}
                        className="px-3 py-1.5 rounded-lg border border-rose-200 bg-white text-rose-600 text-xs font-bold hover:bg-rose-50 flex items-center gap-1.5 transition"
                      >
                        <Trash2 size={13} />
                        <span>Remove</span>
                      </button>
                    </>
                  ) : doc.isUploading ? (
                    <div className="px-4 py-2 text-xs text-slate-500 font-semibold flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin text-[#1e3a8a]" />
                      <span>Uploading & verifying...</span>
                    </div>
                  ) : (
                    <label className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer flex items-center gap-2 transition border border-slate-200">
                      <UploadCloud size={14} />
                      <span>Choose File</span>
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(doc.id, file);
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleBack}
              className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-2 transition"
            >
              <ArrowLeft size={14} />
              <span>Back to Questionnaire</span>
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-2.5 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-bold text-xs flex items-center gap-2 shadow-xs transition"
            >
              <span>Continue to Final Review & Pay</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* STEP 6: FINAL REVIEW, WALLET PAYMENT & SUBMISSION            */}
      {/* ============================================================ */}
      {currentStep === 6 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
          <div className="border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2 text-[11px] font-bold text-[#1e3a8a] uppercase tracking-wider mb-1">
              <Wallet size={14} />
              <span>Step 6 of 6 • படி 6: சரிபார்த்தல் & கட்டணம்</span>
            </div>
            <h2 className="text-lg font-black text-slate-900">
              Review Application Details & Deduct Kendra Wallet
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Verify all entered particulars with the walk-in citizen before debiting your Kendra prepaid wallet.
            </p>
          </div>

          {/* Review Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Service & Kendra Ledger Box */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                Service & Payment Summary
              </span>
              <div className="flex justify-between">
                <span className="text-slate-500">Service:</span>
                <strong className="text-slate-900 text-right">{currentService?.name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Type:</span>
                <span className="font-semibold text-slate-700">
                  {serviceType === "E_SERVICE" ? "Citizen E-Service (e-Sevai)" : "Statutory Welfare Scheme"}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200/60">
                <span className="text-slate-500">Application Fee:</span>
                <strong className="text-slate-900 font-mono">₹{serviceFee.toFixed(2)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Kendra Commission Earned:</span>
                <span className="text-emerald-700 font-bold font-mono">+₹{estimatedCommission.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200/60">
                <span className="text-slate-500">Current Kendra Wallet:</span>
                <strong className="text-slate-900 font-mono">₹{walletBalance.toFixed(2)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Closing Balance after debit:</span>
                <strong
                  className={`font-mono ${
                    hasSufficientBalance ? "text-emerald-700" : "text-rose-600"
                  }`}
                >
                  ₹{(walletBalance - serviceFee + estimatedCommission).toFixed(2)}
                </strong>
              </div>
            </div>

            {/* Citizen Demographic Summary */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                Citizen Demographic Particulars
              </span>
              <div className="flex justify-between">
                <span className="text-slate-500">Name:</span>
                <strong className="text-slate-900">
                  {form.appellation} {form.applicantName}
                </strong>
              </div>
              {form.applicantNameTa && (
                <div className="flex justify-between">
                  <span className="text-slate-500">தமிழில்:</span>
                  <span className="text-slate-800">{form.applicantNameTa}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Mobile Phone:</span>
                <strong className="text-slate-900 font-mono">+91 {form.mobileNumber}</strong>
              </div>
              {form.aadhaar && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Aadhaar:</span>
                  <strong className="text-slate-900 font-mono">
                    XXXX-XXXX-{form.aadhaar.replace(/\D/g, "").slice(-4)}
                  </strong>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Gender / Age:</span>
                <span className="text-slate-800">
                  {form.gender || "-"} {applicantAge ? `(${applicantAge} yrs)` : ""}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Parent / Spouse:</span>
                <span className="text-slate-800">
                  {form.relationship}: {form.fatherName || form.motherName || form.husbandName || "-"}
                </span>
              </div>
            </div>

            {/* Address & Jurisdiction Summary */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 sm:col-span-2">
              <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                Jurisdiction & Enclosures Checklist
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-500 block mb-1">Residential Address:</span>
                  <p className="text-slate-800 font-medium leading-relaxed">
                    {form.currentDoorNo}, {form.currentStreet}, {form.currentWard ? form.currentWard + ", " : ""}
                    {selectedPanchayat?.name ? selectedPanchayat.name + ", " : ""}
                    {selectedTaluk?.name ? selectedTaluk.name + " Taluk, " : ""}
                    {selectedDistrict?.name || "Tamil Nadu"} - {form.currentPinCode}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">Uploaded Artifacts ({documents.filter((d) => d.uploaded).length}):</span>
                  <div className="flex flex-wrap gap-1.5">
                    {documents
                      .filter((d) => d.uploaded)
                      .map((d) => (
                        <span
                          key={d.id}
                          className="px-2 py-0.5 rounded bg-emerald-100/70 text-emerald-800 font-semibold text-[10px] flex items-center gap-1"
                        >
                          <Check size={10} />
                          <span>{d.label}</span>
                        </span>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Insufficient Wallet Warning */}
          {!hasSufficientBalance && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>
                  Insufficient Kendra wallet balance to submit this application (Required: ₹{serviceFee.toFixed(2)}, Available: ₹{walletBalance.toFixed(2)}).
                </span>
              </div>
              <Link
                href="/retailer/wallet"
                className="px-4 py-2 rounded-lg bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 transition shrink-0"
              >
                Top-up Wallet
              </Link>
            </div>
          )}

          {/* Operator Certification Checkbox */}
          <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer pt-2">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-0.5 text-[#1e3a8a] rounded"
            />
            <span>
              I certify as an authorized Kendra Operator that the citizen is physically present, the documents and demographic data entered are authentic, and I authorize the automatic deduction of <strong>₹{serviceFee.toFixed(2)}</strong> from my prepaid Kendra ledger.
            </span>
          </label>

          {/* Navigation & Submit Action */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleBack}
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-2 transition"
            >
              <ArrowLeft size={14} />
              <span>Back to Documents</span>
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !hasSufficientBalance || !termsAccepted}
              className="px-8 py-3 rounded-xl bg-[#059669] hover:bg-[#047857] text-white font-black text-xs flex items-center gap-2 shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Processing Application & Ledger Debit...</span>
                </>
              ) : (
                <>
                  <Wallet size={16} />
                  <span>Debit ₹{serviceFee.toFixed(2)} & Submit Application</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
