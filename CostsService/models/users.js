const mongoose = require('mongoose');

/**
 * Minimal User schema used by CostsService to validate that a userid exists.
 * The full user management is handled by UsersService.
 */
const userSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    first_name: { type: String, required: true },
    last_name: { type: String, required: true },
    birthday: { type: Date, required: true }
});

const User = mongoose.model('user', userSchema);
module.exports = User;
