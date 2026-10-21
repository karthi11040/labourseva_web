import { PDFDocument, rgb } from "pdf-lib";

export interface StampAndDownloadOptions {
  pdfSource: File | string;
  signatureImageUrl?: string | null;
  pageNum?: number; // 1-indexed page (default: 1)
  posX: number; // percentage (0.0 to 1.0, center X)
  posY: number; // percentage (0.0 to 1.0, center Y from top of page)
  widthPercent: number; // percentage of page width (0.0 to 1.0)
  districtName?: string;
  serviceName?: string;
}

/**
 * Loads an image from URL and converts it to PNG Uint8Array bytes via an offscreen canvas.
 * Fallback to direct fetch if canvas is unavailable or taints.
 */
async function getPngBytes(url: string): Promise<{ bytes: Uint8Array; isJpg?: boolean }> {
  // 1. Try Canvas conversion to guarantee PNG with alpha transparency
  if (typeof window !== "undefined") {
    try {
      const bytes = await new Promise<Uint8Array>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth || 300;
            canvas.height = img.naturalHeight || 120;
            const ctx = canvas.getContext("2d");
            if (!ctx) return reject(new Error("Canvas context failed"));
            ctx.drawImage(img, 0, 0);
            canvas.toBlob(async (blob) => {
              if (!blob) return reject(new Error("Canvas toBlob failed"));
              const buf = await blob.arrayBuffer();
              resolve(new Uint8Array(buf));
            }, "image/png");
          } catch (err) {
            reject(err);
          }
        };
        img.onerror = (e) => reject(e);
        img.src = url;
      });
      return { bytes };
    } catch {
      // Fall through to direct fetch
    }
  }

  // 2. Direct fetch fallback
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch signature image: ${res.statusText}`);
  const buffer = await res.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // Check magic bytes: JPEG is 0xFF 0xD8
  const isJpg = bytes[0] === 0xff && bytes[1] === 0xd8;
  return { bytes, isJpg };
}

/**
 * Stamps a district authorized signature seal onto a PDF document
 * at the exact coordinates selected in the studio, then triggers a download.
 */
export async function stampAndDownloadPdf({
  pdfSource,
  signatureImageUrl,
  pageNum = 1,
  posX,
  posY,
  widthPercent,
  districtName,
  serviceName,
}: StampAndDownloadOptions): Promise<void> {
  // 1. Load source PDF bytes
  let pdfBytes: Uint8Array;
  if (pdfSource instanceof File) {
    const arrayBuffer = await pdfSource.arrayBuffer();
    pdfBytes = new Uint8Array(arrayBuffer);
  } else if (typeof pdfSource === "string" && pdfSource.trim()) {
    const res = await fetch(pdfSource);
    if (!res.ok) {
      throw new Error(`Failed to fetch base PDF template (${res.status}): ${res.statusText}`);
    }
    const arrayBuffer = await res.arrayBuffer();
    pdfBytes = new Uint8Array(arrayBuffer);
  } else {
    throw new Error("No PDF document available to stamp.");
  }

  // 2. Load PDFDocument with pdf-lib
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const totalPages = pdfDoc.getPageCount();
  const targetPageIndex = Math.max(0, Math.min(totalPages - 1, (pageNum || 1) - 1));
  const page = pdfDoc.getPage(targetPageIndex);

  // 3. Compute dimensions and positioning
  // Note: PDF coordinate system has (0, 0) at the BOTTOM-LEFT of the page.
  const { width, height } = page.getSize();
  const stampWidth = Math.max(30, width * (widthPercent || 0.25));
  const stampHeight = stampWidth * (1.2 / 3); // 3:1.2 aspect ratio from studio preview

  const centerX = width * posX;
  const centerYFromTop = height * posY;
  const centerY = height - centerYFromTop; // Invert Y for PDF coordinates

  const stampX = Math.max(0, Math.min(width - stampWidth, centerX - stampWidth / 2));
  const stampY = Math.max(0, Math.min(height - stampHeight, centerY - stampHeight / 2));

  // 4. Embed signature image or draw official seal
  let imageEmbedded = false;
  if (signatureImageUrl && signatureImageUrl.trim()) {
    try {
      const { bytes, isJpg } = await getPngBytes(signatureImageUrl);
      const embeddedImg = isJpg
        ? await pdfDoc.embedJpg(bytes)
        : await pdfDoc.embedPng(bytes);

      // Replicate CSS object-contain inside the studio bounding box exactly (0 artificial inset)
      const availWidth = stampWidth;
      const availHeight = stampHeight;

      const imgAspect = embeddedImg.width / embeddedImg.height;
      const boxAspect = availWidth / availHeight;

      let drawWidth = availWidth;
      let drawHeight = availHeight;

      if (imgAspect > boxAspect) {
        // Image is wider than container box
        drawWidth = availWidth;
        drawHeight = availWidth / imgAspect;
      } else {
        // Image is taller than container box
        drawHeight = availHeight;
        drawWidth = availHeight * imgAspect;
      }

      // Center within the designated studio stamp bounding box
      const drawX = stampX + (stampWidth - drawWidth) / 2;
      const drawY = stampY + (stampHeight - drawHeight) / 2;

      page.drawImage(embeddedImg, {
        x: drawX,
        y: drawY,
        width: drawWidth,
        height: drawHeight,
      });
      imageEmbedded = true;
    } catch (err) {
      console.warn("Could not embed signature graphic, using vectorized seal box fallback:", err);
    }
  }

  // Fallback vectorized seal stamp if no image was embedded
  if (!imageEmbedded) {
    // Background seal container
    page.drawRectangle({
      x: stampX,
      y: stampY,
      width: stampWidth,
      height: stampHeight,
      color: rgb(1, 0.96, 0.92), // light orange wash
      borderColor: rgb(0.92, 0.35, 0.05), // #ea580c
      borderWidth: 1.5,
      opacity: 0.85,
    });

    const sealText = districtName
      ? `${districtName.toUpperCase()} DISTRICT OFFICIAL STAMP`
      : "DISTRICT OFFICIAL SEAL & SIGNATURE";

    page.drawText(sealText, {
      x: stampX + 6,
      y: stampY + stampHeight / 2 - 2,
      size: Math.max(6, Math.min(9, stampWidth / 22)),
      color: rgb(0.12, 0.23, 0.54), // #1e3a8a
    });
  }

  // 5. Save the stamped PDF
  const outputPdfBytes = await pdfDoc.save();

  // 6. Trigger download in browser
  const blob = new Blob([outputPdfBytes as unknown as BlobPart], { type: "application/pdf" });
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = downloadUrl;

  const baseFileName = (serviceName || "certificate").replace(/[^a-zA-Z0-9_\u0B80-\u0BFF-]/g, "_");
  const districtSuffix = districtName ? `_${districtName.replace(/[^a-zA-Z0-9_\u0B80-\u0BFF-]/g, "_")}` : "";
  link.download = `${baseFileName}${districtSuffix}_signed.pdf`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(downloadUrl);
}
