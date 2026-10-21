import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedActor } from "@/lib/staff-session";
import { getCitizenIdentity } from "@/lib/auth-helpers";

export async function GET(request: Request) {
  const actor = getAuthenticatedActor(request);
  const { searchParams } = new URL(request.url);

  const userType = (searchParams.get("userType") || "customer").toLowerCase();
  const citizen = userType === "customer" ? await getCitizenIdentity(request) : null;
  const requestedUserId = searchParams.get("userId") ? Number(searchParams.get("userId")) : (citizen?.customerId ? Number(citizen.customerId) : NaN);
  const userId = requestedUserId;

  if (!userId || isNaN(userId)) {
    return NextResponse.json(
      { ok: false, error: "A valid user ID parameter is required." },
      { status: 400 }
    );
  }

  // Strict Server-Side Access Control:
  // Staff (Super Admin & Employee) can view any verification status.
  // End users can ONLY view their own verification request.
  if (userType === "customer") {
    if (!citizen?.customerId) return NextResponse.json({ ok: false, error: "Please authenticate to view verification status." }, { status: 401 });
    if (String(citizen.customerId) !== String(userId)) {
      return NextResponse.json(
        { ok: false, error: "Access denied. You are blocked from viewing another user's verification request." },
        { status: 403 }
      );
    }
  } else if (actor.role !== "ADMIN" && actor.role !== "EMPLOYEE") {
    if (actor.role === "ANONYMOUS") {
      // If anonymous, check if caller provided matching session cookie or identity
      return NextResponse.json(
        { ok: false, error: "Unauthorized. Please authenticate to view verification status." },
        { status: 401 }
      );
    }

    const actorType = actor.role.toLowerCase();
    if (actorType !== userType || String(actor.id) !== String(userId)) {
      return NextResponse.json(
        { ok: false, error: "Access denied. You are blocked from viewing another user's verification request." },
        { status: 403 }
      );
    }
  }

  try {
    let applicantData: any = null;
    let currentStatus = "Not Submitted";
    let notes = "";
    let rejectionReason = "";
    let idType = "Aadhaar Card";
    let idNumber = "";
    let documentUrl = "";

    if (userType === "customer") {
      const [cust] = await prisma.$queryRawUnsafe<any[]>(
        `SELECT id, full_name, phone, email, aadhar_no, aadhar_file, verification_status, verification_note, rejection_reason
         FROM customers WHERE id = ? LIMIT 1`,
        userId
      );
      if (cust) {
        applicantData = cust;
        currentStatus = cust.verification_status || "Pending";
        notes = cust.verification_note || "";
        rejectionReason = cust.rejection_reason || "";
        idNumber = cust.aadhar_no || "";
        documentUrl = cust.aadhar_file || "";
      }
    } else if (userType === "guest") {
      const [gst] = await prisma.$queryRawUnsafe<any[]>(
        `SELECT id, name, phone, email, aadhar_number, aadhar_path, verification_status, rejection_reason
         FROM guests WHERE id = ? LIMIT 1`,
        userId
      );
      if (gst) {
        applicantData = gst;
        currentStatus = gst.verification_status || "Pending";
        rejectionReason = gst.rejection_reason || "";
        idNumber = gst.aadhar_number || "";
        documentUrl = gst.aadhar_path || "";
      }
    } else if (userType === "retailer") {
      const [ret] = await prisma.$queryRawUnsafe<any[]>(
        `SELECT id, name, phone, email, status FROM retailers WHERE id = ? LIMIT 1`,
        userId
      );
      if (ret) {
        applicantData = ret;
        currentStatus = ret.status === "active" ? "Approved" : ret.status === "pending" ? "Pending" : "Rejected";
      }
    } else if (userType === "user") {
      const [usr] = await prisma.$queryRawUnsafe<any[]>(
        `SELECT id, full_name, phone, email, status, is_approved FROM users WHERE id = ? LIMIT 1`,
        userId
      );
      if (usr) {
        applicantData = usr;
        currentStatus = usr.is_approved === 1 ? "Approved" : usr.status === "active" ? "Approved" : "Pending";
      }
    }

    if (!applicantData) {
      return NextResponse.json(
        { ok: false, error: "Record not found for the specified user ID." },
        { status: 404 }
      );
    }

    // Retrieve audit trail of all status changes for this user
    const auditHistory = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, user_type, user_id, admin_id, action_performed, old_status, new_status, notes, created_at
       FROM kyc_audit_logs
       WHERE user_type = ? AND user_id = ?
       ORDER BY created_at DESC, id DESC`,
      userType,
      userId
    );

    let profileData: Record<string, any> = {};
    if (userType === "customer") {
      const latestSubmission = auditHistory.find((entry) => ["submit_verification", "save_profile_draft"].includes(entry.action_performed));
      try {
        const raw = String(latestSubmission?.notes || "");
        const prefix = raw.startsWith("Verification profile draft: ") ? "Verification profile draft: " : "Verification profile: ";
        const snapshot = raw.startsWith(prefix) ? raw.slice(prefix.length) : "{}";
        profileData = JSON.parse(snapshot);
      } catch { profileData = {}; }
      // Duplicate signals are internal reviewer metadata; never return matched account references to applicants.
      delete profileData.verificationFindings;
    }

    return NextResponse.json({
      ok: true,
      userType,
      userId,
      applicantName: applicantData.full_name || applicantData.name || "Applicant",
      phone: applicantData.phone || "",
      email: applicantData.email || "",
      currentStatus,
      hasSubmitted: auditHistory.some((item) => item.action_performed === "submit_verification"),
      statusNote: notes,
      rejectionReason,
      idType,
      idNumber,
      documentUrl,
      profileData,
      history: auditHistory.map((item) => ({
        id: item.id,
        action: item.action_performed,
        oldStatus: item.old_status,
        newStatus: item.new_status,
        changedBy: item.admin_id === 0 ? "Applicant" : `Staff #${item.admin_id}`,
        notes: ["submit_verification", "save_profile_draft"].includes(item.action_performed)
          ? (item.action_performed === "submit_verification" ? "Verification request submitted." : "Profile draft saved.")
          : item.notes || "",
        changedAt: item.created_at,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to retrieve verification status." },
      { status: 500 }
    );
  }
}
