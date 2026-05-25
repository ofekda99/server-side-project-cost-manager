const mongoose = require('mongoose');

const costsSchema = new mongoose.Schema({
    description: {type: String, required: true},
    category: {type: String, required: true},
    userid: {type: Number, required: true},
    sum: {type: Number, required: true}, // In mongoose it same to Double as I understand
    date: {type: Date, default: Date.now}
});

const Costs = mongoose.model('costs', costsSchema);
module.exports = Costs;