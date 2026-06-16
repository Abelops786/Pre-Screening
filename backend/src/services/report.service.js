const prisma = require('../config/database');
const emailService = require('./email.service');
const logger = require('../utils/logger');

const DEPT_LABELS = {
  INTERPRETATION: 'Interpretation',
  SALES: 'Sales',
  CUSTOMER_SERVICE: 'Customer Service',
};

const FAILED_STATUSES = ['SYSTEM_CHECK_FAILED', 'REJECTED', 'AUTO_DISQUALIFIED'];

const DAY_MS = 24 * 60 * 60 * 1000;
const fmtDate = (d) => d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const startOfUTCDay = (d) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

// Resolve a report window from a preset key (or a custom from/to). Throws on
// an invalid custom range. Returns { since, until, label }.
const resolveRange = (range, from, to) => {
  const now = new Date();
  switch (range) {
    case 'yesterday': {
      const until = startOfUTCDay(now);
      const since = new Date(until.getTime() - DAY_MS);
      return { since, until, label: `Yesterday · ${fmtDate(since)}` };
    }
    case 'last_7_days': {
      const since = new Date(now.getTime() - 7 * DAY_MS);
      return { since, until: now, label: `Last 7 days · ${fmtDate(since)} – ${fmtDate(now)}` };
    }
    case 'last_30_days': {
      const since = new Date(now.getTime() - 30 * DAY_MS);
      return { since, until: now, label: `Last 30 days · ${fmtDate(since)} – ${fmtDate(now)}` };
    }
    case 'last_year': {
      const since = new Date(now.getTime() - 365 * DAY_MS);
      return { since, until: now, label: `Last year · ${fmtDate(since)} – ${fmtDate(now)}` };
    }
    case 'custom': {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(from || '') || !/^\d{4}-\d{2}-\d{2}$/.test(to || '')) {
        throw new Error('Please provide valid From and To dates (YYYY-MM-DD).');
      }
      const since = new Date(`${from}T00:00:00.000Z`);
      const toStart = new Date(`${to}T00:00:00.000Z`);
      if (Number.isNaN(since.getTime()) || Number.isNaN(toStart.getTime())) throw new Error('Invalid custom dates.');
      if (since > toStart) throw new Error('The From date must be on or before the To date.');
      const until = new Date(toStart.getTime() + DAY_MS); // include the whole 'to' day
      return { since, until, label: `${fmtDate(since)} – ${fmtDate(toStart)}` };
    }
    case 'today':
    default: {
      const since = startOfUTCDay(now);
      return { since, until: now, label: `Today · ${fmtDate(since)}` };
    }
  }
};

// Compute the report figures for the window [since, until).
const buildStats = async (since, until = new Date(), label = '') => {
  const createdAt = { gte: since };
  if (until) createdAt.lt = until;
  const periodFilter = { createdAt };

  const [applied, passedLevel1, hired, rejected, failed, deptGroups] = await Promise.all([
    prisma.candidate.count({ where: periodFilter }),
    prisma.candidate.count({ where: { ...periodFilter, status: { in: ['LEVEL1_PASSED', 'HIRED'] } } }),
    prisma.candidate.count({ where: { ...periodFilter, status: 'HIRED' } }),
    prisma.candidate.count({ where: { ...periodFilter, status: 'REJECTED' } }),
    prisma.candidate.count({ where: { ...periodFilter, status: { in: FAILED_STATUSES } } }),
    prisma.candidate.groupBy({ by: ['department'], where: { ...periodFilter, department: { not: null } }, _count: { id: true } }),
  ]);

  const byDepartment = deptGroups
    .map((g) => ({ label: DEPT_LABELS[g.department] || g.department, count: g._count.id }))
    .sort((a, b) => b.count - a.count);

  // Interviews booked in the period, grouped per recruiter (include 0 for active recruiters).
  const interviews = await prisma.interview.findMany({
    where: periodFilter,
    select: { recruiterId: true },
  });
  const counts = {};
  for (const iv of interviews) counts[iv.recruiterId] = (counts[iv.recruiterId] || 0) + 1;

  const recruiters = await prisma.user.findMany({
    where: { role: { in: ['RECRUITER', 'ADMIN'] }, isActive: true },
    select: { id: true, name: true },
  });
  const byRecruiter = recruiters
    .map((r) => ({ name: r.name, count: counts[r.id] || 0 }))
    .sort((a, b) => b.count - a.count);

  return {
    applied,
    passedLevel1,
    failed,
    hired,
    rejected,
    interviewsBooked: interviews.length,
    byDepartment,
    byRecruiter,
    periodLabel: label || new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }),
  };
};

// Resolve who should receive the report: REPORT_RECIPIENTS env overrides,
// otherwise all active SUPER_ADMIN users.
const resolveRecipients = async () => {
  if (process.env.REPORT_RECIPIENTS) {
    return process.env.REPORT_RECIPIENTS.split(',').map((e) => e.trim()).filter(Boolean);
  }
  const admins = await prisma.user.findMany({
    where: { role: 'SUPER_ADMIN', isActive: true },
    select: { email: true },
  });
  return admins.map((a) => a.email).filter(Boolean);
};

// Send a report for an already-built stats object to all recipients.
const sendStatsToRecipients = async (stats) => {
  const recipients = await resolveRecipients();
  if (recipients.length === 0) {
    logger.warn('Report: no recipients configured');
    return { sent: 0, stats };
  }
  let sent = 0;
  for (const to of recipients) {
    try { await emailService.sendSummaryReport(to, stats); sent += 1; }
    catch (err) { logger.error('Report send failed', { to, error: err.message }); }
  }
  return { sent, recipients: recipients.length, stats };
};

// Build + send a report for a chosen range (preset key or custom from/to).
// Throws on an invalid custom range.
const runReport = async ({ range, from, to } = {}) => {
  const { since, until, label } = resolveRange(range, from, to);
  const stats = await buildStats(since, until, label);
  return sendStatsToRecipients(stats);
};

// Daily scheduled report — the rolling last 24 hours.
const runDailyReport = async () => {
  const since = new Date(Date.now() - DAY_MS);
  const stats = await buildStats(since, new Date(), `Last 24 hours · ${fmtDate(new Date())}`);
  return sendStatsToRecipients(stats);
};

module.exports = { buildStats, runDailyReport, runReport, resolveRecipients };
