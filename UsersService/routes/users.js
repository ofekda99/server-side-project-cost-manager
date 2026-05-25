const express = require('express');
const router = express.Router();
const Users = require('../models/users');
const Costs = require('../models/costs');

const getUser = (userId) => {
    return Users.findOne({ id: userId });
}

router.get('/users', (req, res) => {
    try {
        const users = Users.find();
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ id: 'error', message: error.message });
        // res.status(500).json({ id: req.param.id', message: error.message }); ? more informative ?
    }
});

router.get('/users/:id', (req, res) => {
    const userId = req.params.id;

    try {
        const user = getUser(userId);
        if (!user) {
            return res.status(404).json({ id: userId , message: 'User not found' });
        }
        
        const costs = Costs.find({ userid: userId });
        const total = costs.reduce((sum, cost) => sum + cost.sum, 0);
        res.status(200).json({
            id: userId,
            first_name: user.first_name,
            last_name: user.last_name,
            total: total
            });
    } catch (error) {
        res.status(500).json({ id: userId, message: error.message });
        // res.status(500).json({ id: req.param.id', message: error.message }); ? more informative ?
    }
});

router.post('/add', (req, res) => {
    const { id, first_name, last_name, birthday } = req.body;

    if(!id || !first_name || !last_name || !birthday) {
        return res.status(400).json({ id: 'error' , message: 'All the fields are required!' });
    }

    try {
        const user = getUser(id);
        if (user) {
            return res.status(400).json({ id: id , message: 'User already exist' });
        }

        const userObj = {
            id,
            first_name,
            last_name,
            birthday
        };
        const newUser = Users.create(userObj);
        res.status(201).json(newUser);

    } catch (error) {
        res.status(500).json({ id: id, message: error.message });
        // res.status(500).json({ id: req.param.id', message: error.message }); ? more informative ?
    }
})

// TODO: Adding logs in each endpoints

module.exports = router;

