const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const cols = await prisma.$queryRawUnsafe("DESCRIBE guest_service_orders");
  console.log("guest_service_orders columns:", cols.map(c => `${c.Field} (${c.Type})`));

  const sample = await prisma.$queryRawUnsafe("SELECT * FROM guest_service_orders ORDER BY id DESC LIMIT 2");
  console.log("sample guest_service_orders:", sample);
}

main().catch(console.error).finally(() => prisma.$disconnect());
