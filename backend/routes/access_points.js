const express = require('express');
const router = express.Router();
const db = require('../db');

// Middleware
const verifyToken = require('../middleware/auth');

/**
 * GET /api/acess-points
 * List all APs with active client counts from radacct
 * Auto-registers unknown APs to database
 */
router.get('/', verifyToken, async (req, res) => {
    try {
        // 1. Get all known APs
        const [registeredAps] = await db.execute('SELECT * FROM access_points ORDER BY name');

        // 2. Get unique AP MACs from ALL accounting records
        // This ensures APs are registered even if no one is currently connected
        const [allSessions] = await db.execute(`
            SELECT calledstationid, 
                   MAX(CASE WHEN acctstoptime IS NULL THEN 1 ELSE 0 END) as is_active,
                   COUNT(CASE WHEN acctstoptime IS NULL THEN 1 END) as active_count
            FROM radacct 
            GROUP BY calledstationid
        `);

        // 3. Merge data
        // Normalize MAC helper
        const normalize = (mac) => mac ? mac.replace(/[^a-fA-F0-9]/g, '').toUpperCase() : '';

        const statsMap = {};
        allSessions.forEach(row => {
            const rawMac = row.calledstationid.split(':')[0];
            const mac = normalize(rawMac);
            if (mac) {
                // If multiple SSIDs are used on the same AP, we aggregate the count
                if (!statsMap[mac]) {
                    statsMap[mac] = { active_clients: 0 };
                }
                statsMap[mac].active_clients += row.active_count || 0;
            }
        });

        const results = registeredAps.map(ap => ({
            ...ap,
            active_clients: statsMap[normalize(ap.mac_address)]?.active_clients || 0
        }));

        // 4. Auto-register unknown APs (checking both historical and active)
        const registeredMacs = new Set(registeredAps.map(ap => normalize(ap.mac_address)));

        for (const [mac, stats] of Object.entries(statsMap)) {
            if (!registeredMacs.has(mac)) {
                // Format MAC to AA-BB-CC-DD-EE-FF
                const formattedMac = mac.match(/.{1,2}/g).join('-');

                try {
                    // Insert new AP with "Unknown AP" name
                    const [insertResult] = await db.execute(
                        'INSERT INTO access_points (mac_address, name, location) VALUES (?, ?, ?)',
                        [formattedMac, 'Unknown AP', '']
                    );

                    // Add to results with the new ID
                    results.push({
                        id: insertResult.insertId,
                        name: 'Unknown AP',
                        mac_address: formattedMac,
                        location: '',
                        active_clients: stats.active_clients
                    });
                } catch (insertErr) {
                    if (insertErr.code !== 'ER_DUP_ENTRY') {
                        console.error('Failed to auto-register AP:', insertErr);
                    }
                }
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
