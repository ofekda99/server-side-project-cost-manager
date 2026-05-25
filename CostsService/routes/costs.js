const express = require('express');
const router = express.Router();
const Costs = require('../models/costs');
const User = require('../models/users');
const Report = require('../models/reports');

// The valid categories as defined in the project requirements
const VALID_CATEGORIES = ['food', 'health', 'housing', 'sports', 'education'];

/**
 * Checks whether a user with the given id exists in the database.
 * @param {number} userId - The user id to look up.
 * @returns {Promise<boolean>} True if the user exists, false otherwise.
 */
const userExists = async (userId) => {
    const user = await User.findOne({ id: userId });
    return user !== null;
};

/**
 * POST /api/add
 * Adds a new cost item to the costs collection.
 * Expects: description, category, userid, sum in the request body.
 * Optionally accepts a date — if not provided, the server time is used.
 */
router.post('/add', async (req, res) => {
    // Extract fields from the request body
    const { description, category, userid, sum, date } = req.body;

    // Validate that all required fields are present
    if (!description || !category || !userid || sum === undefined) {
        return res.status(400).json({
            id: 'missing_fields',
            message: 'description, category, userid and sum are all required'
        });
    }

    // Validate that the category is one of the allowed values
    if (!VALID_CATEGORIES.includes(category)) {
        return res.status(400).json({
            id: 'invalid_category',
            message: `category must be one of: ${VALID_CATEGORIES.join(', ')}`
        });
    }

    try {
        // Verify the userid exists in the users collection before adding the cost
        const exists = await userExists(Number(userid));
        if (!exists) {
            return res.status(404).json({
                id: 'user_not_found',
                message: `No user found with id ${userid}`
            });
        }

        // Build the cost object — use provided date or let the schema default to now
        const costData = {
            description,
            category,
            userid: Number(userid),
            sum: Number(sum)
        };

        // Only set date explicitly if the client provided one, otherwise default is set to current server time
        if (date) {
            const providedDate = new Date(date);
            // Reject any date that belongs to the past
            if (providedDate < new Date()) {
                return res.status(400).json({
                    id: 'invalid_date',
                    message: 'Adding costs with a date in the past is not allowed'
                });
            }
            costData.date = providedDate;
        }

        // Save the new cost item to the database
        const newCost = await Costs.create(costData);
        res.status(201).json(newCost);

    } catch (error) {
        res.status(500).json({ id: 'server_error', message: error.message });
    }
});

/**
 * Checks whether a given year/month combination is strictly in the past.
 * @param {number} year - The requested year.
 * @param {number} month - The requested month (1-12).
 * @returns {boolean} True if the month is before the current month.
 */
const isPastMonth = (year, month) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // getMonth() is 0-indexed
    // A month is in the past if the year is earlier, or same year but month is earlier
    return year < currentYear || (year === currentYear && month < currentMonth);
};

/**
 * Builds the grouped costs report array for a given userid, year and month.
 * Every category appears in the result even if it has no cost items.
 * @param {number} userId - The user id to build the report for.
 * @param {number} year - The report year.
 * @param {number} month - The report month (1-12).
 * @returns {Promise<Array>} The grouped costs array.
 */
const buildReport = async (userId, year, month) => {
    // Query all cost documents for this user in the given month and year
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    // Fetch only costs within the requested month range
    const costs = await Costs.find({
        userid: userId,
        date: { $gte: startDate, $lt: endDate }
    });

    // Initialise each category with an empty array
    const grouped = {
        food: [],
        health: [],
        housing: [],
        sports: [],
        education: []
    };

    // Place each cost into its matching category group
    costs.forEach((cost) => {
        const entry = {
            sum: cost.sum,
            description: cost.description,
            day: new Date(cost.date).getDate()
        };
        // Only add if category is valid, guards against unexpected data
        if (grouped[cost.category] !== undefined) {
            grouped[cost.category].push(entry);
        }
    });

    // Convert the grouped object into the required array format
    return VALID_CATEGORIES.map((cat) => ({ [cat]: grouped[cat] }));
};

/**
 * GET /api/report
 * Returns a monthly cost report for a specific user, year and month.
 * Implements the Computed Design Pattern — past month reports are cached
 * in the computed_reports collection and served from there on repeat requests.
 */
router.get('/report', async (req, res) => {
    const { id, year, month } = req.query;

    // Validate that all three query parameters are present
    if (!id || !year || !month) {
        return res.status(400).json({
            id: 'missing_params',
            message: 'id, year and month are all required query parameters'
        });
    }

    // Convert query string values to numbers for DB queries
    const userId = Number(id);
    const yearNum = Number(year);
    const monthNum = Number(month);

    try {
        /*
         * Computed Design Pattern:
         * If the requested month is in the past, check the cache first.
         * If a cached report exists, return it immediately without re-querying costs.
         * If no cache exists, compute the report, save it, then return it.
         * Current and future months are always computed fresh and never cached.
         */
        if (isPastMonth(yearNum, monthNum)) {
            // Look for an existing cached report for this userid/year/month
            const cached = await Report.findOne({
                userid: userId,
                year: yearNum,
                month: monthNum
            });

            // Return the cached report if it exists
            if (cached) {
                return res.status(200).json({
                    userid: userId,
                    year: yearNum,
                    month: monthNum,
                    costs: cached.costs
                });
            }

            // No cache found — compute the report and save it for future requests
            const costs = await buildReport(userId, yearNum, monthNum);
            await Report.create({ userid: userId, year: yearNum, month: monthNum, costs });

            // Return the freshly computed report
            return res.status(200).json({ userid: userId, year: yearNum, month: monthNum, costs });
        }

        // Current or future month — always compute fresh, never cache
        const costs = await buildReport(userId, yearNum, monthNum);
        res.status(200).json({ userid: userId, year: yearNum, month: monthNum, costs });

    } catch (error) {
        res.status(500).json({ id: 'server_error', message: error.message });
    }
});

module.exports = router;
