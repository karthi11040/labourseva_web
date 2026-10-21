import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedActor } from "@/lib/staff-session";
import { hashPassword, generateSecureToken } from "@/lib/security";

export async function GET(request: Request) {
  const actor = getAuthenticatedActor(request);
  if (actor.role !== "ADMIN") {
    return NextResponse.json(
      { ok: false, error: "Access denied. Super administrator privileges required." },
      { status: 403 }
    );
  }

  try {
    const [employees, districts] = await Promise.all([
      prisma.$queryRawUnsafe<any[]>(
      `SELECT id, name, email, phone, status, last_login, created_at, updated_at
       FROM employees ORDER BY id DESC`
      ),
      prisma.$queryRawUnsafe<any[]>(
        `SELECT id, name, name_en FROM districts ORDER BY COALESCE(name_en, name)`
      ),
    ]);

    return NextResponse.json({
      ok: true,
      employees: employees.map((emp) => ({
        id: emp.id,
        staffCode: `TNG-EMP-${String(emp.id).padStart(6, "0")}`,
        name: emp.name,
        email: emp.email,
        phone: emp.phone || "",
        status: emp.status || "active",
        lastLogin: emp.last_login,
        createdAt: emp.created_at,
      })),
      districts: districts.map((district) => ({
        id: district.id,
        name: district.name_en || district.name,
        nameTa: district.name_en ? district.name : null,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to load employees." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  // Strict server-side RBAC: Super Admin only
  const actor = getAuthenticatedActor(request);
  if (actor.role !== "ADMIN") {
    return NextResponse.json(
      { ok: false, error: "Access denied. Only Super Administrators can create employee accounts." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const district = typeof body.district === "string" ? body.district.trim() : "";
    const initialPassword = typeof body.initialPassword === "string" ? body.initialPassword : "";
    const sendInvitation = body.sendInvitation === true || !initialPassword;

    if (!name) {
      return NextResponse.json({ ok: false, error: "Employee name is required." }, { status: 400 });
    }
    if (!email || !email.includes("@")) {
      return NextResponse.json({ ok: false, error: "A valid email address is required." }, { status: 400 });
    }
    if (!phone) {
      return NextResponse.json({ ok: false, error: "Phone number is required." }, { status: 400 });
    }
    if (!district) {
      return NextResponse.json({ ok: false, error: "Select a district from the district master." }, { status: 400 });
    }

    const [districtRecord] = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id FROM districts WHERE name = ? OR name_en = ? LIMIT 1`,
      district,
      district
    );
    if (!districtRecord) {
      return NextResponse.json({ ok: false, error: "The selected district is no longer available." }, { status: 400 });
    }

    // Check duplicate
    const [existing] = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id FROM employees WHERE LOWER(email) = ? LIMIT 1`,
      email
    );
    if (existing) {
      return NextResponse.json(
        { ok: false, error: "An employee account with this email address already exists." },
        { status: 400 }
      );
    }

    // Determine password or invitation
    let passwordHash = "";
    let inviteToken = "";
    let inviteUrl = "";

    if (initialPassword && initialPassword.length >= 8) {
      passwordHash = hashPassword(initialPassword);
    } else {
      // Temporary unguessable random placeholder hash until invite token is redeemed
      passwordHash = hashPassword(generateSecureToken(32));
    }

    // Insert employee
    await prisma.$executeRawUnsafe(
      `INSERT INTO employees (name, email, phone, password_hash, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'active', NOW(), NOW())`,
      name,
      email,
      phone,
      passwordHash
    );

    const [created] = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id FROM employees WHERE LOWER(email) = ? ORDER BY id DESC LIMIT 1`,
      email
    );
    const employeeId = created?.id;

    if (sendInvitation || !initialPassword) {
      inviteToken = generateSecureToken(32);
      const tokenHash = hashPassword(inviteToken);

      await prisma.$executeRawUnsafe(
        `INSERT INTO password_resets (user_id, token, code_hash, identifier, expires_at, created_at)
         VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR), NOW())`,
        employeeId,
        inviteToken,
        tokenHash,
        email
      );

      inviteUrl = `/staff/reset-password?token=${inviteToken}`;
    }

    // Log creation in employee_logs
    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO employee_logs (employee_id, action, description, created_at) VALUES (?, ?, ?, NOW())`,
        employeeId,
        "ACCOUNT_CREATED_BY_ADMIN",
        `Employee account created by administrator for ${district}. Mode: ${sendInvitation ? "Invitation link" : "Direct credentials"}`
      );
    } catch {}

    return NextResponse.json({
      ok: true,
      message: "Employee account created successfully.",
      employee: {
        id: employeeId,
        staffCode: `TNG-EMP-${String(employeeId).padStart(6, "0")}`,
        name,
        email,
        phone,
      },
      inviteToken: inviteToken || undefined,
      inviteUrl: inviteUrl || undefined,
      hasDirectCredentials: Boolean(initialPassword),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to create employee account." },
      { status: 500 }
    );
  }
}
