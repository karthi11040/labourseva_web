const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const extraServices = [
    { name: "Non-Creamy Layer (OBC) Certificate", nameTa: "கிரீமிலேயர் அற்ற (OBC) சான்றிதழ்", cat: "Certificates", fee: 60.00 },
    { name: "Destitute Widow Pension Scheme (OAP)", nameTa: "ஆதரவற்ற விதவை ஓய்வூதியத் திட்டம்", cat: "Schemes", fee: 0.00 },
    { name: "Chief Minister Uzhavar Pathukappu Thittam", nameTa: "முதலமைச்சரின் உழவர் பாதுகாப்புத் திட்டம்", cat: "Schemes", fee: 0.00 },
    { name: "Motorized Retrofitted Scooter for Disabled", nameTa: "மாற்றுத்திறனாளிகளுக்கான இணைப்பு சக்கரம் பொருத்தப்பட்ட வாகனம்", cat: "Disability Welfare", fee: 0.00 },
  ];

  for (const svc of extraServices) {
    const cat = await prisma.$queryRawUnsafe(
      `SELECT id FROM es_main_categories WHERE category_name = ? LIMIT 1`,
      svc.cat
    );
    const catId = cat?.[0]?.id || 1;
    const existing = await prisma.$queryRawUnsafe(
      `SELECT id FROM es_services WHERE service_name = ? LIMIT 1`,
      svc.name
    );
    if (!existing || existing.length === 0) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO es_services (service_name, service_cost, main_category_id, sub_category_id, details, status, created_at)
         VALUES (?, ?, ?, 1, ?, 'active', NOW())`,
        svc.name,
        svc.fee,
        catId,
        `${svc.nameTa} · Official Statutory E-CSC Portal Application.`
      );
    }
  }

  const list = await prisma.$queryRawUnsafe(`
    SELECT m.category_name, COUNT(s.id) as count
    FROM es_services s
    JOIN es_main_categories m ON s.main_category_id = m.id
    WHERE s.status = 'active' OR s.status IS NULL
    GROUP BY m.category_name
  `);
  console.log("Category counts:", list);

  const total = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as c FROM es_services WHERE status = 'active' OR status IS NULL`);
  console.log("Total active services:", total[0].c);
}

main().catch(console.error).finally(() => prisma.$disconnect());
