"use client";

import AdminModulePage, { type AdminRecord } from "@/components/AdminModulePage";

export default function AdminCareersPage() {
  const records: AdminRecord[] = [];

  return (
    <AdminModulePage
      eyebrow="Talent & Recruitment"
      title="Careers &amp; Job Postings"
      description="Manage departmental recruitment postings, field staff hiring notifications, job descriptions, and candidate application dossiers."
      records={records}
    />
  );
}
