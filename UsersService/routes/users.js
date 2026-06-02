const express = require('express');
const router = express.Router();
const Users = require('../models/user.model');
const Costs = require('../models/cost.model');

/**
 * Retrieves a single user document by numeric id.
 * @param {number} userId - The numeric id to look up.
 * @returns {Promise<object>} The matching user document, or null if not found.
 */
async function getUserById(userId) {
    const user = await Users.findOne({ id: userId });
    return user;
}

/**
 * GET /api/users
 * Returns a JSON array of all users in the database.
 */
router.get('/users', async (req, res) => {
    try {
        // Exclude internal Mongoose fields from the response
        const users = await Users.find().select('-_id -__v');
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ id: 'server_error', message: error.message });
    }
});

/**
 * GET /api/users/:id
 * Returns the details and total costs for a specific user.
 * @param {string} req.params.id - The numeric user id as a URL parameter.
 */
router.get('/users/:id', async (req, res) => {
    // Convert the URL param to a number for DB queries
    const userId = Number(req.params.id);

    // id must be a whole positive number
    if(isNaN(userId) || !Number.isInteger(userId) || userId <= 0)
        return res.status(400).json({ id: 'invalid_id', message: 'id must be a whole positive number' });

    try {
        const user = await getUserById(userId);

        // Return 404 if no user matches the given id
        if (!user) {
            return res.status(404).json({ id: 'user_not_found', message: `No user found with id ${userId}` });
        }

        // Sum all cost amounts for this user using MongoDB aggregation
        const result = await Costs.aggregate([
            { $match: { userid: userId } },
            { $group: { _id: null, total: { $sum: '$sum' } } }
        ]);
        const total = result[0]?.total ?? 0;

        res.status(200).json({
            id: userId,
            first_name: user.first_name,
            last_name: user.last_name,
            total
        });

    } catch (error) {
        res.status(500).json({ id: 'server_error', message: error.message });
    }
});

/**
 * Validates the request body for adding a new user.
 * Checks each field individually for presence, type and value.
 * @param {object} body - The request body fields to validate.
 * @returns {object|null} An error object if validation fails, null if valid.
 */
function validateUserInput({ id, first_name, last_name, birthday }) {
    // id was not included in the request body
    if (id === undefined)
        return { id: 'missing_id', message: 'id is required' };
    // id must be a whole positive number
    if(typeof id !== 'number' || isNaN(id) || !Number.isInteger(id) || id <= 0)
        return { id: 'invalid_id', message: 'id must be a whole positive number' };

    // first_name was not included in the request body
    if (!first_name)
        return { id: 'missing_first_name', message: 'first_name is required' };
    // first_name must be a non-empty string
    if(typeof first_name !== 'string' || first_name.trim() === '')
        return { id: 'invalid_first_name', message: 'first_name must be a non-empty string' };

    // last_name was not included in the request body
    if (!last_name)
        return { id: 'missing_last_name', message: 'last_name is required' };
    // last_name must be a non-empty string
    if(typeof last_name !== 'string' || last_name.trim() === '')
        return { id: 'invalid_last_name', message: 'last_name must be a non-empty string' };

    // birthday was not included in the request body
    if (!birthday)
        return { id: 'missing_birthday', message: 'birthday is required' };
    // birthday must be a valid date string
    if(typeof birthday !== 'string' || isNaN(new Date(birthday).getTime()))
        return { id: 'invalid_birthday', message: 'birthday must be a valid date string' };
    // birthday must be in the past — future dates are not valid birthdays
    if (new Date(birthday) > new Date())
        return { id: 'invalid_birthday', message: 'birthday must be in the past' };

    return null;
}

/**
 * POST /api/add
 * Adds a new user to the users collection.
 * Expects: id, first_name, last_name, birthday in the request body.
 * Rejects duplicate users — the same id cannot be inserted twice.
 */
router.post('/add', async (req, res) => {
    // Validate all fields before touching the database
    const validationError = validateUserInput(req.body);
    if (validationError) {
        return res.status(400).json(validationError);
    }

    const { id, first_name, last_name, birthday } = req.body;

    try {
        // Reject the request if a user with this id already exists
        const existing = await getUserById(id);
        if (existing) {
            return res.status(400).json({
                id: 'user_already_exists',
                message: 'A user with this id already exists'
            });
        }

        // Create and persist the new user document
        const newUser = await Users.create({
            id,
            first_name,
            last_name,
            birthday
        });

        // Return only the relevant fields, excluding internal Mongoose fields
        res.status(201).json({
            id: newUser.id,
            first_name: newUser.first_name,
            last_name: newUser.last_name,
            birthday: newUser.birthday
        });

    } catch (error) {
        res.status(500).json({ id: 'server_error', message: error.message });
    }
});

module.exports = router;
