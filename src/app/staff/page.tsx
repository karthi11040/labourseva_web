import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifyStaffSession, staffSessionCookieName } from "@/lib/staff-session";

export default async function StaffIndexPage() {
  const cookieStore = await cookies();
  const staffCookie = cookieStore.get(staffSessionCookieName)?.value;
  const session = verifyStaffSession(staffCookie);

  if (session) {
    redirect("/staff/dashboard");
  } else {
    redirect("/staff/login");
  }
}
