"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import OperationsPortalShell from "@/components/OperationsPortalShell";

const publicStaffPaths = new Set([
  "/staff/login",
  "/staff/forgot-password",
  "/staff/reset-password",
]);

/**
 * Keeps the public staff authentication pages out of the employee shell and
 * verifies the signed, httpOnly staff cookie before rendering desk pages.
 */
export default function StaffPortalGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isPublicPage = publicStaffPaths.has(pathname);
  const isStudioPage = pathname?.includes("/studio") ?? false;
  const [access, setAccess] = useState<"checking" | "granted">("checking");

  useEffect(() => {
    if (isPublicPage) {
      setAccess("granted");
      return;
    }

    let active = true;
    setAccess("checking");

    fetch("/api/staff/session", { cache: "no-store", credentials: "same-origin" })
      .then((response) => {
        if (!response.ok) throw new Error("No staff session");
        if (active) setAccess("granted");
      })
      .catch(() => {
        if (active) router.replace("/staff/login");
      });

    return () => {
      active = false;
    };
  }, [isPublicPage, router]);

  if (isPublicPage) return <>{children}</>;

  if (access === "checking") {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 px-6" aria-live="polite">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-700 shadow-sm">
          <ShieldCheck className="h-5 w-5 animate-pulse text-[#1e3a8a]" aria-hidden="true" />
          Checking secure employee access…
        </div>
      </main>
    );
  }

  // Standalone full-screen studio for staff without shell sidebar interference
  if (isStudioPage) {
    return <>{children}</>;
  }

  return <OperationsPortalShell mode="staff">{children}</OperationsPortalShell>;
}
