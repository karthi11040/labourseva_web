"use client";

import GuestRequestsPage from "@/app/admin/guest-requests/page";

export default function CustomerRequestsPage() {
  return (
    <GuestRequestsPage
      defaultRole="CUSTOMER"
      customEyebrow="Citizen Services Portal"
      customTitle="Citizen Service Applications & E-Service Claims"
      customDescription="Review registered citizen welfare scheme submissions, examine uploaded employment certificates, digitally sign sanction orders, and notify applicants."
    />
  );
}
