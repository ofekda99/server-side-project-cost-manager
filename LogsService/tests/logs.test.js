const request = require('supertest');

// Mock mongoose to prevent real DB connection during tests
jest.mock('mongoose', () => ({
    connect: jest.fn().mockResolvedValue(),
    Schema: jest.fn().mockImplementation(() => ({})),
    model: jest.fn().mockReturnValue({
        create: jest.fn().mockResolvedValue()
    })
}));

// Mock the Log model to prevent real DB reads and writes during tests
jest.mock('../models/logs', () => ({
    find: jest.fn(),
    create: jest.fn().mockResolvedValue()
}));

const app = require('../app');
const Log = require('../models/logs');

// Sample log entries representing what the other services write to the DB
const mockLogs = [
    { level: 'info', method: 'GET', endpoint: '/api/users', statusCode: 200, service: 'UsersService' },
    { level: 'error', method: 'POST', endpoint: '/api/add', statusCode: 400, service: 'UsersService' },
    { level: 'info', method: 'GET', endpoint: '/api/about', statusCode: 200, service: 'AboutService' }
];

// Reset all mock state before each test to prevent leaking between tests
beforeEach(() => {
    jest.clearAllMocks();
});

describe('GET /api/logs', () => {
    // Verify the endpoint returns a successful response
    it('should return status 200', async () => {
        Log.find.mockResolvedValue(mockLogs);
        const res = await request(app).get('/api/logs');
        expect(res.statusCode).toBe(200);
    });

    // Verify the response body is an array
    it('should return an array', async () => {
        Log.find.mockResolvedValue(mockLogs);
        const res = await request(app).get('/api/logs');
        expect(Array.isArray(res.body)).toBe(true);
    });

    // Verify the correct number of log entries is returned
    it('should return all log entries', async () => {
        Log.find.mockResolvedValue(mockLogs);
        const res = await request(app).get('/api/logs');
        expect(res.body.length).toBe(3);
    });

    // Verify the response content type is JSON
    it('should return content-type JSON', async () => {
        Log.find.mockResolvedValue(mockLogs);
        const res = await request(app).get('/api/logs');
        expect(res.headers['content-type']).toMatch(/json/);
    });

    // Verify an empty array is returned when there are no logs
    it('should return an empty array when there are no logs', async () => {
        Log.find.mockResolvedValue([]);
        const res = await request(app).get('/api/logs');
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual([]);
    });
});
