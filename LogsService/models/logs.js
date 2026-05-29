const mongoose = require('mongoose');

/**
 * Schema for a log entry stored in the logs collection.
 * All fields except level are optional to support log entries
 * written by all four services with different structures.
 */
const logSchema = new mongoose.Schema({
    level: { type: String, required: true },
    method: { type: String },
    message: { type: String },
    endpoint: { type: String },
    statusCode: { type: Number },
    timestamp: { type: Date, default: Date.now },
    service: { type: String }
});

const Log = mongoose.model('log', logSchema);
module.exports = Log;
