const prisma = require('../config/database');
const logger = require('../utils/logger');

// Statuses that mean a candidate has cleared Level 1 and therefore counts
// toward a recruiter's round-robin load. We rotate over PASSED candidates
// only (not every applicant), so people who actually reach the booking
// calendar are distributed evenly: A, B, A, B, …
const PASSED_STATUSES = ['LEVEL1_PASSED', 'HIRED'];

/**
 * Assign a recruiter to a candidate on a round-robin basis, called at the
 * moment the candidate PASSES Level 1.
 *
 * Rotation rule: pick the recruiter currently holding the FEWEST passed
 * candidates; ties break toward the earliest-created account, giving a
 * deterministic A → B → A → B rotation. Recruiters are included even if they
 * have not configured availability yet (strict rotation — by product decision).
 *
 * Idempotent: if the candidate already has an assignment (e.g. this fires
 * twice, or they were assigned under older logic), the existing recruiter is
 * kept so the rotation never double-assigns or shifts.
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

    // Primary pool: active recruiters.
    let recruiters = await prisma.user.findMany({
      where: { role: 'RECRUITER', isActive: true },
      select: { id: true, createdAt: true },
    });

    // Fallback: if no recruiters exist yet, allow active admins to be assigned.
    if (recruiters.length === 0) {
      recruiters = await prisma.user.findMany({
        where: { role: { in: ['RECRUITER', 'ADMIN'] }, isActive: true },
        select: { id: true, createdAt: true },
      });
    }
    if (recruiters.length === 0) return null;

    // Count each recruiter's current PASSED-candidate load in one query.
    const grouped = await prisma.recruiterCandidateAssignment.groupBy({
      by: ['recruiterId'],
      where: { candidate: { status: { in: PASSED_STATUSES } } },
      _count: { _all: true },
    });
    const loadByRecruiter = new Map(grouped.map((g) => [g.recruiterId, g._count._all]));

    // Lightest load first; tie-break by oldest account for a stable rotation.
    recruiters.sort((a, b) =>
      (loadByRecruiter.get(a.id) || 0) - (loadByRecruiter.get(b.id) || 0)
      || new Date(a.createdAt) - new Date(b.createdAt),
    );
    const recruiter = recruiters[0];

    await prisma.recruiterCandidateAssignment.upsert({
      where: { recruiterId_candidateId: { recruiterId: recruiter.id, candidateId } },
      create: { recruiterId: recruiter.id, candidateId },
      update: {},
    });
    return recruiter.id;
  } catch (err) {
    logger.warn('Round-robin recruiter assignment failed', { candidateId, error: err.message });
    return null;
  }
};

module.exports = { assignRecruiterRoundRobin, PASSED_STATUSES };
