const mongoose = require('mongoose');

/**
 * Schema for a log entry saved to MongoDB.
 * Uses strict: false to store whatever Pino sends without a predefined structure.
 * Log messages are written to the database for every HTTP request received and whenever an endpoint is accessed.
 * Additional lifecycle events such as server startup and database connection are also logged.
 */
const logSchema = new mongoose.Schema(
    {},
    { strict: false, timestamps: true, collection: 'logs' }
);

const Log = mongoose.model('Log', logSchema);
module.exports = Log;
