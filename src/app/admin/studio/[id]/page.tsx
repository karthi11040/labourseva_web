"use client";

import React, { useState, useEffect, useMemo, useRef, Suspense } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Monitor,
  Smartphone,
  Sliders,
  CheckCircle2,
  Trash2,
  Copy,
  RotateCcw,
  RotateCw,
  Plus,
  X,
  ChevronDown,
  MapPin,
  Calendar,
  User,
  Phone,
  Mail,
  Hash,
  Upload,
  FileText,
  CheckSquare,
  CircleDot,
  ShieldCheck,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Folder,
  Info,
  Check,
  Save,
  ArrowLeft,
  Sparkles,
  Cloud,
  History,
  Layers,
  ExternalLink,
  Clock,
} from "lucide-react";

export type StudioFieldType =
  | "text"
  | "name"
  | "phone"
  | "email"
  | "number"
  | "file"
  | "date"
  | "select"
  | "radio"
  | "checkbox"
  | "location";

export interface StudioFormField {
  key: string;
  fieldId: string;
  id?: number;
  type: StudioFieldType;
  name: string;
  required: boolean;
  options: string;
  placeholder?: string;
  helpText?: string;
  validation?: string;
  width?: "full" | "half";
  section?: string;
}

interface MainCategory {
  id: number;
  name: string;
  children: { id: number; name: string }[];
}

interface PanchayathItem {
  id: number;
  name: string;
  nameTa?: string | null;
}

interface TalukItem {
  id: number;
  name: string;
  nameTa?: string | null;
  panchayaths: PanchayathItem[];
}

interface DistrictItem {
  id: number;
  name: string;
  nameTa?: string | null;
  taluks: TalukItem[];
}

interface SavedSessionMeta {
  id: string;
  name: string;
  fieldCount: number;
  updatedAt: number;
}

// Fallback Tamil Nadu districts & taluks to guarantee immediate availability
const FALLBACK_TN_GEOGRAPHY: DistrictItem[] = [
  {
    id: 1,
    name: "Ariyalur",
    nameTa: "அரியலூர்",
    taluks: [
      {
        id: 101,
        name: "Ariyalur",
        nameTa: "அரியலூர்",
        panchayaths: [
          { id: 1001, name: "Alagapuram", nameTa: "அழகபுரம்" },
          { id: 1002, name: "Hastinapuram", nameTa: "ஹஸ்தினாபுரம்" },
          { id: 1003, name: "Kallankurichi", nameTa: "கல்லங்குறிச்சி" },
        ],
      },
      {
        id: 102,
        name: "Sendurai",
        nameTa: "செந்துறை",
        panchayaths: [
          { id: 1004, name: "Asaveerankudikadu", nameTa: "அசவீரன்குடிகாடு" },
          { id: 1005, name: "Irumpulikurichi", nameTa: "இரும்புலிக்குறிச்சி" },
        ],
      },
      {
        id: 103,
        name: "Udayarpalayam",
        nameTa: "உடையார்பாளையம்",
        panchayaths: [
          { id: 1006, name: "Anaikudam", nameTa: "ஆனைக்குடம்" },
          { id: 1007, name: "Jayankondam Urban", nameTa: "ஜெயங்கொண்டம்" },
        ],
      },
    ],
  },
  {
    id: 2,
    name: "Chennai",
    nameTa: "சென்னை",
    taluks: [
      {
        id: 201,
        name: "Egmore",
        nameTa: "எழும்பூர்",
        panchayaths: [
          { id: 2001, name: "Egmore Ward 104", nameTa: "எழும்பூர் வார்டு 104" },
          { id: 2002, name: "Chetpet Ward 105", nameTa: "சேத்துப்பட்டு வார்டு 105" },
        ],
      },
      {
        id: 202,
        name: "Guindy",
        nameTa: "கிண்டி",
        panchayaths: [
          { id: 2003, name: "Guindy Industrial Ward 168", nameTa: "கிண்டி வார்டு 168" },
          { id: 2004, name: "Alandur Ward 160", nameTa: "ஆலந்தூர் வார்டு 160" },
        ],
      },
      {
        id: 203,
        name: "Mylapore",
        nameTa: "மயிலாப்பூர்",
        panchayaths: [
          { id: 2005, name: "Mandaveli Ward 124", nameTa: "மந்தவெளி வார்டு 124" },
          { id: 2006, name: "Santhome Ward 125", nameTa: "சாந்தோம் வார்டு 125" },
        ],
      },
      {
        id: 204,
        name: "Tondiarpet",
        nameTa: "தண்டையார்பேட்டை",
        panchayaths: [
          { id: 2007, name: "Royapuram Ward 50", nameTa: "ராயபுரம் வார்டு 50" },
          { id: 2008, name: "Vyasarpadi Ward 35", nameTa: "வியாசர்பாடி வார்டு 35" },
        ],
      },
    ],
  },
  {
    id: 3,
    name: "Coimbatore",
    nameTa: "கோயம்புத்தூர்",
    taluks: [
      {
        id: 301,
        name: "Coimbatore North",
        nameTa: "கோயம்புத்தூர் வடக்கு",
        panchayaths: [
          { id: 3001, name: "Ganapathy Urban", nameTa: "கணபதி" },
          { id: 3002, name: "Saravanampatti", nameTa: "சரவணம்பட்டி" },
        ],
      },
      {
        id: 302,
        name: "Coimbatore South",
        nameTa: "கோயம்புத்தூர் தெற்கு",
        panchayaths: [
          { id: 3003, name: "Ramanathapuram", nameTa: "ராமநாதபுரம்" },
          { id: 3004, name: "Singanallur", nameTa: "சிங்காநல்லூர்" },
        ],
      },
      {
        id: 303,
        name: "Pollachi",
        nameTa: "பொள்ளாச்சி",
        panchayaths: [
          { id: 3005, name: "Anamalai", nameTa: "ஆனைமலை" },
          { id: 3006, name: "Kottur", nameTa: "கோட்டூர்" },
        ],
      },
    ],
  },
  {
    id: 4,
    name: "Madurai",
    nameTa: "மதுரை",
    taluks: [
      {
        id: 401,
        name: "Madurai North",
        nameTa: "மதுரை வடக்கு",
        panchayaths: [
          { id: 4001, name: "Goripalayam", nameTa: "கோரிப்பாளையம்" },
          { id: 4002, name: "Koodal Nagar", nameTa: "கூடல் நகர்" },
        ],
      },
      {
        id: 402,
        name: "Madurai South",
        nameTa: "மதுரை தெற்கு",
        panchayaths: [
          { id: 4003, name: "Avaniapuram", nameTa: "அவனியாபுரம்" },
          { id: 4004, name: "Thiruparankundram", nameTa: "திருப்பரங்குன்றம்" },
        ],
      },
      {
        id: 403,
        name: "Melur",
        nameTa: "மேலூர்",
        panchayaths: [
          { id: 4005, name: "Attapatti", nameTa: "அட்டப்பட்டி" },
          { id: 4006, name: "Vellalur", nameTa: "வெள்ளலூர்" },
        ],
      },
    ],
  },
  {
    id: 5,
    name: "Salem",
    nameTa: "சேலம்",
    taluks: [
      {
        id: 501,
        name: "Salem",
        nameTa: "சேலம்",
        panchayaths: [
          { id: 5001, name: "Alagapuram Ward 12", nameTa: "அழகபுரம் வார்டு 12" },
          { id: 5002, name: "Hasthampatti", nameTa: "அஸ்தம்பட்டி" },
        ],
      },
      {
        id: 502,
        name: "Attur",
        nameTa: "ஆத்தூர்",
        panchayaths: [
          { id: 5003, name: "Kallanatham", nameTa: "கல்லாநத்தம்" },
          { id: 5004, name: "Manivilundan", nameTa: "மணிவிழுந்தான்" },
        ],
      },
      {
        id: 503,
        name: "Mettur",
        nameTa: "மேட்டூர்",
        panchayaths: [
          { id: 5005, name: "Kolathur", nameTa: "கொளத்தூர்" },
          { id: 5006, name: "Mecheri", nameTa: "மேச்சேரி" },
        ],
      },
    ],
  },
  {
    id: 6,
    name: "Tiruchirappalli",
    nameTa: "திருச்சிராப்பள்ளி",
    taluks: [
      {
        id: 601,
        name: "Tiruchirappalli East",
        nameTa: "திருச்சிராப்பள்ளி கிழக்கு",
        panchayaths: [
          { id: 6001, name: "Palakkarai", nameTa: "பாலக்கரை" },
          { id: 6002, name: "Ponmalai", nameTa: "பொன்மலை" },
        ],
      },
      {
        id: 602,
        name: "Srirangam",
        nameTa: "ஸ்ரீரங்கம்",
        panchayaths: [
          { id: 6003, name: "Thiruvanai Kovil", nameTa: "திருவானைக்கோவில்" },
          { id: 6004, name: "Manganallur", nameTa: "மங்கநல்லூர்" },
        ],
      },
    ],
  },
];

const PALETTE_DEFINITIONS: Array<{
  type: StudioFieldType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultName: string;
  defaultPlaceholder: string;
  defaultHelp: string;
  defaultValidation: string;
  defaultWidth: "full" | "half";
}> = [
  {
    type: "text",
    label: "Text Field",
    icon: FileText,
    defaultName: "Additional Notes",
    defaultPlaceholder: "Enter specific requests or remarks...",
    defaultHelp: "Optional notes for the verification desk.",
    defaultValidation: "none",
    defaultWidth: "full",
  },
  {
    type: "name",
    label: "Full Name",
    icon: User,
    defaultName: "Applicant Full Name",
    defaultPlaceholder: "Enter full name as per Aadhaar",
    defaultHelp: "Name should match government identity cards exactly.",
    defaultValidation: "letters_only",
    defaultWidth: "full",
  },
  {
    type: "phone",
    label: "Mobile Phone",
    icon: Phone,
    defaultName: "Primary Mobile Number",
    defaultPlaceholder: "+91 98765 43210",
    defaultHelp: "Used for OTP verification and status updates.",
    defaultValidation: "indian_phone",
    defaultWidth: "full",
  },
  {
    type: "email",
    label: "Email Address",
    icon: Mail,
    defaultName: "Email Address",
    defaultPlaceholder: "applicant@example.gov.in",
    defaultHelp: "E-acknowledgment and digital certificate will be emailed.",
    defaultValidation: "email",
    defaultWidth: "half",
  },
  {
    type: "number",
    label: "Number / ID",
    icon: Hash,
    defaultName: "Aadhaar / Smart Card Number",
    defaultPlaceholder: "XXXX - XXXX - XXXX",
    defaultHelp: "Enter 12-digit Aadhaar or registered family ration card number.",
    defaultValidation: "aadhaar",
    defaultWidth: "half",
  },
  {
    type: "file",
    label: "Doc Upload",
    icon: Upload,
    defaultName: "ID Proof Document",
    defaultPlaceholder: "pdf, jpg, png (Max 5MB)",
    defaultHelp: "Upload scanned copy of Aadhaar card, Ration card, or Voter ID.",
    defaultValidation: "doc_upload",
    defaultWidth: "full",
  },
  {
    type: "date",
    label: "Date Picker",
    icon: Calendar,
    defaultName: "Date of Birth",
    defaultPlaceholder: "mm/dd/yyyy",
    defaultHelp: "Date as recorded in official educational or revenue records.",
    defaultValidation: "date",
    defaultWidth: "full",
  },
  {
    type: "select",
    label: "Dropdown",
    icon: ChevronDown,
    defaultName: "Community Category",
    defaultPlaceholder: "Select community / category...",
    defaultHelp: "Choose government welfare category for fee concession.",
    defaultValidation: "none",
    defaultWidth: "full",
  },
  {
    type: "radio",
    label: "Radio Choice",
    icon: CircleDot,
    defaultName: "Gender",
    defaultPlaceholder: "Male, Female, Transgender",
    defaultHelp: "Select applicable demographic option.",
    defaultValidation: "none",
    defaultWidth: "full",
  },
  {
    type: "checkbox",
    label: "Checkbox",
    icon: CheckSquare,
    defaultName: "Citizen Declaration",
    defaultPlaceholder: "I confirm all information furnished above is genuine.",
    defaultHelp: "Statutory declaration under TN e-Governance Act.",
    defaultValidation: "none",
    defaultWidth: "full",
  },
  {
    type: "location",
    label: "TN Location",
    icon: MapPin,
    defaultName: "Jurisdiction",
    defaultPlaceholder: "Select administrative jurisdiction...",
    defaultHelp: "Select your district, taluk, or panchayat.",
    defaultValidation: "tn_location",
    defaultWidth: "full",
  },
];

let fieldCounter = 30;
const generateFieldId = (type: StudioFieldType): string => {
  fieldCounter++;
  const prefixMap: Record<StudioFieldType, string> = {
    phone: "fld_mobile",
    name: "fld_name",
    location: "fld_jurisdiction",
    date: "fld_dob",
    file: "fld_proof",
    text: "fld_notes",
    email: "fld_email",
    number: "fld_num",
    select: "fld_select",
    radio: "fld_radio",
    checkbox: "fld_agree",
  };
  const prefix = prefixMap[type] || "fld";
  return `${prefix}_${String(fieldCounter).padStart(2, "0")}`;
};

const createFieldFromPalette = (type: StudioFieldType): StudioFormField => {
  const def = PALETTE_DEFINITIONS.find((p) => p.type === type) || PALETTE_DEFINITIONS[0];
  return {
    key: `f_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    fieldId: generateFieldId(type),
    type,
    name: def.defaultName,
    required: true,
    options:
      type === "select"
        ? "General (OC), Backward Class (BC), Most Backward (MBC), Scheduled Caste (SC), Scheduled Tribe (ST)"
        : type === "radio"
        ? "Male, Female, Transgender"
        : type === "file"
        ? "pdf, jpg, png"
        : "",
    placeholder: def.defaultPlaceholder,
    helpText: def.defaultHelp,
    validation: def.defaultValidation,
    width: def.defaultWidth,
    section: "General Information",
  };
};

export default function StandaloneStudioRoutePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center text-slate-800 space-y-2">
          <div className="w-8 h-8 rounded-full border-2 border-violet-600 border-t-transparent animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Initializing FormStudio Session...</p>
        </div>
      }
    >
      <StudioContent />
    </Suspense>
  );
}

function StudioContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  // Extract session / service id from route param or query
  const rawParamId = (params?.id as string) || "";
  const matchedServiceNum = rawParamId.replace(/^service[_-]?/i, "");
  const serviceIdParam = searchParams.get("service_id") || (/^\d+$/.test(matchedServiceNum) ? matchedServiceNum : null);
  const mainCatParam = searchParams.get("main_id");
  const subCatParam = searchParams.get("sub_id");

  const sessionId = useMemo(() => {
    return rawParamId || `service_${serviceIdParam || Date.now().toString(36)}`;
  }, [rawParamId, serviceIdParam]);

  const storageKey = `formstudio_session_${sessionId}`;

  const [categories, setCategories] = useState<MainCategory[]>([]);
  const [districtsData, setDistrictsData] = useState<DistrictItem[]>(FALLBACK_TN_GEOGRAPHY);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Auto-Save States: "saved" | "ready"
  const [autoSaveStatus, setAutoSaveStatus] = useState<"saved" | "ready">("ready");
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [recentSessions, setRecentSessions] = useState<SavedSessionMeta[]>([]);

  const [deviceView, setDeviceView] = useState<"desktop" | "mobile">("desktop");
  const [selectedFieldKey, setSelectedFieldKey] = useState<string | null>(null);
  const [showServiceSettingsModal, setShowServiceSettingsModal] = useState(false);

  // Drag and drop states for Field Ordering
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // Cascading location state for preview simulation
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>("");
  const [selectedTalukId, setSelectedTalukId] = useState<string>("");
  const [selectedPanchayathId, setSelectedPanchayathId] = useState<string>("");

  const [formState, setFormState] = useState({
    id: serviceIdParam ? Number(serviceIdParam) : null,
    name: "LabourSeva Application",
    cost: "0",
    mainCategoryId: mainCatParam || "",
    subCategoryId: subCatParam || "",
    details:
      "Complete the details below to apply for a service under the Labour Welfare Department. All marked fields are mandatory.",
    iconKey: "Layers",
    active: true,
    fields: [] as StudioFormField[],
  });

  // Undo / Redo History Stacks ("Do and Undo Operation")
  const [history, setHistory] = useState<Array<typeof formState>>([]);
  const [future, setFuture] = useState<Array<typeof formState>>([]);

  const isInitialLoad = useRef(true);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Push snapshot to history stack before making any change
  const pushHistorySnapshot = (currentState: typeof formState) => {
    setHistory((prev) => [...prev.slice(-50), JSON.parse(JSON.stringify(currentState))]);
    setFuture([]); // clear redo stack on new action
  };

  // Undo Operation (Ctrl+Z)
  const handleUndo = () => {
    if (history.length === 0) return;
    const previousState = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setFuture((prev) => [JSON.parse(JSON.stringify(formState)), ...prev]);
    setFormState(previousState);
    showToast(`Undo applied (${history.length - 1} steps left)`);
  };

  // Redo / "Do" Operation (Ctrl+Y)
  const handleRedo = () => {
    if (future.length === 0) return;
    const nextState = future[0];
    setFuture((prev) => prev.slice(1));
    setHistory((prev) => [...prev, JSON.parse(JSON.stringify(formState))]);
    setFormState(nextState);
    showToast(`Redo applied (${future.length - 1} steps remaining)`);
  };

  // Keyboard shortcut listener for Ctrl+Z and Ctrl+Y
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      const isInput =
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.isContentEditable);

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
        if (!isInput) {
          e.preventDefault();
          handleUndo();
        }
      } else if (
        (e.ctrlKey || e.metaKey) &&
        (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))
      ) {
        if (!isInput) {
          e.preventDefault();
          handleRedo();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [history, future, formState]);

  // Load geography, service catalog, and cached session
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);

        // Load recent sessions index from localStorage
        try {
          const rawIndex = localStorage.getItem("formstudio_session_index");
          if (rawIndex) {
            setRecentSessions(JSON.parse(rawIndex));
          }
        } catch {}

        const [catRes, geoRes, svcRes] = await Promise.all([
          fetch("/api/admin/es-categories").then((r) => r.json()).catch(() => ({ ok: false })),
          fetch("/api/admin/geography/import").then((r) => r.json()).catch(() => ({ districts: [] })),
          serviceIdParam
            ? fetch(`/api/admin/es-services`).then((r) => r.json()).catch(() => null)
            : Promise.resolve(null),
        ]);

        if (catRes.ok && Array.isArray(catRes.categories)) {
          setCategories(catRes.categories);
        }

        if (geoRes?.districts && Array.isArray(geoRes.districts) && geoRes.districts.length > 0) {
          setDistrictsData(geoRes.districts);
        }

        // Check for saved session in localStorage OR sessionStorage
        let cachedSession: any = null;
        try {
          const rawLocal = localStorage.getItem(storageKey);
          const rawSession = sessionStorage.getItem(storageKey);
          if (rawLocal) cachedSession = JSON.parse(rawLocal);
          else if (rawSession) cachedSession = JSON.parse(rawSession);
        } catch {}

        if (cachedSession && cachedSession.fields && cachedSession.fields.length > 0) {
          setFormState(cachedSession);
          setSelectedFieldKey(cachedSession.fields[0]?.key || null);
          setAutoSaveStatus("saved");
          showToast(`Active session restored (${sessionId})`);
          setLoading(false);
          isInitialLoad.current = false;
          return;
        }

        // If editing an existing service from database
        if (svcRes?.ok && Array.isArray(svcRes.services) && serviceIdParam) {
          const found = svcRes.services.find((s: any) => Number(s.id) === Number(serviceIdParam));
          if (found) {
            const mappedFields: StudioFormField[] = (found.fields || []).map((f: any, idx: number) => ({
              key: f.key || `f_${idx}_${Math.random().toString(36).substring(2, 6)}`,
              fieldId: f.fieldId || `fld_${(f.type || "item").substring(0, 4)}_${String(idx + 1).padStart(2, "0")}`,
              id: f.id,
              type: (f.type as StudioFieldType) || "text",
              name: f.name || "Field Label",
              required: f.required !== false,
              options: f.options || "",
              placeholder: f.placeholder || "",
              helpText: f.helpText || "",
              validation: f.validation || "none",
              width: f.width || "full",
              section: f.section || "General Information",
            }));

            const initialData = {
              id: found.id,
              name: found.name || "LabourSeva Application",
              cost: String(found.cost || 0),
              mainCategoryId: String(found.mainCategoryId || ""),
              subCategoryId: String(found.subCategoryId || ""),
              details:
                found.details ||
                "Complete the details below to apply for a service under the Labour Welfare Department. All marked fields are mandatory.",
              iconKey: found.image || "Layers",
              active: found.active !== false,
              fields: mappedFields,
            };

            setFormState(initialData);
            setSelectedFieldKey(mappedFields[0]?.key || null);
            setLoading(false);
            isInitialLoad.current = false;
            return;
          }
        }

        // Default initial setup matching the user screenshot:
        const initialScreenshotFields: StudioFormField[] = [
          {
            key: "fld_01_name",
            fieldId: "fld_name_01",
            type: "name",
            name: "Applicant Full Name",
            required: true,
            options: "",
            placeholder: "Enter full name as per Aadhaar",
            helpText: "Applicant legal name matching government records.",
            validation: "letters_only",
            width: "full",
            section: "General Information",
          },
          {
            key: "fld_02_phone",
            fieldId: "fld_mobile_02",
            type: "phone",
            name: "Primary Mobile Number",
            required: true,
            options: "",
            placeholder: "+91 98765 43210",
            helpText: "Used for OTP verification and status updates.",
            validation: "indian_phone",
            width: "full",
            section: "General Information",
          },
          {
            key: "fld_03_jurisdiction",
            fieldId: "fld_jurisdiction_03",
            type: "location",
            name: "Jurisdiction",
            required: true,
            options: "",
            placeholder: "Select jurisdiction...",
            helpText: "Select your district, taluk, or panchayat.",
            validation: "tn_location",
            width: "full",
            section: "General Information",
          },
          {
            key: "fld_04_dob",
            fieldId: "fld_dob_04",
            type: "date",
            name: "Date of Birth",
            required: true,
            options: "",
            placeholder: "mm/dd/yyyy",
            helpText: "Date of birth recorded in identity document.",
            validation: "date",
            width: "full",
            section: "General Information",
          },
          {
            key: "fld_05_proof",
            fieldId: "fld_proof_05",
            type: "file",
            name: "ID Proof Document",
            required: true,
            options: "pdf, jpg, png",
            placeholder: "Upload identity document",
            helpText: "Scanned copy of Aadhaar or Family Ration card.",
            validation: "doc_upload",
            width: "full",
            section: "General Information",
          },
          {
            key: "fld_06_notes",
            fieldId: "fld_notes_06",
            type: "text",
            name: "Additional Notes",
            required: false,
            options: "",
            placeholder: "Any additional details or special requests...",
            helpText: "Optional remarks for the processing officer.",
            validation: "none",
            width: "full",
            section: "General Information",
          },
        ];

        setFormState((prev) => ({
          ...prev,
          mainCategoryId: mainCatParam || (catRes.categories?.[0]?.id ? String(catRes.categories[0].id) : "1"),
          subCategoryId: subCatParam || "",
          fields: initialScreenshotFields,
        }));

        setSelectedFieldKey("fld_02_phone");
      } catch {
        showToast("Error loading catalog metadata.");
      } finally {
        setLoading(false);
        isInitialLoad.current = false;
      }
    };

    init();
  }, [sessionId, serviceIdParam, mainCatParam, subCatParam, storageKey]);

  // Prefetch catalog route for instant navigation on publish
  useEffect(() => {
    router.prefetch("/admin/es-services");
  }, [router]);

  // Direct Session Persistence: saves immediately whenever any action or edit is done (no timers)
  const persistSessionState = (stateToSave: typeof formState) => {
    try {
      const payloadStr = JSON.stringify(stateToSave);
      localStorage.setItem(storageKey, payloadStr);
      sessionStorage.setItem(storageKey, payloadStr);

      const newMeta: SavedSessionMeta = {
        id: sessionId,
        name: stateToSave.name || "Untitled Application",
        fieldCount: stateToSave.fields.length,
        updatedAt: Date.now(),
      };

      try {
        const rawIndex = localStorage.getItem("formstudio_session_index");
        const existingList: SavedSessionMeta[] = rawIndex ? JSON.parse(rawIndex) : [];
        const filtered = existingList.filter((s) => s.id !== sessionId);
        const updatedIndex = [newMeta, ...filtered].slice(0, 10);
        localStorage.setItem("formstudio_session_index", JSON.stringify(updatedIndex));
        setRecentSessions(updatedIndex);
      } catch {}

      setAutoSaveStatus("saved");
    } catch {
      setAutoSaveStatus("ready");
    }
  };

  // Whenever any change is completed, immediately persist without timer intervals
  useEffect(() => {
    if (isInitialLoad.current || loading) return;
    persistSessionState(formState);
  }, [formState, storageKey, sessionId, loading]);

  const selectedField = useMemo(() => {
    return formState.fields.find((f) => f.key === selectedFieldKey) || formState.fields[0] || null;
  }, [formState.fields, selectedFieldKey]);

  // Dynamic taluks based on selected district in preview
  const currentDistrictTaluks = useMemo(() => {
    if (!selectedDistrictId) return [];
    const district = districtsData.find((d) => String(d.id) === String(selectedDistrictId));
    return district?.taluks || [];
  }, [districtsData, selectedDistrictId]);

  // Dynamic panchayats based on selected taluk in preview
  const currentTalukPanchayaths = useMemo(() => {
    if (!selectedTalukId) return [];
    const taluk = currentDistrictTaluks.find((t) => String(t.id) === String(selectedTalukId));
    return taluk?.panchayaths || [];
  }, [currentDistrictTaluks, selectedTalukId]);

  const handleAddField = (type: StudioFieldType) => {
    pushHistorySnapshot(formState);
    const newField = createFieldFromPalette(type);
    setFormState((prev) => ({
      ...prev,
      fields: [...prev.fields, newField],
    }));
    setSelectedFieldKey(newField.key);
    showToast(`Added ${newField.name} to form.`);
  };

  const handleUpdateField = (key: string, patch: Partial<StudioFormField>) => {
    pushHistorySnapshot(formState);
    setFormState((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => (f.key === key ? { ...f, ...patch } : f)),
    }));
  };

  // Quick field name editing (inline or via inspector) with history tracking
  const handleRenameField = (key: string, newName: string) => {
    pushHistorySnapshot(formState);
    setFormState((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => (f.key === key ? { ...f, name: newName } : f)),
    }));
  };

  const handleDuplicateField = (field: StudioFormField) => {
    pushHistorySnapshot(formState);
    const duplicated: StudioFormField = {
      ...field,
      key: `f_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      fieldId: generateFieldId(field.type),
      name: `${field.name} (Copy)`,
    };
    const idx = formState.fields.findIndex((f) => f.key === field.key);
    const newFields = [...formState.fields];
    newFields.splice(idx + 1, 0, duplicated);
    setFormState((prev) => ({ ...prev, fields: newFields }));
    setSelectedFieldKey(duplicated.key);
    showToast(`Duplicated ${field.name}`);
  };

  const handleResetField = (field: StudioFormField) => {
    const def = PALETTE_DEFINITIONS.find((p) => p.type === field.type);
    if (!def) return;
    pushHistorySnapshot(formState);
    setFormState((prev) => ({
      ...prev,
      fields: prev.fields.map((f) =>
        f.key === field.key
          ? {
              ...f,
              name: def.defaultName,
              placeholder: def.defaultPlaceholder,
              helpText: def.defaultHelp,
              validation: def.defaultValidation,
              width: def.defaultWidth,
              required: true,
            }
          : f
      ),
    }));
    showToast(`Reset ${field.name} to default`);
  };

  const handleRemoveField = (key: string) => {
    const fieldToRemove = formState.fields.find((f) => f.key === key);
    pushHistorySnapshot(formState);
    setFormState((prev) => {
      const remaining = prev.fields.filter((f) => f.key !== key);
      if (selectedFieldKey === key) {
        setSelectedFieldKey(remaining[0]?.key || null);
      }
      return { ...prev, fields: remaining };
    });
    if (fieldToRemove) {
      showToast(`Removed ${fieldToRemove.name}`);
    }
  };

  // Swap / Move item Up or Down
  const handleMoveField = (idx: number, dir: -1 | 1) => {
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= formState.fields.length) return;
    pushHistorySnapshot(formState);
    setFormState((prev) => {
      const arr = [...prev.fields];
      const [item] = arr.splice(idx, 1);
      arr.splice(targetIdx, 0, item);
      return { ...prev, fields: arr };
    });
  };

  // Drag and drop handlers for Field Ordering
  const handleDragStart = (idx: number) => {
    setDraggedIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragOverIdx !== idx) {
      setDragOverIdx(idx);
    }
  };

  const handleDrop = (targetIdx: number) => {
    if (draggedIdx === null || draggedIdx === targetIdx) {
      setDraggedIdx(null);
      setDragOverIdx(null);
      return;
    }
    pushHistorySnapshot(formState);
    setFormState((prev) => {
      const arr = [...prev.fields];
      const [draggedItem] = arr.splice(draggedIdx, 1);
      arr.splice(targetIdx, 0, draggedItem);
      return { ...prev, fields: arr };
    });
    setDraggedIdx(null);
    setDragOverIdx(null);
    showToast("Reordered field");
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  // Start new form session
  const handleStartNewSession = () => {
    const newSessionId = `service_${Math.random().toString(36).substring(2, 9)}`;
    router.push(`/admin/studio/${newSessionId}`);
    setSessionModalOpen(false);
  };

  // Reset current session draft to template
  const handleResetSessionDraft = () => {
    if (!confirm("Reset all changes in this session draft back to default?")) return;
    try {
      localStorage.removeItem(storageKey);
      sessionStorage.removeItem(storageKey);
    } catch {}
    window.location.reload();
  };

  // Submit and back to previous page
  const handleSaveAndPublish = async () => {
    if (!formState.name.trim()) {
      showToast("Service name is required.");
      setShowServiceSettingsModal(true);
      return;
    }
    if (!formState.mainCategoryId) {
      showToast("Please assign a Category in Service Settings.");
      setShowServiceSettingsModal(true);
      return;
    }
    if (formState.fields.length === 0) {
      showToast("Please add at least one field to publish this form.");
      return;
    }

    try {
      setBusy(true);
      const payload = {
        id: formState.id,
        service_name: formState.name.trim(),
        service_cost: Number(formState.cost || 0),
        main_category_id: Number(formState.mainCategoryId),
        sub_category_id: Number(formState.subCategoryId || 0),
        details: formState.details.trim(),
        service_image: formState.iconKey.trim(),
        active: formState.active,
        fields: formState.fields.map((f, idx) => ({
          name: f.name.trim(),
          type: f.type,
          required: f.required,
          options: f.options?.trim() || "",
          placeholder: f.placeholder?.trim() || "",
          helpText: f.helpText?.trim() || "",
          validation: f.validation || "none",
          width: f.width || "full",
          section: f.section || "General Information",
          sortOrder: idx,
        })),
      };

      const res = await fetch("/api/admin/es-services", {
        method: formState.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to persist service.");
      }

      // Clear local draft upon successful publication
      try {
        localStorage.removeItem(storageKey);
        sessionStorage.removeItem(storageKey);
      } catch {}

      showToast("Form saved and published successfully!");
      router.replace("/admin/es-services");
    } catch (err: any) {
      showToast(err.message || "Failed to publish service.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-white text-slate-800 font-sans antialiased overflow-hidden select-none">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-16 right-6 z-[300] flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-800 shadow-xl transition-all">
          <Info className="w-4 h-4 text-violet-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* TOP BAR */}
      {/* ========================================================= */}
      <header className="h-14 border-b border-slate-200/90 bg-white px-6 flex items-center justify-between shrink-0 z-20">
        {/* Left: Exit Studio + FormStudio Logo & Breadcrumbs */}
        <div className="flex items-center gap-3">
          {/* Back button to return to previous page */}
          <Link
            href="/admin/es-services"
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
            title="Back to Services Catalog"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Back</span>
          </Link>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-600 text-white flex items-center justify-center shadow-xs">
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="font-bold text-slate-900 text-base tracking-tight">FormStudio</span>
          </div>

          <div className="h-4 w-px bg-slate-200 mx-1" />

          {/* Breadcrumb: Forms > LabourSeva Application */}
          <nav className="flex items-center gap-1.5 text-xs">
            <Link
              href="/admin/es-services"
              className="flex items-center gap-1 text-slate-500 hover:text-slate-800 transition-colors font-medium"
            >
              <Folder className="w-3.5 h-3.5 text-slate-400" />
              <span>Forms</span>
            </Link>
            <span className="text-slate-300">›</span>
            <span className="font-semibold text-slate-900 max-w-[160px] truncate">
              {formState.name}
            </span>
          </nav>

          {/* ACTIVE SESSION BADGE */}
          <button
            type="button"
            onClick={() => setSessionModalOpen(true)}
            className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full border transition-all text-[11px] font-semibold bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
            title="Click to view session details and recent drafts"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-mono text-[10px] text-slate-600">
              {sessionId}
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-emerald-700 flex items-center gap-1 font-medium">
              <Check className="w-3 h-3 text-emerald-600" />
              <span>Saved</span>
            </span>
          </button>
        </div>

        {/* Right: Do & Undo + Device Switcher + Service Settings + Save & Publish + User Avatar */}
        <div className="flex items-center gap-2.5">
          {/* UNDO & REDO ("DO AND UNDO OPERATION") */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200/80">
            <button
              type="button"
              onClick={handleUndo}
              disabled={history.length === 0}
              title={`Undo (Ctrl+Z) - ${history.length} steps available`}
              className="px-2 py-1.5 rounded-md text-slate-700 hover:text-slate-950 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition-all flex items-center gap-1 text-[11px] font-bold"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Undo</span>
              {history.length > 0 && (
                <span className="text-[9px] bg-slate-200 px-1 rounded text-slate-600 font-mono">
                  {history.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={future.length === 0}
              title={`Redo / Do (Ctrl+Y) - ${future.length} steps available`}
              className="px-2 py-1.5 rounded-md text-slate-700 hover:text-slate-950 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition-all flex items-center gap-1 text-[11px] font-bold"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Do</span>
              {future.length > 0 && (
                <span className="text-[9px] bg-slate-200 px-1 rounded text-slate-600 font-mono">
                  {future.length}
                </span>
              )}
            </button>
          </div>

          {/* Device Preview Toggle [ Desktop | Mobile ] */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200/80">
            <button
              type="button"
              onClick={() => setDeviceView("desktop")}
              title="Desktop Preview"
              className={`p-1.5 rounded-md transition-all ${
                deviceView === "desktop"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-400 hover:text-slate-700"
              }`}
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setDeviceView("mobile")}
              title="Citizen Mobile Preview"
              className={`p-1.5 rounded-md transition-all ${
                deviceView === "mobile"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-400 hover:text-slate-700"
              }`}
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>

          {/* Service Settings Button */}
          <button
            type="button"
            onClick={() => setShowServiceSettingsModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-500" />
            <span>Service Settings</span>
          </button>

          {/* Save & Publish Button */}
          <button
            type="button"
            onClick={handleSaveAndPublish}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white px-4 py-1.5 text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{busy ? "Publishing..." : "Save & Publish"}</span>
          </button>

          {/* User Profile Avatar */}
          <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 bg-slate-200 flex items-center justify-center shrink-0">
            <span className="text-[11px] font-bold text-slate-600">TN</span>
          </div>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 3-COLUMN STUDIO LAYOUT */}
      {/* ========================================================= */}
      <div className="flex-1 flex overflow-hidden">
        {/* ======================================================= */}
        {/* LEFT COLUMN: COMPONENT PALETTE & FIELD ORDERING */}
        {/* ======================================================= */}
        <aside className="w-64 border-r border-slate-200/90 bg-white flex flex-col shrink-0 overflow-y-auto p-4 space-y-6">
          {/* COMPONENT PALETTE */}
          <div>
            <h2 className="text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-3">
              COMPONENT PALETTE
            </h2>

            {/* 2-Column Grid */}
            <div className="grid grid-cols-2 gap-2">
              {PALETTE_DEFINITIONS.map((item) => {
                const IconComponent = item.icon;
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => handleAddField(item.type)}
                    className="flex items-center gap-2 p-2 rounded-lg border border-slate-200/90 hover:border-violet-300 hover:bg-violet-50/20 text-left transition-all group"
                  >
                    <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-slate-600 group-hover:text-violet-600 group-hover:bg-violet-100/50 shrink-0">
                      <IconComponent className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[11px] font-medium text-slate-700 group-hover:text-violet-900 truncate">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="h-px bg-slate-100" />

          {/* FIELD ORDERING WITH DRAG & DROP + SWAP ARROWS */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                FIELD ORDERING
              </h2>
              <span className="text-[11px] text-slate-400 font-medium">
                {formState.fields.length} fields
              </span>
            </div>

            <div className="space-y-1">
              {formState.fields.map((f, idx) => {
                const isSelected = f.key === selectedFieldKey;
                const def = PALETTE_DEFINITIONS.find((p) => p.type === f.type);
                const IconComponent = def?.icon || FileText;
                const isDraggingThis = draggedIdx === idx;
                const isOverThis = dragOverIdx === idx;

                return (
                  <div
                    key={f.key}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={() => handleDrop(idx)}
                    onDragEnd={handleDragEnd}
                    onClick={() => setSelectedFieldKey(f.key)}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-grab active:cursor-grabbing transition-all text-xs group relative ${
                      isDraggingThis
                        ? "opacity-40 border-2 border-dashed border-violet-400 bg-violet-50/50"
                        : isOverThis
                        ? "border-t-2 border-violet-600 bg-violet-50/40"
                        : isSelected
                        ? "bg-violet-50/70 border border-violet-200/70 text-violet-900 font-semibold shadow-2xs"
                        : "hover:bg-slate-50 text-slate-600 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <GripVertical className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 shrink-0" />
                      <IconComponent
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isSelected ? "text-violet-600" : "text-slate-400"
                        }`}
                      />
                      <span className="truncate text-[11px] flex-1">{f.name}</span>
                    </div>

                    {/* Swap Arrows: Move Up / Move Down */}
                    <div className="flex items-center gap-0.5 shrink-0 ml-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveField(idx, -1);
                        }}
                        disabled={idx === 0}
                        className={`p-1 rounded transition-colors ${
                          isSelected
                            ? "hover:bg-violet-200/60 text-violet-700"
                            : "opacity-0 group-hover:opacity-100 hover:bg-slate-200 text-slate-500"
                        } disabled:opacity-20`}
                        title="Swap Up (Move Up)"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveField(idx, 1);
                        }}
                        disabled={idx === formState.fields.length - 1}
                        className={`p-1 rounded transition-colors ${
                          isSelected
                            ? "hover:bg-violet-200/60 text-violet-700"
                            : "opacity-0 group-hover:opacity-100 hover:bg-slate-200 text-slate-500"
                        } disabled:opacity-20`}
                        title="Swap Down (Move Down)"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* ======================================================= */}
        {/* CENTER CANVAS */}
        {/* ======================================================= */}
        <main
          className="flex-1 overflow-y-auto p-8 flex justify-center relative"
          style={{
            backgroundColor: "#f8fafc",
            backgroundImage: "radial-gradient(#cbd5e1 1.2px, transparent 1.2px)",
            backgroundSize: "20px 20px",
          }}
        >
          <div
            className={`transition-all duration-300 ${
              deviceView === "desktop"
                ? "w-full max-w-2xl space-y-4"
                : "w-full max-w-sm space-y-4 bg-white p-4 rounded-3xl shadow-2xl border-4 border-slate-800 my-auto"
            }`}
          >
            {/* 1. APPLICATION HEADER CARD (PURPLE TOP ACCENT REMOVED) */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-6 relative overflow-hidden">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                {formState.name}
              </h1>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                {formState.details}
              </p>

              {/* Secured Badge & Estimate */}
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-4 pt-3 border-t border-slate-100">
                <ShieldCheck className="w-3.5 h-3.5 text-violet-600" />
                <span>Secured & encrypted • Takes ~4 minutes</span>
              </div>
            </div>

            {/* 2. DYNAMIC FORM FIELDS */}
            {formState.fields.map((field, fieldIdx) => {
              const isSelected = field.key === selectedFieldKey;
              const def = PALETTE_DEFINITIONS.find((p) => p.type === field.type);
              const IconComponent = def?.icon || FileText;

              return (
                <div
                  key={field.key}
                  onClick={() => setSelectedFieldKey(field.key)}
                  className={`bg-white rounded-xl transition-all cursor-pointer p-5 relative ${
                    isSelected
                      ? "border-2 border-violet-600 shadow-sm ring-4 ring-violet-500/10"
                      : "border border-slate-200/90 shadow-2xs hover:border-slate-300"
                  }`}
                >
                  {/* Top Row: Direct Editable Label + Help Text + Actions */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Direct Inline Field Name Editor */}
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={field.name}
                          onChange={(e) => handleRenameField(field.key, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="font-semibold text-slate-900 text-sm bg-transparent hover:bg-slate-50 focus:bg-white focus:ring-1 focus:ring-violet-500 rounded px-1.5 py-0.5 border border-transparent hover:border-slate-300 focus:border-violet-500 transition-all w-full max-w-sm"
                          title="Click to rename field"
                        />
                        {field.required && (
                          <span className="text-rose-500 text-xs font-bold shrink-0">*</span>
                        )}
                      </div>

                      {field.helpText && (
                        <p className="text-xs text-slate-500 mt-0.5 px-1.5">{field.helpText}</p>
                      )}
                    </div>

                    {/* Quick action buttons (Swap Up/Down, Duplicate, Reset, Delete) */}
                    <div className="flex items-center gap-1 shrink-0 text-slate-400">
                      {/* Swap Arrows directly on card */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveField(fieldIdx, -1);
                        }}
                        disabled={fieldIdx === 0}
                        className="p-1 hover:text-slate-700 hover:bg-slate-100 rounded disabled:opacity-20"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveField(fieldIdx, 1);
                        }}
                        disabled={fieldIdx === formState.fields.length - 1}
                        className="p-1 hover:text-slate-700 hover:bg-slate-100 rounded disabled:opacity-20"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>

                      <div className="h-3.5 w-px bg-slate-200 mx-0.5" />

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicateField(field);
                        }}
                        className="p-1 hover:text-slate-700 hover:bg-slate-100 rounded"
                        title="Duplicate Field"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResetField(field);
                        }}
                        className="p-1 hover:text-slate-700 hover:bg-slate-100 rounded"
                        title="Reset Default"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveField(field.key);
                        }}
                        className="p-1 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Delete Field"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Field Input Preview Area */}
                  <div className="mt-3">
                    {/* A. MOBILE PHONE PREVIEW */}
                    {field.type === "phone" && (
                      <div className="bg-slate-50/80 border border-slate-200 rounded-lg px-3.5 py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-700 text-sm">
                          <Phone className="w-4 h-4 text-slate-400" />
                          <span>{field.placeholder || "+91 98765 43210"}</span>
                        </div>
                        <span className="text-[10px] font-bold text-violet-700 bg-violet-100/70 px-2 py-0.5 rounded-md">
                          Phone
                        </span>
                      </div>
                    )}

                    {/* B. TN LOCATION PREVIEW (DISTRICT -> TALUK -> PANCHAYAT CASCADING) */}
                    {field.type === "location" && (
                      <div className="space-y-2.5">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {/* 1. District Selector */}
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                              District (மாவட்டம்)
                            </label>
                            <div className="relative">
                              <select
                                value={selectedDistrictId}
                                onChange={(e) => {
                                  setSelectedDistrictId(e.target.value);
                                  setSelectedTalukId("");
                                  setSelectedPanchayathId("");
                                }}
                                className="w-full bg-slate-50/80 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 appearance-none focus:outline-hidden focus:border-violet-500 font-medium"
                              >
                                <option value="">Select District...</option>
                                {districtsData.map((d) => (
                                  <option key={d.id} value={String(d.id)}>
                                    {d.name} {d.nameTa ? `(${d.nameTa})` : ""}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                          </div>

                          {/* 2. Taluk Selector */}
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                              Taluk (தாலுகா)
                            </label>
                            <div className="relative">
                              <select
                                value={selectedTalukId}
                                disabled={!selectedDistrictId}
                                onChange={(e) => {
                                  setSelectedTalukId(e.target.value);
                                  setSelectedPanchayathId("");
                                }}
                                className="w-full bg-slate-50/80 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 appearance-none focus:outline-hidden focus:border-violet-500 font-medium disabled:opacity-50 disabled:bg-slate-100"
                              >
                                <option value="">
                                  {selectedDistrictId ? "Select Taluk..." : "(Choose District)"}
                                </option>
                                {currentDistrictTaluks.map((t) => (
                                  <option key={t.id} value={String(t.id)}>
                                    {t.name} {t.nameTa ? `(${t.nameTa})` : ""}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                          </div>

                          {/* 3. Panchayat / Village Selector */}
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                              Panchayat / Village (ஊராட்சி)
                            </label>
                            <div className="relative">
                              <select
                                value={selectedPanchayathId}
                                disabled={!selectedTalukId}
                                onChange={(e) => setSelectedPanchayathId(e.target.value)}
                                className="w-full bg-slate-50/80 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 appearance-none focus:outline-hidden focus:border-violet-500 font-medium disabled:opacity-50 disabled:bg-slate-100"
                              >
                                <option value="">
                                  {selectedTalukId
                                    ? "Select Panchayat / Village..."
                                    : "(Choose Taluk)"}
                                </option>
                                {currentTalukPanchayaths.map((p) => (
                                  <option key={p.id} value={String(p.id)}>
                                    {p.name} {p.nameTa ? `(${p.nameTa})` : ""}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                          <span className="flex items-center gap-1 text-violet-700 font-medium">
                            <MapPin className="w-3 h-3" />
                            <span>Tamil Nadu 3-tier administrative hierarchy</span>
                          </span>
                          <span>
                            {selectedDistrictId && selectedTalukId && selectedPanchayathId
                              ? "✓ Jurisdiction selected"
                              : "Live testable cascade"}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* C. DATE PICKER PREVIEW */}
                    {field.type === "date" && (
                      <div className="bg-slate-50/80 border border-slate-200 rounded-lg px-3.5 py-2.5 flex items-center justify-between text-xs text-slate-400">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span>{field.placeholder || "mm/dd/yyyy"}</span>
                        </div>
                        <Calendar className="w-4 h-4 text-slate-400" />
                      </div>
                    )}

                    {/* D. FULL NAME PREVIEW */}
                    {field.type === "name" && (
                      <div className="bg-slate-50/80 border border-slate-200 rounded-lg px-3.5 py-2.5 flex items-center justify-between text-xs text-slate-400">
                        <div className="flex items-center gap-2 text-slate-600">
                          <User className="w-4 h-4 text-slate-400" />
                          <span>{field.placeholder || "Enter full name as per Aadhaar"}</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-md">
                          Name
                        </span>
                      </div>
                    )}

                    {/* E. DOCUMENT UPLOAD PREVIEW */}
                    {field.type === "file" && (
                      <div className="border border-dashed border-slate-300 rounded-lg p-4 bg-slate-50/50 flex flex-col items-center justify-center text-center">
                        <Upload className="w-5 h-5 text-violet-600 mb-1" />
                        <p className="text-xs font-semibold text-slate-700">
                          {field.placeholder || "Upload Document"}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Supported formats: {field.options || "pdf, jpg, png"} (Max 5MB)
                        </p>
                      </div>
                    )}

                    {/* F. DROPDOWN / SELECT PREVIEW */}
                    {field.type === "select" && (
                      <div className="relative">
                        <div className="bg-slate-50/80 border border-slate-200 rounded-lg px-3.5 py-2.5 flex items-center justify-between text-xs text-slate-500">
                          <span>{field.placeholder || "Select jurisdiction..."}</span>
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        </div>
                      </div>
                    )}

                    {/* G. TEXT / NOTES PREVIEW */}
                    {field.type === "text" && (
                      <div className="bg-slate-50/80 border border-slate-200 rounded-lg px-3.5 py-2.5 text-xs text-slate-400">
                        <span>{field.placeholder || "Enter details..."}</span>
                      </div>
                    )}

                    {/* H. NUMBER / ID PREVIEW */}
                    {field.type === "number" && (
                      <div className="bg-slate-50/80 border border-slate-200 rounded-lg px-3.5 py-2.5 flex items-center gap-2 text-xs text-slate-400">
                        <Hash className="w-4 h-4 text-slate-400" />
                        <span>{field.placeholder || "Enter numeric ID..."}</span>
                      </div>
                    )}

                    {/* I. EMAIL PREVIEW */}
                    {field.type === "email" && (
                      <div className="bg-slate-50/80 border border-slate-200 rounded-lg px-3.5 py-2.5 flex items-center gap-2 text-xs text-slate-400">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <span>{field.placeholder || "applicant@example.com"}</span>
                      </div>
                    )}

                    {/* J. RADIO CHOICE PREVIEW */}
                    {field.type === "radio" && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {(field.options || "Option 1, Option 2, Option 3")
                          .split(",")
                          .map((opt, i) => (
                            <label
                              key={i}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-700"
                            >
                              <div className="w-3.5 h-3.5 rounded-full border border-slate-300 flex items-center justify-center">
                                {i === 0 && <div className="w-1.5 h-1.5 rounded-full bg-violet-600" />}
                              </div>
                              <span>{opt.trim()}</span>
                            </label>
                          ))}
                      </div>
                    )}

                    {/* K. CHECKBOX PREVIEW */}
                    {field.type === "checkbox" && (
                      <div className="flex items-center gap-2 text-xs text-slate-700 pt-1">
                        <div className="w-4 h-4 rounded border border-slate-300 flex items-center justify-center bg-white">
                          <Check className="w-3 h-3 text-violet-600" />
                        </div>
                        <span>
                          {field.placeholder || "I confirm the above statements are true."}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card Bottom Badges & Field ID */}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 text-[11px]">
                    <div className="flex items-center gap-2">
                      {field.required && (
                        <span className="text-red-600 bg-red-50 text-[11px] font-semibold px-2 py-0.5 rounded border border-red-100">
                          Required
                        </span>
                      )}
                      {field.validation && field.validation !== "none" && (
                        <span className="text-slate-600 bg-slate-100 text-[11px] font-medium px-2 py-0.5 rounded flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>
                            {field.validation === "indian_phone"
                              ? "Validates length"
                              : field.validation === "tn_location"
                              ? "District-Taluk-Panchayat"
                              : field.validation}
                          </span>
                        </span>
                      )}
                    </div>

                    <span className="text-[11px] font-mono text-slate-400">
                      Field ID: {field.fieldId}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* 3. ADD ANOTHER FIELD BUTTON (Dashed Card) */}
            <button
              type="button"
              onClick={() => handleAddField("text")}
              className="w-full border-2 border-dashed border-slate-300 rounded-xl p-4 flex items-center justify-center text-xs font-semibold text-slate-500 hover:text-violet-600 hover:border-violet-400 bg-white/60 hover:bg-violet-50/30 transition-all gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add another field here</span>
            </button>
          </div>
        </main>

        {/* ======================================================= */}
        {/* RIGHT COLUMN: FIELD SETTINGS */}
        {/* ======================================================= */}
        <aside className="w-80 border-l border-slate-200/90 bg-white flex flex-col shrink-0 overflow-y-auto p-5 space-y-5">
          {selectedField ? (
            <>
              {/* Header: FIELD SETTINGS + Delete Icon + Field Name */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold tracking-wider text-violet-700 uppercase">
                    FIELD SETTINGS
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveField(selectedField.key)}
                    className="text-slate-400 hover:text-red-600 transition-colors p-1"
                    title="Delete Field"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <h2 className="text-base font-bold text-slate-900 mt-1">
                  {selectedField.name}
                </h2>
              </div>

              {/* 1. Field Type Dropdown */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Field Type
                </label>
                <div className="relative">
                  <select
                    value={selectedField.type}
                    onChange={(e) => {
                      const newType = e.target.value as StudioFieldType;
                      const def = PALETTE_DEFINITIONS.find((p) => p.type === newType);
                      handleUpdateField(selectedField.key, {
                        type: newType,
                        name: def?.defaultName || selectedField.name,
                        placeholder: def?.defaultPlaceholder || "",
                        helpText: def?.defaultHelp || "",
                        validation: def?.defaultValidation || "none",
                      });
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 appearance-none focus:outline-hidden focus:border-violet-600 font-medium"
                  >
                    <option value="phone">Phone Number</option>
                    <option value="text">Text Field</option>
                    <option value="name">Full Name</option>
                    <option value="email">Email Address</option>
                    <option value="number">Number / ID</option>
                    <option value="file">Doc Upload</option>
                    <option value="date">Date Picker</option>
                    <option value="select">Dropdown</option>
                    <option value="radio">Radio Choice</option>
                    <option value="checkbox">Checkbox</option>
                    <option value="location">TN Location (District-Taluk-Panchayat)</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* 2. Label / Question */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Label / Question
                </label>
                <input
                  type="text"
                  value={selectedField.name}
                  onChange={(e) => handleRenameField(selectedField.key, e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-violet-600 font-medium"
                />
              </div>

              {/* 3. Placeholder Prompt */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Placeholder Prompt
                </label>
                <input
                  type="text"
                  value={selectedField.placeholder || ""}
                  onChange={(e) =>
                    handleUpdateField(selectedField.key, { placeholder: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-violet-600 font-medium"
                />
              </div>

              {/* 4. Help Text */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Help Text
                </label>
                <textarea
                  rows={2}
                  value={selectedField.helpText || ""}
                  onChange={(e) =>
                    handleUpdateField(selectedField.key, { helpText: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-violet-600 font-medium resize-none"
                />
              </div>

              {/* Extra configuration for select / radio options */}
              {(selectedField.type === "select" || selectedField.type === "radio") && (
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    Options (comma-separated)
                  </label>
                  <textarea
                    rows={2}
                    value={selectedField.options || ""}
                    onChange={(e) =>
                      handleUpdateField(selectedField.key, { options: e.target.value })
                    }
                    placeholder="Option 1, Option 2, Option 3"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-violet-600 font-medium resize-none"
                  />
                </div>
              )}

              {/* Extra configuration for file extensions */}
              {selectedField.type === "file" && (
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    Allowed File Types
                  </label>
                  <input
                    type="text"
                    value={selectedField.options || "pdf, jpg, png"}
                    onChange={(e) =>
                      handleUpdateField(selectedField.key, { options: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-violet-600 font-medium"
                  />
                </div>
              )}

              {/* Special info for Location field */}
              {selectedField.type === "location" && (
                <div className="rounded-lg bg-violet-50/80 border border-violet-200/80 p-3 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-violet-900 mb-1">
                    <MapPin className="w-3.5 h-3.5 text-violet-600" />
                    <span>Cascading Geography</span>
                  </div>
                  <p className="text-[11px] text-violet-700 leading-relaxed">
                    Automatically cascades through all 38 Tamil Nadu districts, their respective
                    taluks, and local village panchayats directly from the database.
                  </p>
                </div>
              )}

              {/* 5. Grid Width [ Full | Half ] */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Grid Width
                </label>
                <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200/80">
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateField(selectedField.key, { width: "full" })
                    }
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                      selectedField.width === "full" || !selectedField.width
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <span>Full</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateField(selectedField.key, { width: "half" })
                    }
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                      selectedField.width === "half"
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <span>Half</span>
                  </button>
                </div>
              </div>

              {/* 6. Required Field Toggle */}
              <div className="flex items-center justify-between pt-1">
                <div>
                  <label className="text-xs font-semibold text-slate-800 block">
                    Required Field
                  </label>
                  <p className="text-[11px] text-slate-400">
                    Respondent must fill this before submitting.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    handleUpdateField(selectedField.key, {
                      required: !selectedField.required,
                    })
                  }
                  className={`w-10 h-6 rounded-full p-0.5 transition-colors ${
                    selectedField.required ? "bg-violet-600" : "bg-slate-300"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      selectedField.required ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* 7. Data Validation */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Data Validation
                </label>
                <div className="relative">
                  <select
                    value={selectedField.validation || "none"}
                    onChange={(e) =>
                      handleUpdateField(selectedField.key, {
                        validation: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 appearance-none focus:outline-hidden focus:border-violet-600 font-medium"
                  >
                    <option value="indian_phone">Indian mobile number (10 digits)</option>
                    <option value="aadhaar">Aadhaar (12 digits)</option>
                    <option value="pan">PAN Card (10 alphanumeric)</option>
                    <option value="email">Email address format</option>
                    <option value="letters_only">Alphabetical characters only</option>
                    <option value="numeric_only">Numeric value only</option>
                    <option value="tn_location">Tamil Nadu District/Taluk/Panchayat</option>
                    <option value="none">Standard / No validation</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* 8. Action Buttons [ Duplicate | Delete ] */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDuplicateField(selectedField)}
                  className="flex-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 py-2 px-3 text-xs font-semibold text-slate-700 transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Duplicate</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRemoveField(selectedField.key)}
                  className="flex-1 rounded-lg border border-red-200 bg-white hover:bg-red-50 py-2 px-3 text-xs font-semibold text-red-600 transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <FileText className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs font-semibold">Select a field to configure</p>
              <p className="text-[11px] text-slate-400">
                Click any component from the canvas or field ordering list.
              </p>
            </div>
          )}
        </aside>
      </div>

      {/* ========================================================= */}
      {/* SESSION MANAGER MODAL */}
      {/* ========================================================= */}
      {sessionModalOpen && (
        <div className="fixed inset-0 z-[250] bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-5 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-violet-600" />
                <h3 className="font-bold text-slate-900 text-sm">Session &amp; Draft Manager</h3>
              </div>
              <button
                type="button"
                onClick={() => setSessionModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Active Session Info */}
              <div className="p-3 rounded-xl bg-violet-50/70 border border-violet-200/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-violet-900">Active Session</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    <Check className="w-3 h-3" /> Auto-Saved
                  </span>
                </div>
                <p className="font-mono text-slate-700 text-xs break-all">{sessionId}</p>
                <p className="text-[11px] text-violet-600">
                  Form draft is actively synchronized with your browser session.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    showToast("Session link copied to clipboard!");
                  }}
                  className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copy Session Link</span>
                </button>

                <button
                  type="button"
                  onClick={handleStartNewSession}
                  className="p-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Start New Session</span>
                </button>
              </div>

              {/* Recent Sessions list */}
              {recentSessions.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-700 mb-2">Recent Form Sessions</h4>
                  <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                    {recentSessions.map((s) => (
                      <Link
                        key={s.id}
                        href={`/admin/studio/${s.id}`}
                        onClick={() => setSessionModalOpen(false)}
                        className={`flex items-center justify-between p-2 rounded-lg border text-xs transition-colors ${
                          s.id === sessionId
                            ? "bg-violet-50 border-violet-200 text-violet-950 font-bold"
                            : "border-slate-100 hover:bg-slate-50 text-slate-600"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{s.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{s.id}</p>
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {s.fieldCount} fields
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Reset Session Draft */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleResetSessionDraft}
                  className="w-full text-center text-xs text-rose-600 hover:text-rose-700 font-semibold py-1.5"
                >
                  Reset Current Session to Default
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SERVICE SETTINGS MODAL */}
      {/* ========================================================= */}
      {showServiceSettingsModal && (
        <div className="fixed inset-0 z-[250] bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-violet-600" />
                <h3 className="font-bold text-slate-900 text-sm">Service Settings</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowServiceSettingsModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Service Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formState.name}
                  onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                  placeholder="e.g. LabourSeva Application"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-violet-600 font-medium"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Parent Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formState.mainCategoryId}
                  onChange={(e) => {
                    const newMain = e.target.value;
                    const parent = categories.find((c) => String(c.id) === newMain);
                    setFormState({
                      ...formState,
                      mainCategoryId: newMain,
                      subCategoryId: parent?.children[0]?.id ? String(parent.children[0].id) : "",
                    });
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-violet-600 font-medium"
                >
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Statutory Fee (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formState.cost}
                  onChange={(e) => setFormState({ ...formState, cost: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-violet-600 font-medium"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Instructions & Description
                </label>
                <textarea
                  rows={3}
                  value={formState.details}
                  onChange={(e) => setFormState({ ...formState, details: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-violet-600 font-medium resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <div>
                  <span className="font-semibold text-slate-800 block">Service Status</span>
                  <span className="text-[11px] text-slate-400">
                    Active services appear immediately for citizen applications.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setFormState({ ...formState, active: !formState.active })}
                  className={`w-10 h-6 rounded-full p-0.5 transition-colors ${
                    formState.active ? "bg-violet-600" : "bg-slate-300"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      formState.active ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowServiceSettingsModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowServiceSettingsModal(false);
                  showToast("Service settings applied.");
                }}
                className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-xs font-semibold text-white transition-colors"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
