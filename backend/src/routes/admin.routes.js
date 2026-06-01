const router = require('express').Router();
const adminController = require('../controllers/admin.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { isAdmin, isSuperAdmin, isRecruiter } = require('../middleware/rbac.middleware');

// All admin routes require authentication
router.use(authenticate);

// Analytics (Admin+)
router.get('/analytics', isAdmin, adminController.getAnalytics);

// Candidate management (Admin+)
router.get('/candidates',              isAdmin, adminController.listCandidates);
router.get('/candidates/:id',          isRecruiter, adminController.getCandidate);
router.patch('/candidates/:id/status', isAdmin, adminController.updateStatus);
router.delete('/candidates/:id',       isAdmin, adminController.deleteCandidate);
router.post('/candidates/:id/assign',  isAdmin, adminController.assignRecruiter);

// Generate Teams meeting link for a Level 1 passed candidate (Admin+)
router.post('/candidates/:id/generate-teams-link', isAdmin, adminController.generateTeamsLink);

// Internal notes (any role)
router.post('/candidates/:id/notes',   isRecruiter, adminController.addNote);
router.get('/candidates/:id/notes',    isRecruiter, adminController.getNotes);

// Export candidates (Admin+)
router.get('/candidates/export/csv',   isAdmin, adminController.exportCsv);

module.exports = router;
