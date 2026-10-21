import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { adminSessionCookieName, isAdminSession } from "@/lib/admin-session";

export const dynamic = "force-dynamic";

async function isAuthorizedAdmin(request?: Request): Promise<boolean> {
  let adminVal: string | undefined;
  if (request) {
    const cookieHeader = request.headers.get("cookie") || "";
    for (const part of cookieHeader.split(";")) {
      const [k, v] = part.trim().split("=");
      if (k === adminSessionCookieName) {
        adminVal = decodeURIComponent(v || "");
        break;
      }
    }
  }
  if (!adminVal) {
    try {
      const cookieStore = await cookies();
      adminVal = cookieStore.get(adminSessionCookieName)?.value;
    } catch {
      // Outside Next.js request scope
    }
  }
  return isAdminSession(adminVal);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mainCatId = searchParams.get("main_category_id");
    const subCatId = searchParams.get("sub_category_id");

    const params: any[] = [];
    let query = `
      SELECT 
        s.id,
        s.service_name,
        s.service_cost,
        s.main_category_id,
        s.sub_category_id,
        s.details,
        s.service_image,
        s.status,
        s.created_at,
        m.category_name as main_category_name,
        sub.sub_category_name
      FROM es_services s
      LEFT JOIN es_main_categories m ON s.main_category_id = m.id
      LEFT JOIN es_sub_categories sub ON s.sub_category_id = sub.id
      WHERE 1=1
    `;

    if (mainCatId) {
      query += ` AND s.main_category_id = ?`;
      params.push(Number(mainCatId));
    }
    if (subCatId) {
      query += ` AND s.sub_category_id = ?`;
      params.push(Number(subCatId));
    }

    query += ` ORDER BY s.id DESC`;

    const services = await prisma.$queryRawUnsafe<any[]>(query, ...params);

    // Fetch fields for all retrieved services
    const serviceIds = services.map((s) => s.id);
    let fieldsByService: Record<number, any[]> = {};

    if (serviceIds.length > 0) {
      const placeholders = serviceIds.map(() => "?").join(",");
      const fieldsList = await prisma.$queryRawUnsafe<any[]>(
        `
        SELECT 
          id,
          service_id,
          field_name,
          field_type,
          is_required,
          field_options,
          sort_order
        FROM es_service_fields
        WHERE service_id IN (${placeholders})
        ORDER BY sort_order ASC, id ASC
        `,
        ...serviceIds
      );

      for (const f of fieldsList) {
        if (!fieldsByService[f.service_id]) fieldsByService[f.service_id] = [];
        let parsedConfig: any = {};
        let rawOptionsStr = "";

        if (f.field_options) {
          if (typeof f.field_options === "string") {
            try {
              parsedConfig = JSON.parse(f.field_options);
            } catch {
              parsedConfig = { options: f.field_options };
            }
          } else if (typeof f.field_options === "object") {
            parsedConfig = f.field_options;
          }
        }

        rawOptionsStr = parsedConfig.options || parsedConfig.formats || (typeof f.field_options === "string" ? f.field_options : "");

        fieldsByService[f.service_id].push({
          id: f.id,
          key: `field_${f.id}`,
          name: f.field_name,
          type: f.field_type,
          required: Boolean(f.is_required),
          options: rawOptionsStr,
          placeholder: parsedConfig.placeholder || "",
          helpText: parsedConfig.helpText || "",
          validation: parsedConfig.validation || "",
          width: parsedConfig.width || "full",
          section: parsedConfig.section || "General Information",
          sortOrder: f.sort_order,
        });
      }
    }

    const formatted = services.map((s) => ({
      id: s.id,
      code: `ES-SVC-${s.id}`,
      name: s.service_name,
      cost: Number(s.service_cost || 0),
      mainCategoryId: String(s.main_category_id),
      mainCategoryName: s.main_category_name || "General",
      subCategoryId: String(s.sub_category_id || ""),
      subCategoryName: s.sub_category_name || "",
      details: s.details || "",
      active: s.status === "active",
      image: s.service_image || "",
      fields: fieldsByService[s.id] || [],
      createdAt: s.created_at,
    }));

    return NextResponse.json({ ok: true, services: formatted });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to load services" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!(await isAuthorizedAdmin(request))) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      service_name,
      name,
      service_cost,
      cost,
      main_category_id,
      mainCategoryId,
      sub_category_id,
      subCategoryId,
      details,
      service_image,
      image,
      fields,
      status,
      active,
    } = body;

    const svcName = String(service_name || name || "").trim();
    const svcCost = Number(service_cost !== undefined ? service_cost : cost !== undefined ? cost : 0);
    const mCatId = Number(main_category_id || mainCategoryId || 1);
    const sCatId = Number(sub_category_id || subCategoryId || 1);
    const svcDetails = String(details || "").trim();
    const svcImage = String(service_image || image || "").trim();
    const svcStatus = active === false || status === "inactive" ? "inactive" : "active";

    if (!svcName) {
      return NextResponse.json({ ok: false, error: "Service name is required." }, { status: 400 });
    }
    if (!Number.isFinite(svcCost) || svcCost < 0) {
      return NextResponse.json({ ok: false, error: "Service cost must be a valid non-negative number." }, { status: 400 });
    }

    // Insert into es_services table using parameterized query
    await prisma.$executeRawUnsafe(
      `INSERT INTO es_services (
        service_name,
        service_cost,
        main_category_id,
        sub_category_id,
        details,
        service_image,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      svcName,
      svcCost,
      mCatId,
      sCatId,
      svcDetails,
      svcImage || null,
      svcStatus
    );

    const [created] = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id FROM es_services WHERE service_name = ? AND main_category_id = ? ORDER BY id DESC LIMIT 1`,
      svcName,
      mCatId
    );

    const serviceId = created?.id;

    // Batch insert fields if provided using parameterized queries
    if (serviceId && Array.isArray(fields) && fields.length > 0) {
      for (let i = 0; i < fields.length; i++) {
        const f = fields[i];
        const fName = String(f.name || "").trim();
        if (!fName) continue;
        const fType = String(f.type || "text");
        const fReq = f.required ? 1 : 0;

        const optionsPayload: any = {
          options: f.options || "",
          placeholder: f.placeholder || "",
          helpText: f.helpText || "",
          validation: f.validation || "",
          width: f.width || "full",
          section: f.section || "General Information",
        };
        if (fType === "file") optionsPayload.formats = f.options || "pdf,jpg,png";

        const optJson = JSON.stringify(optionsPayload);
        await prisma.$executeRawUnsafe(
          `INSERT INTO es_service_fields (
            service_id,
            field_name,
            field_type,
            is_required,
            field_options,
            sort_order
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          serviceId,
          fName,
          fType,
          fReq,
          optJson,
          i
        );
      }
    }

    return NextResponse.json({
      ok: true,
      service: {
        id: serviceId,
        name: svcName,
        cost: svcCost,
        mainCategoryId: String(mCatId),
        subCategoryId: String(sCatId),
        details: svcDetails,
        active: svcStatus === "active",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to create service." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    if (!(await isAuthorizedAdmin(request))) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const id = Number(body.id);
    if (!id) {
      return NextResponse.json({ ok: false, error: "Service ID is required." }, { status: 400 });
    }

    const svcName = String(body.service_name || body.name || "").trim();
    const svcCost = Number(body.service_cost !== undefined ? body.service_cost : body.cost);
    const mCatId = Number(body.main_category_id || body.mainCategoryId);
    const sCatId = Number(body.sub_category_id || body.subCategoryId);
    const svcDetails = body.details !== undefined ? String(body.details).trim() : null;
    const svcImage = body.service_image !== undefined ? String(body.service_image).trim() : body.image !== undefined ? String(body.image).trim() : null;
    const svcStatus = body.active === false || body.status === "inactive" ? "inactive" : "active";

    const updateParts: string[] = [];
    const updateParams: any[] = [];

    if (svcName) {
      updateParts.push("service_name = ?");
      updateParams.push(svcName);
    }
    if (Number.isFinite(svcCost)) {
      updateParts.push("service_cost = ?");
      updateParams.push(svcCost);
    }
    if (mCatId) {
      updateParts.push("main_category_id = ?");
      updateParams.push(mCatId);
    }
    if (sCatId) {
      updateParts.push("sub_category_id = ?");
      updateParams.push(sCatId);
    }
    if (svcDetails !== null) {
      updateParts.push("details = ?");
      updateParams.push(svcDetails);
    }
    if (svcImage !== null) {
      updateParts.push("service_image = ?");
      updateParams.push(svcImage || null);
    }
    updateParts.push("status = ?");
    updateParams.push(svcStatus);

    if (updateParts.length > 0) {
      updateParams.push(id);
      await prisma.$executeRawUnsafe(
        `UPDATE es_services SET ${updateParts.join(", ")} WHERE id = ?`,
        ...updateParams
      );
    }

    // Update dynamic fields using parameterized queries
    if (Array.isArray(body.fields)) {
      // 1. Delete old fields
      await prisma.$executeRawUnsafe(`DELETE FROM es_service_fields WHERE service_id = ?`, id);

      // 2. Insert new fields
      for (let i = 0; i < body.fields.length; i++) {
        const f = body.fields[i];
        const fName = String(f.name || "").trim();
        if (!fName) continue;
        const fType = String(f.type || "text");
        const fReq = f.required ? 1 : 0;

        const optionsPayload: any = {
          options: f.options || "",
          placeholder: f.placeholder || "",
          helpText: f.helpText || "",
          validation: f.validation || "",
          width: f.width || "full",
          section: f.section || "General Information",
        };
        if (fType === "file") optionsPayload.formats = f.options || "pdf,jpg,png";

        const optJson = JSON.stringify(optionsPayload);
        await prisma.$executeRawUnsafe(
          `INSERT INTO es_service_fields (
            service_id,
            field_name,
            field_type,
            is_required,
            field_options,
            sort_order
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          id,
          fName,
          fType,
          fReq,
          optJson,
          i
        );
      }
    }

    return NextResponse.json({ ok: true, id });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to update service." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    if (!(await isAuthorizedAdmin(request))) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get("id"));
    if (!id) return NextResponse.json({ ok: false, error: "Missing service ID" }, { status: 400 });

    // Delete child fields first
    await prisma.$executeRawUnsafe(`DELETE FROM es_service_fields WHERE service_id = ?`, id);
    // Delete service
    await prisma.$executeRawUnsafe(`DELETE FROM es_services WHERE id = ?`, id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to delete service" },
      { status: 500 }
    );
  }
}
