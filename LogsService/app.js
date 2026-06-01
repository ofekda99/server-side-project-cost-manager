require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const pino = require('pino');
const logsRouter = require('./routes/logs');
const MongoLogStream = require('./mongo_log_stream');

// Create a Pino logger that writes to MongoDB via MongoLogStream
const logger = pino(
    {
        level: 'info',
        timestamp: pino.stdTimeFunctions.isoTime,
        base: { service: 'LogsService' }
    },
    new MongoLogStream()
);

const app = express();

// Allow Express to parse incoming JSON request bodies
app.use(express.json());

/**
 * Logs the HTTP request details to MongoDB after the response is sent.
 * Captures the status code which is only available after the response.
 * @param {object} req - The Express request object.
 * @param {number} statusCode - The HTTP status code of the response.
 */
function logRequest(req, statusCode) {
    // Determine log level based on the HTTP status code
    const level = statusCode >= 400 ? 'error' : 'info';

    // Log the full request details including the status code
    logger[level]({ method: req.method, endpoint: req.originalUrl, statusCode });
}

/**
 * Logging middleware — runs on every incoming HTTP request.
 * Logs endpoint access immediately, then logs the full request after the response is sent.
 * @param {object} req - The Express request object.
 * @param {object} res - The Express response object.
 * @param {Function} next - Calls the next middleware in the chain.
 */
app.use((req, res, next) => {
    // Log endpoint access immediately when the request arrives
    logger.info({ endpoint: req.originalUrl }, 'HTTP request received');

    // Log full request details only when a valid route was matched
    res.on('finish', () => {
        if (req.route) {
            logRequest(req, res.statusCode);
        }
    });

    next();
});

// Mount the logs router — all routes are prefixed with /api
app.use('/api', logsRouter);

/**
 * Connects to MongoDB Atlas and starts the Express server.
 * The server only begins accepting requests once the DB connection is ready.
 */
async function startServer() {
    try {
        // Connect to MongoDB using the URI from the .env file
        await mongoose.connect(process.env.MONGODB_URI);
        logger.info('Connected to MongoDB');

        // Start listening for incoming requests on the configured port
        const port = Number(process.env.PORT);
        app.listen(port, () => {
            logger.info({ port }, 'LogsService is running');
        });

    } catch (error) {
        // If the DB connection fails, log the error and exit the process
        logger.error({ err: error.message }, 'Failed to connect to MongoDB');
        process.exit(1);
    }
}

// Only start the server when this file is run directly, not when imported by tests
if (require.main === module) {
    startServer();
}

module.exports = app;
