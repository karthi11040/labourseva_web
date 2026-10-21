"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import AdminPortalShell from "@/components/admin/AdminPortalShell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname?.startsWith("/admin/login") ?? false;
  const isStudio =
    (pathname?.startsWith("/admin/studio") ?? false) ||
    (pathname?.startsWith("/admin/services/studio") ?? false);
  const [authorized, setAuthorized] = useState(isLogin);

  useEffect(() => {
    if (isLogin) return;
    if (window.sessionStorage.getItem("labourseva-admin-session") !== "active") {
      router.replace("/admin/login");
      return;
    }
    setAuthorized(true);
  }, [isLogin, router]);

  if (isLogin) return children;
  if (!authorized) return <div className="min-h-screen bg-slate-950" aria-busy="true" />;

  // Dedicated Full-Screen Studio route runs standalone without the admin sidebar
  if (isStudio) {
    return <>{children}</>;
  }

  return <AdminPortalShell>{children}</AdminPortalShell>;
}
