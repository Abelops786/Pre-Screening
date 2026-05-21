const router = require('express').Router();
const { body } = require('express-validator');
const candidateController = require('../controllers/candidate.controller');

const submitValidation = [
  body('fullName').trim().notEmpty().withMessage('Full name is required'),
  body('email').isEmail().normalizeEmail(),
  body('phone').trim().notEmpty(),
  body('location').trim().notEmpty(),
  body('yearsExperience').isInt({ min: 0 }),
  body('availabilityShift').isIn(['morning', 'afternoon', 'evening', 'night', 'flexible']),
  body('certifications').optional().isArray(),
  body('selectedLanguage').trim().notEmpty(),
];

// Public endpoint – candidate submits application
router.post('/', submitValidation, candidateController.submit);

// Public endpoint – save system check results for a candidate session
router.post('/:id/system-check', candidateController.saveSystemCheck);

module.exports = router;
