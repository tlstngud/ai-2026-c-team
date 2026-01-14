const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
    createDrivingLog,
    getDrivingLogs,
    getDrivingLog,
    deleteDrivingLog
} = require('../controllers/drivingLogController');

router.post('/', authenticateToken, createDrivingLog);
router.get('/', authenticateToken, getDrivingLogs);
router.get('/:logId', authenticateToken, getDrivingLog);
router.delete('/:logId', authenticateToken, deleteDrivingLog);

module.exports = router;
