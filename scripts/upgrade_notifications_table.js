const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Checking columns in notifications table...");
  const cols = await prisma.$queryRawUnsafe('DESCRIBE notifications');
  const fieldNames = cols.map(c => c.Field);
  
  if (!fieldNames.includes('eventKey')) {
    console.log("Adding eventKey column...");
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`notifications\` 
      ADD COLUMN \`eventKey\` VARCHAR(128) NULL AFTER \`templateKey\`,
      ADD UNIQUE INDEX \`notifications_eventKey_uidx\` (\`eventKey\`)
    `).catch(err => console.log("eventKey add warning:", err.message));
  } else {
    console.log("eventKey column already exists.");
  }

  if (!fieldNames.includes('relatedEntityType')) {
    console.log("Adding relatedEntityType column...");
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`notifications\` 
      ADD COLUMN \`relatedEntityType\` VARCHAR(64) NULL AFTER \`eventKey\`,
      ADD COLUMN \`relatedEntityId\` VARCHAR(64) NULL AFTER \`relatedEntityType\`,
      ADD INDEX \`notifications_relatedEntity_idx\` (\`relatedEntityType\`, \`relatedEntityId\`)
    `).catch(err => console.log("relatedEntity add warning:", err.message));
  } else {
    console.log("relatedEntityType column already exists.");
  }

  // Ensure index on (userId, readAt, createdAt)
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`notifications\`
      ADD INDEX \`notifications_userId_readAt_createdAt_idx\` (\`userId\`, \`readAt\`, \`createdAt\`)
    `);
    console.log("Added index notifications_userId_readAt_createdAt_idx");
  } catch (idxErr) {
    console.log("Index already exists or notice:", idxErr.message);
  }

  const updatedCols = await prisma.$queryRawUnsafe('DESCRIBE notifications');
  console.log("Updated columns:", updatedCols.map(c => c.Field));
}

main().catch(console.error).finally(() => prisma.$disconnect());
