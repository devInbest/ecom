require('dotenv').config();
require('express-async-errors');

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');

require('./src/config/env');
const env = require('./src/config/env');
const connectDB = require('./src/config/db');
const errorHandler = require('./src/middleware/errorHandler');
const { csrfProtection } = require('./src/auth/middleware/csrf');
const authRoutes = require('./src/auth/routes/authRoutes');
const dashboardRoutes = require('./src/routes/dashboard');
const productRoutes = require('./src/routes/products');
const categoryRoutes = require('./src/routes/categories');
const subcategoryRoutes = require('./src/routes/subcategories');
const uploadRoutes = require('./src/routes/uploads');
const orderRoutes = require('./src/routes/orders');

const app = express();

const normalizeOrigin = (value = '') =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/\/+$/, '');

const allowedOrigins = env.corsOrigins.map(normalizeOrigin);

app.set('trust proxy', 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: env.isProduction ? undefined : false,
    hsts: env.isProduction ? { maxAge: 31536000, includeSubDomains: true } : false,
  })
);
app.use(compression());

const isAllowedOrigin = (origin) => {
  const normalizedOrigin = normalizeOrigin(origin);
  if (allowedOrigins.includes(normalizedOrigin)) return true;
  try {
    const { hostname } = new URL(origin);
    if (!env.isProduction && (hostname.endsWith('.vercel.app') || hostname.endsWith('.onrender.com'))) {
      return true;
    }
  } catch {
    return false;
  }
  return false;
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (isAllowedOrigin(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
  })
);
app.use(morgan('dev'));

app.get('/', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Ecom Admin API',
    health: '/api/v1/health',
    basePath: '/api/v1',
  });
});

app.get('/api/v1/health', (req, res) => {
  const dbStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.json({
    status: 'OK',
    message: 'Ecom Admin API is running',
    database: dbStates[mongoose.connection.readyState] || 'unknown',
    deployedAt: new Date().toISOString(),
  });
});

app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    next(error);
  }
});

app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(csrfProtection);

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/subcategories', subcategoryRoutes);
app.use('/api/v1/uploads', uploadRoutes);
app.use('/api/v1/orders', orderRoutes);

app.use(errorHandler);

if (require.main === module) {
  const PORT = process.env.PORT || 5004;
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Ecom Admin API running on port ${PORT}`);
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Stop the other process or change PORT in server/.env`);
      process.exit(1);
    }
    throw err;
  });
}

module.exports = app;
