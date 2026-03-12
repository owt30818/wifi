const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');

// Middleware
const { verifyToken, isAdmin, isSuperAdmin } = require('../middleware/auth');

/**
 * GET /api/users
 * List all admin users
 */
router.get('/', verifyToken, isSuperAdmin, async (req, res) => {
    try {
        const [users] = await db.execute('SELECT id, username, role, allowed_groups, allowed_ssids, created_at FROM portal_admins');
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

/**
 * POST /api/users
 * Create new admin user
 */
router.post('/', verifyToken, isSuperAdmin, async (req, res) => {
    const { username, password, role, allowed_groups, allowed_ssids } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    try {
        const hash = await bcrypt.hash(password, 10);
        await db.execute(
            'INSERT INTO portal_admins (username, password_hash, role, allowed_groups, allowed_ssids) VALUES (?, ?, ?, ?, ?)',
            [username, hash, role || 'super_admin', allowed_groups || null, allowed_ssids || null]
        );
        res.status(201).json({ message: 'User created' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Username already exists' });
        res.status(500).json({ error: 'Failed to create user' });
    }
});

/**
 * DELETE /api/users/:id
 * Delete admin user
 */
router.delete('/:id', verifyToken, isSuperAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        await db.execute('DELETE FROM portal_admins WHERE id = ?', [id]);
        res.json({ message: 'User deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

/**
 * PUT /api/users/:id/password
 * Update user password
 */
router.put('/:id/password', verifyToken, isSuperAdmin, async (req, res) => {
    const { id } = req.params;
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password required' });

    try {
        const hash = await bcrypt.hash(password, 10);
        await db.execute('UPDATE portal_admins SET password_hash = ? WHERE id = ?', [hash, id]);
        res.json({ message: 'Password updated' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update password' });
    }
});

// --- Portal Users Management (Regular Users) ---

/**
 * GET /api/users/portal
 * List all regular portal users
 */
router.get('/portal', verifyToken, isAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 30;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';
        const sortKey = req.query.sortKey || 'created_at';
        const sortDir = req.query.sortDir || 'DESC';

        const allowedSortKeys = ['username', 'real_name', 'grade', 'class', 'number', 'created_at', 'group_name'];
        const finalSortKey = allowedSortKeys.includes(sortKey) ? sortKey : 'created_at';
        const finalSortDir = sortDir.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        let whereConditions = [];
        let params = [];

        // Search logic
        if (search) {
            whereConditions.push('(username LIKE ? OR real_name LIKE ? OR group_name LIKE ?)');
            const searchParam = `%${search}%`;
            params.push(searchParam, searchParam, searchParam);
        }

        // Sub-admin filtering
        if (req.user.role === 'sub_admin') {
            const groups = req.user.allowed_groups ? req.user.allowed_groups.split(',').map(s => s.trim()).filter(Boolean) : [];
            // Sub-admins only see users in their allowed groups
            if (groups.length === 0) {
                whereConditions.push('1 = 0');
            } else {
                whereConditions.push(`group_name IN (${groups.map(() => '?').join(',')})`);
                params.push(...groups);
            }
        }

        const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

        // Count total
        const [countRows] = await db.execute(`SELECT COUNT(*) as total FROM portal_users ${whereClause}`, params);
        const total = countRows[0].total;

        // Fetch data
        const query = `
            SELECT id, username, grade, class, number, real_name, group_name, allowed_ssids, created_at 
            FROM portal_users 
            ${whereClause} 
            ORDER BY ${finalSortKey} ${finalSortDir} 
            LIMIT ? OFFSET ?
        `;
        // db.execute doesn't support array spread for limit/offset well in some drivers, 
        // but mysql2 usually handles it if they are part of params. 
        // We append limit/offset to params.
        params.push(String(limit), String(offset));

        const [users] = await db.execute(query, params);

        res.json({
            data: users,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch portal users' });
    }
});

/**
 * PUT /api/users/portal/:id/ssids
 * Update allowed SSIDs for a portal user
 */
router.put('/portal/:id/ssids', verifyToken, isAdmin, async (req, res) => {
    const { id } = req.params;
    const { allowed_ssids } = req.body;

    // Sub-Admin Check
    if (req.user.role === 'sub_admin') {
        const adminSsids = req.user.allowed_ssids ? req.user.allowed_ssids.split(',').map(s => s.trim()) : [];
        // Check if Admin has access to THIS user
        // We need to fetch user first
        const [targetUser] = await db.execute('SELECT allowed_ssids FROM portal_users WHERE id = ?', [id]);
        if (targetUser.length === 0) return res.status(404).json({ error: 'User not found' });

        const u = targetUser[0];
        let hasAccess = false;
        if (!u.allowed_ssids) {
            hasAccess = true;
        } else {
            const userSsids = u.allowed_ssids.split(',').map(s => s.trim());
            hasAccess = userSsids.some(s => adminSsids.includes(s));
        }

        if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

        // Also verify the NEW allowed_ssids are within Admin's scope?
        // If Admin assigns "Guest" (which they don't own), should we block?
        // Ideally yes. Assuming Admin can only assign SSIDs they own.
        const newSsids = allowed_ssids ? allowed_ssids.split(',').map(s => s.trim()) : [];
        const allNewAllowed = newSsids.every(s => adminSsids.includes(s));
        if (!allNewAllowed) return res.status(403).json({ error: 'You can only assign SSIDs you manage' });
    }

    try {
        await db.execute('UPDATE portal_users SET allowed_ssids = ? WHERE id = ?', [allowed_ssids || null, id]);

        // Sync these SSIDs to all devices owned by this user
        const [devices] = await db.execute('SELECT mac_address, status FROM managed_devices WHERE user_id = ?', [id]);

        const syncToRadius = async (mac, status, ssidList) => {
            await db.execute('DELETE FROM radcheck WHERE username = ?', [mac]);
            if (status === 'blocked') {
                await db.execute('INSERT INTO radcheck (username, attribute, op, value) VALUES (?, ?, ?, ?)', [mac, 'Auth-Type', ':=', 'Reject']);
            } else {
                await db.execute('INSERT INTO radcheck (username, attribute, op, value) VALUES (?, ?, ?, ?)', [mac, 'Cleartext-Password', ':=', mac]);
                if (ssidList && ssidList.trim().length > 0) {
                    const list = ssidList.split(',').map(s => s.trim()).filter(Boolean);
                    if (list.length > 0) {
                        const regex = `(:${list.join('|:')})$`;
                        await db.execute('INSERT INTO radcheck (username, attribute, op, value) VALUES (?, ?, ?, ?)', [mac, 'Called-Station-Id', '=~', regex]);
                    }
                }
            }
        };

        for (const device of devices) {
            await syncToRadius(device.mac_address, device.status, allowed_ssids);
        }

        res.json({ message: 'User SSIDs updated and synced' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update SSIDs' });
    }
});

/**
 * DELETE /api/users/portal/:id
 * Delete portal user
 */
/**
 * DELETE /api/users/portal/:id
 * Delete portal user and their devices
 */
router.delete('/portal/:id', verifyToken, isAdmin, async (req, res) => {
    const { id } = req.params;
    const { delete_devices } = req.query;

    if (req.user.role === 'sub_admin') {
        const adminSsids = req.user.allowed_ssids ? req.user.allowed_ssids.split(',').map(s => s.trim()) : [];
        const [targetUser] = await db.execute('SELECT allowed_ssids FROM portal_users WHERE id = ?', [id]);
        if (targetUser.length === 0) return res.status(404).json({ error: 'User not found' });

        const u = targetUser[0];
        let hasAccess = false;
        if (!u.allowed_ssids) {
            hasAccess = true;
        } else {
            const userSsids = u.allowed_ssids.split(',').map(s => s.trim());
            hasAccess = userSsids.some(s => adminSsids.includes(s));
        }

        if (!hasAccess) return res.status(403).json({ error: 'Access denied' });
    }

    try {
        if (delete_devices === 'true') {
            // 1. Get associated devices
            const [devices] = await db.execute('SELECT mac_address FROM managed_devices WHERE user_id = ?', [id]);

            // 2. Remove devices from radcheck and managed_devices
            if (devices.length > 0) {
                const macs = devices.map(d => d.mac_address);
                const placeholders = macs.map(() => '?').join(',');

                // Delete from radcheck
                await db.execute(`DELETE FROM radcheck WHERE username IN (${placeholders})`, macs);

                // Delete from managed_devices
                await db.execute('DELETE FROM managed_devices WHERE user_id = ?', [id]);
            }
        }

        // 3. Delete user (Foreign key ON DELETE SET NULL will unassign devices if not deleted above)
        await db.execute('DELETE FROM portal_users WHERE id = ?', [id]);

        res.json({ message: 'Portal user deleted' + (delete_devices === 'true' ? ' and associated devices removed' : ' (devices kept)') });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete portal user' });
    }
});

module.exports = router;
