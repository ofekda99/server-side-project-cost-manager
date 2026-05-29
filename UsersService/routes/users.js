const express = require('express');
const router = express.Router();
const Users = require('../models/users');
const Costs = require('../models/costs');

/**
 * Retrieves a single user document by numeric id.
 * @param {number} userId - The numeric id to look up.
 * @returns {Promise<object>} The matching user document, or null if not found.
 */
const getUserById = async (userId) => {
    const user = await Users.findOne({ id: userId });
    return user;
};

/**
 * GET /api/users
 * Returns a JSON array of all users in the database.
 */
router.get('/users', async (req, res) => {
    try {
        const users = await Users.find();
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

    try {
        const user = await getUserById(userId);

        // Return 404 if no user matches the given id
        if (!user) {
            return res.status(404).json({ id: 'user_not_found', message: `No user found with id ${userId}` });
        }

        // Sum all cost amounts for this user across all time
        const costs = await Costs.find({ userid: userId });
        const total = costs.reduce((sum, cost) => sum + cost.sum, 0); // replace with mongo aggregation func?

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
 * POST /api/add
 * Adds a new user to the users collection.
 * Expects: id, first_name, last_name, birthday in the request body.
 * Rejects duplicate users — the same id cannot be inserted twice.
 */
router.post('/add', async (req, res) => {
    const { id, first_name, last_name, birthday } = req.body;

    // Validate that all required fields are present
    if (!id || !first_name || !last_name || !birthday) {
        return res.status(400).json({
            id: 'missing_fields',
            message: 'id, first_name, last_name and birthday are all required'
        });
    }

    try {
        // Reject the request if a user with this id already exists
        const existing = await getUserById(Number(id));
        if (existing) {
            return res.status(400).json({
                id: 'user_already_exists',
                message: 'A user with this id already exists'
            });
        }

        // Create and persist the new user document
        const newUser = await Users.create({
            id: Number(id),
            first_name,
            last_name,
            birthday
        });

        res.status(201).json(newUser);

    } catch (error) {
        res.status(500).json({ id: 'server_error', message: error.message });
    }
});

module.exports = router;
