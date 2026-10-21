// Counts how many accounts still authenticate via the legacy `plain_password`
// column. Run after deployments: the in-login progressive rehash shrinks these
// over time; aim for zero, then remove the column entirely (migration).
//
//    node scripts/report_plain_passwords.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function count(table) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) AS n FROM ${table} WHERE plain_password IS NOT NULL AND plain_password <> ''`
  );
  const n = rows?.[0]?.n ?? rows?.[0] ?? 0;
  console.log(`${table}: ${String(n)} account(s) with plaintext password still on file`);
  return n;
}

(async () => {
  try {
    for (const t of ['retail_users', 'distributors', 'customers']) {
      await count(t).catch((e) => console.log(`${t}: SKIP (${String(e.message).slice(0, 60)})`));
    }
  } finally {
    await prisma.$disconnect();
  }
})();
