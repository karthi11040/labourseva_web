"use client";

import GuestRequestsWorkbench from "@/components/admin/GuestRequestsWorkbench";

export default function RetailRequestsPage() {
  return (
    <GuestRequestsWorkbench
      defaultRole="RETAILER"
      customEyebrow="Channel Operations"
      customTitle="Retail Partner Assisted Service Orders"
      customDescription="Review assisted filings submitted by retail Kendra agents, check Kendra wallet deductions, examine customer proof attachments, and sanction orders."
    />
  );
}
