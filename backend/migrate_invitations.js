const db = require('./db');

async function migrate() {
    try {
        console.log('Creating signup_invitations table...');
        await db.execute(`
            CREATE TABLE IF NOT EXISTS signup_invitations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                code VARCHAR(64) NOT NULL UNIQUE,
                name VARCHAR(100),
                group_name VARCHAR(100),
                allowed_ssids VARCHAR(255),
                max_uses INT DEFAULT NULL,
                used_count INT DEFAULT 0,
                click_count INT DEFAULT 0,
                expires_at DATETIME DEFAULT NULL,
                created_by INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('signup_invitations table created.');

        console.log('Creating system_settings table...');
        await db.execute(`
            CREATE TABLE IF NOT EXISTS system_settings (
                key_name VARCHAR(50) PRIMARY KEY,
                value TEXT
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Insert default setting
        await db.execute(`
            INSERT IGNORE INTO system_settings (key_name, value) VALUES ('public_signup_enabled', 'false')
        `);
        console.log('system_settings table created with defaults.');

        console.log('Migration completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err.message);
    } finally {
        process.exit();
    }
}

migrate();
