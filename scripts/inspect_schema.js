const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tables = await prisma.$queryRawUnsafe('SHOW TABLES');
  const tableNames = tables.map(t => Object.values(t)[0]);
  console.log('Total tables:', tableNames.length);
  console.log('Tables:', tableNames.sort());
}

main().catch(console.error).finally(() => prisma.$disconnect());
