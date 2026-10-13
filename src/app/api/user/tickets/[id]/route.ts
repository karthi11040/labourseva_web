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
        t.subject, t.description, t.contact_name, t.sla_hours, t.resolution_note,
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
        sla_hours: ticket.sla_hours,
        resolution_note: ticket.resolution_note,
        assigned_employee_name: ticket.assigned_employee_name || null,
        created_at: ticket.created_at,
        updated_at: ticket.updated_at,
      },
      messages: messages.map((m) => ({
        id: Number(m.id),
        author_type: m.author_type,
        author_name: m.author_name || "Unknown",
        body: m.body,
        created_at: m.created_at,
      })),
    });
  } catch (error) {
    console.error("GET /api/user/tickets/[id] error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to load ticket" },
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
    const author_name = body.author_name ? String(body.author_name).trim() : "Citizen";
    const author_id = body.author_id ? Number(body.author_id) : null;
    const message_body = String(body.body || "").trim();

    if (!message_body) {
      return NextResponse.json({ ok: false, error: "Message body is required." }, { status: 400 });
    }

    await prisma.$executeRawUnsafe(
      `INSERT INTO helpdesk_messages (ticket_id, author_type, author_id, author_name, body, created_at)
       VALUES (?, 'CITIZEN', ?, ?, ?, NOW())`,
      ticketId,
      author_id,
      author_name,
      message_body
    );

    return NextResponse.json({
      ok: true,
      message: "Reply sent successfully.",
    });
  } catch (error) {
    console.error("POST /api/user/tickets/[id] error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to send reply" },
      { status: 500 }
    );
  }
}
