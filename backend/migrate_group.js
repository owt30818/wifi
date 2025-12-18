const db = require('./db');

async function migrate() {
    try {
        console.log("Checking for group_name column...");
        const [rows] = await db.execute("SHOW COLUMNS FROM managed_devices LIKE 'group_name'");

        if (rows.length === 0) {
            console.log("Adding group_name column...");
            await db.execute("ALTER TABLE managed_devices ADD COLUMN group_name VARCHAR(100) NULL AFTER alias");
            console.log("Column added.");
        } else {
            console.log("Column group_name already exists.");
        }
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
}

migrate();
