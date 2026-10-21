const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  await p.notification.updateMany({
    where: { id: { in: [1n, 2n, 6n] } },
    data: { readAt: null },
  });
  const unread = await p.notification.count({ where: { readAt: null } });
  console.log('Unread notifications count in DB:', unread);
}

main().finally(() => p.$disconnect());
