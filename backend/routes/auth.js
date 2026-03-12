const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET;

// Signup Endpoint (for regular users)
router.post('/signup', async (req, res) => {
    const { username, password, grade, class: classroom, number, real_name, invitation_code, mac_address } = req.body;

    if (!username || !password || !grade || !classroom || !number || !real_name) {
        return res.status(400).json({ error: 'All fields are required (ID, PW, grade, class, number, name)' });
    }

    // Validate grade (1-3), class (1-9), number (1-30)
    if (grade < 1 || grade > 3) {
        return res.status(400).json({ error: '학년은 1~3 사이여야 합니다.' });
    }
    if (classroom < 1 || classroom > 9) {
        return res.status(400).json({ error: '반은 1~9 사이여야 합니다.' });
    }
    if (number < 1 || number > 30) {
        return res.status(400).json({ error: '번호는 1~30 사이여야 합니다.' });
    }

    // Format MAC address if provided
    let formattedMac = null;
    if (mac_address && mac_address.trim()) {
        formattedMac = mac_address.trim().toUpperCase()
            .replace(/[^A-F0-9]/g, '')
            .match(/.{1,2}/g)?.join('-');
        if (!formattedMac || formattedMac.length !== 17) {
            return res.status(400).json({ error: 'MAC 주소 형식이 올바르지 않습니다.' });
        }
    }

    try {
        // Check if public signup is enabled or invitation code is required
        let assignedGroup = null;
        let assignedSsids = null;

        if (invitation_code) {
            // Validate invitation code
            const [invRows] = await db.execute(`
                SELECT id, group_name, allowed_ssids, max_uses, used_count, expires_at, is_active 
                FROM signup_invitations WHERE code = ?
            `, [invitation_code]);

            if (invRows.length === 0) {
                return res.status(403).json({ error: '유효하지 않은 초대 코드입니다.' });
            }

            const inv = invRows[0];

            if (!inv.is_active) {
                return res.status(403).json({ error: '비활성화된 초대 코드입니다.' });
            }

            if (inv.expires_at && new Date(inv.expires_at) < new Date()) {
                return res.status(403).json({ error: '만료된 초대 코드입니다.' });
            }

            if (inv.max_uses !== null && inv.used_count >= inv.max_uses) {
                return res.status(403).json({ error: '초대 코드 사용 횟수를 초과했습니다.' });
            }

            // Assign group and SSIDs from invitation
            assignedGroup = inv.group_name;
            assignedSsids = inv.allowed_ssids;

            // Increment used_count
            await db.execute('UPDATE signup_invitations SET used_count = used_count + 1 WHERE id = ?', [inv.id]);
        } else {
            // No invitation code - check if public signup is allowed
            const [settings] = await db.execute("SELECT value FROM system_settings WHERE key_name = 'public_signup_enabled'");
            const publicEnabled = settings.length > 0 && settings[0].value === 'true';

            if (!publicEnabled) {
                return res.status(403).json({ error: '현재 공개 회원가입이 비활성화되어 있습니다. 초대 코드가 필요합니다.' });
            }
        }

        // Check if user already exists
        const [adminCheck] = await db.execute('SELECT id FROM portal_admins WHERE username = ?', [username]);
        const [userCheck] = await db.execute('SELECT id FROM portal_users WHERE username = ?', [username]);

        if (adminCheck.length > 0 || userCheck.length > 0) {
            return res.status(409).json({ error: 'Username already taken' });
        }

        // Check for duplicate student info (grade + class + number)
        const [duplicateCheck] = await db.execute(
            'SELECT id FROM portal_users WHERE grade = ? AND class = ? AND number = ?',
            [grade, classroom, number]
        );

        if (duplicateCheck.length > 0) {
            return res.status(409).json({ error: '이미 동일한 학적정보(학년/반/번호)로 가입된 사용자가 있습니다.' });
        }

        const password_hash = await bcrypt.hash(password, 10);
        const [result] = await db.execute(
            'INSERT INTO portal_users (username, password_hash, grade, class, number, real_name, group_name, allowed_ssids) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [username, password_hash, grade, classroom, number, real_name, assignedGroup, assignedSsids]
        );

        const userId = result.insertId;

        // Register device if MAC address provided
        if (formattedMac) {
            const alias = `${real_name}의 기기`;
            await db.execute(
                'INSERT INTO managed_devices (mac_address, user_id, alias, status, registered_by, group_name, allowed_ssids) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [formattedMac, userId, alias, 'allowed', 'user', assignedGroup, assignedSsids]
            );
            await db.execute(
                'INSERT INTO radcheck (username, attribute, op, value) VALUES (?, ?, ?, ?)',
                [formattedMac, 'Cleartext-Password', ':=', formattedMac]
            );
        }

        res.status(201).json({ message: 'User registered successfully', group: assignedGroup, ssids: assignedSsids });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Signup failed' });
    }
});

const rateLimit = require('express-rate-limit');

// Login Rate Limiter: 5 attempts per 15 minutes
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 50,
    message: { error: 'Too many login attempts, please try again after 15 minutes' },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Login Endpoint
router.post('/login', loginLimiter, async (req, res) => {
    const { username, password } = req.body;
    console.log(`[DEBUG] Login attempt for user: ${username}`);

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        // 1. Try to find in portal_admins
        const [admins] = await db.execute('SELECT * FROM portal_admins WHERE username = ?', [username]);
        if (admins.length > 0) {
            const admin = admins[0];
            const isMatch = await bcrypt.compare(password, admin.password_hash);
            console.log(`[DEBUG] Password match result for ${username}: ${isMatch}`);
            if (isMatch) {
                const token = jwt.sign(
                    {
                        id: admin.id,
                        username: admin.username,
                        role: admin.role || 'super_admin', // Default to super_admin for backwards compatibility if null
                        allowed_groups: admin.allowed_groups,
                        allowed_ssids: admin.allowed_ssids
                    },
                    JWT_SECRET,
                    { expiresIn: '1h' }
                );
                console.log(`[AUTH] Admin login success: ${admin.username}, role: ${admin.role || 'super_admin'}`);
                return res.json({
                    token,
                    username: admin.username,
                    role: admin.role || 'super_admin',
                    allowed_groups: admin.allowed_groups,
                    allowed_ssids: admin.allowed_ssids
                });
            }
        }

        // 2. Try to find in portal_users
        const [users] = await db.execute('SELECT * FROM portal_users WHERE username = ?', [username]);
        if (users.length > 0) {
            const user = users[0];
            const isMatch = await bcrypt.compare(password, user.password_hash);
            if (isMatch) {
                const token = jwt.sign(
                    { id: user.id, username: user.username, role: 'user' },
                    JWT_SECRET,
                    { expiresIn: '1h' }
                );
                return res.json({ token, username: user.username, role: 'user' });
            }
        }

        return res.status(401).json({ error: 'Invalid credentials' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
