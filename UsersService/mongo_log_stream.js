const LogEntry = require('./models/log.model');

/**
 * A writable stream destination for Pino.
 * Receives Pino's JSON output and saves each entry to the MongoDB logs collection.
 */
class MongoLogStream {
    /**
     * Called by Pino for every log entry written.
     * Parses the JSON chunk and saves it as a document in MongoDB.
     * @param {Buffer|string} chunk - The raw Pino log entry as a JSON string.
     * @returns {boolean} Always returns true to signal the write was accepted.
     */
    write(chunk) {
        // Convert the chunk to a trimmed string
        const line = String(chunk).trim();

        // Ignore empty lines
        if (!line) return true;

        try {
            // Parse the Pino JSON and save to MongoDB
            const obj = JSON.parse(line);
            LogEntry.create(obj).catch((err) => {
                process.stderr.write(`Failed to save log to DB: ${err.message}\n`);
            });
        } catch {
            // If parsing fails, save the raw line as a message
            LogEntry.create({ msg: line }).catch((err) => {
                process.stderr.write(`Failed to save log to DB: ${err.message}\n`);
            });
        }

        return true;
    }
}

module.exports = MongoLogStream;
