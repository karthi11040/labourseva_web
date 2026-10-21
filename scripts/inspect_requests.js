const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const [
    srCust,
    srRet,
    srGuest,
    esCount,
    gsoCount,
    roCount
  ] = await Promise.all([
    prisma.$queryRawUnsafe(`SELECT COUNT(*) as c FROM service_requests WHERE (customer_id IS NOT NULL OR user_id > 0) AND (gateway_provider != 'KENDRA_WALLET' OR gateway_provider IS NULL) AND guest_id IS NULL`),
    prisma.$queryRawUnsafe(`SELECT COUNT(*) as c FROM service_requests WHERE gateway_provider = 'KENDRA_WALLET' OR purchase_notes LIKE '%assistedKendra%'`),
    prisma.$queryRawUnsafe(`SELECT COUNT(*) as c FROM service_requests WHERE guest_id IS NOT NULL`),
    prisma.$queryRawUnsafe(`SELECT COUNT(*) as c FROM es_service_requests`),
    prisma.$queryRawUnsafe(`SELECT COUNT(*) as c FROM guest_service_orders`),
    prisma.$queryRawUnsafe(`SELECT COUNT(*) as c FROM retail_orders`),
  ]);

  console.log({
    srCust: Number(srCust[0]?.c || 0),
    srRet: Number(srRet[0]?.c || 0),
    srGuest: Number(srGuest[0]?.c || 0),
    esCount: Number(esCount[0]?.c || 0),
    gsoCount: Number(gsoCount[0]?.c || 0),
    roCount: Number(roCount[0]?.c || 0),
  });
}

run().catch(console.error).finally(() => prisma.$disconnect());
