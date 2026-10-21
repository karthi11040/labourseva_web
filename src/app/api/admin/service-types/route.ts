import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const uploadTypesDir = path.join(process.cwd(), "public", "assets", "uploads", "types");

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

export async function GET() {
  try {
    const typesRaw = await prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        st.id,
        st.name,
        st.description,
        st.image_path,
        st.status,
        st.sort_order,
        COUNT(s.id) AS sub_services_count
      FROM service_types st
      LEFT JOIN services s ON s.service_type_id = st.id
      GROUP BY st.id, st.name, st.description, st.image_path, st.status, st.sort_order
      ORDER BY st.sort_order ASC, st.id ASC
    `);

    const types = typesRaw.map((t) => ({
      id: Number(t.id),
      name: t.name,
      description: t.description || "",
      image_path: normalizeAssetPath(t.image_path),
      status: t.status || "active",
      sort_order: Number(t.sort_order || 0),
      sub_services_count: Number(t.sub_services_count || 0),
    }));

    return NextResponse.json({ ok: true, types });
  } catch (error) {
    console.error("GET /api/admin/service-types error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to load service types" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    let name = "";
    let description = "";
    let image_path: string | null = null;
    let status = "active";
    let sort_order = 0;

    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      name = String(form.get("name") || "").trim();
      description = String(form.get("description") || "").trim();
      status = String(form.get("status") || "active");
      sort_order = Number(form.get("sort_order")) || 0;
      image_path = form.get("image_path") ? String(form.get("image_path")).trim() : null;

      const file = form.get("image_file");
      if (file instanceof File && file.size > 0) {
        await fs.mkdir(uploadTypesDir, { recursive: true });
        const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const filename = `type_${Date.now()}_${cleanName}`;
        const filePath = path.join(uploadTypesDir, filename);
        await fs.writeFile(filePath, Buffer.from(await file.arrayBuffer()));
        image_path = `/assets/uploads/types/${filename}`;
      }
    } else {
      const body = await request.json();
      name = String(body.name || "").trim();
      description = String(body.description || "").trim();
      status = String(body.status || "active");
      sort_order = Number(body.sort_order) || 0;
      image_path = body.image_path ? String(body.image_path).trim() : null;
    }

    if (!name) {
      return NextResponse.json({ ok: false, error: "Main Service name is required." }, { status: 400 });
    }

    await prisma.$executeRawUnsafe(
      `INSERT INTO service_types (name, description, image_path, status, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      name,
      description || null,
      image_path || null,
      status,
      sort_order
    );

    const [created] = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id FROM service_types WHERE name = ? ORDER BY id DESC LIMIT 1`,
      name
    );

    return NextResponse.json({
      ok: true,
      id: created ? Number(created.id) : null,
      message: "Main Service created successfully.",
    });
  } catch (error) {
    console.error("POST /api/admin/service-types error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to create service type" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    let id: number | null = null;
    let name: string | null = null;
    let description: string | null = null;
    let image_path: string | null = null;
    let status: string | null = null;
    let sort_order: number | null = null;

    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      id = Number(form.get("id"));
      if (form.has("name")) name = String(form.get("name") || "").trim();
      if (form.has("description")) description = String(form.get("description") || "").trim();
      if (form.has("status")) status = String(form.get("status") || "active");
      if (form.has("sort_order")) sort_order = Number(form.get("sort_order")) || 0;
      if (form.has("image_path")) image_path = String(form.get("image_path")).trim();

      const file = form.get("image_file");
      if (file instanceof File && file.size > 0) {
        await fs.mkdir(uploadTypesDir, { recursive: true });
        const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const filename = `type_${Date.now()}_${cleanName}`;
        const filePath = path.join(uploadTypesDir, filename);
        await fs.writeFile(filePath, Buffer.from(await file.arrayBuffer()));
        image_path = `/assets/uploads/types/${filename}`;
      }
    } else {
      const body = await request.json();
      id = Number(body.id);
      if (body.name !== undefined) name = String(body.name).trim();
      if (body.description !== undefined) description = String(body.description).trim();
      if (body.status !== undefined) status = String(body.status);
      if (body.sort_order !== undefined) sort_order = Number(body.sort_order);
      if (body.image_path !== undefined) image_path = String(body.image_path).trim();
    }

    if (!id || id <= 0) {
      return NextResponse.json({ ok: false, error: "Valid Main Service ID required." }, { status: 400 });
    }

    const updates: string[] = ["updated_at = NOW()"];
    const values: any[] = [];

    if (name !== null) {
      updates.push("name = ?");
      values.push(name);
    }
    if (description !== null) {
      updates.push("description = ?");
      values.push(description);
    }
    if (image_path !== null) {
      updates.push("image_path = ?");
      values.push(image_path);
    }
    if (status !== null) {
      updates.push("status = ?");
      values.push(status);
    }
    if (sort_order !== null) {
      updates.push("sort_order = ?");
      values.push(sort_order);
    }

    values.push(id);
    await prisma.$executeRawUnsafe(
      `UPDATE service_types SET ${updates.join(", ")} WHERE id = ?`,
      ...values
    );

    return NextResponse.json({ ok: true, message: "Main Service updated successfully." });
  } catch (error) {
    console.error("PUT /api/admin/service-types error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to update service type" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get("id"));
    if (!id) {
      return NextResponse.json({ ok: false, error: "ID is required" }, { status: 400 });
    }

    await prisma.$executeRawUnsafe(
      `UPDATE service_types SET status = 'inactive', updated_at = NOW() WHERE id = ?`,
      id
    );

    return NextResponse.json({ ok: true, message: "Main Service marked inactive." });
  } catch (error) {
    console.error("DELETE /api/admin/service-types error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to delete" },
      { status: 500 }
    );
  }
}
