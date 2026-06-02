const express = require('express');
const msController = require('../../controllers/ms.controller');
const { authenticate } = require('../../middleware/auth.middleware');

const router = express.Router();

router.get('/login', msController.login);
router.get('/callback', msController.callback);
router.get('/status', authenticate, msController.status);

module.exports = router;
