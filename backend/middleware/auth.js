const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid or expired token.' });
    }
};

const isAdmin = (req, res, next) => {
    // Both super_admin and sub_admin are considered "admins" for general access
    if (req.user && (req.user.role === 'super_admin' || req.user.role === 'sub_admin' || req.user.role === 'admin')) {
        next();
    } else {
        res.status(403).json({ error: 'Access denied. Admin role required.' });
    }
};

const isSuperAdmin = (req, res, next) => {
    if (req.user && (req.user.role === 'super_admin' || req.user.role === 'admin')) {
        next();
    } else {
        res.status(403).json({ error: 'Access denied. Super Admin role required.' });
    }
};

module.exports = { verifyToken, isAdmin, isSuperAdmin };
