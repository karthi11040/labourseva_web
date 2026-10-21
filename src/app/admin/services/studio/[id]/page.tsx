"use client";

import { use } from "react";
import ServiceDocumentStudio from "@/components/studio/ServiceDocumentStudio";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function AdminServiceStudioDetailPage({ params }: PageProps) {
  const { id } = use(params);
  return (
    <ServiceDocumentStudio
      userRole="admin"
      serviceIdParam={id}
      backUrl="/admin/services"
    />
  );
}
