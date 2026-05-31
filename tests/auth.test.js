require('./helpers/testSetup');

const request = require('supertest');
const app     = require('../src/app');
const prisma  = require('../src/config/db');

// Test credentials
const TEST_ORG    = 'Test Corp ' + Date.now();
const TEST_EMAIL  = `test_${Date.now()}@testcorp.com`;
const TEST_PASS   = 'Test@1234';

let accessToken;

// Cleanup after all tests
afterAll(async () => {
  // Remove test user + org (cascade deletes refresh tokens)
  await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
  await prisma.organization.deleteMany({ where: { name: TEST_ORG } });
  await prisma.$disconnect();
});

// ── Test 1: Registration ──────────────────────────────────────
describe('POST /api/v1/auth/register', () => {
  it('should register a new org and ADMIN user', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ orgName: TEST_ORG, firstName: 'Test', lastName: 'User', email: TEST_EMAIL, password: TEST_PASS });

    expect(res.status).toBe(201);
    expect(res.body.data.user.email).toBe(TEST_EMAIL);
    expect(res.body.data.user.role).toBe('ADMIN');
  });

  it('should reject duplicate email with 409 CONFLICT', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ orgName: 'Another Corp', firstName: 'Test', lastName: 'User', email: TEST_EMAIL, password: TEST_PASS });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('CONFLICT');
  });

  it('should reject missing required fields with 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'noemail@test.com' }); // missing orgName, firstName, etc.

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });
});

// ── Test 2: Login ─────────────────────────────────────────────
describe('POST /api/v1/auth/login', () => {
  it('should login and return access token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASS });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    accessToken = res.body.data.accessToken; // save for later tests
  });

  it('should reject wrong password with 401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: TEST_EMAIL, password: 'WrongPass' });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('AUTHENTICATION_ERROR');
  });

  it('should reject non-existent user with 401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'notreal@nowhere.com', password: TEST_PASS });

    expect(res.status).toBe(401);
  });
});

// ── Test 3: Protected route with access token ─────────────────
describe('GET /api/v1/users (requires ADMIN)', () => {
  it('should return users list for authenticated ADMIN', async () => {
    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('should reject request without token with 401', async () => {
    const res = await request(app).get('/api/v1/users');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('AUTHENTICATION_ERROR');
  });
});
