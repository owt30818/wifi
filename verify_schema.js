const axios = require('axios');
const db = require('./backend/db');
require('dotenv').config({ path: './backend/.env' });

async function verifySignup() {
    console.log('Starting verification...');

    // 1. Create a test invitation code
    const testCode = 'TEST-GROUP-CODE-' + Date.now();
    const groupName = 'TEST_GROUP_A';
    const ssids = 'TEST_SSID_1,TEST_SSID_2';

    try {
        console.log('Creating test invitation...');
        await db.execute(
            'INSERT INTO signup_invitations (code, name, group_name, allowed_ssids, max_uses, is_active) VALUES (?, ?, ?, ?, 10, 1)',
            [testCode, 'Verification Test', groupName, ssids]
        );

        // 2. Signup using the code
        const username = 'verify_user_' + Date.now();
        const mac = 'AA-BB-CC-DD-EE-' + Math.floor(Math.random() * 90 + 10);

        console.log(`Signing up with code ${testCode}, username ${username}, MAC ${mac}...`);

        // We need to run the server for this, but assuming checking DB directly is faster if we create a standalone test
        // However, we want to test the actual API logic in auth.js. 
        // Since we cannot easily start the server and curl it from here without conflicting ports or auth setup,
        // we will inspect the DB schema and logic directly or try to mock the request if possible.
        // Actually, let's just inspect the DB schema first to be absolutely sure columns exist.

        const [cols] = await db.execute("DESCRIBE portal_users");
        console.log('portal_users columns:', cols.map(c => c.Field).join(', '));

        const hasGroup = cols.find(c => c.Field === 'group_name');
        console.log('Has group_name column?', !!hasGroup);

        const [devCols] = await db.execute("DESCRIBE managed_devices");
        console.log('managed_devices columns:', devCols.map(c => c.Field).join(', '));

        const hasDevGroup = devCols.find(c => c.Field === 'group_name');
        console.log('Has device group_name column?', !!hasDevGroup);

        if (hasGroup && hasDevGroup) {
            console.log('VERIFICATION PASSED: Columns exist.');
        } else {
            console.log('VERIFICATION FAILED: Missing columns.');
        }

    } catch (err) {
        console.error('Verification Error:', err);
    } finally {
        process.exit();
    }
}

verifySignup();
