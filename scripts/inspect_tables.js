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
  const tables = [
    'customers',
    'customer_sessions',
    'customerprofile',
    'retailers',
    'retail_users',
    'retail_orders',
    'retail_wallet_transactions',
    'distributors',
    'distributor_transactions',
    'wallet',
    'wallet_transactions',
    'commission_rules',
    'commission_ledger',
    'documents',
    'downloads',
    'helpdesk_tickets',
  ];
  for (const t of tables) {
    await describeTable(t);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
