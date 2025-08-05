const request = require('supertest');
const app = require('../server');

// Mock the environment variables
process.env.NODE_ENV = 'test';

// Test the health check endpoint
describe('Health Check', () => {
  it('should return 200 and server status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('status', 'OK');
    expect(res.body).toHaveProperty('message', 'Social Connector Backend is running!');
  });
});

// Test 404 handler
describe('404 Handler', () => {
  it('should return 404 for non-existent routes', async () => {
    const res = await request(app).get('/api/non-existent-route');
    expect(res.statusCode).toEqual(404);
    expect(res.body).toHaveProperty('status', 'error');
    expect(res.body).toHaveProperty('message', 'Not Found');
  });
});

// Test LinkedIn routes (mocked)
describe('LinkedIn Routes', () => {
  describe('GET /api/linkedin/auth', () => {
    it('should redirect to LinkedIn OAuth', async () => {
      const res = await request(app).get('/api/linkedin/auth');
      expect(res.statusCode).toEqual(302);
      expect(res.headers.location).toContain('linkedin.com/oauth/v2/authorization');
    });
  });

  describe('POST /api/linkedin/post', () => {
    it('should require content and access token', async () => {
      const res = await request(app)
        .post('/api/linkedin/post')
        .send({});
      
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('error', 'Content and access token are required');
    });
  });
});

// Test Twitter routes (mocked)
describe('Twitter Routes', () => {
  describe('GET /api/twitter/auth', () => {
    it('should redirect to Twitter OAuth', async () => {
      const res = await request(app).get('/api/twitter/auth');
      expect(res.statusCode).toEqual(302);
      expect(res.headers.location).toContain('api.twitter.com/oauth/authorize');
    });
  });

  describe('POST /api/twitter/post', () => {
    it('should require content, access token, and access token secret', async () => {
      const res = await request(app)
        .post('/api/twitter/post')
        .send({});
      
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('error', 'Content, access token, and access token secret are required');
    });
  });
});

// Test Combined routes
describe('Combined Routes', () => {
  describe('POST /api/combined/post', () => {
    it('should require content', async () => {
      const res = await request(app)
        .post('/api/combined/post')
        .send({});
      
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('error', 'Content is required');
    });
  });

  describe('GET /api/combined/profile', () => {
    it('should return empty profiles when no tokens provided', async () => {
      const res = await request(app).get('/api/combined/profile');
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('linkedin', null);
      expect(res.body.data).toHaveProperty('twitter', null);
    });
  });
});
