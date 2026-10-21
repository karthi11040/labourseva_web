"use client";

import AdminModulePage, { AdminRecord } from "@/components/AdminModulePage";

export default function AdminNoticePage() {
  const records: AdminRecord[] = [];

  return (
    <AdminModulePage
      eyebrow="Official Gazettes & Advisories"
      title="Notice Management Board"
      description="Manage official government notifications, department circulars, statutory wage declarations, and safety guidelines."
      records={records}
    />
  );
}
