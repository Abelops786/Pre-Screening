const router = require('express').Router();

router.use('/auth',       require('./auth.routes'));
router.use('/candidates', require('./candidate.routes'));
router.use('/upload',     require('./upload.routes'));
router.use('/audio',      require('./audio.routes'));
router.use('/admin',      require('./admin.routes'));
router.use('/jobs',       require('./job.routes'));
router.use('/departments', require('./department.routes'));
router.use('/questionnaires', require('./questionnaire.routes'));
// Stage 2 stubs – wired but not implemented until MS credentials are provided
router.use('/recruiter',  require('./stage2.routes'));
router.use('/interviews', require('./stage2.routes'));
router.use('/webhooks',   require('./stage2.routes'));

module.exports = router;
