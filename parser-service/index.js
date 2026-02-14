const express = require('express');
const cors = require('cors');
require('dotenv').config();

// ============================================
// CRITICAL: Handle unhandled errors gracefully
// Prevents crash when client disconnects during long Apify jobs
// ============================================
process.on('uncaughtException', (err) => {
    // ECONNRESET happens when client closes connection - this is expected
    if (err.code === 'ECONNRESET' || err.code === 'EPIPE') {
        console.log('[Parser] Client disconnected (harmless):', err.code);
        return; // Don't crash
    }
    console.error('[Parser] Uncaught Exception:', err);
    // For other errors, log but don't exit
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[Parser] Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit - keep server running
});

const parseRoutes = require('./routes/parse');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', parseRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        success: false,
        error: err.message || 'Internal server error'
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Parser Service running on http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
});
