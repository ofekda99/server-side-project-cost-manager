const request = require('supertest');

// Mock mongoose before any app code is loaded so no real DB connection is attempted
jest.mock('mongoose', () => ({
    connect: jest.fn().mockResolvedValue(),
    Schema: jest.fn().mockImplementation(() => ({
        index: jest.fn()
    })),
    model: jest.fn().mockReturnValue({
        create: jest.fn().mockResolvedValue({}),
        findOne: jest.fn().mockResolvedValue(null),
        find: jest.fn().mockResolvedValue([])
    })
}));

// Mock the logs model so no log documents are written during tests
jest.mock('../models/logs', () => ({
    create: jest.fn().mockResolvedValue()
}));

// Mock the users model — default: user does not exist (findOne returns null)
const mockUserFindOne = jest.fn().mockResolvedValue(null);
jest.mock('../models/users', () => ({
    findOne: mockUserFindOne
}));

// Mock the costs model — default: create succeeds, find returns empty array
const mockCostsCreate = jest.fn().mockResolvedValue({
    _id: 'abc123',
    description: 'test item',
    category: 'food',
    userid: 123123,
    sum: 50,
    date: new Date()
});
const mockCostsFind = jest.fn().mockResolvedValue([]);
jest.mock('../models/costs', () => ({
    create: mockCostsCreate,
    find: mockCostsFind
}));

// Mock the reports model — default: no cached report, create succeeds
const mockReportFindOne = jest.fn().mockResolvedValue(null);
const mockReportCreate = jest.fn().mockResolvedValue({});
jest.mock('../models/reports', () => ({
    findOne: mockReportFindOne,
    create: mockReportCreate
}));

const app = require('../app');

// A future date string used across POST /api/add tests
const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

describe('POST /api/add', () => {
    // Reset all mocks before each test so state does not leak between tests
    beforeEach(() => {
        jest.clearAllMocks();
        // Default: user exists
        mockUserFindOne.mockResolvedValue({ id: 123123, first_name: 'Test', last_name: 'User' });
        // Default: cost create succeeds and returns the saved document
        mockCostsCreate.mockResolvedValue({
            _id: 'abc123',
            description: 'test item',
            category: 'food',
            userid: 123123,
            sum: 50
        });
    });

    // Happy path — valid request should create the cost and return 201
    it('should return status 201 when a valid cost is added', async () => {
        const res = await request(app)
            .post('/api/add')
            .send({ description: 'lunch', category: 'food', userid: 123123, sum: 30 });

        expect(res.status).toBe(201);
    });

    // The response body should contain all the saved cost fields
    it('should return the saved cost document on success', async () => {
        const res = await request(app)
            .post('/api/add')
            .send({ description: 'lunch', category: 'food', userid: 123123, sum: 30 });

        expect(res.body).toHaveProperty('description');
        expect(res.body).toHaveProperty('category');
        expect(res.body).toHaveProperty('userid');
        expect(res.body).toHaveProperty('sum');
    });

    // Each required field missing individually should return its specific error id
    it('should return missing_description when description is absent', async () => {
        const res = await request(app)
            .post('/api/add')
            .send({ category: 'food', userid: 123123, sum: 30 });

        expect(res.status).toBe(400);
        expect(res.body.id).toBe('missing_description');
    });

    it('should return missing_category when category is absent', async () => {
        const res = await request(app)
            .post('/api/add')
            .send({ description: 'lunch', userid: 123123, sum: 30 });

        expect(res.status).toBe(400);
        expect(res.body.id).toBe('missing_category');
    });

    it('should return missing_userid when userid is absent', async () => {
        const res = await request(app)
            .post('/api/add')
            .send({ description: 'lunch', category: 'food', sum: 30 });

        expect(res.status).toBe(400);
        expect(res.body.id).toBe('missing_userid');
    });

    it('should return missing_sum when sum is absent', async () => {
        const res = await request(app)
            .post('/api/add')
            .send({ description: 'lunch', category: 'food', userid: 123123 });

        expect(res.status).toBe(400);
        expect(res.body.id).toBe('missing_sum');
    });

    // Type validation — each field sent with the wrong type should return its specific error id
    it('should return invalid_description when description is not a string', async () => {
        const res = await request(app)
            .post('/api/add')
            .send({ description: 123, category: 'food', userid: 123123, sum: 30 });

        expect(res.status).toBe(400);
        expect(res.body.id).toBe('invalid_description');
    });

    it('should return invalid_description when description is an empty string', async () => {
        const res = await request(app)
            .post('/api/add')
            .send({ description: '   ', category: 'food', userid: 123123, sum: 30 });

        expect(res.status).toBe(400);
        expect(res.body.id).toBe('invalid_description');
    });

    it('should return invalid_category when category is not a string', async () => {
        const res = await request(app)
            .post('/api/add')
            .send({ description: 'lunch', category: 99, userid: 123123, sum: 30 });

        expect(res.status).toBe(400);
        expect(res.body.id).toBe('invalid_category');
    });

    it('should return invalid_category when category is not one of the allowed values', async () => {
        const res = await request(app)
            .post('/api/add')
            .send({ description: 'lunch', category: 'cars', userid: 123123, sum: 30 });

        expect(res.status).toBe(400);
        expect(res.body.id).toBe('invalid_category');
    });

    it('should return invalid_userid when userid is not a number', async () => {
        const res = await request(app)
            .post('/api/add')
            .send({ description: 'lunch', category: 'food', userid: 'abc', sum: 30 });

        expect(res.status).toBe(400);
        expect(res.body.id).toBe('invalid_userid');
    });

    it('should return invalid_userid when userid is NaN', async () => {
        const res = await request(app)
            .post('/api/add')
            .send({ description: 'lunch', category: 'food', userid: NaN, sum: 30 });

        expect(res.status).toBe(400);
        expect(res.body.id).toBe('invalid_userid');
    });

    it('should return invalid_userid when userid is a decimal', async () => {
        const res = await request(app)
            .post('/api/add')
            .send({ description: 'lunch', category: 'food', userid: 123.5, sum: 30 });

        expect(res.status).toBe(400);
        expect(res.body.id).toBe('invalid_userid');
    });

    it('should return invalid_userid when userid is negative', async () => {
        const res = await request(app)
            .post('/api/add')
            .send({ description: 'lunch', category: 'food', userid: -1, sum: 30 });

        expect(res.status).toBe(400);
        expect(res.body.id).toBe('invalid_userid');
    });

    it('should return invalid_sum when sum is not a number', async () => {
        const res = await request(app)
            .post('/api/add')
            .send({ description: 'lunch', category: 'food', userid: 123123, sum: 'abc' });

        expect(res.status).toBe(400);
        expect(res.body.id).toBe('invalid_sum');
    });

    it('should return invalid_sum when sum is NaN', async () => {
        const res = await request(app)
            .post('/api/add')
            .send({ description: 'lunch', category: 'food', userid: 123123, sum: NaN });

        expect(res.status).toBe(400);
        expect(res.body.id).toBe('invalid_sum');
    });

    it('should return invalid_sum when sum is zero or negative', async () => {
        const res = await request(app)
            .post('/api/add')
            .send({ description: 'lunch', category: 'food', userid: 123123, sum: -10 });

        expect(res.status).toBe(400);
        expect(res.body.id).toBe('invalid_sum');
    });

    it('should return invalid_date when date is not a string', async () => {
        const res = await request(app)
            .post('/api/add')
            .send({ description: 'lunch', category: 'food', userid: 123123, sum: 30, date: 12345678 });

        expect(res.status).toBe(400);
        expect(res.body.id).toBe('invalid_date');
    });

    // Date format validation — unparseable date string should return invalid_date
    it('should return invalid_date when date format is not parseable', async () => {
        const res = await request(app)
            .post('/api/add')
            .send({ description: 'bad date', category: 'food', userid: 123123, sum: 10, date: 'not-a-date' });

        expect(res.status).toBe(400);
        expect(res.body.id).toBe('invalid_date');
    });

    // Past date validation — dates in the past must be rejected
    it('should return invalid_date when a past date is provided', async () => {
        const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

        const res = await request(app)
            .post('/api/add')
            .send({ description: 'old item', category: 'health', userid: 123123, sum: 20, date: pastDate });

        expect(res.status).toBe(400);
        expect(res.body.id).toBe('invalid_date');
    });

    // A valid future date should be accepted without error
    it('should accept a valid future date without error', async () => {
        const res = await request(app)
            .post('/api/add')
            .send({ description: 'future item', category: 'sports', userid: 123123, sum: 15, date: futureDate });

        expect(res.status).toBe(201);
    });

    // User existence validation — userid must exist in the database
    it('should return user_not_found when the user does not exist', async () => {
        mockUserFindOne.mockResolvedValue(null);

        const res = await request(app)
            .post('/api/add')
            .send({ description: 'lunch', category: 'food', userid: 999999, sum: 30 });

        expect(res.status).toBe(404);
        expect(res.body.id).toBe('user_not_found');
    });

    // Response headers should always indicate JSON content
    it('should return content-type JSON', async () => {
        const res = await request(app)
            .post('/api/add')
            .send({ description: 'lunch', category: 'food', userid: 123123, sum: 30 });

        expect(res.headers['content-type']).toMatch(/json/);
    });

    // All 5 valid categories should be accepted
    it('should accept all 5 valid categories', async () => {
        const categories = ['food', 'health', 'housing', 'sports', 'education'];

        for (const category of categories) {
            const res = await request(app)
                .post('/api/add')
                .send({ description: 'item', category, userid: 123123, sum: 10 });

            // Each valid category should succeed with 201
            expect(res.status).toBe(201);
        }
    });
});

describe('GET /api/report', () => {
    // Reset all mocks before each test
    beforeEach(() => {
        jest.clearAllMocks();
        // Default: no cached report, costs find returns empty array
        mockReportFindOne.mockResolvedValue(null);
        mockReportCreate.mockResolvedValue({});
        mockCostsFind.mockResolvedValue([]);
    });

    // Happy path — valid request should return 200
    it('should return status 200 for a valid report request', async () => {
        const res = await request(app)
            .get('/api/report')
            .query({ id: 123123, year: 2025, month: 1 });

        expect(res.status).toBe(200);
    });

    // Each missing parameter should return its specific error id
    it('should return missing_id when id is absent', async () => {
        const res = await request(app)
            .get('/api/report')
            .query({ year: 2025, month: 1 });

        expect(res.status).toBe(400);
        expect(res.body.id).toBe('missing_id');
    });

    it('should return missing_year when year is absent', async () => {
        const res = await request(app)
            .get('/api/report')
            .query({ id: 123123, month: 1 });

        expect(res.status).toBe(400);
        expect(res.body.id).toBe('missing_year');
    });

    it('should return missing_month when month is absent', async () => {
        const res = await request(app)
            .get('/api/report')
            .query({ id: 123123, year: 2025 });

        expect(res.status).toBe(400);
        expect(res.body.id).toBe('missing_month');
    });

    // Parameter content validation — each invalid param should return its specific error id
    it('should return invalid_id when id is not a number', async () => {
        const res = await request(app)
            .get('/api/report')
            .query({ id: 'abc', year: 2025, month: 1 });

        expect(res.status).toBe(400);
        expect(res.body.id).toBe('invalid_id');
    });

    it('should return invalid_id when id is a decimal', async () => {
        const res = await request(app)
            .get('/api/report')
            .query({ id: 123.5, year: 2025, month: 1 });

        expect(res.status).toBe(400);
        expect(res.body.id).toBe('invalid_id');
    });

    it('should return invalid_id when id is negative', async () => {
        const res = await request(app)
            .get('/api/report')
            .query({ id: -1, year: 2025, month: 1 });

        expect(res.status).toBe(400);
        expect(res.body.id).toBe('invalid_id');
    });

    it('should return invalid_year when year is not a number', async () => {
        const res = await request(app)
            .get('/api/report')
            .query({ id: 123123, year: 'abc', month: 1 });

        expect(res.status).toBe(400);
        expect(res.body.id).toBe('invalid_year');
    });

    it('should return invalid_year when year is a decimal', async () => {
        const res = await request(app)
            .get('/api/report')
            .query({ id: 123123, year: 2025.5, month: 1 });

        expect(res.status).toBe(400);
        expect(res.body.id).toBe('invalid_year');
    });

    it('should return invalid_year when year is negative', async () => {
        const res = await request(app)
            .get('/api/report')
            .query({ id: 123123, year: -2025, month: 1 });

        expect(res.status).toBe(400);
        expect(res.body.id).toBe('invalid_year');
    });

    it('should return invalid_month when month is not a number', async () => {
        const res = await request(app)
            .get('/api/report')
            .query({ id: 123123, year: 2025, month: 'abc' });

        expect(res.status).toBe(400);
        expect(res.body.id).toBe('invalid_month');
    });

    it('should return invalid_month when month is a decimal', async () => {
        const res = await request(app)
            .get('/api/report')
            .query({ id: 123123, year: 2025, month: 3.5 });

        expect(res.status).toBe(400);
        expect(res.body.id).toBe('invalid_month');
    });

    // Month range validation — must be between 1 and 12
    it('should return invalid_month when month is below 1', async () => {
        const res = await request(app)
            .get('/api/report')
            .query({ id: 123123, year: 2025, month: 0 });

        expect(res.status).toBe(400);
        expect(res.body.id).toBe('invalid_month');
    });

    it('should return invalid_month when month is above 12', async () => {
        const res = await request(app)
            .get('/api/report')
            .query({ id: 123123, year: 2025, month: 13 });

        expect(res.status).toBe(400);
        expect(res.body.id).toBe('invalid_month');
    });

    // Response shape — should always include these 4 fields
    it('should return a report object with userid, year, month and costs fields', async () => {
        const res = await request(app)
            .get('/api/report')
            .query({ id: 123123, year: 2025, month: 1 });

        expect(res.body).toHaveProperty('userid');
        expect(res.body).toHaveProperty('year');
        expect(res.body).toHaveProperty('month');
        expect(res.body).toHaveProperty('costs');
    });

    // Costs structure — must be an array with exactly 5 category groups
    it('should return costs as an array', async () => {
        const res = await request(app)
            .get('/api/report')
            .query({ id: 123123, year: 2025, month: 1 });

        expect(Array.isArray(res.body.costs)).toBe(true);
    });

    it('should return exactly 5 category groups in costs', async () => {
        const res = await request(app)
            .get('/api/report')
            .query({ id: 123123, year: 2025, month: 1 });

        expect(res.body.costs).toHaveLength(5);
    });

    it('should include all 5 required categories in the costs array', async () => {
        const res = await request(app)
            .get('/api/report')
            .query({ id: 123123, year: 2025, month: 1 });

        // Extract the category keys from each object in the array
        const categoryKeys = res.body.costs.map((item) => Object.keys(item)[0]);
        expect(categoryKeys).toContain('food');
        expect(categoryKeys).toContain('health');
        expect(categoryKeys).toContain('housing');
        expect(categoryKeys).toContain('sports');
        expect(categoryKeys).toContain('education');
    });

    // Data integrity — returned values should match what was requested
    it('should return the correct userid in the response', async () => {
        const res = await request(app)
            .get('/api/report')
            .query({ id: 123123, year: 2025, month: 1 });

        expect(res.body.userid).toBe(123123);
    });

    it('should return the correct year and month in the response', async () => {
        const res = await request(app)
            .get('/api/report')
            .query({ id: 123123, year: 2025, month: 3 });

        expect(res.body.year).toBe(2025);
        expect(res.body.month).toBe(3);
    });

    // Response headers should always indicate JSON content
    it('should return content-type JSON', async () => {
        const res = await request(app)
            .get('/api/report')
            .query({ id: 123123, year: 2025, month: 1 });

        expect(res.headers['content-type']).toMatch(/json/);
    });

    // Computed Design Pattern — past month reports should be served from cache
    it('should serve a cached report for a past month when one exists', async () => {
        // Provide a pre-existing cached report
        const cachedCosts = [
            { food: [{ sum: 10, description: 'snack', day: 5 }] },
            { health: [] },
            { housing: [] },
            { sports: [] },
            { education: [] }
        ];
        mockReportFindOne.mockResolvedValue({
            userid: 123123,
            year: 2020,
            month: 1,
            costs: cachedCosts
        });

        const res = await request(app)
            .get('/api/report')
            .query({ id: 123123, year: 2020, month: 1 });

        // Should return cached data without calling Report.create again
        expect(res.status).toBe(200);
        expect(res.body.costs[0].food[0].description).toBe('snack');
        expect(mockReportCreate).not.toHaveBeenCalled();
    });

    // Computed Design Pattern — uncached past month should be computed and saved
    it('should save a new report to the cache for a past month with no cached entry', async () => {
        // No cache — Report.create should be called once
        mockReportFindOne.mockResolvedValue(null);

        await request(app)
            .get('/api/report')
            .query({ id: 123123, year: 2020, month: 1 });

        expect(mockReportCreate).toHaveBeenCalledTimes(1);
    });

    // Computed Design Pattern — current and future months must never be cached
    it('should NOT cache a report for the current or future month', async () => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;

        await request(app)
            .get('/api/report')
            .query({ id: 123123, year: currentYear, month: currentMonth });

        // Report.create must never be called for the current month
        expect(mockReportCreate).not.toHaveBeenCalled();
    });
});
