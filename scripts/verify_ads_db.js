const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const manualAds = await prisma.$queryRawUnsafe('SELECT * FROM promo_slides');
  console.log('Manual Ads in DB:', manualAds);
  const adsenseUnits = await prisma.$queryRawUnsafe('SELECT * FROM adsense_units');
  console.log('AdSense Units in DB:', adsenseUnits);
}

main().catch(console.error).finally(() => prisma.$disconnect());
