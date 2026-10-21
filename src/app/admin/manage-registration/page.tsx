"use client";

import AdminModulePage, { AdminRecord } from "@/components/AdminModulePage";

export default function ManageRegistrationPage() {
  const records: AdminRecord[] = [];

  return (
    <AdminModulePage
      eyebrow="Portal Configuration"
      title="Manage Registration Schemes"
      description="Configure onboarding rules, mandatory verification steps, and deposit criteria across citizen, retail, and distributor channels."
      records={records}
    />
  );
}
