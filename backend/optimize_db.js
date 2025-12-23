const db = require('./db');

async function optimize() {
    console.log('Starting Database Optimization...');
    try {
        // 1. Add indexes to radacct
        console.log('Adding indexes to radacct table...');
        await db.execute('CREATE INDEX IF NOT EXISTS idx_acctstoptime ON radacct(acctstoptime)');
        await db.execute('CREATE INDEX IF NOT EXISTS idx_username ON radacct(username)');
        await db.execute('CREATE INDEX IF NOT EXISTS idx_calledstationid ON radacct(calledstationid)');
        await db.execute('CREATE INDEX IF NOT EXISTS idx_callingstationid ON radacct(callingstationid)');

        // 2. Add indexes to managed_devices
        console.log('Adding indexes to managed_devices table...');
        await db.execute('CREATE INDEX IF NOT EXISTS idx_status ON managed_devices(status)');

        console.log('Database Optimization Completed Successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Optimization Failed:', err.message);
        process.exit(1);
    }
}

optimize();
