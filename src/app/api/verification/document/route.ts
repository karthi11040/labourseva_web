import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getCitizenIdentity, getAuthRetailer } from "@/lib/auth-helpers";
import { getAuthenticatedActor } from "@/lib/staff-session";

const PRIVATE_UPLOAD_DIR = path.join(process.cwd(), "data", "private", "kyc");

export async function GET(request: NextRequest) {
  const filename = new URL(request.url).searchParams.get("file") || "";
  if (!/^[0-9]+-(pan|aadhaar|voterId|occupation|es-passport-photo|es-aadhaar-front|es-aadhaar-back|es-ration-card|es-signature|es-house-tax-receipt|es-service-file|retailer-pan|retailer-aadhaar|retailer-business|retailer-shop-photo)-[0-9a-f-]+\.(pdf|jpg|png)$/i.test(filename)) {
    return NextResponse.json({ ok: false, error: "Document not found." }, { status: 404 });
  }

  const actor = getAuthenticatedActor(request);
  let allowed = actor.role === "ADMIN" || actor.role === "EMPLOYEE";
  if (actor.role === "EMPLOYEE" && actor.canVerify === false) allowed = false;
  if (!allowed) {
    const ownerId = filename.split("-", 1)[0];
    const citizen = await getCitizenIdentity(request);
    const retailer = citizen ? null : await getAuthRetailer(request);
    allowed = String(citizen?.customerId || retailer?.id || "") === ownerId;
  }
  if (!allowed) return NextResponse.json({ ok: false, error: "You are not authorized to view this document." }, { status: 403 });

  try {
    const bytes = await readFile(path.join(PRIVATE_UPLOAD_DIR, filename));
    const contentType = filename.toLowerCase().endsWith(".pdf") ? "application/pdf" : filename.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Document not found." }, { status: 404 });
  }
}
