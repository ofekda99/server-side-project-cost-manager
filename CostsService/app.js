require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const pino = require('pino');
const costsRouter = require('./routes/costs');
const Log = require('./models/logs');

// Initialise the Pino logger for structured console output
const logger = pino({ level: 'info' });

const app = express();

// Allow Express to parse incoming JSON request bodies
app.use(express.json());

/**
 * Logging middleware — runs on every incoming HTTP request.
 * Writes a log entry to both the console (via Pino) and MongoDB.
 * @param {object} req - The Express request object.
 * @param {object} res - The Express response object.
 * @param {Function} next - Calls the next middleware in the chain.
 */
app.use(async (req, res, next) => {
    const message = `${req.method} ${req.originalUrl}`;

    // Log to console using Pino
    logger.info(message);

    try {
        // Save the log entry to the MongoDB logs collection
        await Log.create({ level: 'info', message, endpoint: req.originalUrl });
    } catch (logError) {
        // Log the error but do not block the request if saving fails
        logger.error(`Failed to save log to DB: ${logError.message}`);
    }

    next();
});

// Mount the costs router — all routes are prefixed with /api
app.use('/api', costsRouter);

/**
 * Connects to MongoDB Atlas and starts the Express server.
 * The server only begins accepting requests once the DB connection is ready.
 */
const startServer = async () => {
    try {
        // Connect to MongoDB using the URI from the .env file
        await mongoose.connect(process.env.MONGODB_URI);
        logger.info('Connected to MongoDB');

        // Start listening for incoming requests on the configured port
        const port = Number(process.env.PORT);
        app.listen(port, () => {
            logger.info(`CostsService running on port ${port}`);
        });

    } catch (error) {
        // If the DB connection fails, log the error and exit the process
        logger.error(`Failed to connect to MongoDB: ${error.message}`);
        process.exit(1);
    }
};

startServer();
