"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import {
  CheckCircle2,
  AlertTriangle,
  Download,
  Eye,
  FilePenLine,
  ImagePlus,
  RefreshCw,
  Search,
  Trash2,
  UploadCloud,
  X,
  FileCheck,
  Building2,
  SlidersHorizontal,
} from "lucide-react";

type District = {
  id: number;
  name: string;
  nameTa?: string | null;
  signature_path?: string | null;
};

type Signature = {
  id: string;
  districtId: number;
  officerName: string;
  designation: string;
  storageKey: string;
  imageMime: string;
  imageSize: number;
  updatedAt: string;
};

type Stats = {
  total: number;
  present: number;
  missing: number;
};

export default function AdminSignaturesPage() {
  const { language } = useLanguage();
  const isTa = language === "ta";

  const [districts, setDistricts] = useState<District[]>([]);
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 38, present: 32, missing: 6 });
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "present" | "missing">("all");
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<{ signature: Signature; district: District } | null>(null);
  const [editing, setEditing] = useState<Signature | null>(null);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form state
  const [districtId, setDistrictId] = useState("");
  const [officerName, setOfficerName] = useState("");
  const [designation, setDesignation] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/signatures", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load signatures");
      setDistricts(data.districts || []);
      setSignatures(data.signatures || []);
      if (data.stats) setStats(data.stats);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load signatures.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Compute matched rows
  const rows = useMemo(() => {
    const searchLower = search.toLowerCase().trim();

    return districts
      .map((district) => {
        const signature = signatures.find((item) => item.districtId === district.id);
        const isPresent = Boolean(signature?.storageKey || district.signature_path);
        return { district, signature, isPresent };
      })
      .filter(({ district, signature, isPresent }) => {
        // Tab filter
        if (filterTab === "present" && !isPresent) return false;
        if (filterTab === "missing" && isPresent) return false;

        // Search query
        if (!searchLower) return true;
        const matchesName = `${district.name} ${district.nameTa || ""}`.toLowerCase().includes(searchLower);
        const matchesOfficer = signature?.officerName?.toLowerCase().includes(searchLower);
        const matchesDesig = signature?.designation?.toLowerCase().includes(searchLower);
        return matchesName || matchesOfficer || matchesDesig;
      });
  }, [districts, signatures, search, filterTab]);

  const presentCount = useMemo(() => {
    return districts.filter((d) => signatures.some((s) => s.districtId === d.id && s.storageKey)).length;
  }, [districts, signatures]);

  const missingDistricts = useMemo(() => {
    return districts.filter((d) => !signatures.some((s) => s.districtId === d.id && s.storageKey));
  }, [districts, signatures]);

  function startUpload(signature?: Signature, district?: District) {
    setEditing(signature || null);
    const targetDistId = String(signature?.districtId || district?.id || districts[0]?.id || "");
    setDistrictId(targetDistId);
    setOfficerName(signature?.officerName || "District Labour Officer");
    setDesignation(signature?.designation || "Authorized Signatory, Govt. of Tamil Nadu");
    setFile(null);
    setPreviewUrl(signature?.storageKey || "");
    setError("");
    setSuccessMsg("");
    setOpen(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!file && !editing) {
      setError("Please select an authorized signature image file.");
      return;
    }
    setBusy(true);
    setError("");
    setSuccessMsg("");

    const form = new FormData();
    form.set("districtId", districtId);
    form.set("officerName", officerName);
    form.set("designation", designation);
    if (file) form.set("file", file);

    try {
      const response = await fetch("/api/admin/signatures", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Upload failed");
      setOpen(false);
      setSuccessMsg("District signature successfully updated and synced with document studio.");
      await load();
      setTimeout(() => setSuccessMsg(""), 5000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(signature: Signature, distName: string) {
    if (!window.confirm(`Are you sure you want to delete the signature for ${distName}? This will turn off PDF stamp generation for this district.`)) {
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/admin/signatures", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: signature.id, districtId: signature.districtId }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Delete failed");
      }
      setSuccessMsg(`Signature for ${distName} deleted successfully.`);
      await load();
      setTimeout(() => setSuccessMsg(""), 5000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="space-y-6 font-sans">
      {/* Top Banner / Tamil Nadu Government Header */}
      <section className="rounded-xl border border-slate-200 border-t-4 border-t-[#1e3a8a] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#ea580c]">
                {isTa ? "தமிழ்நாடு தொழிலாளர் துறை" : "Tamil Nadu Labour Department"}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                <CheckCircle2 size={13} className="text-emerald-600" />
                {isTa ? "நேரலை பயிலக ஒத்திசைவு" : "Live Studio Sync"}
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
              {isTa ? "மாவட்ட அதிகாரப்பூர்வ கையொப்ப படங்கள்" : "District Signature Images"}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {isTa
                ? "தமிழ்நாட்டின் அனைத்து மாவட்டங்களிலும் தானியங்கி பிடிஎஃப் சான்றிதழ் வழங்கலுக்கு பயன்படுத்தப்படும் அதிகாரப்பூர்வ முத்திரைகள் மற்றும் டிஜிட்டல் கையொப்பங்களை நிர்வகிக்கவும்."
                : "Manage official seals and authorized officer digital signatures used for automated PDF certificate issuance across all Tamil Nadu districts."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => load()}
              title={isTa ? "கையொப்ப பட்டியலை புதுப்பி" : "Refresh signature list"}
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 cursor-pointer"
            >
              <RefreshCw size={16} className={loading ? "animate-spin text-blue-600" : ""} />
              {isTa ? "புதுப்பி" : "Refresh"}
            </button>
            <button
              onClick={() => startUpload(undefined, missingDistricts[0] || districts[0])}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#1e3a8a] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-900 cursor-pointer"
            >
              <UploadCloud size={18} />
              {isTa ? "கையொப்பத்தை பதிவேற்றவும்" : "Upload Signature"}
            </button>
          </div>
        </div>

        {/* Highlight KPI Stat Cards */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Main Stat Card */}
          <div className="relative overflow-hidden rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/40 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                {isTa ? "கையொப்பங்களின் நிலை" : "Signatures Status"}
              </span>
              <span className="rounded-full bg-emerald-600/10 p-2 text-emerald-700">
                <FileCheck size={20} />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-emerald-950">
                {presentCount} / {districts.length || 38}
              </span>
              <span className="text-sm font-bold text-emerald-700">
                {isTa ? "மாவட்டங்கள்" : "Districts"}
              </span>
            </div>
            <p className="mt-1.5 text-xs font-semibold text-emerald-800">
              {isTa
                ? `✓ ${districts.length || 38} மாவட்டங்களில் ${presentCount} மாவட்டங்கள் பிடிஎஃப் முத்திரையிட தயார்`
                : `✓ ${presentCount} of ${districts.length || 38} districts (sign are present) ready for PDF stamping`}
            </p>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-emerald-100">
              <div
                className="h-full rounded-full bg-emerald-600 transition-all duration-500"
                style={{
                  width: `${districts.length ? Math.round((presentCount / districts.length) * 100) : 84}%`,
                }}
              />
            </div>
          </div>

          {/* Pending Signatures Card */}
          <div
            onClick={() => setFilterTab("missing")}
            className="cursor-pointer rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50/80 via-white to-amber-50/30 p-5 shadow-sm transition hover:border-amber-300"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                {isTa ? "நடவடிக்கை தேவை" : "Action Required"}
              </span>
              <span className="rounded-full bg-amber-600/10 p-2 text-amber-700">
                <AlertTriangle size={20} />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-amber-950">
                {missingDistricts.length}
              </span>
              <span className="text-sm font-semibold text-amber-700">
                {isTa ? "நிலுவையில் உள்ள மாவட்டங்கள்" : "Districts Pending"}
              </span>
            </div>
            <p className="mt-1.5 text-xs text-amber-800 line-clamp-1">
              {missingDistricts.length > 0
                ? missingDistricts.map((d) => (isTa && d.nameTa ? d.nameTa : d.name)).join(", ")
                : isTa
                ? "அனைத்து மாவட்டங்களுக்கும் கையொப்பங்கள் பதிவேற்றப்பட்டுள்ளன"
                : "All districts have signatures uploaded"}
            </p>
            <span className="mt-2 inline-block text-[11px] font-bold text-amber-700 underline">
              {isTa ? "நிலுவையில் உள்ள மாவட்டங்களைக் காண கிளிக் செய்க →" : "Click to view pending districts →"}
            </span>
          </div>

          {/* Integration Card */}
          <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50/80 via-white to-blue-50/30 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-800">
                {isTa ? "பயிலக சரிபார்ப்பு" : "Studio Verification"}
              </span>
              <span className="rounded-full bg-blue-600/10 p-2 text-blue-700">
                <Building2 size={20} />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-blue-950">100%</span>
              <span className="text-sm font-semibold text-blue-700">
                {isTa ? "தானியங்கி பாதுகாப்பு" : "Automated Protection"}
              </span>
            </div>
            <p className="mt-1.5 text-xs text-blue-800">
              {isTa
                ? "செல்லுபடியாகாத வெற்றுக் கோப்புகள் வழங்கப்படுவதைத் தடுக்க, கையொப்பமில்லாத மாவட்டங்கள் தானாக முடக்கப்படும்."
                : "Unsigned districts are automatically turned off in services to prevent issuing invalid blank documents."}
            </p>
          </div>
        </div>

        {/* Alerts */}
        {successMsg && (
          <div className="mt-5 flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
        {error && (
          <div className="mt-5 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
            <AlertTriangle size={18} className="text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Filter and Search Bar */}
        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Tabs */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
            <button
              onClick={() => setFilterTab("all")}
              className={`rounded-md px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                filterTab === "all"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {isTa ? `அனைத்து மாவட்டங்கள் (${districts.length})` : `All Districts (${districts.length})`}
            </button>
            <button
              onClick={() => setFilterTab("present")}
              className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                filterTab === "present"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-emerald-700 hover:bg-emerald-50"
              }`}
            >
              <span>{isTa ? "கையொப்பம் உள்ளவை" : "Signatures Present"}</span>
              <span className="rounded-full bg-emerald-700/30 px-1.5 py-0.2 text-[10px] text-white">
                {presentCount}
              </span>
            </button>
            <button
              onClick={() => setFilterTab("missing")}
              className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                filterTab === "missing"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-amber-700 hover:bg-amber-50"
              }`}
            >
              <span>{isTa ? "கையொப்பம் இல்லாதவை" : "Missing Signatures"}</span>
              <span className="rounded-full bg-amber-700/30 px-1.5 py-0.2 text-[10px] text-white">
                {missingDistricts.length}
              </span>
            </button>
          </div>

          {/* Search box */}
          <div className="relative w-full max-w-sm">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isTa ? "மாவட்டத்தை ஆங்கிலம் அல்லது தமிழில் தேடுக..." : "Search district in English or தமிழ்..."}
              className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 bg-white"
            />
          </div>
        </div>

        {/* Table of Districts */}
        <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
          <div className="overflow-x-auto w-full scrollbar-thin">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="px-4 py-3.5 text-center w-12 whitespace-nowrap">#</th>
                  <th className="px-5 py-3.5 whitespace-nowrap min-w-[150px]">
                    {isTa ? "மாவட்ட பெயர் (District)" : "District Name"}
                  </th>
                  <th className="px-5 py-3.5 whitespace-nowrap">
                    {isTa ? "தமிழ் பெயர் (Tamil Name)" : "Tamil Name"}
                  </th>
                  <th className="px-5 py-3.5 text-center whitespace-nowrap">
                    {isTa ? "அதிகாரப்பூர்வ கையொப்ப படம்" : "Authorized Signature Image"}
                  </th>
                  <th className="px-5 py-3.5 whitespace-nowrap min-w-[180px]">
                    {isTa ? "அதிகாரி / பதவி" : "Officer / Authority"}
                  </th>
                  <th className="px-4 py-3.5 text-center whitespace-nowrap">
                    {isTa ? "நிலை" : "Status"}
                  </th>
                  <th className="px-5 py-3.5 text-right whitespace-nowrap min-w-[160px]">
                    {isTa ? "செயல்கள்" : "Actions"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {rows.map(({ district, signature, isPresent }, index) => (
                  <tr
                    key={district.id}
                    className={`transition ${
                      isPresent ? "hover:bg-slate-50/80" : "bg-amber-50/30 hover:bg-amber-50/60"
                    }`}
                  >
                    <td className="px-4 py-3 text-center text-xs font-medium text-slate-400 whitespace-nowrap">
                      {index + 1}
                    </td>
                    <td className="px-5 py-3 font-bold text-slate-900 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span>{district.name}</span>
                        <span className="text-[10px] font-mono text-slate-400">#{district.id}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-700 whitespace-nowrap">
                      {district.nameTa || "—"}
                    </td>
                    <td className="px-5 py-3 text-center whitespace-nowrap">
                      {signature?.storageKey ? (
                        <div
                          onClick={() => setPreview({ signature, district })}
                          className="group mx-auto flex h-12 w-36 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white p-1 shadow-sm transition hover:border-blue-400 hover:shadow"
                          title={isTa ? "முழு கையொப்பத்தைக் காண கிளிக் செய்க" : "Click to preview full signature"}
                        >
                          <img
                            src={signature.storageKey}
                            alt={`${district.name} signature`}
                            className="max-h-10 max-w-full object-contain transition group-hover:scale-105"
                          />
                        </div>
                      ) : (
                        <div className="mx-auto flex h-12 w-36 items-center justify-center rounded-lg border border-dashed border-amber-300 bg-amber-50/50 p-1 text-[11px] font-semibold text-amber-700">
                          {isTa ? "கையொப்பம் இல்லை" : "No Signature"}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap min-w-[180px]">
                      {signature ? (
                        <div>
                          <p className="font-semibold text-slate-800 text-xs">
                            {signature.officerName || (isTa ? "மாவட்ட தொழிலாளர் அலுவலர்" : "District Labour Officer")}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {signature.designation || (isTa ? "அங்கீகரிக்கப்பட்ட கையொப்பமிடுபவர்" : "Authorized Signatory")}
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">
                          {isTa ? "அமைக்கப்படவில்லை" : "Not configured"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {isPresent ? (
                        <span className="shrink-0 whitespace-nowrap inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                          <CheckCircle2 size={12} className="text-emerald-600" />
                          {isTa ? "உள்ளது (தயார்)" : "Present (Ready)"}
                        </span>
                      ) : (
                        <span className="shrink-0 whitespace-nowrap inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">
                          <AlertTriangle size={12} className="text-amber-600" />
                          {isTa ? "இல்லை (முடக்கப்பட்டுள்ளது)" : "Offline (Turned Off)"}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap min-w-[160px]">
                      {signature ? (
                        <div className="flex items-center justify-end gap-1 flex-nowrap">
                          <button
                            onClick={() => setPreview({ signature, district })}
                            aria-label={`View ${district.name} signature`}
                            title={isTa ? "கையொப்பத்தைக் காண்க" : "Preview signature"}
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-blue-50 hover:text-blue-700 shrink-0 cursor-pointer"
                          >
                            <Eye size={16} />
                          </button>
                          <a
                            href={signature.storageKey}
                            download={`${district.name}_signature`}
                            title={isTa ? "கையொப்ப கோப்பை பதிவிறக்குக" : "Download signature file"}
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 shrink-0"
                          >
                            <Download size={16} />
                          </a>
                          <button
                            onClick={() => startUpload(signature, district)}
                            aria-label={`Replace ${district.name} signature`}
                            title={isTa ? "கையொப்பத்தை மாற்றவும்" : "Replace / Update signature"}
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-blue-50 hover:text-blue-700 shrink-0 cursor-pointer"
                          >
                            <FilePenLine size={16} />
                          </button>
                          <button
                            onClick={() => remove(signature, district.name)}
                            aria-label={`Delete ${district.name} signature`}
                            title={isTa ? "கையொப்பத்தை நீக்கு" : "Delete signature"}
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-700 shrink-0 cursor-pointer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startUpload(undefined, district)}
                          className="shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-[#1e3a8a] transition hover:bg-blue-100 cursor-pointer"
                        >
                          <ImagePlus size={14} />
                          {isTa ? "முத்திரையை பதிவேற்றவும்" : "Upload Stamp"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}

                {!rows.length && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                      {isTa ? "வடிகட்டலுக்கு பொருந்தக்கூடிய மாவட்டங்கள் எதுவும் கிடைக்கவில்லை." : "No matching districts found for filter."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Upload & Edit Modal */}
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <form
            onSubmit={submit}
            className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editing
                    ? isTa
                      ? "மாவட்ட கையொப்பத்தைப் புதுப்பிக்கவும்"
                      : "Update District Signature"
                    : isTa
                    ? "புதிய மாவட்ட கையொப்ப முத்திரையைப் பதிவேற்றவும்"
                    : "Upload District Signature Stamp"}
                </h2>
                <p className="text-xs text-slate-500">
                  {isTa
                    ? "தானியங்கி பிடிஎஃப் சான்றிதழ் உருவாக்கத்திற்கான டிஜிட்டல் கையொப்ப படத்தை சேமிக்கிறது"
                    : "Saves digital signature image for automated PDF certificate placement"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 p-6">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                  {error}
                </div>
              )}

              <label className="block text-sm font-bold text-slate-800">
                {isTa ? "மாவட்டம்" : "District"} <span className="text-red-500">*</span>
                <select
                  value={districtId}
                  onChange={(e) => setDistrictId(e.target.value)}
                  disabled={Boolean(editing)}
                  required
                  className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 font-medium text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                >
                  <option value="">{isTa ? "மாவட்டத்தைத் தேர்ந்தெடுக்கவும்" : "Select District"}</option>
                  {districts.map((district) => (
                    <option key={district.id} value={district.id}>
                      {district.name} {district.nameTa ? `(${district.nameTa})` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-bold text-slate-800">
                {isTa ? "அங்கீகரிக்கப்பட்ட அதிகாரி பெயர்" : "Authorized Officer Name"}
                <input
                  value={officerName}
                  onChange={(e) => setOfficerName(e.target.value)}
                  placeholder={isTa ? "எ.கா. திரு. மா. செந்தில் குமார், இ.ஆ.ப." : "e.g. Thiru. M. Senthil Kumar, IAS"}
                  className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3 font-medium text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="block text-sm font-bold text-slate-800">
                {isTa ? "பதவி / அலுவலகம்" : "Designation / Office"}
                <input
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder={isTa ? "எ.கா. இணை ஆணையாளர், தொழிலாளர் துறை" : "e.g. Joint Commissioner of Labour"}
                  className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3 font-medium text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <div className="block text-sm font-bold text-slate-800">
                {isTa ? "கையொப்ப படக் கோப்பு" : "Signature Image File"} {!editing && <span className="text-red-500">*</span>}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => {
                    const selected = e.target.files?.[0] || null;
                    setFile(selected);
                    setPreviewUrl(selected ? URL.createObjectURL(selected) : editing?.storageKey || "");
                  }}
                  required={!editing}
                  className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-xs font-normal file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-[#1e3a8a] hover:file:bg-blue-100"
                />
                <span className="mt-1 block text-xs font-normal text-slate-500">
                  {isTa
                    ? "தெளிவான பின்னணி இல்லாத பிஎன்ஜி (PNG) அல்லது வெள்ளை பின்னணியில் ஸ்கேன் செய்யப்பட்டது (10 எம்பி வரை)."
                    : "Clear transparent PNG or scan on white background (up to 10 MB)."}
                </span>
                {previewUrl && (
                  <div className="mt-3 flex min-h-28 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
                    <img
                      src={previewUrl}
                      alt="Signature Preview"
                      className="max-h-24 max-w-full object-contain"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200/60 cursor-pointer"
              >
                {isTa ? "ரத்துசெய்" : "Cancel"}
              </button>
              <button
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-lg bg-[#1e3a8a] px-5 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-900 disabled:opacity-50 cursor-pointer"
              >
                {busy ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    {isTa ? "சேமிக்கிறது..." : "Saving..."}
                  </>
                ) : isTa ? (
                  "கையொப்பத்தை சேமி"
                ) : (
                  "Save Signature"
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Full-Resolution Signature Preview Modal */}
      {preview && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/75 p-4 backdrop-blur-sm"
          onClick={() => setPreview(null)}
        >
          <div
            className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-6 py-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {preview.district.name} {preview.district.nameTa ? `(${preview.district.nameTa})` : ""} {isTa ? "அதிகாரப்பூர்வ கையொப்ப முத்திரை" : "Official Signature Stamp"}
                </h3>
                <p className="text-xs text-slate-500">
                  {preview.district.nameTa || "Tamil Nadu / தமிழ்நாடு"} • ID: {preview.district.id}
                </p>
              </div>
              <button
                onClick={() => setPreview(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              <div className="flex min-h-48 items-center justify-center rounded-xl border border-slate-200 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:12px_12px] p-6">
                <img
                  src={preview.signature.storageKey}
                  alt={`${preview.district.name} signature stamp`}
                  className="max-h-64 max-w-full object-contain drop-shadow"
                />
              </div>

              <div className="mt-4 rounded-lg bg-slate-50 p-4 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="font-bold text-slate-500">{isTa ? "அதிகாரி பெயர்:" : "Officer Name:"}</span>
                    <p className="font-semibold text-slate-900">
                      {preview.signature.officerName || (isTa ? "மாவட்ட தொழிலாளர் அலுவலர்" : "District Labour Officer")}
                    </p>
                  </div>
                  <div>
                    <span className="font-bold text-slate-500">{isTa ? "பதவி:" : "Designation:"}</span>
                    <p className="font-semibold text-slate-900">
                      {preview.signature.designation || (isTa ? "அங்கீகரிக்கப்பட்ட கையொப்பமிடுபவர்" : "Authorized Signatory")}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span className="font-bold text-slate-500">{isTa ? "சேமிப்பகப் பாதை:" : "Storage Path:"}</span>
                    <p className="font-mono text-[11px] text-slate-600 truncate">
                      {preview.signature.storageKey}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  const targetDist = preview.district;
                  const targetSig = preview.signature;
                  setPreview(null);
                  startUpload(targetSig, targetDist);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 cursor-pointer"
              >
                <FilePenLine size={14} /> {isTa ? "முத்திரையை மாற்றவும்" : "Replace Stamp"}
              </button>
              <a
                href={preview.signature.storageKey}
                download={`${preview.district.name}_signature`}
                className="inline-flex items-center gap-2 rounded-lg bg-[#1e3a8a] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-900"
              >
                <Download size={14} /> {isTa ? "முத்திரைப் படத்தை பதிவிறக்குக" : "Download Stamp Image"}
              </a>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
