const request = require('supertest');

// Mock mongoose to prevent real DB connection during tests
jest.mock('mongoose', () => ({
    connect: jest.fn().mockResolvedValue(),
    Schema: jest.fn().mockImplementation(() => ({})),
    model: jest.fn().mockReturnValue({
        create: jest.fn().mockResolvedValue()
    })
}));

// Mock MongoLogStream to prevent Pino from writing to MongoDB during tests
jest.mock('../mongo_log_stream', () => {
    return jest.fn().mockImplementation(() => ({
        write: jest.fn()
    }));
});

// Mock the Log model — find() returns a chainable object to support .find().sort().select()
const mockLogFind = jest.fn().mockReturnValue({
    sort: jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue([]) })
});
jest.mock('../models/logs', () => ({
    find: mockLogFind
}));

const app = require('../app');

// Sample log entries representing what the other services write to the DB
const mockLogs = [
    { level: 'info', method: 'GET', endpoint: '/api/users', statusCode: 200, service: 'UsersService' },
    { level: 'error', method: 'POST', endpoint: '/api/add', statusCode: 400, service: 'UsersService' },
    { level: 'info', method: 'GET', endpoint: '/api/about', statusCode: 200, service: 'AboutService' }
];

describe('GET /api/logs', () => {
    // Reset all mocks and set defaults before each test
    beforeEach(() => {
        jest.clearAllMocks();
        mockLogFind.mockReturnValue({
            sort: jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue(mockLogs) })
        });
    });

    // Happy path — valid request should return 200
    it('should return status 200', async () => {
        const res = await request(app).get('/api/logs');
        expect(res.status).toBe(200);
    });

    // Response body should be an array
    it('should return an array', async () => {
        const res = await request(app).get('/api/logs');
        expect(Array.isArray(res.body)).toBe(true);
    });

    // Response should contain all log entries from the database
    it('should return all log entries', async () => {
        const res = await request(app).get('/api/logs');
        expect(res.body.length).toBe(3);
    });

    // Response headers should indicate JSON content
    it('should return content-type JSON', async () => {
        const res = await request(app).get('/api/logs');
        expect(res.headers['content-type']).toMatch(/json/);
    });

    // Empty array should be returned when there are no logs in the database
    it('should return an empty array when there are no logs', async () => {
        mockLogFind.mockReturnValue({
            sort: jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue([]) })
        });
        const res = await request(app).get('/api/logs');
        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });
});
