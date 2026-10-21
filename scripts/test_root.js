const { PrismaClient } = require('@prisma/client');

async function testUrl(url) {
  const p = new PrismaClient({ datasources: { db: { url } } });
  try {
    const res = await p.$queryRawUnsafe('SELECT 1 as test');
    console.log('SUCCESS for', url, res);
    return p;
  } catch (err) {
    console.log('FAILED for', url, err.message);
    await p.$disconnect();
    return null;
  }
}

async function main() {
  await testUrl('mysql://root:@127.0.0.1:3306/labourseva_secure');
  await testUrl('mysql://root:root@127.0.0.1:3306/labourseva_secure');
  await testUrl('mysql://root:@localhost:3306/labourseva_secure');
}

main().catch(console.error);
