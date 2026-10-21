import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthRetailer } from "@/lib/auth-helpers";
import { ensureRetailerShopPhotos, getRetailerShopPhotos } from "@/lib/retailer-shop-photos";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const retailer = await getAuthRetailer(request);
    if (!retailer) {
      return NextResponse.json({ ok: false, error: "Unauthorized Kendra session" }, { status: 401 });
    }

    await ensureRetailerShopPhotos(Number(retailer.id));

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT 
         ru.id,
         ru.registration_no,
         ru.name,
         ru.shop_name,
         ru.business_type,
         ru.pan_no,
         ru.aadhaar_no,
         ru.pan_doc,
         ru.aadhar_doc,
         ru.ration_doc,
         ru.gst_no,
         ru.shop_url,
         ru.shop_image,
         ru.email,
         ru.phone,
         ru.address,
         ru.status,
         ru.verification_note,
         ru.rejection_reason,
         ru.wallet_balance,
         ru.distributor_id,
         ru.district_id,
         ru.taluk_id,
         ru.panchayat_id,
         ru.created_at,
         d.name AS distributor_name,
         dist.name AS district_name,
         dist.nameTa AS district_name_ta
       FROM retail_users ru
       LEFT JOIN distributors d ON ru.distributor_id = d.id
       LEFT JOIN districts dist ON ru.district_id = dist.id
       WHERE ru.id = ? LIMIT 1`,
      retailer.id
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json({ ok: false, error: "Kendra not found" }, { status: 404 });
    }

    const ret = rows[0];

    return NextResponse.json({
      ok: true,
      profile: {
        id: ret.id,
        registrationNo: ret.registration_no || `TN-KND-${String(ret.id).padStart(4, "0")}`,
        name: ret.name,
        shopName: ret.shop_name || "LabourSeva Kendra",
        businessType: ret.business_type || "Common Service Kendra",
        panNo: ret.pan_no,
        panDocument: ret.pan_doc,
        aadhaarDocument: ret.aadhar_doc,
        businessDocument: ret.ration_doc,
        aadhaarNo: ret.aadhaar_no ? `XXXX-XXXX-${String(ret.aadhaar_no).slice(-4)}` : null,
        gstNo: ret.gst_no,
        shopUrl: ret.shop_url,
        shopPhotos: await getRetailerShopPhotos(Number(ret.id)),
        email: ret.email,
        phone: ret.phone,
        address: ret.address,
        districtId: ret.district_id,
        talukId: ret.taluk_id,
        panchayatId: ret.panchayat_id,
        status: ret.status || "Pending",
        verificationNote: ret.verification_note,
        walletBalance: Number(ret.wallet_balance || 0),
        distributor: {
          id: ret.distributor_id,
          name: ret.distributor_name || "Direct / State Territory",
        },
        district: {
          id: ret.district_id,
          name: ret.district_name || "Tamil Nadu",
          nameTa: ret.district_name_ta,
        },
        joinedDate: ret.created_at,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const retailer = await getAuthRetailer(request);
    if (!retailer) {
      return NextResponse.json({ ok: false, error: "Unauthorized Kendra session" }, { status: 401 });
    }

    const body = await request.json();
    const text = (key: string, max: number) => String(body[key] ?? "").trim().slice(0, max);
    const name = text("name", 255);
    const shopName = text("shopName", 255);
    const businessType = text("businessType", 100);
    const phone = text("phone", 20).replace(/\D/g, "");
    const address = text("address", 4000);
    const panNo = text("panNo", 20).toUpperCase();
    const aadhaarNo = text("aadhaarNo", 20).replace(/\D/g, "");
    const panDocument = text("panDocument", 255);
    const aadhaarDocument = text("aadhaarDocument", 255);
    const businessDocument = text("businessDocument", 255);
    const shopUrl = text("shopUrl", 500);
    const gstNo = text("gstNo", 20).toUpperCase();
    const districtId = Number(body.districtId) || null;
    const talukId = Number(body.talukId) || null;
    const panchayatId = Number(body.panchayatId) || null;
    const shopPhotos = Array.isArray(body.shopPhotos) ? body.shopPhotos.map(String) : [];
    if (shopPhotos.length > 10 || new Set(shopPhotos).size !== shopPhotos.length) {
      return NextResponse.json({ ok: false, error: "Choose no more than 10 different shop photos." }, { status: 400 });
    }
    await ensureRetailerShopPhotos(Number(retailer.id));
    if (shopPhotos.length) {
      const stored = await getRetailerShopPhotos(Number(retailer.id));
      if (shopPhotos.some((url: string) => !stored.includes(url))) {
        return NextResponse.json({ ok: false, error: "A shop photo is not attached to this retailer account." }, { status: 400 });
      }
    }
    const [storedDocs] = await prisma.$queryRawUnsafe<any[]>(
      `SELECT name, shop_name, business_type, phone, address, pan_no, aadhaar_no,
              pan_doc, aadhar_doc, ration_doc, gst_no, shop_url, district_id,
              taluk_id, panchayat_id, status, is_approved
       FROM retail_users WHERE id = ? LIMIT 1`,
      retailer.id
    );
    if (!storedDocs) return NextResponse.json({ ok: false, error: "Kendra not found" }, { status: 404 });
    for (const [value, existingValue, docType] of [
      [panDocument, storedDocs?.pan_doc, "retailer-pan"],
      [aadhaarDocument, storedDocs?.aadhar_doc, "retailer-aadhaar"],
      [businessDocument, storedDocs?.ration_doc, "retailer-business"],
    ] as const) {
      if (!value || value === existingValue) continue;
      let filename = "";
      try {
        const url = new URL(value, "http://localhost");
        if (url.pathname === "/api/verification/document") filename = url.searchParams.get("file") || "";
      } catch { /* Invalid URL is rejected below. */ }
      if (!filename) continue;
      if (!filename.startsWith(`${retailer.id}-${docType}-`) || !/^[0-9]+-retailer-(?:pan|aadhaar|business)-[0-9a-f-]+\.(?:pdf|jpg|png)$/i.test(filename)) {
        return NextResponse.json({ ok: false, error: "Use a verification document uploaded to this account." }, { status: 400 });
      }
      const artifact = await prisma.$queryRawUnsafe<any[]>(
        "SELECT id FROM verification_document_artifacts WHERE owner_type = 'retailer' AND owner_id = ? AND doc_type = ? AND storage_key = ? LIMIT 1",
        String(retailer.id),
        docType,
        filename
      ).catch(() => []);
      if (!artifact.length) return NextResponse.json({ ok: false, error: "The uploaded verification document could not be confirmed." }, { status: 400 });
    }
    if (phone && phone.length < 10) return NextResponse.json({ ok: false, error: "Enter a valid contact phone number." }, { status: 400 });
    if (gstNo && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstNo)) {
      return NextResponse.json({ ok: false, error: "Enter a valid GSTIN or leave it blank." }, { status: 400 });
    }
    if (shopUrl && !/^https?:\/\//i.test(shopUrl)) {
      return NextResponse.json({ ok: false, error: "Enter a full shop link beginning with http:// or https://." }, { status: 400 });
    }
    if (panNo && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(panNo)) return NextResponse.json({ ok: false, error: "Enter a valid PAN number." }, { status: 400 });
    if (aadhaarNo && aadhaarNo.length !== 12) return NextResponse.json({ ok: false, error: "Enter a valid 12-digit Aadhaar number." }, { status: 400 });
    if (districtId && !(await prisma.district.findFirst({ where: { id: districtId, active: true }, select: { id: true } }))) return NextResponse.json({ ok: false, error: "Choose a valid district." }, { status: 400 });
    if (talukId && !(await prisma.taluk.findFirst({ where: { id: talukId, districtId: districtId || undefined, active: true }, select: { id: true } }))) return NextResponse.json({ ok: false, error: "Choose a taluk in the selected district." }, { status: 400 });
    if (panchayatId && !(await prisma.panchayath.findFirst({ where: { id: panchayatId, talukId: talukId || undefined, active: true }, select: { id: true } }))) return NextResponse.json({ ok: false, error: "Choose a panchayat in the selected taluk." }, { status: 400 });

    const shopPhoto = text("shopPhoto", 255);

    const storedPhotos = await getRetailerShopPhotos(Number(retailer.id));
    const same = (a: unknown, b: unknown) => String(a ?? "") === String(b ?? "");
    const profileChanged = [
      [name, storedDocs.name], [shopName, storedDocs.shop_name], [businessType, storedDocs.business_type],
      [phone, storedDocs.phone], [address, storedDocs.address], [panNo, storedDocs.pan_no],
      [panDocument, storedDocs.pan_doc], [aadhaarDocument, storedDocs.aadhar_doc],
      [businessDocument, storedDocs.ration_doc], [gstNo, storedDocs.gst_no], [shopUrl, storedDocs.shop_url],
      [districtId, storedDocs.district_id], [talukId, storedDocs.taluk_id], [panchayatId, storedDocs.panchayat_id],
    ].some(([current, existing]) => !same(current, existing))
      || Boolean(aadhaarNo && aadhaarNo !== String(storedDocs.aadhaar_no || ""))
      || (Array.isArray(body.shopPhotos) && (shopPhotos.length !== storedPhotos.length || shopPhotos.some((photo: string, index: number) => photo !== storedPhotos[index])));
    const keepApproval = !profileChanged && Number(storedDocs.is_approved) === 1 && String(storedDocs.status || "").toLowerCase() === "approved";

    await prisma.$executeRawUnsafe(
      `UPDATE retail_users 
       SET status = ?, is_approved = ?,
           verification_note = IF(? = 1, verification_note, IF(? = 1, 'Profile updated and awaiting staff review', verification_note)),
           name = ?, shop_name = ?, business_type = ?, gst_no = ?, shop_url = ?,
           phone = ?, address = ?, pan_no = ?, pan_doc = ?,
           aadhaar_no = IF(? = '', aadhaar_no, ?), aadhar_doc = ?, ration_doc = ?,
           shop_image = COALESCE(?, shop_image),
           district_id = ?, taluk_id = ?, panchayat_id = ?,
           updated_at = NOW()
       WHERE id = ?`,
      keepApproval ? "Approved" : "Pending",
      keepApproval ? 1 : 0,
      keepApproval ? 1 : 0,
      profileChanged ? 1 : 0,
      name,
      shopName,
      businessType,
      gstNo || null,
      shopUrl || null,
      phone || null,
      address || null,
      panNo || null,
      panDocument || null,
      aadhaarNo,
      aadhaarNo,
      aadhaarDocument || null,
      businessDocument || null,
      shopPhoto || null,
      districtId,
      talukId,
      panchayatId,
      retailer.id
    );

    if (Array.isArray(body.shopPhotos)) {
      const kept = await getRetailerShopPhotos(Number(retailer.id));
      for (const photo of kept) if (!shopPhotos.includes(photo)) await prisma.$executeRawUnsafe("DELETE FROM retailer_shop_photos WHERE retailer_id = ? AND photo_url = ?", retailer.id, photo);
    }
    return NextResponse.json({ ok: true, status: keepApproval ? "Approved" : "Pending", message: "Draft saved." });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const retailer = await getAuthRetailer(request);
    if (!retailer) return NextResponse.json({ ok: false, error: "Unauthorized Kendra session" }, { status: 401 });
    await ensureRetailerShopPhotos(Number(retailer.id));
    const [row] = await prisma.$queryRawUnsafe<any[]>("SELECT name, shop_name, business_type, phone, address, pan_no, aadhaar_no, pan_doc, aadhar_doc, ration_doc, district_id, taluk_id, panchayat_id FROM retail_users WHERE id = ? LIMIT 1", retailer.id);
    const photos = await getRetailerShopPhotos(Number(retailer.id));
    if (!row?.name || !row.shop_name || !row.business_type || !row.phone || !row.address || !row.pan_no || !row.aadhaar_no || !row.pan_doc || !row.aadhar_doc || !row.ration_doc || !row.district_id || !row.taluk_id || !row.panchayat_id || photos.length === 0) {
      return NextResponse.json({ ok: false, error: "Complete all required details, upload identity and business proofs, and add at least one shop photo before submitting." }, { status: 400 });
    }
    await prisma.$executeRawUnsafe(
      `UPDATE retail_users SET status = 'Pending', is_approved = 0, rejection_reason = NULL,
       verification_note = 'Profile submitted and awaiting staff review', updated_at = NOW() WHERE id = ?`,
      retailer.id
    );
    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO notifications (user_id, user_type, title, message, type, is_read, created_at)
         VALUES ('admin', 'staff', ?, ?, 'verification', 0, NOW())`,
        "Retailer account needs verification",
        `${String(row.name)} submitted shop details and documents for review (retailer #${retailer.id}).`
      );
    } catch (notifyError) {
      console.warn("[retailer/profile] Staff queue notification unavailable:", notifyError);
    }
    return NextResponse.json({ ok: true, status: "Pending", message: "Profile submitted for staff verification." });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
