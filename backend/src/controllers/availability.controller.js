const prisma = require('../config/database');
const msService = require('../services/microsoft.service');
const emailService = require('../services/email.service');
const { success, error } = require('../utils/responseHelper');
const logger = require('../utils/logger');

const SLOT_MINUTES = 30;          // length of each bookable slot
const HORIZON_DAYS = 14;          // how far ahead candidates can book

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ── Recruiter availability CRUD (own hours) ──────────────────
const listMine = async (req, res, next) => {
  try {
    const rows = await prisma.recruiterAvailability.findMany({
      where: { recruiterId: req.user.id },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
    return success(res, rows.map((r) => ({ ...r, dayName: DAY_NAMES[r.dayOfWeek] })));
  } catch (err) {
    next(err);
  }
};

const createSlotRule = async (req, res, next) => {
  try {
    const { dayOfWeek, startTime, endTime } = req.body;
    const day = parseInt(dayOfWeek, 10);
    if (Number.isNaN(day) || day < 0 || day > 6) return error(res, 'Valid day of week (0–6) is required', 422);
    if (!/^\d{2}:\d{2}$/.test(startTime || '') || !/^\d{2}:\d{2}$/.test(endTime || '')) {
      return error(res, 'Start and end time must be in HH:mm format', 422);
    }
    if (startTime >= endTime) return error(res, 'End time must be after start time', 422);

    const row = await prisma.recruiterAvailability.create({
      data: { recruiterId: req.user.id, dayOfWeek: day, startTime, endTime },
    });
    return success(res, { ...row, dayName: DAY_NAMES[row.dayOfWeek] }, 'Availability added', 201);
  } catch (err) {
    next(err);
  }
};

const deleteSlotRule = async (req, res, next) => {
  try {
    const row = await prisma.recruiterAvailability.findUnique({ where: { id: req.params.id } });
    if (!row || row.recruiterId !== req.user.id) return error(res, 'Not found', 404);
    await prisma.recruiterAvailability.delete({ where: { id: req.params.id } });
    return success(res, {}, 'Availability removed');
  } catch (err) {
    next(err);
  }
};

// ── Slot generation ──────────────────────────────────────────
// Times are treated as wall-clock (the exact HH:mm the recruiter set). We build
// each slot as that wall-clock time in UTC and also send pre-formatted labels,
// so every candidate sees the SAME time the recruiter entered — no timezone shift.
const fmtTime = (hh, mm) => {
  const ampm = hh >= 12 ? 'PM' : 'AM';
  const h12 = hh % 12 || 12;
  return `${h12}:${String(mm).padStart(2, '0')} ${ampm}`;
};
const fmtDay = (slot) =>
  slot.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' });

// Wall-clock label for a stored instant (e.g. "Monday, June 8 · 9:00 AM")
const fmtInstant = (iso) => {
  const dt = new Date(iso);
  return `${fmtDay(dt)} · ${fmtTime(dt.getUTCHours(), dt.getUTCMinutes())}`;
};

const generateSlots = (rules, bookedTimes) => {
  // Exclude any slot whose time is already booked (so it disappears for others)
  const booked = new Set(bookedTimes.map((d) => new Date(d).toISOString()));
  const out = [];
  const now = new Date();

  for (let d = 1; d <= HORIZON_DAYS; d++) {
    const day = new Date(now);
    day.setUTCDate(now.getUTCDate() + d);
    const dow = day.getUTCDay();
    const dayRules = rules.filter((r) => r.dayOfWeek === dow);

    for (const rule of dayRules) {
      const [sh, sm] = rule.startTime.split(':').map(Number);
      const [eh, em] = rule.endTime.split(':').map(Number);
      let t = sh * 60 + sm;
      const end = eh * 60 + em;

      while (t < end) {
        const hh = Math.floor(t / 60);
        const mm = t % 60;
        const slot = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), hh, mm, 0));
        const iso = slot.toISOString();
        if (!booked.has(iso) && slot > now) {
          out.push({ iso, day: fmtDay(slot), time: fmtTime(hh, mm) });
        }
        t += SLOT_MINUTES;
      }
    }
  }
  return out.sort((a, b) => a.iso.localeCompare(b.iso));
};

// Resolve the recruiter who will interview a given candidate
const resolveRecruiter = async (candidate) => {
  const assignment = await prisma.recruiterCandidateAssignment.findFirst({
    where: { candidateId: candidate.id },
    include: { recruiter: true },
    orderBy: { assignedAt: 'asc' },
  });
  if (assignment?.recruiter?.isActive) return assignment.recruiter;
  // Fallback: any active recruiter/admin who has availability set
  const withAvail = await prisma.recruiterAvailability.findFirst({
    where: { recruiter: { isActive: true } },
    include: { recruiter: true },
  });
  return withAvail?.recruiter || null;
};

// Public: available slots for a candidate (must be Level 1 passed)
const getSlotsForCandidate = async (req, res, next) => {
  try {
    const candidate = await prisma.candidate.findUnique({
      where: { id: req.params.candidateId },
      include: { interviews: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    if (!candidate) return error(res, 'Candidate not found', 404);
    if (candidate.status !== 'LEVEL1_PASSED') return error(res, 'This candidate is not eligible to book an interview', 403);

    // Already booked?
    const existing = candidate.interviews[0];
    if (existing?.scheduledTime) {
      return success(res, { alreadyBooked: true, scheduledTime: existing.scheduledTime, scheduledLabel: fmtInstant(existing.scheduledTime), teamsLink: existing.msTeamsLink, slots: [] });
    }

    const recruiter = await resolveRecruiter(candidate);
    if (!recruiter) return success(res, { alreadyBooked: false, slots: [], message: 'No interview times are available yet. Please check back soon.' });

    const rules = await prisma.recruiterAvailability.findMany({ where: { recruiterId: recruiter.id } });
    const interviews = await prisma.interview.findMany({ where: { recruiterId: recruiter.id }, select: { scheduledTime: true } });
    const slots = generateSlots(rules, interviews.map((i) => i.scheduledTime));

    return success(res, {
      alreadyBooked: false,
      candidateName: candidate.fullName,
      recruiterId: recruiter.id,
      slotMinutes: SLOT_MINUTES,
      slots,
    });
  } catch (err) {
    next(err);
  }
};

// Public: book a slot
const bookSlot = async (req, res, next) => {
  try {
    const { candidateId } = req.params;
    const { scheduledTime } = req.body;
    if (!scheduledTime) return error(res, 'A slot time is required', 422);

    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      include: { interviews: true },
    });
    if (!candidate) return error(res, 'Candidate not found', 404);
    if (candidate.status !== 'LEVEL1_PASSED') return error(res, 'Not eligible to book', 403);
    if (candidate.interviews.length > 0) return error(res, 'An interview has already been booked', 409);

    const recruiter = await resolveRecruiter(candidate);
    if (!recruiter) return error(res, 'No recruiter available to book with', 503);

    const when = new Date(scheduledTime);
    if (Number.isNaN(when.getTime()) || when < new Date()) return error(res, 'Invalid or past slot', 422);

    // Prevent double-booking the same slot
    const clash = await prisma.interview.findFirst({ where: { recruiterId: recruiter.id, scheduledTime: when } });
    if (clash) return error(res, 'That slot was just taken. Please pick another.', 409);

    // Create a Teams meeting if Microsoft is connected
    let teamsLink = null;
    try {
      const admin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN', msRefreshToken: { not: null } } });
      if (admin?.msRefreshToken) {
        const meeting = await msService.createOnlineMeetingWithRefresh(admin.msRefreshToken, `Interview – ${candidate.fullName}`);
        teamsLink = meeting.joinWebUrl || meeting.joinUrl || null;
      }
    } catch (msErr) {
      logger.warn('Could not create Teams meeting for booking', { error: msErr.message });
    }

    const interview = await prisma.interview.create({
      data: { candidateId, recruiterId: recruiter.id, scheduledTime: when, msTeamsLink: teamsLink },
    });

    // Confirm to the candidate
    emailService.sendInterviewBooked?.(candidate, when, teamsLink).catch(() => {});

    // Notify the assigned recruiter and all admins
    try {
      const staff = await prisma.user.findMany({
        where: { isActive: true, OR: [{ id: recruiter.id }, { role: { in: ['SUPER_ADMIN', 'ADMIN'] } }] },
        select: { email: true, name: true },
      });
      const seen = new Set();
      for (const s of staff) {
        if (!s.email || seen.has(s.email)) continue;
        seen.add(s.email);
        emailService.sendStaffInterviewNotice(s.email, s.name, candidate, when, teamsLink).catch(() => {});
      }
    } catch (notifyErr) {
      logger.warn('Could not notify staff of booking', { error: notifyErr.message });
    }

    return success(res, { scheduledTime: interview.scheduledTime, scheduledLabel: fmtInstant(interview.scheduledTime), teamsLink }, 'Interview booked', 201);
  } catch (err) {
    next(err);
  }
};

module.exports = { listMine, createSlotRule, deleteSlotRule, getSlotsForCandidate, bookSlot };
