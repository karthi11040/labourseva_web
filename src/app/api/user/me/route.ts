import { NextRequest, NextResponse } from "next/server";
import { getCitizenIdentity } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const me = await getCitizenIdentity(request);
  if (!me) {
    return NextResponse.json({ ok: false, error: "Please sign in to continue." }, { status: 401 });
  }
  return NextResponse.json({ ok: true, profile: me });
}
