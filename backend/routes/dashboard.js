const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/auth');

// Simple In-memory Cache for Stats
const statsCache = {
    data: null,
    lastUpdate: 0,
    ttl: 30 * 1000 // 30 seconds
};

router.get('/stats', verifyToken, async (req, res) => {
    try {
        const now = Date.now();
        if (statsCache.data && (now - statsCache.lastUpdate < statsCache.ttl)) {
            return res.json(statsCache.data);
        }

        // Parallel Execution of Count Queries
        const [
            [totalDevs],
            [blockedDevs],
            [onlineUsersRows],
            [activeSessions],
            [aps]
        ] = await Promise.all([
            db.execute('SELECT COUNT(*) as count FROM managed_devices'),
            db.execute("SELECT COUNT(*) as count FROM managed_devices WHERE status='blocked'"),
            db.execute('SELECT COUNT(*) as count FROM radacct WHERE acctstoptime IS NULL'),
            db.execute('SELECT calledstationid FROM radacct WHERE acctstoptime IS NULL'),
            db.execute('SELECT mac_address, name FROM access_points')
        ]);

        const total = totalDevs[0].count;
        const blocked = blockedDevs[0].count;
        const online = onlineUsersRows.length > 0 ? onlineUsersRows[0].count : 0;

        // AP Distribution aggregation in JS
        const apMap = new Map();
        aps.forEach(ap => {
            apMap.set(ap.mac_address.replace(/-/g, '').toUpperCase(), ap.name);
        });

        const dist = {};
        activeSessions.forEach(session => {
            const raw = session.calledstationid.split(':')[0];
            const cleanMac = raw.replace(/[^a-fA-F0-9]/g, '').toUpperCase();
            const name = apMap.get(cleanMac) || 'Unknown AP';
            dist[name] = (dist[name] || 0) + 1;
        });

        const distribution = Object.entries(dist)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);

        const responseData = {
            total_devices: total,
            blocked_devices: blocked,
            online_users: online,
            ap_distribution: distribution
        };

        // Update Cache
        statsCache.data = responseData;
        statsCache.lastUpdate = now;

        res.json(responseData);
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

/**
 * GET /api/dashboard/online-users
 * Fetch detailed active session information
 */
router.get('/online-users', verifyToken, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 30;
        const offset = (page - 1) * limit;

        // 1. Get Total Count
        const [[{ total }]] = await db.execute('SELECT COUNT(*) as total FROM radacct WHERE acctstoptime IS NULL');

        // 2. Get Paginated Data
        const query = `
            SELECT 
                r.username,
                r.callingstationid as mac_address,
                r.calledstationid as ap_ssid,
                r.nasipaddress,
                r.framedipaddress as ip_address,
                r.acctstarttime as start_time,
                ap.name as ap_name,
                SUBSTRING_INDEX(r.calledstationid, ':', -1) as ssid,
                d.alias,
                d.group_name,
                d.status
            FROM radacct r
            LEFT JOIN access_points ap ON SUBSTRING_INDEX(r.calledstationid, ':', 1) = ap.mac_address
            LEFT JOIN managed_devices d ON r.callingstationid = d.mac_address
            WHERE r.acctstoptime IS NULL
            ORDER BY r.acctstarttime DESC
            LIMIT ? OFFSET ?
        `;

        const [rows] = await db.execute(query, [limit, offset]);
        res.json({
            data: rows,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch online users' });
    }
});

module.exports = router;
