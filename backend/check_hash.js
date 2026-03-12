const db = require('./db');

async function checkHash() {
    try {
        const [rows] = await db.execute('SELECT username, password_hash FROM portal_admins WHERE username = "admin"');
        if (rows.length > 0) {
            const hash = rows[0].password_hash;
            console.log('Username:', rows[0].username);
            console.log('Hash prefix:', hash.substring(0, 7));
            console.log('Hash length:', hash.length);
        } else {
            console.log('Admin not found');
        }
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkHash();
