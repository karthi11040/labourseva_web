import { NextResponse } from "next/server";
import { CITIZEN_COOKIE_NAME } from "@/lib/citizen-session";
import { RETAILER_COOKIE_NAME } from "@/lib/retailer-session";
import { DISTRIBUTOR_COOKIE_NAME } from "@/lib/distributor-session";
import { adminSessionCookieName } from "@/lib/admin-session";
import { staffSessionCookieName } from "@/lib/staff-session";

export const dynamic = "force-dynamic";

export async function POST() {
  const response = NextResponse.json({ ok: true, message: "Signed out successfully." });

  // Clear all portal session cookies
  const cookiesToClear = [
    CITIZEN_COOKIE_NAME,
    RETAILER_COOKIE_NAME,
    DISTRIBUTOR_COOKIE_NAME,
    adminSessionCookieName,
    staffSessionCookieName,
    "labourseva-auth-token",
  ];

  for (const name of cookiesToClear) {
    response.cookies.set(name, "", {
      path: "/",
      maxAge: 0,
      expires: new Date(0),
    });
  }

  return response;
}
