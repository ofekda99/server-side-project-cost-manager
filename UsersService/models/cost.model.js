const mongoose = require('mongoose');

/**
 * Schema for a cost document stored in the costs collection.
 * The sum field uses Number which maps to Double in MongoDB.
 */
const costsSchema = new mongoose.Schema({
    description: { type: String, required: true },
    category: { type: String, required: true },
    userid: { type: Number, required: true },
    sum: { type: Number, required: true },
    date: { type: Date, default: Date.now }
});

const Costs = mongoose.model('costs', costsSchema);
module.exports = Costs;
