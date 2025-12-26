const db = require('./db');

async function cleanup() {
    const retentionDays = 7;
    console.log(`Starting Database Cleanup (Retention: ${retentionDays} days)...`);

    try {
        // Calculate the threshold date
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() - retentionDays);

        // Format date for MySQL: YYYY-MM-DD HH:mm:ss
        const formattedDate = thresholdDate.toISOString().slice(0, 19).replace('T', ' ');

        console.log(`Deleting records older than: ${formattedDate}`);

        // 1. Delete from radacct
        const [result] = await db.execute(
            'DELETE FROM radacct WHERE acctstarttime < ?',
            [formattedDate]
        );

        console.log(`Cleanup completed successfully. Records deleted: ${result.affectedRows}`);
        process.exit(0);
    } catch (err) {
        console.error('Cleanup failed:', err.message);
        process.exit(1);
    }
}

cleanup();
