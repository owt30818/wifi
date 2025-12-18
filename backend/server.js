const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');
const deviceRoutes = require('./routes/devices');
const dashboardRoutes = require('./routes/dashboard');
const userRoutes = require('./routes/users');
const accessPointsRouter = require('./routes/access_points');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security Middleware
app.use(helmet({
    contentSecurityPolicy: false // Disable CSP for SPA compatibility
}));

// CORS Configuration
const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://127.0.0.1:3000'];
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(null, true); // Allow all for now, but log
    },
    credentials: true
}));

// Rate Limiting for Auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 attempts per window
    message: { error: 'Too many login attempts. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});

// General API rate limiter
const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: { error: 'Too many requests. Please slow down.' }
});

app.use(express.json());

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/devices', apiLimiter, deviceRoutes);
app.use('/api/dashboard', apiLimiter, dashboardRoutes);
app.use('/api/users', apiLimiter, userRoutes);
app.use('/api/access-points', apiLimiter, accessPointsRouter);

// Health Check
app.get('/api/health', (req, res) => {
    res.send('WIFI Admin Portal API is running');
});

// Serve Static Frontend
const path = require('path');
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// SPA Fallback
app.get(/(.*)/, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
