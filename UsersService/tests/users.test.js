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
jest.mock('../models/log.model', () => ({
    create: jest.fn().mockResolvedValue()
}));

// Mock the Users model — default values are overridden per describe block
// find() returns a chainable object with select() to support .find().select()
const mockUsersFind = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue([]) });
const mockUsersFindOne = jest.fn().mockResolvedValue(null);
const mockUsersCreate = jest.fn().mockResolvedValue({});
jest.mock('../models/user.model', () => ({
    find: mockUsersFind,
    findOne: mockUsersFindOne,
    create: mockUsersCreate
}));

// Mock the Costs model — default: no costs, total returns 0
const mockCostsAggregate = jest.fn().mockResolvedValue([]);
jest.mock('../models/cost.model', () => ({
    aggregate: mockCostsAggregate
}));

const app = require('../app');

// Sample user matching the pre-seeded test user from the assignment
const mockUser = { id: 123123, first_name: 'mosh', last_name: 'israeli', birthday: new Date('1990-01-01') };

describe('GET /api/users', () => {
    // Reset all mocks and set defaults before each test
    beforeEach(() => {
        jest.clearAllMocks();
        mockUsersFind.mockReturnValue({ select: jest.fn().mockResolvedValue([mockUser]) });
    });

    // Happy path — valid request should return 200
    it('should return status 200', async () => {
        const res = await request(app).get('/api/users');
        expect(res.status).toBe(200);
    });

    // Response body should be an array
    it('should return an array', async () => {
        const res = await request(app).get('/api/users');
        expect(Array.isArray(res.body)).toBe(true);
    });

    // Response headers should indicate JSON content
    it('should return content-type JSON', async () => {
        const res = await request(app).get('/api/users');
        expect(res.headers['content-type']).toMatch(/json/);
    });
});

describe('GET /api/users/:id', () => {
    // Reset all mocks and set defaults before each test
    beforeEach(() => {
        jest.clearAllMocks();
        mockUsersFindOne.mockResolvedValue(mockUser);
        mockCostsAggregate.mockResolvedValue([]);
    });

    // Happy path — existing user should return 200 with correct fields
    it('should return status 200 for an existing user', async () => {
        const res = await request(app).get('/api/users/123123');
        expect(res.status).toBe(200);
    });

    // Response should include all required fields defined by the assignment
    it('should return first_name, last_name, id and total', async () => {
        const res = await request(app).get('/api/users/123123');
        expect(res.body).toHaveProperty('first_name', 'mosh');
        expect(res.body).toHaveProperty('last_name', 'israeli');
        expect(res.body).toHaveProperty('id', 123123);
        expect(res.body).toHaveProperty('total', 0);
    });

    // Total should be the sum of all cost documents for the user
    it('should return correct total from costs', async () => {
        mockCostsAggregate.mockResolvedValue([{ total: 60 }]);
        const res = await request(app).get('/api/users/123123');
        expect(res.body.total).toBe(60);
    });

    // Non-existent user should return 404 with error id and message
    it('should return status 404 for a non-existent user', async () => {
        mockUsersFindOne.mockResolvedValue(null);
        const res = await request(app).get('/api/users/999999');
        expect(res.status).toBe(404);
    });

    // Error response should include both id and message properties
    it('should return id and message on 404', async () => {
        mockUsersFindOne.mockResolvedValue(null);
        const res = await request(app).get('/api/users/999999');
        expect(res.body).toHaveProperty('id', 'user_not_found');
        expect(res.body).toHaveProperty('message');
    });

    // Validation — non-numeric id should return 400 with invalid_id
    it('should return status 400 when id is not a number', async () => {
        const res = await request(app).get('/api/users/abc');
        expect(res.status).toBe(400);
        expect(res.body.id).toBe('invalid_id');
    });

    // Validation — decimal id should be rejected
    it('should return status 400 when id is a decimal', async () => {
        const res = await request(app).get('/api/users/3.5');
        expect(res.status).toBe(400);
        expect(res.body.id).toBe('invalid_id');
    });

    // Validation — negative id should be rejected
    it('should return status 400 when id is negative', async () => {
        const res = await request(app).get('/api/users/-1');
        expect(res.status).toBe(400);
        expect(res.body.id).toBe('invalid_id');
    });
});

describe('POST /api/add', () => {
    // Reset all mocks and set defaults before each test
    beforeEach(() => {
        jest.clearAllMocks();
        mockUsersFindOne.mockResolvedValue(null);
        mockUsersCreate.mockResolvedValue({
            id: 999,
            first_name: 'test',
            last_name: 'user',
            birthday: new Date('2000-01-01')
        });
    });

    // Missing id — each required field omitted should return its own specific error
    it('should return missing_id when id is absent', async () => {
        const res = await request(app).post('/api/add')
            .send({ first_name: 'test', last_name: 'user', birthday: '1990-01-01' });
        expect(res.status).toBe(400);
        expect(res.body.id).toBe('missing_id');
    });

    // Missing first_name — should return a specific error for that field
    it('should return missing_first_name when first_name is absent', async () => {
        const res = await request(app).post('/api/add')
            .send({ id: 999, last_name: 'user', birthday: '1990-01-01' });
        expect(res.status).toBe(400);
        expect(res.body.id).toBe('missing_first_name');
    });

    // Missing last_name — should return a specific error for that field
    it('should return missing_last_name when last_name is absent', async () => {
        const res = await request(app).post('/api/add')
            .send({ id: 999, first_name: 'test', birthday: '1990-01-01' });
        expect(res.status).toBe(400);
        expect(res.body.id).toBe('missing_last_name');
    });

    // Missing birthday — should return a specific error for that field
    it('should return missing_birthday when birthday is absent', async () => {
        const res = await request(app).post('/api/add')
            .send({ id: 999, first_name: 'test', last_name: 'user' });
        expect(res.status).toBe(400);
        expect(res.body.id).toBe('missing_birthday');
    });

    // id sent as a string — must be rejected since id must be a number
    it('should return invalid_id when id is not a number', async () => {
        const res = await request(app).post('/api/add')
            .send({ id: 'abc', first_name: 'test', last_name: 'user', birthday: '1990-01-01' });
        expect(res.status).toBe(400);
        expect(res.body.id).toBe('invalid_id');
    });

    // id sent as a negative number — user ids must be positive
    it('should return invalid_id when id is a negative number', async () => {
        const res = await request(app).post('/api/add')
            .send({ id: -1, first_name: 'test', last_name: 'user', birthday: '1990-01-01' });
        expect(res.status).toBe(400);
        expect(res.body.id).toBe('invalid_id');
    });

    // first_name sent as a number — must be a string
    it('should return invalid_first_name when first_name is not a string', async () => {
        const res = await request(app).post('/api/add')
            .send({ id: 999, first_name: 123, last_name: 'user', birthday: '1990-01-01' });
        expect(res.status).toBe(400);
        expect(res.body.id).toBe('invalid_first_name');
    });

    // first_name sent as whitespace only — must contain a real name
    it('should return invalid_first_name when first_name is whitespace only', async () => {
        const res = await request(app).post('/api/add')
            .send({ id: 999, first_name: '   ', last_name: 'user', birthday: '1990-01-01' });
        expect(res.status).toBe(400);
        expect(res.body.id).toBe('invalid_first_name');
    });

    // last_name sent as a number — must be a string
    it('should return invalid_last_name when last_name is not a string', async () => {
        const res = await request(app).post('/api/add')
            .send({ id: 999, first_name: 'test', last_name: 123, birthday: '1990-01-01' });
        expect(res.status).toBe(400);
        expect(res.body.id).toBe('invalid_last_name');
    });

    // last_name sent as whitespace only — must contain a real name
    it('should return invalid_last_name when last_name is whitespace only', async () => {
        const res = await request(app).post('/api/add')
            .send({ id: 999, first_name: 'test', last_name: '   ', birthday: '1990-01-01' });
        expect(res.status).toBe(400);
        expect(res.body.id).toBe('invalid_last_name');
    });

    // Birthday sent as an unparseable string — must be a valid date
    it('should return invalid_birthday when birthday is not a valid date', async () => {
        const res = await request(app).post('/api/add')
            .send({ id: 999, first_name: 'test', last_name: 'user', birthday: 'not-a-date' });
        expect(res.status).toBe(400);
        expect(res.body.id).toBe('invalid_birthday');
    });

    // Birthday sent as a number — typeof 123 is 'number', not 'string', so it must be rejected
    it('should return invalid_birthday when birthday is a number', async () => {
        const res = await request(app).post('/api/add')
            .send({ id: 999, first_name: 'test', last_name: 'user', birthday: 123 });
        expect(res.status).toBe(400);
        expect(res.body.id).toBe('invalid_birthday');
    });

    // Birthday in the future — future dates are not valid birthdays
    it('should return invalid_birthday when birthday is in the future', async () => {
        const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        const res = await request(app).post('/api/add')
            .send({ id: 999, first_name: 'test', last_name: 'user', birthday: futureDate });
        expect(res.status).toBe(400);
        expect(res.body.id).toBe('invalid_birthday');
    });

    // Duplicate user — the same id cannot be inserted twice
    it('should return status 400 when user already exists', async () => {
        mockUsersFindOne.mockResolvedValue(mockUser);
        const res = await request(app).post('/api/add')
            .send({ id: 123123, first_name: 'mosh', last_name: 'israeli', birthday: '1990-01-01' });
        expect(res.status).toBe(400);
    });

    // Error id should be user_already_exists for duplicate user attempts
    it('should return user_already_exists error id for duplicate user', async () => {
        mockUsersFindOne.mockResolvedValue(mockUser);
        const res = await request(app).post('/api/add')
            .send({ id: 123123, first_name: 'mosh', last_name: 'israeli', birthday: '1990-01-01' });
        expect(res.body).toHaveProperty('id', 'user_already_exists');
    });

    // Happy path — valid new user should return 201
    it('should return status 201 when a new user is added', async () => {
        const res = await request(app).post('/api/add')
            .send({ id: 999, first_name: 'test', last_name: 'user', birthday: '2000-01-01' });
        expect(res.status).toBe(201);
    });

    // Response body should contain the created user fields
    it('should return the created user on success', async () => {
        const res = await request(app).post('/api/add')
            .send({ id: 999, first_name: 'test', last_name: 'user', birthday: '2000-01-01' });
        expect(res.body).toHaveProperty('first_name', 'test');
        expect(res.body).toHaveProperty('last_name', 'user');
        expect(res.body).toHaveProperty('id', 999);
    });

    // Response should contain only relevant fields, not internal Mongoose fields
    it('should not include _id or __v in the response', async () => {
        const res = await request(app).post('/api/add')
            .send({ id: 999, first_name: 'test', last_name: 'user', birthday: '2000-01-01' });
        expect(res.body).not.toHaveProperty('_id');
        expect(res.body).not.toHaveProperty('__v');
    });

    // Response headers should always indicate JSON content
    it('should return content-type JSON', async () => {
        const res = await request(app).post('/api/add')
            .send({ id: 999, first_name: 'test', last_name: 'user', birthday: '2000-01-01' });
        expect(res.headers['content-type']).toMatch(/json/);
    });
});
