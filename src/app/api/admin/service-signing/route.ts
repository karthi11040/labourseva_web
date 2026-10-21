import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedActor } from "@/lib/staff-session";

const signatureDataFile = path.join(process.cwd(), "data", "district-signatures.json");
const templateUploadDir = path.join(process.cwd(), "public", "uploads", "service-templates");

function adminOnly(request: Request) {
  return getAuthenticatedActor(request).role === "ADMIN";
}

export async function GET(request: Request) {
  if (!adminOnly(request)) return NextResponse.json({ ok: false, error: "Administrator access is required." }, { status: 403 });
  try {
    const [services, districts, signatureText] = await Promise.all([
      prisma.$queryRawUnsafe<any[]>(`SELECT s.id, s.code, s.name_en, p.page, p.x_frac, p.y_frac, p.w_frac, p.h_frac, t.file_name, t.storage_key FROM services s LEFT JOIN service_signature_placements p ON p.service_id = s.id LEFT JOIN service_document_templates t ON t.service_id = s.id WHERE s.active = 1 ORDER BY s.name_en`),
      prisma.$queryRawUnsafe<any[]>(`SELECT id, COALESCE(name_en, name) AS name, name AS name_ta FROM districts WHERE active = 1 ORDER BY COALESCE(name_en, name)`),
      fs.readFile(signatureDataFile, "utf8").catch(() => "[]"),
    ]);
    const signatures = JSON.parse(signatureText) as Array<{ districtId: number; storageKey: string; officerName: string }>;
    return NextResponse.json({ ok: true, services, districts, signatures });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unable to load signing studio data." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!adminOnly(request)) return NextResponse.json({ ok: false, error: "Administrator access is required." }, { status: 403 });
  try {
    const form = await request.formData();
    const serviceId = Number(form.get("serviceId"));
    const file = form.get("file");
    if (!Number.isInteger(serviceId) || serviceId < 1) return NextResponse.json({ ok: false, error: "Select a service." }, { status: 400 });
    if (!(file instanceof File) || file.type !== "application/pdf" || file.size > 20 * 1024 * 1024) return NextResponse.json({ ok: false, error: "Upload a PDF template up to 20 MB." }, { status: 400 });
    const [service] = await prisma.$queryRawUnsafe<any[]>(`SELECT id FROM services WHERE id = ? LIMIT 1`, serviceId);
    if (!service) return NextResponse.json({ ok: false, error: "Service not found." }, { status: 404 });
    const storageKey = `/uploads/service-templates/service-${serviceId}-${Date.now()}.pdf`;
    await fs.mkdir(templateUploadDir, { recursive: true });
    await fs.writeFile(path.join(process.cwd(), "public", storageKey), Buffer.from(await file.arrayBuffer()));
    await prisma.$executeRawUnsafe(`INSERT INTO service_document_templates (service_id, file_name, storage_key, mime_type, byte_size, updated_at) VALUES (?, ?, ?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE file_name = VALUES(file_name), storage_key = VALUES(storage_key), mime_type = VALUES(mime_type), byte_size = VALUES(byte_size), updated_at = NOW()`, serviceId, file.name, storageKey, file.type, file.size);
    return NextResponse.json({ ok: true, template: { fileName: file.name, storageKey } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Template upload failed." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!adminOnly(request)) return NextResponse.json({ ok: false, error: "Administrator access is required." }, { status: 403 });
  try {
    const body = await request.json();
    const serviceId = Number(body.serviceId); const page = Number(body.page);
    const values = [body.xFrac, body.yFrac, body.wFrac, body.hFrac].map(Number);
    if (!Number.isInteger(serviceId) || !Number.isInteger(page) || page < 1 || values.some((value) => !Number.isFinite(value) || value < 0 || value > 1) || values[2] <= 0 || values[3] <= 0 || values[0] + values[2] > 1 || values[1] + values[3] > 1) return NextResponse.json({ ok: false, error: "Use a valid signature area within the PDF page." }, { status: 400 });
    await prisma.$executeRawUnsafe(`INSERT INTO service_signature_placements (service_id, page, x_frac, y_frac, w_frac, h_frac) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE page = VALUES(page), x_frac = VALUES(x_frac), y_frac = VALUES(y_frac), w_frac = VALUES(w_frac), h_frac = VALUES(h_frac)`, serviceId, page, ...values);
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unable to save signature placement." }, { status: 500 }); }
}
