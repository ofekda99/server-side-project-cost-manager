const express = require('express');
const router = express.Router();
const Costs = require('../models/cost.model');
const User = require('../models/user.model');
const Report = require('../models/report.model');

// The valid categories as defined in the project requirements
const VALID_CATEGORIES = ['food', 'education', 'health', 'housing', 'sports'];

/**
 * Checks whether a user with the given id exists in the database.
 * @param {number} userId - The user id to look up.
 * @returns {Promise<boolean>} True if the user exists, false otherwise.
 */
async function userExists(userId) {
    const user = await User.findOne({ id: userId });
    // Return true only when a matching user document was found
    return user !== null;
}

/**
 * Validates the request body for POST /api/add.
 * Checks presence, type, and value of each field in a single pass.
 * Returns the first error found as an object { id, message }, or null if all valid.
 * @param {object} body - The request body to validate.
 * @returns {object|null} An error object or null if validation passes.
 */
function validateAddInput({ description, category, userid, sum, date }) {
    // Check that all required fields are present
    // description was not included in the request body
    if(!description)
        return { id: 'missing_description', message: 'description is required' };
    // category was not included in the request body
    if(!category)
        return { id: 'missing_category',    message: 'category is required' };
    // userid was not included in the request body
    if(userid === undefined)
        return { id: 'missing_userid',      message: 'userid is required' };
    // sum was not included in the request body
    if(sum === undefined)
        return { id: 'missing_sum',         message: 'sum is required' };

    // Check the type and value of each field individually
    // description must be a non-empty string
    if(typeof description !== 'string' || description.trim() === '')
        return { id: 'invalid_description', message: 'description must be a non-empty string' };
    // category must be one of the five predefined allowed values
    if(typeof category !== 'string' || !VALID_CATEGORIES.includes(category))
        return { id: 'invalid_category',    message: `category must be one of: ${VALID_CATEGORIES.join(', ')}` };
    // userid must be a whole positive number
    if(typeof userid !== 'number' || isNaN(userid) || !Number.isInteger(userid) || userid <= 0)
        return { id: 'invalid_userid',      message: 'userid must be a whole positive number' };
    // sum must be a positive number
    if(typeof sum !== 'number' || isNaN(sum) || sum < 0)
        return { id: 'invalid_sum',         message: 'sum must be a non-negative number' };
    // date is optional — only validate it when the client provides one
    if(date !== undefined) {
        // date must be a valid date string
        if(typeof date !== 'string' || isNaN(new Date(date).getTime()))
            return { id: 'invalid_date', message: 'date must be a valid date string' };
    }

    // All validations passed — no error
    return null;
}

/**
 * Validates the query parameters for GET /api/report.
 * Checks presence, numeric validity, integer constraint, and range in a single pass.
 * Returns the first error found as an object { id, message }, or null if all valid.
 * @param {object} query - The query parameters to validate.
 * @returns {object|null} An error object or null if validation passes.
 */
function validateReportParams({ id, year, month }) {
    // Check that all required parameters are present
    // id was not included in the query string
    if(!id)
        return { id: 'missing_id',    message: 'id is required' };
    // year was not included in the query string
    if(!year)
        return { id: 'missing_year',  message: 'year is required' };
    // month was not included in the query string
    if(!month)
        return { id: 'missing_month', message: 'month is required' };

    // Convert the string query params to numbers for numeric validation
    const userId   = Number(id);
    const yearNum  = Number(year);
    const monthNum = Number(month);

    // id must be a whole positive number
    if(isNaN(userId) || !Number.isInteger(userId) || userId <= 0)
        return { id: 'invalid_id', message: 'id must be a whole positive number' };

    // year must be a whole positive number
    if(isNaN(yearNum) || !Number.isInteger(yearNum) || yearNum <= 0)
        return { id: 'invalid_year', message: 'year must be a whole positive number' };

    // month must be a whole number between 1 and 12
    if(isNaN(monthNum) || !Number.isInteger(monthNum) || monthNum < 1 || monthNum > 12)
        return { id: 'invalid_month', message: 'month must be a whole number between 1 and 12' };

    // All validations passed — no error
    return null;
}

/**
 * POST /api/add
 * Adds a new cost item to the costs collection.
 * Expects: description, category, userid, sum in the request body.
 * Optionally accepts a date — if not provided, the server uses the request received time.
 */
router.post('/add', async (req, res) => {
    // Capture the request received time immediately, before any async work
    const receivedAt = new Date();

    // Run all field validations in one pass — return early on the first failure
    const validationError = validateAddInput(req.body);
    if (validationError) {
        return res.status(400).json(validationError);
    }

    // Extract validated fields from the request body
    const { description, category, userid, sum, date } = req.body;

    try {
        // Verify the userid exists in the users collection before saving the cost
        const exists = await userExists(userid);
        if (!exists) {
            return res.status(404).json({
                id: 'user_not_found',
                message: `No user found with id ${userid}`
            });
        }

        // Build the cost object from the validated fields
        const costData = { description, category, userid, sum };

        // Use the request received time when no date was provided by the client
        if (!date) {
            costData.date = receivedAt;
        }

        // Parse and validate the date when the client provides one
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

        // Return only the relevant fields, excluding internal Mongoose fields
        res.status(201).json({
            description: newCost.description,
            category: newCost.category,
            userid: newCost.userid,
            sum: newCost.sum,
            date: newCost.date
        });

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
function isPastMonth(year, month) {
    const now = new Date();
    const currentYear = now.getFullYear();
    // getMonth() is 0-indexed, so add 1 to get the calendar month
    const currentMonth = now.getMonth() + 1;
    return year < currentYear || (year === currentYear && month < currentMonth);
}

/**
 * Builds the grouped costs report array for a given userid, year and month.
 * Every category appears in the result even if it has no cost items.
 * @param {number} userId - The user id to build the report for.
 * @param {number} year - The report year.
 * @param {number} month - The report month (1-12).
 * @returns {Promise<Array>} The grouped costs array.
 */
async function buildReport(userId, year, month) {
    // Define the start and end of the requested month for the date range query
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    // Fetch all cost documents for this user within the requested month
    const costs = await Costs.find({
        userid: userId,
        date: { $gte: startDate, $lt: endDate }
    });

    // Initialise each category bucket with an empty array
    const grouped = {
        food: [],
        health: [],
        housing: [],
        sports: [],
        education: []
    };

    // Place each cost into its matching category bucket
    costs.forEach((cost) => {
        const entry = {
            sum: cost.sum,
            description: cost.description,
            day: new Date(cost.date).getDate()
        };
        // Guard against unexpected category values in the database
        if (grouped[cost.category] !== undefined) {
            grouped[cost.category].push(entry);
        }
    });

    // Map the grouped object into the required ordered array format
    return VALID_CATEGORIES.map((cat) => ({ [cat]: grouped[cat] }));
}

/**
 * GET /api/report
 * Returns a monthly cost report for a specific user, year and month.
 * Implements the Computed Design Pattern — past month reports are cached
 * in the reports collection and served from there on repeat requests.
 */
router.get('/report', async (req, res) => {
    // Run all parameter validations in one pass — return early on the first failure
    const validationError = validateReportParams(req.query);
    if (validationError) {
        return res.status(400).json(validationError);
    }

    // Convert the validated query string values to numbers for DB queries
    const userId   = Number(req.query.id);
    const yearNum  = Number(req.query.year);
    const monthNum = Number(req.query.month);

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

            // Return the cached report immediately if one exists
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

            // Return the freshly computed and now-cached report
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
