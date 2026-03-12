const db = require('./db');
const bcrypt = require('bcryptjs');

async function resetPassword() {
    const username = 'admin';
    const newPassword = 'admin1234';

    try {
        console.log(`Resetting password for user '${username}'...`);

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        const [result] = await db.execute(
            'UPDATE portal_admins SET password_hash = ? WHERE username = ?',
            [hashedPassword, username]
        );

        if (result.affectedRows > 0) {
            console.log('Password reset successfully.');
        } else {
            console.error('User not found or password not updated.');
        }
    } catch (err) {
        console.error('Error resetting password:', err);
    } finally {
        process.exit();
    }
}

resetPassword();
