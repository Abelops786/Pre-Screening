const multer = require('multer');
const path = require('path');

const ALLOWED_DOC_TYPES  = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const ALLOWED_AUDIO_TYPES = ['audio/webm', 'audio/ogg', 'audio/wav', 'audio/mpeg', 'audio/mp4'];
const MAX_DOC_SIZE   = 10 * 1024 * 1024; // 10 MB
const MAX_AUDIO_SIZE = 50 * 1024 * 1024; // 50 MB

const memoryStorage = multer.memoryStorage();

const docFilter = (_req, file, cb) => {
  if (ALLOWED_DOC_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF and DOCX files are accepted'), false);
  }
};

const audioFilter = (_req, file, cb) => {
  if (ALLOWED_AUDIO_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only audio files (webm, ogg, wav, mp3) are accepted'), false);
  }
};

const uploadDocs = multer({
  storage: memoryStorage,
  fileFilter: docFilter,
  limits: { fileSize: MAX_DOC_SIZE },
});

const uploadAudio = multer({
  storage: memoryStorage,
  fileFilter: audioFilter,
  limits: { fileSize: MAX_AUDIO_SIZE },
});

module.exports = { uploadDocs, uploadAudio };
