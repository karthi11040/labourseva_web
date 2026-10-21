import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const uploadDir = path.join(process.cwd(), "public", "assets", "uploads", "services");

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
    // 1. Fetch all services
    const servicesRaw = await prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        s.id,
        s.name,
        s.description,
        s.service_type_id,
        s.payment_amount,
        s.retailer_amount,
        s.status,
        s.assigned_employee_id,
        s.image_path,
        s.pdf_path,
        s.sign_pos_x,
        s.sign_pos_y,
        s.sign_page,
        s.sign_width,
        s.sign_height,
        s.doc_width,
        s.doc_height,
        e.name AS employee_name,
        st.name AS type_name
      FROM services s
      LEFT JOIN employees e ON s.assigned_employee_id = e.id
      LEFT JOIN service_types st ON s.service_type_id = st.id
      ORDER BY s.id DESC
    `);

    // 2. Fetch service availability rows
    const availabilityRaw = await prisma.$queryRawUnsafe<any[]>(`
      SELECT service_id, district_id, is_offline
      FROM service_availability
    `);

    const availabilityMap: Record<number, number[]> = {};
    for (const row of availabilityRaw) {
      if (row.is_offline === 0) {
        if (!availabilityMap[row.service_id]) availabilityMap[row.service_id] = [];
        availabilityMap[row.service_id].push(Number(row.district_id));
      }
    }

    // 3. Fetch all active districts
    const districtsRaw = await prisma.$queryRawUnsafe<any[]>(`
      SELECT id, name, name_en, signature_path
      FROM districts
      WHERE active = 1
      ORDER BY id ASC
    `);

    const districtsWithSignatureIds = new Set(
      districtsRaw
        .filter((d) => d.signature_path && d.signature_path.trim() !== "")
        .map((d) => Number(d.id))
    );

    const districts = districtsRaw.map((d) => ({
      id: Number(d.id),
      name: d.name_en ? `${d.name_en} (${d.name})` : d.name,
      signature_path: normalizeAssetPath(d.signature_path),
    }));

    // 4. Fetch service types
    const typesRaw = await prisma.$queryRawUnsafe<any[]>(`
      SELECT id, name, description, image_path
      FROM service_types
      WHERE status = 'active' OR status IS NULL
      ORDER BY sort_order ASC, id ASC
    `);

    const types = typesRaw.map((t) => ({
      id: Number(t.id),
      name: t.name,
      description: t.description || "",
      image_path: normalizeAssetPath(t.image_path),
    }));

    // 5. Fetch employees
    const employeesRaw = await prisma.$queryRawUnsafe<any[]>(`
      SELECT id, name
      FROM employees
      ORDER BY name ASC
    `);

    const employees = employeesRaw.map((e) => ({
      id: Number(e.id),
      name: e.name,
    }));

    // Format services: districts without an authorized signature MUST be turned off (excluded)
    const services = servicesRaw.map((s) => {
      const explicitOnline = availabilityMap[s.id] !== undefined
        ? availabilityMap[s.id]
        : Array.from(districtsWithSignatureIds);

      // Filter out any district that lacks a signature stamp
      const onlineDistricts = explicitOnline.filter((distId) => districtsWithSignatureIds.has(distId));

      return {
        id: Number(s.id),
        name: s.name || "Untitled Service",
        description: s.description || "",
        type_id: s.service_type_id ? Number(s.service_type_id) : 0,
        type_name: s.type_name || "General",
        payment_amount: Number(s.payment_amount || 0),
        retailer_amount: Number(s.retailer_amount || 0),
        status: (s.status === "active" ? "active" : "inactive") as "active" | "inactive",
        assigned_employee_id: s.assigned_employee_id ? Number(s.assigned_employee_id) : null,
        assigned_employee_name: s.employee_name || null,
        image_path: normalizeAssetPath(s.image_path),
        pdf_path: normalizeAssetPath(s.pdf_path),
        sign_pos_x: s.sign_pos_x !== null ? Number(s.sign_pos_x) : 0.5,
        sign_pos_y: s.sign_pos_y !== null ? Number(s.sign_pos_y) : 0.8,
        sign_page: s.sign_page ? Number(s.sign_page) : 1,
        sign_width: s.sign_width !== null ? Number(s.sign_width) : 0.25,
        sign_height: s.sign_height !== null ? Number(s.sign_height) : null,
        doc_width: s.doc_width !== null && s.doc_width !== undefined ? Number(s.doc_width) : null,
        doc_height: s.doc_height !== null && s.doc_height !== undefined ? Number(s.doc_height) : null,
        online_districts: onlineDistricts,
      };
    });

    return NextResponse.json({
      ok: true,
      services,
      types,
      districts,
      employees,
    });
  } catch (error) {
    console.error("GET /api/admin/services error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to load services data" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    let name = "";
    let description = "";
    let type_id = 0;
    let payment_amount = 0;
    let retailer_amount = 0;
    let status = "active";
    let assigned_employee_id: number | null = null;
    let sign_pos_x = 0.5;
    let sign_pos_y = 0.8;
    let sign_page = 1;
    let sign_width = 0.25;
    let sign_height = 0.12;
    let doc_width: number | null = null;
    let doc_height: number | null = null;
    let online_districts: number[] = [];
    let pdf_path: string | null = null;
    let image_path: string | null = null;

    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      name = String(form.get("name") || "").trim();
      description = String(form.get("description") || "").trim();
      type_id = Number(form.get("type_id")) || 0;
      payment_amount = Number(form.get("payment_amount")) || 0;
      retailer_amount = Number(form.get("retailer_amount")) || 0;
      status = String(form.get("status") || "active").toLowerCase() === "inactive" ? "inactive" : "active";
      const empRaw = form.get("assigned_employee_id");
      assigned_employee_id = empRaw ? Number(empRaw) : null;
      sign_pos_x = form.get("sign_pos_x") !== null ? Number(form.get("sign_pos_x")) : 0.5;
      sign_pos_y = form.get("sign_pos_y") !== null ? Number(form.get("sign_pos_y")) : 0.8;
      sign_page = Number(form.get("sign_page")) || 1;
      sign_width = form.get("sign_width") !== null ? Number(form.get("sign_width")) : 0.25;
      sign_height = form.get("sign_height") !== null ? Number(form.get("sign_height")) : 0.12;
      if (form.has("doc_width")) doc_width = Number(form.get("doc_width"));
      if (form.has("doc_height")) doc_height = Number(form.get("doc_height"));
      if (form.has("image_path")) image_path = String(form.get("image_path") || "").trim();

      const onlineDistrictsRaw = form.get("online_districts");
      if (typeof onlineDistrictsRaw === "string") {
        try {
          online_districts = JSON.parse(onlineDistrictsRaw);
        } catch {
          online_districts = onlineDistrictsRaw.split(",").map((s) => Number(s.trim())).filter(Boolean);
        }
      }

      // Handle PDF template upload
      const file = form.get("pdf_file");
      if (file instanceof File && file.size > 0) {
        await fs.mkdir(uploadDir, { recursive: true });
        const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const filename = `doc_${Date.now()}_${cleanName}`;
        const filePath = path.join(uploadDir, filename);
        await fs.writeFile(filePath, Buffer.from(await file.arrayBuffer()));
        pdf_path = `/assets/uploads/services/${filename}`;
      }

      // Handle Sub Service Logo upload
      const imgFile = form.get("image_file");
      if (imgFile instanceof File && imgFile.size > 0) {
        await fs.mkdir(uploadDir, { recursive: true });
        const cleanName = imgFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const filename = `img_${Date.now()}_${cleanName}`;
        const filePath = path.join(uploadDir, filename);
        await fs.writeFile(filePath, Buffer.from(await imgFile.arrayBuffer()));
        image_path = `/assets/uploads/services/${filename}`;
      }
    } else {
      const body = await request.json();
      name = String(body.name || "").trim();
      description = String(body.description || "").trim();
      type_id = Number(body.type_id) || 0;
      payment_amount = Number(body.payment_amount) || 0;
      retailer_amount = Number(body.retailer_amount) || 0;
      status = body.status === "inactive" ? "inactive" : "active";
      assigned_employee_id = body.assigned_employee_id ? Number(body.assigned_employee_id) : null;
      sign_pos_x = body.sign_pos_x !== undefined ? Number(body.sign_pos_x) : 0.5;
      sign_pos_y = body.sign_pos_y !== undefined ? Number(body.sign_pos_y) : 0.8;
      sign_page = Number(body.sign_page) || 1;
      sign_width = body.sign_width !== undefined ? Number(body.sign_width) : 0.25;
      sign_height = body.sign_height !== undefined ? Number(body.sign_height) : 0.12;
      if (body.doc_width !== undefined) doc_width = Number(body.doc_width);
      if (body.doc_height !== undefined) doc_height = Number(body.doc_height);
      online_districts = Array.isArray(body.online_districts) ? body.online_districts.map(Number) : [];
      pdf_path = body.pdf_path || null;
      image_path = body.image_path || null;
    }

    if (!name) {
      return NextResponse.json({ ok: false, error: "Service name is required." }, { status: 400 });
    }

    // Insert service record into database
    await prisma.$executeRawUnsafe(
      `INSERT INTO services (
        name, description, service_type_id, payment_amount, retailer_amount,
        status, assigned_employee_id, image_path, pdf_path, sign_pos_x, sign_pos_y,
        sign_page, sign_width, sign_height, doc_width, doc_height, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      name,
      description || null,
      type_id > 0 ? type_id : null,
      payment_amount,
      retailer_amount,
      status,
      assigned_employee_id,
      image_path || null,
      pdf_path,
      sign_pos_x,
      sign_pos_y,
      sign_page,
      sign_width,
      sign_height,
      doc_width,
      doc_height
    );

    // Get the newly created service id
    const [created] = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id FROM services WHERE name = ? ORDER BY id DESC LIMIT 1`,
      name
    );
    const serviceId = created ? Number(created.id) : Date.now();

    // Update service availability for online districts (unsigned districts must remain offline)
    if (online_districts.length > 0) {
      const allDistricts = await prisma.$queryRawUnsafe<any[]>(
        `SELECT id, signature_path FROM districts WHERE active = 1`
      );
      for (const d of allDistricts) {
        const hasSignature = Boolean(d.signature_path && d.signature_path.trim() !== "");
        // Only allow online (is_offline = 0) if district has an authorized signature stamp on file
        const isOffline = hasSignature && online_districts.includes(Number(d.id)) ? 0 : 1;
        await prisma.$executeRawUnsafe(
          `INSERT INTO service_availability (service_id, district_id, is_offline, created_at)
           VALUES (?, ?, ?, NOW())
           ON DUPLICATE KEY UPDATE is_offline = VALUES(is_offline)`,
          serviceId,
          Number(d.id),
          isOffline
        );
      }
    }

    return NextResponse.json({
      ok: true,
      serviceId,
      pdf_path,
      message: "Service created successfully.",
    });
  } catch (error) {
    console.error("POST /api/admin/services error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to create service" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    let id: number | null = null;
    let name: string | null = null;
    let description: string | null = null;
    let type_id: number | null = null;
    let payment_amount: number | null = null;
    let retailer_amount: number | null = null;
    let status: string | null = null;
    let assigned_employee_id: number | null | undefined = undefined;
    let sign_pos_x: number | null = null;
    let sign_pos_y: number | null = null;
    let sign_page: number | null = null;
    let sign_width: number | null = null;
    let sign_height: number | null = null;
    let doc_width: number | null = null;
    let doc_height: number | null = null;
    let online_districts: number[] | null = null;
    let pdf_path: string | null = null;
    let image_path: string | null = null;

    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      id = Number(form.get("id"));
      if (form.has("name")) name = String(form.get("name") || "").trim();
      if (form.has("description")) description = String(form.get("description") || "").trim();
      if (form.has("type_id")) type_id = Number(form.get("type_id")) || 0;
      if (form.has("payment_amount")) payment_amount = Number(form.get("payment_amount")) || 0;
      if (form.has("retailer_amount")) retailer_amount = Number(form.get("retailer_amount")) || 0;
      if (form.has("status")) status = String(form.get("status") || "active").toLowerCase() === "inactive" ? "inactive" : "active";
      if (form.has("assigned_employee_id")) {
        const empRaw = form.get("assigned_employee_id");
        assigned_employee_id = empRaw ? Number(empRaw) : null;
      }
      if (form.has("sign_pos_x")) sign_pos_x = Number(form.get("sign_pos_x"));
      if (form.has("sign_pos_y")) sign_pos_y = Number(form.get("sign_pos_y"));
      if (form.has("sign_page")) sign_page = Number(form.get("sign_page"));
      if (form.has("sign_width")) sign_width = Number(form.get("sign_width"));
      if (form.has("sign_height")) sign_height = Number(form.get("sign_height"));
      if (form.has("doc_width")) doc_width = Number(form.get("doc_width"));
      if (form.has("doc_height")) doc_height = Number(form.get("doc_height"));
      if (form.has("image_path")) image_path = String(form.get("image_path") || "").trim();

      const onlineDistrictsRaw = form.get("online_districts");
      if (typeof onlineDistrictsRaw === "string") {
        try {
          online_districts = JSON.parse(onlineDistrictsRaw);
        } catch {
          online_districts = onlineDistrictsRaw.split(",").map((s) => Number(s.trim())).filter(Boolean);
        }
      }

      const file = form.get("pdf_file");
      if (file instanceof File && file.size > 0) {
        await fs.mkdir(uploadDir, { recursive: true });
        const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const filename = `doc_${Date.now()}_${cleanName}`;
        const filePath = path.join(uploadDir, filename);
        await fs.writeFile(filePath, Buffer.from(await file.arrayBuffer()));
        pdf_path = `/assets/uploads/services/${filename}`;
      }

      const imgFile = form.get("image_file");
      if (imgFile instanceof File && imgFile.size > 0) {
        await fs.mkdir(uploadDir, { recursive: true });
        const cleanName = imgFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const filename = `img_${Date.now()}_${cleanName}`;
        const filePath = path.join(uploadDir, filename);
        await fs.writeFile(filePath, Buffer.from(await imgFile.arrayBuffer()));
        image_path = `/assets/uploads/services/${filename}`;
      }
    } else {
      const body = await request.json();
      id = Number(body.id);
      if (body.name !== undefined) name = String(body.name).trim();
      if (body.description !== undefined) description = String(body.description).trim();
      if (body.type_id !== undefined) type_id = Number(body.type_id);
      if (body.payment_amount !== undefined) payment_amount = Number(body.payment_amount);
      if (body.retailer_amount !== undefined) retailer_amount = Number(body.retailer_amount);
      if (body.status !== undefined) status = body.status === "inactive" ? "inactive" : "active";
      if (body.assigned_employee_id !== undefined) assigned_employee_id = body.assigned_employee_id ? Number(body.assigned_employee_id) : null;
      if (body.sign_pos_x !== undefined) sign_pos_x = Number(body.sign_pos_x);
      if (body.sign_pos_y !== undefined) sign_pos_y = Number(body.sign_pos_y);
      if (body.sign_page !== undefined) sign_page = Number(body.sign_page);
      if (body.sign_width !== undefined) sign_width = Number(body.sign_width);
      if (body.sign_height !== undefined) sign_height = Number(body.sign_height);
      if (body.doc_width !== undefined) doc_width = Number(body.doc_width);
      if (body.doc_height !== undefined) doc_height = Number(body.doc_height);
      if (Array.isArray(body.online_districts)) online_districts = body.online_districts.map(Number);
      if (body.pdf_path !== undefined) pdf_path = body.pdf_path;
      if (body.image_path !== undefined) image_path = body.image_path;
    }

    if (!id || id <= 0) {
      return NextResponse.json({ ok: false, error: "Valid service ID is required." }, { status: 400 });
    }

    // Build dynamic update clauses
    const updates: string[] = [];
    const values: any[] = [];

    if (name !== null) {
      updates.push("name = ?");
      values.push(name);
    }
    if (description !== null) {
      updates.push("description = ?");
      values.push(description);
    }
    if (type_id !== null) {
      updates.push("service_type_id = ?");
      values.push(type_id > 0 ? type_id : null);
    }
    if (payment_amount !== null) {
      updates.push("payment_amount = ?");
      values.push(payment_amount);
    }
    if (retailer_amount !== null) {
      updates.push("retailer_amount = ?");
      values.push(retailer_amount);
    }
    if (status !== null) {
      updates.push("status = ?");
      values.push(status);
    }
    if (assigned_employee_id !== undefined) {
      updates.push("assigned_employee_id = ?");
      values.push(assigned_employee_id);
    }
    if (sign_pos_x !== null) {
      updates.push("sign_pos_x = ?");
      values.push(sign_pos_x);
    }
    if (sign_pos_y !== null) {
      updates.push("sign_pos_y = ?");
      values.push(sign_pos_y);
    }
    if (sign_page !== null) {
      updates.push("sign_page = ?");
      values.push(sign_page);
    }
    if (sign_width !== null) {
      updates.push("sign_width = ?");
      values.push(sign_width);
    }
    if (sign_height !== null) {
      updates.push("sign_height = ?");
      values.push(sign_height);
    }
    if (doc_width !== null && !isNaN(doc_width)) {
      updates.push("doc_width = ?");
      values.push(doc_width);
    }
    if (doc_height !== null && !isNaN(doc_height)) {
      updates.push("doc_height = ?");
      values.push(doc_height);
    }
    if (pdf_path !== null) {
      updates.push("pdf_path = ?");
      values.push(pdf_path);
    }
    if (image_path !== null) {
      updates.push("image_path = ?");
      values.push(image_path);
    }

    if (updates.length > 0) {
      values.push(id);
      await prisma.$executeRawUnsafe(
        `UPDATE services SET ${updates.join(", ")} WHERE id = ?`,
        ...values
      );
    }

    // Update district availability if provided (unsigned districts must remain offline)
    if (online_districts && Array.isArray(online_districts)) {
      const allDistricts = await prisma.$queryRawUnsafe<any[]>(
        `SELECT id, signature_path FROM districts WHERE active = 1`
      );
      for (const d of allDistricts) {
        const hasSignature = Boolean(d.signature_path && d.signature_path.trim() !== "");
        // Only allow online (is_offline = 0) if district has an authorized signature stamp on file
        const isOffline = hasSignature && online_districts.includes(Number(d.id)) ? 0 : 1;
        await prisma.$executeRawUnsafe(
          `INSERT INTO service_availability (service_id, district_id, is_offline, created_at)
           VALUES (?, ?, ?, NOW())
           ON DUPLICATE KEY UPDATE is_offline = VALUES(is_offline)`,
          id,
          Number(d.id),
          isOffline
        );
      }
    }

    return NextResponse.json({
      ok: true,
      serviceId: id,
      pdf_path,
      message: "Service updated successfully.",
    });
  } catch (error) {
    console.error("PUT /api/admin/services error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to update service" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let id = Number(searchParams.get("id"));

    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = Number(body.id);
    }

    if (!id || id <= 0) {
      return NextResponse.json({ ok: false, error: "Valid service ID is required." }, { status: 400 });
    }

    // Soft delete by marking inactive or delete
    await prisma.$executeRawUnsafe(`UPDATE services SET status = 'inactive' WHERE id = ?`, id);

    return NextResponse.json({
      ok: true,
      message: "Service set to inactive.",
    });
  } catch (error) {
    console.error("DELETE /api/admin/services error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to remove service" },
      { status: 500 }
    );
  }
}
