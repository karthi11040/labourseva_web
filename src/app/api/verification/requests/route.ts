import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedActor } from "@/lib/staff-session";
import { ensureRetailerShopPhotos } from "@/lib/retailer-shop-photos";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const actor = getAuthenticatedActor(request);

  // Strict RBAC: Staff (Super Admin & Employee) only
  if (actor.role !== "ADMIN" && actor.role !== "EMPLOYEE") {
    return NextResponse.json(
      { ok: false, error: "Access denied. Only Super Administrators and Employees can view the verification queue." },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const typeFilter = searchParams.get("userType")?.toLowerCase() || "all";
  const statusFilter = searchParams.get("status")?.toLowerCase() || "all";
  const search = searchParams.get("search")?.trim().toLowerCase() || "";

  try {
    const results: any[] = [];

    // 1. Walk-in Guests (from `guests` table)
    if (typeFilter === "all" || typeFilter === "guest" || typeFilter === "user") {
      const guests = await prisma.$queryRawUnsafe<any[]>(
        `SELECT id, name, email, phone, aadhar_number, pan_number, ration_number,
                aadhar_path, voter_path, license_path, id_proof_path,
                verification_status, rejection_reason, kyc_submitted_at, created_at, address
         FROM guests
         ORDER BY id DESC LIMIT 100`
      );

      for (const g of guests) {
        const status = g.verification_status || "Pending";
        const docUrl = g.aadhar_path || g.voter_path || g.license_path || g.id_proof_path || null;
        const idNum = g.aadhar_number || g.pan_number || g.ration_number || "";

        results.push({
          id: g.id,
          userType: "guest",
          applicantName: g.name || "Guest Applicant",
          phone: g.phone || "",
          email: g.email || "",
          address: g.address || "",
          idType: g.aadhar_path || g.aadhar_number ? "Aadhaar Card" : g.pan_number ? "PAN Card" : "Government ID",
          idNumber: idNum ? `••••${String(idNum).replace(/\D/g, "").slice(-4)}` : "",
          documentUrl: docUrl,
          hasDocument: Boolean(docUrl),
          status,
          statusNote: g.rejection_reason || "",
          rejectionReason: g.rejection_reason || "",
          submittedAt: g.kyc_submitted_at || g.created_at,
        });
      }
    }

    // 2. Retail CSC Agents (from `retail_users` table)
    if (typeFilter === "all" || typeFilter === "retailer") {
      const retailers = await prisma.$queryRawUnsafe<any[]>(
        `SELECT ru.id, ru.name, ru.shop_name, ru.business_type, ru.shop_url, ru.gst_no, ru.email, ru.phone, ru.pan_no, ru.aadhaar_no, ru.ration_no,
                ru.documents_path, ru.aadhar_doc, ru.pan_doc, ru.ration_doc, ru.shop_image,
                ru.status, ru.rejection_reason, ru.verification_note, ru.address, ru.district_id, ru.taluk_id, ru.panchayat_id, ru.created_at,
                COALESCE(d.name_en, d.name) AS district_name, t.name AS taluk_name, p.name AS panchayat_name
         FROM retail_users ru
         LEFT JOIN districts d ON d.id = ru.district_id
         LEFT JOIN taluks t ON t.id = ru.taluk_id
         LEFT JOIN panchayaths p ON p.id = ru.panchayat_id
         WHERE COALESCE(LOWER(ru.status), 'pending') <> 'pending_approval'
           AND (COALESCE(LOWER(ru.status), 'pending') <> 'pending' OR COALESCE(ru.verification_note, '') <> '')
         ORDER BY ru.id DESC LIMIT 100`
      ).catch(async (error: any) => {
        if (!String(error?.message || "").includes("shop_url")) throw error;
        return prisma.$queryRawUnsafe<any[]>(
          `SELECT id, name, shop_name, business_type, email, phone, pan_no, aadhaar_no, ration_no,
                  documents_path, aadhar_doc, pan_doc, ration_doc, shop_image,
                  status, rejection_reason, verification_note, address, district_id, taluk_id, panchayat_id, created_at
           FROM retail_users
           WHERE COALESCE(LOWER(status), 'pending') <> 'pending_approval'
             AND (COALESCE(LOWER(status), 'pending') <> 'pending' OR COALESCE(verification_note, '') <> '')
           ORDER BY id DESC LIMIT 100`
        ).then((rows) => rows.map((row) => ({ ...row, shop_url: null, gst_no: null })));
      });

      if (retailers.length) await ensureRetailerShopPhotos(Number(retailers[0].id));
      const photoRows = retailers.length
        ? await prisma.$queryRawUnsafe<any[]>("SELECT retailer_id, photo_url FROM retailer_shop_photos")
        : [];
      const photosByRetailer = new Map<number, string[]>();
      for (const photo of photoRows) {
        const ownerId = Number(photo.retailer_id);
        photosByRetailer.set(ownerId, [...(photosByRetailer.get(ownerId) || []), String(photo.photo_url)]);
      }

      for (const r of retailers) {
        const status = r.status || "Pending";
        const docUrl = r.documents_path || r.aadhar_doc || r.pan_doc || r.ration_doc || r.shop_image || null;
        const idNum = r.aadhaar_no || r.pan_no || r.ration_no || "";
        const photos = photosByRetailer.get(Number(r.id)) || (r.shop_image ? [String(r.shop_image)] : []);
        results.push({
          id: r.id,
          userType: "retailer",
          applicantName: r.name || r.shop_name || "Retail CSC Agent",
          phone: r.phone || "",
          email: r.email || "",
          address: r.address || "",
          shopName: r.shop_name || "",
          profileData: {
            operatorName: r.name || "",
            phone: r.phone || "",
            email: r.email || "",
            address: r.address || "",
            districtName: r.district_name || r.district_id || "",
            talukName: r.taluk_name || r.taluk_id || "",
            panchayatName: r.panchayat_name || r.panchayat_id || "",
            shopName: r.shop_name || "",
            businessType: r.business_type || "",
            shopUrl: r.shop_url || "",
            gstNo: r.gst_no || "",
            panDocument: r.pan_doc || "",
            aadhaarDocument: r.aadhar_doc || "",
            businessDocument: r.ration_doc || "",
            shopPhoto: photos[0] || r.shop_image || "",
            shopPhotos: photos.length ? photos : r.shop_image ? [r.shop_image] : [],
          },
          idType: "Retailer KYC (Aadhaar / PAN)",
          idNumber: idNum,
          documentUrl: docUrl,
          hasDocument: Boolean(docUrl),
          status,
          statusNote: r.verification_note || r.rejection_reason || "",
          rejectionReason: r.rejection_reason || "",
          submittedAt: r.created_at,
        });
      }
    }

    // 3. Distributors (from `distributors` table)
    if (typeFilter === "all" || typeFilter === "distributor" || typeFilter === "user") {
      const distributors = await prisma.$queryRawUnsafe<any[]>(
        `SELECT id, name, registration_no, email, phone, aadhaar_no, pan_no,
                aadhaar_photo, pan_photo, address, verification_status, rejection_reason,
                is_approved, created_at
         FROM distributors
         ORDER BY id DESC LIMIT 100`
      );

      for (const d of distributors) {
        const status = d.verification_status || (d.is_approved ? "Approved" : "Pending");
        const docUrl = d.aadhaar_photo || d.pan_photo || null;
        const idNum = d.aadhaar_no || d.pan_no || d.registration_no || "";

        results.push({
          id: d.id,
          userType: "distributor",
          applicantName: d.name || "Distributor Partner",
          phone: d.phone || "",
          email: d.email || "",
          address: d.address || "",
          idType: "Distributor KYC (Aadhaar / PAN)",
          idNumber: idNum,
          documentUrl: docUrl,
          hasDocument: Boolean(docUrl),
          status,
          statusNote: d.rejection_reason || "",
          rejectionReason: d.rejection_reason || "",
          submittedAt: d.created_at,
        });
      }

      // Also include pending registrations if any
      const pendingReg = await prisma.$queryRawUnsafe<any[]>(
        `SELECT id, account_type, full_name, shop_name, phone, email, aadhar, pan, address, pincode, created_at
         FROM pending_registrations
         ORDER BY id DESC LIMIT 50`
      );

      for (const p of pendingReg) {
        const type = p.account_type === "distributor" ? "distributor" : "retailer";
        const belongsInSelectedTab = typeFilter === "all" || typeFilter === type || (typeFilter === "user" && type === "distributor");
        if (belongsInSelectedTab) {
          results.push({
            id: p.id,
            userType: type,
            recordSource: "pending_registration",
            applicantName: p.full_name || p.shop_name || "Registration Applicant",
            phone: p.phone || "",
            email: p.email || "",
            address: `${p.address || ""} ${p.pincode ? "- " + p.pincode : ""}`.trim(),
            shopName: p.shop_name || "",
            idType: `Registration (${p.account_type || "Partner"})`,
            idNumber: p.aadhar || p.pan || "",
            documentUrl: null,
            hasDocument: false,
            status: "Pending",
            statusNote: "Registration fee submitted, identity verification pending",
            rejectionReason: "",
            submittedAt: p.created_at,
          });
        }
      }
    }

    // 4. Registered Workers / Citizens (from `customers` table)
    if (typeFilter === "all" || typeFilter === "customer") {
      const submissions = await prisma.$queryRawUnsafe<any[]>(
        `SELECT user_id, action_performed, notes FROM kyc_audit_logs
         WHERE user_type = 'customer' AND action_performed IN ('submit_verification','save_profile_draft')
         ORDER BY id DESC`
      ).catch(() => []);
      const profileByCustomer = new Map<string, any>();
      for (const submission of submissions) {
        const key = String(submission.user_id);
        try {
          const raw = String(submission.notes || "");
          const prefix = submission.action_performed === "save_profile_draft" ? "Verification profile draft: " : "Verification profile: ";
          if (!raw.startsWith(prefix)) continue;
          const profile = JSON.parse(raw.slice(prefix.length));
          profileByCustomer.set(key, { ...profile, ...(profileByCustomer.get(key) || {}) });
        } catch {}
      }
      const customers = await prisma.$queryRawUnsafe<any[]>(
        `SELECT id, full_name, email, phone, aadhar_no, aadhar_file, aadhaar_no, aadhaar_file,
                registration_no, verification_status, verification_note, rejection_reason, address, created_at
         FROM customers
         ORDER BY id DESC LIMIT 100`
      );

      for (const c of customers) {
        const status = c.verification_status || "Pending";
        const docUrl = c.aadhar_file || c.aadhaar_file || null;
        const idNum = c.aadhar_no || c.aadhaar_no || c.registration_no || "";

        // Check if name is clean or legacy base64 cipher
        const rawName = String(c.full_name || "").trim();
        const isCipher = rawName.includes("==") || (rawName.length > 40 && !rawName.includes(" "));
        const displayName = isCipher
          ? (c.registration_no ? `Citizen (${c.registration_no})` : `Citizen #${c.id}`)
          : (rawName || `Citizen #${c.id}`);

        const rawPhone = String(c.phone || "").trim();
        const cleanPhone = rawPhone.length > 20 || rawPhone.includes("==") ? "" : rawPhone;

        const rawEmail = String(c.email || "").trim();
        const cleanEmail = rawEmail.includes("==") || !rawEmail.includes("@") ? "" : rawEmail;

        const rawAddr = String(c.address || "").trim();
        const cleanAddr = rawAddr.includes("==") ? "" : rawAddr;

        results.push({
          id: c.id,
          userType: "customer",
          applicantName: displayName,
          phone: cleanPhone,
          email: cleanEmail,
          address: cleanAddr,
          idType: "Aadhaar / Welfare Card",
          idNumber: idNum ? `••••${String(idNum).replace(/\D/g, "").slice(-4)}` : "",
          documentUrl: docUrl,
          hasDocument: Boolean(docUrl),
          status,
          profileData: (() => {
            const profile = { ...(profileByCustomer.get(String(c.id)) || {}) };
            const findings = Array.isArray(profile.verificationFindings) ? profile.verificationFindings : [];
            profile.verificationFindings = findings.map((finding: Record<string, unknown>) => ({
              code: finding.code,
              category: finding.category,
              matchedDocumentType: finding.matchedDocumentType,
              severity: finding.severity,
              confidence: finding.confidence,
              manualReviewRequired: finding.manualReviewRequired,
              reference: finding.internalMatchedRecordId,
            }));
            return profile;
          })(),
          statusNote: c.verification_note || c.rejection_reason || "",
          rejectionReason: c.rejection_reason || "",
          submittedAt: c.created_at,
        });
      }
    }

    // 5. Platform Users (from `users` table)
    if (typeFilter === "all" || typeFilter === "user") {
      const users = await prisma.$queryRawUnsafe<any[]>(
        `SELECT id, full_name, email, phone, status, is_approved, role, created_at
         FROM users
         ORDER BY id DESC LIMIT 50`
      );

      for (const u of users) {
        const status = u.is_approved === 1 ? "Approved" : u.status === "active" ? "Approved" : u.status || "Pending";
        results.push({
          id: u.id,
          userType: "user",
          applicantName: u.full_name || "Platform User",
          phone: u.phone || "",
          email: u.email || "",
          address: "",
          idType: `User Account (${u.role || "Citizen"})`,
          idNumber: String(u.id),
          documentUrl: null,
          hasDocument: false,
          status,
          statusNote: "",
          rejectionReason: "",
          submittedAt: u.created_at,
        });
      }
    }

    // 6. Statutory Scheme Applications (service_requests)
    if (typeFilter === "all" || typeFilter === "service" || typeFilter === "customer") {
      const docRequests = await prisma.$queryRawUnsafe<any[]>(`
        SELECT sr.id, sr.status, sr.uploaded_doc_path, sr.created_at, sr.purchase_notes,
               sr.rejection_reason, s.name AS service_name, s.pdf_path
        FROM service_requests sr
        LEFT JOIN services s ON sr.service_id = s.id
        WHERE sr.uploaded_doc_path IS NOT NULL OR sr.status IN ('in_review', 'submitted', 'pending', 'returned')
        ORDER BY sr.id DESC LIMIT 50
      `).catch(() => []);

      for (const sr of docRequests) {
        let pNotes: any = {};
        try {
          pNotes = typeof sr.purchase_notes === "string" ? JSON.parse(sr.purchase_notes) : (sr.purchase_notes || {});
        } catch { pNotes = {}; }

        const appRef = pNotes.appRef || `TN-DOC-2026-${String(sr.id).padStart(6, "0")}`;
        const applicantName = pNotes.applicantName || `Citizen #${sr.id}`;
        const docUrl = sr.uploaded_doc_path || sr.pdf_path || null;
        const rawSt = String(sr.status || "").toLowerCase();
        const status = rawSt === "approved" || rawSt === "confirmed" ? "Approved" : rawSt === "returned" ? "Re-Upload Required" : rawSt === "rejected" ? "Rejected" : "Pending";

        results.push({
          id: sr.id,
          userType: "service_request",
          applicantName,
          phone: pNotes.applicantPhone || "",
          email: pNotes.applicantEmail || "",
          address: `${pNotes.address || ""}${pNotes.district ? ", " + pNotes.district : ""}`.trim(),
          idType: `Scheme (${sr.service_name || "Document Scheme"})`,
          idNumber: appRef,
          documentUrl: docUrl,
          hasDocument: Boolean(docUrl),
          status,
          statusNote: sr.rejection_reason || (sr.uploaded_doc_path ? "Filled document uploaded, awaiting officer review & district seal" : "Application registered"),
          rejectionReason: sr.rejection_reason || "",
          submittedAt: sr.created_at,
        });
      }
    }

    // Apply status filter & search in memory
    const matchesCategory = (item: any) => {
      if (typeFilter === "all") return true;
      if (typeFilter === "user") return ["user", "guest", "distributor"].includes(String(item.userType));
      if (typeFilter === "customer") return item.userType === "customer";
      if (typeFilter === "retailer") return item.userType === "retailer";
      if (typeFilter === "distributor") return item.userType === "distributor";
      if (typeFilter === "service") return item.userType === "service_request" || item.userType === "service";
      if (typeFilter === "guest") return item.userType === "guest";
      return item.userType === typeFilter;
    };
    let filtered = results.filter(matchesCategory);
    const normalizedStatusFilter = statusFilter.toLowerCase().replace(/[^a-z]/g, "");
    const reviewedActions = new Set<string>();
    const latestReviewActionByCase = new Map<string, string>();
    if (["new", "pending", "history"].includes(normalizedStatusFilter)) {
      const reviews = await prisma.$queryRawUnsafe<any[]>(
        `SELECT user_type, user_id, action_performed, created_at FROM kyc_audit_logs
         WHERE action_performed IN ('verify_approve','verify_reject','request_additional_documents','submit_verification')
         ORDER BY created_at DESC, id DESC`
      ).catch(() => []);
      for (const row of reviews) {
        const normalizedType = String(row.user_type) === "service_request" ? "service" : String(row.user_type);
        const key = `${normalizedType}-${String(row.user_id)}`;
        if (String(row.action_performed) !== "submit_verification") reviewedActions.add(key);
        if (!latestReviewActionByCase.has(key)) latestReviewActionByCase.set(key, String(row.action_performed));
      }
    }
    if (statusFilter !== "all") {
      const isHistoryStatus = (status: string) => ["approved", "rejected", "returned", "reuploadrequired", "inactive", "suspended"].includes(status.toLowerCase().replace(/[^a-z]/g, ""));
      const isPendingStatus = (status: string) => ["pending", "pendingreview", "underreview"].includes(status.toLowerCase().replace(/[^a-z]/g, ""));
      filtered = filtered.filter((item) => {
        const normalized = item.status.toLowerCase().replace(/[^a-z]/g, "");
        const key = `${String(item.userType)}-${String(item.id)}`;
        const reviewed = reviewedActions.has(key);
        if (normalizedStatusFilter === "new") return isPendingStatus(normalized) && !reviewed;
        if (normalizedStatusFilter === "pending") return isPendingStatus(normalized) && reviewed && latestReviewActionByCase.get(key) === "request_additional_documents";
        if (normalizedStatusFilter === "history") return isHistoryStatus(normalized);
        return normalized.includes(normalizedStatusFilter);
      });
    }
    for (const item of filtered) {
      const latestAction = latestReviewActionByCase.get(`${String(item.userType)}-${String(item.id)}`) || null;
      item.reviewedAt = Boolean(latestAction && latestAction !== "submit_verification");
      item.lastReviewAction = latestAction;
    }
    filtered.sort((a, b) => {
      const aNew = !a.reviewedAt && ["pending", "pendingreview", "underreview"].includes(a.status.toLowerCase().replace(/[^a-z]/g, ""));
      const bNew = !b.reviewedAt && ["pending", "pendingreview", "underreview"].includes(b.status.toLowerCase().replace(/[^a-z]/g, ""));
      if (aNew !== bNew) return aNew ? -1 : 1;
      return new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime();
    });

    if (search) {
      filtered = filtered.filter(
        (item) =>
          item.applicantName.toLowerCase().includes(search) ||
          item.phone.toLowerCase().includes(search) ||
          item.email.toLowerCase().includes(search) ||
          item.idNumber.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({
      ok: true,
      count: filtered.length,
      requests: filtered,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to load verification queue from database." },
      { status: 500 }
    );
  }
}
