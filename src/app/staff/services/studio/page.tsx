"use client";

import ServiceDocumentStudio from "@/components/studio/ServiceDocumentStudio";

export default function StaffServiceStudioIndexPage() {
  return (
    <ServiceDocumentStudio
      userRole="staff"
      serviceIdParam="new"
      backUrl="/staff/dashboard"
    />
  );
}
