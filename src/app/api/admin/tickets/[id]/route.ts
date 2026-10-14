import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ticketId = Number(id);
    if (!ticketId) {
      return NextResponse.json({ ok: false, error: "Invalid ticket ID." }, { status: 400 });
    }

    const [ticket] = await prisma.$queryRawUnsafe<any[]>(
      `SELECT 
        t.id, t.reference_no, t.type, t.status, t.priority, t.category,
        t.subject, t.description, t.contact_name, t.contact_phone, t.contact_email,
        t.user_id, t.assigned_employee_id, t.sla_hours, t.resolution_note,
        t.created_at, t.updated_at,
        e.name AS assigned_employee_name
       FROM helpdesk_tickets t
       LEFT JOIN employees e ON t.assigned_employee_id = e.id
       WHERE t.id = ?`,
      ticketId
    );

    if (!ticket) {
      return NextResponse.json({ ok: false, error: "Ticket not found." }, { status: 404 });
    }

    const messages = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, author_type, author_id, author_name, body, created_at
       FROM helpdesk_messages
       WHERE ticket_id = ?
       ORDER BY created_at ASC`,
      ticketId
    );

    const employees = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, name FROM employees WHERE status = 'active' ORDER BY name ASC`
    );

    return NextResponse.json({
      ok: true,
      ticket: {
        id: ticket.id,
        reference_no: ticket.reference_no,
        type: ticket.type,
        status: ticket.status,
        priority: ticket.priority,
        category: ticket.category,
        subject: ticket.subject,
        description: ticket.description,
        contact_name: ticket.contact_name,
        contact_phone: ticket.contact_phone,
        contact_email: ticket.contact_email,
        user_id: ticket.user_id,
        assigned_employee_id: ticket.assigned_employee_id,
        assigned_employee_name: ticket.assigned_employee_name || null,
        sla_hours: ticket.sla_hours,
        resolution_note: ticket.resolution_note,
        created_at: ticket.created_at,
        updated_at: ticket.updated_at,
      },
      messages: messages.map((m) => ({
        id: Number(m.id),
        author_type: m.author_type,
        author_id: m.author_id,
        author_name: m.author_name || "Unknown",
        body: m.body,
        created_at: m.created_at,
      })),
      employees: employees.map((e) => ({ id: e.id, name: e.name })),
    });
  } catch (error) {
    console.error("GET /api/admin/tickets/[id] error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to load ticket" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ticketId = Number(id);
    if (!ticketId) {
      return NextResponse.json({ ok: false, error: "Invalid ticket ID." }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const updates: string[] = [];
    const values: any[] = [];

    if (body.status !== undefined) {
      updates.push("status = ?");
      values.push(String(body.status).toUpperCase());
    }
    if (body.priority !== undefined) {
      updates.push("priority = ?");
      values.push(String(body.priority).toUpperCase());
    }
    if (body.assigned_employee_id !== undefined) {
      updates.push("assigned_employee_id = ?");
      values.push(body.assigned_employee_id ? Number(body.assigned_employee_id) : null);
    }
    if (body.resolution_note !== undefined) {
      updates.push("resolution_note = ?");
      values.push(String(body.resolution_note).trim() || null);
    }
    if (body.sla_hours !== undefined) {
      updates.push("sla_hours = ?");
      values.push(Number(body.sla_hours));
    }

    if (updates.length === 0) {
      return NextResponse.json({ ok: false, error: "No fields to update." }, { status: 400 });
    }

    updates.push("updated_at = NOW()");
    values.push(ticketId);

    await prisma.$executeRawUnsafe(
      `UPDATE helpdesk_tickets SET ${updates.join(", ")} WHERE id = ?`,
      ...values
    );

    if (body.status === "RESOLVED" && body.resolution_note) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO helpdesk_messages (ticket_id, author_type, author_id, author_name, body, created_at)
         VALUES (?, 'STAFF', ?, ?, ?, NOW())`,
        ticketId,
        body.assigned_employee_id || null,
        "Support Officer",
        `Resolution: ${String(body.resolution_note).trim()}`
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Ticket updated successfully.",
    });
  } catch (error) {
    console.error("PATCH /api/admin/tickets/[id] error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to update ticket" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ticketId = Number(id);
    if (!ticketId) {
      return NextResponse.json({ ok: false, error: "Invalid ticket ID." }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const author_type = String(body.author_type || "STAFF").toUpperCase();
    const author_name = body.author_name ? String(body.author_name).trim() : "Support Officer";
    const author_id = body.author_id ? Number(body.author_id) : null;
    const message_body = String(body.body || "").trim();

    if (!message_body) {
      return NextResponse.json({ ok: false, error: "Message body is required." }, { status: 400 });
    }

    await prisma.$executeRawUnsafe(
      `INSERT INTO helpdesk_messages (ticket_id, author_type, author_id, author_name, body, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      ticketId,
      author_type,
      author_id,
      author_name,
      message_body
    );

    if (author_type === "STAFF") {
      await prisma.$executeRawUnsafe(
        `UPDATE helpdesk_tickets SET status = 'IN_PROGRESS', updated_at = NOW() WHERE id = ? AND status = 'OPEN'`,
        ticketId
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Reply sent successfully.",
    });
  } catch (error) {
    console.error("POST /api/admin/tickets/[id] error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to send reply" },
      { status: 500 }
    );
  }
}
