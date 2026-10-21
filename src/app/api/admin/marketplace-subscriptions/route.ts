import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedActor } from "@/lib/staff-session";
import { prisma } from "@/lib/prisma";
import { ensureMarketplaceSubscriptionTables, validateMarketplacePlan } from "@/lib/marketplace-subscriptions";

export const dynamic = "force-dynamic";

function isAdmin(request: NextRequest) {
  return getAuthenticatedActor(request).role === "ADMIN";
}

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ ok: false, error: "Administrator access required." }, { status: 403 });
  try {
    await ensureMarketplaceSubscriptionTables();
    const plans = await prisma.$queryRawUnsafe<any[]>(
      "SELECT id, name, billing_period, price_paise, benefits_json, active, created_at, updated_at FROM marketplace_subscription_plans ORDER BY active DESC, id DESC"
    );
    return NextResponse.json({ ok: true, plans: plans.map((plan) => ({
      id: Number(plan.id),
      name: String(plan.name),
      billingPeriod: String(plan.billing_period),
      price: (Number(plan.price_paise) / 100).toFixed(2),
      benefits: typeof plan.benefits_json === "string" ? JSON.parse(plan.benefits_json) : plan.benefits_json,
      active: Number(plan.active) === 1,
      updatedAt: plan.updated_at ? new Date(plan.updated_at).toISOString() : null,
    })) });
  } catch (error) {
    console.error("Marketplace subscription plans could not be loaded:", error);
    return NextResponse.json({ ok: false, error: "Could not load subscription plans." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ ok: false, error: "Administrator access required." }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ ok: false, error: "Enter subscription plan details." }, { status: 400 });
  try {
    await ensureMarketplaceSubscriptionTables();
    if (body.action === "TOGGLE") {
      const id = Number(body.id);
      if (!Number.isSafeInteger(id) || id <= 0 || typeof body.active !== "boolean") {
        return NextResponse.json({ ok: false, error: "Choose a plan and active state." }, { status: 400 });
      }
      const updated = await prisma.$executeRawUnsafe(
        "UPDATE marketplace_subscription_plans SET active = ?, updated_at = NOW() WHERE id = ?",
        body.active ? 1 : 0,
        id
      );
      if (!updated) return NextResponse.json({ ok: false, error: "Subscription plan not found." }, { status: 404 });
      return NextResponse.json({ ok: true, message: body.active ? "Plan activated." : "Plan deactivated." });
    }

    const plan = validateMarketplacePlan(body);
    if (!plan) return NextResponse.json({ ok: false, error: "Enter a valid plan name, billing period, price, product limit, and benefits." }, { status: 400 });
    const id = body.id == null ? null : Number(body.id);
    if (id !== null && (!Number.isSafeInteger(id) || id <= 0)) return NextResponse.json({ ok: false, error: "Choose a valid subscription plan." }, { status: 400 });
    if (id === null) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO marketplace_subscription_plans (name, billing_period, price_paise, benefits_json, active)
         VALUES (?, ?, ?, ?, 1)`,
        plan.name, plan.billingPeriod, plan.pricePaise, JSON.stringify(plan.benefits)
      );
      const [created] = await prisma.$queryRawUnsafe<any[]>("SELECT LAST_INSERT_ID() AS id");
      return NextResponse.json({ ok: true, id: Number(created?.id), message: "Subscription plan created." });
    }
    const changed = await prisma.$executeRawUnsafe(
      `UPDATE marketplace_subscription_plans
       SET name = ?, billing_period = ?, price_paise = ?, benefits_json = ?, updated_at = NOW()
       WHERE id = ?`,
      plan.name, plan.billingPeriod, plan.pricePaise, JSON.stringify(plan.benefits), id
    );
    if (!changed) return NextResponse.json({ ok: false, error: "Subscription plan not found." }, { status: 404 });
    return NextResponse.json({ ok: true, id, message: "Subscription plan updated. Existing subscriptions keep their purchased benefits until renewal." });
  } catch (error) {
    console.error("Marketplace subscription plan save failed:", error);
    return NextResponse.json({ ok: false, error: "Could not save the subscription plan." }, { status: 500 });
  }
}
