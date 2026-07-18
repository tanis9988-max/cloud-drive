const express = require('express');
const authenticate = require('../middleware/auth');
const { analytics } = require('../controllers/fileController');

const router = express.Router();
router.use(authenticate);
router.get('/', analytics);

module.exports = router;
