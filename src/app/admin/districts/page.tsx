"use client";

import { useEffect, useState } from "react";
import AdminModulePage, { type AdminRecord } from "@/components/AdminModulePage";
import { useLanguage } from "@/components/LanguageProvider";

export default function AdminDistrictsPage() {
  const { language } = useLanguage();
  const isTa = language === "ta";
  const [records, setRecords] = useState<AdminRecord[]>([]);

  useEffect(() => {
    fetch("/api/geography")
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.districts)) {
          const mapped: AdminRecord[] = data.districts.map((d: any) => ({
            id: `DST-${String(d.id).padStart(3, "0")}`,
            title: d.displayName || `${d.name} / ${d.nameTa}`,
            detail: isTa
              ? `${d.displayName || d.name} மாவட்ட நிர்வாக தலைமையகம் மற்றும் சேவை மண்டலம்.`
              : `${d.name} (${d.nameTa}) district administrative zone and e-governance service jurisdiction.`,
            status: isTa ? "செயலில் உள்ளது" : "Active",
            district: d.displayName || `${d.name} / ${d.nameTa}`,
            category: "Revenue District",
            date: new Date().toISOString().split("T")[0],
          }));
          setRecords(mapped);
        }
      })
      .catch((err) => console.error("Failed to load districts:", err));
  }, [isTa]);

  return (
    <AdminModulePage
      eyebrow={isTa ? "நிர்வாக அதிகார வரம்புகள்" : "Administrative Jurisdictions"}
      title={isTa ? "தமிழ்நாடு மாவட்டங்கள் பட்டியல் (38 மாவட்டங்கள்)" : "Tamil Nadu Districts Directory (38 Districts)"}
      description={
        isTa
          ? "தமிழ்நாட்டின் 38 வருவாய் மாவட்டங்களை நிர்வகிக்கவும், மண்டல தலைமையகங்களை ஒதுக்கவும், உள்ளூர் நலத்திட்டங்களின் செயல்பாட்டைக் கண்காணிக்கவும்."
          : "Manage 38 revenue districts of Tamil Nadu, assign zonal administrative headquarters, and monitor localized welfare reach."
      }
      records={records}
      statsOverride={[
        {
          label: isTa ? "மொத்த மாவட்டங்கள்" : "Total Revenue Districts",
          value: records.length || 38,
          color: "border-t-[#1e3a8a]",
        },
        {
          label: isTa ? "செயலில் உள்ள மாவட்டங்கள்" : "Active Districts",
          value: records.length || 38,
          color: "border-t-emerald-600",
        },
        {
          label: isTa ? "இருமொழி வரம்பு" : "Bilingual Coverage",
          value: "100%",
          color: "border-t-blue-600",
        },
        {
          label: isTa ? "மண்டல நிலை" : "Zonal Status",
          value: isTa ? "இயக்கத்தில் உள்ளது" : "Operational",
          color: "border-t-amber-500",
        },
      ]}
    />
  );
}
