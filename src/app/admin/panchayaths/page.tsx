"use client";

import { useEffect, useState } from "react";
import AdminModulePage, { type AdminRecord } from "@/components/AdminModulePage";
import { useLanguage } from "@/components/LanguageProvider";

export default function AdminPanchayathsPage() {
  const { language } = useLanguage();
  const isTa = language === "ta";
  const [records, setRecords] = useState<AdminRecord[]>([]);

  useEffect(() => {
    fetch("/api/geography?type=panchayaths")
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.panchayaths)) {
          const mapped: AdminRecord[] = data.panchayaths.map((p: any) => ({
            id: `PCH-${String(p.id).padStart(5, "0")}`,
            title: p.displayName || `${p.name} / ${p.nameTa}`,
            detail: isTa
              ? `${p.displayName || p.name} கிராம/பேரூராட்சி வாரியம் - கிராம நிர்வாக அலுவலர் (VAO) அதிகார வரம்பு.`
              : `${p.name} (${p.nameTa}) village / town panchayat council under VAO jurisdiction.`,
            status: isTa ? "செயலில் உள்ளது" : "Active",
            district: "Tamil Nadu / தமிழ்நாடு",
            category: "Panchayat / ஊராட்சி",
            date: new Date().toISOString().split("T")[0],
          }));
          setRecords(mapped);
        }
      })
      .catch((err) => console.error("Failed to load panchayaths:", err));
  }, [isTa]);

  return (
    <AdminModulePage
      eyebrow={isTa ? "உள்ளாட்சி அமைப்புகள்" : "Local Governance Bodies"}
      title={isTa ? "தமிழ்நாடு கிராம மற்றும் பேரூராட்சிகள் (Panchayats)" : "Tamil Nadu Panchayats Administration"}
      description={
        isTa
          ? "கிராம மற்றும் பேரூராட்சிகளை மேற்பார்வையிடவும், உள்ளூர் நலத்திட்ட சேர்க்கை முகாம்களைக் கண்காணிக்கவும், கிராம நிர்வாக அலுவலர் (VAO) சான்றளிப்பு பதிவுகளைச் சரிபார்க்கவும்."
          : "Supervise Gram and Town Panchayats, track localized enrollment camps, and verify village administrative officer (VAO) attestation records."
      }
      records={records}
      statsOverride={[
        {
          label: isTa ? "மொத்த ஊராட்சிகள்" : "Panchayat Bodies",
          value: records.length || "12,000+",
          color: "border-t-[#1e3a8a]",
        },
        {
          label: isTa ? "செயலில் உள்ள ஊராட்சிகள்" : "Active Councils",
          value: records.length || "12,000+",
          color: "border-t-emerald-600",
        },
        {
          label: isTa ? "VAO ஒருங்கிணைப்பு" : "VAO Verification Sync",
          value: "100%",
          color: "border-t-blue-600",
        },
        {
          label: isTa ? "கள முகாம்கள்" : "Field Enrolment Camps",
          value: isTa ? "நடந்து கொண்டிருக்கிறது" : "Ongoing",
          color: "border-t-amber-500",
        },
      ]}
    />
  );
}
