const router = require('express').Router();
const qc = require('../controllers/questionnaire.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { isAdmin } = require('../middleware/rbac.middleware');

// Public — apply page fetches schema for a department
router.get('/public/:department', qc.getPublicTemplate);

// Admin
router.use(authenticate);
router.get('/',                   isAdmin, qc.listTemplates);
router.get('/:department',        isAdmin, qc.getTemplate);
router.put('/:department',        isAdmin, qc.updateTemplate);
router.post('/:department/reset', isAdmin, qc.resetTemplate);

module.exports = router;
