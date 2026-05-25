require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/users');

const insertTestUser = async () => {
    try {
        // Connect to MongoDB using the URI from the .env file
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Check if the user already exists before inserting
        const existing = await User.findOne({ id: 123123 });
        if (existing) {
            console.log('User 123123 already exists:', existing);
            return;
        }

        // Insert the test user required by the project
        const user = await User.create({
            id: 123123,
            first_name: 'mosh',
            last_name: 'israeli',
            birthday: new Date('1990-01-01')
        });

        console.log('User inserted successfully:', user);

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        // Always close the connection when done
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
};

insertTestUser();
