const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const dists = await prisma.$queryRawUnsafe('SELECT id, name, name_en, signature_path, active FROM districts WHERE active = 1 ORDER BY COALESCE(name_en, name)');
  console.log('Total active:', dists.length);
  let countWithSig = 0;
  for (const d of dists) {
    if (d.signature_path) {
      countWithSig++;
      console.log(`[HAS SIGNATURE] ID ${d.id}: ${d.name_en || d.name} -> ${d.signature_path}`);
    } else {
      console.log(`[NO SIGNATURE]  ID ${d.id}: ${d.name_en || d.name}`);
    }
  }
  console.log(`Summary: ${countWithSig} / ${dists.length} districts have signature_path in DB.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
