"use client";

import AdminModulePage, { AdminRecord } from "@/components/AdminModulePage";

export default function AdminSchemesPage() {
  const records: AdminRecord[] = [];

  return (
    <AdminModulePage
      eyebrow="Government Welfare Programs"
      title="Statutory Welfare Schemes"
      description="Manage welfare board programs, eligibility criteria, benefit disbursements, and annual budget allocations across Tamil Nadu."
      records={records}
    />
  );
}
