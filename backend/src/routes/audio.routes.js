const router = require('express').Router();
const { uploadAudio } = require('../middleware/upload.middleware');
const audioController = require('../controllers/audio.controller');

// Public – upload audio for Whisper analysis + auto-filter
router.post(
  '/:candidateId',
  uploadAudio.single('audio'),
  audioController.processAudio,
);

module.exports = router;
