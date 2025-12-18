const express = require('express');
const router = express.Router();
const db = require('../db');

// Middleware
const verifyToken = (req, res, next) => next();

/**
 * GET /api/acess-points
 * List all APs with active client counts from radacct
 */
router.get('/', verifyToken, async (req, res) => {
    try {
        // 1. Get all known APs
        const [registeredAps] = await db.execute('SELECT * FROM access_points ORDER BY name');

        // 2. Get active sessions from radacct (where stoptime is NULL)
        // Group by calledstationid (which usually contains AP MAC)
        const [activeSessions] = await db.execute(`
            SELECT calledstationid, COUNT(*) as count 
            FROM radacct 
            WHERE acctstoptime IS NULL 
            GROUP BY calledstationid
        `);

        // 3. Merge data
        // Normalize MAC helper
        const normalize = (mac) => mac ? mac.replace(/[^a-fA-F0-9]/g, '').toUpperCase() : '';

        const statsMap = {};
        activeSessions.forEach(row => {
            // CalledStationId format is often "MAC:SSID" or just "MAC"
            // We'll extract the MAC part.
            // Example: "00-11-22-33-44-55:MySSID"
            const rawMac = row.calledstationid.split(':')[0];
            const mac = normalize(rawMac);
            if (mac) {
                statsMap[mac] = row.count;
            }
        });

        const results = registeredAps.map(ap => ({
            ...ap,
            active_clients: statsMap[normalize(ap.mac_address)] || 0
        }));

        // Optional: Include "Unknown/Unregistered" APs
        const registeredMacs = new Set(registeredAps.map(ap => normalize(ap.mac_address)));

        for (const [mac, count] of Object.entries(statsMap)) {
            if (!registeredMacs.has(mac)) {
                // Add as unknown
                results.push({
                    id: null,
                    name: 'Unknown AP',
                    mac_address: mac.replace(/(.{2})/g, "$1-").slice(0, -1), // Format back to pretty
                    location: 'Unregistered',
                    active_clients: count
                });
            }
        }

        res.json(results);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch APs' });
    }
});

/**
 * POST /api/access-points
 * Register a new AP
 */
router.post('/', verifyToken, async (req, res) => {
    let { mac_address, name, location } = req.body;
    if (!mac_address || !name) return res.status(400).json({ error: 'MAC and Name are required' });

    // Normalize MAC
    const cleanMac = mac_address.replace(/[^a-fA-F0-9]/g, '').toUpperCase();
    if (cleanMac.length !== 12) return res.status(400).json({ error: 'Invalid MAC format' });
    const formattedMac = cleanMac.match(/.{1,2}/g).join('-');

    try {
        await db.execute(
            'INSERT INTO access_points (mac_address, name, location) VALUES (?, ?, ?)',
            [formattedMac, name, location || '']
        );
        res.status(201).json({ message: 'AP registered' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'AP MAC already exists' });
        res.status(500).json({ error: 'Server Error' });
    }
});

/**
 * PUT /api/access-points/:id
 * Update AP details
 */
router.put('/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { name, location } = req.body;

    try {
        await db.execute(
            'UPDATE access_points SET name = ?, location = ? WHERE id = ?',
            [name, location, id]
        );
        res.json({ message: 'AP updated' });
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

/**
 * DELETE /api/access-points/:id
 * Delete AP
 */
router.delete('/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    try {
        await db.execute('DELETE FROM access_points WHERE id = ?', [id]);
        res.json({ message: 'AP deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

module.exports = router;
