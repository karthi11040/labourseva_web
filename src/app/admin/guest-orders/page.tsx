"use client";

import AdminModulePage, { type AdminRecord } from "@/components/AdminModulePage";

export default function AdminGuestOrdersPage() {
  const records: AdminRecord[] = [];

  return (
    <AdminModulePage
      eyebrow="Fulfillment & Dispatch"
      title="Guest Orders &amp; Receipts"
      description="Monitor physical smart card shipments, certified transcript deliveries, and payment receipts requested by guest applicants."
      records={records}
    />
  );
}
