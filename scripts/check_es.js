const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const list = await prisma.$queryRawUnsafe('SELECT id, service_name FROM es_services LIMIT 10');
  console.log('Sample services:', list);
}

main().finally(() => prisma.$disconnect());
