const db = require('./db');

async function migrate() {
    try {
        console.log('Migrating portal_admins table...');

        // Check if columns exist to avoid errors
        const [columns] = await db.execute(`SHOW COLUMNS FROM portal_admins LIKE 'role'`);
        if (columns.length === 0) {
            await db.execute(`
                ALTER TABLE portal_admins 
                ADD COLUMN role ENUM('super_admin', 'sub_admin') DEFAULT 'super_admin',
                ADD COLUMN allowed_groups TEXT,
                ADD COLUMN allowed_ssids TEXT
            `);
            console.log('Added role, allowed_groups, allowed_ssids columns.');
        } else {
            console.log('Columns already exist. Skipping.');
        }

        console.log('Migration completed.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
