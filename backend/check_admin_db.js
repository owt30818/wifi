const db = require('./db');

async function checkAdmin() {
    try {
        console.log("Checking 'admin' in portal_admins...");
        const [admins] = await db.execute("SELECT username, role, allowed_groups, allowed_ssids FROM portal_admins WHERE username='admin'");
        console.log("Admins found:", admins);

        console.log("Checking 'admin' in portal_users...");
        const [users] = await db.execute("SELECT id, username FROM portal_users WHERE username='admin'");
        console.log("Users found:", users);
    } catch (err) {
        console.error("Error:", err);
    } finally {
        process.exit();
    }
}

checkAdmin();
