const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.$queryRawUnsafe('SELECT setting_key, setting_value, category FROM system_settings');
  console.log('Settings:', rows);
}

main().catch(console.error).finally(() => prisma.$disconnect());
