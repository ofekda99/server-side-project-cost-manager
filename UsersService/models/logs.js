const mongoose = require('mongoose');

/**
 * Schema for a log entry saved to MongoDB.
 * Every incoming HTTP request is logged here by the middleware in app.js.
 */
const logSchema = new mongoose.Schema({
    level: { type: String, required: true },
    method: { type: String },
    endpoint: { type: String },
    statusCode: { type: Number },
    timestamp: { type: Date, default: Date.now },
    service: { type: String }
});

const Log = mongoose.model('log', logSchema);
module.exports = Log;
