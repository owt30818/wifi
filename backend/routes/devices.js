const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken, isAdmin } = require('../middleware/auth');

const checkAccess = (user, device) => {
    if (user.role === 'super_admin' || user.role === 'admin') return true;
    if (user.role !== 'sub_admin') return false;

    // Check Group
    const groups = user.allowed_groups ? user.allowed_groups.split(',').map(s => s.trim()) : [];
    if (device.group_name && groups.includes(device.group_name)) return true;

    // Check SSID
    const allowedSsids = user.allowed_ssids ? user.allowed_ssids.split(',').map(s => s.trim()) : [];
    if (device.allowed_ssids) {
        const deviceSsids = device.allowed_ssids.split(',').map(s => s.trim());
        // Verify overlap
        const hasOverlap = deviceSsids.some(ssid => allowedSsids.includes(ssid));
        if (hasOverlap) return true;
    }

    return false;
};

const normalizeMac = (input) => {
    const clean = input.replace(/[^a-fA-F0-9]/g, '').toUpperCase();
    if (clean.length !== 12) return null;
    return clean.match(/.{1,2}/g).join('-');
};

/**
 * GET /api/devices/ssids
 * Get list of known/used SSIDs for suggestions
 */
router.get('/ssids', verifyToken, isAdmin, async (req, res) => {
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
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 30;
        const offset = (page - 1) * limit;
        const getAll = req.query.all === 'true';
        const search = req.query.search || '';
        const searchType = req.query.searchType || 'all';
        const sortKey = req.query.sortKey || 'created_at';
        const sortDir = req.query.sortDir || 'DESC';

        // Whitelist sort keys to prevent SQL injection
        const allowedSortKeys = ['mac_address', 'alias', 'group_name', 'status', 'created_at'];
        const finalSortKey = allowedSortKeys.includes(sortKey) ? sortKey : 'created_at';
        const finalSortDir = sortDir.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        let whereConditions = [];
        let params = [];

        // Role-based filtering
        if (req.user.role === 'user') {
            whereConditions.push('user_id = ?');
            params.push(req.user.id);
        } else if (req.user.role === 'sub_admin') {
            // Sub-admin Access Scope: Allowed Groups OR Allowed SSIDs
            // If both are empty, they see nothing (or maybe everything? No, restrict by default)
            const groups = req.user.allowed_groups ? req.user.allowed_groups.split(',').map(s => s.trim()).filter(Boolean) : [];
            const ssids = req.user.allowed_ssids ? req.user.allowed_ssids.split(',').map(s => s.trim()).filter(Boolean) : [];

            if (groups.length === 0 && ssids.length === 0) {
                // No permissions, return empty result
                whereConditions.push('1 = 0');
            } else {
                const orConditions = [];
                if (groups.length > 0) {
                    orConditions.push(`group_name IN (${groups.map(() => '?').join(',')})`);
                    params.push(...groups);
                }
                if (ssids.length > 0) {
                    // Check if any of the device's SSIDs overlap with allowed SSIDs
                    // Device allowed_ssids is comma separated string.
                    // This is hard to check with simple IN.
                    // Simplified Logic: If device has specfic SSID assigned, check it.
                    // If device has NULL (all SSIDs), sub-admin can only see it if they are allowed ALL (which isn't possible here)
                    // Alternative: Check if device's allowed_ssids string contains any of the allowed SSIDs?
                    // Let's stick to simple text match for now or REGEX? 
                    // Better: If sub-admin manages SSID "A", they see devices that are RESTRICTED to "A".
                    // Devices with NULL (Open) might be considered "Global" and hidden?
                    // Let's assume Sub-Admin manages devices explicitly assigned to these SSIDs.

                    // Complex SSID matching: Device 'A,B' vs User 'B'. Overlap exists.
                    // Using REGEX for each allowed SSID might be heavy but accurate.
                    // OR condition: allowed_ssids LIKE '%SSID%'
                    const ssidLikes = ssids.map(() => 'allowed_ssids LIKE ?').join(' OR ');
                    orConditions.push(`(${ssidLikes})`);
                    params.push(...ssids.map(s => `%${s}%`));
                }
                whereConditions.push(`(${orConditions.join(' OR ')})`);
            }
        }

        if (search) {
            const term = `%${search}%`;
            if (searchType === 'mac') {
                whereConditions.push('md.mac_address LIKE ?');
                params.push(term);
            } else if (searchType === 'alias') {
                whereConditions.push('md.alias LIKE ?');
                params.push(term);
            } else if (searchType === 'group') {
                whereConditions.push('md.group_name LIKE ?');
                params.push(term);
            } else {
                whereConditions.push('(md.mac_address LIKE ? OR md.alias LIKE ? OR md.group_name LIKE ?)');
                params.push(term, term, term);
            }
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // 1. Get Total Count
        const countQuery = `SELECT COUNT(*) as total FROM managed_devices md ${whereClause}`;
        const [[{ total }]] = await db.execute(countQuery, params);

        // 2. Get Paginated Data with owner info
        const dataQuery = `
            SELECT 
                md.*,
                pu.real_name AS owner_name,
                pu.grade AS owner_grade,
                pu.class AS owner_class,
                pu.number AS owner_number
            FROM managed_devices md
            LEFT JOIN portal_users pu ON md.user_id = pu.id
            ${whereClause} 
            ORDER BY md.${finalSortKey} ${finalSortDir} 
            ${getAll ? '' : 'LIMIT ? OFFSET ?'}
        `;

        const queryParams = getAll ? params : [...params, limit, offset];
        const [devices] = await db.execute(dataQuery, queryParams);

        res.json({
            data: devices,
            pagination: {
                total,
                page,
                limit: getAll ? total : limit,
                totalPages: getAll ? 1 : Math.ceil(total / limit)
            }
        });
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

    let deviceStatus = status || 'allowed';
    let ssids = allowed_ssids || null;
    let group = group_name || null;
    let userId = null;

    try {
        // Role-based logic
        if (req.user.role === 'user') {
            // Check if user already has a device
            const [existing] = await db.execute('SELECT id FROM managed_devices WHERE user_id = ?', [req.user.id]);
            if (existing.length > 0) {
                return res.status(403).json({ error: '이미 등록된 기기가 있습니다. 변경이 필요하시면 관리자에게 문의하세요.' });
            }

            userId = req.user.id;
            deviceStatus = 'allowed'; // Users can only add 'allowed' devices

            // Enforce SSID and Group from user profile
            const [userRows] = await db.execute('SELECT allowed_ssids, group_name FROM portal_users WHERE id = ?', [userId]);
            if (userRows.length > 0) {
                if (userRows[0].allowed_ssids) ssids = userRows[0].allowed_ssids;
                if (userRows[0].group_name) group = userRows[0].group_name;
            }
        } else if (req.user.role === 'sub_admin') {
            // Check if the NEW device parameters are within scope
            const tempDevice = { group_name: group, allowed_ssids: ssids };
            if (!checkAccess(req.user, tempDevice)) {
                return res.status(403).json({ error: 'Access denied. You can only add devices to your allowed Groups or SSIDs.' });
            }
        }

        // 1. Insert into managed_devices
        await db.execute(
            'INSERT INTO managed_devices (mac_address, alias, group_name, status, allowed_ssids, user_id) VALUES (?, ?, ?, ?, ?, ?)',
            [mac_address, alias || '', group, deviceStatus, ssids, userId]
        );

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
router.put('/bulk/status', verifyToken, isAdmin, async (req, res) => {
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
router.put('/bulk/group', verifyToken, isAdmin, async (req, res) => {
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
router.put('/:id', verifyToken, isAdmin, async (req, res) => {
    const { id } = req.params;
    let { mac_address, alias, group_name, allowed_ssids } = req.body;

    try {
        // Get current device info
        const [rows] = await db.execute('SELECT * FROM managed_devices WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Device not found' });
        const currentDevice = rows[0];

        // Check ownership if user
        if (req.user.role === 'user' && currentDevice.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Check Sub-Admin Access
        if (req.user.role === 'sub_admin' && !checkAccess(req.user, currentDevice)) {
            return res.status(403).json({ error: 'Access denied. Outside of managed scope.' });
        }

        // Prepare updates
        let newMac = currentDevice.mac_address;
        if (mac_address) {
            // Requirement: User cannot change their registered MAC
            if (req.user.role === 'user' && mac_address !== currentDevice.mac_address) {
                return res.status(403).json({ error: 'You cannot change your registered MAC address' });
            }
            const normalized = normalizeMac(mac_address);
            if (!normalized) return res.status(400).json({ error: 'Invalid MAC Address format' });
            newMac = normalized;
        }

        const newAlias = alias !== undefined ? alias : currentDevice.alias;
        const newGroup = group_name !== undefined ? group_name : currentDevice.group_name;

        // Enforce user SSID if user
        let newSsids = allowed_ssids !== undefined ? allowed_ssids : currentDevice.allowed_ssids;
        if (req.user.role === 'user') {
            const [userRows] = await db.execute('SELECT allowed_ssids FROM portal_users WHERE id = ?', [req.user.id]);
            if (userRows.length > 0 && userRows[0].allowed_ssids) {
                newSsids = userRows[0].allowed_ssids;
            }
        }

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
router.put('/:id/status', verifyToken, isAdmin, async (req, res) => {
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
router.delete('/bulk', verifyToken, isAdmin, async (req, res) => {
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
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.execute('SELECT mac_address, user_id FROM managed_devices WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Device not found' });

        const device = rows[0];

        // Requirement: User cannot delete their own MAC. Only Admin can.
        if (req.user.role === 'user') {
            if (device.user_id !== null) {
                return res.status(403).json({ error: 'Only administrators can delete user-registered MAC addresses' });
            }
            // If it's not their device, they shouldn't even see it, but we add safety
            if (device.user_id !== req.user.id) {
                return res.status(403).json({ error: 'Access denied' });
            }
        }

        // Check Sub-Admin Access
        if (req.user.role === 'sub_admin' && !checkAccess(req.user, device)) {
            return res.status(403).json({ error: 'Access denied. Outside of managed scope.' });
        }

        const mac_address = device.mac_address;
        // Remove from radcheck
        await db.execute('DELETE FROM radcheck WHERE username = ?', [mac_address]);
        // Remove from managed_devices
        await db.execute('DELETE FROM managed_devices WHERE id = ?', [id]);

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
router.post('/bulk', verifyToken, isAdmin, async (req, res) => {
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
