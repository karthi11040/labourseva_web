"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function StudioRedirectPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center text-slate-800 space-y-2">
          <div className="w-8 h-8 rounded-full border-2 border-violet-600 border-t-transparent animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Creating FormStudio Session...</p>
        </div>
      }
    >
      <StudioRedirectContent />
    </Suspense>
  );
}

function StudioRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const serviceId = searchParams.get("service_id");
    const mainId = searchParams.get("main_id");
    const subId = searchParams.get("sub_id");

    // Generate random 7-character session ID or attach existing service id
    const randomSessionSuffix = Math.random().toString(36).substring(2, 9);
    const targetId = serviceId ? `service_${serviceId}` : `service_${randomSessionSuffix}`;

    const queryParts: string[] = [];
    if (serviceId) queryParts.push(`service_id=${serviceId}`);
    if (mainId) queryParts.push(`main_id=${mainId}`);
    if (subId) queryParts.push(`sub_id=${subId}`);

    const queryString = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";
    router.replace(`/admin/studio/${targetId}${queryString}`);
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center text-slate-800 space-y-2">
      <div className="w-8 h-8 rounded-full border-2 border-violet-600 border-t-transparent animate-spin" />
      <p className="text-xs font-semibold text-slate-500">Redirecting to FormStudio Session...</p>
    </div>
  );
}
