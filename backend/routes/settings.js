const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

/**
 * GET /api/settings/groups
 * Get distinct group names from managed_devices
 */
router.get('/groups', verifyToken, async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT DISTINCT group_name FROM managed_devices 
            WHERE group_name IS NOT NULL AND group_name != ''
            ORDER BY group_name
        `);
        res.json(rows.map(r => r.group_name));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch groups' });
    }
});

/**
 * GET /api/settings/ssids
 * Get distinct SSIDs from radacct (calledstationid contains MAC:SSID)
 */
router.get('/ssids', verifyToken, async (req, res) => {
    try {
        // Extract SSID from calledstationid format: "MAC:SSID"
        const [rows] = await db.execute(`
            SELECT DISTINCT 
                SUBSTRING_INDEX(calledstationid, ':', -1) as ssid
            FROM radacct 
            WHERE calledstationid LIKE '%:%'
            ORDER BY ssid
        `);
        const ssids = rows.map(r => r.ssid).filter(s => s && s.length > 0);
        res.json(ssids);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch SSIDs' });
    }
});

module.exports = router;
