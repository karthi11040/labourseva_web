import { prisma } from "../src/lib/prisma";

async function main() {
  try {
    const tables: any[] = await prisma.$queryRawUnsafe("SHOW TABLES");
    console.log("MySQL Tables found:", tables.map((t) => Object.values(t)[0]));
  } catch (e: any) {
    console.error("DB inspection error:", e.message);
  } finally {
    process.exit();
  }
}

main();
