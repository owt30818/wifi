const db = require('./db');

async function migrate() {
    try {
        console.log("Converting tables to utf8mb4...");

        const tables = ['portal_admins', 'managed_devices', 'access_points'];

        for (const table of tables) {
            console.log(`Converting ${table}...`);
            await db.execute(`ALTER TABLE ${table} CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        }

        console.log("Conversion complete.");
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
}

migrate();
