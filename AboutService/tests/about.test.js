const request = require('supertest');

// Mock mongoose to prevent real DB connection
jest.mock('mongoose', () => ({
    connect: jest.fn().mockResolvedValue(),
    Schema: jest.fn().mockImplementation(() => ({})),
    model: jest.fn().mockReturnValue({
        create: jest.fn().mockResolvedValue()
    })
}));

// Mock the Log model to prevent real DB writes during tests
jest.mock('../models/logs', () => ({
    create: jest.fn().mockResolvedValue()
}));

const app = require('../app');

// Expected team members based on the hardcoded values in routes/about.js
const expectedMembers = [
    { first_name: 'Ofek', last_name: 'Dahari' },
    { first_name: 'Ben', last_name: 'Abraham' },
    { first_name: 'Asaf', last_name: 'Zusman' }
];

describe('GET /api/about', () => {
    // Verify the endpoint returns a successful response
    it('should return status 200', async () => {
        const res = await request(app).get('/api/about');
        expect(res.statusCode).toBe(200);
    });

    // Verify the response body is an array
    it('should return an array', async () => {
        const res = await request(app).get('/api/about');
        expect(Array.isArray(res.body)).toBe(true);
    });

    // Verify the correct number of team members is returned
    it('should return 3 team members', async () => {
        const res = await request(app).get('/api/about');
        expect(res.body.length).toBe(3);
    });

    // Verify each member has only first_name and last_name properties
    it('should return only first_name and last_name for each member', async () => {
        const res = await request(app).get('/api/about');
        res.body.forEach((member) => {
            const keys = Object.keys(member);
            expect(keys).toEqual(['first_name', 'last_name']);
        });
    });

    // Verify the correct team member names are returned
    it('should return the correct team member names', async () => {
        const res = await request(app).get('/api/about');
        expect(res.body).toEqual(expectedMembers);
    });

    // Verify the response content type is JSON
    it('should return content-type JSON', async () => {
        const res = await request(app).get('/api/about');
        expect(res.headers['content-type']).toMatch(/json/);
    });
});
