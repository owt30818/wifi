const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');
const deviceRoutes = require('./routes/devices');
const dashboardRoutes = require('./routes/dashboard');
const userRoutes = require('./routes/users');
const accessPointsRouter = require('./routes/access_points');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/access-points', accessPointsRouter);

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
