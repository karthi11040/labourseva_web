import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAuthRetailer } from "@/lib/auth-helpers";
import { getAuthenticatedActor } from "@/lib/staff-session";
import { prisma } from "@/lib/prisma";
import {
  ensureRetailerMarketplaceProductsTable,
  parseProductPhotosJson,
} from "@/lib/retailer-marketplace";
import { ensureMarketplaceSubscriptionTables, getMarketplaceEntitlement, canShowMarketplaceProducts } from "@/lib/marketplace-subscriptions";

export const dynamic = "force-dynamic";

const uploadDir = path.join(process.cwd(), "data", "private", "marketplace");
const maxSize = 5 * 1024 * 1024;
const filePattern = /^[0-9]+-product-[0-9a-f-]+\.(?:jpg|png|webp)$/i;

function imageType(bytes: Buffer): "image/jpeg" | "image/png" | "image/webp" | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "image/png";
  if (bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

export async function POST(request: NextRequest) {
  const retailer = await getAuthRetailer(request);
  if (!retailer) return NextResponse.json({ ok: false, error: "Sign in to upload product photos." }, { status: 401 });
  if (Number(retailer.is_approved) !== 1 || String(retailer.status || "").toLowerCase() !== "approved") {
    return NextResponse.json({ ok: false, error: "Your retailer account must be approved before you can list products." }, { status: 403 });
  }
  try {
    const contentLength = Number(request.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > maxSize + 64 * 1024) {
      return NextResponse.json({ ok: false, error: "Product photos must be 5 MB or smaller." }, { status: 413 });
    }
    const form = await request.formData();
    const file = form.get("file");
    const productId = Number(form.get("productId"));
    if (!Number.isSafeInteger(productId) || productId <= 0) return NextResponse.json({ ok: false, error: "Save a product draft before uploading photos." }, { status: 400 });
    if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "Choose a product photo." }, { status: 400 });
    if (file.size <= 0 || file.size > maxSize) return NextResponse.json({ ok: false, error: "Product photos must be 5 MB or smaller." }, { status: 400 });
    const bytes = Buffer.from(await file.arrayBuffer());
    const mime = imageType(bytes);
    if (!mime || file.type !== mime) return NextResponse.json({ ok: false, error: "Upload a valid JPG, PNG, or WebP image." }, { status: 400 });

    const extension = mime === "image/jpeg" ? "jpg" : mime === "image/png" ? "png" : "webp";
    const filename = `${retailer.id}-product-${crypto.randomUUID()}.${extension}`;
    await mkdir(uploadDir, { recursive: true });
    await ensureRetailerMarketplaceProductsTable();
    let wroteFile = false;
    await prisma.$transaction(async (tx) => {
      const [seller] = await tx.$queryRawUnsafe<any[]>(
        "SELECT status, is_approved FROM retail_users WHERE id = ? LIMIT 1 FOR UPDATE",
        retailer.id
      );
      if (!seller || Number(seller.is_approved) !== 1 || String(seller.status || "").toLowerCase() !== "approved") {
        throw new Error("Your retailer account must be approved before you can list products.");
      }
      const [product] = await tx.$queryRawUnsafe<any[]>(
        "SELECT status, photos_json FROM retailer_marketplace_products WHERE id = ? AND retailer_id = ? LIMIT 1 FOR UPDATE",
        productId,
        retailer.id
      );
      if (!product) throw new Error("Product listing was not found.");
      if (!["DRAFT", "REJECTED"].includes(String(product.status))) {
        throw new Error(product.status === "PENDING" ? "This product is awaiting review. You can upload photos after staff replies." : "Save this approved product as a draft before changing its photos.");
      }
      const photos = parseProductPhotosJson(product.photos_json);
      if (photos.length >= 5) throw new Error("A product can have up to five photos.");
      await writeFile(path.join(uploadDir, filename), bytes, { flag: "wx", mode: 0o600 });
      wroteFile = true;
      await tx.$executeRawUnsafe(
        "UPDATE retailer_marketplace_products SET photos_json = ? WHERE id = ? AND retailer_id = ?",
        JSON.stringify([...photos, filename]),
        productId,
        retailer.id
      );
    }).catch(async (error) => {
      if (wroteFile) await unlink(path.join(uploadDir, filename)).catch(() => undefined);
      throw error;
    });
    const [saved] = await prisma.$queryRawUnsafe<any[]>("SELECT photos_json FROM retailer_marketplace_products WHERE id = ? AND retailer_id = ? LIMIT 1", productId, retailer.id);
    return NextResponse.json({ ok: true, filename, photos: parseProductPhotosJson(saved?.photos_json) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not upload this product photo.";
    const status = message.includes("not found") ? 404 : ["awaiting review", "Save this approved"].some((part) => message.includes(part)) ? 409 : message.includes("must be approved") ? 403 : ["Save a product draft", "up to five photos"].some((part) => message.includes(part)) ? 400 : 500;
    if (status === 500) console.error("Marketplace product photo upload failed:", error);
    return NextResponse.json({ ok: false, error: status === 500 ? "Could not upload this product photo." : message }, { status });
  }
}

export async function GET(request: NextRequest) {
  const filename = request.nextUrl.searchParams.get("file") || "";
  const productId = Number(request.nextUrl.searchParams.get("productId"));
  if (!filePattern.test(filename) || !Number.isSafeInteger(productId) || productId <= 0) return NextResponse.json({ ok: false }, { status: 404 });

  const retailer = await getAuthRetailer(request);
  const actor = getAuthenticatedActor(request);
  const staff = actor.role === "ADMIN" || (actor.role === "EMPLOYEE" && actor.canVerify === true);
  let publicApprovedProduct = false;
  try {
    const [product] = await prisma.$queryRawUnsafe<any[]>(
      `SELECT p.retailer_id, p.status, p.photos_json, r.status AS retailer_status, r.is_approved
       FROM retailer_marketplace_products p
       LEFT JOIN retail_users r ON r.id = p.retailer_id
       WHERE p.id = ? LIMIT 1`,
      productId
    );
    if (!product || !parseProductPhotosJson(product.photos_json).includes(filename)) {
      return NextResponse.json({ ok: false }, { status: 404 });
    }
    await ensureMarketplaceSubscriptionTables();
    const entitlement = await getMarketplaceEntitlement(Number(product.retailer_id));
    publicApprovedProduct = product.status === "APPROVED" && Number(product.is_approved) === 1 && String(product.retailer_status || "").toLowerCase() === "approved" && canShowMarketplaceProducts(entitlement);
    const owner = retailer && Number(retailer.id) === Number(product.retailer_id);
    if (!publicApprovedProduct && !owner && !staff) return NextResponse.json({ ok: false }, { status: 403 });

    const bytes = await readFile(path.join(uploadDir, filename));
    const mime = filename.endsWith(".png") ? "image/png" : filename.endsWith(".webp") ? "image/webp" : "image/jpeg";
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": mime,
        "Content-Disposition": "inline",
        "Cache-Control": publicApprovedProduct ? "public, max-age=300" : "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return NextResponse.json({ ok: false }, { status: 404 });
    console.error("Marketplace product photo could not be read:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
