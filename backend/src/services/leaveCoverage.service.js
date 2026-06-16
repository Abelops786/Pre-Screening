const prisma = require('../config/database');
const logger = require('../utils/logger');
const emailService = require('./email.service');

// Keep these rules in sync with availability.controller (slot length + buffer),
// so "is this recruiter free at time T" matches exactly how candidates book.
const SLOT_MS = 30 * 60 * 1000;
const BOOKING_BUFFER_MS = (Number(process.env.BOOKING_BUFFER_MINUTES) || 30) * 60 * 1000;
const TOO_CLOSE_MS = SLOT_MS + BOOKING_BUFFER_MS;

const minutesOfUTC = (d) => d.getUTCHours() * 60 + d.getUTCMinutes();

// Does an exception (full day off, or a time range on a date) cover this instant?
const isBlocked = (slot, exceptions) => {
  for (const ex of exceptions) {
    const ed = new Date(ex.date);
    const sameDay = ed.getUTCFullYear() === slot.getUTCFullYear()
      && ed.getUTCMonth() === slot.getUTCMonth()
      && ed.getUTCDate() === slot.getUTCDate();
    if (!sameDay) continue;
    if (ex.allDay) return true;
    if (ex.startTime && ex.endTime) {
      const [sh, sm] = ex.startTime.split(':').map(Number);
      const [eh, em] = ex.endTime.split(':').map(Number);
      const m = minutesOfUTC(slot);
      if (m >= sh * 60 + sm && m < eh * 60 + em) return true;
    }
  }
  return false;
};

// Is the instant inside one of the recruiter's weekly availability rules?
const isWithinRules = (when, rules) => {
  const dow = when.getUTCDay();
  const m = minutesOfUTC(when);
  return rules.some((r) => {
    if (r.dayOfWeek !== dow) return false;
    const [sh, sm] = r.startTime.split(':').map(Number);
    const [eh, em] = r.endTime.split(':').map(Number);
    return m >= sh * 60 + sm && m < eh * 60 + em;
  });
};

const hasConflict = (whenMs, interviewTimesMs) =>
  interviewTimesMs.some((t) => Math.abs(t - whenMs) < TOO_CLOSE_MS);

/**
 * When a recruiter marks leave (an availability exception), auto-forward every
 * upcoming interview that falls inside the leave to another active recruiter
 * who is genuinely free at that exact time (within their hours, not blocked,
 * no clash + buffer). The candidate's time and Teams link are unchanged; only
 * the interviewer changes. Interviews that can't be placed are left with the
 * original recruiter and reported to admins for manual handling.
 *
 * @returns {Promise<{forwarded: object[], unassigned: object[]}>}
 */
const reassignInterviewsForLeave = async (recruiterId, exception) => {
  const now = new Date();

  // Upcoming interviews of the recruiter that the leave actually covers.
  const upcoming = await prisma.interview.findMany({
    where: { recruiterId, scheduledTime: { gte: now } },
    include: { candidate: true },
  });
  const affected = upcoming.filter((i) => isBlocked(new Date(i.scheduledTime), [exception]));
  if (affected.length === 0) return { forwarded: [], unassigned: [] };

  // Candidate pool: every other active recruiter/admin, oldest account first.
  const pool = await prisma.user.findMany({
    where: { role: { in: ['RECRUITER', 'ADMIN'] }, isActive: true, id: { not: recruiterId } },
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true, email: true },
  });

  const forwarded = [];
  const unassigned = [];

  if (pool.length > 0) {
    const ids = pool.map((r) => r.id);
    // Preload each candidate recruiter's hours, blocks and existing bookings.
    const [rules, exceptions, theirInterviews] = await Promise.all([
      prisma.recruiterAvailability.findMany({ where: { recruiterId: { in: ids } } }),
      prisma.availabilityException.findMany({ where: { recruiterId: { in: ids } } }),
      prisma.interview.findMany({ where: { recruiterId: { in: ids } }, select: { recruiterId: true, scheduledTime: true } }),
    ]);
    const rulesBy = new Map(ids.map((id) => [id, rules.filter((r) => r.recruiterId === id)]));
    const excBy = new Map(ids.map((id) => [id, exceptions.filter((e) => e.recruiterId === id)]));
    // Mutable per-recruiter busy times so reassignments don't collide with each other.
    const busyBy = new Map(ids.map((id) => [id, theirInterviews.filter((t) => t.recruiterId === id).map((t) => new Date(t.scheduledTime).getTime())]));

    for (const itv of affected) {
      const when = new Date(itv.scheduledTime);
      const whenMs = when.getTime();
      // Prefer the least-loaded eligible recruiter for a fair spread.
      const candidates = [...pool].sort((a, b) => busyBy.get(a.id).length - busyBy.get(b.id).length);
      const pick = candidates.find((r) =>
        isWithinRules(when, rulesBy.get(r.id))
        && !isBlocked(when, excBy.get(r.id))
        && !hasConflict(whenMs, busyBy.get(r.id)));

      if (!pick) {
        unassigned.push({ candidateName: itv.candidate?.fullName, when: itv.scheduledTime });
        continue;
      }

      try {
        await prisma.interview.update({ where: { id: itv.id }, data: { recruiterId: pick.id } });
        // Move the candidate assignment too, so access control + admin views follow.
        await prisma.recruiterCandidateAssignment.updateMany({
          where: { candidateId: itv.candidateId, recruiterId },
          data: { recruiterId: pick.id },
        });
        busyBy.get(pick.id).push(whenMs);
        forwarded.push({ candidateName: itv.candidate?.fullName, when: itv.scheduledTime, newRecruiterName: pick.name });

        // Notify the new interviewer; re-confirm the candidate (no recruiter named → silent change).
        if (pick.email) {
          emailService.sendStaffInterviewNotice(pick.email, pick.name, itv.candidate, itv.scheduledTime, itv.msTeamsLink).catch(() => {});
        }
        if (itv.candidate?.email) {
          emailService.sendInterviewBooked(itv.candidate, itv.scheduledTime, itv.msTeamsLink).catch(() => {});
        }
      } catch (err) {
        logger.warn('Failed to auto-forward interview', { interviewId: itv.id, error: err.message });
        unassigned.push({ candidateName: itv.candidate?.fullName, when: itv.scheduledTime });
      }
    }
  } else {
    // No one to forward to at all.
    for (const itv of affected) {
      unassigned.push({ candidateName: itv.candidate?.fullName, when: itv.scheduledTime });
    }
  }

  const onLeave = await prisma.user.findUnique({ where: { id: recruiterId }, select: { name: true } });
  await notifyAdmins(onLeave?.name || 'A recruiter', forwarded, unassigned);

  return { forwarded, unassigned };
};

// Email all active admins a coverage summary (forwarded + anything unassigned).
const notifyAdmins = async (recruiterName, forwarded, unassigned) => {
  try {
    const admins = await prisma.user.findMany({
      where: { role: { in: ['SUPER_ADMIN', 'ADMIN'] }, isActive: true },
      select: { email: true },
    });
    const recipients = [...new Set(admins.map((a) => a.email).filter(Boolean))];
    for (const to of recipients) {
      emailService.sendLeaveCoverageSummary(to, { recruiterName, forwarded, unassigned }).catch(() => {});
    }
  } catch (err) {
    logger.warn('Could not send coverage summary', { error: err.message });
  }
};

// Pick the least-loaded recruiter (excluding `excludeId`) who is genuinely free
// at `when`. Returns the user, or null if nobody fits.
const findCoverRecruiter = async (when, excludeId) => {
  const whenMs = when.getTime();
  const pool = await prisma.user.findMany({
    where: { role: { in: ['RECRUITER', 'ADMIN'] }, isActive: true, id: { not: excludeId } },
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true, email: true },
  });
  if (pool.length === 0) return null;

  const ids = pool.map((r) => r.id);
  const [rules, exceptions, theirInterviews] = await Promise.all([
    prisma.recruiterAvailability.findMany({ where: { recruiterId: { in: ids } } }),
    prisma.availabilityException.findMany({ where: { recruiterId: { in: ids } } }),
    prisma.interview.findMany({ where: { recruiterId: { in: ids } }, select: { recruiterId: true, scheduledTime: true } }),
  ]);
  const rulesBy = new Map(ids.map((id) => [id, rules.filter((r) => r.recruiterId === id)]));
  const excBy = new Map(ids.map((id) => [id, exceptions.filter((e) => e.recruiterId === id)]));
  const busyBy = new Map(ids.map((id) => [id, theirInterviews.filter((t) => t.recruiterId === id).map((t) => new Date(t.scheduledTime).getTime())]));

  const candidates = [...pool].sort((a, b) => busyBy.get(a.id).length - busyBy.get(b.id).length);
  return candidates.find((r) =>
    isWithinRules(when, rulesBy.get(r.id))
    && !isBlocked(when, excBy.get(r.id))
    && !hasConflict(whenMs, busyBy.get(r.id))) || null;
};

/**
 * Reassign a SINGLE interview to another free recruiter — used when a recruiter
 * is suddenly unavailable (e.g. an emergency on the day). Moves the interview +
 * candidate assignment, keeps the Teams link, and emails the new recruiter,
 * the candidate, and admins. If nobody is free, admins are asked to handle it.
 *
 * @returns {Promise<{ok:boolean, reassigned?:boolean, newRecruiterName?:string, error?:string}>}
 */
const reassignInterview = async (interviewId) => {
  const itv = await prisma.interview.findUnique({ where: { id: interviewId }, include: { candidate: true } });
  if (!itv) return { ok: false, error: 'Interview not found' };

  const when = new Date(itv.scheduledTime);
  const former = await prisma.user.findUnique({ where: { id: itv.recruiterId }, select: { name: true } });
  const candidateName = itv.candidate?.fullName;

  const pick = await findCoverRecruiter(when, itv.recruiterId);
  if (!pick) {
    await notifyAdmins(former?.name || 'A recruiter', [], [{ candidateName, when: itv.scheduledTime }]);
    return { ok: true, reassigned: false };
  }

  await prisma.interview.update({ where: { id: itv.id }, data: { recruiterId: pick.id } });
  await prisma.recruiterCandidateAssignment.updateMany({
    where: { candidateId: itv.candidateId, recruiterId: itv.recruiterId },
    data: { recruiterId: pick.id },
  });

  if (pick.email) emailService.sendStaffInterviewNotice(pick.email, pick.name, itv.candidate, itv.scheduledTime, itv.msTeamsLink).catch(() => {});
  if (itv.candidate?.email) emailService.sendInterviewBooked(itv.candidate, itv.scheduledTime, itv.msTeamsLink).catch(() => {});
  await notifyAdmins(former?.name || 'A recruiter', [{ candidateName, when: itv.scheduledTime, newRecruiterName: pick.name }], []);

  return { ok: true, reassigned: true, newRecruiterName: pick.name };
};

module.exports = { reassignInterviewsForLeave, reassignInterview };
