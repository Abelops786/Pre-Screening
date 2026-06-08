const router = require('express').Router();
const adminController = require('../controllers/admin.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { isAdmin, isSuperAdmin, isRecruiter } = require('../middleware/rbac.middleware');

// All admin routes require authentication
router.use(authenticate);

// Analytics (all roles — filtered per role inside controller)
router.get('/analytics', isRecruiter, adminController.getAnalytics);

// Candidate management — list is filtered per role inside controller
router.get('/candidates',              isRecruiter, adminController.listCandidates);
router.get('/candidates/:id',          isRecruiter, adminController.getCandidate);
router.patch('/candidates/:id/status', isAdmin, adminController.updateStatus);
// Recruiters (for their own assigned candidates) and admins can reject/hire
router.post('/candidates/:id/reject',  isRecruiter, adminController.rejectCandidate);
router.post('/candidates/:id/hire',    isRecruiter, adminController.hireCandidate);
router.delete('/candidates/:id',       isAdmin, adminController.deleteCandidate);
router.post('/candidates/:id/assign',  isAdmin, adminController.assignRecruiter);

// Generate Teams meeting link for a Level 1 passed candidate (Admin+)
router.post('/candidates/:id/generate-teams-link', isAdmin, adminController.generateTeamsLink);

// Internal notes (any role)
router.post('/candidates/:id/notes',   isRecruiter, adminController.addNote);
router.get('/candidates/:id/notes',    isRecruiter, adminController.getNotes);

// Export candidates (Admin+)
router.get('/candidates/export/csv',   isAdmin, adminController.exportCsv);

// Scoring configuration (Admin+)
router.get('/scoring-config',   isAdmin, adminController.getScoringConfig);
router.patch('/scoring-config', isAdmin, adminController.updateScoringConfig);

// Send the daily summary report on demand (Admin+)
router.post('/send-report',     isAdmin, adminController.sendReportNow);

module.exports = router;
