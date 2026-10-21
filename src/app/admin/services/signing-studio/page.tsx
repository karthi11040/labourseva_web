"use client";

import { useEffect, useMemo, useState } from "react";
import { FileUp, MapPin, PenTool, Save, UploadCloud } from "lucide-react";

type Service = { id: number; code: string; name_en: string; page?: number; x_frac?: number; y_frac?: number; w_frac?: number; h_frac?: number; file_name?: string; storage_key?: string };
type District = { id: number; name: string; name_ta?: string };
type Signature = { districtId: number; storageKey: string; officerName: string };

export default function SigningStudioPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [page, setPage] = useState(1);
  const [x, setX] = useState(0.65);
  const [y, setY] = useState(0.76);
  const [w, setW] = useState(0.24);
  const [h, setH] = useState(0.1);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const selectedService = useMemo(() => services.find((item) => item.id === globalThis.Number(serviceId)), [services, serviceId]);
  const selectedSignature = signatures.find((item) => item.districtId === globalThis.Number(districtId));

  async function load() {
    const response = await fetch("/api/admin/service-signing", { cache: "no-store" });
    const data = await response.json();
    if (data.ok) {
      setServices(data.services);
      setDistricts(data.districts);
      setSignatures(data.signatures);
    } else {
      setMessage(data.error || "Unable to load the signing studio.");
    }
  }

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    if (!selectedService) return;
    setPage(selectedService.page || 1);
    setX(globalThis.Number(selectedService.x_frac ?? 0.65));
    setY(globalThis.Number(selectedService.y_frac ?? 0.76));
    setW(globalThis.Number(selectedService.w_frac ?? 0.24));
    setH(globalThis.Number(selectedService.h_frac ?? 0.1));
  }, [selectedService]);

  async function uploadTemplate() {
    if (!file || !serviceId) return setMessage("Select a service and PDF template.");
    setBusy(true);
    const form = new FormData();
    form.set("serviceId", serviceId);
    form.set("file", file);
    const response = await fetch("/api/admin/service-signing", { method: "POST", body: form });
    const data = await response.json();
    setBusy(false);
    setMessage(data.ok ? "PDF template saved." : data.error);
    if (data.ok) await load();
  }

  async function savePlacement() {
    if (!serviceId) return setMessage("Select a service.");
    setBusy(true);
    const response = await fetch("/api/admin/service-signing", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceId: globalThis.Number(serviceId),
        page,
        xFrac: x,
        yFrac: y,
        wFrac: w,
        hFrac: h,
      }),
    });
    const data = await response.json();
    setBusy(false);
    setMessage(data.ok ? "Signature placement saved." : data.error);
    if (data.ok) await load();
  }

  return (
    <main className="space-y-6">
      <section className="rounded-xl border border-slate-200 border-t-4 border-t-[#1e3a8a] bg-white p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wider text-[#ea580c]">Document configuration</p>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold">
          <PenTool className="text-[#1e3a8a]" /> PDF signature studio
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Upload a service certificate PDF, select the district whose authorized signature will be used, then save a normalized placement that remains correct on any page size.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
        <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="block text-sm font-semibold">
            Service
            <select
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              className="mt-1 h-11 w-full rounded-md border border-slate-200 px-3 font-normal"
            >
              <option value="">Select service</option>
              {services.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code} - {item.name_en}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-semibold">
            District signature
            <select
              value={districtId}
              onChange={(e) => setDistrictId(e.target.value)}
              className="mt-1 h-11 w-full rounded-md border border-slate-200 px-3 font-normal"
            >
              <option value="">Select district</option>
              {districts.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                  {item.name_ta ? ` (${item.name_ta})` : ""}
                </option>
              ))}
            </select>
          </label>

          {districtId && (
            <div
              className={`rounded-md border p-3 text-sm ${
                selectedSignature
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-amber-200 bg-amber-50 text-amber-800"
              }`}
            >
              {selectedSignature ? (
                <>
                  Authorized image: <strong>{selectedSignature.officerName}</strong>
                </>
              ) : (
                "No district signature uploaded. Add it in District Signatures before issuing this document."
              )}
            </div>
          )}

          <label className="block text-sm font-semibold">
            PDF certificate template
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="mt-1 block w-full rounded-md border border-slate-200 p-2 text-sm font-normal"
            />
            <span className="mt-1 block text-xs font-normal text-slate-500">PDF only, up to 20 MB.</span>
          </label>

          <button
            type="button"
            disabled={busy || !file || !serviceId}
            onClick={uploadTemplate}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-[#1e3a8a] text-sm font-bold text-[#1e3a8a] disabled:opacity-50"
          >
            <UploadCloud size={17} /> Save PDF template
          </button>
          {message && <p className="text-sm font-medium text-[#1e3a8a]">{message}</p>}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="font-bold">Placement canvas</h2>
            <span className="text-xs text-slate-500">Page {page}</span>
          </div>
          <div className="mt-5 aspect-[.707] max-h-[530px] rounded border bg-slate-50 p-5 shadow-inner">
            <div className="relative h-full rounded border border-slate-300 bg-white">
              <span className="absolute left-5 top-5 text-xs text-slate-400">
                {selectedService?.file_name || "Upload a PDF template to label this page"}
              </span>
              {selectedSignature && (
                <div
                  className="absolute flex items-center justify-center overflow-hidden border-2 border-dashed border-[#ea580c] bg-orange-50/80"
                  style={{
                    left: `${x * 100}%`,
                    top: `${y * 100}%`,
                    width: `${w * 100}%`,
                    height: `${h * 100}%`,
                  }}
                >
                  <img
                    src={selectedSignature.storageKey}
                    alt="District signature placement preview"
                    className="max-h-full max-w-full object-contain p-1"
                  />
                </div>
              )}
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <NumberInput label="Page" value={page} setValue={setPage} step={1} />
            <NumberInput label="X" value={x} setValue={setX} />
            <NumberInput label="Y" value={y} setValue={setY} />
            <NumberInput label="Width" value={w} setValue={setW} />
            <NumberInput label="Height" value={h} setValue={setH} />
          </div>
          <button
            type="button"
            disabled={busy || !serviceId}
            onClick={savePlacement}
            className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#1e3a8a] text-sm font-bold text-white disabled:opacity-50"
          >
            <Save size={17} /> Save signature placement
          </button>
        </section>
      </div>
    </main>
  );
}

function NumberInput({
  label,
  value,
  setValue,
  step = 0.01,
}: {
  label: string;
  value: number;
  setValue: (value: number) => void;
  step?: number;
}) {
  return (
    <label className="text-xs font-semibold text-slate-600">
      {label}
      <input
        type="number"
        min={step === 1 ? 1 : 0}
        max={step === 1 ? undefined : 1}
        step={step}
        value={value}
        onChange={(e) => setValue(globalThis.Number(e.target.value))}
        className="mt-1 h-10 w-full rounded-md border border-slate-200 px-2 text-sm font-normal"
      />
    </label>
  );
}
