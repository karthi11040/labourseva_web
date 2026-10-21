import { access } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedActor } from "@/lib/staff-session";
import { prisma } from "@/lib/prisma";
import {
  ensureRetailerMarketplaceProductsTable,
  parseProductPhotosJson,
  productPhotoUrl,
  parseProductPhotos,
  parseProductPrice,
} from "@/lib/retailer-marketplace";
import { categoryNeedsExpiryDate, isProductExpiryDatePast, parseProductExpiryDate } from "@/lib/marketplace-product-rules";
import { canApproveMarketplaceProduct, canListMarketplaceProducts, ensureMarketplaceSubscriptionTables, getMarketplaceEntitlement } from "@/lib/marketplace-subscriptions";

export const dynamic = "force-dynamic";
const productUploadDir = path.join(process.cwd(), "data", "private", "marketplace");

function authorized(request: NextRequest) {
  const actor = getAuthenticatedActor(request);
  return actor.role === "ADMIN" || (actor.role === "EMPLOYEE" && actor.canVerify === true) ? actor : null;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ ok: false, error: "Verification staff authorization required." }, { status: 401 });
  try {
    await ensureRetailerMarketplaceProductsTable();
    const [rows, retailers] = await Promise.all([
      prisma.$queryRawUnsafe<any[]>(
      `SELECT p.id, p.retailer_id, p.name, p.category, p.description, p.price_paise,
              p.stock, p.photos_json, DATE_FORMAT(p.expiry_date, '%Y-%m-%d') AS expiry_date,
              p.status, p.rejection_reason, p.created_at,
              p.updated_at, p.reviewed_at, p.reviewed_by, r.name AS retailer_name,
              r.shop_name, r.registration_no
       FROM retailer_marketplace_products p
       LEFT JOIN retail_users r ON r.id = p.retailer_id
       WHERE p.status IN ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED')
       ORDER BY CASE WHEN p.status = 'PENDING' THEN 0 WHEN p.status = 'DRAFT' THEN 1 ELSE 2 END, p.updated_at DESC, p.id DESC
       LIMIT 200`
      ),
      prisma.$queryRawUnsafe<any[]>(
        "SELECT id, name, shop_name, registration_no, status, is_approved FROM retail_users ORDER BY shop_name ASC, id ASC LIMIT 200"
      ),
    ]);
    return NextResponse.json({
      ok: true,
      products: rows.map((row) => {
        const id = Number(row.id);
        return {
          id,
          retailerId: Number(row.retailer_id),
          retailerName: String(row.retailer_name || "Retailer"),
          shopName: String(row.shop_name || "Shop"),
          registrationNo: row.registration_no ? String(row.registration_no) : null,
          name: String(row.name),
          category: String(row.category),
          description: String(row.description),
          pricePaise: String(row.price_paise),
          stock: Number(row.stock),
          photos: parseProductPhotosJson(row.photos_json).map((file) => productPhotoUrl(file, id)),
          expiryDate: row.expiry_date ? String(row.expiry_date) : null,
          status: String(row.status),
          rejectionReason: row.rejection_reason ? String(row.rejection_reason) : null,
          createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
          reviewedAt: row.reviewed_at ? new Date(row.reviewed_at).toISOString() : null,
          reviewedBy: row.reviewed_by ? String(row.reviewed_by) : null,
        };
      }),
      retailers: retailers.map((row) => ({
        id: Number(row.id),
        name: String(row.name || "Retailer"),
        shopName: String(row.shop_name || "Shop"),
        registrationNo: row.registration_no ? String(row.registration_no) : null,
        status: String(row.status || "Pending"),
        approved: Number(row.is_approved) === 1,
      })),
    });
  } catch (error) {
    console.error("Admin marketplace product review list failed:", error);
    return NextResponse.json({ ok: false, error: "Could not load product listings." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const actor = authorized(request);
  if (!actor) return NextResponse.json({ ok: false, error: "Verification staff authorization required." }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ ok: false, error: "Choose a product and a review decision." }, { status: 400 });

  if (body.action === "CREATE_DRAFT") {
    const retailerId = Number(body.retailerId);
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const category = typeof body.category === "string" ? body.category.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const pricePaise = parseProductPrice(body.price);
    const expiryDate = parseProductExpiryDate(body.expiryDate);
    const stock = Number(body.stock);
    if (!Number.isSafeInteger(retailerId) || retailerId <= 0) return NextResponse.json({ ok: false, error: "Choose a retailer." }, { status: 400 });
    if (!name || name.length > 120 || !category || category.length > 80 || !description || description.length > 5000) {
      return NextResponse.json({ ok: false, error: "Enter a product name, category, and description within the displayed limits." }, { status: 400 });
    }
    if (pricePaise === null) return NextResponse.json({ ok: false, error: "Enter a price greater than ₹0 with up to two decimal places." }, { status: 400 });
    if (expiryDate === undefined) return NextResponse.json({ ok: false, error: "Enter a valid expiry date." }, { status: 400 });
    if (!Number.isSafeInteger(stock) || stock < 0 || stock > 1000000) return NextResponse.json({ ok: false, error: "Stock must be a whole number from 0 to 1,000,000." }, { status: 400 });

    try {
      await ensureRetailerMarketplaceProductsTable();
      await ensureMarketplaceSubscriptionTables();
      const result = await prisma.$transaction(async (tx) => {
        const [retailer] = await tx.$queryRawUnsafe<any[]>("SELECT id FROM retail_users WHERE id = ? LIMIT 1 FOR UPDATE", retailerId);
        if (!retailer) throw new Error("Choose an existing retailer.");
        await tx.$executeRawUnsafe(
          `INSERT INTO retailer_marketplace_products
            (retailer_id, name, category, description, price_paise, stock, photos_json, expiry_date, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT')`,
          retailerId, name, category, description, pricePaise, stock, "[]", expiryDate
        );
        const [created] = await tx.$queryRawUnsafe<any[]>("SELECT LAST_INSERT_ID() AS id");
        return Number(created?.id);
      });
      return NextResponse.json({ ok: true, productId: result, message: "Product draft added. The retailer must add photos and submit it for review." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not add the product draft.";
      const status = message.includes("existing retailer") ? 404 : 500;
      if (status === 500) console.error("Admin marketplace product draft creation failed:", error);
      return NextResponse.json({ ok: false, error: status === 500 ? "Could not add the product draft." : message }, { status });
    }
  }

  if (body.action === "PUBLISH_DRAFT") {
    const id = Number(body.id);
    if (!Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ ok: false, error: "Choose a valid product draft." }, { status: 400 });
    try {
      await ensureRetailerMarketplaceProductsTable();
      await ensureMarketplaceSubscriptionTables();
      await prisma.$transaction(async (tx) => {
        const [product] = await tx.$queryRawUnsafe<any[]>(
          `SELECT id, retailer_id, category, photos_json, DATE_FORMAT(expiry_date, '%Y-%m-%d') AS expiry_date, status
           FROM retailer_marketplace_products WHERE id = ? LIMIT 1 FOR UPDATE`,
          id
        );
        if (!product) throw new Error("Product draft was not found.");
        if (product.status !== "DRAFT") throw new Error("Only draft listings can be made live.");
        const [retailer] = await tx.$queryRawUnsafe<any[]>(
          "SELECT status, is_approved FROM retail_users WHERE id = ? LIMIT 1 FOR UPDATE",
          product.retailer_id
        );
        if (!retailer || Number(retailer.is_approved) !== 1 || String(retailer.status || "").toLowerCase() !== "approved") {
          throw new Error("The retailer account must be approved before this product can go live.");
        }
        const entitlement = await getMarketplaceEntitlement(Number(product.retailer_id), tx);
        if (!entitlement || !canListMarketplaceProducts(entitlement)) throw new Error("An active marketplace subscription is required before publishing products.");
        const [listingCount] = await tx.$queryRawUnsafe<any[]>(
          "SELECT COUNT(*) AS total FROM retailer_marketplace_products WHERE retailer_id = ? AND status IN ('PENDING', 'APPROVED')",
          product.retailer_id
        );
        if (Number(listingCount?.total || 0) >= entitlement.maxProducts) throw new Error("The retailer has reached the subscription product limit.");
        const photos = parseProductPhotos(parseProductPhotosJson(product.photos_json), Number(product.retailer_id));
        if (!photos?.length) throw new Error("Add at least one valid product image before making it live.");
        try {
          await Promise.all(photos.map((photo) => access(path.join(productUploadDir, photo))));
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === "ENOENT") throw new Error("A product image is missing. Ask the retailer to upload it again.");
          throw error;
        }
        const expiryDate = parseProductExpiryDate(product.expiry_date ? String(product.expiry_date) : null);
        if (expiryDate === undefined) throw new Error("Enter a valid expiry date before making this product live.");
        if (categoryNeedsExpiryDate(String(product.category)) && !expiryDate) {
          throw new Error("Add the expiry date required for this product category before making it live.");
        }
        if (expiryDate && isProductExpiryDatePast(expiryDate)) throw new Error("This product’s expiry date has passed and it cannot be made live.");
        await tx.$executeRawUnsafe(
          `UPDATE retailer_marketplace_products
           SET status = 'APPROVED', rejection_reason = NULL, reviewed_at = NOW(), reviewed_by = ?
           WHERE id = ? AND status = 'DRAFT'`,
          actor.name,
          id
        );
      });
      return NextResponse.json({ ok: true, message: "Product is live in the marketplace." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not publish this product.";
      const lowerMessage = message.toLowerCase();
      const status = lowerMessage.includes("not found") ? 404
        : ["only draft", "must be approved", "subscription", "product limit"].some((part) => lowerMessage.includes(part)) ? 409
          : ["image", "expiry date"].some((part) => lowerMessage.includes(part)) ? 400 : 500;
      if (status === 500) {
        console.error("Admin marketplace product publishing failed:", error);
        return NextResponse.json({ ok: false, error: "Could not publish this product." }, { status: 500 });
      }
      return NextResponse.json({ ok: false, error: message }, { status });
    }
  }

  const id = Number(body.id);
  const decision = String(body.decision || "").toUpperCase();
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : "";
  if (!Number.isSafeInteger(id) || id <= 0 || !["APPROVE", "REJECT"].includes(decision)) {
    return NextResponse.json({ ok: false, error: "Choose a product and a valid review decision." }, { status: 400 });
  }
  if (decision === "REJECT" && !reason) return NextResponse.json({ ok: false, error: "Enter a reason when rejecting a product." }, { status: 400 });

  try {
    await ensureRetailerMarketplaceProductsTable();
    await ensureMarketplaceSubscriptionTables();
    await prisma.$transaction(async (tx) => {
      const [owner] = await tx.$queryRawUnsafe<any[]>(
        "SELECT retailer_id FROM retailer_marketplace_products WHERE id = ? LIMIT 1",
        id
      );
      if (!owner) throw new Error("Product listing was not found.");
      const [retailer] = await tx.$queryRawUnsafe<any[]>(
        "SELECT is_approved, status FROM retail_users WHERE id = ? LIMIT 1 FOR UPDATE",
        owner.retailer_id
      );
      if (!retailer || Number(retailer.is_approved) !== 1 || String(retailer.status || "").toLowerCase() !== "approved") {
        throw new Error("The retailer account is no longer approved for marketplace listings.");
      }
      const [product] = await tx.$queryRawUnsafe<any[]>(
        "SELECT id, status FROM retailer_marketplace_products WHERE id = ? LIMIT 1 FOR UPDATE",
        id
      );
      if (!product) throw new Error("Product listing was not found.");
      if (product.status !== "PENDING") throw new Error("Only products awaiting review can be decided.");
      if (decision === "APPROVE") {
        const entitlement = await getMarketplaceEntitlement(Number(owner.retailer_id), tx);
        const [listingCount] = await tx.$queryRawUnsafe<any[]>(
          "SELECT COUNT(*) AS total FROM retailer_marketplace_products WHERE retailer_id = ? AND status IN ('PENDING', 'APPROVED')",
          owner.retailer_id
        );
        if (!canApproveMarketplaceProduct({
          retailerApproved: Number(retailer.is_approved) === 1 && String(retailer.status || "").toLowerCase() === "approved",
          productStatus: product.status,
          entitlement,
          pendingAndLiveCount: Number(listingCount?.total || 0),
        })) {
          if (!entitlement || !canListMarketplaceProducts(entitlement)) throw new Error("An active marketplace subscription is required before approval.");
          throw new Error("The retailer has exceeded the subscription product limit.");
        }
      }
      await tx.$executeRawUnsafe(
        `UPDATE retailer_marketplace_products
         SET status = ?, rejection_reason = ?, reviewed_at = NOW(), reviewed_by = ?
         WHERE id = ?`,
        decision === "APPROVE" ? "APPROVED" : "REJECTED",
        decision === "REJECT" ? reason : null,
        actor.name,
        id
      );
    });
    return NextResponse.json({ ok: true, message: decision === "APPROVE" ? "Product approved and published." : "Product rejected with feedback." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save the review decision.";
    const status = message.includes("not found") ? 404 : ["awaiting review", "no longer approved", "subscription", "product limit"].some((part) => message.includes(part)) ? 409 : 500;
    if (status === 500) console.error("Admin marketplace product review failed:", error);
    return NextResponse.json({ ok: false, error: status === 500 ? "Could not save the review decision." : message }, { status });
  }
}
