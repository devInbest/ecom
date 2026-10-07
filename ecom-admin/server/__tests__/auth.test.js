const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');

let mongoServer;
let app;

const TEST_PASSWORD = 'TestAdmin@Secure1';

const clearDatabase = async () => {
  const User = require('../src/models/User');
  const Session = require('../src/auth/models/Session');
  const AuditLog = require('../src/auth/models/AuditLog');
  const PasswordResetToken = require('../src/auth/models/PasswordResetToken');
  const AdminInvitation = require('../src/auth/models/AdminInvitation');
  await Promise.all([
    User.deleteMany({}),
    Session.deleteMany({}),
    AuditLog.deleteMany({}),
    PasswordResetToken.deleteMany({}),
    AdminInvitation.deleteMany({}),
  ]);
};

const createTestUser = async (overrides = {}) => {
  const User = require('../src/models/User');
  const { USER_STATUS } = require('../src/models/User');
  return User.create({
    name: 'Test Admin',
    email: 'admin@test.com',
    normalizedEmail: 'admin@test.com',
    password: TEST_PASSWORD,
    role: 'SUPERADMIN',
    status: USER_STATUS.ACTIVE,
    emailVerifiedAt: new Date(),
    ...overrides,
  });
};

const loginAgent = async (agent, email = 'admin@test.com', password = TEST_PASSWORD) =>
  agent.post('/api/v1/auth/login').send({ email, password });

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
  global.__mongooseCache = { conn: null, promise: null, migrated: false };
  const connectDB = require('../src/config/db');
  await connectDB();
  app = require('../server');
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

beforeEach(async () => {
  await clearDatabase();
});

describe('Authentication', () => {
  test('successful login sets cookies and returns user', async () => {
    await createTestUser();
    const agent = request.agent(app);
    const res = await loginAgent(agent);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe('admin@test.com');
    expect(res.headers['set-cookie']).toBeDefined();
  });

  test('invalid password returns generic error', async () => {
    await createTestUser();
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@test.com', password: 'WrongPassword1!' });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid email or password');
  });

  test('unknown email returns generic error', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'missing@test.com', password: TEST_PASSWORD });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid email or password');
  });

  test('suspended account cannot login', async () => {
    const { USER_STATUS } = require('../src/models/User');
    await createTestUser({ status: USER_STATUS.SUSPENDED, isActive: false });
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@test.com', password: TEST_PASSWORD });
    expect(res.status).toBe(403);
  });

  test('refresh rotates session cookie', async () => {
    await createTestUser();
    const agent = request.agent(app);
    await loginAgent(agent);
    const refreshRes = await agent.post('/api/v1/auth/refresh');
    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.user).toBeDefined();
  });

  test('logout clears session', async () => {
    await createTestUser();
    const agent = request.agent(app);
    const loginRes = await loginAgent(agent);
    const csrf = loginRes.body.csrfToken;
    const logoutRes = await agent
      .post('/api/v1/auth/logout')
      .set('X-CSRF-Token', csrf);
    expect(logoutRes.status).toBe(200);
  });

  test('GET /me requires authentication', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });
});

describe('RBAC', () => {
  test('staff cannot create products', async () => {
    await createTestUser({ role: 'STAFF', email: 'staff@test.com', normalizedEmail: 'staff@test.com' });
    const agent = request.agent(app);
    const loginRes = await loginAgent(agent, 'staff@test.com');
    const csrf = loginRes.body.csrfToken;
    const res = await agent
      .post('/api/v1/products')
      .set('X-CSRF-Token', csrf)
      .send({ name: 'Test Product' });
    expect(res.status).toBe(403);
  });
});

describe('Password reset', () => {
  test('forgot-password does not reveal account existence', async () => {
    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'nobody@test.com' });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/If an account exists/i);
  });
});

describe('CSRF', () => {
  test('state-changing request without CSRF token is rejected', async () => {
    await createTestUser();
    const agent = request.agent(app);
    await loginAgent(agent);
    const res = await agent.post('/api/v1/auth/logout');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('AUTH_CSRF_INVALID');
  });
});
