const db = require('./db');

async function migrate() {
    try {
        console.log('Adding group_name column to portal_users...');

        // Add group_name column to portal_users
        await db.execute(`
            ALTER TABLE portal_users 
            ADD COLUMN IF NOT EXISTS group_name VARCHAR(100)
        `);

        console.log('Migration completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err.message);
    } finally {
        process.exit();
    }
}

migrate();
