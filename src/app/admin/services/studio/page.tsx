"use client";

import ServiceDocumentStudio from "@/components/studio/ServiceDocumentStudio";

export default function AdminServiceStudioIndexPage() {
  return (
    <ServiceDocumentStudio
      userRole="admin"
      serviceIdParam="new"
      backUrl="/admin/services"
    />
  );
}
