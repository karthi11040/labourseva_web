import { NextResponse } from "next/server";
import { staffSessionCookieName } from "@/lib/staff-session";

export async function POST() {
  const response = NextResponse.json({ ok: true, message: "Logged out successfully." });
  response.cookies.set({
    name: staffSessionCookieName,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
