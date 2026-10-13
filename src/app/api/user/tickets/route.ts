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
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ ok: false, error: "userId is required." }, { status: 400 });
    }

    const tickets = await prisma.$queryRawUnsafe<any[]>(
      `SELECT 
        t.id, t.reference_no, t.type, t.status, t.priority, t.category,
        t.subject, t.sla_hours, t.created_at, t.updated_at,
        e.name AS assigned_employee_name,
        (SELECT COUNT(*) FROM helpdesk_messages m WHERE m.ticket_id = t.id) AS message_count,
        (SELECT m.body FROM helpdesk_messages m WHERE m.ticket_id = t.id ORDER BY m.created_at DESC LIMIT 1) AS last_message
       FROM helpdesk_tickets t
       LEFT JOIN employees e ON t.assigned_employee_id = e.id
       WHERE t.user_id = ?
       ORDER BY t.created_at DESC`,
      Number(userId)
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
        sla_hours: t.sla_hours,
        assigned_employee_name: t.assigned_employee_name || null,
        message_count: Number(t.message_count || 0),
        last_message: t.last_message || null,
        created_at: t.created_at,
        updated_at: t.updated_at,
      })),
    });
  } catch (error) {
    console.error("GET /api/user/tickets error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to load tickets" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const category = body.category ? String(body.category).trim() : null;
    const subject = String(body.subject || "").trim();
    const description = String(body.description || "").trim();
    const contact_name = body.contact_name ? String(body.contact_name).trim() : null;
    const contact_phone = body.contact_phone ? String(body.contact_phone).trim() : null;
    const contact_email = body.contact_email ? String(body.contact_email).trim() : null;
    const user_id = body.user_id ? Number(body.user_id) : null;

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
         contact_name, contact_phone, contact_email, user_id, sla_hours, created_at, updated_at)
       VALUES (?, 'HELPDESK', 'OPEN', 'NORMAL', ?, ?, ?, ?, ?, ?, ?, 72, NOW(), NOW())`,
      reference_no,
      category,
      subject,
      description,
      contact_name,
      contact_phone,
      contact_email,
      user_id
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
      message: "Ticket raised successfully. Our team will respond within the SLA timeframe.",
    });
  } catch (error) {
    console.error("POST /api/user/tickets error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to create ticket" },
      { status: 500 }
    );
  }
}
