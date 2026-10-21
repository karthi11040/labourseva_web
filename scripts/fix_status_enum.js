const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: 'mysql://root:root@127.0.0.1:3306/labourseva_secure' } }
});

async function main() {
  try {
    await prisma.$queryRawUnsafe(`
      ALTER TABLE service_requests 
      MODIFY COLUMN status ENUM('pending','paid','confirmed','rejected','submitted','completed','active','expired','cancelled','approved','returned') DEFAULT 'pending'
    `);
    console.log("Successfully expanded service_requests status enum!");
  } catch (err) {
    console.error("Error expanding status enum:", err);
  }
}

main().finally(() => prisma.$disconnect());
