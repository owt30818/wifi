const db = require('./db');

async function checkColumns() {
    try {
        const [rows] = await db.execute('SHOW COLUMNS FROM radacct');
        console.log(JSON.stringify(rows, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkColumns();
