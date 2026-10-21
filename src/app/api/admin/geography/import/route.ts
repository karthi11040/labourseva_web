import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Row = { district: string; taluk: string; panchayat: string };

export async function GET() {
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ d_id: number; d_name: string; d_name_en: string | null; t_id: number | null; t_name: string | null; t_name_ta: string | null; p_id: number | null; p_name: string | null; p_name_ta: string | null }>>("SELECT d.id d_id,d.name d_name,d.name_en d_name_en,t.id t_id,t.name t_name,t.nameTa t_name_ta,p.id p_id,p.name p_name,p.nameTa p_name_ta FROM districts d LEFT JOIN taluks t ON t.district_id=d.id LEFT JOIN panchayaths p ON p.taluk_id=t.id ORDER BY d.name,t.name,p.name");
    const map = new Map<number, any>();
    for (const row of rows) { let district = map.get(row.d_id); if (!district) { district = { id: row.d_id, name: row.d_name_en || row.d_name, nameTa: row.d_name, taluks: [] }; map.set(row.d_id, district); } if (row.t_id != null) { let taluk = district.taluks.find((item: any) => item.id === row.t_id); if (!taluk) { taluk = { id: row.t_id, name: row.t_name, nameTa: row.t_name_ta || row.t_name, panchayaths: [] }; district.taluks.push(taluk); } if (row.p_id != null) taluk.panchayaths.push({ id: row.p_id, name: row.p_name, nameTa: row.p_name_ta || row.p_name }); } }
    const districts = [...map.values()];
    return NextResponse.json({ districts });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load geography data." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { rows?: Row[] };
    const rows = Array.isArray(body.rows) ? body.rows : [];
    if (!rows.length || rows.length > 5000) return NextResponse.json({ error: "Provide between 1 and 5,000 rows." }, { status: 400 });
    const result = await prisma.$transaction(async (tx) => {
      let added = 0;
      for (const row of rows) {
        const districtName = row.district?.trim(); const talukName = row.taluk?.trim(); const panchayatName = row.panchayat?.trim();
        if (!districtName || !talukName || !panchayatName) throw new Error("Each row needs district, taluk and panchayat.");
        const district = await tx.district.upsert({ where: { name: districtName }, update: {}, create: { name: districtName } });
        const taluk = await tx.taluk.upsert({ where: { districtId_name: { districtId: district.id, name: talukName } }, update: {}, create: { districtId: district.id, name: talukName } });
        await tx.panchayath.upsert({ where: { talukId_name: { talukId: taluk.id, name: panchayatName } }, update: {}, create: { talukId: taluk.id, name: panchayatName } });
        added++;
      }
      return added;
    });
    return NextResponse.json({ ok: true, imported: result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Import failed." }, { status: 400 });
  }
}
