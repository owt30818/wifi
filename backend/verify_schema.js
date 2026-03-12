const db = require('./db');
require('dotenv').config();

async function verifySchema() {
    try {
        console.log('Verifying DB Schema...');

        const [cols] = await db.execute("DESCRIBE portal_users");
        console.log('portal_users columns:', cols.map(c => c.Field).join(', '));

        const hasGroup = cols.find(c => c.Field === 'group_name');
        console.log('Has group_name column in portal_users?', !!hasGroup);

        const [devCols] = await db.execute("DESCRIBE managed_devices");
        console.log('managed_devices columns:', devCols.map(c => c.Field).join(', '));

        const hasDevGroup = devCols.find(c => c.Field === 'group_name');
        console.log('Has group_name column in managed_devices?', !!hasDevGroup);

        if (hasGroup && hasDevGroup) {
            console.log('SUCCESS: All required columns exist.');
        } else {
            console.log('FAILURE: Missing columns.');
        }

    } catch (err) {
        console.error('Verification Error:', err);
    } finally {
        process.exit();
    }
}

verifySchema();
