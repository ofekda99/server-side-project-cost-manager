const mongoose = require('mongoose');

const costsSchema = new mongoose.Schema({
    description: {type: String, required: true},
    category: {type: String, required: true},
    userid: {type: Number, required: true},
    sum: {type: Number, required: true} // In mongoose it same to Double as I understand
});

const Costs = mongoose.model('costs', costsSchema);
module.exports = Costs;