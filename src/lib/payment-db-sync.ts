import { prisma } from "@/lib/prisma";

let columnsEnsured = false;

/**
 * Ensures the `payment_attempts` table contains all required fields for comprehensive
 * Razorpay payment tracking, failure handling, retry workflows, and refund statuses.
 * Idempotent and safe to run multiple times.
 */
export async function ensurePaymentAttemptColumns(): Promise<void> {
  if (columnsEnsured) return;

  try {
    const existingCols = await prisma.$queryRawUnsafe<any[]>(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment_attempts'`
    );

    const colNames = new Set(existingCols.map((c) => c.COLUMN_NAME || c.column_name));

    const columnsToAdd: { name: string; definition: string }[] = [
      { name: "reference_id", definition: "VARCHAR(100) NULL" },
      { name: "service_type", definition: "VARCHAR(40) NOT NULL DEFAULT 'DOCUMENT_SERVICE'" },
      { name: "application_reference", definition: "VARCHAR(100) NULL" },
      { name: "service_name", definition: "VARCHAR(255) NULL" },
      { name: "category_name", definition: "VARCHAR(255) NULL" },
      { name: "currency", definition: "VARCHAR(10) NOT NULL DEFAULT 'INR'" },
      { name: "display_status", definition: "VARCHAR(50) NOT NULL DEFAULT 'INITIATED'" },
      { name: "razorpay_status", definition: "VARCHAR(50) NOT NULL DEFAULT 'created'" },
      { name: "razorpay_order_id", definition: "VARCHAR(100) NULL" },
      { name: "razorpay_payment_id", definition: "VARCHAR(100) NULL" },
      { name: "payment_method", definition: "VARCHAR(50) NULL" },
      { name: "method_details", definition: "TEXT NULL" },
      { name: "error_code", definition: "VARCHAR(100) NULL" },
      { name: "error_reason", definition: "VARCHAR(150) NULL" },
      { name: "error_source", definition: "VARCHAR(100) NULL" },
      { name: "error_step", definition: "VARCHAR(100) NULL" },
      { name: "error_description", definition: "TEXT NULL" },
      { name: "status_message", definition: "TEXT NULL" },
      { name: "suggested_action", definition: "TEXT NULL" },
      { name: "refund_status", definition: "VARCHAR(50) NULL" },
      { name: "refund_amount", definition: "DECIMAL(10,2) NOT NULL DEFAULT 0.00" },
      { name: "refund_reference", definition: "VARCHAR(100) NULL" },
      { name: "receipt_no", definition: "VARCHAR(50) NULL" },
      { name: "idempotency_key", definition: "VARCHAR(128) NULL" },
      { name: "updated_at", definition: "DATETIME NULL" },
      { name: "captured_at", definition: "DATETIME NULL" },
      { name: "refunded_at", definition: "DATETIME NULL" },
      { name: "metadata", definition: "TEXT NULL" },
    ];

    for (const col of columnsToAdd) {
      if (!colNames.has(col.name)) {
        try {
          await prisma.$executeRawUnsafe(
            `ALTER TABLE payment_attempts ADD COLUMN \`${col.name}\` ${col.definition}`
          );
        } catch (alterErr: any) {
          // Ignore if column was already added concurrently
          if (!alterErr.message?.includes("Duplicate column name")) {
            console.warn(`[payment_attempts migration warning]: ${alterErr.message}`);
          }
        }
      }
    }

    // Ensure useful indexes
    try {
      await prisma.$executeRawUnsafe(
        "CREATE INDEX idx_pa_order_id ON payment_attempts(razorpay_order_id)"
      );
    } catch {}
    try {
      await prisma.$executeRawUnsafe(
        "CREATE INDEX idx_pa_payment_id ON payment_attempts(razorpay_payment_id)"
      );
    } catch {}
    try {
      await prisma.$executeRawUnsafe(
        "CREATE INDEX idx_pa_user_status ON payment_attempts(user_id, display_status)"
      );
    } catch {}

    columnsEnsured = true;
  } catch (err: any) {
    console.error("Failed to verify/migrate payment_attempts columns:", err);
  }
}
