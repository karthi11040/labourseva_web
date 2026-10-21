import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const placement = searchParams.get("placement") || "HOME_SLIDER";

    // 1. Fetch system settings
    const settings = await prisma.$queryRawUnsafe<any[]>(`
      SELECT setting_key, setting_value FROM system_settings
      WHERE setting_key IN ('adsense_publisher_id', 'adsense_auto_ads', 'adsense_safe_zone', 'home_ad_mode')
    `).catch(() => []);

    const sMap: Record<string, string> = {};
    for (const s of settings) sMap[s.setting_key] = s.setting_value;

    const publisherId = sMap.adsense_publisher_id || process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_ID || "ca-pub-3642883735997037";
    const autoAdsEnabled = sMap.adsense_auto_ads ? sMap.adsense_auto_ads === "true" || sMap.adsense_auto_ads === "1" : true;
    const safeZone = sMap.adsense_safe_zone ? sMap.adsense_safe_zone === "true" || sMap.adsense_safe_zone === "1" : true;
    const homeAdMode = (sMap.home_ad_mode as "MANUAL" | "ADSENSE" | "BOTH") || "MANUAL";

    // 2. Fetch active manual ads
    let manualQuery = `SELECT id, image, title, link, target_group, placement, sort_order FROM promo_slides WHERE status = 1`;
    const params: any[] = [];
    if (placement !== "all") {
      manualQuery += ` AND placement = ?`;
      params.push(placement);
    }
    manualQuery += ` ORDER BY sort_order ASC, id DESC`;

    const manualRows = await prisma.$queryRawUnsafe<any[]>(manualQuery, ...params).catch(() => []);

    // 3. Fetch active AdSense units
    let adsenseQuery = `SELECT id, name, slot_id, format, placement, size FROM adsense_units WHERE status = 'ACTIVE'`;
    const asParams: any[] = [];
    if (placement !== "all") {
      adsenseQuery += ` AND placement = ?`;
      asParams.push(placement);
    }
    adsenseQuery += ` ORDER BY id ASC`;

    const adsenseRows = await prisma.$queryRawUnsafe<any[]>(adsenseQuery, ...asParams).catch(() => []);

    return NextResponse.json({
      success: true,
      homeAdMode,
      publisherId,
      autoAdsEnabled,
      safeZone,
      manualAds: manualRows.map((m) => ({
        id: String(m.id),
        title: m.title,
        image: m.image,
        link: m.link || "",
        placement: m.placement,
        sortOrder: Number(m.sort_order || 0),
      })),
      adsenseUnits: adsenseRows.map((u) => ({
        id: String(u.id),
        name: u.name,
        slotId: u.slot_id,
        format: u.format,
        placement: u.placement,
        size: u.size,
      })),
    });
  } catch (err: any) {
    console.error("GET /api/ads error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
