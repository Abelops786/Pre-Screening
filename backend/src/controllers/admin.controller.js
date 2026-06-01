const prisma = require('../config/database');
const msService = require('../services/microsoft.service');
const { success, error } = require('../utils/responseHelper');

const CANDIDATE_INCLUDE = {
  systemCheck: true,
  audioRecording: true,
  filterResult: true,
  job: { select: { id: true, title: true, department: true, client: true, positionType: true, roleType: true } },
  assignedRecruiters: { include: { recruiter: { select: { id: true, name: true, email: true } } } },
  internalNotes: { include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } },
  interviews: { orderBy: { createdAt: 'desc' }, take: 1 },
};

const getAnalytics = async (_req, res, next) => {
  try {
    const [total, qualified, rejected, pending, languageBreakdown] = await Promise.all([
      prisma.candidate.count(),
      prisma.candidate.count({ where: { status: 'LEVEL1_PASSED' } }),
      prisma.candidate.count({ where: { status: 'REJECTED' } }),
      prisma.candidate.count({ where: { status: { in: ['PENDING', 'AUDIO_PENDING', 'PROCESSING'] } } }),
      prisma.candidate.groupBy({ by: ['selectedLanguage'], _count: { id: true } }),
    ]);

    return success(res, {
      kpi: { total, qualified, rejected, pending },
      languageBreakdown: languageBreakdown.map((l) => ({
        language: l.selectedLanguage,
        count: l._count.id,
      })),
    });
  } catch (err) {
    next(err);
  }
};

const listCandidates = async (req, res, next) => {
  try {
    const {
      page = 1, limit = 20,
      search, status, language,
      sortBy = 'createdAt', sortOrder = 'desc',
    } = req.query;

    const where = {};
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email:    { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status)   where.status = status;
    if (language) where.selectedLanguage = language;

    // Recruiters only see their assigned candidates
    if (req.user.role === 'RECRUITER') {
      where.assignedRecruiters = { some: { recruiterId: req.user.id } };
    }

    const [candidates, total] = await Promise.all([
      prisma.candidate.findMany({
        where,
        include: { systemCheck: true, audioRecording: true, filterResult: true },
        orderBy: { [sortBy]: sortOrder },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.candidate.count({ where }),
    ]);

    return success(res, {
      candidates,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    next(err);
  }
};

const getCandidate = async (req, res, next) => {
  try {
    const candidate = await prisma.candidate.findUnique({
      where: { id: req.params.id },
      include: CANDIDATE_INCLUDE,
    });
    if (!candidate) return error(res, 'Candidate not found', 404);

    // Recruiters can only see their assigned candidates
    if (req.user.role === 'RECRUITER') {
      const assigned = candidate.assignedRecruiters.some((a) => a.recruiterId === req.user.id);
      if (!assigned) return error(res, 'Access denied', 403);
    }

    return success(res, candidate);
  } catch (err) {
    next(err);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['PENDING', 'SYSTEM_CHECK_FAILED', 'AUDIO_PENDING', 'PROCESSING', 'LEVEL1_PASSED', 'REJECTED'];
    if (!validStatuses.includes(status)) return error(res, 'Invalid status', 422);

    const candidate = await prisma.candidate.update({
      where: { id: req.params.id },
      data: { status },
    });
    return success(res, candidate, 'Status updated');
  } catch (err) {
    next(err);
  }
};

const assignRecruiter = async (req, res, next) => {
  try {
    const { recruiterId } = req.body;
    const assignment = await prisma.recruiterCandidateAssignment.upsert({
      where: { recruiterId_candidateId: { recruiterId, candidateId: req.params.id } },
      create: { recruiterId, candidateId: req.params.id },
      update: {},
    });
    return success(res, assignment, 'Recruiter assigned');
  } catch (err) {
    next(err);
  }
};

const addNote = async (req, res, next) => {
  try {
    const { note } = req.body;
    if (!note?.trim()) return error(res, 'Note cannot be empty', 422);

    const internalNote = await prisma.internalNote.create({
      data: { candidateId: req.params.id, userId: req.user.id, note: note.trim() },
      include: { user: { select: { id: true, name: true } } },
    });
    return success(res, internalNote, 'Note added', 201);
  } catch (err) {
    next(err);
  }
};

const getNotes = async (req, res, next) => {
  try {
    const notes = await prisma.internalNote.findMany({
      where: { candidateId: req.params.id },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return success(res, notes);
  } catch (err) {
    next(err);
  }
};

const exportCsv = async (req, res, next) => {
  try {
    const candidates = await prisma.candidate.findMany({
      include: { systemCheck: true, audioRecording: true, filterResult: true },
      orderBy: { createdAt: 'desc' },
    });

    const headers = [
      'ID', 'Full Name', 'Email', 'Phone', 'Location', 'Years Experience',
      'Availability Shift', 'Language', 'Status', 'Download Speed (Mbps)',
      'Upload Speed (Mbps)', 'Fluency Score (%)', 'Applied At',
    ].join(',');

    const rows = candidates.map((c) => [
      c.id, `"${c.fullName}"`, c.email, c.phone, `"${c.location}"`,
      c.yearsExperience, c.availabilityShift, c.selectedLanguage, c.status,
      c.systemCheck?.downloadSpeed ?? '', c.systemCheck?.uploadSpeed ?? '',
      c.audioRecording?.fluencyScore ?? '', c.createdAt.toISOString(),
    ].join(','));

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="candidates.csv"');
    return res.send([headers, ...rows].join('\n'));
  } catch (err) {
    next(err);
  }
};

const deleteCandidate = async (req, res, next) => {
  try {
    await prisma.candidate.delete({ where: { id: req.params.id } });
    return success(res, {}, 'Candidate deleted');
  } catch (err) {
    next(err);
  }
};

const generateTeamsLink = async (req, res, next) => {
  try {
    const candidate = await prisma.candidate.findUnique({ where: { id: req.params.id } });
    if (!candidate) return error(res, 'Candidate not found', 404);
    if (candidate.status !== 'LEVEL1_PASSED') return error(res, 'Candidate has not passed Level 1', 422);

    const admin = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN', msAccessToken: { not: null } },
    });
    if (!admin?.msAccessToken) {
      return error(res, 'Microsoft account not connected. Go to Settings and click Connect Microsoft.', 503);
    }

    const meeting = await msService.createOnlineMeeting(
      admin.msAccessToken,
      `TalentScreen Interview – ${candidate.fullName}`,
    );
    const teamsLink = meeting.joinWebUrl || meeting.joinUrl;

    const existing = await prisma.interview.findFirst({ where: { candidateId: req.params.id } });
    if (existing) {
      await prisma.interview.update({ where: { id: existing.id }, data: { msTeamsLink: teamsLink } });
    } else {
      await prisma.interview.create({
        data: {
          candidateId: req.params.id,
          recruiterId: admin.id,
          scheduledTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          msTeamsLink: teamsLink,
        },
      });
    }

    return success(res, { teamsLink }, 'Teams meeting link generated');
  } catch (err) {
    next(err);
  }
};

module.exports = { getAnalytics, listCandidates, getCandidate, updateStatus, assignRecruiter, deleteCandidate, addNote, getNotes, exportCsv, generateTeamsLink };
