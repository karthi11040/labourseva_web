"use client";

import GuestRequestsWorkbench from "@/components/admin/GuestRequestsWorkbench";

export default function CustomerRequestsPage() {
  return (
    <GuestRequestsWorkbench
      defaultRole="CUSTOMER"
      customEyebrow="Citizen Services Portal"
      customTitle="Citizen Service Applications & E-Service Claims"
      customDescription="Review registered citizen welfare scheme submissions, examine uploaded employment certificates, digitally sign sanction orders, and notify applicants."
    />
  );
}
