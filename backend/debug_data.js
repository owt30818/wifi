const db = require('./db');
require('dotenv').config();

async function debugData() {
    try {
        console.log('--- Recent Managed Devices ---');
        const [devices] = await db.execute("SELECT id, mac_address, group_name, created_at FROM managed_devices ORDER BY created_at DESC LIMIT 5");
        console.table(devices);

        console.log('\n--- Recent Signup Invitations ---');
        const [invitations] = await db.execute("SELECT id, code, group_name, used_count, created_at FROM signup_invitations ORDER BY created_at DESC LIMIT 5");
        console.table(invitations);

        console.log('\n--- Recent Portal Users ---');
        // portal_users에 group_name 컬럼이 있는지 확인했으므로 조회
        const [users] = await db.execute("SELECT id, username, group_name, created_at FROM portal_users ORDER BY created_at DESC LIMIT 5");
        console.table(users);

    } catch (err) {
        console.error('Debug Error:', err);
    } finally {
        process.exit();
    }
}

debugData();
