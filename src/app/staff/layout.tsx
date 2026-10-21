import StaffPortalGate from "@/components/StaffPortalGate";

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return <StaffPortalGate>{children}</StaffPortalGate>;
}
