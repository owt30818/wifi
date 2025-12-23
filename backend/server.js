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
const portalRoutes = require('./routes/portal');
const path = require('path');
const cluster = require('cluster');
const os = require('os');
const compression = require('compression');

if (cluster.isMaster) {
    const numCPUs = os.cpus().length;
    console.log(`Master process ${process.pid} is running. Spawning ${numCPUs} workers...`);

    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker process ${worker.process.pid} died. Spawning a new worker...`);
        cluster.fork();
    });
} else {
    const app = express();
    const PORT = process.env.PORT || 3000;

    // HTTP Compression
    app.use(compression());

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

    // Public Routes (No JWT required)
    app.use('/portal', portalRoutes);

    // Protected Routes
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
        console.log(`Worker process ${process.pid} started. Server running on port ${PORT}`);
    });
}
