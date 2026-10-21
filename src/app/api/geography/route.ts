import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatGeoBilingual, getBilingualDistrict } from "@/lib/geo-bilingual";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const districtId = searchParams.get("districtId");
    const talukId = searchParams.get("talukId");

    // 1. If talukId is given or type=panchayaths, fetch Panchayaths
    if (talukId || type === "panchayaths") {
      const tid = talukId ? Number(talukId) : undefined;
      const rawPanchayaths = await prisma.panchayath.findMany({
        where: { ...(tid ? { talukId: tid } : {}), active: true },
        orderBy: { name: "asc" },
        select: { id: true, talukId: true, name: true, nameTa: true },
      });
      const panchayaths = rawPanchayaths.map((p) => {
        const geo = formatGeoBilingual(p.name, p.nameTa);
        return {
          id: p.id,
          talukId: p.talukId,
          name: geo.en,
          nameTa: geo.ta,
          displayName: geo.bilingual,
        };
      });
      return NextResponse.json({ ok: true, panchayaths });
    }

    // 2. If districtId is given or type=taluks, fetch Taluks
    if (districtId || type === "taluks") {
      const did = districtId ? Number(districtId) : undefined;
      const rawTaluks = await prisma.taluk.findMany({
        where: { ...(did ? { districtId: did } : {}), active: true },
        orderBy: { name: "asc" },
        select: { id: true, districtId: true, name: true, nameTa: true },
      });
      const taluks = rawTaluks.map((t) => {
        const geo = formatGeoBilingual(t.name, t.nameTa);
        return {
          id: t.id,
          districtId: t.districtId,
          name: geo.en,
          nameTa: geo.ta,
          displayName: geo.bilingual,
        };
      });
      return NextResponse.json({ ok: true, taluks });
    }

    // 3. Otherwise return all active Districts
    const rawDistricts = await prisma.district.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, nameTa: true, code: true },
    });
    const districts = rawDistricts.map((d) => {
      const geo = getBilingualDistrict(d.id);
      const en = geo.en || d.name;
      const ta = geo.ta || d.nameTa || d.name;
      return {
        id: d.id,
        code: d.code,
        name: en,
        nameTa: ta,
        displayName: `${en} / ${ta}`,
      };
    });

    return NextResponse.json({ ok: true, districts });
  } catch (err) {
    console.error("GET /api/geography error:", err);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}

