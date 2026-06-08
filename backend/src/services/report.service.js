const prisma = require('../config/database');
const emailService = require('./email.service');
const logger = require('../utils/logger');

const DEPT_LABELS = {
  INTERPRETATION: 'Interpretation',
  SALES: 'Sales',
  CUSTOMER_SERVICE: 'Customer Service',
};

const FAILED_STATUSES = ['SYSTEM_CHECK_FAILED', 'REJECTED', 'AUTO_DISQUALIFIED'];

// Compute the report figures for the window [since, now).
const buildStats = async (since) => {
  const periodFilter = { createdAt: { gte: since } };

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
    periodLabel: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }),
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

// Build + send the daily report. Returns a small summary for the manual endpoint.
const runDailyReport = async () => {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const stats = await buildStats(since);
  const recipients = await resolveRecipients();

  if (recipients.length === 0) {
    logger.warn('Daily report: no recipients configured');
    return { sent: 0, stats };
  }

  let sent = 0;
  for (const to of recipients) {
    try { await emailService.sendSummaryReport(to, stats); sent += 1; }
    catch (err) { logger.error('Daily report send failed', { to, error: err.message }); }
  }
  return { sent, recipients: recipients.length, stats };
};

module.exports = { buildStats, runDailyReport, resolveRecipients };
