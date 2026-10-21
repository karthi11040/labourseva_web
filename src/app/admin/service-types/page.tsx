"use client";

import AdminModulePage, { type AdminRecord } from "@/components/AdminModulePage";

export default function AdminServiceTypesPage() {
  const records: AdminRecord[] = [];

  return (
    <AdminModulePage
      eyebrow="Taxonomy & Service Classification"
      title="Service Types Management"
      description="Organize Labour Welfare Board programs into classified service types with specific eligibility benchmarks and document templates."
      records={records}
    />
  );
}
