const express = require('express');
const router = express.Router();
const Log = require('../models/log.model');

/**
 * GET /api/logs
 * Returns a JSON array of all log entries in the database.
 */
router.get('/logs', async (req, res) => {
    try {
        // Sort by timestamp descending and exclude internal Mongoose fields
        const logs = await Log.find().sort({ createdAt: -1 }).select('-_id -__v');
        res.status(200).json(logs);
    } catch (error) {
        res.status(500).json({ id: 'server_error', message: error.message });
    }
});

module.exports = router;
