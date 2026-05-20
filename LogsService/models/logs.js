const mongoose = require('mongoose');

const logsSchema = new mongoose.Schema({
   // TODO
});

const Logs = mongoose.model('Logs', logsSchema);
module.exports = Logs;