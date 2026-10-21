import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function normalizeAssetPath(p: string | null | undefined): string | null {
  if (!p) return null;
  let clean = p.trim();
  if (clean.startsWith("../assets/")) {
    clean = clean.replace(/^\.\.\/assets\//, "/assets/");
  } else if (clean.startsWith("assets/")) {
    clean = "/" + clean;
  }
  return clean;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const serviceIdParam = searchParams.get("id");

    if (serviceIdParam) {
      const serviceId = Number(serviceIdParam);
      const rows = await prisma.$queryRawUnsafe<any[]>(`
        SELECT 
          s.id,
          s.name,
          s.description,
          s.type,
          s.payment_amount,
          s.retailer_amount,
          s.image_path,
          s.pdf_path,
          s.sign_pos_x,
          s.sign_pos_y,
          s.sign_page,
          s.sign_width,
          s.service_type_id,
          st.name AS category_name,
          st.description AS category_description,
          st.image_path AS category_image_path
        FROM services s
        LEFT JOIN service_types st ON s.service_type_id = st.id
        WHERE s.id = ? AND (s.status = 'active' OR s.status IS NULL)
        LIMIT 1
      `, serviceId).catch(() => []);

      if (!rows || rows.length === 0) {
        return NextResponse.json({ ok: false, error: "Service not found or inactive" }, { status: 404 });
      }

      const s = rows[0];
      const service = {
        id: Number(s.id),
        name: s.name,
        description: s.description || "",
        categoryName: s.category_name || s.type || "Document Services",
        categoryDescription: s.category_description || "",
        fee: Number(s.payment_amount || 0),
        retailerFee: Number(s.retailer_amount || 0),
        logo: normalizeAssetPath(s.image_path) || normalizeAssetPath(s.category_image_path),
        pdf_path: normalizeAssetPath(s.pdf_path),
        mainServiceId: s.service_type_id ? Number(s.service_type_id) : 0,
        sign_pos_x: s.sign_pos_x,
        sign_pos_y: s.sign_pos_y,
        sign_page: s.sign_page,
        sign_width: s.sign_width,
      };

      return NextResponse.json({ ok: true, service });
    }

    // 1. Fetch real active service_types (Main Services) from DB
    const typesRaw = await prisma.$queryRawUnsafe<any[]>(`
      SELECT id, name, description, image_path, status, sort_order
      FROM service_types
      WHERE status = 'active' OR status IS NULL
      ORDER BY sort_order ASC, id ASC
    `).catch(() => []);

    // 2. Fetch real active services (Sub Services) from DB
    const servicesRaw = await prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        s.id,
        s.name,
        s.description,
        s.payment_amount,
        s.retailer_amount,
        s.image_path,
        s.pdf_path,
        s.service_type_id,
        st.name AS type_name,
        st.image_path AS type_image_path
      FROM services s
      LEFT JOIN service_types st ON s.service_type_id = st.id
      WHERE s.status = 'active' OR s.status IS NULL
      ORDER BY s.id ASC
    `).catch(() => []);

    // 3. Build Main Services array with their real sub-services ONLY (no dummy data)
    const mainServices = typesRaw.map((t) => {
      const typeId = Number(t.id);
      const subServices = servicesRaw
        .filter((s) => Number(s.service_type_id) === typeId)
        .map((s) => ({
          id: Number(s.id),
          name: s.name,
          description: s.description || "",
          fee: Number(s.payment_amount || 0),
          logo: normalizeAssetPath(s.image_path) || normalizeAssetPath(t.image_path),
          pdf_path: normalizeAssetPath(s.pdf_path),
          mainServiceId: typeId,
          mainServiceName: t.name,
        }));

      return {
        id: typeId,
        name: t.name,
        description: t.description || "",
        logo: normalizeAssetPath(t.image_path),
        subServices,
      };
    });

    // Check for any active services with null or unmatched service_type_id
    const typeIds = new Set(typesRaw.map((t) => Number(t.id)));
    const orphanServices = servicesRaw.filter((s) => !s.service_type_id || !typeIds.has(Number(s.service_type_id)));
    if (orphanServices.length > 0) {
      mainServices.push({
        id: 0,
        name: "General Services",
        description: "Statutory public services",
        logo: null,
        subServices: orphanServices.map((s) => ({
          id: Number(s.id),
          name: s.name,
          description: s.description || "",
          fee: Number(s.payment_amount || 0),
          logo: normalizeAssetPath(s.image_path),
          pdf_path: normalizeAssetPath(s.pdf_path),
          mainServiceId: 0,
          mainServiceName: "General Services",
        })),
      });
    }

    // Flatten all real subServices for flat list
    const flatServices: any[] = [];
    for (const main of mainServices) {
      for (const sub of main.subServices) {
        flatServices.push({
          id: sub.id,
          name: sub.name,
          description: sub.description,
          fee: sub.fee,
          type_name: main.name,
          image_path: sub.logo,
          pdf_path: sub.pdf_path || null,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      mainServices,
      services: flatServices,
    });
  } catch (err) {
    console.error("GET /api/services error:", err);
    return NextResponse.json({ ok: false, error: "Failed to load services" }, { status: 500 });
  }
}
