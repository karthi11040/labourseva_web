const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const dist = await prisma.$queryRawUnsafe('SELECT id, registration_no, name, phone, email, wallet_balance, total_commission_earned, verification_status FROM distributors LIMIT 10');
  console.log('Distributors count:', dist.length, dist);

  const ret = await prisma.$queryRawUnsafe('SELECT id, registration_no, name, shop_name, phone, email, wallet_balance, status, distributor_id FROM retail_users LIMIT 10');
  console.log('Retailers count:', ret.length, ret);

  const cust = await prisma.$queryRawUnsafe('SELECT id, full_name, phone, email, verification_status, wallet FROM customers LIMIT 5');
  console.log('Customers count:', cust.length, cust);
}

main().catch(console.error).finally(() => prisma.$disconnect());
