const crypto = require("node:crypto");
const { PrismaClient } = require("@prisma/client");

const dbUrl = new URL(process.env.DATABASE_URL || "");
const expectedDatabase = "labourseva_secure";
if (!["127.0.0.1", "localhost", "::1"].includes(dbUrl.hostname) || dbUrl.pathname.slice(1) !== expectedDatabase) {
  throw new Error(`Refusing to alter a non-local or unexpected database (${dbUrl.hostname}/${dbUrl.pathname.slice(1)}).`);
}
if (process.env.RESET_VERIFICATION_DUMMY_ACCOUNTS !== "YES") {
  throw new Error("Set RESET_VERIFICATION_DUMMY_ACCOUNTS=YES to apply this local test-data cleanup.");
}

const prisma = new PrismaClient();
const testPassword = "TestAccount@2026!";
const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString("hex");
  return `scrypt:${salt}:${crypto.scryptSync(password, salt, 64).toString("hex")}`;
};
const passwordHash = hashPassword(testPassword);
const customerMarker = `LOWER(COALESCE(full_name,'')) REGEXP '^(test|dummy|demo|sample)( |-|$)' OR LOWER(COALESCE(email,'')) REGEXP '(@example\\.(com|org|net|test)$|^(test|dummy|demo|sample)[+._-])'`;
const personMarker = `LOWER(COALESCE(name,'')) REGEXP '^(test|dummy|demo|sample)( |-|$)' OR LOWER(COALESCE(email,'')) REGEXP '(@example\\.(com|org|net|test)$|^(test|dummy|demo|sample)[+._-])'`;
const keepIds = { customers: [94, 95], retail_users: [2, 3], distributors: [1, 2] };

async function tableExists(client, table) {
  const rows = await client.$queryRawUnsafe(
    "SELECT COUNT(*) AS n FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?",
    table,
  );
  return Number(rows[0]?.n || 0) > 0;
}

async function columnExists(client, table, column) {
  const rows = await client.$queryRawUnsafe(
    "SELECT COUNT(*) AS n FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
    table,
    column,
  );
  return Number(rows[0]?.n || 0) > 0;
}

async function deleteByIdsIfPresent(tx, table, column, ids) {
  if (!ids.length || !(await tableExists(tx, table)) || !(await columnExists(tx, table, column))) return;
  await tx.$executeRawUnsafe(`DELETE FROM \`${table}\` WHERE \`${column}\` IN (${ids.join(",")})`);
}

async function main() {
  // Idempotently bring the legacy local DB up to the columns used by retailer verification.
  if (!(await columnExists(prisma, "retail_users", "shop_url"))) {
    await prisma.$executeRawUnsafe("ALTER TABLE retail_users ADD COLUMN shop_url VARCHAR(500) NULL");
  }
  if (!(await columnExists(prisma, "retail_users", "is_approved"))) {
    await prisma.$executeRawUnsafe("ALTER TABLE retail_users ADD COLUMN is_approved TINYINT(1) NOT NULL DEFAULT 0");
    await prisma.$executeRawUnsafe("UPDATE retail_users SET is_approved = CASE WHEN LOWER(status) = 'approved' THEN 1 ELSE 0 END");
  }

  const results = await prisma.$transaction(async (tx) => {
    const [customers] = await tx.$queryRawUnsafe(`SELECT COUNT(*) AS n FROM customers WHERE ${customerMarker}`);
    const [retailers] = await tx.$queryRawUnsafe(`SELECT COUNT(*) AS n FROM retail_users WHERE ${personMarker}`);
    const [distributors] = await tx.$queryRawUnsafe(`SELECT COUNT(*) AS n FROM distributors WHERE ${personMarker}`);
    const [genericUsers] = await tx.$queryRawUnsafe("SELECT COUNT(*) AS n FROM users");
    const counts = [Number(customers.n), Number(retailers.n), Number(distributors.n), Number(genericUsers.n)];
    const isInitialDataset = counts.join(",") === "90,3,122,1";
    const [alreadySeeded] = await tx.$queryRawUnsafe(
      `SELECT
        (SELECT COUNT(*) FROM customers WHERE email IN ('verification.customer.one@example.test','verification.customer.two@example.test')) AS customers,
        (SELECT COUNT(*) FROM retail_users WHERE email IN ('verification.retailer.one@example.test','verification.retailer.two@example.test')) AS retailers,
        (SELECT COUNT(*) FROM users WHERE email IN ('verification.user.one@example.test','verification.user.two@example.test')) AS users,
        (SELECT COUNT(*) FROM distributors WHERE email IN ('verification.distributor.one@example.test','verification.distributor.two@example.test')) AS distributors`,
    );
    if (!isInitialDataset && [alreadySeeded.customers, alreadySeeded.retailers, alreadySeeded.users, alreadySeeded.distributors].map(Number).join(",") === "2,2,2,2") {
      return { alreadySeeded: true, removed: { customers: 0, retailers: 0, distributors: 0 } };
    }
    if (!isInitialDataset) {
      throw new Error(`Refusing cleanup: expected the inspected local test dataset (90,3,122,1), found (${counts.join(",")}).`);
    }

    const candidateIds = {};
    for (const [table, marker] of [["customers", customerMarker], ["retail_users", personMarker], ["distributors", personMarker]]) {
      const rows = await tx.$queryRawUnsafe(`SELECT id FROM \`${table}\` WHERE ${marker}`);
      const keep = new Set(keepIds[table]);
      candidateIds[table] = rows.map((row) => Number(row.id)).filter((id) => !keep.has(id));
      for (const id of keep) {
        if (!rows.some((row) => Number(row.id) === id)) throw new Error(`Expected retained ${table} test account ${id} is missing.`);
      }
    }

    const [extraRetailOrders] = await tx.$queryRawUnsafe(
      `SELECT COUNT(*) AS n FROM retail_orders WHERE user_id IN (${candidateIds.retail_users.join(",") || "NULL"})`,
    );
    const [extraRetailTokens] = await tx.$queryRawUnsafe(
      `SELECT COUNT(*) AS n FROM retail_remember_tokens WHERE retail_user_id IN (${candidateIds.retail_users.join(",") || "NULL"})`,
    );
    if (Number(extraRetailOrders.n) > 0) throw new Error("An extra retailer test account has linked orders; cleanup stopped without deleting anything.");

    // Preserve retained accounts' balances and activity; remove authentication/audit artifacts for deleted test identities.
    const removedCustomers = candidateIds.customers;
    const removedRetailers = candidateIds.retail_users;
    const removedDistributors = candidateIds.distributors;
    const customerEmails = await tx.$queryRawUnsafe(
      `SELECT email FROM customers WHERE id IN (${removedCustomers.join(",") || "NULL"})`,
    );
    const distributorRelations = [
      ["commissions", "distributor_id"], ["distribution_commissions", "distributor_id"],
      ["distributor_payment_methods", "distributor_id"], ["distributor_transactions", "distributor_id"],
      ["es_service_requests", "distributor_id"], ["payout_requests", "distributor_id"],
      ["wallet_logs", "distributor_id"], ["withdrawals", "distributor_id"],
    ];
    for (const [table, column] of distributorRelations) {
      if (!(await tableExists(tx, table)) || !(await columnExists(tx, table, column))) continue;
      const [linked] = await tx.$queryRawUnsafe(`SELECT COUNT(*) AS n FROM \`${table}\` WHERE \`${column}\` IN (${removedDistributors.join(",") || "NULL"})`);
      if (Number(linked.n) > 0) throw new Error(`Extra distributor test accounts have linked ${table} records; cleanup stopped without deleting anything.`);
    }
    const [retailerDistributorRefs] = await tx.$queryRawUnsafe(
      `SELECT COUNT(*) AS n FROM retail_users WHERE distributor_id IN (${removedDistributors.join(",") || "NULL"})`,
    );
    if (Number(retailerDistributorRefs.n) > 0) throw new Error("An extra distributor is linked to a retailer; cleanup stopped without deleting anything.");
    if (Number(extraRetailTokens.n) > 0) {
      await deleteByIdsIfPresent(tx, "retail_remember_tokens", "retail_user_id", removedRetailers);
    }

    if (removedCustomers.length) {
      await deleteByIdsIfPresent(tx, "admin_wallet_logs", "customer_id", removedCustomers);
      if (await columnExists(tx, "kyc_audit_logs", "user_type")) {
        await tx.$executeRawUnsafe(`DELETE FROM kyc_audit_logs WHERE user_type = 'customer' AND user_id IN (${removedCustomers.join(",")})`);
      }
      await deleteByIdsIfPresent(tx, "payment_attempts", "customer_id", removedCustomers);
      await deleteByIdsIfPresent(tx, "wallet_transactions", "customer_id", removedCustomers);
      await deleteByIdsIfPresent(tx, "service_requests", "customer_id", removedCustomers);
      for (const row of customerEmails) {
        if (row.email && (await tableExists(tx, "password_resets"))) {
          await tx.$executeRawUnsafe("DELETE FROM password_resets WHERE identifier = ?", row.email);
        }
      }
      await tx.$executeRawUnsafe(`DELETE FROM customers WHERE id IN (${removedCustomers.join(",")})`);
    }
    if (removedRetailers.length) await tx.$executeRawUnsafe(`DELETE FROM retail_users WHERE id IN (${removedRetailers.join(",")})`);
    if (removedDistributors.length) {
      if (await columnExists(tx, "kyc_audit_logs", "user_type")) {
        await tx.$executeRawUnsafe(`DELETE FROM kyc_audit_logs WHERE user_type = 'distributor' AND user_id IN (${removedDistributors.join(",")})`);
      }
      await tx.$executeRawUnsafe(`DELETE FROM distributors WHERE id IN (${removedDistributors.join(",")})`);
    }

    const customersToKeep = [
      [94, "Test Customer One", "verification.customer.one@example.test", "9200000201"],
      [95, "Test Customer Two", "verification.customer.two@example.test", "9200000202"],
    ];
    for (const [id, name, email, phone] of customersToKeep) {
      await tx.$executeRawUnsafe(
        `UPDATE customers SET full_name = ?, email = ?, phone = ?, password = ?, email_verified = 1,
          status = 'pending', verification_status = 'Pending', verification_note = NULL, rejection_reason = NULL
         WHERE id = ?`,
        name, email, phone, passwordHash, id,
      );
    }

    const retailersToKeep = [
      [2, "Test Retailer One", "Test Shop One", "TN-RET-TEST-001", "verification.retailer.one@example.test", "9200000301", "https://example.test/retailer-one"],
      [3, "Test Retailer Two", "Test Shop Two", "TN-RET-TEST-002", "verification.retailer.two@example.test", "9200000302", "https://example.test/retailer-two"],
    ];
    for (const [id, name, shopName, registrationNo, email, phone, shopUrl] of retailersToKeep) {
      await tx.$executeRawUnsafe(
        `UPDATE retail_users SET name = ?, shop_name = ?, registration_no = ?, business_type = 'Retail Shop',
          shop_url = ?, email = ?, phone = ?, password = ?, plain_password = NULL,
          status = 'Pending', is_approved = 0, rejection_reason = NULL,
          verification_note = 'Test account awaiting staff verification'
         WHERE id = ?`,
        name, shopName, registrationNo, shopUrl, email, phone, passwordHash, id,
      );
    }

    const distributorsToKeep = [
      [1, "Test Distributor One", "TN-DIST-TEST-001", "verification.distributor.one@example.test", "9200000401"],
      [2, "Test Distributor Two", "TN-DIST-TEST-002", "verification.distributor.two@example.test", "9200000402"],
    ];
    for (const [id, name, registrationNo, email, phone] of distributorsToKeep) {
      await tx.$executeRawUnsafe(
        `UPDATE distributors SET name = ?, registration_no = ?, email = ?, phone = ?, password = ?, plain_password = NULL,
          verification_status = 'Pending', is_approved = 0, rejection_reason = NULL
         WHERE id = ?`,
        name, registrationNo, email, phone, passwordHash, id,
      );
    }

    const usersToKeep = [
      ["Test User One", "verification.user.one@example.test", "test-user-one", "9200000501"],
      ["Test User Two", "verification.user.two@example.test", "test-user-two", "9200000502"],
    ];
    for (const [name, email, username, phone] of usersToKeep) {
      await tx.$executeRawUnsafe(
        `INSERT INTO users (full_name, username, phone, email, password, password_hash, status, role, wallet_balance, is_approved, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', 'user', 0.00, 0, NOW(), NOW())
         ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), phone = VALUES(phone), password = VALUES(password),
           password_hash = VALUES(password_hash), status = 'pending', is_approved = 0, updated_at = NOW()`,
        name, username, phone, email, passwordHash, passwordHash,
      );
    }

    return {
      alreadySeeded: false,
      removed: { customers: removedCustomers.length, retailers: removedRetailers.length, distributors: removedDistributors.length },
    };
  }, { timeout: 30000 });

  console.log(JSON.stringify({ ...results, testAccountsPerCategory: 2, password: testPassword }, null, 2));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
}).finally(async () => prisma.$disconnect());
