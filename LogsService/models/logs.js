const mongoose = require('mongoose');

const logsSchema = new mongoose.Schema({
    level:     { type: String, required: true },
    message:   { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    endpoint:  { type: String }
});

const Logs = mongoose.model('Logs', logsSchema);
module.exports = Logs;