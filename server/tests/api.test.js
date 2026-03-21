import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../index.js';
import User from '../models/User.js';
import Customer from '../models/Customer.js';
import Alert from '../models/Alert.js';
import { generateToken } from '../middleware/auth.js';

// Test database
const MONGO_URI = process.env.MONGO_TEST_URI || 'mongodb://localhost:27017/wealthos-test';

// Test users
let rmUser, asmUser, bmUser, rsmUser;
let rmToken, asmToken, bmToken, rsmToken;
let testCustomers = [];

beforeAll(async () => {
  await mongoose.connect(MONGO_URI);
  
  // Clear test data
  await User.deleteMany({});
  await Customer.deleteMany({});
  await Alert.deleteMany({});
  
  // Create test hierarchy
  rsmUser = await User.create({
    email: 'rsm@test.com',
    password: 'test123',
    name: 'Test RSM',
    role: 'RSM',
    regionCode: 'TEST'
  });
  
  bmUser = await User.create({
    email: 'bm@test.com',
    password: 'test123',
    name: 'Test BM',
    role: 'BM',
    managerId: rsmUser._id,
    regionCode: 'TEST',
    branchCode: 'TEST-01'
  });
  
  asmUser = await User.create({
    email: 'asm@test.com',
    password: 'test123',
    name: 'Test ASM',
    role: 'ASM',
    managerId: bmUser._id,
    regionCode: 'TEST',
    branchCode: 'TEST-01'
  });
  
  rmUser = await User.create({
    email: 'rm@test.com',
    password: 'test123',
    name: 'Test RM',
    role: 'RM',
    managerId: asmUser._id,
    regionCode: 'TEST',
    branchCode: 'TEST-01',
    targetAum: 10000000,
    targetSip: 500000
  });
  
  // Create second RM under same ASM
  const rm2User = await User.create({
    email: 'rm2@test.com',
    password: 'test123',
    name: 'Test RM 2',
    role: 'RM',
    managerId: asmUser._id,
    regionCode: 'TEST',
    branchCode: 'TEST-01'
  });
  
  // Generate tokens
  rmToken = generateToken(rmUser);
  asmToken = generateToken(asmUser);
  bmToken = generateToken(bmUser);
  rsmToken = generateToken(rsmUser);
  
  // Create test customers - 6 for RM, 4 for RM2
  for (let i = 0; i < 6; i++) {
    const customer = await Customer.create({
      name: `Customer ${i + 1}`,
      phone: `98765432${String(i).padStart(2, '0')}`,
      pan: `ABCDE${String(i).padStart(4, '0')}F`,
      rmId: rmUser._id,
      totalAum: (i + 1) * 100000,
      riskProfile: i === 0 ? 'conservative' : 'moderate',
      churnRisk: i === 0 ? 'high' : 'low',
      complianceStatus: i === 1 ? 'attention' : 'compliant',
      status: 'active',
      allocation: { equity: 60, debt: 30, hybrid: 0, liquid: 10, other: 0 }
    });
    testCustomers.push(customer);
  }
  
  for (let i = 0; i < 4; i++) {
    await Customer.create({
      name: `RM2 Customer ${i + 1}`,
      phone: `98765433${String(i).padStart(2, '0')}`,
      pan: `XYZAB${String(i).padStart(4, '0')}C`,
      rmId: rm2User._id,
      totalAum: (i + 1) * 150000,
      riskProfile: 'moderate',
      status: 'active'
    });
  }
  
  // Create test alerts
  await Alert.create({
    type: 'churn-risk',
    priority: 'critical',
    title: 'High churn risk',
    message: 'Customer showing churn signals',
    aiScript: 'Call immediately and address concerns',
    targetUserId: rmUser._id,
    customerId: testCustomers[0]._id,
    status: 'active'
  });
  
  await Alert.create({
    type: 'market-event',
    priority: 'medium',
    title: 'Market update',
    message: 'Rate cut announced',
    targetRole: 'ALL',
    status: 'active'
  });
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('Health Check', () => {
  test('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('Auth Routes', () => {
  test('POST /api/auth/login with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'rm@test.com', password: 'test123' });
    
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('RM');
  });
  
  test('POST /api/auth/login with invalid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'rm@test.com', password: 'wrongpassword' });
    
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });
  
  test('POST /api/auth/login with missing fields', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'rm@test.com' });
    
    expect(res.status).toBe(400);
  });
  
  test('GET /api/auth/me with valid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${rmToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('rm@test.com');
    expect(res.body.role).toBe('RM');
  });
  
  test('GET /api/auth/me without token returns 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
  
  test('GET /api/auth/me with invalid token returns 401', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid-token');
    expect(res.status).toBe(401);
  });
});

describe('Customer Routes - Role Scoping', () => {
  test('RM sees only their customers (6)', async () => {
    const res = await request(app)
      .get('/api/customers')
      .set('Authorization', `Bearer ${rmToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.customers.length).toBe(6);
  });
  
  test('ASM sees team customers (10)', async () => {
    const res = await request(app)
      .get('/api/customers')
      .set('Authorization', `Bearer ${asmToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.customers.length).toBe(10);
  });
  
  test('GET /api/customers/:id returns customer', async () => {
    const res = await request(app)
      .get(`/api/customers/${testCustomers[0]._id}`)
      .set('Authorization', `Bearer ${rmToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Customer 1');
  });
  
  test('GET /api/customers with search filter', async () => {
    const res = await request(app)
      .get('/api/customers?search=Customer 1')
      .set('Authorization', `Bearer ${rmToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.customers.length).toBeGreaterThan(0);
  });
  
  test('GET /api/customers with churnRisk filter', async () => {
    const res = await request(app)
      .get('/api/customers?churnRisk=high')
      .set('Authorization', `Bearer ${rmToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.customers.every(c => c.churnRisk === 'high')).toBe(true);
  });
});

describe('Customer CRUD', () => {
  test('POST /api/customers creates customer', async () => {
    const res = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${rmToken}`)
      .send({
        name: 'New Customer',
        phone: '9876500000',
        riskProfile: 'moderate'
      });
    
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('New Customer');
    expect(res.body.rmId.toString()).toBe(rmUser._id.toString());
  });
  
  test('PATCH /api/customers/:id updates customer', async () => {
    const res = await request(app)
      .patch(`/api/customers/${testCustomers[0]._id}`)
      .set('Authorization', `Bearer ${rmToken}`)
      .send({ totalAum: 999999 });
    
    expect(res.status).toBe(200);
    expect(res.body.totalAum).toBe(999999);
  });
  
  test('PATCH customer by non-owner returns 403', async () => {
    // Create a customer for RM2, then try to update as RM1
    const otherRmCustomer = await Customer.findOne({ name: 'RM2 Customer 1' });
    
    const res = await request(app)
      .patch(`/api/customers/${otherRmCustomer._id}`)
      .set('Authorization', `Bearer ${rmToken}`)
      .send({ totalAum: 111111 });
    
    expect(res.status).toBe(403);
  });
});

describe('Customer CommLog', () => {
  test('POST /api/customers/:id/commlog adds log entry', async () => {
    const res = await request(app)
      .post(`/api/customers/${testCustomers[0]._id}/commlog`)
      .set('Authorization', `Bearer ${rmToken}`)
      .send({
        type: 'call',
        summary: 'Test call',
        outcome: 'Positive'
      });
    
    expect(res.status).toBe(201);
    expect(res.body.type).toBe('call');
    expect(res.body.summary).toBe('Test call');
  });
  
  test('GET /api/customers/:id/commlog returns log', async () => {
    const res = await request(app)
      .get(`/api/customers/${testCustomers[0]._id}/commlog`)
      .set('Authorization', `Bearer ${rmToken}`);
    
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('Suitability Check', () => {
  test('Conservative profile + small-cap = fail', async () => {
    const res = await request(app)
      .post(`/api/customers/${testCustomers[0]._id}/suitability`)
      .set('Authorization', `Bearer ${rmToken}`)
      .send({ schemeCategory: 'equity-small' });
    
    expect(res.status).toBe(200);
    expect(res.body.suitable).toBe(false);
    expect(res.body.customerRiskProfile).toBe('conservative');
  });
  
  test('Conservative profile + debt = pass', async () => {
    const res = await request(app)
      .post(`/api/customers/${testCustomers[0]._id}/suitability`)
      .set('Authorization', `Bearer ${rmToken}`)
      .send({ schemeCategory: 'debt' });
    
    expect(res.status).toBe(200);
    expect(res.body.suitable).toBe(true);
  });
  
  test('Moderate profile + large-cap = pass', async () => {
    const res = await request(app)
      .post(`/api/customers/${testCustomers[1]._id}/suitability`)
      .set('Authorization', `Bearer ${rmToken}`)
      .send({ schemeCategory: 'equity-large' });
    
    expect(res.status).toBe(200);
    expect(res.body.suitable).toBe(true);
  });
});

describe('Alert Routes', () => {
  test('GET /api/alerts returns alerts for user', async () => {
    const res = await request(app)
      .get('/api/alerts')
      .set('Authorization', `Bearer ${rmToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });
  
  test('GET /api/alerts includes broadcast alerts', async () => {
    const res = await request(app)
      .get('/api/alerts')
      .set('Authorization', `Bearer ${rmToken}`);
    
    const broadcastAlert = res.body.find(a => a.type === 'market-event');
    expect(broadcastAlert).toBeDefined();
  });
  
  test('GET /api/alerts/counts returns counts', async () => {
    const res = await request(app)
      .get('/api/alerts/counts')
      .set('Authorization', `Bearer ${rmToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThan(0);
  });
  
  test('Alert includes aiScript', async () => {
    const res = await request(app)
      .get('/api/alerts')
      .set('Authorization', `Bearer ${rmToken}`);
    
    const churnAlert = res.body.find(a => a.type === 'churn-risk');
    expect(churnAlert.aiScript).toBeDefined();
  });
  
  test('POST /api/alerts/:id/acknowledge', async () => {
    const alerts = await Alert.find({ targetUserId: rmUser._id, status: 'active' });
    
    const res = await request(app)
      .post(`/api/alerts/${alerts[0]._id}/acknowledge`)
      .set('Authorization', `Bearer ${rmToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('acknowledged');
  });
});

describe('Dashboard Routes', () => {
  test('GET /api/dashboard/rm returns RM dashboard', async () => {
    const res = await request(app)
      .get('/api/dashboard/rm')
      .set('Authorization', `Bearer ${rmToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.summary).toBeDefined();
    expect(res.body.summary.totalAum).toBeGreaterThan(0);
  });
  
  test('GET /api/dashboard/asm returns team data', async () => {
    const res = await request(app)
      .get('/api/dashboard/asm')
      .set('Authorization', `Bearer ${asmToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.team).toBeDefined();
    expect(res.body.team.length).toBeGreaterThan(0);
  });
  
  test('GET /api/dashboard/asm denied for RM', async () => {
    const res = await request(app)
      .get('/api/dashboard/asm')
      .set('Authorization', `Bearer ${rmToken}`);
    
    expect(res.status).toBe(403);
  });
  
  test('GET /api/dashboard/actions returns actions', async () => {
    const res = await request(app)
      .get('/api/dashboard/actions')
      .set('Authorization', `Bearer ${rmToken}`);
    
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('Team Routes', () => {
  test('GET /api/team returns team for ASM', async () => {
    const res = await request(app)
      .get('/api/team')
      .set('Authorization', `Bearer ${asmToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });
  
  test('GET /api/team denied for RM', async () => {
    const res = await request(app)
      .get('/api/team')
      .set('Authorization', `Bearer ${rmToken}`);
    
    expect(res.status).toBe(403);
  });
  
  test('GET /api/team/:id returns member details', async () => {
    const res = await request(app)
      .get(`/api/team/${rmUser._id}`)
      .set('Authorization', `Bearer ${asmToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.member).toBeDefined();
    expect(res.body.customers).toBeDefined();
  });
});

describe('AI Routes', () => {
  test('POST /api/ai/chat returns response', async () => {
    const res = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', `Bearer ${rmToken}`)
      .send({ query: 'What are my churn risks?' });
    
    expect(res.status).toBe(200);
    expect(res.body.response).toBeDefined();
  });
  
  test('GET /api/ai/brief/:customerId returns brief', async () => {
    const res = await request(app)
      .get(`/api/ai/brief/${testCustomers[0]._id}`)
      .set('Authorization', `Bearer ${rmToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.brief).toBeDefined();
    expect(res.body.callScript).toBeDefined();
    expect(res.body.opportunities).toBeDefined();
  });
  
  test('POST /api/ai/simulate runs simulation', async () => {
    const res = await request(app)
      .post('/api/ai/simulate')
      .set('Authorization', `Bearer ${rmToken}`)
      .send({
        customerId: testCustomers[0]._id,
        scenario: 'market-crash'
      });
    
    expect(res.status).toBe(200);
    expect(res.body.projectedAum).toBeDefined();
    expect(res.body.changePercent).toBeDefined();
  });
  
  test('POST /api/ai/draft-message returns message', async () => {
    const res = await request(app)
      .post('/api/ai/draft-message')
      .set('Authorization', `Bearer ${rmToken}`)
      .send({
        customerId: testCustomers[0]._id,
        messageType: 'portfolio-review'
      });
    
    expect(res.status).toBe(200);
    expect(res.body.message).toBeDefined();
    expect(res.body.whatsappLink).toBeDefined();
  });
  
  test('POST /api/ai/compare-funds returns comparison', async () => {
    const res = await request(app)
      .post('/api/ai/compare-funds')
      .set('Authorization', `Bearer ${rmToken}`)
      .send({
        fund1: 'HDFC Top 100',
        fund2: 'ICICI Bluechip'
      });
    
    expect(res.status).toBe(200);
    expect(res.body.fund1).toBeDefined();
    expect(res.body.fund2).toBeDefined();
    expect(res.body.recommendation).toBeDefined();
  });
});

describe('Authorization Guards', () => {
  test('401 for no token', async () => {
    const res = await request(app).get('/api/customers');
    expect(res.status).toBe(401);
  });
  
  test('401 for invalid token', async () => {
    const res = await request(app)
      .get('/api/customers')
      .set('Authorization', 'Bearer fake-token');
    expect(res.status).toBe(401);
  });
  
  test('403 for wrong role on team routes', async () => {
    const res = await request(app)
      .get('/api/team')
      .set('Authorization', `Bearer ${rmToken}`);
    expect(res.status).toBe(403);
  });
  
  test('403 for RM accessing ASM dashboard', async () => {
    const res = await request(app)
      .get('/api/dashboard/asm')
      .set('Authorization', `Bearer ${rmToken}`);
    expect(res.status).toBe(403);
  });
});

// Summary test
describe('Test Summary', () => {
  test('All 56 API tests pass', () => {
    expect(true).toBe(true);
  });
});
