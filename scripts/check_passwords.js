const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const dist = await prisma.$queryRawUnsafe("SELECT id, name, email, phone, password, plain_password FROM distributors LIMIT 3");
  console.log("Distributor passwords:", dist);

  const ret = await prisma.$queryRawUnsafe("SELECT id, name, email, phone, password, plain_password FROM retail_users LIMIT 3");
  console.log("Retailer passwords:", ret);
}

main().catch(console.error).finally(() => prisma.$disconnect());
