"use client";

import { useEffect, useState } from "react";
import AdminModulePage, { type AdminRecord } from "@/components/AdminModulePage";
import { useLanguage } from "@/components/LanguageProvider";
import { getBilingualDistrict } from "@/lib/geo-bilingual";

export default function AdminTaluksPage() {
  const { language } = useLanguage();
  const isTa = language === "ta";
  const [records, setRecords] = useState<AdminRecord[]>([]);

  useEffect(() => {
    fetch("/api/geography?type=taluks")
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.taluks)) {
          const mapped: AdminRecord[] = data.taluks.map((t: any) => {
            const parentDistrict = t.districtId ? getBilingualDistrict(t.districtId) : null;
            const districtStr = parentDistrict
              ? parentDistrict.bilingual
              : "Tamil Nadu / தமிழ்நாடு";

            return {
              id: `TLK-${String(t.id).padStart(4, "0")}`,
              title: t.displayName || `${t.name} / ${t.nameTa}`,
              detail: isTa
                ? `${t.displayName || t.name} வட்டம், ${districtStr} மாவட்டம் - துணை வட்டார நிர்வாக பிரிவு.`
                : `${t.name} (${t.nameTa}) taluk under ${districtStr} - administrative sub-division.`,
              status: isTa ? "செயலில் உள்ளது" : "Active",
              district: districtStr,
              category: "Taluk / வட்டம்",
              date: new Date().toISOString().split("T")[0],
            };
          });
          setRecords(mapped);
        }
      })
      .catch((err) => console.error("Failed to load taluks:", err));
  }, [isTa]);

  return (
    <AdminModulePage
      eyebrow={isTa ? "துணை வட்டார நிர்வாகம்" : "Sub-District Administration"}
      title={isTa ? "தமிழ்நாடு வட்டங்கள் பட்டியல் (Taluks)" : "Tamil Nadu Taluks Administration"}
      description={
        isTa
          ? "தமிழ்நாடு முழுவதும் உள்ள வட்டார நிர்வாக அமைப்புகளை நிர்வகிக்கவும், கள அதிகாரிகளை வரைபடமாக்கவும், உள்ளூர் சேவை செயல்திறனைக் கண்காணிக்கவும்."
          : "Configure sub-district administrative blocks across Tamil Nadu, map assigned field officers, and supervise local queue performance."
      }
      records={records}
      statsOverride={[
        {
          label: isTa ? "மொத்த வட்டங்கள்" : "Configured Taluks",
          value: records.length || "300+",
          color: "border-t-[#1e3a8a]",
        },
        {
          label: isTa ? "செயலில் உள்ள வட்டங்கள்" : "Operational Blocks",
          value: records.length || "300+",
          color: "border-t-emerald-600",
        },
        {
          label: isTa ? "இருமொழி சரிபார்ப்பு" : "Bilingual Integrity",
          value: "100%",
          color: "border-t-blue-600",
        },
        {
          label: isTa ? "கள மேற்பார்வை" : "Field Supervision",
          value: isTa ? "செயலில் உள்ளது" : "Active",
          color: "border-t-amber-500",
        },
      ]}
    />
  );
}
