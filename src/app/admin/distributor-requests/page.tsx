"use client";

import AdminModulePage, { type AdminRecord } from "@/components/AdminModulePage";

export default function DistributorRequestsPage() {
  const records: AdminRecord[] = [];

  return (
    <AdminModulePage
      eyebrow="Channel Governance"
      title="Distributor Requests &amp; Payouts"
      description="Approve large-scale wallet balance releases, sub-distributor territory assignments, and wholesale settlement requests."
      records={records}
    />
  );
}
