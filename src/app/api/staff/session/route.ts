import { NextResponse } from "next/server";
import { getAuthenticatedActor } from "@/lib/staff-session";

export async function GET(request: Request) {
  const actor = getAuthenticatedActor(request);
  if (actor.role !== "EMPLOYEE" && actor.role !== "ADMIN") {
    return NextResponse.json({ ok: false, authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    authenticated: true,
    actor: {
      id: actor.id,
      name: actor.name,
      email: actor.email,
      role: actor.role,
      canVerify: actor.canVerify,
    },
  });
}
