const cron = require('node-cron');
const reportService = require('../services/report.service');
const logger = require('../utils/logger');

// Daily summary report. Time + timezone are configurable:
//   REPORT_CRON  – cron expression (default 8:00 AM every day)
//   REPORT_TZ    – IANA timezone for the schedule (default UTC)
// Set REPORT_ENABLED=false to turn the schedule off entirely.
const startReportScheduler = () => {
  if (process.env.REPORT_ENABLED === 'false') {
    logger.info('Daily report scheduler disabled (REPORT_ENABLED=false)');
    return;
  }
  const expr = process.env.REPORT_CRON || '0 8 * * *';
  const tz = process.env.REPORT_TZ || 'UTC';

  if (!cron.validate(expr)) {
    logger.error('Invalid REPORT_CRON expression; scheduler not started', { expr });
    return;
  }

  cron.schedule(expr, async () => {
    try {
      const res = await reportService.runDailyReport();
      logger.info('Daily report dispatched', { sent: res.sent });
    } catch (err) {
      logger.error('Daily report job failed', { error: err.message });
    }
  }, { timezone: tz });

  logger.info('Daily report scheduler started', { expr, tz });
};

module.exports = { startReportScheduler };
