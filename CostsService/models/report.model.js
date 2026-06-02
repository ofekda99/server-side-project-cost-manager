const mongoose = require('mongoose');

/*
 * Computed Design Pattern:
 * When a monthly report is requested for a past month, the result is
 * computed once and saved to this collection. Future requests for the
 * same userid/year/month are served directly from this cache instead
 * of re-querying the costs collection.
 */

/**
 * Schema for a cached monthly report.
 * The combination of userid + year + month is unique per document.
 */
const reportSchema = new mongoose.Schema({
    userid: { type: Number, required: true },
    year: { type: Number, required: true },
    month: { type: Number, required: true },
    // costs holds the full grouped report array, stored as-is
    costs: { type: Array, required: true }
});

// Enforce uniqueness so the same report is never saved twice
reportSchema.index({ userid: 1, year: 1, month: 1 }, { unique: true });

const Report = mongoose.model('report', reportSchema);
module.exports = Report;
