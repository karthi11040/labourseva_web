const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Creating notifications table if not exists...');
  await prisma.$queryRawUnsafe(`
    CREATE TABLE IF NOT EXISTS \`notifications\` (
      \`id\` BIGINT NOT NULL AUTO_INCREMENT,
      \`userId\` VARCHAR(64) NULL,
      \`channel\` ENUM('SMS', 'EMAIL', 'INAPP', 'WEB') NOT NULL DEFAULT 'INAPP',
      \`templateKey\` VARCHAR(60) NOT NULL,
      \`language\` ENUM('EN', 'TA') NOT NULL DEFAULT 'EN',
      \`toHash\` CHAR(64) NULL,
      \`toEnc\` TEXT NULL,
      \`status\` ENUM('QUEUED', 'SENDING', 'SENT', 'DELIVERED', 'FAILED') NOT NULL DEFAULT 'DELIVERED',
      \`attempts\` INT NOT NULL DEFAULT 0,
      \`nextAttemptAt\` DATETIME(3) NULL,
      \`providerMessageId\` VARCHAR(80) NULL,
      \`error\` VARCHAR(300) NULL,
      \`payload\` JSON NULL,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`sentAt\` DATETIME(3) NULL,
      \`deliveredAt\` DATETIME(3) NULL,
      \`readAt\` DATETIME(3) NULL,
      PRIMARY KEY (\`id\`),
      INDEX \`notifications_status_nextAttemptAt_idx\` (\`status\`, \`nextAttemptAt\`),
      INDEX \`notifications_userId_channel_readAt_idx\` (\`userId\`, \`channel\`, \`readAt\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  console.log('Table created or already exists.');
  const count = await prisma.notification.count();
  console.log('Current notification count in prisma:', count);
}

main().catch(console.error).finally(() => prisma.$disconnect());
