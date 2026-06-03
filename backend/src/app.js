if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const routes = require('./routes');
const { errorHandler } = require('./middleware/errorHandler.middleware');
const logger = require('./utils/logger');

const app = express();

// Trust Railway's reverse proxy so rate-limiter can read the real client IP
app.set('trust proxy', 1);

// CORS must be before helmet so security headers don't interfere
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Serve uploaded files before helmet so security headers don't block file viewing
if (process.env.STORAGE_PROVIDER === 'local') {
  app.use('/files', (req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  }, express.static(path.join(__dirname, '../uploads')));
}

app.use(helmet());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// General API rate limit
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
}));

// Limit only the actual application submission (not system-check / language
// lookups, and not GETs). 100/hour per IP still blocks abuse while allowing
// shared office/NAT networks and testing to work normally.
app.use('/api/v1/candidates', rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many applications from this IP. Please try again later.' },
  skip: (req) => req.method !== 'POST' || req.originalUrl.includes('system-check'),
}));

app.use('/api/v1', routes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Recruitment API running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});

module.exports = app;
