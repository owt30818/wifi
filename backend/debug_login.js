const db = require('./db');
const bcrypt = require('bcryptjs');

async function debugLogin() {
    const username = 'admin';
    try {
        console.log('Checking admin user in database...');
        const [admins] = await db.execute('SELECT * FROM portal_admins WHERE username = ?', [username]);

        if (admins.length === 0) {
            console.error('Admin user not found in portal_admins table!');
            return;
        }

        const admin = admins[0];
        console.log('Admin found:', admin.username);
        console.log('ID:', admin.id);
        console.log('Password Hash exists:', !!admin.password_hash);
        console.log('Password Hash length:', admin.password_hash ? admin.password_hash.length : 0);
        console.log('Password Hash value (partial):', admin.password_hash ? admin.password_hash.substring(0, 10) + '...' : 'NULL');

        // Let's also check portal_users just in case there's a conflict
        const [users] = await db.execute('SELECT * FROM portal_users WHERE username = ?', [username]);
        if (users.length > 0) {
            console.log('Warning: admin username also exists in portal_users!');
        }

    } catch (err) {
        console.error('Database connection error:', err.message);
    } finally {
        process.exit();
    }
}

debugLogin();
