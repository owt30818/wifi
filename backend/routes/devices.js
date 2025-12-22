const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/auth');

const normalizeMac = (input) => {
    const clean = input.replace(/[^a-fA-F0-9]/g, '').toUpperCase();
    if (clean.length !== 12) return null;
    return clean.match(/.{1,2}/g).join('-');
};

/**
 * GET /api/devices/ssids
 * Get list of known/used SSIDs for suggestions
 */
router.get('/ssids', verifyToken, async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT DISTINCT allowed_ssids FROM managed_devices WHERE allowed_ssids IS NOT NULL');
        // Parse and flatten
        const ssidSet = new Set();
        rows.forEach(row => {
            if (row.allowed_ssids) {
                row.allowed_ssids.split(',').forEach(s => ssidSet.add(s.trim()));
            }
        });
        res.json(Array.from(ssidSet).sort());
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch SSIDs' });
    }
});

/**
 * GET /api/devices
 * Fetch all managed devices with their current FreeRADIUS status
 */
router.get('/', verifyToken, async (req, res) => {
    try {
        // 1. Get all managed devices info from our metadata table
        const [devices] = await db.execute('SELECT * FROM managed_devices ORDER BY created_at DESC');

        // 2. For each device, check if it's currently allowed in radcheck
        // Ideally we could do a JOIN if schema was unified, but here we might check separately 
        // or just rely on the 'status' column in managed_devices IF we keep it in sync.
        // Let's assume managed_devices.status is the SOURCE OF TRUTH for the UI, 
        // and we ensure radcheck updates match it.

        res.json(devices);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch devices' });
    }
});

/**
 * POST /api/devices
 * Add a new device to control
 */
router.post('/', verifyToken, async (req, res) => {
    let { mac_address, alias, group_name, status, allowed_ssids } = req.body;
    if (!mac_address) return res.status(400).json({ error: 'MAC Address is required' });

    const normalizedMac = normalizeMac(mac_address);
    if (!normalizedMac) return res.status(400).json({ error: 'Invalid MAC Address format. Expected 12 hex characters.' });
    mac_address = normalizedMac;

    const deviceStatus = status || 'allowed';
    const ssids = allowed_ssids || null;
    const group = group_name || null;

    try {
        // 1. Insert into managed_devices
        await db.execute(
            'INSERT INTO managed_devices (mac_address, alias, group_name, status, allowed_ssids) VALUES (?, ?, ?, ?, ?)',
            [mac_address, alias || '', group, deviceStatus, ssids]
        );

        // ... existing syncToRadius logic ...
        const syncToRadius = async (mac, status, ssidList) => {
            await db.execute('DELETE FROM radcheck WHERE username = ?', [mac]);

            if (status === 'blocked') {
                await db.execute(
                    'INSERT INTO radcheck (username, attribute, op, value) VALUES (?, ?, ?, ?)',
                    [mac, 'Auth-Type', ':=', 'Reject']
                );
            } else {
                await db.execute(
                    'INSERT INTO radcheck (username, attribute, op, value) VALUES (?, ?, ?, ?)',
                    [mac, 'Cleartext-Password', ':=', mac]
                );

                if (ssidList && ssidList.trim().length > 0) {
                    const list = ssidList.split(',').map(s => s.trim()).filter(Boolean);
                    if (list.length > 0) {
                        const regex = `(:${list.join('|:')})$`;
                        await db.execute(
                            'INSERT INTO radcheck (username, attribute, op, value) VALUES (?, ?, ?, ?)',
                            [mac, 'Called-Station-Id', '=~', regex]
                        );
                    }
                }
            }
        };

        await syncToRadius(mac_address, deviceStatus, ssids);
        res.status(201).json({ message: 'Device added successfully' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Device already exists' });
        }
        console.error(err);
        res.status(500).json({ error: 'Failed to add device' });
    }
});

/**
 * PUT /api/devices/bulk/status
 * Bulk update device status
 */
router.put('/bulk/status', verifyToken, async (req, res) => {
    const { ids, status } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'No IDs provided' });
    }
    if (!['allowed', 'blocked'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    try {
        // 1. Get MACs for these IDs to update radcheck
        const placeholders = ids.map(() => '?').join(',');
        const [rows] = await db.execute(`SELECT mac_address, allowed_ssids FROM managed_devices WHERE id IN (${placeholders})`, ids);

        // 2. Update managed_devices
        await db.execute(`UPDATE managed_devices SET status = ? WHERE id IN (${placeholders})`, [status, ...ids]);

        // 3. Sync radcheck for each device
        const promises = rows.map(async (device) => {
            const { mac_address, allowed_ssids } = device;

            await db.execute('DELETE FROM radcheck WHERE username = ?', [mac_address]);

            if (status === 'blocked') {
                await db.execute(
                    'INSERT INTO radcheck (username, attribute, op, value) VALUES (?, ?, ?, ?)',
                    [mac_address, 'Auth-Type', ':=', 'Reject']
                );
            } else {
                await db.execute(
                    'INSERT INTO radcheck (username, attribute, op, value) VALUES (?, ?, ?, ?)',
                    [mac_address, 'Cleartext-Password', ':=', mac_address]
                );

                if (allowed_ssids && allowed_ssids.trim().length > 0) {
                    const list = allowed_ssids.split(',').map(s => s.trim()).filter(Boolean);
                    if (list.length > 0) {
                        const regex = `(:${list.join('|:')})$`;
                        await db.execute(
                            'INSERT INTO radcheck (username, attribute, op, value) VALUES (?, ?, ?, ?)',
                            [mac_address, 'Called-Station-Id', '=~', regex]
                        );
                    }
                }
            }
        });

        await Promise.all(promises);

        res.json({ message: `Updated ${ids.length} devices to ${status}` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Bulk update failed' });
    }
});

/**
 * PUT /api/devices/bulk/group
 * Bulk update device group
 */
router.put('/bulk/group', verifyToken, async (req, res) => {
    const { ids, group_name } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'No IDs provided' });
    }

    try {
        const placeholders = ids.map(() => '?').join(',');
        await db.execute(`UPDATE managed_devices SET group_name = ? WHERE id IN (${placeholders})`, [group_name || null, ...ids]);
        res.json({ message: `Updated group for ${ids.length} devices` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Bulk group update failed' });
    }
});

/**
 * PUT /api/devices/:id
 * Update device details (MAC/Alias/Group)
 */
router.put('/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    let { mac_address, alias, group_name, allowed_ssids } = req.body;

    try {
        // Get current device info
        const [rows] = await db.execute('SELECT * FROM managed_devices WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Device not found' });
        const currentDevice = rows[0];

        // Prepare updates
        let newMac = currentDevice.mac_address;
        if (mac_address) {
            const normalized = normalizeMac(mac_address);
            if (!normalized) return res.status(400).json({ error: 'Invalid MAC Address format' });
            newMac = normalized;
        }
        const newAlias = alias !== undefined ? alias : currentDevice.alias;
        const newGroup = group_name !== undefined ? group_name : currentDevice.group_name;
        const newSsids = allowed_ssids !== undefined ? allowed_ssids : currentDevice.allowed_ssids;

        // If MAC is changing, check for conflict
        if (newMac !== currentDevice.mac_address) {
            const [conflict] = await db.execute('SELECT id FROM managed_devices WHERE mac_address = ?', [newMac]);
            if (conflict.length > 0) return res.status(409).json({ error: 'MAC Address already in use' });
        }

        // Update managed_devices
        await db.execute(
            'UPDATE managed_devices SET mac_address = ?, alias = ?, group_name = ?, allowed_ssids = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?',
            [newMac, newAlias, newGroup, newSsids, id]
        );

        // Helper Sync Function
        const syncToRadius = async (mac, status, ssidList) => {
            await db.execute('DELETE FROM radcheck WHERE username = ?', [mac]);

            if (status === 'blocked') {
                await db.execute(
                    'INSERT INTO radcheck (username, attribute, op, value) VALUES (?, ?, ?, ?)',
                    [mac, 'Auth-Type', ':=', 'Reject']
                );
            } else {
                await db.execute(
                    'INSERT INTO radcheck (username, attribute, op, value) VALUES (?, ?, ?, ?)',
                    [mac, 'Cleartext-Password', ':=', mac]
                );

                if (ssidList && ssidList.trim().length > 0) {
                    const list = ssidList.split(',').map(s => s.trim()).filter(Boolean);
                    if (list.length > 0) {
                        const regex = `(:${list.join('|:')})$`;
                        await db.execute(
                            'INSERT INTO radcheck (username, attribute, op, value) VALUES (?, ?, ?, ?)',
                            [mac, 'Called-Station-Id', '=~', regex]
                        );
                    }
                }
            }
        };

        // Sync rules always (in case SSIDs changed)
        await syncToRadius(newMac, currentDevice.status, newSsids);

        res.json({ message: 'Device updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update device' });
    }
});

/**
 * PUT /api/devices/:id/status
 * Toggle Block/Allow status
 */
router.put('/:id/status', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // 'allowed' or 'blocked'

    try {
        // Get device MAC and allowed_ssids
        const [rows] = await db.execute('SELECT mac_address, allowed_ssids FROM managed_devices WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Device not found' });

        const { mac_address, allowed_ssids } = rows[0];

        // Update managed_devices
        await db.execute('UPDATE managed_devices SET status = ? WHERE id = ?', [status, id]);

        // Sync with radcheck (Direct Implementation or reuse helper if refactored)
        await db.execute('DELETE FROM radcheck WHERE username = ?', [mac_address]);

        if (status === 'blocked') {
            await db.execute(
                'INSERT INTO radcheck (username, attribute, op, value) VALUES (?, ?, ?, ?)',
                [mac_address, 'Auth-Type', ':=', 'Reject']
            );
        } else {
            await db.execute(
                'INSERT INTO radcheck (username, attribute, op, value) VALUES (?, ?, ?, ?)',
                [mac_address, 'Cleartext-Password', ':=', mac_address]
            );

            if (allowed_ssids && allowed_ssids.trim().length > 0) {
                const list = allowed_ssids.split(',').map(s => s.trim()).filter(Boolean);
                if (list.length > 0) {
                    const regex = `(:${list.join('|:')})$`;
                    await db.execute(
                        'INSERT INTO radcheck (username, attribute, op, value) VALUES (?, ?, ?, ?)',
                        [mac_address, 'Called-Station-Id', '=~', regex]
                    );
                }
            }
        }

        res.json({ message: `Device ${status}` });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'App Error' });
    }
});

/**
 * DELETE /api/devices/bulk
 * Delete multiple devices by ID
 */
router.delete('/bulk', verifyToken, async (req, res) => {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'No IDs provided' });
    }

    try {
        const placeholders = ids.map(() => '?').join(',');
        const [rows] = await db.execute(`SELECT mac_address FROM managed_devices WHERE id IN (${placeholders})`, ids);

        const macs = rows.map(r => r.mac_address);
        if (macs.length > 0) {
            const macPlaceholders = macs.map(() => '?').join(',');
            await db.execute(`DELETE FROM radcheck WHERE username IN (${macPlaceholders})`, macs);
            await db.execute(`DELETE FROM managed_devices WHERE id IN (${placeholders})`, ids);
        }

        res.json({ message: `Deleted ${ids.length} devices` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Bulk delete failed' });
    }
});

/**
 * DELETE /api/devices/:id
 * Remove device
 */
router.delete('/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.execute('SELECT mac_address FROM managed_devices WHERE id = ?', [id]);
        if (rows.length > 0) {
            const mac_address = rows[0].mac_address;
            // Remove from radcheck
            await db.execute('DELETE FROM radcheck WHERE username = ?', [mac_address]);
            // Remove from managed_devices
            await db.execute('DELETE FROM managed_devices WHERE id = ?', [id]);
        }
        res.json({ message: 'Device removed' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
});

/**
 * POST /api/devices/bulk
 * Bulk add devices
 */
router.post('/bulk', verifyToken, async (req, res) => {
    const { devices } = req.body; // Array of { mac_address, alias, group_name }
    if (!devices || !Array.isArray(devices)) {
        return res.status(400).json({ error: 'Invalid input format' });
    }

    const results = { success: 0, failed: 0, added: [], errors: [] };

    for (const device of devices) {
        const { mac_address, alias, group_name, allowed_ssids } = device;
        if (!mac_address) {
            results.failed++;
            results.errors.push(`Missing MAC address`);
            continue;
        }

        try {
            const normalizedMac = normalizeMac(mac_address);
            if (!normalizedMac) {
                results.failed++;
                results.errors.push(`${mac_address}: Invalid format`);
                continue;
            }

            const ssids = allowed_ssids || null;
            const group = group_name || null;

            await db.execute(
                'INSERT INTO managed_devices (mac_address, alias, group_name, status, allowed_ssids) VALUES (?, ?, ?, ?, ?)',
                [normalizedMac, alias || '', group, 'allowed', ssids]
            );

            // 2. Sync with radcheck
            await db.execute('DELETE FROM radcheck WHERE username = ?', [normalizedMac]);
            await db.execute(
                'INSERT INTO radcheck (username, attribute, op, value) VALUES (?, ?, ?, ?)',
                [normalizedMac, 'Cleartext-Password', ':=', normalizedMac]
            );

            if (ssids && ssids.trim().length > 0) {
                const list = ssids.split(',').map(s => s.trim()).filter(Boolean);
                if (list.length > 0) {
                    const regex = `(:${list.join('|:')})$`;
                    await db.execute(
                        'INSERT INTO radcheck (username, attribute, op, value) VALUES (?, ?, ?, ?)',
                        [mac, 'Called-Station-Id', '=~', regex]
                    );
                }
            }

            results.success++;
            results.added.push({ mac: normalizedMac, alias: alias || '' });
        } catch (err) {
            results.failed++;
            if (err.code === 'ER_DUP_ENTRY') {
                results.errors.push(`${mac_address}: Already exists`);
            } else {
                results.errors.push(`${mac_address}: Database error`);
            }
        }
    }

    res.json({ message: 'Bulk processing completed', results });
});

module.exports = router;
