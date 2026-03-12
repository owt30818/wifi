const db = require('./db');

async function grantSuperAdmin() {
    try {
        console.log("Updating 'admin' user to 'super_admin'...");
        const [result] = await db.execute(
            "UPDATE portal_admins SET role = 'super_admin' WHERE username = 'admin'"
        );
        console.log(`Matched rows: ${result.affectedRows}`);
        if (result.affectedRows > 0) {
            console.log("Successfully updated 'admin' to 'super_admin'.");
        } else {
            console.log("User 'admin' not found or already has the role.");
            // Optional: Create if not exists? Use requested update only.
            // If they don't exist, we might want to tell the user.
            const [rows] = await db.execute("SELECT * FROM portal_admins WHERE username = 'admin'");
            if (rows.length === 0) {
                console.log("!! WARNING: User 'admin' does not exist in portal_admins table.");
            }
        }
    } catch (err) {
        console.error("Error updating role:", err);
    } finally {
        process.exit();
    }
}

grantSuperAdmin();
