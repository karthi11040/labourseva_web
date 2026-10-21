import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { adminSessionCookieName, isAdminSession } from "@/lib/admin-session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(adminSessionCookieName)?.value;
    if (!isAdminSession(token)) {
      return NextResponse.json({ ok: false, error: "Unauthorized access" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim().toLowerCase() || "";
    const statusFilter = searchParams.get("status")?.toLowerCase() || "all";

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT g.id, g.name, g.phone, g.email, g.status, g.verification_status, g.profile_status,
              g.district_id, g.taluk_id, g.panchayat_id, g.address, g.aadhar_number, g.aadhar_path,
              g.voter_path, g.license_path, g.id_proof_path,
              g.created_at, g.updated_at,
              COALESCE(d.name_en, d.name) as district_name,
              COUNT(o.id) as orders_count,
              COALESCE(SUM(o.amount), 0) as orders_total
       FROM guests g
       LEFT JOIN districts d ON d.id = g.district_id
       LEFT JOIN guest_service_orders o ON o.guest_id = g.id
       GROUP BY g.id, d.id
       ORDER BY g.id DESC`
    );

    let guests = rows.map((g) => {
      const docPath = g.aadhar_path || g.voter_path || g.license_path || g.id_proof_path || null;
      return {
        id: Number(g.id),
        name: g.name || "Walk-in Guest",
        phone: g.phone || "",
        email: g.email || "",
        status: g.status || "active",
        verificationStatus: g.verification_status || "Pending",
        profileStatus: g.profile_status || "incomplete",
        district: g.district_name || "Unassigned",
        address: g.address || "",
        idNumber: g.aadhar_number ? (g.aadhar_number.includes("==") ? "Encrypted" : g.aadhar_number) : "",
        documentPath: docPath,
        hasDocument: Boolean(docPath),
        ordersCount: Number(g.orders_count || 0),
        ordersTotal: Number(g.orders_total || 0),
        createdAt: g.created_at ? new Date(g.created_at).toISOString() : null,
        updatedAt: g.updated_at ? new Date(g.updated_at).toISOString() : null,
      };
    });

    if (statusFilter !== "all") {
      guests = guests.filter((g) => {
        if (statusFilter === "approved" || statusFilter === "verified") {
          return g.verificationStatus.toLowerCase() === "approved" || g.profileStatus.toLowerCase() === "verified";
        }
        if (statusFilter === "pending") {
          return g.verificationStatus.toLowerCase() === "pending";
        }
        if (statusFilter === "with_orders") {
          return g.ordersCount > 0;
        }
        return true;
      });
    }

    if (search) {
      guests = guests.filter(
        (g) =>
          g.name.toLowerCase().includes(search) ||
          g.phone.includes(search) ||
          g.email.toLowerCase().includes(search) ||
          g.district.toLowerCase().includes(search) ||
          String(g.id).includes(search)
      );
    }

    return NextResponse.json({
      ok: true,
      count: guests.length,
      guests,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to load guest users." },
      { status: 500 }
    );
  }
}
