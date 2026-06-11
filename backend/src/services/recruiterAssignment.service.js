const prisma = require('../config/database');
const logger = require('../utils/logger');

/**
 * Assign a recruiter to a candidate on a strict round-robin basis, called at
 * the moment the candidate PASSES Level 1 (or when their booking calendar is
 * first resolved, as a safety net for legacy passers).
 *
 * Rotation rule: assign to the recruiter who comes AFTER whoever received the
 * most recent assignment, walking the active-recruiter list in a fixed order
 * (oldest account first). This gives a true 1st → A, 2nd → B, 3rd → A rotation
 * regardless of historical load, which is what the client specified. Recruiters
 * are included even if they have not configured availability yet.
 *
 * Idempotent: if the candidate already has an assignment (this fires twice, or
 * they were assigned under older logic), the existing recruiter is kept so the
 * rotation never double-assigns or shifts.
 *
 * Non-blocking by design — never throws into the caller's request flow.
 *
 * @returns {Promise<string|null>} the assigned recruiterId, or null if none.
 */
const assignRecruiterRoundRobin = async (candidateId) => {
  try {
    // Already assigned? Keep it — keeps the rotation stable and idempotent.
    const existing = await prisma.recruiterCandidateAssignment.findFirst({
      where: { candidateId },
    });
    if (existing) return existing.recruiterId;

    // Eligible pool in a fixed, deterministic order (oldest account = "A").
    let recruiters = await prisma.user.findMany({
      where: { role: 'RECRUITER', isActive: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    // Fallback: if no recruiters exist yet, allow active admins to be assigned.
    if (recruiters.length === 0) {
      recruiters = await prisma.user.findMany({
        where: { role: { in: ['RECRUITER', 'ADMIN'] }, isActive: true },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });
    }
    if (recruiters.length === 0) return null;

    const ids = recruiters.map((r) => r.id);

    // Find who got the most recent assignment among the CURRENT eligible
    // recruiters, then hand this candidate to the next one in the rotation.
    const last = await prisma.recruiterCandidateAssignment.findFirst({
      where: { recruiterId: { in: ids } },
      orderBy: { assignedAt: 'desc' },
      select: { recruiterId: true },
    });
    const lastIdx = last ? ids.indexOf(last.recruiterId) : -1;
    const recruiterId = ids[(lastIdx + 1) % ids.length];

    await prisma.recruiterCandidateAssignment.upsert({
      where: { recruiterId_candidateId: { recruiterId, candidateId } },
      create: { recruiterId, candidateId },
      update: {},
    });
    return recruiterId;
  } catch (err) {
    logger.warn('Round-robin recruiter assignment failed', { candidateId, error: err.message });
    return null;
  }
};

module.exports = { assignRecruiterRoundRobin };
