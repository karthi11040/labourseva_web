const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const allDists = await prisma.$queryRawUnsafe('SELECT * FROM districts');
  const dir = path.join(process.cwd(), 'public', 'assets', 'uploads', 'signatures');
  const files = fs.readdirSync(dir);
  const distMap = new Map(allDists.map(d => [d.id, d]));

  console.log('--- Matching signature files ---');
  for (const f of files) {
    const m = f.match(/district_(\d+)_/);
    if (m) {
      const id = Number(m[1]);
      const d = distMap.get(id);
      if (d) {
        console.log(`${f} -> ID: ${id} (${d.name_en} / ${d.name}) [active=${d.active}]`);
      } else {
        console.log(`${f} -> ID: ${id} (Unknown district ID)`);
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
