const router = require('express').Router();
const { uploadDocs } = require('../middleware/upload.middleware');
const uploadController = require('../controllers/upload.controller');

// Public – upload CV and/or certificate for a candidate
router.post(
  '/:candidateId/documents',
  uploadDocs.fields([
    { name: 'cv', maxCount: 1 },
    { name: 'certificate', maxCount: 1 },
  ]),
  uploadController.uploadDocuments,
);

module.exports = router;
