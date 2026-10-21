const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const s = await prisma.$queryRawUnsafe(
    'SELECT id, name, pdf_path, sign_pos_x, sign_pos_y, sign_width, sign_height, doc_width, doc_height FROM services'
  );
  console.log('Services count:', s.length);
  for (const row of s) {
    console.log(row);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
