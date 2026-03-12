const db = require('./db');

async function migrate() {
    try {
        // Add user_id column if it doesn't exist
        const [columns] = await db.execute('SHOW COLUMNS FROM managed_devices LIKE "user_id"');
        if (columns.length === 0) {
            console.log('Adding user_id column to managed_devices...');
            await db.execute('ALTER TABLE managed_devices ADD COLUMN user_id INT DEFAULT NULL');
            await db.execute('ALTER TABLE managed_devices ADD FOREIGN KEY (user_id) REFERENCES portal_users(id) ON DELETE SET NULL');
            console.log('user_id column added successfully');
        } else {
            console.log('user_id column already exists');
        }
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        process.exit();
    }
}

migrate();
