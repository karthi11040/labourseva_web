const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const cols = await prisma.$queryRawUnsafe("DESCRIBE guests");
  console.log("guests columns:", cols.map(c => `${c.Field} (${c.Type})`));

  const sample = await prisma.$queryRawUnsafe("SELECT * FROM guests LIMIT 2");
  console.log("sample guests:", sample);
}

main().catch(console.error).finally(() => prisma.$disconnect());
