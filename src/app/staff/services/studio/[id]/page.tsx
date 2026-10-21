"use client";

import { use } from "react";
import ServiceDocumentStudio from "@/components/studio/ServiceDocumentStudio";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function StaffServiceStudioDetailPage({ params }: PageProps) {
  const { id } = use(params);
  return (
    <ServiceDocumentStudio
      userRole="staff"
      serviceIdParam={id}
      backUrl="/staff/dashboard"
    />
  );
}
