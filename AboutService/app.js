require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const pino = require('pino');
const aboutRouter = require('./routes/about');
const Log = require('./models/logs');

// Initialise the Pino logger for structured console output
const logger = pino({ level: 'info' });

const app = express();

// Allow Express to parse incoming JSON request bodies
app.use(express.json());

/**
 * Saves a log entry to the MongoDB logs collection after the response is sent.
 * @param {object} req - The Express request object.
 * @param {number} statusCode - The HTTP status code of the response.
 */
const logRequest = async (req, statusCode) => {
    // Determine log level based on the HTTP status code
    const level = statusCode >= 400 ? 'error' : 'info';

    try {
        // Save the log entry with full request and response details
        await Log.create({
            level,
            method: req.method,
            endpoint: req.originalUrl,
            statusCode,
            service: 'AboutService'
        });
    } catch (logError) {
        // Log the error but do not block the request if saving fails
        logger.error(`Failed to save log to DB: ${logError.message}`);
    }
};

/**
 * Logging middleware — runs on every incoming HTTP request.
 * Logs to console immediately, then saves to MongoDB after the response is sent.
 * @param {object} req - The Express request object.
 * @param {object} res - The Express response object.
 * @param {Function} next - Calls the next middleware in the chain.
 */
app.use((req, res, next) => {
    // Log to console immediately when the request arrives
    logger.info(`${req.method} ${req.originalUrl}`);

    // Save to MongoDB after the response is finished to capture the status code
    res.on('finish', () => logRequest(req, res.statusCode));

    next();
});

// Mount the about router — all routes are prefixed with /api
app.use('/api', aboutRouter);

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
            logger.info(`AboutService running on port ${port}`);
        });

    } catch (error) {
        // If the DB connection fails, log the error and exit the process
        logger.error(`Failed to connect to MongoDB: ${error.message}`);
        process.exit(1);
    }
};

// Only start the server when this file is run directly, not when imported by tests
if (require.main === module) {
    startServer();
}

module.exports = app;
