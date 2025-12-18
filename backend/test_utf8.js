const db = require('./db');

async function testInsert() {
    const mac = 'AA-AA-AA-AA-AA-AA'; // Dummy MAC
    const name = '2기숙사'; // Korean Name

    try {
        console.log("Attempting to insert AP with Korean name...");
        await db.execute('DELETE FROM access_points WHERE mac_address = ?', [mac]);

        await db.execute(
            'INSERT INTO access_points (mac_address, name, location) VALUES (?, ?, ?)',
            [mac, name, 'Test Location']
        );
        console.log("Success! AP registered.");

        const [rows] = await db.execute('SELECT * FROM access_points WHERE mac_address = ?', [mac]);
        console.log("Retrieved:", rows[0]);

        // Clean up
        await db.execute('DELETE FROM access_points WHERE mac_address = ?', [mac]);
        process.exit(0);
    } catch (err) {
        console.error("FAIL:", err);
        process.exit(1);
    }
}

testInsert();
