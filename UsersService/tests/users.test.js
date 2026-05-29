const request = require('supertest');

// Mock mongoose to prevent real DB connection during tests
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

// Mock the Users model — return values are set per test
jest.mock('../models/users', () => ({
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn()
}));

// Mock the Costs model — return values are set per test
jest.mock('../models/costs', () => ({
    find: jest.fn()
}));

const app = require('../app');
const Users = require('../models/users');
const Costs = require('../models/costs');

// Sample user matching the pre-seeded test user from the assignment
const mockUser = { id: 123123, first_name: 'mosh', last_name: 'israeli', birthday: new Date('1990-01-01') };

// Reset all mock state before each test to prevent leaking between tests
beforeEach(() => {
    jest.clearAllMocks();
});

describe('GET /api/users', () => {
    // Verify the endpoint returns a successful response
    it('should return status 200', async () => {
        Users.find.mockResolvedValue([mockUser]);
        const res = await request(app).get('/api/users');
        expect(res.statusCode).toBe(200);
    });

    // Verify the response body is an array
    it('should return an array', async () => {
        Users.find.mockResolvedValue([mockUser]);
        const res = await request(app).get('/api/users');
        expect(Array.isArray(res.body)).toBe(true);
    });

    // Verify the response content type is JSON
    it('should return content-type JSON', async () => {
        Users.find.mockResolvedValue([mockUser]);
        const res = await request(app).get('/api/users');
        expect(res.headers['content-type']).toMatch(/json/);
    });
});

describe('GET /api/users/:id', () => {
    // Verify 200 is returned for an existing user
    it('should return status 200 for an existing user', async () => {
        Users.findOne.mockResolvedValue(mockUser);
        Costs.find.mockResolvedValue([]);
        const res = await request(app).get('/api/users/123123');
        expect(res.statusCode).toBe(200);
    });

    // Verify the response includes all required fields from the assignment
    it('should return first_name, last_name, id and total', async () => {
        Users.findOne.mockResolvedValue(mockUser);
        Costs.find.mockResolvedValue([]);
        const res = await request(app).get('/api/users/123123');
        expect(res.body).toHaveProperty('first_name', 'mosh');
        expect(res.body).toHaveProperty('last_name', 'israeli');
        expect(res.body).toHaveProperty('id', 123123);
        expect(res.body).toHaveProperty('total', 0);
    });

    // Verify total is correctly summed from the user's cost documents
    it('should return correct total from costs', async () => {
        Users.findOne.mockResolvedValue(mockUser);
        Costs.find.mockResolvedValue([{ sum: 10 }, { sum: 20 }, { sum: 30 }]);
        const res = await request(app).get('/api/users/123123');
        expect(res.body.total).toBe(60);
    });

    // Verify 404 is returned for a non-existent user
    it('should return status 404 for a non-existent user', async () => {
        Users.findOne.mockResolvedValue(null);
        const res = await request(app).get('/api/users/999999');
        expect(res.statusCode).toBe(404);
    });

    // Verify the error response contains the required id and message properties
    it('should return id and message on 404', async () => {
        Users.findOne.mockResolvedValue(null);
        const res = await request(app).get('/api/users/999999');
        expect(res.body).toHaveProperty('id', 'user_not_found');
        expect(res.body).toHaveProperty('message');
    });
});

describe('POST /api/add', () => {
    // Verify 400 is returned when required fields are missing
    it('should return status 400 when fields are missing', async () => {
        const res = await request(app).post('/api/add').send({ id: 1 });
        expect(res.statusCode).toBe(400);
    });

    // Verify the error id is missing_fields when fields are absent
    it('should return missing_fields error id when fields are missing', async () => {
        const res = await request(app).post('/api/add').send({ id: 1 });
        expect(res.body).toHaveProperty('id', 'missing_fields');
        expect(res.body).toHaveProperty('message');
    });

    // Verify 400 is returned when a user with that id already exists
    it('should return status 400 when user already exists', async () => {
        Users.findOne.mockResolvedValue(mockUser);
        const res = await request(app).post('/api/add').send({
            id: 123123, first_name: 'mosh', last_name: 'israeli', birthday: '1990-01-01'
        });
        expect(res.statusCode).toBe(400);
    });

    // Verify the correct error id is returned for a duplicate user
    it('should return user_already_exists error id for duplicate user', async () => {
        Users.findOne.mockResolvedValue(mockUser);
        const res = await request(app).post('/api/add').send({
            id: 123123, first_name: 'mosh', last_name: 'israeli', birthday: '1990-01-01'
        });
        expect(res.body).toHaveProperty('id', 'user_already_exists');
    });

    // Verify 201 is returned when a new user is successfully added
    it('should return status 201 when a new user is added', async () => {
        const newUser = { id: 999, first_name: 'test', last_name: 'user', birthday: '2000-01-01' };
        Users.findOne.mockResolvedValue(null);
        Users.create.mockResolvedValue(newUser);
        const res = await request(app).post('/api/add').send(newUser);
        expect(res.statusCode).toBe(201);
    });

    // Verify the created user document is returned in the response
    it('should return the created user on success', async () => {
        const newUser = { id: 999, first_name: 'test', last_name: 'user', birthday: '2000-01-01' };
        Users.findOne.mockResolvedValue(null);
        Users.create.mockResolvedValue(newUser);
        const res = await request(app).post('/api/add').send(newUser);
        expect(res.body).toHaveProperty('first_name', 'test');
        expect(res.body).toHaveProperty('last_name', 'user');
    });
});
