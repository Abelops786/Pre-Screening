const prisma = require('../config/database');
const logger = require('../utils/logger');

/**
 * Recruiters who can actually be booked: active, with at least one availability
 * rule. Candidates are only assigned to these, so they never land on an empty
 * calendar. Falls back to any active recruiter, then admins, if none have
 * availability yet — so assignment never hard-fails.
 *
 * @returns {Promise<string[]>} eligible recruiter ids, oldest account first.
 */
const eligibleRecruiterIds = async () => {
  const withAvail = await prisma.recruiterAvailability.findMany({
    distinct: ['recruiterId'], select: { recruiterId: true },
  });
  const availSet = new Set(withAvail.map((r) => r.recruiterId));

  const recruiters = await prisma.user.findMany({
    where: { role: 'RECRUITER', isActive: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  const eligible = recruiters.filter((r) => availSet.has(r.id)).map((r) => r.id);
  if (eligible.length) return eligible;

  // Fallbacks so we still assign someone even if nobody set hours yet.
  if (recruiters.length) return recruiters.map((r) => r.id);
  const admins = await prisma.user.findMany({
    where: { role: { in: ['RECRUITER', 'ADMIN'] }, isActive: true },
    orderBy: { createdAt: 'asc' }, select: { id: true },
  });
  return admins.map((r) => r.id);
};

// The recruiter AFTER whoever received the most recent assignment → true
// 1st→A, 2nd→B, 3rd→A rotation across the eligible pool.
const pickNext = async (ids) => {
  if (!ids.length) return null;
  const last = await prisma.recruiterCandidateAssignment.findFirst({
    where: { recruiterId: { in: ids } },
    orderBy: { assignedAt: 'desc' },
    select: { recruiterId: true },
  });
  const lastIdx = last ? ids.indexOf(last.recruiterId) : -1;
  return ids[(lastIdx + 1) % ids.length];
};

/**
 * Assign a candidate to a bookable recruiter on a strict round-robin basis.
 *
 * - Keeps the current assignment only if that recruiter is still eligible
 *   (active + has availability). If the assigned recruiter became ineligible
 *   (deactivated, or never set hours), the candidate is re-routed to an
 *   eligible recruiter so their calendar is never empty.
 * - Idempotent and non-blocking.
 *
 * @returns {Promise<string|null>} the assigned recruiterId, or null if none.
 */
const assignRecruiterRoundRobin = async (candidateId) => {
  try {
    const ids = await eligibleRecruiterIds();
    if (!ids.length) return null;

    const existing = await prisma.recruiterCandidateAssignment.findFirst({ where: { candidateId } });
    if (existing && ids.includes(existing.recruiterId)) return existing.recruiterId;

    const newId = await pickNext(ids);
    if (!newId) return existing ? existing.recruiterId : null;

    if (existing) {
      // Move the assignment off an ineligible recruiter (inactive / no hours).
      await prisma.recruiterCandidateAssignment.updateMany({
        where: { candidateId, recruiterId: existing.recruiterId },
        data: { recruiterId: newId },
      });
    } else {
      await prisma.recruiterCandidateAssignment.upsert({
        where: { recruiterId_candidateId: { recruiterId: newId, candidateId } },
        create: { recruiterId: newId, candidateId },
        update: {},
      });
    }
    return newId;
  } catch (err) {
    logger.warn('Round-robin recruiter assignment failed', { candidateId, error: err.message });
    return null;
  }
};

module.exports = { assignRecruiterRoundRobin };
