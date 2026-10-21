"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Store,
  User,
  Phone,
  Mail,
  MapPin,
  Building2,
  Loader2,
  Save,
  FileText,
  CreditCard,
  Camera,
  Hash,
  Link as LinkIcon,
  Trash2,
} from "lucide-react";

import { ProfileHeader } from "@/components/retailer/ProfileHeader";
import { StatusAlert } from "@/components/retailer/StatusAlert";
import { FormSection, Field } from "@/components/retailer/FormSection";
import { DocUploadRow } from "@/components/retailer/DocUploadRow";

interface RetailerProfileData {
  id: number | string;
  name?: string;
  shopName?: string;
  businessType?: string;
  phone?: string;
  email?: string;
  address?: string;
  panNo?: string;
  aadhaarNo?: string;
  panDocument?: string;
  aadhaarDocument?: string;
  businessDocument?: string;
  shopUrl?: string;
  gstNo?: string;
  shopPhoto?: string;
  shopPhotos?: string[];
  districtId?: number;
  talukId?: number;
  panchayatId?: number;
  status?: string;
  registrationNo?: string;
  distributor?: { id?: number; name?: string };
  district?: { id?: number; name?: string; nameTa?: string | null };
}

interface FormDataState {
  name: string;
  shopName: string;
  businessType: string;
  phone: string;
  address: string;
  panNo: string;
  aadhaarNo: string;
  panDocument: string;
  aadhaarDocument: string;
  businessDocument: string;
  shopUrl: string;
  gstNo: string;
  shopPhotos: string[];
  districtId: string;
  talukId: string;
  panchayatId: string;
}

const INITIAL_FORM: FormDataState = {
  name: "",
  shopName: "",
  businessType: "",
  phone: "",
  address: "",
  panNo: "",
  aadhaarNo: "",
  panDocument: "",
  aadhaarDocument: "",
  businessDocument: "",
  shopUrl: "",
  gstNo: "",
  shopPhotos: [],
  districtId: "",
  talukId: "",
  panchayatId: "",
};

interface GeoOption { id: number; displayName: string }

export default function RetailerProfilePage() {
  const [profile, setProfile] = useState<RetailerProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Consolidated form & file tracking state
  const [formData, setFormData] = useState<FormDataState>(INITIAL_FORM);
  const [uploadingDoc, setUploadingDoc] = useState("");
  const [fileNames, setFileNames] = useState<Record<string, string>>({});
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [autosave, setAutosave] = useState<"saved" | "saving" | "error">("saved");
  const [districts, setDistricts] = useState<GeoOption[]>([]);
  const [taluks, setTaluks] = useState<GeoOption[]>([]);
  const [panchayaths, setPanchayaths] = useState<GeoOption[]>([]);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());

  function updateField<K extends keyof FormDataState>(key: K, value: FormDataState[K]) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        const res = await fetch("/api/retailer/profile");
        const json = await res.json();
        if (json.ok && json.profile) {
          const p = json.profile;
          setProfile(p);
          setFormData({
            name: p.name || "",
            shopName: p.shopName || "",
            businessType: p.businessType || "",
            phone: p.phone || "",
            address: p.address || "",
            panNo: p.panNo || "",
            aadhaarNo: "",
            panDocument: p.panDocument || "",
            aadhaarDocument: p.aadhaarDocument || "",
            businessDocument: p.businessDocument || "",
            shopUrl: p.shopUrl || "",
            gstNo: p.gstNo || "",
            shopPhotos: p.shopPhotos || (p.shopPhoto ? [p.shopPhoto] : []),
            districtId: p.districtId ? String(p.districtId) : "",
            talukId: p.talukId ? String(p.talukId) : "",
            panchayatId: p.panchayatId ? String(p.panchayatId) : "",
          });
          setProfileLoaded(true);
        } else {
          setError(json.error || "Failed to load Kendra profile");
        }
      } catch (err: any) {
        setError(err.message || "Network error loading Kendra profile");
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  useEffect(() => {
    fetch("/api/geography").then((res) => res.json()).then((data) => setDistricts(data.districts || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!formData.districtId) { setTaluks([]); return; }
    fetch(`/api/geography?districtId=${formData.districtId}`).then((res) => res.json()).then((data) => setTaluks(data.taluks || [])).catch(() => {});
  }, [formData.districtId]);

  useEffect(() => {
    if (!formData.talukId) { setPanchayaths([]); return; }
    fetch(`/api/geography?talukId=${formData.talukId}`).then((res) => res.json()).then((data) => setPanchayaths(data.panchayaths || [])).catch(() => {});
  }, [formData.talukId]);

  const saveDraft = useCallback(async () => {
    const body = JSON.stringify(formData);
    const pending = saveQueue.current.catch(() => undefined).then(async () => {
      const res = await fetch("/api/retailer/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Draft save failed");
    });
    saveQueue.current = pending;
    await pending;
  }, [formData]);

  useEffect(() => {
    if (!profileLoaded) return;
    setAutosave("saving");
    const timer = window.setTimeout(() => {
      saveDraft().then(() => setAutosave("saved")).catch(() => setAutosave("error"));
    }, 650);
    return () => window.clearTimeout(timer);
  }, [formData, profileLoaded, saveDraft]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSuccess(null);
    setError(null);

    try {
      await saveDraft();
      const res = await fetch("/api/retailer/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error || "Update failed");
        return;
      }
      setSuccess(
        "Profile submitted for staff verification. Your retailer account will be available after approval."
      );
      setProfile((previous) => previous ? { ...previous, status: "Pending" } : previous);
    } catch (err: any) {
      setError(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  async function uploadDocument(docType: string, file?: File) {
    if (!file) return;
    setUploadingDoc(docType);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("docType", docType);

      const response = await fetch("/api/verification/upload", {
        method: "POST",
        body: form,
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Upload failed");

      if (docType === "retailer-pan") {
        updateField("panDocument", result.url);
        setFileNames((prev) => ({ ...prev, pan: file.name }));
      } else if (docType === "retailer-aadhaar") {
        updateField("aadhaarDocument", result.url);
        setFileNames((prev) => ({ ...prev, aadhaar: file.name }));
      } else if (docType === "retailer-business") {
        updateField("businessDocument", result.url);
        setFileNames((prev) => ({ ...prev, business: file.name }));
      } else if (docType === "retailer-shop-photo") {
        setFormData((prev) => ({ ...prev, shopPhotos: [...prev.shopPhotos, result.url] }));
      }
      setSuccess(docType === "retailer-shop-photo" ? "Shop photo uploaded and saved." : "Document uploaded and saved to your draft.");
    } catch (err: any) {
      setError(err.message || "Document upload failed");
    } finally {
      setUploadingDoc("");
    }
  }

  function clearDocument(docType: string) {
    if (docType === "retailer-pan") {
      updateField("panDocument", "");
      setFileNames((prev) => ({ ...prev, pan: "" }));
    } else if (docType === "retailer-aadhaar") {
      updateField("aadhaarDocument", "");
      setFileNames((prev) => ({ ...prev, aadhaar: "" }));
    } else if (docType === "retailer-business") {
      updateField("businessDocument", "");
      setFileNames((prev) => ({ ...prev, business: "" }));
    }
  }

  function removeShopPhoto(photoUrl: string) {
    updateField("shopPhotos", formData.shopPhotos.filter((photo) => photo !== photoUrl));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <Loader2 className="w-7 h-7 animate-spin text-slate-700 mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-600">Loading Kendra Profile...</p>
        </div>
      </div>
    );
  }

  // Calculate required fields completeness
  const requiredFields = [
    formData.name,
    formData.shopName,
    formData.businessType,
    formData.phone,
    formData.address,
    formData.panNo,
    formData.aadhaarNo || profile?.aadhaarNo,
    formData.panDocument,
    formData.aadhaarDocument,
    formData.businessDocument,
    formData.shopPhotos.length > 0,
    formData.districtId,
    formData.talukId,
    formData.panchayatId,
  ];
  const completedCount = requiredFields.filter((v) => v && String(v).trim().length > 0).length;
  const progressPct = Math.round((completedCount / requiredFields.length) * 100);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ───────── Profile Header Card ───────── */}
      <ProfileHeader
        shopName={profile?.shopName}
        status={profile?.status || "Pending"}
        registrationNo={profile?.registrationNo}
        distributorName={profile?.distributor?.name}
        completedCount={completedCount}
        totalRequired={requiredFields.length}
        progressPct={progressPct}
      />

      {/* ───────── Notifications ───────── */}
      {success && <StatusAlert variant="success" title="Saved" message={success} />}
      {error && <StatusAlert variant="error" title="Action needed" message={error} />}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ─── Commercial Particulars ─── */}
        <FormSection
          title="Commercial Particulars"
          description="Operator identity and business classification."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Shop / Business Name"
              icon={Store}
              value={formData.shopName}
              onChange={(v) => updateField("shopName", v)}
              placeholder="e.g. LabourSeva Seva Kendra"
              required
            />
            <Field
              label="Operator In-Charge Name"
              icon={User}
              value={formData.name}
              onChange={(v) => updateField("name", v)}
              placeholder="Operator's full name"
              required
            />
            <Field
              label="Profession / Business Type"
              icon={Building2}
              value={formData.businessType}
              onChange={(v) => updateField("businessType", v)}
              placeholder="e.g. Common Service Centre operator"
              required
            />
            <Field
              label="Contact Phone"
              icon={Phone}
              type="tel"
              value={formData.phone}
              onChange={(v) => updateField("phone", v.replace(/\D/g, "").slice(0, 10))}
              placeholder="98765 43210"
              required
            />
            <Field
              label="Registered Email"
              icon={Mail}
              type="email"
              value={profile?.email || ""}
              onChange={() => {}}
              disabled
              hint="Email cannot be modified directly."
            />
          </div>
        </FormSection>

        {/* ─── Online Presence & Tax ─── */}
        <FormSection
          title="Online Presence & Tax"
          description="Optional — improves discoverability and B2B compliance."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Shop website or listing link"
              icon={LinkIcon}
              type="url"
              value={formData.shopUrl}
              onChange={(v) => updateField("shopUrl", v)}
              placeholder="https://maps.app.goo.gl/..."
            />
            <Field
              label="GSTIN"
              icon={Hash}
              value={formData.gstNo}
              onChange={(v) => updateField("gstNo", v.toUpperCase().slice(0, 15))}
              placeholder="15-character GSTIN"
            />
          </div>
        </FormSection>

        {/* ─── Shop Premise Address ─── */}
        <FormSection
          title="Shop Premise Address"
          description="Physical address where the Kendra operates — used for field verification."
        >
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={12} className="text-slate-400" />
                Full Address
                <span className="text-rose-500">*</span>
              </span>
            </label>
            <textarea
              rows={3}
              value={formData.address}
              onChange={(e) => updateField("address", e.target.value)}
              placeholder="Door no, street, area, landmark, pincode"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-100 transition-all resize-none"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            {([
              ["districtId", "District", districts],
              ["talukId", "Taluk", taluks],
              ["panchayatId", "Panchayat", panchayaths],
            ] as const).map(([key, label, options]) => (
              <label key={key} className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                {label}<span className="text-rose-500"> *</span>
                <select
                  value={formData[key]}
                  onChange={(event) => {
                    if (key === "districtId") setFormData((prev) => ({ ...prev, districtId: event.target.value, talukId: "", panchayatId: "" }));
                    else if (key === "talukId") setFormData((prev) => ({ ...prev, talukId: event.target.value, panchayatId: "" }));
                    else updateField("panchayatId", event.target.value);
                  }}
                  required
                  className="mt-1.5 block w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm normal-case tracking-normal text-slate-900"
                >
                  <option value="">Select {label}</option>
                  {options.map((option) => <option key={option.id} value={option.id}>{option.displayName}</option>)}
                </select>
              </label>
            ))}
          </div>
        </FormSection>

        {/* ─── Verification Documents ─── */}
        <FormSection
          title="Verification Documents"
          description="Upload government / business proofs. PDF, JPG, or PNG up to 5 MB. Staff approval is required before service applications."
        >
          {/* PAN */}
          <DocUploadRow
            label="PAN Card"
            icon={<CreditCard size={15} className="text-slate-400" />}
            idLabel="PAN Number"
            idPlaceholder="ABCDE1234F"
            idValue={formData.panNo}
            onIdChange={(v) => updateField("panNo", v.toUpperCase().slice(0, 10))}
            fileLabel="PAN Document"
            fileName={fileNames.pan || ""}
            fileUrl={formData.panDocument}
            uploading={uploadingDoc === "retailer-pan"}
            onFileChange={(f) => uploadDocument("retailer-pan", f || undefined)}
            onClear={() => clearDocument("retailer-pan")}
            required
          />

          {/* Aadhaar */}
          <DocUploadRow
            label="Aadhaar Card"
            icon={<User size={15} className="text-slate-400" />}
            idLabel="Aadhaar Number"
            idPlaceholder={profile?.aadhaarNo ? `Saved ending ${profile.aadhaarNo.slice(-4)} (leave blank to keep)` : "12-digit Aadhaar number"}
            idValue={formData.aadhaarNo}
            onIdChange={(v) => updateField("aadhaarNo", v.replace(/\D/g, "").slice(0, 12))}
            fileLabel="Aadhaar Document"
            fileName={fileNames.aadhaar || ""}
            fileUrl={formData.aadhaarDocument}
            uploading={uploadingDoc === "retailer-aadhaar"}
            onFileChange={(f) => uploadDocument("retailer-aadhaar", f || undefined)}
            onClear={() => clearDocument("retailer-aadhaar")}
            required
          />

          {/* Business proof */}
          <DocUploadRow
            label="Business / Profession Proof"
            icon={<FileText size={15} className="text-slate-400" />}
            idLabel="Proof Type"
            idPlaceholder="Trade licence / Operator certificate"
            idValue={formData.businessType}
            onIdChange={(v) => updateField("businessType", v)}
            fileLabel="Business Document"
            fileName={fileNames.business || ""}
            fileUrl={formData.businessDocument}
            uploading={uploadingDoc === "retailer-business"}
            onFileChange={(f) => uploadDocument("retailer-business", f || undefined)}
            onClear={() => clearDocument("retailer-business")}
            required
            fullWidthId
          />

          <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 space-y-3">
            <div className="flex items-center gap-2">
              <Camera size={15} className="text-slate-400" />
              <span className="text-sm font-bold text-slate-900">Shop Photograph</span>
              <span className="text-rose-500 text-xs">*</span>
              <span className="ml-auto text-xs text-slate-500">{formData.shopPhotos.length}/10</span>
            </div>
            <p className="text-xs text-slate-600">Upload up to 10 clear JPG or PNG photos of the shop exterior, interior, and signboard. Maximum 5 MB each.</p>
            <label className="inline-flex h-10 px-3 items-center gap-2 rounded-lg border border-dashed border-slate-300 hover:border-slate-900 bg-white text-xs cursor-pointer">
              {uploadingDoc === "retailer-shop-photo" ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
              {uploadingDoc === "retailer-shop-photo" ? "Uploading photos..." : "Choose shop photos"}
              <input
                type="file"
                accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                multiple
                disabled={formData.shopPhotos.length >= 10 || Boolean(uploadingDoc)}
                className="sr-only"
                onChange={async (event) => {
                  const files = Array.from(event.target.files || []);
                  event.target.value = "";
                  const allowed = files.slice(0, Math.max(0, 10 - formData.shopPhotos.length));
                  if (files.length > allowed.length) setError("You can upload up to 10 shop photos.");
                  for (const file of allowed) await uploadDocument("retailer-shop-photo", file);
                }}
              />
            </label>
            {formData.shopPhotos.length ? (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {formData.shopPhotos.map((photo, index) => (
                  <div key={photo} className="relative rounded-lg border border-slate-200 bg-white overflow-hidden">
                    <img src={photo} alt={`Shop photo ${index + 1}`} className="w-full h-24 object-cover" />
                    <a href={photo} target="_blank" rel="noreferrer" className="block px-2 py-1 text-[10px] text-blue-700 underline truncate">Photo {index + 1}</a>
                    <button type="button" onClick={() => removeShopPhoto(photo)} className="absolute top-1 right-1 rounded bg-white/95 p-1 text-rose-700" aria-label={`Remove shop photo ${index + 1}`}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            ) : <p className="text-xs text-rose-700">Add at least one photo to submit for verification.</p>}
          </div>
        </FormSection>

        {/* ─── Tax & Identity References (read-only summary) ─── */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Tax &amp; Identity References</h3>
            <p className="text-xs text-slate-500 mt-0.5">Masked reference values for compliance audit.</p>
          </div>
          <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
                GST Identification
              </div>
              <div className="text-sm font-mono font-bold text-slate-800">
                {formData.gstNo || "Not Registered"}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
                Permanent Account No (PAN)
              </div>
              <div className="text-sm font-mono font-bold text-slate-800">
                {profile?.panNo || formData.panNo || "—"}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
                Masked Aadhaar Reference
              </div>
              <div className="text-sm font-mono font-bold text-slate-800">
                {profile?.aadhaarNo || "XXXX-XXXX-9988"}
              </div>
            </div>
          </div>
        </div>

        {/* ───────── Sticky Submit Bar ───────── */}
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
              <span className="text-slate-500 hidden sm:inline">Required fields · {autosave === "saving" ? "Saving draft…" : autosave === "error" ? "Autosave failed" : "Saved automatically"}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
              >
                {saving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Saving...
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
      </form>
    </div>
  );
}
