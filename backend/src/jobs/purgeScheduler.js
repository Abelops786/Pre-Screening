const cron = require('node-cron');
const prisma = require('../config/database');
const logger = require('../utils/logger');

const RETENTION_DAYS = 15;

// Permanently remove candidates that were soft-deleted more than 15 days ago.
const purgeOldDeleted = async () => {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const res = await prisma.candidate.deleteMany({ where: { deletedAt: { not: null, lt: cutoff } } });
  if (res.count) logger.info('Purged soft-deleted candidates', { count: res.count });
  return res.count;
};

// Runs daily (PURGE_CRON, default 03:00). Disable with PURGE_ENABLED=false.
const startPurgeScheduler = () => {
  if (process.env.PURGE_ENABLED === 'false') {
    logger.info('Purge scheduler disabled (PURGE_ENABLED=false)');
    return;
  }
  const expr = process.env.PURGE_CRON || '0 3 * * *';
  const tz = process.env.REPORT_TZ || 'UTC';
  if (!cron.validate(expr)) {
    logger.error('Invalid PURGE_CRON expression; purge scheduler not started', { expr });
    return;
  }
  cron.schedule(expr, async () => {
    try {
      const count = await purgeOldDeleted();
      logger.info('Purge job ran', { purged: count });
    } catch (err) {
      logger.error('Purge job failed', { error: err.message });
    }
  }, { timezone: tz });
  logger.info('Purge scheduler started', { expr, tz });
};

module.exports = { startPurgeScheduler, purgeOldDeleted, RETENTION_DAYS };
