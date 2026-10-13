import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function generateRefNo(): string {
  const ts = Date.now().toString(36).toUpperCase().slice(-5);
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `TKT-${ts}${rand}`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const employeeId = searchParams.get("employeeId");
    const search = searchParams.get("search");
    const type = searchParams.get("type");

    let where = "WHERE 1=1";
    const params: any[] = [];

    if (status) {
      where += " AND t.status = ?";
      params.push(status);
    }
    if (priority) {
      where += " AND t.priority = ?";
      params.push(priority);
    }
    if (employeeId) {
      where += " AND t.assigned_employee_id = ?";
      params.push(Number(employeeId));
    }
    if (type) {
      where += " AND t.type = ?";
      params.push(type);
    }
    if (search) {
      where += " AND (t.subject LIKE ? OR t.reference_no LIKE ? OR t.contact_name LIKE ? OR t.contact_phone LIKE ?)";
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    const tickets = await prisma.$queryRawUnsafe<any[]>(
      `SELECT 
        t.id, t.reference_no, t.type, t.status, t.priority, t.category,
        t.subject, t.description, t.contact_name, t.contact_phone, t.contact_email,
        t.user_id, t.assigned_employee_id, t.sla_hours, t.resolution_note,
        t.created_at, t.updated_at,
        e.name AS assigned_employee_name,
        (SELECT COUNT(*) FROM helpdesk_messages m WHERE m.ticket_id = t.id) AS message_count,
        (SELECT m.body FROM helpdesk_messages m WHERE m.ticket_id = t.id ORDER BY m.created_at DESC LIMIT 1) AS last_message
       FROM helpdesk_tickets t
       LEFT JOIN employees e ON t.assigned_employee_id = e.id
       ${where}
       ORDER BY 
         CASE t.priority 
           WHEN 'URGENT' THEN 1 
           WHEN 'HIGH' THEN 2 
           WHEN 'NORMAL' THEN 3 
           WHEN 'LOW' THEN 4 
         END,
         t.created_at DESC`,
      ...params
    );

    const counts = await prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'OPEN' THEN 1 ELSE 0 END) AS open_count,
        SUM(CASE WHEN status = 'IN_PROGRESS' THEN 1 ELSE 0 END) AS in_progress_count,
        SUM(CASE WHEN status = 'ESCALATED' THEN 1 ELSE 0 END) AS escalated_count,
        SUM(CASE WHEN status = 'RESOLVED' THEN 1 ELSE 0 END) AS resolved_count,
        SUM(CASE WHEN status = 'CLOSED' THEN 1 ELSE 0 END) AS closed_count
      FROM helpdesk_tickets
    `);

    const employees = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, name FROM employees WHERE status = 'active' ORDER BY name ASC`
    );

    return NextResponse.json({
      ok: true,
      tickets: tickets.map((t) => ({
        id: t.id,
        reference_no: t.reference_no,
        type: t.type,
        status: t.status,
        priority: t.priority,
        category: t.category,
        subject: t.subject,
        description: t.description,
        contact_name: t.contact_name,
        contact_phone: t.contact_phone,
        contact_email: t.contact_email,
        user_id: t.user_id,
        assigned_employee_id: t.assigned_employee_id,
        assigned_employee_name: t.assigned_employee_name || null,
        sla_hours: t.sla_hours,
        resolution_note: t.resolution_note,
        message_count: Number(t.message_count || 0),
        last_message: t.last_message || null,
        created_at: t.created_at,
        updated_at: t.updated_at,
      })),
      counts: {
        total: Number(counts[0]?.total || 0),
        open: Number(counts[0]?.open_count || 0),
        in_progress: Number(counts[0]?.in_progress_count || 0),
        escalated: Number(counts[0]?.escalated_count || 0),
        resolved: Number(counts[0]?.resolved_count || 0),
        closed: Number(counts[0]?.closed_count || 0),
      },
      employees: employees.map((e) => ({
        id: e.id,
        name: e.name,
      })),
    });
  } catch (error) {
    console.error("GET /api/admin/tickets error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to load tickets" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const type = String(body.type || "HELPDESK").toUpperCase();
    const category = body.category ? String(body.category).trim() : null;
    const subject = String(body.subject || "").trim();
    const description = String(body.description || "").trim();
    const contact_name = body.contact_name ? String(body.contact_name).trim() : null;
    const contact_phone = body.contact_phone ? String(body.contact_phone).trim() : null;
    const contact_email = body.contact_email ? String(body.contact_email).trim() : null;
    const priority = body.priority ? String(body.priority).toUpperCase() : "NORMAL";
    const assigned_employee_id = body.assigned_employee_id ? Number(body.assigned_employee_id) : null;
    const user_id = body.user_id ? Number(body.user_id) : null;
    const sla_hours = body.sla_hours ? Number(body.sla_hours) : 72;

    if (!subject) {
      return NextResponse.json({ ok: false, error: "Subject is required." }, { status: 400 });
    }
    if (!description) {
      return NextResponse.json({ ok: false, error: "Description is required." }, { status: 400 });
    }

    const reference_no = generateRefNo();

    await prisma.$executeRawUnsafe(
      `INSERT INTO helpdesk_tickets 
        (reference_no, type, status, priority, category, subject, description, 
         contact_name, contact_phone, contact_email, user_id, assigned_employee_id, sla_hours, created_at, updated_at)
       VALUES (?, ?, 'OPEN', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      reference_no,
      type,
      priority,
      category,
      subject,
      description,
      contact_name,
      contact_phone,
      contact_email,
      user_id,
      assigned_employee_id,
      sla_hours
    );

    const [created] = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id FROM helpdesk_tickets WHERE reference_no = ? ORDER BY id DESC LIMIT 1`,
      reference_no
    );
    const ticketId = created?.id;

    if (ticketId && description) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO helpdesk_messages (ticket_id, author_type, author_id, author_name, body, created_at)
         VALUES (?, 'CITIZEN', ?, ?, ?, NOW())`,
        ticketId,
        user_id,
        contact_name || "Citizen",
        description
      );
    }

    return NextResponse.json({
      ok: true,
      ticket_id: ticketId,
      reference_no,
      message: "Ticket created successfully.",
    });
  } catch (error) {
    console.error("POST /api/admin/tickets error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to create ticket" },
      { status: 500 }
    );
  }
}
