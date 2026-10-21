import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export interface ReceiptData {
  receiptNo: string;
  paymentReference: string;
  applicationReference: string;
  serviceType: "DOCUMENT_SERVICE" | "E_SERVICE";
  categoryName: string;
  serviceName: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerId?: string;
  amount: number;
  subtotal?: number;
  taxAmount?: number;
  discountAmount?: number;
  totalAmount?: number;
  currency: string;
  paymentProvider: string;
  paymentMethod: string;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  paymentStatus: string;
  paymentDate: string;
  receiptDate?: string;
  issuedAt?: string;
  organizationName?: string;
}

// Ensure all text strings are safe for WinAnsi standard Helvetica encoding
function safeText(str: string | null | undefined, fallback = "N/A"): string {
  if (!str) return fallback;
  const clean = str.replace(/[^\x20-\x7E]/g, "").replace(/\s+/g, " ").trim();
  return clean || fallback;
}

export async function generateReceiptPdf(data: ReceiptData): Promise<Uint8Array> {
  // 1. Primary Engine: ReportLab generator matching the Jey Jen Nath letterhead banner & logo
  try {
    const pyScript = path.join(process.cwd(), "scripts", "generate_payment_receipt.py");
    if (fs.existsSync(pyScript)) {
      const tempPdfPath = path.join(os.tmpdir(), `receipt_${Date.now()}_${crypto.randomBytes(3).toString("hex")}.pdf`);

      const pyPayload = {
        receipt_number: data.receiptNo || "JJN/2026/000123",
        application_reference: data.applicationReference || "APP-2026-000123",
        payment_reference: data.paymentReference || "PAY-2026-000123",
        customer_name: data.customerName || "Sample Customer",
        customer_email: data.customerEmail || "customer@example.com",
        customer_phone: data.customerPhone || "+91 98765 43210",
        customer_id: data.customerId || "USR-000123",
        service_type: data.serviceType === "DOCUMENT_SERVICE" ? "Document-Based Service" : "Online E-Service",
        category_name: data.categoryName || "Certificates",
        service_name: data.serviceName || "Welfare Service Application",
        quantity: 1,
        subtotal: String(data.subtotal ?? data.amount ?? 0),
        tax_amount: String(data.taxAmount ?? 0),
        discount_amount: String(data.discountAmount ?? 0),
        total_amount: String(data.totalAmount ?? data.amount ?? 0),
        currency: (data.currency || "INR").toUpperCase(),
        payment_status: "PAID",
        payment_provider: data.paymentProvider || "Razorpay",
        payment_method: data.paymentMethod || "UPI",
        payment_date: data.paymentDate,
        receipt_date: data.receiptDate || data.issuedAt || data.paymentDate,
        razorpay_order_id: data.razorpayOrderId || "-",
        razorpay_payment_id: data.razorpayPaymentId || "-",
        organization_name: data.organizationName || "Jey Jen Nath",
      };

      const bannerPng = path.join(process.cwd(), "images", "Receipt_head.png");
      const logoPng = path.join(process.cwd(), "images", "Logo.png");

      const pyArgs = [
        pyScript,
        "--data",
        JSON.stringify(pyPayload),
        "--output",
        tempPdfPath,
      ];
      if (fs.existsSync(bannerPng)) pyArgs.push("--banner", bannerPng);
      if (fs.existsSync(logoPng)) pyArgs.push("--logo", logoPng);

      const res = spawnSync("python", pyArgs, { encoding: "utf-8" });
      if (res.status === 0 && fs.existsSync(tempPdfPath)) {
        const fileBytes = fs.readFileSync(tempPdfPath);
        try { fs.unlinkSync(tempPdfPath); } catch {}
        return new Uint8Array(fileBytes);
      }
    }
  } catch (err) {
    console.warn("Python receipt generator fallback to pdf-lib:", err);
  }

  // 2. Fallback Engine: pdf-lib generator with letterhead image & clean layout
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontMono = await pdfDoc.embedFont(StandardFonts.Courier);

  const margin = 42;
  const contentWidth = width - margin * 2;

  // Colors
  const ink = rgb(0.15, 0.25, 0.24); // #263F3D
  const teal = rgb(0.21, 0.33, 0.33); // #355553
  const mid = rgb(0.33, 0.37, 0.36); // #545E5D
  const rule = rgb(0.62, 0.68, 0.67); // #9FAEAB
  const tableHead = rgb(0.94, 0.95, 0.95);

  let currentY = height - 28;

  // Try embedding Banner PNG
  try {
    const bannerPath = path.join(process.cwd(), "images", "Receipt_head.png");
    if (fs.existsSync(bannerPath)) {
      const bannerImageBytes = fs.readFileSync(bannerPath);
      const bannerImage = await pdfDoc.embedPng(bannerImageBytes);
      const bannerHeight = contentWidth * (bannerImage.height / bannerImage.width);
      currentY -= bannerHeight;
      page.drawImage(bannerImage, {
        x: margin,
        y: currentY,
        width: contentWidth,
        height: bannerHeight,
      });
    }
  } catch {}

  // Header Title Row
  currentY -= 36;
  const logoPath = path.join(process.cwd(), "images", "Logo.png");
  if (fs.existsSync(logoPath)) {
    try {
      const logoBytes = fs.readFileSync(logoPath);
      const logoImage = await pdfDoc.embedPng(logoBytes);
      page.drawImage(logoImage, {
        x: margin,
        y: currentY - 10,
        width: 32,
        height: 32,
      });
    } catch {}
  }

  page.drawText("PAYMENT RECEIPT", {
    x: margin + 40,
    y: currentY + 6,
    size: 16,
    font: fontBold,
    color: ink,
  });

  page.drawText("Payment acknowledgement", {
    x: margin + 40,
    y: currentY - 8,
    size: 8,
    font: fontRegular,
    color: mid,
  });

  // Receipt No & Date
  const metaX = width - margin - 150;
  page.drawText("RECEIPT NO.", { x: metaX, y: currentY + 12, size: 7.2, font: fontRegular, color: mid });
  page.drawText(safeText(data.receiptNo), { x: metaX, y: currentY + 2, size: 8.5, font: fontBold, color: ink });

  page.drawText("RECEIPT DATE", { x: metaX, y: currentY - 12, size: 7.2, font: fontRegular, color: mid });
  page.drawText(safeText(data.receiptDate || data.paymentDate), { x: metaX, y: currentY - 22, size: 8.3, font: fontBold, color: ink });

  currentY -= 28;
  page.drawLine({ start: { x: margin, y: currentY }, end: { x: width - margin, y: currentY }, thickness: 1, color: teal });

  // Received From
  currentY -= 20;
  page.drawText("RECEIVED FROM", { x: margin, y: currentY, size: 9, font: fontBold, color: ink });
  page.drawLine({ start: { x: margin, y: currentY - 4 }, end: { x: width - margin, y: currentY - 4 }, thickness: 0.5, color: rule });

  currentY -= 22;
  const colHalf = contentWidth / 2;
  page.drawText("CUSTOMER NAME", { x: margin, y: currentY + 10, size: 7.2, font: fontRegular, color: mid });
  page.drawText(safeText(data.customerName), { x: margin, y: currentY, size: 8.5, font: fontBold, color: ink });

  page.drawText("EMAIL ADDRESS", { x: margin + colHalf, y: currentY + 10, size: 7.2, font: fontRegular, color: mid });
  page.drawText(safeText(data.customerEmail || "-"), { x: margin + colHalf, y: currentY, size: 8.5, font: fontBold, color: ink });

  currentY -= 25;
  page.drawText("PHONE NUMBER", { x: margin, y: currentY + 10, size: 7.2, font: fontRegular, color: mid });
  page.drawText(safeText(data.customerPhone || "-"), { x: margin, y: currentY, size: 8.5, font: fontBold, color: ink });

  page.drawText("CUSTOMER / USER ID", { x: margin + colHalf, y: currentY + 10, size: 7.2, font: fontRegular, color: mid });
  page.drawText(safeText(data.customerId || "-"), { x: margin + colHalf, y: currentY, size: 8.5, font: fontBold, color: ink });

  // Payment For Table
  currentY -= 30;
  page.drawText("PAYMENT FOR", { x: margin, y: currentY, size: 9, font: fontBold, color: ink });
  page.drawLine({ start: { x: margin, y: currentY - 4 }, end: { x: width - margin, y: currentY - 4 }, thickness: 0.5, color: rule });

  currentY -= 24;
  page.drawRectangle({ x: margin, y: currentY, width: contentWidth, height: 18, color: tableHead });
  page.drawRectangle({ x: margin, y: currentY - 40, width: contentWidth, height: 58, borderColor: rule, borderWidth: 0.5 });

  page.drawText("PARTICULARS", { x: margin + 8, y: currentY + 5, size: 7.5, font: fontBold, color: ink });
  page.drawText("QTY", { x: margin + contentWidth * 0.72, y: currentY + 5, size: 7.5, font: fontBold, color: ink });
  page.drawText("AMOUNT", { x: width - margin - 50, y: currentY + 5, size: 7.5, font: fontBold, color: ink });

  currentY -= 18;
  page.drawText(safeText(data.serviceName), { x: margin + 8, y: currentY, size: 8.5, font: fontBold, color: ink });
  page.drawText(`${data.serviceType} | ${safeText(data.categoryName)} | Ref: ${safeText(data.applicationReference)}`, {
    x: margin + 8,
    y: currentY - 12,
    size: 7,
    font: fontRegular,
    color: mid,
  });
  page.drawText("1", { x: margin + contentWidth * 0.73, y: currentY - 6, size: 8.5, font: fontRegular, color: ink });
  page.drawText(`INR ${(data.amount || 0).toFixed(2)}`, { x: width - margin - 60, y: currentY - 6, size: 8.5, font: fontRegular, color: ink });

  // Summary
  currentY -= 45;
  const sumX = margin + contentWidth * 0.65;
  page.drawText("Subtotal", { x: sumX, y: currentY, size: 8, font: fontRegular, color: mid });
  page.drawText(`INR ${(data.amount || 0).toFixed(2)}`, { x: width - margin - 60, y: currentY, size: 8, font: fontRegular, color: ink });

  currentY -= 14;
  page.drawText("Tax", { x: sumX, y: currentY, size: 8, font: fontRegular, color: mid });
  page.drawText("INR 0.00", { x: width - margin - 60, y: currentY, size: 8, font: fontRegular, color: ink });

  currentY -= 14;
  page.drawText("Discount", { x: sumX, y: currentY, size: 8, font: fontRegular, color: mid });
  page.drawText("INR 0.00", { x: width - margin - 60, y: currentY, size: 8, font: fontRegular, color: ink });

  currentY -= 8;
  page.drawLine({ start: { x: sumX, y: currentY }, end: { x: width - margin, y: currentY }, thickness: 0.8, color: ink });

  currentY -= 14;
  page.drawText("TOTAL PAID", { x: sumX, y: currentY, size: 9, font: fontBold, color: ink });
  page.drawText(`INR ${(data.amount || 0).toFixed(2)}`, { x: width - margin - 60, y: currentY, size: 9, font: fontBold, color: ink });

  // Payment Details Grid
  currentY -= 35;
  page.drawText("PAYMENT DETAILS", { x: margin, y: currentY, size: 9, font: fontBold, color: ink });
  page.drawLine({ start: { x: margin, y: currentY - 4 }, end: { x: width - margin, y: currentY - 4 }, thickness: 0.5, color: rule });

  currentY -= 20;
  const col3 = contentWidth / 3;
  page.drawText("PAYMENT REFERENCE", { x: margin, y: currentY + 10, size: 6.8, font: fontRegular, color: mid });
  page.drawText(safeText(data.paymentReference), { x: margin, y: currentY, size: 7.5, font: fontBold, color: ink });

  page.drawText("PAYMENT PROVIDER", { x: margin + col3, y: currentY + 10, size: 6.8, font: fontRegular, color: mid });
  page.drawText(safeText(data.paymentProvider || "Razorpay"), { x: margin + col3, y: currentY, size: 7.5, font: fontBold, color: ink });

  page.drawText("PAYMENT METHOD", { x: margin + col3 * 2, y: currentY + 10, size: 6.8, font: fontRegular, color: mid });
  page.drawText(safeText(data.paymentMethod || "UPI"), { x: margin + col3 * 2, y: currentY, size: 7.5, font: fontBold, color: ink });

  currentY -= 25;
  page.drawText("PAYMENT DATE", { x: margin, y: currentY + 10, size: 6.8, font: fontRegular, color: mid });
  page.drawText(safeText(data.paymentDate), { x: margin, y: currentY, size: 7.5, font: fontBold, color: ink });

  page.drawText("RAZORPAY ORDER ID", { x: margin + col3, y: currentY + 10, size: 6.8, font: fontRegular, color: mid });
  page.drawText(safeText(data.razorpayOrderId || "-"), { x: margin + col3, y: currentY, size: 7.5, font: fontBold, color: ink });

  page.drawText("RAZORPAY PAYMENT ID", { x: margin + col3 * 2, y: currentY + 10, size: 6.8, font: fontRegular, color: mid });
  page.drawText(safeText(data.razorpayPaymentId || "-"), { x: margin + col3 * 2, y: currentY, size: 7.5, font: fontBold, color: ink });

  // Status & Note
  currentY -= 30;
  page.drawText("Payment status:", { x: margin, y: currentY, size: 8, font: fontRegular, color: mid });
  page.drawText("SUCCESSFUL / VERIFIED", { x: margin + 70, y: currentY, size: 8, font: fontBold, color: ink });

  page.drawText("This receipt records the payment details shown above. Please retain it for your records.", {
    x: margin,
    y: currentY - 14,
    size: 7.2,
    font: fontRegular,
    color: mid,
  });

  // Footer Issuer Note
  currentY = 90;
  page.drawLine({ start: { x: margin, y: currentY + 15 }, end: { x: width - margin, y: currentY + 15 }, thickness: 0.5, color: rule });
  page.drawText("JEY JEN NATH", { x: margin, y: currentY, size: 8.5, font: fontBold, color: ink });
  page.drawText("Computer-generated receipt; no signature is required.", { x: margin, y: currentY - 10, size: 7.2, font: fontRegular, color: mid });
  page.drawText("Keep this receipt for reference", { x: width - margin - 120, y: currentY, size: 7, font: fontRegular, color: mid });

  page.drawLine({ start: { x: margin, y: 45 }, end: { x: width - margin, y: 45 }, thickness: 0.5, color: rule });
  page.drawText("Receipt generated from the recorded payment transaction.", { x: margin, y: 35, size: 7, font: fontRegular, color: mid });

  return await pdfDoc.save();
}
