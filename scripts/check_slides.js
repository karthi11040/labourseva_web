const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.$queryRawUnsafe('SELECT id, title, image, placement, status, sort_order FROM promo_slides');
  console.log('Total rows in promo_slides:', rows.length);
  console.log(rows);
}

main().catch(console.error).finally(() => prisma.$disconnect());
