const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: 'mysql://root:root@127.0.0.1:3306/labourseva_secure' } }
});

async function main() {
  try {
    try {
      await prisma.$queryRawUnsafe("GRANT ALL PRIVILEGES ON labourseva_secure.* TO 'labourseva_app'@'localhost'");
      await prisma.$queryRawUnsafe("GRANT ALL PRIVILEGES ON labourseva_secure.* TO 'labourseva_app'@'127.0.0.1'");
      await prisma.$queryRawUnsafe("FLUSH PRIVILEGES");
      console.log('Granted privileges to labourseva_app');
    } catch (e) {
      console.warn('Grant warning:', e.message);
    }
    // 1. Add columns to promo_slides if not exist
    const cols = await prisma.$queryRawUnsafe('DESCRIBE promo_slides');
    const colNames = cols.map(c => c.Field);
    console.log('Current promo_slides cols:', colNames);

    if (!colNames.includes('placement')) {
      await prisma.$queryRawUnsafe("ALTER TABLE promo_slides ADD COLUMN placement VARCHAR(50) NOT NULL DEFAULT 'HOME_SLIDER'");
      console.log('Added placement column');
    }
    if (!colNames.includes('sort_order')) {
      await prisma.$queryRawUnsafe("ALTER TABLE promo_slides ADD COLUMN sort_order INT NOT NULL DEFAULT 0");
      console.log('Added sort_order column');
    }
    if (!colNames.includes('views')) {
      await prisma.$queryRawUnsafe("ALTER TABLE promo_slides ADD COLUMN views INT NOT NULL DEFAULT 0");
      console.log('Added views column');
    }
    if (!colNames.includes('clicks')) {
      await prisma.$queryRawUnsafe("ALTER TABLE promo_slides ADD COLUMN clicks INT NOT NULL DEFAULT 0");
      console.log('Added clicks column');
    }

    // 2. Create adsense_units table if not exists
    await prisma.$queryRawUnsafe(`
      CREATE TABLE IF NOT EXISTS adsense_units (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        slot_id VARCHAR(100) NOT NULL,
        format VARCHAR(50) NOT NULL DEFAULT 'horizontal',
        placement VARCHAR(100) NOT NULL DEFAULT 'HOME_SLIDER',
        size VARCHAR(50) NOT NULL DEFAULT 'Responsive (728x90)',
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('adsense_units table verified');

    // 3. Seed adsense_units if empty
    const units = await prisma.$queryRawUnsafe('SELECT COUNT(*) as cnt FROM adsense_units');
    if (units[0].cnt === 0 || units[0].cnt === '0' || Number(units[0].cnt) === 0) {
      await prisma.$queryRawUnsafe(`
        INSERT INTO adsense_units (name, slot_id, format, placement, size, status)
        VALUES 
          ('Home Page Top Banner', '4982736192', 'horizontal', 'HOME_SLIDER', 'Responsive (728x90)', 'ACTIVE'),
          ('Services Directory Mid-Page', '7162534891', 'horizontal', 'BETWEEN_SERVICES', 'Responsive (728x90)', 'ACTIVE'),
          ('Citizen Portal Sidebar', '3847291054', 'rectangle', 'SIDEBAR', '300x250 Medium Rectangle', 'ACTIVE')
      `);
      console.log('Seeded sample adsense_units');
    }

    // 4. Check if sample promo slide for Vaagai oil exists
    const slides = await prisma.$queryRawUnsafe("SELECT * FROM promo_slides WHERE title LIKE '%Vaagai%' OR title LIKE '%வாகை%'");
    if (slides.length === 0) {
      await prisma.$queryRawUnsafe(`
        INSERT INTO promo_slides (image, title, status, link, target_group, placement, sort_order)
        VALUES ('/uploads/ads/sample_vaagai_oil.png', 'வாகை எண்ணெய் வகைகள் (Vaagai Oil Varieties)', 1, '/services', 'retailer,distributor,customer,guest', 'HOME_SLIDER', 1)
      `);
      console.log('Inserted sample Vaagai oil manual banner slide');
    }

    console.log('Database upgrade completed successfully!');
  } catch (err) {
    console.error('Migration error:', err);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
