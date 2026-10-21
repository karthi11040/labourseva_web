import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Signature = {
  id: string;
  districtId: number;
  officerName: string;
  designation: string;
  storageKey: string;
  imageMime: string;
  imageSize: number;
  createdAt: string;
  updatedAt: string;
};

const dataFile = path.join(process.cwd(), "data", "district-signatures.json");
const legacyUploadDir = path.join(process.cwd(), "public", "uploads", "signatures");
const assetUploadDir = path.join(process.cwd(), "public", "assets", "uploads", "signatures");

function normalizeAssetPath(p: string | null | undefined): string | null {
  if (!p) return null;
  let clean = p.trim();
  if (clean.startsWith("../assets/")) {
    clean = clean.replace(/^\.\.\/assets\//, "/assets/");
  } else if (clean.startsWith("assets/")) {
    clean = "/" + clean;
  }
  return clean;
}

async function readSignatures(): Promise<Signature[]> {
  try {
    return JSON.parse(await fs.readFile(dataFile, "utf8"));
  } catch {
    return [];
  }
}

async function writeSignatures(rows: Signature[]) {
  await fs.mkdir(path.dirname(dataFile), { recursive: true });
  await fs.writeFile(dataFile, JSON.stringify(rows, null, 2), "utf8");
}

async function getDistricts() {
  return prisma.$queryRawUnsafe<
    Array<{
      id: number;
      name: string;
      name_en: string | null;
      nameTa: string | null;
      signature_path: string | null;
    }>
  >(
    "SELECT id, name, name_en, nameTa, signature_path FROM districts WHERE active = 1 ORDER BY COALESCE(name_en, name)"
  );
}

export async function GET() {
  try {
    const [districtRows, storedSignatures] = await Promise.all([
      getDistricts(),
      readSignatures(),
    ]);

    const sigMap = new Map<number, Signature>(
      storedSignatures.map((s) => [s.districtId, s])
    );

    // Merge database signature_path if storedSignatures doesn't have it or needs sync
    const mergedSignatures: Signature[] = [];
    let presentCount = 0;

    for (const district of districtRows) {
      let existing = sigMap.get(district.id);
      const normalizedDbPath = normalizeAssetPath(district.signature_path);

      if (normalizedDbPath) {
        presentCount++;
        if (!existing) {
          existing = {
            id: `sig-dist-${district.id}`,
            districtId: district.id,
            officerName: "District Labour Officer",
            designation: "Authorized Signatory, Govt. of Tamil Nadu",
            storageKey: normalizedDbPath,
            imageMime: "image/png",
            imageSize: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        } else if (!existing.storageKey || existing.storageKey !== normalizedDbPath) {
          existing.storageKey = normalizedDbPath;
        }
        mergedSignatures.push(existing);
      } else if (existing && existing.storageKey) {
        presentCount++;
        mergedSignatures.push(existing);
      }
    }

    // Persist cache if newly synced
    if (mergedSignatures.length > storedSignatures.length) {
      await writeSignatures(mergedSignatures).catch(() => {});
    }

    return NextResponse.json({
      districts: districtRows.map((district) => ({
        id: district.id,
        name: district.name_en || district.name,
        nameTa: district.nameTa || district.name,
        signature_path: normalizeAssetPath(district.signature_path),
      })),
      signatures: mergedSignatures,
      stats: {
        total: districtRows.length,
        present: presentCount,
        missing: Math.max(0, districtRows.length - presentCount),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load signatures." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const districtId = Number(form.get("districtId"));
    const file = form.get("file");
    const officerName = String(form.get("officerName") || "").trim() || "District Labour Officer";
    const designation = String(form.get("designation") || "").trim() || "Authorized Signatory, Govt. of Tamil Nadu";

    if (!Number.isInteger(districtId) || districtId < 1) {
      return NextResponse.json({ error: "Select a valid district." }, { status: 400 });
    }

    const allDistricts = await getDistricts();
    const targetDistrict = allDistricts.find((d) => d.id === districtId);
    if (!targetDistrict) {
      return NextResponse.json({ error: "Invalid district ID." }, { status: 400 });
    }

    let storageKey = "";
    let imageMime = "image/png";
    let imageSize = 0;

    if (file instanceof File && file.size > 0) {
      if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
        return NextResponse.json(
          { error: "Use a PNG, JPG, or WEBP image." },
          { status: 400 }
        );
      }
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { error: "Image size must be 10 MB or less." },
          { status: 400 }
        );
      }

      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const fileName = `district_${districtId}_${Date.now()}.${ext}`;

      // Save into public/assets/uploads/signatures
      await fs.mkdir(assetUploadDir, { recursive: true });
      const assetFilePath = path.join(assetUploadDir, fileName);
      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(assetFilePath, buffer);

      // Also mirror to legacy upload dir for maximum compatibility
      try {
        await fs.mkdir(legacyUploadDir, { recursive: true });
        await fs.writeFile(path.join(legacyUploadDir, fileName), buffer);
      } catch {}

      storageKey = `/assets/uploads/signatures/${fileName}`;
      imageMime = file.type;
      imageSize = file.size;

      // Update MySQL districts table
      const dbSignaturePath = `../assets/uploads/signatures/${fileName}`;
      await prisma.$executeRawUnsafe(
        "UPDATE districts SET signature_path = ? WHERE id = ?",
        dbSignaturePath,
        districtId
      );
    } else {
      // Editing metadata without new file
      const existingDbPath = normalizeAssetPath(targetDistrict.signature_path);
      if (!existingDbPath) {
        return NextResponse.json({ error: "Choose a signature image." }, { status: 400 });
      }
      storageKey = existingDbPath;
    }

    // Update district-signatures.json
    const rows = await readSignatures();
    const now = new Date().toISOString();
    const existing = rows.find((r) => r.districtId === districtId);

    const record: Signature = {
      id: existing?.id || `sig-dist-${districtId}`,
      districtId,
      officerName,
      designation,
      storageKey,
      imageMime: imageMime || existing?.imageMime || "image/png",
      imageSize: imageSize || existing?.imageSize || 0,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    const updatedRows = [...rows.filter((r) => r.districtId !== districtId), record];
    await writeSignatures(updatedRows);

    return NextResponse.json(record, { status: existing ? 200 : 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Signature upload failed." },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { id, districtId: explicitDistId } = await request.json();
    const rows = await readSignatures();
    const record = rows.find((row) => row.id === id || (explicitDistId && row.districtId === Number(explicitDistId)));

    const targetDistrictId = record?.districtId || (explicitDistId ? Number(explicitDistId) : null);

    if (targetDistrictId) {
      // Clear in MySQL districts table
      try {
        await prisma.$executeRawUnsafe(
          "UPDATE districts SET signature_path = NULL WHERE id = ?",
          targetDistrictId
        );
      } catch (dbErr) {
        console.warn("Could not clear district signature_path in MySQL:", dbErr);
      }

      // Turn off for services requiring signatures in service_availability table
      try {
        await prisma.$executeRawUnsafe(
          "UPDATE service_availability SET is_offline = 1 WHERE district_id = ?",
          targetDistrictId
        );
      } catch (dbErr) {
        console.warn("Could not update service_availability in MySQL:", dbErr);
      }
    }

    if (record) {
      try {
        const absKey = path.join(process.cwd(), "public", record.storageKey.replace(/^\//, ""));
        await fs.rm(absKey, { force: true });
      } catch {}
      await writeSignatures(rows.filter((row) => row.id !== record.id && row.districtId !== targetDistrictId));
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to delete signature." },
      { status: 400 }
    );
  }
}
