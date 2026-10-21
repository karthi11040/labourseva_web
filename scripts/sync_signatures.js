const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const dists = await prisma.$queryRawUnsafe(
    'SELECT id, name, name_en, nameTa, signature_path FROM districts WHERE active = 1 ORDER BY COALESCE(name_en, name)'
  );
  const sigDir = path.join(process.cwd(), 'public', 'assets', 'uploads', 'signatures');
  const files = fs.readdirSync(sigDir);
  const dataFile = path.join(process.cwd(), 'data', 'district-signatures.json');

  let existingJson = [];
  try {
    existingJson = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  } catch (e) {
    existingJson = [];
  }

  const jsonMap = new Map(existingJson.map(item => [item.districtId, item]));

  const updatedSignatures = [];
  let presentCount = 0;
  let missingCount = 0;

  for (const d of dists) {
    let filename = null;
    if (d.signature_path) {
      const bname = path.basename(d.signature_path);
      if (fs.existsSync(path.join(sigDir, bname))) {
        filename = bname;
      }
    }

    if (!filename) {
      // Find matching file in directory
      const match = files.find(f => f.startsWith(`district_${d.id}_`));
      if (match) {
        filename = match;
        // update DB with this signature_path
        const dbPath = `../assets/uploads/signatures/${match}`;
        await prisma.$executeRawUnsafe(
          'UPDATE districts SET signature_path = ? WHERE id = ?',
          dbPath,
          d.id
        );
        console.log(`Updated DB signature_path for ID ${d.id} (${d.name_en || d.name}) -> ${dbPath}`);
      }
    }

    if (filename) {
      presentCount++;
      const existing = jsonMap.get(d.id);
      const storageKey = `/assets/uploads/signatures/${filename}`;
      const stat = fs.statSync(path.join(sigDir, filename));
      const ext = path.extname(filename).toLowerCase();
      const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';

      updatedSignatures.push({
        id: existing?.id || `sig-dist-${d.id}`,
        districtId: d.id,
        officerName: existing?.officerName || 'District Labour Officer',
        designation: existing?.designation || 'Labour Department, Govt. of Tamil Nadu',
        storageKey,
        imageMime: mime,
        imageSize: stat.size,
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } else {
      missingCount++;
    }
  }

  fs.mkdirSync(path.dirname(dataFile), { recursive: true });
  fs.writeFileSync(dataFile, JSON.stringify(updatedSignatures, null, 2), 'utf8');

  console.log(`\n========================================`);
  console.log(`Signatures Sync Completed:`);
  console.log(`Districts with signatures present: ${presentCount} / ${dists.length}`);
  console.log(`Districts pending: ${missingCount}`);
  console.log(`Saved ${updatedSignatures.length} records to ${dataFile}`);
  console.log(`========================================\n`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
