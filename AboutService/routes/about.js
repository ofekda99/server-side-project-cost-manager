const express = require('express');
const router = express.Router();

// Hardcoded team members — names are not stored in the database
const TEAM_MEMBERS = [
    { first_name: 'Ofek', last_name: 'Dahari' },
    { first_name: 'Ben', last_name: 'Abraham' },
    { first_name: 'Asaf', last_name: 'Zusman' }
];

/**
 * GET /api/about
 * Returns a JSON array of the developers who built this project.
 * Each entry includes only first_name and last_name.
 */
router.get('/about', (req, res) => {
    // Return only first_name and last_name for each team member
    res.status(200).json(TEAM_MEMBERS);
});

module.exports = router;
