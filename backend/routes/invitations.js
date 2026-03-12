const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');
const { verifyToken, isAdmin } = require('../middleware/auth');

// Generate random invitation code
const generateCode = () => {
    return crypto.randomBytes(8).toString('hex').toUpperCase();
};

// Convert date to MySQL datetime format
const toMySQLDateTime = (date) => {
    if (!date) return null;
    const d = new Date(date);
    return d.toISOString().slice(0, 19).replace('T', ' ');
};

/**
 * GET /api/invitations/settings
 * Get system settings (MUST be before /:id routes)
 */
router.get('/settings', verifyToken, isAdmin, async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM system_settings');
        const settings = {};
        rows.forEach(r => settings[r.key_name] = r.value);
        res.json(settings);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

/**
 * PUT /api/invitations/settings
 * Update system settings
 */
router.put('/settings', verifyToken, isAdmin, async (req, res) => {
    const { key_name, value } = req.body;
    try {
        await db.execute(`
            INSERT INTO system_settings (key_name, value) VALUES (?, ?)
            ON DUPLICATE KEY UPDATE value = ?
        `, [key_name, value, value]);
        res.json({ message: 'Setting updated' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update setting' });
    }
});

/**
 * GET /api/invitations/validate/:code
 * Validate invitation code (PUBLIC - no auth required)
 */
router.get('/validate/:code', async (req, res) => {
    const { code } = req.params;
    try {
        // Increment click count
        await db.execute('UPDATE signup_invitations SET click_count = click_count + 1 WHERE code = ?', [code]);

        const [rows] = await db.execute(`
            SELECT id, name, group_name, allowed_ssids, max_uses, used_count, expires_at, is_active 
            FROM signup_invitations 
            WHERE code = ?
        `, [code]);

        if (rows.length === 0) {
            return res.status(404).json({ error: '유효하지 않은 초대 코드입니다.' });
        }

        const inv = rows[0];

        if (!inv.is_active) {
            return res.status(403).json({ error: '비활성화된 초대 코드입니다.' });
        }

        if (inv.expires_at && new Date(inv.expires_at) < new Date()) {
            return res.status(403).json({ error: '만료된 초대 코드입니다.' });
        }

        if (inv.max_uses !== null && inv.used_count >= inv.max_uses) {
            return res.status(403).json({ error: '초대 코드 사용 횟수를 초과했습니다.' });
        }

        res.json({
            valid: true,
            name: inv.name,
            group_name: inv.group_name,
            allowed_ssids: inv.allowed_ssids
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Validation failed' });
    }
});

/**
 * GET /api/invitations
 * List all invitations
 */
router.get('/', verifyToken, isAdmin, async (req, res) => {
    try {
        const [invitations] = await db.execute(`
            SELECT i.*, pa.username as creator_name 
            FROM signup_invitations i
            LEFT JOIN portal_admins pa ON i.created_by = pa.id
            ORDER BY i.created_at DESC
        `);
        res.json(invitations);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch invitations' });
    }
});

/**
 * POST /api/invitations
 * Create new invitation
 */
router.post('/', verifyToken, isAdmin, async (req, res) => {
    const { name, group_name, allowed_ssids, max_uses, expires_at } = req.body;
    const code = generateCode();

    try {
        const expiresFormatted = toMySQLDateTime(expires_at);
        await db.execute(`
            INSERT INTO signup_invitations (code, name, group_name, allowed_ssids, max_uses, expires_at, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [code, name || `초대 ${new Date().toLocaleDateString('ko-KR')}`, group_name || null, allowed_ssids || null, max_uses || null, expiresFormatted, req.user.id]);

        res.status(201).json({ message: 'Invitation created', code });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create invitation' });
    }
});

/**
 * PUT /api/invitations/:id/toggle
 * Toggle active status
 */
router.put('/:id/toggle', verifyToken, isAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        await db.execute('UPDATE signup_invitations SET is_active = NOT is_active WHERE id = ?', [id]);
        res.json({ message: 'Invitation toggled' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to toggle invitation' });
    }
});

/**
 * PUT /api/invitations/:id/reset
 * Reset used_count to 0
 */
router.put('/:id/reset', verifyToken, isAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        await db.execute('UPDATE signup_invitations SET used_count = 0 WHERE id = ?', [id]);
        res.json({ message: 'Usage count reset' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to reset invitation' });
    }
});

/**
 * PUT /api/invitations/:id
 * Update invitation
 */
router.put('/:id', verifyToken, isAdmin, async (req, res) => {
    const { id } = req.params;
    const { name, group_name, allowed_ssids, max_uses, expires_at, is_active } = req.body;

    try {
        const expiresFormatted = toMySQLDateTime(expires_at);
        await db.execute(`
            UPDATE signup_invitations 
            SET name = ?, group_name = ?, allowed_ssids = ?, max_uses = ?, expires_at = ?, is_active = ?
            WHERE id = ?
        `, [name, group_name || null, allowed_ssids || null, max_uses || null, expiresFormatted, is_active, id]);

        res.json({ message: 'Invitation updated' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update invitation' });
    }
});

/**
 * DELETE /api/invitations/:id
 * Delete invitation
 */
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        await db.execute('DELETE FROM signup_invitations WHERE id = ?', [id]);
        res.json({ message: 'Invitation deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete invitation' });
    }
});

module.exports = router;
