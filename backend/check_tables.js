const db = require('./db');

async function checkTables() {
    try {
        const [rows] = await db.execute('SHOW TABLES');
        console.log(JSON.stringify(rows, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkTables();
