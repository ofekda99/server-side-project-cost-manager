const express = require('express');
const router = express.Router();
const Log = require('../models/logs');

/**
 * GET /api/logs
 * Returns a JSON array of all log entries in the database.
 */
router.get('/logs', async (req, res) => {
    try {
        // Sort by timestamp descending to show the most recent logs first
        const logs = await Log.find().sort({ timestamp: -1 });
        res.status(200).json(logs);
    } catch (error) {
        res.status(500).json({ id: 'server_error', message: error.message });
    }
});

module.exports = router;
