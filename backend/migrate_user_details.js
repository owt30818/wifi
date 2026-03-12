const db = require('./db');

async function migrate() {
    try {
        console.log('Migrating portal_users table...');

        // Add new columns to portal_users
        await db.execute(`
            ALTER TABLE portal_users 
            ADD COLUMN IF NOT EXISTS grade INT,
            ADD COLUMN IF NOT EXISTS class INT,
            ADD COLUMN IF NOT EXISTS number INT,
            ADD COLUMN IF NOT EXISTS real_name VARCHAR(50)
        `);

        console.log('Migration completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err.message);
    } finally {
        process.exit();
    }
}

migrate();
