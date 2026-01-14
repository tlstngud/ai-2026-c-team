const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getMe, updateMe, updatePassword } = require('../controllers/userController');
const { getStatistics, getMonthlyStatistics } = require('../controllers/statisticsController');

router.get('/me', authenticateToken, getMe);
router.put('/me', authenticateToken, updateMe);
router.put('/me/password', authenticateToken, updatePassword);
router.get('/me/statistics', authenticateToken, getStatistics);
router.get('/me/statistics/monthly', authenticateToken, getMonthlyStatistics);

module.exports = router;
