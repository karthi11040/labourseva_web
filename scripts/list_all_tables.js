const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const allTables = await prisma.$queryRawUnsafe("SHOW TABLES");
  console.log(allTables.map(t => Object.values(t)[0]));
}

main().catch(console.error).finally(() => prisma.$disconnect());
