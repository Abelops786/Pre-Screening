const prisma = require('../config/database');
const msService = require('../services/microsoft.service');
const emailService = require('../services/email.service');
const { assignRecruiterRoundRobin } = require('../services/recruiterAssignment.service');
const { reassignInterviewsForLeave, reassignInterview } = require('../services/leaveCoverage.service');
const { success, error } = require('../utils/responseHelper');
const logger = require('../utils/logger');

const SLOT_MINUTES = 30;          // length of each bookable slot
const SLOT_MS = SLOT_MINUTES * 60 * 1000;
const HORIZON_DAYS = 14;          // how far ahead candidates can book
const BOOKING_LEAD_MS = 60 * 60 * 1000; // candidates can't book within 1 hour of now
// Minimum gap a recruiter must have between two interviews so they're never
// booked back-to-back. Default 30 min; set BOOKING_BUFFER_MINUTES=0 to disable.
const BOOKING_BUFFER_MS = (Number(process.env.BOOKING_BUFFER_MINUTES) || 30) * 60 * 1000;
// Two interviews are "too close" when the gap between their start times is
// under one slot + the buffer (slots are aligned to the 30-min grid).
const TOO_CLOSE_MS = SLOT_MS + BOOKING_BUFFER_MS;
// Recruiter hours are wall-clock in this business timezone. We compare "now"
// in the SAME frame so "today" and the 1-hour rule are correct everywhere.
const BUSINESS_TZ = process.env.BUSINESS_TZ || 'America/New_York';

// Current wall-clock time in BUSINESS_TZ, expressed as a UTC instant of those
// same wall-clock numbers — matching how each slot below is built. This makes
// the slot/now comparison timezone-consistent regardless of the server's tz.
const nowInBusinessTz = () => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(new Date());
  const get = (t) => Number(parts.find((p) => p.type === t).value);
  let hour = get('hour');
  if (hour === 24) hour = 0; // some engines emit 24 for midnight
  return new Date(Date.UTC(get('year'), get('month') - 1, get('day'), hour, get('minute'), get('second')));
};

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

// Is this slot covered by a recruiter block (full day off, or a time range)?
const minutesOfUTC = (d) => d.getUTCHours() * 60 + d.getUTCMinutes();
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

const generateSlots = (rules, bookedTimes, exceptions = []) => {
  // Booked slots are kept in the list but marked booked:true, so candidates can
  // see the recruiter is busy at those times (they just can't select them).
  const booked = new Set(bookedTimes.map((d) => new Date(d).toISOString()));
  const bookedMs = bookedTimes.map((d) => new Date(d).getTime());
  // A free slot is hidden if it sits within the buffer of an existing interview,
  // so the recruiter keeps a gap on either side and is never back-to-back.
  const withinBuffer = (slotMs) => bookedMs.some((b) => b !== slotMs && Math.abs(slotMs - b) < TOO_CLOSE_MS);
  const out = [];
  const now = nowInBusinessTz();
  // Candidates cannot pick a slot starting within the next hour (>= keeps the
  // exactly-1-hour-away slot bookable, e.g. 11 PM when it is 10 PM).
  const earliest = now.getTime() + BOOKING_LEAD_MS;

  for (let d = 0; d <= HORIZON_DAYS; d++) {   // d=0 → allow same-day booking
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
        const isBookedSlot = booked.has(iso);
        // Show the booked slot itself (as "Booked"); hide free slots inside the buffer.
        const show = slot.getTime() >= earliest && !isBlocked(slot, exceptions)
          && (isBookedSlot || !withinBuffer(slot.getTime()));
        if (show) {
          out.push({ iso, day: fmtDay(slot), time: fmtTime(hh, mm), booked: isBookedSlot });
        }
        t += SLOT_MINUTES;
      }
    }
  }
  return out.sort((a, b) => a.iso.localeCompare(b.iso));
};

// Resolve the recruiter who will interview a given candidate. Routes through
// the round-robin, which keeps the current assignment if that recruiter is
// still bookable (active + has availability) and otherwise re-routes the
// candidate to an eligible recruiter — so the calendar is never empty.
const resolveRecruiter = async (candidate) => {
  const recruiterId = await assignRecruiterRoundRobin(candidate.id);
  if (recruiterId) {
    const recruiter = await prisma.user.findUnique({ where: { id: recruiterId } });
    if (recruiter?.isActive) return recruiter;
  }

  // Last resort (no eligible recruiters at all): any active recruiter with hours.
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
    const exceptions = await prisma.availabilityException.findMany({ where: { recruiterId: recruiter.id } });
    const slots = generateSlots(rules, interviews.map((i) => i.scheduledTime), exceptions);

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
    if (Number.isNaN(when.getTime())) return error(res, 'Invalid slot', 422);
    // Enforce the 1-hour lead time server-side too, in the business-tz frame.
    if (when.getTime() < nowInBusinessTz().getTime() + BOOKING_LEAD_MS) {
      return error(res, 'Please pick a slot at least 1 hour from now.', 422);
    }

    // Reject slots the recruiter has blocked (day off / time range).
    const exceptions = await prisma.availabilityException.findMany({ where: { recruiterId: recruiter.id } });
    if (isBlocked(when, exceptions)) return error(res, 'That time is no longer available. Please pick another.', 409);

    // Prevent double-booking, and enforce the buffer so the recruiter is never
    // booked back-to-back (a slot within one slot + buffer of an existing one).
    const recruiterInterviews = await prisma.interview.findMany({
      where: { recruiterId: recruiter.id },
      select: { scheduledTime: true },
    });
    const whenMs = when.getTime();
    if (recruiterInterviews.some((i) => new Date(i.scheduledTime).getTime() === whenMs)) {
      return error(res, 'That slot was just taken. Please pick another.', 409);
    }
    if (recruiterInterviews.some((i) => Math.abs(new Date(i.scheduledTime).getTime() - whenMs) < TOO_CLOSE_MS)) {
      return error(res, 'That time is too close to another interview. Please pick another.', 409);
    }

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

// List the logged-in recruiter's booked interviews (admins see all)
const myInterviews = async (req, res, next) => {
  try {
    const where = req.user.role === 'RECRUITER' ? { recruiterId: req.user.id } : {};
    const interviews = await prisma.interview.findMany({
      where,
      orderBy: { scheduledTime: 'asc' },
      include: {
        candidate: { select: { id: true, fullName: true, email: true, phone: true, status: true, job: { select: { title: true, departmentLabel: true, department: true } } } },
        recruiter: { select: { id: true, name: true } },
      },
    });
    const now = new Date();
    const mapped = interviews.map((i) => ({
      id: i.id,
      candidateId: i.candidate?.id,
      candidateName: i.candidate?.fullName,
      candidateEmail: i.candidate?.email,
      candidatePhone: i.candidate?.phone,
      jobTitle: i.candidate?.job?.departmentLabel || i.candidate?.job?.title || '—',
      recruiterName: i.recruiter?.name,
      scheduledTime: i.scheduledTime,
      scheduledLabel: fmtInstant(i.scheduledTime),
      msTeamsLink: i.msTeamsLink,
      upcoming: new Date(i.scheduledTime) >= now,
    }));
    return success(res, {
      total: mapped.length,
      upcoming: mapped.filter((m) => m.upcoming).length,
      interviews: mapped,
    });
  } catch (err) {
    next(err);
  }
};

// ── Availability exceptions (block a slot / mark a day off) ──────
const listExceptions = async (req, res, next) => {
  try {
    const todayUtc = new Date();
    todayUtc.setUTCHours(0, 0, 0, 0);
    const rows = await prisma.availabilityException.findMany({
      where: { recruiterId: req.user.id, date: { gte: todayUtc } },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });
    return success(res, rows.map((r) => ({
      ...r,
      dayLabel: new Date(r.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' }),
    })));
  } catch (err) {
    next(err);
  }
};

const createException = async (req, res, next) => {
  try {
    const { date, allDay = true, startTime, endTime, reason } = req.body;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return error(res, 'A valid date (YYYY-MM-DD) is required', 422);
    const dateUtc = new Date(`${date}T00:00:00.000Z`);
    if (Number.isNaN(dateUtc.getTime())) return error(res, 'Invalid date', 422);

    const full = allDay === true || allDay === 'true';
    if (!full) {
      if (!/^\d{2}:\d{2}$/.test(startTime || '') || !/^\d{2}:\d{2}$/.test(endTime || '')) {
        return error(res, 'Start and end time must be in HH:mm format', 422);
      }
      if (startTime >= endTime) return error(res, 'End time must be after start time', 422);
    }

    const row = await prisma.availabilityException.create({
      data: {
        recruiterId: req.user.id,
        date: dateUtc,
        allDay: full,
        startTime: full ? null : startTime,
        endTime:   full ? null : endTime,
        reason:    reason?.trim() || null,
      },
    });

    // Auto-forward any already-booked interviews this leave covers to another
    // free recruiter, so no candidate is left with an absent interviewer.
    let coverage = { forwarded: [], unassigned: [] };
    try {
      coverage = await reassignInterviewsForLeave(req.user.id, row);
    } catch (covErr) {
      logger.warn('Leave coverage failed', { error: covErr.message });
    }

    const baseMsg = full ? 'Day marked as off' : 'Slot blocked';
    const parts = [];
    if (coverage.forwarded.length) parts.push(`${coverage.forwarded.length} interview(s) auto-forwarded`);
    if (coverage.unassigned.length) parts.push(`${coverage.unassigned.length} need manual attention`);
    const message = parts.length ? `${baseMsg} · ${parts.join(', ')}` : baseMsg;
    return success(res, { ...row, coverage }, message, 201);
  } catch (err) {
    next(err);
  }
};

const deleteException = async (req, res, next) => {
  try {
    const row = await prisma.availabilityException.findUnique({ where: { id: req.params.id } });
    if (!row || row.recruiterId !== req.user.id) return error(res, 'Not found', 404);
    await prisma.availabilityException.delete({ where: { id: req.params.id } });
    return success(res, {}, 'Block removed');
  } catch (err) {
    next(err);
  }
};

// Recruiter unavailable (e.g. emergency) — reassign one interview to a free
// recruiter. Super Admin only (enforced by route middleware).
const reassignBookedInterview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const itv = await prisma.interview.findUnique({ where: { id }, select: { id: true } });
    if (!itv) return error(res, 'Interview not found', 404);
    const result = await reassignInterview(id);
    if (!result.ok) return error(res, result.error || 'Could not reassign interview', 400);
    if (!result.reassigned) {
      return success(res, result, 'No other recruiter is free at that time. Admins have been notified to handle it manually.');
    }
    return success(res, result, `Interview reassigned to ${result.newRecruiterName}`);
  } catch (err) {
    next(err);
  }
};

module.exports = { listMine, createSlotRule, deleteSlotRule, getSlotsForCandidate, bookSlot, myInterviews, listExceptions, createException, deleteException, reassignBookedInterview };
