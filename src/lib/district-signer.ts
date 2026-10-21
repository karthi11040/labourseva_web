import { promises as fs } from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export interface SignDistrictResult {
  ok: boolean;
  signedPdfPath?: string;
  error?: string;
}

/**
 * Stamps a service request document with the digital signature and seal of the
 * district specified by the citizen in their application request.
 */
export async function signDocumentWithDistrict(serviceRequestId: number): Promise<SignDistrictResult> {
  try {
    const srRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT sr.*, s.name AS service_name, s.pdf_path AS template_pdf_path,
              s.sign_pos_x, s.sign_pos_y, s.sign_page, s.sign_width, s.sign_height
       FROM service_requests sr
       LEFT JOIN services s ON sr.service_id = s.id
       WHERE sr.id = ? LIMIT 1`,
      serviceRequestId
    ).catch(() => []);

    if (!srRows || srRows.length === 0) {
      return { ok: false, error: `Service request #${serviceRequestId} not found` };
    }

    const sr = srRows[0];
    let purchaseNotes: any = {};
    try {
      purchaseNotes = typeof sr.purchase_notes === "string" ? JSON.parse(sr.purchase_notes) : (sr.purchase_notes || {});
    } catch {
      purchaseNotes = {};
    }

    // 1. Identify District from application details
    let districtId = sr.district_id || purchaseNotes.districtId || null;
    let districtName = purchaseNotes.district || "";

    if (districtId && !districtName) {
      const [distRow] = await prisma.$queryRawUnsafe<any[]>(
        `SELECT COALESCE(name_en, name) AS dname FROM districts WHERE id = ? LIMIT 1`,
        Number(districtId)
      ).catch(() => []);
      if (distRow?.dname) districtName = distRow.dname;
    }

    // 2. Identify Source PDF (applicant uploaded document preferred, otherwise template)
    let sourcePdfWeb = sr.uploaded_doc_path || sr.template_pdf_path || null;
    if (!sourcePdfWeb) {
      return { ok: false, error: "No document or template PDF available to sign." };
    }

    // Clean source PDF path to disk
    let relativeSource = sourcePdfWeb.replace(/^\.\.\//, "").replace(/^\//, "");
    let sourceDiskPath = path.join(process.cwd(), "public", relativeSource);

    const fileExists = await fs.stat(/*turbopackIgnore: true*/ sourceDiskPath).then(() => true).catch(() => false);
    if (!fileExists) {
      // Fallback try scoped to data or public subfolder
      const subfolder = relativeSource.startsWith("data") ? "data" : "public";
      const scopedRel = relativeSource.replace(/^(data|public)[\\/]/, "");
      const altDisk = path.join(/*turbopackIgnore: true*/ process.cwd(), subfolder, scopedRel);
      const altExists = await fs.stat(/*turbopackIgnore: true*/ altDisk).then(() => true).catch(() => false);
      if (altExists) {
        sourceDiskPath = altDisk;
      } else {
        return { ok: false, error: `Source PDF file not found at ${sourceDiskPath}` };
      }
    }

    const sourceBytes = await fs.readFile(/*turbopackIgnore: true*/ sourceDiskPath);
    const pdfDoc = await PDFDocument.load(sourceBytes);
    const totalPages = pdfDoc.getPageCount();
    const targetPageIndex = Math.max(0, Math.min(totalPages - 1, (Number(sr.sign_page) || 1) - 1));
    const page = pdfDoc.getPage(targetPageIndex);
    const { width, height } = page.getSize();

    // 3. Determine signature coordinates
    const posX = Number(sr.sign_pos_x) > 0 ? Number(sr.sign_pos_x) : 0.72;
    const posY = Number(sr.sign_pos_y) > 0 ? Number(sr.sign_pos_y) : 0.82;
    const widthPercent = Number(sr.sign_width) > 0 ? Number(sr.sign_width) : 0.35;

    const stampWidth = Math.max(80, width * widthPercent);
    const stampHeight = stampWidth * (1.2 / 3);

    const centerX = width * posX;
    const centerYFromTop = height * posY;
    const centerY = height - centerYFromTop; // Invert PDF coordinate space

    const stampX = Math.max(0, Math.min(width - stampWidth, centerX - stampWidth / 2));
    const stampY = Math.max(0, Math.min(height - stampHeight, centerY - stampHeight / 2));

    // 4. Load District Authorized Signature & Officer Info
    let signatureImageBuffer: Buffer | null = null;
    let signatureOfficer = districtName ? `District Labour Officer, ${districtName}` : "District Labour Officer";
    let signatureDesignation = "Authorized Signatory, Govt. of Tamil Nadu";

    try {
      const sigDataPath = path.join(process.cwd(), "data", "district-signatures.json");
      const sigFileContent = await fs.readFile(sigDataPath, "utf8");
      const sigList = JSON.parse(sigFileContent) as any[];

      let matched = sigList.find((s) => districtId && Number(s.districtId) === Number(districtId));
      if (!matched && districtName) {
        matched = sigList.find((s) => s.id && s.id.toLowerCase().includes(districtName.toLowerCase()));
      }
      if (!matched && districtName) {
        matched = sigList.find((s) => s.officerName && s.officerName.toLowerCase().includes(districtName.toLowerCase()));
      }
      if (!matched && sigList.length > 0) {
        matched = sigList[0];
      }

      if (matched && matched.storageKey) {
        const relKey = matched.storageKey.startsWith("/") ? matched.storageKey.slice(1) : matched.storageKey;
        const sigDisk = path.join(process.cwd(), "public", relKey);
        const exists = await fs.stat(sigDisk).then(() => true).catch(() => false);
        if (exists) {
          signatureImageBuffer = await fs.readFile(sigDisk);
          if (matched.officerName) signatureOfficer = matched.officerName;
          if (matched.designation) signatureDesignation = matched.designation;
        }
      }
    } catch (err) {
      console.warn("Signature metadata lookup error:", err);
    }

    // 5. Draw Signature Graphic or Vectorized Official Stamp
    let imageEmbedded = false;
    if (signatureImageBuffer) {
      try {
        const isJpg = signatureImageBuffer[0] === 0xff && signatureImageBuffer[1] === 0xd8;
        const embeddedImg = isJpg
          ? await pdfDoc.embedJpg(signatureImageBuffer)
          : await pdfDoc.embedPng(signatureImageBuffer);

        const availWidth = stampWidth;
        const availHeight = stampHeight;
        const imgAspect = embeddedImg.width / embeddedImg.height;
        const boxAspect = availWidth / availHeight;

        let drawWidth = availWidth;
        let drawHeight = availHeight;
        if (imgAspect > boxAspect) {
          drawWidth = availWidth;
          drawHeight = availWidth / imgAspect;
        } else {
          drawHeight = availHeight;
          drawWidth = availHeight * imgAspect;
        }

        const drawX = stampX + (stampWidth - drawWidth) / 2;
        const drawY = stampY + (stampHeight - drawHeight) / 2;

        page.drawImage(embeddedImg, {
          x: drawX,
          y: drawY,
          width: drawWidth,
          height: drawHeight,
        });
        imageEmbedded = true;
      } catch (embedErr) {
        console.warn("Could not embed signature graphic:", embedErr);
      }
    }

    if (!imageEmbedded) {
      // Draw Vectorized Official DSC Box
      page.drawRectangle({
        x: stampX,
        y: stampY,
        width: stampWidth,
        height: stampHeight,
        borderWidth: 1.5,
        borderColor: rgb(0.12, 0.23, 0.54), // Tamil Nadu Navy
        color: rgb(0.96, 0.98, 1.0),
      });

      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const fontNorm = await pdfDoc.embedFont(StandardFonts.Helvetica);

      page.drawText("GOVERNMENT OF TAMIL NADU", {
        x: stampX + 8,
        y: stampY + stampHeight - 12,
        size: 7,
        font: fontBold,
        color: rgb(0.12, 0.23, 0.54),
      });

      page.drawText("DEPARTMENT OF LABOUR & EMPLOYMENT", {
        x: stampX + 8,
        y: stampY + stampHeight - 21,
        size: 5.5,
        font: fontBold,
        color: rgb(0.92, 0.35, 0.05), // Saffron
      });

      page.drawText(`Digitally Signed by: ${signatureOfficer}`, {
        x: stampX + 8,
        y: stampY + stampHeight - 32,
        size: 6.5,
        font: fontNorm,
        color: rgb(0.1, 0.1, 0.1),
      });

      page.drawText(`Jurisdiction: ${districtName ? `${districtName} District` : "Competent Authority"}`, {
        x: stampX + 8,
        y: stampY + stampHeight - 41,
        size: 6,
        font: fontNorm,
        color: rgb(0.2, 0.2, 0.2),
      });

      const nowStr = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
      page.drawText(`Date & Time: ${nowStr} IST`, {
        x: stampX + 8,
        y: stampY + stampHeight - 50,
        size: 5.5,
        font: fontNorm,
        color: rgb(0.4, 0.4, 0.4),
      });
    }

    // 6. Draw Legal Audit Certification Text below stamp
    try {
      const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const appRef = purchaseNotes.appRef || `TN-DOC-2026-${String(serviceRequestId).padStart(6, "0")}`;
      const auditText = `Digitally Certified for ${purchaseNotes.applicantName || "Citizen"} · ${districtName ? `${districtName} District` : "Tamil Nadu"} · Ref: ${appRef}`;
      page.drawText(auditText, {
        x: stampX,
        y: Math.max(4, stampY - 8),
        size: 5.5,
        font: fontReg,
        color: rgb(0.3, 0.3, 0.3),
      });
    } catch {}

    // 7. Save Signed PDF to disk
    const signedDir = path.join(process.cwd(), "public", "assets", "uploads", "services", "signed");
    await fs.mkdir(signedDir, { recursive: true });

    const signedBytes = await pdfDoc.save();
    const signedBaseName = `signed_DOC_${serviceRequestId}_${Date.now()}.pdf`;
    const signedDiskPath = path.join(signedDir, signedBaseName);
    await fs.writeFile(signedDiskPath, Buffer.from(signedBytes));
    const signedWebPath = `/assets/uploads/services/signed/${signedBaseName}`;

    // 8. Update database
    await prisma.$executeRawUnsafe(
      `UPDATE service_requests
       SET signed_pdf_path = ?,
           signed_at = NOW(),
           status = 'approved'
       WHERE id = ?`,
      signedWebPath,
      serviceRequestId
    );

    // 9. Dispatch in-app notification to citizen
    try {
      const { createInAppNotification } = await import("@/lib/notifications");
      await createInAppNotification({
        userId: "1",
        templateKey: "APPLICATION_APPROVED",
        title: "Certificate Digitally Signed & Approved",
        body: `Official signed certificate for Application DOC-${serviceRequestId} has been stamped with ${districtName ? `${districtName} District` : "Competent Authority"} seal and is ready for download.`,
        link: "/user/applications",
        metadata: {
          applicationId: `DOC-${serviceRequestId}`,
          district: districtName,
          signedPdfPath: signedWebPath,
        },
      });
    } catch (notifErr) {
      console.warn("Notification dispatch failed in district-signer:", notifErr);
    }

    return { ok: true, signedPdfPath: signedWebPath };
  } catch (err: any) {
    console.error("signDocumentWithDistrict error:", err);
    return { ok: false, error: err?.message || "Failed to digitally sign document" };
  }
}
