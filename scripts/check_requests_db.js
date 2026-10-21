const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const srCount = await prisma.$queryRawUnsafe("SELECT COUNT(*) AS c FROM service_requests");
  const esrCount = await prisma.$queryRawUnsafe("SELECT COUNT(*) AS c FROM es_service_requests");
  const gsoCount = await prisma.$queryRawUnsafe("SELECT COUNT(*) AS c FROM guest_service_orders");
  const roCount = await prisma.$queryRawUnsafe("SELECT COUNT(*) AS c FROM retail_orders");
  const appCount = await prisma.$queryRawUnsafe("SELECT COUNT(*) AS c FROM applications");

  console.log("service_requests count:", srCount[0].c);
  console.log("es_service_requests count:", esrCount[0].c);
  console.log("guest_service_orders count:", gsoCount[0].c);
  console.log("retail_orders count:", roCount[0].c);
  console.log("applications count:", appCount[0].c);

  const sampleSR = await prisma.$queryRawUnsafe("SELECT id, service_id, amount, status, guest_id, customer_id, user_id, gateway_provider, purchase_notes, created_at FROM service_requests ORDER BY id DESC LIMIT 3");
  console.log("sample service_requests:", sampleSR);

  const sampleESR = await prisma.$queryRawUnsafe("SELECT id, application_number, service_id, creator_type, user_id, retailer_id, distributor_id, amount, status, payment_status, created_at FROM es_service_requests ORDER BY id DESC LIMIT 3");
  console.log("sample es_service_requests:", sampleESR);

  const sampleRO = await prisma.$queryRawUnsafe("SELECT id, user_id, service_id, amount, payment_status, status, transaction_id, created_at FROM retail_orders ORDER BY id DESC LIMIT 3");
  console.log("sample retail_orders:", sampleRO);
}

main().catch(console.error).finally(() => prisma.$disconnect());
