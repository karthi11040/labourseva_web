"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, Edit3, Eye, Map, MapPin, Plus, Search, Trash2 } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

type District = { id: string; name: string; nameTa?: string };
type Taluk = { id: string; districtId: string; name: string; nameTa?: string };
type Panchayat = { id: string; talukId: string; name: string; nameTa?: string };

export default function GeographyPage() {
  const { language } = useLanguage();
  const isTa = language === "ta";

  const [districts, setDistricts] = useState<District[]>([]);
  const [taluks, setTaluks] = useState<Taluk[]>([]);
  const [panchayats, setPanchayats] = useState<Panchayat[]>([]);
  const [level, setLevel] = useState<"district" | "taluk" | "panchayat">("district");
  const [district, setDistrict] = useState<District | null>(null);
  const [taluk, setTaluk] = useState<Taluk | null>(null);
  const [name, setName] = useState("");
  const [nameTa, setNameTa] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/admin/geography/import")
      .then((r) => r.json())
      .then((d) => {
        const rows = d.districts || [];
        setDistricts(rows.map((x: any) => ({ id: String(x.id), name: x.name, nameTa: x.nameTa })));
        setTaluks(
          rows.flatMap((x: any) =>
            x.taluks.map((y: any) => ({
              id: String(y.id),
              districtId: String(x.id),
              name: y.name,
              nameTa: y.nameTa,
            }))
          )
        );
        setPanchayats(
          rows.flatMap((x: any) =>
            x.taluks.flatMap((y: any) =>
              y.panchayaths.map((z: any) => ({
                id: String(z.id),
                talukId: String(y.id),
                name: z.name,
                nameTa: z.nameTa,
              }))
            )
          )
        );
      })
      .catch(() =>
        setError(
          isTa
            ? "புவியியல் தரவை ஏற்றுவதில் தோல்வி."
            : "Unable to load geography data."
        )
      );
  }, [isTa]);

  const items =
    level === "district"
      ? districts
      : level === "taluk"
      ? taluks.filter((x) => x.districtId === district?.id)
      : panchayats.filter((x) => x.talukId === taluk?.id);

  const visibleItems = items.filter((x) =>
    `${x.name} ${x.nameTa || ""}`.toLocaleLowerCase().includes(search.toLocaleLowerCase().trim())
  );

  const levelName =
    level === "district"
      ? isTa
        ? "மாவட்டம்"
        : "District"
      : level === "taluk"
      ? isTa
        ? "வட்டம்"
        : "Taluk"
      : isTa
      ? "ஊராட்சி"
      : "Panchayat";

  const title =
    level === "district"
      ? isTa
        ? "மாவட்டங்கள் பட்டியல் (Districts)"
        : "Districts"
      : level === "taluk"
      ? isTa
        ? `${district?.nameTa || district?.name} மாவட்ட வட்டங்கள் (Taluks)`
        : `Taluks in ${district?.name}`
      : isTa
      ? `${taluk?.nameTa || taluk?.name} வட்ட ஊராட்சிகள் (Panchayats)`
      : `Panchayats in ${taluk?.name}`;

  function openDistrict(x: District) {
    setDistrict(x);
    setLevel("taluk");
    setEditing(null);
    setName("");
    setNameTa("");
    setSearch("");
  }

  function openTaluk(x: Taluk) {
    setTaluk(x);
    setLevel("panchayat");
    setEditing(null);
    setName("");
    setNameTa("");
    setSearch("");
  }

  function back() {
    setLevel(level === "panchayat" ? "taluk" : "district");
    setEditing(null);
    setName("");
    setNameTa("");
    setSearch("");
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const n = name.trim();
    const ta = nameTa.trim();
    if (!n) return;

    if (level === "district") {
      setDistricts((v) =>
        editing
          ? v.map((x) => (x.id === editing ? { ...x, name: n, nameTa: ta } : x))
          : [...v, { id: crypto.randomUUID(), name: n, nameTa: ta }]
      );
    }
    if (level === "taluk" && district) {
      setTaluks((v) =>
        editing
          ? v.map((x) => (x.id === editing ? { ...x, name: n, nameTa: ta } : x))
          : [...v, { id: crypto.randomUUID(), districtId: district.id, name: n, nameTa: ta }]
      );
    }
    if (level === "panchayat" && taluk) {
      setPanchayats((v) =>
        editing
          ? v.map((x) => (x.id === editing ? { ...x, name: n, nameTa: ta } : x))
          : [...v, { id: crypto.randomUUID(), talukId: taluk.id, name: n, nameTa: ta }]
      );
    }
    setName("");
    setNameTa("");
    setEditing(null);
  }

  function remove(id: string) {
    if (
      !confirm(
        isTa
          ? "இந்தப் பதிவையும் அதன் துணைப் பதிவுகளையும் நிச்சயமாக நீக்க வேண்டுமா?"
          : "Delete this record and its child records?"
      )
    )
      return;
    if (level === "district") {
      setDistricts((v) => v.filter((x) => x.id !== id));
      setTaluks((v) => v.filter((x) => x.districtId !== id));
    }
    if (level === "taluk") {
      setTaluks((v) => v.filter((x) => x.id !== id));
      setPanchayats((v) => v.filter((x) => x.talukId !== id));
    }
    if (level === "panchayat") {
      setPanchayats((v) => v.filter((x) => x.id !== id));
    }
  }

  return (
    <main className="space-y-6 font-sans">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 pb-4">
          {level !== "district" && (
            <button
              onClick={back}
              className="inline-flex items-center gap-1 text-sm font-semibold text-[#1e3a8a] cursor-pointer"
            >
              <ArrowLeft size={16} />
              {isTa ? "பின்செல்" : "Back"}
            </button>
          )}
          <span className="text-sm text-slate-500 font-medium">
            {district ? (isTa && district.nameTa ? `${district.name} / ${district.nameTa}` : district.name) : ""}
            {taluk && ` / ${isTa && taluk.nameTa ? `${taluk.name} / ${taluk.nameTa}` : taluk.name}`}
          </span>
          <h2 className="ml-auto flex items-center gap-2 text-lg font-bold text-slate-900">
            {level === "district" ? <Map size={19} className="text-[#1e3a8a]" /> : <MapPin size={19} className="text-[#ea580c]" />}{" "}
            {title}
          </h2>
        </div>

        <form onSubmit={submit} className="mt-5 grid max-w-3xl gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`${editing ? (isTa ? "புதுப்பி" : "Update") : (isTa ? "சேர்" : "Add")} ${levelName} (English)`}
            className="h-11 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-blue-600 bg-white"
          />
          <input
            value={nameTa}
            onChange={(e) => setNameTa(e.target.value)}
            placeholder={`${editing ? (isTa ? "புதுப்பி" : "Update") : (isTa ? "சேர்" : "Add")} ${levelName} (தமிழ்)`}
            className="h-11 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-blue-600 bg-white"
          />
          <button className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#1e3a8a] px-4 text-sm font-bold text-white hover:bg-[#1e40af] transition-colors cursor-pointer">
            <Plus size={16} />
            {editing ? (isTa ? "புதுப்பி" : "Update") : (isTa ? "சேர்" : "Add")}
          </button>
        </form>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative block w-full sm:max-w-sm">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isTa ? "ஆங்கிலம் அல்லது தமிழில் தேடுக..." : "Search English or தமிழ்"}
              aria-label="Search geography"
              className="h-11 w-full rounded-md border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-orange-200 bg-white"
            />
          </label>
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="text-left text-sm font-semibold text-[#1e3a8a] sm:text-right cursor-pointer"
            >
              {isTa ? "தேடலை நீக்கு" : "Clear search"}
            </button>
          )}
        </div>

        <div className="mt-3 overflow-x-auto w-full scrollbar-thin rounded-md border border-slate-200">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap w-12">#</th>
                <th className="px-4 py-3 whitespace-nowrap min-w-[180px]">
                  {isTa ? "ஆங்கில பெயர் (English Name)" : "English name"}
                </th>
                <th className="px-4 py-3 whitespace-nowrap min-w-[180px]">
                  {isTa ? "தமிழ் பெயர் (Tamil Name)" : "Tamil name"}
                </th>
                <th className="px-4 py-3 whitespace-nowrap">
                  {isTa ? "நிர்வாக தொடர்பு (Parent Jurisdiction)" : "Relationship"}
                </th>
                <th className="px-4 py-3 whitespace-nowrap">
                  {isTa ? "நிலை" : "Status"}
                </th>
                <th className="px-4 py-3 text-right whitespace-nowrap min-w-[140px]">
                  {isTa ? "செயல்கள்" : "Actions"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {visibleItems.map((x: any, i: number) => (
                <tr key={x.id} className="hover:bg-blue-50/40 transition-colors">
                  <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{i + 1}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">{x.name}</td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{x.nameTa || "—"}</td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                    {level === "district"
                      ? isTa
                        ? "மாநில தலைமை (State Master)"
                        : "State master"
                      : level === "taluk"
                      ? district?.nameTa
                        ? `${district.name} / ${district.nameTa}`
                        : district?.name
                      : taluk?.nameTa
                      ? `${taluk.name} / ${taluk.nameTa}`
                      : taluk?.name}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="shrink-0 whitespace-nowrap inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      {isTa ? "செயலில் உள்ளது" : "Active"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap min-w-[140px]">
                    <div className="inline-flex items-center justify-end gap-1 flex-nowrap">
                      {level !== "panchayat" && (
                        <button
                          onClick={() => (level === "district" ? openDistrict(x) : openTaluk(x))}
                          className="rounded-md p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-700 shrink-0 cursor-pointer"
                          aria-label={`View ${x.name}`}
                          title={isTa ? "துணைப் பிரிவுகளைக் காண்க" : "View sub-entities"}
                        >
                          <Eye size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setEditing(x.id);
                          setName(x.name);
                          setNameTa(x.nameTa || "");
                        }}
                        className="rounded-md p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-700 shrink-0 cursor-pointer"
                        aria-label={`Edit ${x.name}`}
                        title={isTa ? "திருத்து" : "Edit"}
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => remove(x.id)}
                        className="rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-700 shrink-0 cursor-pointer"
                        aria-label={`Delete ${x.name}`}
                        title={isTa ? "நீக்கு" : "Delete"}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!visibleItems.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    {isTa ? `${levelName} பதிவுகள் எதுவும் கிடைக்கவில்லை.` : `No ${level} records found.`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
