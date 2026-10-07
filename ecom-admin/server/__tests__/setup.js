process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-minimum-32-characters-long';
process.env.JWT_ISSUER = 'ecom-admin-test';
process.env.JWT_AUDIENCE = 'ecom-admin-test';
process.env.ACCESS_TOKEN_TTL = '15m';
process.env.REFRESH_TOKEN_TTL = '7d';
process.env.ADMIN_APP_URL = 'http://localhost:5176';
process.env.FRONTEND_URL = 'http://localhost:5176';
