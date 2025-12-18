const fs = require('fs');
const db = require('./db');

async function applySchema() {
    try {
        const sql = fs.readFileSync('./schema.sql', 'utf8');
        // Split by semicolon and filter empty statements
        const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);

        for (const statement of statements) {
            await db.execute(statement);
        }
        console.log('Schema applied successfully');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

applySchema();
