const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const cols = await prisma.$queryRawUnsafe('DESCRIBE services');
  console.log('Columns in services table:');
  for (const c of cols) {
    console.log(`- ${c.Field} (${c.Type})`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
