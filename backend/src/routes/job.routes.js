const router = require('express').Router();
const jobController = require('../controllers/job.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { isAdmin } = require('../middleware/rbac.middleware');

// Public — candidate-facing
router.get('/public',      jobController.listPublishedJobs);
router.get('/public/:id',  jobController.getPublicJob);

// Admin — authenticated
router.use(authenticate);
router.get('/',            isAdmin, jobController.listJobs);
router.get('/:id',         isAdmin, jobController.getJob);
router.post('/',           isAdmin, jobController.createJob);
router.patch('/:id',       isAdmin, jobController.updateJob);
router.delete('/:id',      isAdmin, jobController.deleteJob);

module.exports = router;
