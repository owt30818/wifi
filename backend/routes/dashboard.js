const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/auth');

router.get('/stats', verifyToken, async (req, res) => {
    try {
        // 1. Count Total Managed Devices
        const [totalDevs] = await db.execute('SELECT COUNT(*) as count FROM managed_devices');
        const total = totalDevs[0].count;

        // 2. Count Blocked Devices
        const [blockedDevs] = await db.execute("SELECT COUNT(*) as count FROM managed_devices WHERE status='blocked'");
        const blocked = blockedDevs[0].count;

        // 3. Count Active Sessions (Online Users) from radacct
        const [onlineUsers] = await db.execute('SELECT COUNT(*) as count FROM radacct WHERE acctstoptime IS NULL');
        const online = onlineUsers.length > 0 ? onlineUsers[0].count : 0; // Fix: onlineUsers could be inconsistent depending on driver version

        // 4. AP Distribution (Group by Name)
        // Join radacct with access_points on MAC address.
        // - Extract MAC from calledstationid (format: "MAC:SSID" or "MAC")
        // - Normalize MAC to match access_points format (e.g. AA-BB-...)

        // Since we can't easily join on complex string manipulation in standard SQL without stored functions,
        // we'll fetch active sessions and access_points, then aggregate in JS. 
        // This is acceptable for small/medium scale (< few thousand APs).

        const [activeSessions] = await db.execute('SELECT calledstationid FROM radacct WHERE acctstoptime IS NULL');
        const [aps] = await db.execute('SELECT mac_address, name FROM access_points');

        const apMap = new Map(); // MAC -> Name
        aps.forEach(ap => {
            // Normalize DB MAC just in case: AABB.. -> AA-BB..
            // But we assume stored format is AA-BB-..
            apMap.set(ap.mac_address.replace(/-/g, '').toUpperCase(), ap.name);
        });

        const dist = {}; // Name -> Count

        activeSessions.forEach(session => {
            const raw = session.calledstationid.split(':')[0]; // Get MAC part
            const cleanMac = raw.replace(/[^a-fA-F0-9]/g, '').toUpperCase();

            const name = apMap.get(cleanMac) || 'Unknown AP';
            dist[name] = (dist[name] || 0) + 1;
        });

        // Convert to array for Chart.js
        const distribution = Object.entries(dist)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count); // Sort by count desc

        res.json({
            total_devices: total,
            blocked_devices: blocked,
            online_users: online,
            ap_distribution: distribution
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Stats error' });
    }
});

// Service Status Check
router.get('/status', verifyToken, async (req, res) => {
    const { exec } = require('child_process');

    exec('systemctl is-active freeradius', (error, stdout) => {
        const freeradiusStatus = stdout.trim() || 'unknown';
        res.json({
            freeradius: freeradiusStatus,
            timestamp: new Date().toISOString()
        });
    });
});

module.exports = router;
