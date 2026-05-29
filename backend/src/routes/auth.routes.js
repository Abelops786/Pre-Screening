const router = require('express').Router();
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { isSuperAdmin } = require('../middleware/rbac.middleware');

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty().isLength({ min: 6 }),
];

const createUserValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('name').trim().notEmpty(),
  body('role').isIn(['ADMIN', 'RECRUITER']),
  body('department').optional().trim(),
];

router.post('/login',  loginValidation,      authController.login);
router.get('/me',      authenticate,         authController.getMe);
router.post('/users',  authenticate, isSuperAdmin, createUserValidation, authController.createUser);
router.get('/users',   authenticate, isSuperAdmin, authController.listUsers);
router.patch('/users/:id',  authenticate, isSuperAdmin, authController.updateUser);
router.delete('/users/:id', authenticate, isSuperAdmin, authController.deleteUser);
router.use('/ms', require('./v1/ms.routes'));

module.exports = router;
