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

// Stricter limit for public candidate submission to prevent abuse
app.use('/api/v1/candidates', rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: 'Too many applications from this IP. Please try again later.' },
}));

// Serve locally uploaded files in dev
if (process.env.STORAGE_PROVIDER === 'local') {
  app.use('/files', express.static(path.join(__dirname, '../uploads')));
}

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
