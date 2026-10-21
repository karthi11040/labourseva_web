import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { adminSessionCookieName, isAdminSession } from "@/lib/admin-session";

export const dynamic = "force-dynamic";

const settingKey = (id: string | number) => `es_main_cat_desc_${id}`;

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

async function getDescriptions() {
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ key_name: string; key_value: string | null }>>(
      "SELECT key_name, key_value FROM settings WHERE key_name LIKE 'es_main_cat_desc_%'"
    );
    return Object.fromEntries(rows.map((row) => [row.key_name, row.key_value || ""]));
  } catch {
    return {};
  }
}

export async function GET() {
  try {
    // 1. Fetch from real MySQL es_main_categories table
    let mainRows: any[] = [];
    let subRows: any[] = [];
    const descMap = await getDescriptions();

    try {
      mainRows = await prisma.$queryRawUnsafe<any[]>(
        "SELECT id, category_name, category_image, status, created_at FROM es_main_categories ORDER BY id ASC"
      );
    } catch {
      mainRows = [];
    }

    try {
      subRows = await prisma.$queryRawUnsafe<any[]>(
        "SELECT id, main_category_id, sub_category_name, status, created_at FROM es_sub_categories ORDER BY id ASC"
      );
    } catch {
      subRows = [];
    }

    // Also get service count per subcategory and main category
    let serviceCounts: any[] = [];
    try {
      serviceCounts = await prisma.$queryRawUnsafe<any[]>(
        "SELECT main_category_id, sub_category_id, COUNT(*) as cnt FROM es_services GROUP BY main_category_id, sub_category_id"
      );
    } catch {
      serviceCounts = [];
    }

    // Build hierarchical categories
    const categories = mainRows.map((m) => {
      const children = subRows
        .filter((s) => Number(s.main_category_id) === Number(m.id))
        .map((s) => {
          const sCount = serviceCounts.find(
            (c) => Number(c.main_category_id) === Number(m.id) && Number(c.sub_category_id) === Number(s.id)
          );
          return {
            id: s.id,
            name: s.sub_category_name,
            mainCategoryId: s.main_category_id,
            status: s.status || "active",
            serviceCount: sCount ? Number(sCount.cnt) : 0,
            createdAt: s.created_at,
          };
        });

      return {
        id: m.id,
        name: m.category_name,
        logo: m.category_image || "",
        description: descMap[settingKey(m.id)] || "",
        status: m.status || "active",
        createdAt: m.created_at,
        children,
      };
    });

    return NextResponse.json({ ok: true, categories });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unable to load categories." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!await isAuthorizedAdmin(request)) {
    return NextResponse.json({ ok: false, error: "Administrator authentication required." }, { status: 401 });
  }
  try {
    const body = await request.json();
    const kind = body.kind === "sub" ? "sub" : "main";
    const name = String(body.name || "").trim();

    if (!name) {
      return NextResponse.json({ ok: false, error: "Name is required." }, { status: 400 });
    }

    if (kind === "main") {
      const logo = String(body.logo || "").trim();
      const description = String(body.description || "").trim();

      await prisma.$executeRawUnsafe(
        "INSERT INTO es_main_categories (category_name, category_image, status) VALUES (?, ?, 'active')",
        name,
        logo || null
      );

      const [newRow] = await prisma.$queryRawUnsafe<any[]>(
        "SELECT id FROM es_main_categories WHERE category_name = ? ORDER BY id DESC LIMIT 1",
        name
      );

      if (newRow?.id && description) {
        await prisma.$executeRawUnsafe(
          "INSERT INTO settings (key_name, key_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE key_value = VALUES(key_value)",
          settingKey(newRow.id),
          description
        );
      }

      return NextResponse.json({ ok: true, id: newRow?.id });
    } else {
      const mainCategoryId = Number(body.mainCategoryId || body.parentId);
      if (!mainCategoryId) {
        return NextResponse.json({ ok: false, error: "Main category is required for sub-category." }, { status: 400 });
      }

      await prisma.$executeRawUnsafe(
        "INSERT INTO es_sub_categories (main_category_id, sub_category_name, status) VALUES (?, ?, 'active')",
        mainCategoryId,
        name
      );

      const [newRow] = await prisma.$queryRawUnsafe<any[]>(
        "SELECT id FROM es_sub_categories WHERE main_category_id = ? AND sub_category_name = ? ORDER BY id DESC LIMIT 1",
        mainCategoryId,
        name
      );

      return NextResponse.json({ ok: true, id: newRow?.id });
    }
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unable to create category." },
      { status: 400 }
    );
  }
}

export async function PUT(request: Request) {
  if (!await isAuthorizedAdmin(request)) {
    return NextResponse.json({ ok: false, error: "Administrator authentication required." }, { status: 401 });
  }
  try {
    const body = await request.json();
    const id = Number(body.id);
    const kind = body.kind === "sub" ? "sub" : "main";
    const name = String(body.name || "").trim();
    const status = body.status === "inactive" ? "inactive" : "active";

    if (!id || !name) {
      return NextResponse.json({ ok: false, error: "ID and name are required." }, { status: 400 });
    }

    if (kind === "main") {
      const logo = body.logo !== undefined ? String(body.logo).trim() : null;
      const description = body.description !== undefined ? String(body.description).trim() : null;

      if (logo !== null) {
        await prisma.$executeRawUnsafe(
          "UPDATE es_main_categories SET category_name = ?, category_image = ?, status = ? WHERE id = ?",
          name,
          logo,
          status,
          id
        );
      } else {
        await prisma.$executeRawUnsafe(
          "UPDATE es_main_categories SET category_name = ?, status = ? WHERE id = ?",
          name,
          status,
          id
        );
      }

      if (description !== null) {
        await prisma.$executeRawUnsafe(
          "INSERT INTO settings (key_name, key_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE key_value = VALUES(key_value)",
          settingKey(id),
          description
        );
      }
    } else {
      const mainCategoryId = body.mainCategoryId ? Number(body.mainCategoryId) : null;
      if (mainCategoryId) {
        await prisma.$executeRawUnsafe(
          "UPDATE es_sub_categories SET sub_category_name = ?, main_category_id = ?, status = ? WHERE id = ?",
          name,
          mainCategoryId,
          status,
          id
        );
      } else {
        await prisma.$executeRawUnsafe(
          "UPDATE es_sub_categories SET sub_category_name = ?, status = ? WHERE id = ?",
          name,
          status,
          id
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unable to update category." },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request) {
  if (!await isAuthorizedAdmin(request)) {
    return NextResponse.json({ ok: false, error: "Administrator authentication required." }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get("id"));
    const kind = searchParams.get("kind") === "sub" ? "sub" : "main";

    if (!id) {
      return NextResponse.json({ ok: false, error: "ID is required." }, { status: 400 });
    }

    if (kind === "main") {
      // Check if sub categories exist
      const sub = await prisma.$queryRawUnsafe<any[]>(
        "SELECT id FROM es_sub_categories WHERE main_category_id = ? LIMIT 1",
        id
      );
      if (sub.length > 0) {
        return NextResponse.json(
          { ok: false, error: "Cannot delete: Please delete or move linked sub-categories first." },
          { status: 409 }
        );
      }

      await prisma.$executeRawUnsafe("DELETE FROM es_main_categories WHERE id = ?", id);
      await prisma.$executeRawUnsafe("DELETE FROM settings WHERE key_name = ?", settingKey(id));
    } else {
      // Check if services exist
      const svcs = await prisma.$queryRawUnsafe<any[]>(
        "SELECT id FROM es_services WHERE sub_category_id = ? LIMIT 1",
        id
      );
      if (svcs.length > 0) {
        return NextResponse.json(
          { ok: false, error: "Cannot delete: Services are linked to this sub-category." },
          { status: 409 }
        );
      }

      await prisma.$executeRawUnsafe("DELETE FROM es_sub_categories WHERE id = ?", id);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unable to delete category." },
      { status: 400 }
    );
  }
}

