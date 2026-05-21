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
router.post('/candidates/:id/assign',  isAdmin, adminController.assignRecruiter);

// Internal notes (any role)
router.post('/candidates/:id/notes',   isRecruiter, adminController.addNote);
router.get('/candidates/:id/notes',    isRecruiter, adminController.getNotes);

// Export candidates (Admin+)
router.get('/candidates/export/csv',   isAdmin, adminController.exportCsv);

module.exports = router;
