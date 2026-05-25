const mongoose = require('mongoose');

/**
 * Schema for a log entry saved to MongoDB.
 * Used by Pino middleware to record every incoming request.
 */
const logSchema = new mongoose.Schema({
    level: { type: String, required: true },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    endpoint: { type: String }
});

const Log = mongoose.model('log', logSchema);
module.exports = Log;
