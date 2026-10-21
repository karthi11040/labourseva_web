const http = require('http');
const { PrismaClient } = require('@prisma/client');

async function testDelete() {
  const prisma = new PrismaClient();

  // Test 1: DELETE via /api/admin/promotions
  await prisma.$queryRawUnsafe(`INSERT INTO promo_slides (title, image, status) VALUES ('Test Promotions DELETE', 'test.png', 1)`);
  const [row1] = await prisma.$queryRawUnsafe(`SELECT id FROM promo_slides WHERE title = 'Test Promotions DELETE' ORDER BY id DESC LIMIT 1`);
  console.log("Created test slide 1 id:", row1.id);

  const res1 = await new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path: `/api/admin/promotions?id=${row1.id}&type=MANUAL`,
      method: 'DELETE'
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.end();
  });
  console.log(`/api/admin/promotions DELETE response:`, res1.status, res1.body);

  // Test 2: POST with action="DELETE"
  await prisma.$queryRawUnsafe(`INSERT INTO promo_slides (title, image, status) VALUES ('Test POST DELETE', 'test.png', 1)`);
  const [row2] = await prisma.$queryRawUnsafe(`SELECT id FROM promo_slides WHERE title = 'Test POST DELETE' ORDER BY id DESC LIMIT 1`);
  console.log("Created test slide 2 id:", row2.id);

  const postData = JSON.stringify({ action: "DELETE", id: row2.id, type: "MANUAL" });
  const res2 = await new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path: `/api/admin/promotions`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
  console.log(`/api/admin/promotions POST DELETE response:`, res2.status, res2.body);

  await prisma.$disconnect();
}

testDelete().catch(console.error);
