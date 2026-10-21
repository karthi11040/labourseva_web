import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedActor } from "@/lib/staff-session";
import { getCitizenIdentity } from "@/lib/auth-helpers";
import { sendEmail } from "@/lib/email";
import { isPlaceholderEmail, isPlaceholderPersonName, normalizeAadhaarNumber, normalizePanNumber } from "@/lib/verification/validation";

function maskAadhaarNumber(value: unknown): string {
  const digits = normalizeAadhaarNumber(String(value || ""));
  return digits.length === 12 ? `XXXX XXXX ${digits.slice(-4)}` : "";
}

function maskPanNumber(value: unknown): string {
  const pan = normalizePanNumber(String(value || ""));
  return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan) ? `XXXXX${pan.slice(5, 9)}X` : "";
}

export async function POST(request: Request) {
  const actor = getAuthenticatedActor(request);

  try {
    const body = await request.json().catch(() => ({}));
    const userType = String(body.userType || "").toLowerCase();
    const citizen = userType === "customer" ? await getCitizenIdentity(request) : null;
    const userId = userType === "customer" ? Number(citizen?.customerId) : Number(body.userId);
    const applicantName = String(body.applicantName || "").trim();
    const phone = String(body.phone || citizen?.phone || "").trim();
    const email = body.email ? String(body.email).trim().toLowerCase() : null;
    const idType = String(body.idType || "Aadhaar").trim();
    const idNumber = String(body.idNumber || "").trim();
    const documentUrl = String(body.documentUrl || "").trim();
    const roleSpecificData = body.roleSpecificData || {};

    if (!["guest", "customer", "retailer", "user"].includes(userType)) {
      return NextResponse.json(
        { ok: false, error: "Invalid user type. Allowed types: guest, customer, retailer, user." },
        { status: 400 }
      );
    }

    if (!userId || isNaN(userId)) {
      return NextResponse.json(
        { ok: false, error: "A valid user ID is required." },
        { status: 400 }
      );
    }

    // Server-side authorization check:
    // A regular user can only submit for their own identity
    if (userType === "customer") {
      if (!citizen?.customerId) return NextResponse.json({ ok: false, error: "Please sign in before submitting verification." }, { status: 401 });
      if (String(citizen.customerId) !== String(userId)) {
        return NextResponse.json({ ok: false, error: "Access denied. You can only submit verification for your own account." }, { status: 403 });
      }
    } else if (actor.role !== "ADMIN" && actor.role !== "EMPLOYEE") {
      if (actor.role === "ANONYMOUS") {
        if (userType !== "guest") {
          return NextResponse.json({ ok: false, error: "Please sign in before submitting verification." }, { status: 401 });
        }
      } else {
        const actorType = actor.role.toLowerCase();
        if (actorType !== userType || String(actor.id) !== String(userId)) {
          return NextResponse.json(
            { ok: false, error: "Access denied. You can only submit verification for your own account." },
            { status: 403 }
          );
        }
      }
    }

    if (!applicantName) {
      return NextResponse.json({ ok: false, error: "Applicant name is required." }, { status: 400 });
    }
    if (!phone) {
      return NextResponse.json({ ok: false, error: "Phone number is required." }, { status: 400 });
    }
    if (!idNumber) {
      return NextResponse.json({ ok: false, error: "Identification document number is required." }, { status: 400 });
    }
    if (!documentUrl) {
      return NextResponse.json({ ok: false, error: "Document upload or URL is required." }, { status: 400 });
    }

    let oldStatus = "Not Submitted";
    let geography: {
      name: string;
      taluk: { name: string; district: { name: string } };
    } | null = null;
    let verificationFindings: Record<string, unknown>[] = [];

    // Update target table according to user type
    if (userType === "customer") {
      const panNumber = String(body.panNumber || "").trim();
      const panFile = String(body.panFile || "").trim();
      const aadhaarNumber = String(body.aadhaarNumber || idNumber || "").trim();
      const aadhaarFile = String(body.aadhaarFile || documentUrl || "").trim();
      const voterIdNumber = String(body.voterIdNumber || "").trim();
      const voterIdFile = String(body.voterIdFile || "").trim();
      const address = String(body.address || "").trim();
      const occupation = String(body.occupation || "").trim();
      const districtId = body.districtId ? Number(body.districtId) : null;
      const talukId = body.talukId ? Number(body.talukId) : null;
      const panchayatId = body.panchayatId ? Number(body.panchayatId) : null;

      const aadhaarDigits = normalizeAadhaarNumber(aadhaarNumber);
      const validAadhaar = /^\d{12}$/.test(aadhaarDigits);
      const normalizedPan = normalizePanNumber(panNumber);
      const validPan = /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(normalizedPan);
      const hasAadhaarDocument = Boolean(aadhaarFile);
      const hasPanDocument = Boolean(panFile);
      const dateOfBirth = String(body.dob || "");
      const dobParts = dateOfBirth.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      const parsedDob = dobParts ? new Date(Date.UTC(Number(dobParts[1]), Number(dobParts[2]) - 1, Number(dobParts[3]))) : null;
      const isRealDate = Boolean(parsedDob && dobParts && parsedDob.getUTCFullYear() === Number(dobParts[1]) && parsedDob.getUTCMonth() + 1 === Number(dobParts[2]) && parsedDob.getUTCDate() === Number(dobParts[3]));
      const adultCutoff = new Date();
      adultCutoff.setHours(0, 0, 0, 0);
      adultCutoff.setFullYear(adultCutoff.getFullYear() - 18);
      const cutoffDate = `${adultCutoff.getFullYear()}-${String(adultCutoff.getMonth() + 1).padStart(2, "0")}-${String(adultCutoff.getDate()).padStart(2, "0")}`;
      const isValidDate = isRealDate && dateOfBirth <= cutoffDate;
      const validPin = /^\d{6}$/.test(String(body.pincode || ""));

      if (applicantName.length < 2 || isPlaceholderPersonName(applicantName) || !isValidDate || !["male", "female", "other"].includes(String(body.gender || "").toLowerCase())) {
        return NextResponse.json({ ok: false, error: "Enter a valid full name, gender, and date of birth showing you are at least 18 years old." }, { status: 400 });
      }
      if (email && isPlaceholderEmail(email)) {
        return NextResponse.json({ ok: false, error: "Enter a real email address or leave the optional email field blank." }, { status: 400 });
      }
      if ((!hasAadhaarDocument && !hasPanDocument) || (hasAadhaarDocument && (!validAadhaar || !aadhaarFile || !aadhaarNumber)) || (hasPanDocument && (!validPan || !panFile || !panNumber))) {
        return NextResponse.json({ ok: false, error: "Upload at least one identity proof and provide the matching valid Aadhaar or PAN number." }, { status: 400 });
      }
      if (!validPin || !address) {
        return NextResponse.json({ ok: false, error: "Enter a residential address and valid 6-digit PIN code." }, { status: 400 });
      }
      if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.email))) {
        return NextResponse.json({ ok: false, error: "Enter a valid email address or leave it blank." }, { status: 400 });
      }
      if (body.alternatePhone && !/^\d{10}$/.test(String(body.alternatePhone).replace(/\D/g, ""))) {
        return NextResponse.json({ ok: false, error: "Enter a valid 10-digit alternate phone number or leave it blank." }, { status: 400 });
      }

      if (!occupation) {
        return NextResponse.json({ ok: false, error: "Enter your occupation." }, { status: 400 });
      }
      if (!districtId || !talukId || !panchayatId) {
        return NextResponse.json({ ok: false, error: "District, Taluk, and Panchayat are required." }, { status: 400 });
      }
      const selectedPanchayat = await prisma.panchayath.findFirst({
        where: { id: panchayatId, talukId, active: true },
        select: { id: true, taluk: { select: { districtId: true } } },
      });
      if (!selectedPanchayat || selectedPanchayat.taluk.districtId !== districtId) {
        return NextResponse.json({ ok: false, error: "The selected Panchayat does not belong to the selected Taluk and District." }, { status: 400 });
      }

      const duplicateIdentifiers = await prisma.$queryRawUnsafe<any[]>(
        `SELECT id,
                CASE
                  WHEN ? <> '' AND (
                    REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(aadhar_no, ''), '-', ''), ' ', ''), '.', ''), '/', '') = ? OR
                    REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(aadhaar_no, ''), '-', ''), ' ', ''), '.', ''), '/', '') = ?
                  ) THEN 'AADHAAR'
                  ELSE 'PAN'
                END AS match_type
         FROM customers
         WHERE id <> ? AND (
           (? <> '' AND (
             REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(aadhar_no, ''), '-', ''), ' ', ''), '.', ''), '/', '') = ? OR
             REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(aadhaar_no, ''), '-', ''), ' ', ''), '.', ''), '/', '') = ?
           )) OR
           (? <> '' AND UPPER(REPLACE(REPLACE(TRIM(COALESCE(pan_no, '')), ' ', ''), '-', '')) = ?)
         )
         LIMIT 20`,
        validAadhaar ? aadhaarDigits : "", aadhaarDigits, aadhaarDigits,
        userId,
        validAadhaar ? aadhaarDigits : "", aadhaarDigits, aadhaarDigits,
        validPan ? normalizedPan : "", normalizedPan
      );
      const seenIdentifierFindings = new Set<string>();
      for (const duplicate of duplicateIdentifiers) {
        const matchType = String(duplicate.match_type || "IDENTIFIER");
        const findingKey = `${matchType}:${duplicate.id}`;
        if (seenIdentifierFindings.has(findingKey)) continue;
        seenIdentifierFindings.add(findingKey);
        verificationFindings.push({
          code: "POTENTIAL_DUPLICATE_IDENTIFIER",
          category: matchType === "AADHAAR" ? "aadhaar" : "pan",
          severity: "high",
          confidence: "exact",
          classification: "exact_identifier_match",
          blocksAutomaticApproval: true,
          manualReviewRequired: true,
          internalMatchedRecordId: String(duplicate.id),
        });
      }

      const submittedFiles = [
        ["aadhaar", aadhaarFile],
        ["pan", panFile],
        ["voterId", voterIdFile],
      ] as const;
      for (const [docType, documentReference] of submittedFiles) {
        if (!documentReference) continue;
        let storageKey = "";
        try {
          const documentUrl = new URL(documentReference, request.url);
          if (documentUrl.pathname === "/api/verification/document") {
            storageKey = documentUrl.searchParams.get("file") || "";
          }
        } catch { /* legacy URL; no local digest registry entry */ }
        if (!storageKey) continue;

        const ownerPrefix = `${userId}-${docType}-`;
        if (!storageKey.startsWith(ownerPrefix)) {
          return NextResponse.json({ ok: false, error: "Upload your own identity document through your profile before submitting." }, { status: 400 });
        }
        const [artifact] = await prisma.$queryRawUnsafe<any[]>(
          `SELECT owner_type, owner_id, doc_type, sha256 FROM verification_document_artifacts WHERE storage_key = ? LIMIT 1`,
          storageKey
        );
        if (!artifact) continue; // Existing documents from before digest tracking remain eligible for staff review.
        if (artifact.owner_type !== "customer" || String(artifact.owner_id) !== String(userId) || artifact.doc_type !== docType) {
          return NextResponse.json({ ok: false, error: "Upload your own identity document through your profile before submitting." }, { status: 400 });
        }
        const duplicateFiles = await prisma.$queryRawUnsafe<any[]>(
          `SELECT owner_id, doc_type FROM verification_document_artifacts
           WHERE sha256 = ? AND NOT (owner_type = 'customer' AND owner_id = ?)
           LIMIT 1`,
          artifact.sha256,
          String(userId)
        );
        if (duplicateFiles.length) {
          verificationFindings.push({
            code: "POTENTIAL_DUPLICATE_DOCUMENT",
            category: docType,
            matchedDocumentType: String(duplicateFiles[0].doc_type || "unknown"),
            severity: "medium",
            confidence: "exact_file_digest",
            classification: "identical_file_bytes",
            blocksAutomaticApproval: true,
            manualReviewRequired: true,
            internalMatchedRecordId: String(duplicateFiles[0].owner_id),
          });
        }
      }

      const manualReviewNote = verificationFindings.length
        ? "Additional verification review is required. Some submitted information or documents need review."
        : null;
      geography = await prisma.panchayath.findUnique({
        where: { id: panchayatId },
        select: { name: true, taluk: { select: { name: true, district: { select: { name: true } } } } },
      });

      const [existing] = await prisma.$queryRawUnsafe<any[]>(
        `SELECT id, verification_status FROM customers WHERE id = ? LIMIT 1`,
        userId
      );
      if (existing) {
        oldStatus = existing.verification_status || "Pending";
        await prisma.$queryRawUnsafe(
          `UPDATE customers
           SET verification_status = 'Pending', status = 'pending',
               verification_note = NULL,
               rejection_reason = NULL,
               full_name = COALESCE(?, full_name),
               phone = COALESCE(?, phone),
               aadhar_no = ?,
               aadhar_file = ?, pan_no = ?, pan_file = ?, address = ?, dist_id = ?, taluk_id = ?, panchayath_id = ?, email = COALESCE(?, email)
           WHERE id = ?`,
          applicantName,
          phone,
          aadhaarNumber,
          aadhaarFile,
          panNumber,
          panFile,
          address,
          districtId,
          talukId,
          panchayatId,
          email,
          userId
        );

        try {
          await prisma.$queryRawUnsafe(
            `INSERT INTO kyc_documents (user_id, user_type, pan_number, pan_file, aadhaar_number, aadhaar_file, voter_id_number, voter_id_file, address, district_id, taluk_id, submitted_at, updated_at)
             VALUES (?, 'customer', ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
             ON DUPLICATE KEY UPDATE
               pan_number = VALUES(pan_number),
               pan_file = VALUES(pan_file),
               aadhaar_number = VALUES(aadhaar_number),
               aadhaar_file = VALUES(aadhaar_file),
               voter_id_number = VALUES(voter_id_number),
               voter_id_file = VALUES(voter_id_file),
               address = VALUES(address),
               district_id = VALUES(district_id),
               taluk_id = VALUES(taluk_id),
               updated_at = NOW()`,
            userId, panNumber, panFile, aadhaarNumber, aadhaarFile, voterIdNumber, voterIdFile, address, districtId, talukId
          );
        } catch (kycErr) {
          // kyc_documents is optional supplemental storage; customer record already stores aadhaar_no and aadhar_file
        }
      } else {
        await prisma.$executeRawUnsafe(
          `INSERT INTO customers (id, full_name, phone, email, aadhar_no, aadhar_file, dist_id, taluk_id, panchayath_id, verification_status, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', 'pending', NOW())`,
          userId,
          applicantName,
          phone,
          email,
          aadhaarNumber,
          aadhaarFile,
          districtId,
          talukId,
          panchayatId
        );

        try {
          await prisma.$queryRawUnsafe(
            `INSERT INTO kyc_documents (user_id, user_type, pan_number, pan_file, aadhaar_number, aadhaar_file, voter_id_number, voter_id_file, address, district_id, taluk_id, submitted_at, updated_at)
             VALUES (?, 'customer', ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            userId, panNumber, panFile, aadhaarNumber, aadhaarFile, voterIdNumber, voterIdFile, address, districtId, talukId
          );
        } catch {}
      }
      await prisma.$executeRawUnsafe(
        `UPDATE customers SET verification_note = ? WHERE id = ?`,
        manualReviewNote,
        userId
      );
    } else if (userType === "guest") {
      const [existing] = await prisma.$queryRawUnsafe<any[]>(
        `SELECT id, verification_status FROM guests WHERE id = ? LIMIT 1`,
        userId
      );
      if (existing) {
        oldStatus = existing.verification_status || "Pending";
        await prisma.$executeRawUnsafe(
          `UPDATE guests
           SET verification_status = 'Pending',
               rejection_reason = NULL,
               name = COALESCE(?, name),
               phone = COALESCE(?, phone),
               aadhar_number = ?,
               aadhar_path = ?,
               kyc_submitted_at = NOW()
           WHERE id = ?`,
          applicantName,
          phone,
          idNumber,
          documentUrl,
          userId
        );
      } else {
        await prisma.$executeRawUnsafe(
          `INSERT INTO guests (id, name, phone, email, aadhar_number, aadhar_path, verification_status, status, kyc_submitted_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?, 'Pending', 'active', NOW(), NOW())`,
          userId,
          applicantName,
          phone,
          email,
          idNumber,
          documentUrl
        );
      }
    } else if (userType === "retailer") {
      const [existing] = await prisma.$queryRawUnsafe<any[]>(
        `SELECT id, status FROM retailers WHERE id = ? LIMIT 1`,
        userId
      );
      if (existing) {
        oldStatus = existing.status || "pending";
        await prisma.$executeRawUnsafe(
          `UPDATE retailers
           SET status = 'pending',
               name = COALESCE(?, name),
               phone = COALESCE(?, phone)
           WHERE id = ?`,
          applicantName,
          phone,
          userId
        );
      } else {
        await prisma.$executeRawUnsafe(
          `INSERT INTO retailers (id, name, email, phone, password, status, created_at)
           VALUES (?, ?, ?, ?, 'pending_verification', 'pending', NOW())`,
          userId,
          applicantName,
          email || `${phone}@retailer.local`,
          phone
        );
      }
    } else if (userType === "user") {
      const [existing] = await prisma.$queryRawUnsafe<any[]>(
        `SELECT id, status FROM users WHERE id = ? LIMIT 1`,
        userId
      );
      if (existing) {
        oldStatus = existing.status || "pending";
        await prisma.$executeRawUnsafe(
          `UPDATE users
           SET status = 'pending',
               is_approved = 0,
               full_name = COALESCE(?, full_name),
               phone = COALESCE(?, phone)
           WHERE id = ?`,
          applicantName,
          phone,
          userId
        );
      } else {
        await prisma.$executeRawUnsafe(
          `INSERT INTO users (id, full_name, phone, email, status, role, wallet_balance, is_approved, created_at)
           VALUES (?, ?, ?, ?, 'pending', 'user', 0.00, 0, NOW())`,
          userId,
          applicantName,
          phone,
          email,
          userId
        );
      }
    }

    // 2. Insert into unified audit log: kyc_audit_logs
    const profileSnapshot = userType === "customer" ? {
      applicantName, phone, email, idType,
      idNumber: idType.toLowerCase().includes("aadhaar") ? maskAadhaarNumber(idNumber) : maskPanNumber(idNumber),
      documentUrl,
      panNumber: maskPanNumber(body.panNumber), panFile: body.panFile,
      aadhaarNumber: maskAadhaarNumber(body.aadhaarNumber), aadhaarFile: body.aadhaarFile,
      voterIdNumber: String(body.voterIdNumber || "").trim() ? `••••${String(body.voterIdNumber).slice(-4)}` : "", voterIdFile: body.voterIdFile,
      address: body.address, districtId: body.districtId, districtName: geography?.taluk.district.name, talukId: body.talukId, talukName: geography?.taluk.name, panchayatId: body.panchayatId, panchayatName: geography?.name,
      fullNameTamil: body.fullNameTamil, dob: body.dob, gender: body.gender,
      fatherName: body.fatherName, motherName: body.motherName,
      maritalStatus: body.maritalStatus, category: body.category,
      differentlyAbled: body.differentlyAbled, occupation: body.occupation,
      occupationFile: body.occupationFile, annualIncome: body.annualIncome,
      alternatePhone: body.alternatePhone, pincode: body.pincode,
      villageTown: body.villageTown, residenceType: body.residenceType,
      bankAccountName: body.bankAccountName,
      bankAccountNumber: String(body.bankAccountNumber || "").trim() ? `••••${String(body.bankAccountNumber).slice(-4)}` : "",
      bankIfsc: body.bankIfsc, bankName: body.bankName, bankBranch: body.bankBranch,
      verificationFindings,
    } : roleSpecificData;
    const notes = `Verification profile: ${JSON.stringify(profileSnapshot || {})}`;

    await prisma.$executeRawUnsafe(
      `INSERT INTO kyc_audit_logs (user_type, user_id, admin_id, action_performed, old_status, new_status, notes, ip_address, created_at)
       VALUES (?, ?, 0, 'submit_verification', ?, 'Pending', ?, '127.0.0.1', NOW())`,
      userType,
      userId,
      oldStatus,
      notes
    );

    let notificationRecipients: { email: string; link: string }[] = [];
    if (userType === "customer") {
      const staffRecipients = await prisma.$queryRawUnsafe<{ email: string | null }[]>(
        `SELECT email FROM employees WHERE status = 'active' AND email IS NOT NULL AND email <> ''`
      ).catch(() => []);
      const emails = new Set<string>();
      const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
      if (adminEmail) {
        emails.add(adminEmail);
        notificationRecipients.push({ email: adminEmail, link: "/admin/verification?userType=customer&status=pending" });
      }
      for (const employee of staffRecipients) {
        const email = employee.email?.trim().toLowerCase();
        if (!email || emails.has(email)) continue;
        emails.add(email);
        notificationRecipients.push({ email, link: "/staff/verification?userType=customer&status=pending" });
      }
    }

    const safeApplicantName = applicantName.replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[character] || character);
    const notificationResults = await Promise.all(notificationRecipients.map(async ({ email: recipient, link }) => {
      const reviewUrl = new URL(link, process.env.NEXT_PUBLIC_APP_URL || request.url).toString();
      const result = await sendEmail({
        to: recipient,
        subject: "Citizen verification request awaiting review",
        text: `A citizen verification request for ${applicantName} is awaiting review. Open ${reviewUrl}`,
        html: `<p>A citizen verification request is awaiting review.</p><p>Applicant: <strong>${safeApplicantName}</strong></p><p><a href="${reviewUrl}">Open the verification queue</a></p>`,
      });
      return result.success;
    }));
    const notificationCount = notificationResults.filter(Boolean).length;

    return NextResponse.json({
      ok: true,
      message: notificationCount
        ? `Verification request submitted and queued for review. Email notifications sent to ${notificationCount} reviewer(s).`
        : "Verification request submitted and queued for review. Email notifications could not be sent; reviewers can access it in the verification queue.",
      status: "Pending",
      reviewRequired: verificationFindings.some((finding) => finding.manualReviewRequired === true),
      userType,
      userId,
      notificationsSent: notificationCount,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to submit verification request." },
      { status: 500 }
    );
  }
}
