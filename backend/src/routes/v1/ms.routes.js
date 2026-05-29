const express = require('express');
const msController = require('../../controllers/ms.controller');

const router = express.Router();

router.get('/login', msController.login);
router.get('/callback', msController.callback);

module.exports = router;
