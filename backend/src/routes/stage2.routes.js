/**
 * STAGE 2 – ROUTE STUBS
 *
 * These routes are intentionally unimplemented.
 * Activate by:
 *  1. Providing MS_CLIENT_ID, MS_CLIENT_SECRET, MS_TENANT_ID in .env
 *  2. Implementing the Microsoft Graph API calls in the controllers
 *  3. Removing the STAGE2_DISABLED guard below
 *
 * Database tables (recruiter_availability, interviews) are already created
 * by the Prisma migration and ready to use.
 */

const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const { isRecruiter, isAdmin } = require('../middleware/rbac.middleware');

const stage2Disabled = (_req, res) => {
  res.status(503).json({
    success: false,
    message: 'Stage 2 (Microsoft Teams Scheduling) is not yet activated. Provide MS credentials to enable.',
    stage: 2,
  });
};

// ── Recruiter Availability ───────────────────────────────────
// GET  /api/v1/recruiter/availability  – list slots for current recruiter
// POST /api/v1/recruiter/availability  – create availability slot
router.get('/availability',  authenticate, isRecruiter, stage2Disabled);
router.post('/availability', authenticate, isRecruiter, stage2Disabled);

// ── Interview Booking ────────────────────────────────────────
// POST /api/v1/interviews/book  – book a Teams meeting slot
router.post('/book', authenticate, isAdmin, stage2Disabled);

// ── Microsoft Graph Webhook Receiver ────────────────────────
// POST /api/v1/webhooks/ms-graph  – intercept Teams attendance & recording events
router.post('/ms-graph', stage2Disabled);

module.exports = router;
