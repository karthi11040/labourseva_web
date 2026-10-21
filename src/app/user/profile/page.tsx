"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { KeyboardReactInterface } from "react-simple-keyboard";
import "react-simple-keyboard/build/css/index.css";

const Keyboard = dynamic<any>(() => import("react-simple-keyboard"), {
  ssr: false,
  loading: () => (
    <div className="h-40 flex items-center justify-center text-slate-400 text-sm">
      Loading keyboard...
    </div>
  ),
});

import {
  Shield,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Clock,
  Upload,
  FileText,
  MapPin,
  CreditCard,
  User,
  Building2,
  Check,
  Loader2,
  Award,
  X,
  FileCheck,
  Mail,
  Phone,
  Calendar,
  Users,
  Briefcase,
  Home,
  Landmark,
  ChevronRight,
  Save,
} from "lucide-react";

interface District {
  id: number;
  name: string;
  nameTa: string | null;
  code: string | null;
}

interface Taluk {
  id: number;
  name: string;
  nameTa: string | null;
}

interface Panchayat {
  id: number;
  talukId: number;
  name: string;
  nameTa: string | null;
}

interface KycFormData {
  // Personal
  fullName: string;
  fullNameTamil: string;
  dob: string;
  gender: string;
  fatherName: string;
  motherName: string;
  maritalStatus: string;
  category: string;
  differentlyAbled: string;
  occupation: string;
  annualIncome: string;
  // Identity
  panNumber: string;
  aadhaarNumber: string;
  voterIdNumber: string;
  // Contact & Address
  email: string;
  alternatePhone: string;
  address: string;
  pincode: string;
  villageTown: string;
  residenceType: string;
  districtId: string;
  talukId: string;
  panchayatId: string;
  // Bank (DBT)
  bankAccountName: string;
  bankAccountNumber: string;
  bankIfsc: string;
  bankName: string;
  bankBranch: string;
}

interface UploadedFiles {
  panFile: File | null;
  aadhaarFile: File | null;
  voterIdFile: File | null;
  occupationFile: File | null;
}

interface UploadedUrls {
  panFile: string;
  aadhaarFile: string;
  voterIdFile: string;
  occupationFile: string;
}

function getAdultBirthDateLimit(): string {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setFullYear(date.getFullYear() - 18);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const TABS = [
  { id: "personal" as const, label: "Personal", icon: User },
  { id: "identity" as const, label: "Identity Docs", icon: FileCheck },
  { id: "contact" as const, label: "Contact & Address", icon: MapPin },
  { id: "bank" as const, label: "Bank (DBT)", icon: Landmark },
  { id: "security" as const, label: "Security", icon: Shield },
];

export default function UserProfilePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] =
    useState<(typeof TABS)[number]["id"]>("personal");
  const [tamilKeyboardOpen, setTamilKeyboardOpen] = useState(false);

  const [kyc, setKyc] = useState<KycFormData>({
    fullName: "",
    fullNameTamil: "",
    dob: "",
    gender: "",
    fatherName: "",
    motherName: "",
    maritalStatus: "",
    category: "",
    differentlyAbled: "",
    occupation: "",
    annualIncome: "",
    panNumber: "",
    aadhaarNumber: "",
    voterIdNumber: "",
    email: "",
    alternatePhone: "",
    address: "",
    pincode: "",
    villageTown: "",
    residenceType: "",
    districtId: "",
    talukId: "",
    panchayatId: "",
    bankAccountName: "",
    bankAccountNumber: "",
    bankIfsc: "",
    bankName: "",
    bankBranch: "",
  });

  const [files, setFiles] = useState<UploadedFiles>({
    panFile: null,
    aadhaarFile: null,
    voterIdFile: null,
    occupationFile: null,
  });
  const [uploadedUrls, setUploadedUrls] = useState<UploadedUrls>({
    panFile: "",
    aadhaarFile: "",
    voterIdFile: "",
    occupationFile: "",
  });
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});

  const [districts, setDistricts] = useState<District[]>([]);
  const [taluks, setTaluks] = useState<Taluk[]>([]);
  const [panchayats, setPanchayats] = useState<Panchayat[]>([]);
  const [loadingGeo, setLoadingGeo] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [verStatus, setVerStatus] = useState("Not Submitted");
  const [verNote, setVerNote] = useState("");
  const [verRejection, setVerRejection] = useState("");
  const [verHistory, setVerHistory] = useState<any[]>([]);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [registeredPhone, setRegisteredPhone] = useState("");
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [hasSubmittedProfile, setHasSubmittedProfile] = useState(false);
  const [draftSaveStatus, setDraftSaveStatus] = useState("");
  const draftRevision = useRef(0);

  const [aadhaarRevealed, setAadhaarRevealed] = useState(false);
  const [revealCountdown, setRevealCountdown] = useState(0);

  const [sessions] = useState([
    {
      id: "sess-current",
      device: "Current Authenticated Device",
      location: "Tamil Nadu, India",
      ip: "Active Session",
      lastActive: "Active Now",
      isCurrent: true,
    },
  ]);

  useEffect(() => {
    fetchDistricts();
    loadVerificationStatus();
  }, []);

  useEffect(() => {
    if (kyc.districtId) {
      fetchTaluks(Number(kyc.districtId));
    } else {
      setTaluks([]);
      setPanchayats([]);
      setKyc((prev) => ({ ...prev, talukId: "", panchayatId: "" }));
    }
  }, [kyc.districtId]);

  useEffect(() => {
    if (kyc.talukId) {
      fetchPanchayats(Number(kyc.talukId));
    } else {
      setPanchayats([]);
      setKyc((prev) => ({ ...prev, panchayatId: "" }));
    }
  }, [kyc.talukId]);

  async function fetchDistricts() {
    try {
      setLoadingGeo(true);
      const res = await fetch("/api/geography");
      const data = await res.json();
      if (data.ok) setDistricts(data.districts);
    } catch {
      /* silent */
    } finally {
      setLoadingGeo(false);
    }
  }

  async function fetchTaluks(districtId: number) {
    try {
      const res = await fetch(`/api/geography?districtId=${districtId}`);
      const data = await res.json();
      if (data.ok) setTaluks(data.taluks);
    } catch {
      /* silent */
    }
  }

  async function fetchPanchayats(talukId: number) {
    try {
      const res = await fetch(`/api/geography?talukId=${talukId}`);
      const data = await res.json();
      if (data.ok) setPanchayats(data.panchayaths);
    } catch {
      /* silent */
    }
  }

  async function loadVerificationStatus() {
    try {
      setLoadingStatus(true);
      const res = await fetch(
        "/api/verification/status?userType=customer"
      );
      const data = await res.json();
      if (res.ok && data.ok) {
        const profileSubmitted = Boolean(data.hasSubmitted);
        setHasSubmittedProfile(profileSubmitted);
        setVerStatus(profileSubmitted ? data.currentStatus || "Pending" : "Not Submitted");
        setVerNote(data.statusNote || "");
        setVerRejection(data.rejectionReason || "");
        setVerHistory(data.history || []);
        setRegisteredPhone(String(data.phone || ""));
        const saved = data.profileData || {};
        const restored = saved;
        setKyc((prev) => ({
          ...prev,
          fullName: restored.fullName ?? restored.applicantName ?? "",
          fullNameTamil: restored.fullNameTamil ?? prev.fullNameTamil,
          dob: restored.dob ?? prev.dob,
          gender: restored.gender ?? prev.gender,
          fatherName: restored.fatherName ?? prev.fatherName,
          motherName: restored.motherName ?? prev.motherName,
          maritalStatus: restored.maritalStatus ?? prev.maritalStatus,
          category: restored.category ?? prev.category,
          differentlyAbled: restored.differentlyAbled ?? prev.differentlyAbled,
          occupation: restored.occupation ?? prev.occupation,
          annualIncome: restored.annualIncome ?? prev.annualIncome,
          panNumber: restored.panNumber ?? prev.panNumber,
          aadhaarNumber: restored.aadhaarNumber ?? data.idNumber ?? prev.aadhaarNumber,
          voterIdNumber: restored.voterIdNumber ?? prev.voterIdNumber,
          email: restored.email ?? data.email ?? prev.email,
          alternatePhone: restored.alternatePhone ?? prev.alternatePhone,
          address: restored.address ?? prev.address,
          pincode: restored.pincode ?? prev.pincode,
          villageTown: restored.villageTown ?? prev.villageTown,
          residenceType: restored.residenceType ?? prev.residenceType,
          districtId: restored.districtId != null ? String(restored.districtId) : prev.districtId,
          talukId: restored.talukId != null ? String(restored.talukId) : prev.talukId,
          panchayatId: restored.panchayatId != null ? String(restored.panchayatId) : prev.panchayatId,
          bankAccountName: restored.bankAccountName ?? prev.bankAccountName,
          bankAccountNumber: restored.bankAccountNumber ?? prev.bankAccountNumber,
          bankIfsc: restored.bankIfsc ?? prev.bankIfsc,
          bankName: restored.bankName ?? prev.bankName,
          bankBranch: restored.bankBranch ?? prev.bankBranch,
        }));
        setUploadedUrls({
          panFile: restored.panFile ?? "",
          aadhaarFile: restored.aadhaarFile ?? data.documentUrl ?? "",
          voterIdFile: restored.voterIdFile ?? "",
          occupationFile: restored.occupationFile ?? "",
        });
        if (Object.keys(saved).length) setDraftSaveStatus("Saved profile restored");
        setProfileLoaded(true);
      }
    } catch {
      /* silent */
    } finally {
      setLoadingStatus(false);
      setProfileLoaded(true);
    }
  }

  async function saveProfileDraft(profileData: Record<string, any>, beacon = false): Promise<{ ok: boolean; error?: string; superseded?: boolean }> {
    draftRevision.current = Math.max(Date.now() * 1000, draftRevision.current + 1);
    const revision = draftRevision.current;
    const versionedProfile = { ...profileData, _draftRevision: revision };
    if (beacon) {
      void fetch("/api/verification/draft", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileData: versionedProfile }),
        keepalive: true,
      });
      return { ok: true };
    }
    try {
      const response = await fetch("/api/verification/draft", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileData: versionedProfile }),
      });
      const result = await response.json().catch(() => ({}));
      if (revision !== draftRevision.current) return { ok: false, superseded: true };
      if (response.ok && result.ok && result.saved === false && /approved profile is read-only/i.test(String(result.message || ""))) {
        return { ok: true };
      }
      if (!response.ok || !result.ok || result.saved === false) {
        return {
          ok: false,
          error: result.error || (response.status === 401
            ? "Your sign-in expired. Sign in again to save this profile."
            : result.stale
              ? "A newer draft was saved; your latest changes will retry shortly."
              : result.message || `Server could not save this draft (HTTP ${response.status}).`),
        };
      }
      window.dispatchEvent(new CustomEvent("citizen-profile-draft-saved", { detail: { name: profileData.fullName } }));
      return { ok: true };
    } catch {
      return { ok: false, error: "Could not reach the save service. Check your connection and retry." };
    }
  }

  useEffect(() => {
    if (!profileLoaded || (hasSubmittedProfile && verStatus.toLowerCase() !== "rejected") || verStatus.toLowerCase() === "approved") return;
    const profileData = {
      ...kyc,
      districtId: kyc.districtId ? Number(kyc.districtId) : null,
      talukId: kyc.talukId ? Number(kyc.talukId) : null,
      panchayatId: kyc.panchayatId ? Number(kyc.panchayatId) : null,
      panchayatName: panchayats.find((p) => String(p.id) === kyc.panchayatId)?.name || "",
      ...uploadedUrls,
    };
    const timer = setTimeout(async () => {
      setDraftSaveStatus("Saving…");
      const saved = await saveProfileDraft(profileData);
      setDraftSaveStatus(saved.superseded ? "Saving latest changes…" : saved.ok ? "Saved automatically" : saved.error || "A newer draft is being saved…");
    }, 700);

    return () => clearTimeout(timer);
  }, [kyc, uploadedUrls, profileLoaded, hasSubmittedProfile, verStatus, panchayats]);

  useEffect(() => {
    const flushDraft = () => {
      if (!profileLoaded || (hasSubmittedProfile && verStatus.toLowerCase() !== "rejected") || verStatus.toLowerCase() === "approved") return;
      const profileData = {
        ...kyc,
        districtId: kyc.districtId ? Number(kyc.districtId) : null,
        talukId: kyc.talukId ? Number(kyc.talukId) : null,
        panchayatId: kyc.panchayatId ? Number(kyc.panchayatId) : null,
        panchayatName: panchayats.find((p) => String(p.id) === kyc.panchayatId)?.name || "",
        ...uploadedUrls,
      };
      void saveProfileDraft(profileData, true);
    };
    window.addEventListener("pagehide", flushDraft);
    return () => window.removeEventListener("pagehide", flushDraft);
  }, [kyc, uploadedUrls, profileLoaded, hasSubmittedProfile, verStatus, panchayats]);

  async function uploadFile(docType: string, file: File): Promise<string | null> {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("docType", docType);
    try {
      setUploading((prev) => ({ ...prev, [docType]: true }));
      setUploadErrors((prev) => ({ ...prev, [docType]: "" }));
      const res = await fetch("/api/verification/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (data.ok) return data.url;
      setUploadErrors((prev) => ({
        ...prev,
        [docType]: data.error || "Upload failed",
      }));
      return null;
    } catch {
      setUploadErrors((prev) => ({ ...prev, [docType]: "Network error" }));
      return null;
    } finally {
      setUploading((prev) => ({ ...prev, [docType]: false }));
    }
  }

  async function handleFileChange(
    docType: keyof UploadedFiles,
    file: File | null
  ) {
    if (!file) {
      setFiles((prev) => ({ ...prev, [docType]: null }));
      setUploadedUrls((prev) => ({ ...prev, [docType]: "" }));
      return;
    }
    setFiles((prev) => ({ ...prev, [docType]: file }));
    const url = await uploadFile(docType.replace("File", ""), file);
    if (url) {
      setUploadedUrls((prev) => ({ ...prev, [docType]: url }));
    }
  }

  async function handleSubmitKyc(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError("");
    setSubmitSuccess(false);

    const latestAllowedDob = getAdultBirthDateLimit();
    const aadhaarDigits = kyc.aadhaarNumber.replace(/\D/g, "");
    const panValue = kyc.panNumber.trim().toUpperCase();
    const validPan = /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(panValue);
    const hasIdentityDocument = Boolean(uploadedUrls.aadhaarFile || uploadedUrls.panFile);
    if (kyc.fullName.trim().length < 2 || !kyc.dob || kyc.dob > latestAllowedDob || !kyc.gender) {
      setSubmitError("Enter your full name, gender, and a valid date of birth showing you are at least 18 years old.");
      setActiveTab("personal");
      return;
    }
    if ((kyc.aadhaarNumber.trim() && aadhaarDigits.length !== 12) || (panValue && !validPan)) {
      setSubmitError("Enter a valid 12-digit Aadhaar number or PAN in the correct format.");
      setActiveTab("identity");
      return;
    }
    if (!hasIdentityDocument || (uploadedUrls.aadhaarFile && aadhaarDigits.length !== 12) || (uploadedUrls.panFile && !validPan)) {
      setSubmitError("Upload at least one identity document and enter its matching number.");
      setActiveTab("identity");
      return;
    }
    if ((uploadedUrls.aadhaarFile && !kyc.aadhaarNumber.trim()) || (uploadedUrls.panFile && !panValue)) {
      setSubmitError("Enter the number for each identity document you uploaded.");
      setActiveTab("identity");
      return;
    }
    if (!kyc.occupation.trim()) {
      setSubmitError("Enter your occupation.");
      setActiveTab("personal");
      return;
    }
    if (!kyc.address.trim() || !/^\d{6}$/.test(kyc.pincode) || !kyc.districtId || !kyc.talukId || !kyc.panchayatId) {
      setSubmitError("Enter your address and a valid 6-digit PIN code, then select District, Taluk, and Panchayat.");
      setActiveTab("contact");
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch("/api/verification/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userType: "customer",
          applicantName: kyc.fullName.trim(),
          phone: "",
          idType: uploadedUrls.aadhaarFile ? "Aadhaar Card" : "PAN Card",
          idNumber: uploadedUrls.aadhaarFile ? aadhaarDigits : panValue,
          documentUrl: uploadedUrls.aadhaarFile || uploadedUrls.panFile,
          panNumber: kyc.panNumber.trim(),
          panFile: uploadedUrls.panFile,
          aadhaarNumber: kyc.aadhaarNumber.trim(),
          aadhaarFile: uploadedUrls.aadhaarFile,
          voterIdNumber: kyc.voterIdNumber.trim(),
          voterIdFile: uploadedUrls.voterIdFile,
          occupationFile: uploadedUrls.occupationFile,
          address: kyc.address.trim(),
          districtId: Number(kyc.districtId),
          talukId: Number(kyc.talukId),
          panchayatId: Number(kyc.panchayatId),
          panchayatName: panchayats.find((p) => String(p.id) === kyc.panchayatId)?.name || "",
          // extended fields
          fullName: kyc.fullName,
          fullNameTamil: kyc.fullNameTamil,
          dob: kyc.dob,
          gender: kyc.gender,
          fatherName: kyc.fatherName,
          motherName: kyc.motherName,
          maritalStatus: kyc.maritalStatus,
          category: kyc.category,
          differentlyAbled: kyc.differentlyAbled,
          occupation: kyc.occupation,
          annualIncome: kyc.annualIncome,
          email: kyc.email,
          alternatePhone: kyc.alternatePhone,
          pincode: kyc.pincode,
          villageTown: kyc.villageTown,
          residenceType: kyc.residenceType,
          bankAccountName: kyc.bankAccountName,
          bankAccountNumber: kyc.bankAccountNumber,
          bankIfsc: kyc.bankIfsc,
          bankName: kyc.bankName,
          bankBranch: kyc.bankBranch,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setSubmitError(data.error || "Submission failed. Please try again.");
        return;
      }

      setSubmitSuccess(true);
      setHasSubmittedProfile(true);
      setVerStatus("Pending");
      router.replace("/user/dashboard");
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleRevealAadhaar() {
    const digits = kyc.aadhaarNumber.replace(/\D/g, "");
    if (digits.length !== 12) return;
    if (aadhaarRevealed) {
      setAadhaarRevealed(false);
      setRevealCountdown(0);
      return;
    }
    setAadhaarRevealed(true);
    setRevealCountdown(30);
    const timer = setInterval(() => {
      setRevealCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setAadhaarRevealed(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  const isApproved = verStatus.toLowerCase() === "approved";
  const isRejected = verStatus.toLowerCase() === "rejected";
  const isPending = verStatus.toLowerCase() === "pending" && hasSubmittedProfile;
  const isNotSubmitted = verStatus.toLowerCase() === "not submitted";

  const statusConfig: Record<
    string,
    { color: string; bg: string; icon: any; label: string }
  > = {
    approved: {
      color: "text-emerald-700",
      bg: "bg-emerald-50 border-emerald-200",
      icon: CheckCircle2,
      label: "Verified",
    },
    pending: {
      color: "text-amber-700",
      bg: "bg-amber-50 border-amber-200",
      icon: Clock,
      label: "Under Review",
    },
    rejected: {
      color: "text-rose-700",
      bg: "bg-rose-50 border-rose-200",
      icon: AlertCircle,
      label: "Returned",
    },
    "not submitted": {
      color: "text-slate-600",
      bg: "bg-slate-50 border-slate-200",
      icon: AlertCircle,
      label: "Not Submitted",
    },
  };

  const currentStatusCfg =
    statusConfig[verStatus.toLowerCase()] || statusConfig["not submitted"];
  const StatusIcon = currentStatusCfg.icon;

  // Form completion progress
  const requiredFields = [
    kyc.fullName,
    kyc.dob,
    kyc.gender,
    Boolean(kyc.aadhaarNumber.trim() && kyc.aadhaarNumber.replace(/\D/g, "").length === 12) || Boolean(kyc.panNumber.trim() && /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(kyc.panNumber.trim().toUpperCase())),
    Boolean(uploadedUrls.aadhaarFile || uploadedUrls.panFile),
    uploadedUrls.occupationFile,
    kyc.address,
    kyc.pincode,
    kyc.districtId,
    kyc.talukId,
    kyc.panchayatId,
  ];
  const completedCount = requiredFields.filter(
    (v) => v && String(v).trim().length > 0
  ).length;
  const progressPct = Math.round(
    (completedCount / requiredFields.length) * 100
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ───────── Profile Header ───────── */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 sm:px-8 py-6 flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 text-white flex items-center justify-center text-xl font-bold shrink-0">
            {(kyc.fullName || "C").charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                {kyc.fullName || "Citizen Profile"}
              </h1>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${currentStatusCfg.bg} ${currentStatusCfg.color}`}
              >
                <StatusIcon size={11} />
                {currentStatusCfg.label}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Complete your profile and submit it for staff review. Bank details are optional.
            </p>
            <p className="mt-1 text-[11px] text-slate-500" aria-live="polite">{draftSaveStatus}</p>
            {/* Progress */}
            <div className="mt-3 flex items-center gap-2.5">
              <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden max-w-[200px]">
                <div
                  className="h-full bg-[#ea580c] transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="text-[11px] font-medium text-slate-500 tabular-nums">
                {completedCount}/{requiredFields.length} required
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* ───────── Status Alerts ───────── */}
      {isApproved && (
        <StatusAlert
          variant="success"
          title="Account Fully Verified"
          message="Your profile has been approved. Eligibility and bank requirements may vary by service."
        />
      )}
      {isRejected && verRejection && (
        <StatusAlert
          variant="error"
          title="Verification Returned"
          message={verRejection}
        />
      )}
      {isPending && (
        <StatusAlert
          variant="warning"
          title="Verification in Progress"
          message="Your documents have been submitted to the Welfare Board for review. You can check this page for status updates."
        />
      )}
      {submitSuccess && (
        <StatusAlert
          variant="success"
          title="Submitted Successfully"
          message="Your KYC documents have been sent for verification."
        />
      )}
      {submitError && (
        <StatusAlert variant="error" title="Action needed" message={submitError} />
      )}

      {/* ───────── Tabs ───────── */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-1 -mb-px overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 text-[13px] font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  active
                    ? "border-[#ea580c] text-slate-900"
                    : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
                }`}
              >
                <Icon
                  size={14}
                  className={active ? "text-[#ea580c]" : "text-slate-400"}
                />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ───────── Form ───────── */}
      <form onSubmit={handleSubmitKyc} className="space-y-6">
        <fieldset disabled={isPending || isApproved || submitting} className="contents">
        {/* ─── Personal Tab ─── */}
        {activeTab === "personal" && (
          <FormSection
            title="Personal Information"
            description="Enter the personal details staff need to verify your identity and profession. Optional details can be left blank."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label="Full Name (English)"
                icon={User}
                required
                value={kyc.fullName}
                onChange={(v) => setKyc({ ...kyc, fullName: v })}
                placeholder="As per Aadhaar"
              />
              <div>
                <Field
                  label="பெயர் (Tamil)"
                  icon={User}
                  value={kyc.fullNameTamil}
                  onChange={(v) => setKyc({ ...kyc, fullNameTamil: v })}
                  placeholder="தமிழில் உங்கள் பெயர்"
                />
                <button
                  type="button"
                  onClick={() => setTamilKeyboardOpen(true)}
                  className="mt-2 min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-blue-800 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-200"
                  aria-haspopup="dialog"
                >
                  தமிழ் விசைப்பலகை
                </button>
                {tamilKeyboardOpen && (
                  <TamilKeyboard
                    value={kyc.fullNameTamil}
                    onChange={(value) => setKyc((current) => ({ ...current, fullNameTamil: value }))}
                    onClose={() => setTamilKeyboardOpen(false)}
                  />
                )}
              </div>
              <Field
                label="Date of Birth"
                icon={Calendar}
                type="date"
                max={getAdultBirthDateLimit()}
                required
                value={kyc.dob}
                onChange={(v) => setKyc({ ...kyc, dob: v })}
              />
              <SelectField
                label="Gender"
                icon={User}
                required
                value={kyc.gender}
                onChange={(v) => setKyc({ ...kyc, gender: v })}
                options={[
                  { value: "male", label: "Male" },
                  { value: "female", label: "Female" },
                  { value: "other", label: "Other" },
                ]}
              />
              <Field
                label="Father's Name"
                icon={Users}
                value={kyc.fatherName}
                onChange={(v) => setKyc({ ...kyc, fatherName: v })}
                placeholder="Father's full name"
              />
              <Field
                label="Mother's Name"
                icon={Users}
                value={kyc.motherName}
                onChange={(v) => setKyc({ ...kyc, motherName: v })}
                placeholder="Mother's full name"
              />
              <SelectField
                label="Marital Status"
                icon={Users}
                value={kyc.maritalStatus}
                onChange={(v) => setKyc({ ...kyc, maritalStatus: v })}
                options={[
                  { value: "unmarried", label: "Unmarried" },
                  { value: "married", label: "Married" },
                  { value: "widowed", label: "Widowed" },
                  { value: "divorced", label: "Divorced" },
                ]}
              />
              <SelectField
                label="Category"
                icon={Users}
                value={kyc.category}
                onChange={(v) => setKyc({ ...kyc, category: v })}
                options={[
                  { value: "general", label: "General" },
                  { value: "obc", label: "OBC" },
                  { value: "bc", label: "BC" },
                  { value: "sc", label: "SC" },
                  { value: "st", label: "ST" },
                ]}
              />
              <SelectField
                label="Differently-Abled"
                icon={User}
                value={kyc.differentlyAbled}
                onChange={(v) => setKyc({ ...kyc, differentlyAbled: v })}
                options={[
                  { value: "no", label: "No" },
                  { value: "yes-physical", label: "Yes — Physical" },
                  { value: "yes-visual", label: "Yes — Visual" },
                  { value: "yes-hearing", label: "Yes — Hearing" },
                  { value: "yes-other", label: "Yes — Other" },
                ]}
              />
              <Field
                label="Occupation"
                icon={Briefcase}
                required
                value={kyc.occupation}
                onChange={(v) => setKyc({ ...kyc, occupation: v })}
                placeholder="e.g. Daily wage labourer"
              />
              <Field
                label="Annual Income (₹)"
                icon={Briefcase}
                type="number"
                value={kyc.annualIncome}
                onChange={(v) => setKyc({ ...kyc, annualIncome: v })}
                placeholder="e.g. 120000"
              />
            </div>
          </FormSection>
        )}

        {/* ─── Identity Tab ─── */}
        {activeTab === "identity" && (
          <FormSection
            title="Identity Documents"
            description="Upload at least one identity proof and enter its matching document number. Voter ID is optional."
          >
            <div className="space-y-4">
              <DocUploadRow
                label="PAN Card"
                icon={<CreditCard size={15} className="text-slate-400" />}
                idLabel="PAN Number"
                idPlaceholder="ABCDE1234F"
                idValue={kyc.panNumber}
                onIdChange={(v) =>
                  setKyc({ ...kyc, panNumber: v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10) })
                }
                fileLabel="PAN Document"
                file={files.panFile}
                fileUrl={uploadedUrls.panFile}
                uploading={uploading["pan"] || false}
                uploadError={uploadErrors["pan"] || ""}
                onFileChange={(f) => handleFileChange("panFile", f)}
                required={false}
              />
              <DocUploadRow
                label="Aadhaar Card"
                icon={<User size={15} className="text-slate-400" />}
                idLabel="Aadhaar Number"
                idPlaceholder="XXXX XXXX XXXX"
                idValue={kyc.aadhaarNumber}
                onIdChange={(v) => setKyc({ ...kyc, aadhaarNumber: v.replace(/\D/g, "").slice(0, 12) })}
                fileLabel="Aadhaar Document"
                file={files.aadhaarFile}
                fileUrl={uploadedUrls.aadhaarFile}
                uploading={uploading["aadhaar"] || false}
                uploadError={uploadErrors["aadhaar"] || ""}
                onFileChange={(f) => handleFileChange("aadhaarFile", f)}
                required={false}
              />
              <DocUploadRow
                label="Voter ID Card"
                icon={<FileText size={15} className="text-slate-400" />}
                idLabel="Voter ID Number"
                idPlaceholder="ABC1234567"
                idValue={kyc.voterIdNumber}
                onIdChange={(v) =>
                  setKyc({ ...kyc, voterIdNumber: v.toUpperCase() })
                }
                fileLabel="Voter ID Document"
                file={files.voterIdFile}
                fileUrl={uploadedUrls.voterIdFile}
                uploading={uploading["voterId"] || false}
                uploadError={uploadErrors["voterId"] || ""}
                onFileChange={(f) => handleFileChange("voterIdFile", f)}
                required={false}
              />
            </div>
          </FormSection>
        )}

        {/* ─── Contact & Address Tab ─── */}
        {activeTab === "contact" && (
          <FormSection
            title="Contact & Residential Address"
            description="Used for scheme notifications and field verification visits."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label="Email Address"
                icon={Mail}
                type="email"
                value={kyc.email}
                onChange={(v) => setKyc({ ...kyc, email: v })}
                placeholder="name@example.com"
              />
              <Field
                label="Alternate Phone"
                icon={Phone}
                type="tel"
                value={kyc.alternatePhone}
                onChange={(v) =>
                  setKyc({
                    ...kyc,
                    alternatePhone: v.replace(/\D/g, "").slice(0, 10),
                  })
                }
                placeholder="98765 43210"
              />
            </div>

            <div className="pt-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                <span className="inline-flex items-center gap-1.5">
                  <Home size={12} className="text-slate-400" />
                  Residential Address
                </span>
              </label>
              <textarea
                rows={3}
                value={kyc.address}
                required
                onChange={(e) => setKyc({ ...kyc, address: e.target.value })}
                placeholder="Door no, street, area, landmark"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-100 transition-all resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label="Pincode"
                icon={MapPin}
                type="tel"
                value={kyc.pincode}
                onChange={(v) =>
                  setKyc({ ...kyc, pincode: v.replace(/\D/g, "").slice(0, 6) })
                }
                placeholder="600001"
                required
              />
              <Field
                label="Village / Town"
                icon={Home}
                value={kyc.villageTown}
                onChange={(v) => setKyc({ ...kyc, villageTown: v })}
                placeholder="Village or town name"
              />
              <SelectField
                label="Residence Type"
                icon={Home}
                value={kyc.residenceType}
                onChange={(v) => setKyc({ ...kyc, residenceType: v })}
                options={[
                  { value: "own", label: "Own House" },
                  { value: "rented", label: "Rented" },
                  { value: "family", label: "Family-owned" },
                  { value: "govt-allotted", label: "Govt-allotted" },
                ]}
              />
              <div className="hidden sm:block" />
              <SelectField
                label="District"
                icon={Building2}
                required
                value={kyc.districtId}
                onChange={(v) => setKyc({ ...kyc, districtId: v, talukId: "", panchayatId: "" })}
                options={districts.map((d) => ({
                  value: String(d.id),
                  label: d.nameTa ? `${d.name} (${d.nameTa})` : d.name,
                }))}
                placeholder={loadingGeo ? "Loading..." : "Select district"}
                disabled={loadingGeo}
              />
              <SelectField
                label="Taluk"
                icon={MapPin}
                required
                value={kyc.talukId}
                onChange={(v) => setKyc({ ...kyc, talukId: v, panchayatId: "" })}
                options={taluks.map((t) => ({
                  value: String(t.id),
                  label: t.nameTa ? `${t.name} (${t.nameTa})` : t.name,
                }))}
                placeholder={
                  !kyc.districtId ? "Select district first" : "Select taluk"
                }
                disabled={!kyc.districtId}
              />
              <SelectField
                label="Panchayat"
                icon={MapPin}
                required
                value={kyc.panchayatId}
                onChange={(v) => setKyc({ ...kyc, panchayatId: v })}
                options={panchayats.map((p) => ({
                  value: String(p.id),
                  label: p.nameTa ? `${p.name} (${p.nameTa})` : p.name,
                }))}
                placeholder={!kyc.talukId ? "Select taluk first" : "Select panchayat"}
                disabled={!kyc.talukId}
              />
              <div className="hidden sm:block" />
            </div>
          </FormSection>
        )}

        {/* ─── Bank Tab ─── */}
        {activeTab === "bank" && (
          <FormSection
            title="Bank Account (DBT)"
            description="Optional bank details for DBT. This application does not confirm an Aadhaar-seeded account or NPCI status."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label="Account Holder Name"
                icon={User}
                value={kyc.bankAccountName}
                onChange={(v) => setKyc({ ...kyc, bankAccountName: v })}
                placeholder="As per bank records"
              />
              <Field
                label="Account Number"
                icon={CreditCard}
                value={kyc.bankAccountNumber}
                onChange={(v) =>
                  setKyc({ ...kyc, bankAccountNumber: v.replace(/\D/g, "") })
                }
                placeholder="Account number"
              />
              <Field
                label="IFSC Code"
                icon={Landmark}
                value={kyc.bankIfsc}
                onChange={(v) =>
                  setKyc({ ...kyc, bankIfsc: v.toUpperCase().slice(0, 11) })
                }
                placeholder="SBIN0001234"
              />
              <Field
                label="Bank Name"
                icon={Landmark}
                value={kyc.bankName}
                onChange={(v) => setKyc({ ...kyc, bankName: v })}
                placeholder="e.g. State Bank of India"
              />
              <Field
                label="Branch"
                icon={Building2}
                value={kyc.bankBranch}
                onChange={(v) => setKyc({ ...kyc, bankBranch: v })}
                placeholder="Branch name"
              />
              <div className="flex items-end">
                <div className="w-full p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                  <span>
                    Bank details are optional and are not required for identity verification.
                  </span>
                </div>
              </div>
            </div>
          </FormSection>
        )}

        {/* ─── Security Tab ─── */}
        {activeTab === "security" && (
          <FormSection
            title="Sensitive Identity Information"
            description="Only details entered in your profile are shown. Aadhaar can be briefly revealed for review."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Aadhaar Number
                  </span>
                  <button
                    type="button"
                    onClick={handleRevealAadhaar}
                    disabled={kyc.aadhaarNumber.replace(/\D/g, "").length !== 12}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 hover:text-slate-900"
                  >
                    {aadhaarRevealed ? (
                      <>
                        <EyeOff size={11} />
                        Hide ({revealCountdown}s)
                      </>
                    ) : (
                      <>
                        <Eye size={11} />
                        Reveal (30s)
                      </>
                    )}
                  </button>
                </div>
                <div className="text-sm font-mono font-bold tracking-wider text-slate-900">
                  {(() => {
                    const digits = kyc.aadhaarNumber.replace(/\D/g, "");
                    if (digits.length !== 12) return "Not entered";
                    return aadhaarRevealed
                      ? digits.replace(/(\d{4})(\d{4})(\d{4})/, "$1 $2 $3")
                      : `XXXX XXXX ${digits.slice(-4)}`;
                  })()}
                </div>
              </div>

              <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Registered Mobile
                  </span>
                  {registeredPhone && <span className="text-[11px] text-emerald-700 font-semibold inline-flex items-center gap-1"><CheckCircle2 size={10} /> OTP Verified</span>}
                </div>
                <div className="text-sm font-mono font-bold text-slate-900">
                  {registeredPhone ? `+91 •••• •${registeredPhone.slice(-4)}` : "Not available"}
                </div>
              </div>
            </div>
          </FormSection>
        )}

        {/* ─── Sessions (always render below) ─── */}
        {activeTab === "security" && (
          <FormSection
            title="Active Login Sessions"
            description="Devices connected to your LabourSeva account."
          >
            {sessions.map((sess) => (
              <div
                key={sess.id}
                className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500">
                    <Building2 size={16} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-slate-900 text-sm">
                        {sess.device}
                      </strong>
                      {sess.isCurrent && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                          This Device
                        </span>
                      )}
                    </div>
                    <div className="text-slate-500 text-[11px] mt-0.5">
                      {sess.location} · {sess.ip}
                    </div>
                  </div>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">
                  {sess.lastActive}
                </span>
              </div>
            ))}
          </FormSection>
        )}

        {/* ───────── Sticky submit bar ───────── */}
        <div className="sticky bottom-4 z-10">
          <div className="bg-white border border-slate-200 rounded-xl shadow-lg shadow-slate-900/5 p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-[#ea580c]" />
                <span className="font-semibold text-slate-700 tabular-nums">
                  {completedCount}/{requiredFields.length}
                </span>
              </div>
              <span className="text-slate-400">·</span>
              <span className="text-slate-500 hidden sm:inline">
                Required fields completed
              </span>
            </div>
            <div className="flex items-center gap-2">
              {activeTab !== "security" && (
                <button
                  type="button"
                  onClick={() => {
                    const idx = TABS.findIndex((t) => t.id === activeTab);
                    if (idx < TABS.length - 1) setActiveTab(TABS[idx + 1].id);
                  }}
                  className="hidden sm:inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 border border-slate-200 transition-colors"
                >
                  Next tab
                  <ChevronRight size={13} />
                </button>
              )}
              <button
                type="submit"
                disabled={submitting || isPending || isApproved}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
              >
                {submitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Submitting...
                  </>
                ) : isApproved ? (
                  <>
                    <CheckCircle2 size={14} />
                    Verified
                  </>
                ) : isPending ? (
                  <>
                    <Clock size={14} />
                    Awaiting Verification
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    Submit for Verification
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
        </fieldset>
      </form>

      {/* ───────── Verification Audit Trail ───────── */}
      {verHistory.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">
              Verification Audit Trail
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              All status changes are recorded for accountability.
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {verHistory.slice(0, 5).map((h: any) => (
              <div
                key={h.id}
                className="px-6 py-3 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`font-semibold capitalize ${
                      h.newStatus?.toLowerCase() === "approved"
                        ? "text-emerald-700"
                        : h.newStatus?.toLowerCase() === "rejected"
                        ? "text-rose-700"
                        : "text-amber-700"
                    }`}
                  >
                    {h.newStatus}
                  </span>
                  <span className="text-slate-400">by {h.changedBy}</span>
                </div>
                <span className="text-slate-400 font-mono">
                  {new Date(h.changedAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ────────────────── Reusable Field Components ────────────────── */

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100">
        <h2 className="text-sm font-bold text-slate-900">{title}</h2>
        {description && (
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        )}
      </div>
      <div className="p-6 space-y-4">{children}</div>
    </div>
  );
}

function TamilKeyboard({
  value,
  onChange,
  onClose,
}: {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
}) {
  const keyboardRef = useRef<KeyboardReactInterface | null>(null);
  const notificationSequence = useRef(0);
  const [notification, setNotification] = useState({
    id: 0,
    english: "Tamil keyboard ready. Tap a character to type; your profile autosaves.",
    tamil: "தமிழ் விசைப்பலகை தயார். எழுத்தைத் தொட்டு தட்டச்சு செய்யுங்கள்; விவரங்கள் தானாகச் சேமிக்கப்படும்.",
  });

  function notifyAction(english: string, tamil: string) {
    notificationSequence.current += 1;
    setNotification({ id: notificationSequence.current, english, tamil });
  }

  useEffect(() => {
    keyboardRef.current?.setInput(value);
  }, [value]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setNotification((current) => ({ ...current, english: "", tamil: "" })), 10_000);
    return () => window.clearTimeout(timeout);
  }, [notification.id]);

  const layout = {
    default: [
      "அ ஆ இ ஈ உ ஊ எ ஏ ஐ ஒ ஓ ஔ",
      "க ங ச ஞ ட ண த ந ப ம",
      "ய ர ல வ ழ ள ற ன ஜ ஷ ஸ ஹ",
      "{space}",
    ],
  };
  const vowelSigns = ["ா", "ி", "ீ", "ு", "ூ", "ெ", "ே", "ை", "ொ", "ோ", "ௌ", "்"];

  function appendCharacter(character: string) {
    const nextValue = value + character;
    keyboardRef.current?.setInput(nextValue);
    onChange(nextValue);
    notifyAction("Tamil vowel sign added. Profile autosave is running.", "தமிழ் உயிர்க்குறி சேர்க்கப்பட்டது. விவரங்கள் தானாகச் சேமிக்கப்படுகின்றன.");
  }

  function removeLastTamilCharacter() {
    const characters = Array.from(value);
    if (!characters.length) return;
    if (/[\u0bbe-\u0bcc\u0bcd\u0bd7]/u.test(characters[characters.length - 1])) {
      while (characters.length && /[\u0bbe-\u0bcc\u0bcd\u0bd7]/u.test(characters[characters.length - 1])) {
        characters.pop();
      }
    }
    characters.pop();
    const nextValue = characters.join("");
    keyboardRef.current?.setInput(nextValue);
    onChange(nextValue);
    notifyAction("Last Tamil character removed. Profile autosave is running.", "கடைசி தமிழ் எழுத்து நீக்கப்பட்டது. விவரங்கள் தானாகச் சேமிக்கப்படுகின்றன.");
  }

  return (
    <div
      role="dialog"
      aria-label="Tamil on-screen keyboard"
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/40 p-4"
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <div className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-300 bg-white p-4 shadow-xl" lang="ta">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">Tamil Keyboard <span className="font-normal text-slate-500">/ தமிழ் விசைப்பலகை</span></h3>
            <p className="text-xs text-slate-600">Tap a character to enter your name <span lang="ta">/ எழுத்தைத் தொட்டு பெயரை உள்ளிடுங்கள்</span></p>
          </div>
          <button type="button" onClick={onClose} className="min-h-11 min-w-11 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50" aria-label="Close Tamil keyboard">
            <X size={18} className="mx-auto" />
          </button>
        </div>
        <div className="space-y-2">
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3" aria-live="polite">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">Name preview <span lang="ta">/ பெயர் முன்னோட்டம்</span></p>
            <p className="min-h-7 break-words text-lg text-slate-900"><span className={value ? "" : "text-slate-400"}>{value || "Your name will appear here / இங்கே உங்கள் பெயர் தோன்றும்"}</span><span className="tamil-typing-cursor" aria-hidden="true" /></p>
          </div>
          <Keyboard
            keyboardRef={(keyboard: any) => { keyboardRef.current = keyboard; }}
            onChange={(input: any) => {
              onChange(input);
              notifyAction("Tamil text updated. Profile autosave is running.", "தமிழ் உரை புதுப்பிக்கப்பட்டது. விவரங்கள் தானாகச் சேமிக்கப்படுகின்றன.");
            }}
            layout={layout}
            display={{ "{space}": "Space / இடைவெளி" }}
            theme="hg-theme-default tamil-keyboard"
          />
          <div className="flex flex-wrap justify-center gap-1.5" aria-label="Tamil vowel signs">
            {vowelSigns.map((sign) => (
              <button key={sign} type="button" onClick={() => appendCharacter(sign)} className="min-h-10 min-w-10 rounded-md border border-slate-300 bg-white px-2 text-base text-slate-900 hover:border-blue-800 hover:bg-blue-50" aria-label={`Insert Tamil vowel sign ${sign}`}>
                ◌{sign}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-2 pt-1">
            <button type="button" onClick={removeLastTamilCharacter} className="min-h-11 rounded-md border border-slate-300 px-4 text-sm text-slate-800 hover:bg-slate-50">⌫ Backspace <span lang="ta">/ நீக்கு</span></button>
            <button type="button" onClick={() => { keyboardRef.current?.setInput(""); onChange(""); notifyAction("Name cleared. Profile autosave is running.", "பெயர் அழிக்கப்பட்டது. விவரங்கள் தானாகச் சேமிக்கப்படுகின்றன."); }} className="min-h-11 rounded-md border border-slate-300 px-4 text-sm text-slate-800 hover:bg-slate-50">Clear <span lang="ta">/ அழி</span></button>
            <button type="button" onClick={onClose} className="min-h-11 rounded-md bg-blue-900 px-4 text-sm font-semibold text-white hover:bg-blue-800">Done <span lang="ta">/ முடிந்தது</span></button>
          </div>
        </div>
      </div>
      {notification.english && (
        <aside role="status" aria-live="polite" className="fixed bottom-5 right-5 z-[90] w-[min(22rem,calc(100vw-2.5rem))] rounded-lg border border-blue-200 bg-white p-4 text-sm text-slate-800 shadow-xl">
          <p className="font-semibold text-blue-900">Action update / செயல் நிலை</p>
          <p className="mt-1">{notification.english}</p>
          <p className="mt-1 text-slate-600" lang="ta">{notification.tamil}</p>
        </aside>
      )}
    </div>
  );
}

function Field({
  label,
  icon: Icon,
  type = "text",
  value,
  onChange,
  placeholder,
  required,
  max,
}: {
  label: string;
  icon: any;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  max?: string;
}) {
  return (
    <div>
      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
        <span className="inline-flex items-center gap-1.5">
          <Icon size={12} className="text-slate-400" />
          {label}
          {required && <span className="text-rose-500">*</span>}
        </span>
      </label>
      <input
        type={type}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full h-10 px-3.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-100 transition-all"
      />
    </div>
  );
}

function SelectField({
  label,
  icon: Icon,
  value,
  onChange,
  options,
  placeholder = "Select...",
  required,
  disabled,
}: {
  label: string;
  icon: any;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
        <span className="inline-flex items-center gap-1.5">
          <Icon size={12} className="text-slate-400" />
          {label}
          {required && <span className="text-rose-500">*</span>}
        </span>
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
        className="w-full h-10 px-3.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 outline-none focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function StatusAlert({
  variant,
  title,
  message,
}: {
  variant: "success" | "error" | "warning";
  title: string;
  message: string;
}) {
  const cfg = {
    success: {
      icon: CheckCircle2,
      bg: "bg-emerald-50 border-emerald-200",
      iconColor: "text-emerald-600",
      titleColor: "text-emerald-800",
      msgColor: "text-emerald-700",
    },
    error: {
      icon: AlertCircle,
      bg: "bg-rose-50 border-rose-200",
      iconColor: "text-rose-600",
      titleColor: "text-rose-800",
      msgColor: "text-rose-700",
    },
    warning: {
      icon: Clock,
      bg: "bg-amber-50 border-amber-200",
      iconColor: "text-amber-600",
      titleColor: "text-amber-800",
      msgColor: "text-amber-700",
    },
  }[variant];

  const Icon = cfg.icon;
  return (
    <div
      className={`p-3.5 rounded-xl border ${cfg.bg} flex items-start gap-2.5`}
    >
      <Icon size={16} className={`flex-shrink-0 mt-0.5 ${cfg.iconColor}`} />
      <div>
        <p className={`text-sm font-bold ${cfg.titleColor}`}>{title}</p>
        <p className={`text-xs mt-0.5 ${cfg.msgColor}`}>{message}</p>
      </div>
    </div>
  );
}

function DocUploadRow({
  label,
  icon,
  idLabel,
  idPlaceholder,
  idValue,
  onIdChange,
  fileLabel,
  file,
  fileUrl,
  uploading,
  uploadError,
  onFileChange,
  required,
}: {
  label: string;
  icon: React.ReactNode;
  idLabel: string;
  idPlaceholder: string;
  idValue: string;
  onIdChange: (v: string) => void;
  fileLabel: string;
  file: File | null;
  fileUrl: string;
  uploading: boolean;
  uploadError: string;
  onFileChange: (f: File | null) => void;
  required: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-bold text-slate-900">{label}</span>
        {required && <span className="text-rose-500 text-xs">*</span>}
        {fileUrl && (
          <CheckCircle2
            size={14}
            className="text-emerald-600 ml-auto"
          />
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] font-bold text-slate-600 block mb-1">
            {idLabel}
          </label>
          <input
            type="text"
            value={idValue}
            onChange={(e) => onIdChange(e.target.value)}
            placeholder={idPlaceholder}
            className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm font-mono text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-100 transition-all"
          />
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-600 block mb-1">
            {fileLabel} (PDF/JPG, max 5MB)
          </label>
          <div className="relative">
            {fileUrl ? (
              <div className="h-10 px-3 rounded-lg border border-emerald-200 bg-emerald-50 flex items-center gap-2 text-xs">
                <FileCheck
                  size={14}
                  className="text-emerald-600 flex-shrink-0"
                />
                <span className="text-emerald-800 font-semibold truncate flex-1">
                  {file?.name || "Uploaded"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onFileChange(null);
                    if (inputRef.current) inputRef.current.value = "";
                  }}
                  className="text-emerald-600 hover:text-emerald-800"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <label
                className={`h-10 px-3 rounded-lg border border-dashed flex items-center gap-2 text-xs cursor-pointer transition-colors ${
                  uploadError
                    ? "border-rose-300 bg-rose-50"
                    : "border-slate-300 hover:border-slate-900 bg-white"
                }`}
              >
                {uploading ? (
                  <Loader2
                    size={14}
                    className="animate-spin text-slate-700"
                  />
                ) : (
                  <Upload size={14} className="text-slate-400" />
                )}
                <span className="text-slate-600 font-medium">
                  {uploading ? "Uploading..." : "Choose file"}
                </span>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  aria-label={fileLabel}
                  className="hidden"
                  onChange={(e) => onFileChange(e.target.files?.[0] || null)}
                />
              </label>
            )}
          </div>
          {uploadError && (
            <p className="text-[10px] text-rose-600 mt-0.5">{uploadError}</p>
          )}
        </div>
      </div>
    </div>
  );
}
