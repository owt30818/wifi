const express = require('express');
const router = express.Router();
const path = require('path');

/**
 * GET /portal
 * The main splash page entry point.
 * UniFi redirects here with params: id (MAC), ap (AP MAC), ssid, url, etc.
 */
router.get('/', (req, res) => {
    const { id, ap, ssid, url } = req.query;

    // Log for debugging (who is trying to connect)
    console.log(`[Portal] Access attempt - MAC: ${id}, AP: ${ap}, SSID: ${ssid}`);

    // Return a simple HTML page for now
    // In production, this could be a more complex template
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Welcome to WiFi</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body { font-family: -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: white; }
                .card { background: rgba(255,255,255,0.05); padding: 2rem; border-radius: 1rem; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1); text-align: center; max-width: 400px; width: 90%; }
                .btn { background: #3b82f6; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 0.5rem; font-weight: bold; cursor: pointer; transition: 0.2s; text-decoration: none; display: inline-block; margin-top: 1rem; }
                .btn:hover { background: #2563eb; }
                .mac { font-size: 0.8rem; color: #64748b; margin-top: 1rem; }
            </style>
        </head>
        <body>
            <div class="card">
                <h1>WiFi Access Portal</h1>
                <p>Welcome! Click the button below to connect to the internet.</p>
                <a href="/portal/connect?mac=${id || ''}&url=${encodeURIComponent(url || '')}" class="btn">Connect Now</a>
                <div class="mac">Device ID: ${id || 'Unknown'}</div>
            </div>
        </body>
        </html>
    `);
});

/**
 * GET /portal/connect
 * Handles the "Connect" button click
 */
router.get('/connect', (req, res) => {
    const { mac, url } = req.query;

    // Logic to authorize MAC would go here
    // For now, just show a success message
    res.send(`
        <div style="text-align:center; padding: 50px; font-family: sans-serif;">
            <h2>Authorization Successful!</h2>
            <p>You are now connected. Redirecting you...</p>
            <script>
                setTimeout(() => {
                    window.location.href = "${url || 'https://www.google.com'}";
                }, 2000);
            </script>
        </div>
    `);
});

module.exports = router;
