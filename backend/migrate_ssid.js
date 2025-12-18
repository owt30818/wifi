const db = require('./db');

async function migrate() {
    try {
        // Check if column exists
        const [rows] = await db.execute("SHOW COLUMNS FROM managed_devices LIKE 'allowed_ssids'");
        if (rows.length === 0) {
            console.log("Adding allowed_ssids column...");
            await db.execute("ALTER TABLE managed_devices ADD COLUMN allowed_ssids VARCHAR(255) DEFAULT NULL AFTER alias");
            console.log("Column added.");
        } else {
            console.log("Column already exists.");
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

migrate();
