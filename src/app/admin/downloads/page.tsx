"use client";

import AdminModulePage, { type AdminRecord } from "@/components/AdminModulePage";

export default function AdminDownloadsPage() {
  const records: AdminRecord[] = [];

  return (
    <AdminModulePage
      eyebrow="Forms & Statutory Documents"
      title="Download Manager"
      description="Manage downloadable official application forms, employer certificate templates, gazette rules, and public guidance PDFs."
      records={records}
    />
  );
}
