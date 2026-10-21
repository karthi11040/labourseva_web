import { NextRequest, NextResponse } from "next/server";
import { getCitizenIdentity } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { ensureRetailerMarketplaceProductsTable, parseProductPhotosJson, productPhotoUrl } from "@/lib/retailer-marketplace";
import { ensureMarketplaceSubscriptionTables, getMarketplaceEntitlements, isMarketplaceProductVisible } from "@/lib/marketplace-subscriptions";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await ensureRetailerMarketplaceProductsTable();
    await ensureMarketplaceSubscriptionTables();
    const entitlements = await getMarketplaceEntitlements();
    const entitledRetailerIds = [...entitlements.keys()];
    if (!entitledRetailerIds.length) {
      return NextResponse.json({ ok: true, buyerSignedIn: Boolean(await getCitizenIdentity(request)), products: [], categories: [], hasMore: false, nextCursor: null });
    }
    const buyerSignedIn = Boolean(await getCitizenIdentity(request));
    const params = request.nextUrl.searchParams;
    const search = (params.get("q") || "").trim().slice(0, 80);
    const category = (params.get("category") || "").trim().slice(0, 80);
    const cursor = Number(params.get("cursor"));
    const retailerPlaceholders = entitledRetailerIds.map(() => "?").join(",");
    const filters: string[] = ["p.status = 'APPROVED'", "r.is_approved = 1", "LOWER(r.status) = 'approved'", "JSON_LENGTH(p.photos_json) > 0", "(p.expiry_date IS NULL OR p.expiry_date >= CURDATE())", `p.retailer_id IN (${retailerPlaceholders})`];
    const values: Array<string | number> = [...entitledRetailerIds];
    if (search) {
      filters.push("(p.name LIKE ? OR p.category LIKE ? OR p.description LIKE ?)");
      const term = `%${search}%`;
      values.push(term, term, term);
    }
    if (category) {
      filters.push("LOWER(p.category) = LOWER(?)");
      values.push(category);
    }
    if (Number.isSafeInteger(cursor) && cursor > 0) {
      filters.push("p.id < ?");
      values.push(cursor);
    }

    const [rows, categoryRows] = await Promise.all([
      prisma.$queryRawUnsafe<any[]>(
        `SELECT p.id, p.retailer_id, p.status, p.name, p.category, p.description, p.price_paise,
                p.stock, p.photos_json, DATE_FORMAT(p.expiry_date, '%Y-%m-%d') AS expiry_date,
                r.shop_name, r.registration_no, r.phone
         FROM retailer_marketplace_products p
         INNER JOIN retail_users r ON r.id = p.retailer_id
         WHERE ${filters.join(" AND ")}
         ORDER BY p.id DESC LIMIT 26`,
        ...values
      ),
      prisma.$queryRawUnsafe<any[]>(
        `SELECT DISTINCT p.category FROM retailer_marketplace_products p
         INNER JOIN retail_users r ON r.id = p.retailer_id
         WHERE p.status = 'APPROVED' AND r.is_approved = 1 AND LOWER(r.status) = 'approved'
           AND JSON_LENGTH(p.photos_json) > 0
           AND (p.expiry_date IS NULL OR p.expiry_date >= CURDATE())
           AND p.retailer_id IN (${retailerPlaceholders})
         ORDER BY p.category ASC LIMIT 100`,
        ...entitledRetailerIds
      ),
    ]);
    const visibleRows = rows.filter((row) => isMarketplaceProductVisible({ status: row.status, retailerId: Number(row.retailer_id) }, entitlements));
    const pageRows = visibleRows.slice(0, 25);
    const products = pageRows.map((row) => {
      const id = Number(row.id);
      return {
        id,
        retailerId: Number(row.retailer_id),
        shopName: String(row.shop_name || "Retailer shop"),
        registrationNo: row.registration_no ? String(row.registration_no) : null,
        retailerPhone: buyerSignedIn && /^\+?\d{10,15}$/.test(String(row.phone || "").replace(/[\s()-]/g, ""))
          ? String(row.phone).replace(/[\s()-]/g, "")
          : null,
        name: String(row.name),
        category: String(row.category),
        description: String(row.description),
        pricePaise: String(row.price_paise),
        stock: Number(row.stock),
        photos: parseProductPhotosJson(row.photos_json).map((file) => productPhotoUrl(file, id)),
        expiryDate: row.expiry_date ? String(row.expiry_date) : null,
      };
    });
    return NextResponse.json({
      ok: true,
      buyerSignedIn,
      products,
      categories: categoryRows.map((row) => String(row.category)),
      hasMore: visibleRows.length > 25,
      nextCursor: products.length ? products[products.length - 1].id : null,
    });
  } catch (error) {
    console.error("Marketplace products could not be loaded:", error);
    return NextResponse.json({ ok: false, error: "Could not load marketplace products." }, { status: 500 });
  }
}
