import { NextResponse } from "next/server";
import { getAuthenticatedActor } from "@/lib/staff-session";
import { createHmac } from "node:crypto";
import { getCustomerDocumentDigest } from "@/lib/verification/customer-document-digest";

export const dynamic = "force-dynamic";
const EXAMINATION_TTL_MS = 5 * 60 * 1000;

export async function POST(request: Request) {
  const actor = getAuthenticatedActor(request);
  if (actor.role !== "ADMIN" && actor.role !== "EMPLOYEE") {
    return NextResponse.json({ ok: false, error: "Only authorized staff can examine verification cases." }, { status: 403 });
  }
  if (actor.role === "EMPLOYEE" && actor.canVerify === false) {
    return NextResponse.json({ ok: false, error: "Your employee account does not have verification permissions." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const userType = String(body.userType || "").toLowerCase();
  const userId = Number(body.userId);
  const action = String(body.action || "").toUpperCase();
  if (!userType || !Number.isSafeInteger(userId) || userId <= 0 || !["APPROVE", "REJECT", "REQUEST_DOCS"].includes(action)) {
    return NextResponse.json({ ok: false, error: "A valid case and review action are required." }, { status: 400 });
  }

  try {
    let documentDigest = "none";
    let documentCount = 0;
    if (userType === "customer" || userType === "retailer") {
      const fingerprint = await getCustomerDocumentDigest(userId, userType === "retailer" ? "retailer" : "customer");
      documentDigest = fingerprint.digest;
      documentCount = fingerprint.documentCount;
    }
    const issuedAt = Date.now();
    const secret = process.env.STAFF_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "secure-labourseva-verification-review-2026";
    const signature = createHmac("sha256", secret).update(`${issuedAt}:${actor.role}:${actor.id}:${userType}:${userId}:${action}:${documentDigest}`).digest("hex");
    return NextResponse.json({ ok: true, examinationToken: `${issuedAt}.${signature}.${documentDigest}`, expiresAt: issuedAt + EXAMINATION_TTL_MS, documentCount });
  } catch {
    return NextResponse.json({ ok: false, error: "Could not fingerprint the current uploaded documents. Try again." }, { status: 503 });
  }
}
