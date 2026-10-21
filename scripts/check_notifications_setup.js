const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const cols = await prisma.$queryRawUnsafe('DESCRIBE notifications');
  console.log('Notifications columns:', cols);
  const notifs = await prisma.$queryRawUnsafe('SELECT * FROM notifications ORDER BY id DESC LIMIT 5');
  console.log('Sample notifications:', notifs);
}

main().catch(console.error).finally(() => prisma.$disconnect());
