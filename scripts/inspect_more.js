const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function describeTable(table) {
  try {
    const cols = await prisma.$queryRawUnsafe(`DESCRIBE ${table}`);
    console.log(`\n=== Table: ${table} ===`);
    console.log(cols.map(c => `${c.Field} (${c.Type})`));
  } catch (e) {
    console.log(`Table ${table} error:`, e.message);
  }
}

async function main() {
  const grants = await prisma.$queryRawUnsafe(`SHOW GRANTS`);
  console.log("Current user grants:", grants);
  try {
    // Insert a test row into promo_slides
    await prisma.$queryRawUnsafe(`INSERT INTO promo_slides (title, image, status) VALUES ('Test Delete', 'test.png', 0)`);
    const [inserted] = await prisma.$queryRawUnsafe(`SELECT id FROM promo_slides WHERE title = 'Test Delete' ORDER BY id DESC LIMIT 1`);
    console.log("Inserted test slide id:", inserted.id);
    // Now test deleting it
    await prisma.$queryRawUnsafe(`DELETE FROM promo_slides WHERE id = ?`, inserted.id);
    console.log("Deleted test slide successfully!");
  } catch (err) {
    console.error("Delete test error:", err);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
