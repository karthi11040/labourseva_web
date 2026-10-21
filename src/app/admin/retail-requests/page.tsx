"use client";

import GuestRequestsPage from "@/app/admin/guest-requests/page";

export default function RetailRequestsPage() {
  return (
    <GuestRequestsPage
      defaultRole="RETAILER"
      customEyebrow="Channel Operations"
      customTitle="Retail Partner Assisted Service Orders"
      customDescription="Review assisted filings submitted by retail Kendra agents, check Kendra wallet deductions, examine customer proof attachments, and sanction orders."
    />
  );
}
