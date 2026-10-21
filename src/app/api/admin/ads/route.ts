import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface SettingRow {
  setting_key: string;
  setting_value: string;
}

export async function GET() {
  try {
    // 1. Fetch manual ads (promo_slides)
    const manualAds = await prisma.$queryRawUnsafe<any[]>(`
      SELECT id, image, title, status, created_at, link, target_group, placement, sort_order, views, clicks
      FROM promo_slides
      ORDER BY sort_order ASC, id DESC
    `).catch((err) => {
      console.error("Error fetching promo_slides:", err);
      return [];
    });

    // 2. Fetch Google AdSense units
    const adsenseUnits = await prisma.$queryRawUnsafe<any[]>(`
      SELECT id, name, slot_id, format, placement, size, status, created_at, updated_at
      FROM adsense_units
      ORDER BY id ASC
    `).catch((err) => {
      console.error("Error fetching adsense_units:", err);
      return [];
    });

    // 3. Fetch system settings for ads
    const settingsRows = await prisma.$queryRawUnsafe<SettingRow[]>(`
      SELECT setting_key, setting_value
      FROM system_settings
      WHERE setting_key IN ('adsense_publisher_id', 'adsense_auto_ads', 'adsense_safe_zone', 'home_ad_mode')
    `).catch(() => []);

    const settingsMap: Record<string, string> = {};
    for (const row of settingsRows) {
      settingsMap[row.setting_key] = row.setting_value;
    }

    const publisherId = settingsMap.adsense_publisher_id || process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_ID || "ca-pub-3642883735997037";
    const autoAdsEnabled = settingsMap.adsense_auto_ads ? settingsMap.adsense_auto_ads === "true" || settingsMap.adsense_auto_ads === "1" : true;
    const safeZone = settingsMap.adsense_safe_zone ? settingsMap.adsense_safe_zone === "true" || settingsMap.adsense_safe_zone === "1" : true;
    const homeAdMode = settingsMap.home_ad_mode || "MANUAL"; // "MANUAL", "ADSENSE", or "BOTH"

    return NextResponse.json({
      success: true,
      googleAdSense: {
        publisherId,
        autoAdsEnabled,
        safeZone,
        homeAdMode,
        units: adsenseUnits.map((u) => ({
          id: String(u.id),
          name: u.name,
          slotId: u.slot_id,
          format: u.format,
          placement: u.placement,
          recommendedSize: u.size,
          status: u.status,
          createdAt: u.created_at,
          updatedAt: u.updated_at,
        })),
      },
      manualAds: manualAds.map((m) => ({
        id: String(m.id),
        title: m.title,
        image: m.image,
        link: m.link || "",
        targetGroup: m.target_group || "retailer,distributor,customer,guest",
        placement: m.placement || "HOME_SLIDER",
        sortOrder: Number(m.sort_order || 0),
        status: Number(m.status) === 1 ? "ACTIVE" : "PAUSED",
        views: Number(m.views || 0),
        clicks: Number(m.clicks || 0),
        createdAt: m.created_at,
      })),
    });
  } catch (error: any) {
    console.error("GET /api/admin/ads error:", error);
    return NextResponse.json({ success: false, message: error.message || "Failed to load ads" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, action } = body;

    // Support deletion via POST for environments where HTTP DELETE is blocked or sanitized
    if (action === "DELETE" || type === "DELETE") {
      const id = body.id;
      const delType = body.targetType || (type === "DELETE" ? "MANUAL" : type);
      const numId = parseInt(String(id).replace(/\D/g, ""), 10) || Number(id);

      if (!numId || isNaN(numId)) {
        return NextResponse.json({ success: false, message: "Invalid ID provided for deletion" }, { status: 400 });
      }

      if (delType === "MANUAL") {
        await prisma.$queryRawUnsafe(`DELETE FROM promo_slides WHERE id = ?`, numId);
        return NextResponse.json({ success: true, message: "Manual banner ad deleted" });
      } else {
        await prisma.$queryRawUnsafe(`DELETE FROM adsense_units WHERE id = ?`, numId);
        return NextResponse.json({ success: true, message: "AdSense unit deleted" });
      }
    }

    if (type === "MANUAL") {
      const {
        title,
        image,
        link = "",
        placement = "HOME_SLIDER",
        placements: requestedPlacements,
        sortOrder,
        isAutoOrder,
        targetGroup = "retailer,distributor,customer,guest",
        status = "ACTIVE",
      } = body;

      if (!title || !image) {
        return NextResponse.json({ success: false, message: "Title and Image are required" }, { status: 400 });
      }

      const placements = [...new Set((Array.isArray(requestedPlacements) ? requestedPlacements : [placement])
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter((value) => /^[A-Z0-9_]{1,40}$/.test(value)))];
      if (!placements.length) {
        return NextResponse.json({ success: false, message: "Select at least one valid placement." }, { status: 400 });
      }

      const requestedOrder = Number(sortOrder);
      const autoOrder = isAutoOrder === true || sortOrder === undefined || sortOrder === null || sortOrder === "" || !Number.isFinite(requestedOrder) || requestedOrder <= 0;
      const assignedOrders = Object.fromEntries(await Promise.all(placements.map(async (slot) => {
        if (!autoOrder) return [slot, requestedOrder];
        const maxRow = await prisma.$queryRawUnsafe<any[]>(
          `SELECT COALESCE(MAX(sort_order), 0) as max_order FROM promo_slides WHERE placement = ?`,
          slot
        ).catch(() => [{ max_order: 0 }]);
        return [slot, (Number(maxRow[0]?.max_order) || 0) + 1];
      })));

      const activeVal = status === "ACTIVE" ? 1 : 0;
      const rowPlaceholders = placements.map(() => "(?, ?, ?, ?, ?, ?, ?)").join(", ");
      const values = placements.flatMap((slot) => [title, image, link, slot, assignedOrders[slot], targetGroup, activeVal]);
      await prisma.$queryRawUnsafe(`
        INSERT INTO promo_slides (title, image, link, placement, sort_order, target_group, status)
        VALUES ${rowPlaceholders}
      `, ...values);

      return NextResponse.json({
        success: true,
        message: `Manual banner ad created in ${placements.length} placement(s).`,
        assignedOrders,
      });
    }

    if (type === "GOOGLE_ADSENSE") {
      const {
        name,
        slotId,
        format = "horizontal",
        placement = "HOME_SLIDER",
        size = "Responsive (728x90)",
        status = "ACTIVE",
      } = body;

      if (!name || !slotId) {
        return NextResponse.json({ success: false, message: "Ad Unit Name and Slot ID are required" }, { status: 400 });
      }

      await prisma.$queryRawUnsafe(`
        INSERT INTO adsense_units (name, slot_id, format, placement, size, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `, name, slotId, format, placement, size, status);

      return NextResponse.json({ success: true, message: "Google AdSense Unit created successfully" });
    }

    return NextResponse.json({ success: false, message: "Invalid ad type" }, { status: 400 });
  } catch (error: any) {
    console.error("POST /api/admin/ads error:", error);
    return NextResponse.json({ success: false, message: error.message || "Failed to save ad" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { type } = body;

    if (type === "SETTINGS") {
      const { publisherId, autoAdsEnabled, safeZone, homeAdMode } = body;

      const upsertSetting = async (key: string, val: string) => {
        const existing = await prisma.$queryRawUnsafe<any[]>(
          `SELECT id FROM system_settings WHERE setting_key = ?`,
          key
        ).catch(() => []);
        if (existing.length > 0) {
          await prisma.$queryRawUnsafe(
            `UPDATE system_settings SET setting_value = ?, updated_at = NOW() WHERE setting_key = ?`,
            val,
            key
          );
        } else {
          await prisma.$queryRawUnsafe(
            `INSERT INTO system_settings (setting_key, setting_value, setting_type, category, description, updated_at)
             VALUES (?, ?, 'text', 'ads', ?, NOW())`,
            key,
            val,
            `Ad settings for ${key}`
          );
        }
      };

      if (publisherId !== undefined) await upsertSetting("adsense_publisher_id", String(publisherId));
      if (autoAdsEnabled !== undefined) await upsertSetting("adsense_auto_ads", autoAdsEnabled ? "true" : "false");
      if (safeZone !== undefined) await upsertSetting("adsense_safe_zone", safeZone ? "true" : "false");
      if (homeAdMode !== undefined) await upsertSetting("home_ad_mode", String(homeAdMode));

      return NextResponse.json({ success: true, message: "Ad settings updated successfully" });
    }

    // Swap sort orders between two items (Move Up / Move Down)
    if (type === "REORDER_SWAP") {
      const { id1, order1, id2, order2 } = body;
      const numId1 = Number(id1);
      const numId2 = Number(id2);
      if (numId1 && numId2) {
        await prisma.$queryRawUnsafe(`UPDATE promo_slides SET sort_order = ? WHERE id = ?`, Number(order1) || 0, numId1);
        await prisma.$queryRawUnsafe(`UPDATE promo_slides SET sort_order = ? WHERE id = ?`, Number(order2) || 0, numId2);
        return NextResponse.json({ success: true, message: "Banner order updated successfully" });
      }
      return NextResponse.json({ success: false, message: "Invalid IDs for swap" }, { status: 400 });
    }

    // Auto-resequence all banners sequentially (1, 2, 3...)
    if (type === "AUTO_RESEQUENCE") {
      const placement = body.placement;
      let query = `SELECT id FROM promo_slides`;
      const qParams: any[] = [];
      if (placement && placement !== "ALL") {
        query += ` WHERE placement = ?`;
        qParams.push(placement);
      }
      query += ` ORDER BY sort_order ASC, id ASC`;
      const slides = await prisma.$queryRawUnsafe<any[]>(query, ...qParams).catch(() => []);
      for (let i = 0; i < slides.length; i++) {
        await prisma.$queryRawUnsafe(`UPDATE promo_slides SET sort_order = ? WHERE id = ?`, i + 1, slides[i].id);
      }
      return NextResponse.json({
        success: true,
        message: `Successfully re-sequenced ${slides.length} banners sequentially (1, 2, 3...)`,
      });
    }

    if (type === "MANUAL") {
      const { id, title, image, link, placement, sortOrder, isAutoOrder, targetGroup, status } = body;
      if (!id) return NextResponse.json({ success: false, message: "Ad ID is required" }, { status: 400 });

      const updates: string[] = [];
      const values: any[] = [];

      if (title !== undefined) { updates.push("title = ?"); values.push(title); }
      if (image !== undefined) { updates.push("image = ?"); values.push(image); }
      if (link !== undefined) { updates.push("link = ?"); values.push(link); }
      if (placement !== undefined) { updates.push("placement = ?"); values.push(placement); }
      
      if (isAutoOrder === true) {
        const currentPlacement = placement ?? (await prisma.$queryRawUnsafe<any[]>(
          `SELECT placement FROM promo_slides WHERE id = ? LIMIT 1`,
          Number(id)
        ))[0]?.placement ?? "HOME_SLIDER";
        const maxRow = await prisma.$queryRawUnsafe<any[]>(
          `SELECT COALESCE(MAX(sort_order), 0) as max_order FROM promo_slides WHERE id != ? AND placement = ?`,
          Number(id), currentPlacement
        ).catch(() => [{ max_order: 0 }]);
        const autoOrder = (Number(maxRow[0]?.max_order) || 0) + 1;
        updates.push("sort_order = ?");
        values.push(autoOrder);
      } else if (sortOrder !== undefined) {
        updates.push("sort_order = ?");
        values.push(Number(sortOrder) || 0);
      }

      if (targetGroup !== undefined) { updates.push("target_group = ?"); values.push(targetGroup); }
      if (status !== undefined) {
        updates.push("status = ?");
        values.push(status === "ACTIVE" ? 1 : 0);
      }

      if (updates.length > 0) {
        values.push(Number(id));
        await prisma.$queryRawUnsafe(`
          UPDATE promo_slides SET ${updates.join(", ")} WHERE id = ?
        `, ...values);
      }

      return NextResponse.json({ success: true, message: "Manual ad updated successfully" });
    }

    if (type === "GOOGLE_ADSENSE") {
      const { id, name, slotId, format, placement, size, status } = body;
      if (!id) return NextResponse.json({ success: false, message: "Ad Unit ID is required" }, { status: 400 });

      const updates: string[] = [];
      const values: any[] = [];

      if (name !== undefined) { updates.push("name = ?"); values.push(name); }
      if (slotId !== undefined) { updates.push("slot_id = ?"); values.push(slotId); }
      if (format !== undefined) { updates.push("format = ?"); values.push(format); }
      if (placement !== undefined) { updates.push("placement = ?"); values.push(placement); }
      if (size !== undefined) { updates.push("size = ?"); values.push(size); }
      if (status !== undefined) { updates.push("status = ?"); values.push(status); }

      if (updates.length > 0) {
        values.push(Number(id));
        await prisma.$queryRawUnsafe(`
          UPDATE adsense_units SET ${updates.join(", ")}, updated_at = NOW() WHERE id = ?
        `, ...values);
      }

      return NextResponse.json({ success: true, message: "Google AdSense unit updated successfully" });
    }

    return NextResponse.json({ success: false, message: "Invalid type" }, { status: 400 });
  } catch (error: any) {
    console.error("PATCH /api/admin/ads error:", error);
    return NextResponse.json({ success: false, message: error.message || "Failed to update ad" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const type = searchParams.get("type");

    if (!id || !type) {
      return NextResponse.json({ success: false, message: "id and type are required" }, { status: 400 });
    }

    const numId = parseInt(String(id).replace(/\D/g, ""), 10) || Number(id);
    if (!numId || isNaN(numId)) {
      return NextResponse.json({ success: false, message: "Invalid ID provided for deletion" }, { status: 400 });
    }

    if (type === "MANUAL") {
      await prisma.$queryRawUnsafe(`DELETE FROM promo_slides WHERE id = ?`, numId);
      return NextResponse.json({ success: true, message: "Manual banner ad deleted" });
    }

    if (type === "GOOGLE_ADSENSE") {
      await prisma.$queryRawUnsafe(`DELETE FROM adsense_units WHERE id = ?`, numId);
      return NextResponse.json({ success: true, message: "AdSense unit deleted" });
    }

    return NextResponse.json({ success: false, message: "Invalid delete type" }, { status: 400 });
  } catch (error: any) {
    console.error("DELETE /api/admin/ads error:", error);
    return NextResponse.json({ success: false, message: error.message || "Failed to delete ad" }, { status: 500 });
  }
}
