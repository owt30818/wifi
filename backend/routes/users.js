const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');

// Middleware would be here
const verifyToken = (req, res, next) => next();

/**
 * GET /api/users
 * List all admin users
 */
router.get('/', verifyToken, async (req, res) => {
    try {
        const [users] = await db.execute('SELECT id, username, created_at FROM portal_admins');
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
router.post('/', verifyToken, async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    try {
        const hash = await bcrypt.hash(password, 10);
        await db.execute(
            'INSERT INTO portal_admins (username, password_hash) VALUES (?, ?)',
            [username, hash]
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
router.delete('/:id', verifyToken, async (req, res) => {
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
router.put('/:id/password', verifyToken, async (req, res) => {
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

module.exports = router;
