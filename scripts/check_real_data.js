const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const dists = await prisma.$queryRawUnsafe("SELECT id, registration_no, name, email, phone, wallet_balance, verification_status FROM distributors LIMIT 5");
  console.log("Distributors:", dists);

  const retailers = await prisma.$queryRawUnsafe("SELECT id, registration_no, name, shop_name, email, phone, wallet_balance, status, distributor_id FROM retail_users LIMIT 5");
  console.log("Retailers:", retailers);

  const customers = await prisma.$queryRawUnsafe("SELECT id, registration_no, full_name, email, phone, wallet, status, verification_status FROM customers LIMIT 5");
  console.log("Customers:", customers);
}

main().catch(console.error).finally(() => prisma.$disconnect());
