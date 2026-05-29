const mongoose = require('mongoose');

/**
 * Schema for a user document stored in the users collection.
 * The id field is a custom numeric identifier, separate from MongoDB's _id.
 */
const userSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    first_name: { type: String, required: true },
    last_name: { type: String, required: true },
    birthday: { type: Date, required: true }
});

const User = mongoose.model('user', userSchema);
module.exports = User;