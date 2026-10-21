import { access, unlink } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getAuthRetailer } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import {
  ensureRetailerMarketplaceProductsTable,
  isApprovedRetailer,
  parseProductPhotos,
  parseProductPhotosJson,
  parseProductPrice,
} from "@/lib/retailer-marketplace";
import { categoryNeedsExpiryDate, parseProductExpiryDate } from "@/lib/marketplace-product-rules";
import { canListMarketplaceProducts, ensureMarketplaceSubscriptionTables, getMarketplaceEntitlement } from "@/lib/marketplace-subscriptions";

export const dynamic = "force-dynamic";

const productUploadDir = path.join(process.cwd(), "data", "private", "marketplace");

function toProduct(row: any) {
  return {
    id: Number(row.id),
    name: String(row.name),
    category: String(row.category),
    description: String(row.description),
    pricePaise: String(row.price_paise),
    stock: Number(row.stock),
    photos: parseProductPhotosJson(row.photos_json),
    expiryDate: row.expiry_date ? String(row.expiry_date) : null,
    status: String(row.status),
    rejectionReason: row.rejection_reason ? String(row.rejection_reason) : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
  };
}

export async function GET(request: NextRequest) {
  const retailer = await getAuthRetailer(request);
  if (!retailer) return NextResponse.json({ ok: false, error: "Sign in to manage products." }, { status: 401 });
  try {
    await ensureRetailerMarketplaceProductsTable();
    await ensureMarketplaceSubscriptionTables();
    await prisma.$executeRawUnsafe(
      "UPDATE retailer_marketplace_subscriptions SET status = 'EXPIRED', updated_at = NOW() WHERE retailer_id = ? AND status = 'ACTIVE' AND expires_at <= NOW()",
      retailer.id
    );
    const entitlement = await getMarketplaceEntitlement(Number(retailer.id));
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, name, category, description, price_paise, stock, photos_json,
              DATE_FORMAT(expiry_date, '%Y-%m-%d') AS expiry_date,
              status, rejection_reason, updated_at
       FROM retailer_marketplace_products WHERE retailer_id = ?
       ORDER BY updated_at DESC, id DESC LIMIT 100`,
      retailer.id
    );
    const [listingCount] = await prisma.$queryRawUnsafe<any[]>(
      "SELECT COUNT(*) AS total FROM retailer_marketplace_products WHERE retailer_id = ? AND status IN ('PENDING', 'APPROVED')",
      retailer.id
    );
    return NextResponse.json({
      ok: true,
      approved: isApprovedRetailer(retailer),
      subscription: entitlement ? { active: true, expiresAt: entitlement.expiresAt.toISOString(), currentListings: Number(listingCount?.total || 0), maxProducts: entitlement.maxProducts, listingRights: entitlement.listingRights, marketplaceVisibility: entitlement.marketplaceVisibility, features: entitlement.features } : { active: false },
      products: rows.map(toProduct),
    });
  } catch (error) {
    console.error("Retailer marketplace products could not be loaded:", error);
    return NextResponse.json({ ok: false, error: "Could not load your product listings." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const retailer = await getAuthRetailer(request);
  if (!retailer) return NextResponse.json({ ok: false, error: "Sign in to manage products." }, { status: 401 });
  if (!isApprovedRetailer(retailer)) {
    return NextResponse.json({ ok: false, error: "Your retailer account must be approved before you can list products." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ ok: false, error: "Enter product details." }, { status: 400 });
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const category = typeof body.category === "string" ? body.category.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const pricePaise = parseProductPrice(body.price);
  const expiryDate = parseProductExpiryDate(body.expiryDate);
  const stock = Number(body.stock);
  const productId = body.productId == null ? null : Number(body.productId);
  const submit = body.submit === true;
  const photos = parseProductPhotos(body.photos, Number(retailer.id));

  if (!name || name.length > 120 || !category || category.length > 80 || !description || description.length > 5000) {
    return NextResponse.json({ ok: false, error: "Enter a product name, category, and description within the displayed limits." }, { status: 400 });
  }
  if (pricePaise === null) return NextResponse.json({ ok: false, error: "Enter a price greater than ₹0 with up to two decimal places." }, { status: 400 });
  if (expiryDate === undefined) return NextResponse.json({ ok: false, error: "Enter a valid expiry date." }, { status: 400 });
  if (submit && categoryNeedsExpiryDate(category) && !expiryDate) return NextResponse.json({ ok: false, error: "An expiry date is required for this product category." }, { status: 400 });
  if (!Number.isSafeInteger(stock) || stock < 0 || stock > 1000000) return NextResponse.json({ ok: false, error: "Stock must be a whole number from 0 to 1,000,000." }, { status: 400 });
  if (!photos) return NextResponse.json({ ok: false, error: "Use up to five product photos uploaded to this retailer account." }, { status: 400 });
  if (submit && photos.length === 0) return NextResponse.json({ ok: false, error: "Add at least one product photo before submitting for review." }, { status: 400 });
  if (productId !== null && (!Number.isSafeInteger(productId) || productId <= 0)) return NextResponse.json({ ok: false, error: "Choose a valid listing." }, { status: 400 });

  try {
    await ensureRetailerMarketplaceProductsTable();
    await ensureMarketplaceSubscriptionTables();
    await Promise.all(photos.map((photo) => access(path.join(productUploadDir, photo))));
    const status = submit ? "PENDING" : "DRAFT";
    const result = await prisma.$transaction(async (tx) => {
      const [seller] = await tx.$queryRawUnsafe<any[]>(
        "SELECT status, is_approved FROM retail_users WHERE id = ? LIMIT 1 FOR UPDATE",
        retailer.id
      );
      if (!seller || !isApprovedRetailer(seller)) throw new Error("Your retailer account must be approved before you can list products.");
        if (submit) {
          const entitlement = await getMarketplaceEntitlement(Number(retailer.id), tx);
          if (!canListMarketplaceProducts(entitlement)) throw new Error("An active marketplace subscription is required to submit products for review.");
        }

      if (productId !== null) {
        const rows = await tx.$queryRawUnsafe<any[]>(
          "SELECT id, status, photos_json FROM retailer_marketplace_products WHERE id = ? AND retailer_id = ? LIMIT 1 FOR UPDATE",
          productId,
          retailer.id
        );
        if (!rows.length) throw new Error("Product listing was not found.");
        if (rows[0].status === "PENDING") throw new Error("This listing is already awaiting staff review.");
        if (submit && !["APPROVED", "PENDING"].includes(String(rows[0].status))) {
          const entitlement = await getMarketplaceEntitlement(Number(retailer.id), tx);
          const [count] = await tx.$queryRawUnsafe<any[]>(
            "SELECT COUNT(*) AS total FROM retailer_marketplace_products WHERE retailer_id = ? AND status IN ('PENDING', 'APPROVED')",
            retailer.id
          );
          if (Number(count?.total || 0) >= Number(entitlement?.maxProducts || 0)) throw new Error("Your subscription product listing limit has been reached.");
        }
        const existingPhotos = parseProductPhotosJson(rows[0].photos_json);
        if (photos.some((photo) => !existingPhotos.includes(photo))) throw new Error("Upload product photos using the photo button on this listing.");
        await tx.$executeRawUnsafe(
          `UPDATE retailer_marketplace_products
           SET name = ?, category = ?, description = ?, price_paise = ?, stock = ?, photos_json = ?, expiry_date = ?,
               status = ?, rejection_reason = NULL, reviewed_at = NULL, reviewed_by = NULL
           WHERE id = ? AND retailer_id = ?`,
          name, category, description, pricePaise, stock, JSON.stringify(photos), expiryDate, status, productId, retailer.id
        );
        return { id: productId, removedPhotos: existingPhotos.filter((photo) => !photos.includes(photo)) };
      }
      if (photos.length) throw new Error("Save this product draft before uploading photos.");
      if (submit) {
        const entitlement = await getMarketplaceEntitlement(Number(retailer.id), tx);
        const [count] = await tx.$queryRawUnsafe<any[]>(
          "SELECT COUNT(*) AS total FROM retailer_marketplace_products WHERE retailer_id = ? AND status IN ('PENDING', 'APPROVED')",
          retailer.id
        );
        if (Number(count?.total || 0) >= Number(entitlement?.maxProducts || 0)) throw new Error("Your subscription product listing limit has been reached.");
      }

      await tx.$executeRawUnsafe(
        `INSERT INTO retailer_marketplace_products
          (retailer_id, name, category, description, price_paise, stock, photos_json, expiry_date, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        retailer.id, name, category, description, pricePaise, stock, JSON.stringify(photos), expiryDate, status
      );
      const [result] = await tx.$queryRawUnsafe<any[]>("SELECT LAST_INSERT_ID() AS id");
      return { id: Number(result?.id), removedPhotos: [] as string[] };
    });

    await Promise.all(result.removedPhotos.map((photo) => unlink(path.join(productUploadDir, photo)).catch((error) => {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") console.error("Removed marketplace product photo could not be deleted:", error);
    })));

    const [savedProduct] = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, name, category, description, price_paise, stock, photos_json,
              DATE_FORMAT(expiry_date, '%Y-%m-%d') AS expiry_date,
              status, rejection_reason, updated_at
       FROM retailer_marketplace_products WHERE id = ? AND retailer_id = ? LIMIT 1`,
      result.id,
      retailer.id
    );
    return NextResponse.json({ ok: true, productId: result.id, status, product: toProduct(savedProduct), message: submit ? "Product sent for staff review." : "Draft saved." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save this product.";
    const status = message.includes("not found") ? 404
      : message.includes("awaiting staff review") || message.includes("limit has been reached") ? 409
        : message.includes("must be approved") || message.includes("active marketplace subscription") ? 403
          : ["Save this product draft", "Upload product photos"].some((part) => message.includes(part)) ? 400 : 500;
    if (status === 500) console.error("Retailer marketplace product save failed:", error);
    return NextResponse.json({ ok: false, error: status === 500 ? "Could not save this product." : message }, { status });
  }
}
