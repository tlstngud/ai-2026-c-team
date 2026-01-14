const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getCoupons, issueCoupon, useCoupon, getCoupon } = require('../controllers/couponController');

router.get('/', authenticateToken, getCoupons);
router.post('/issue', authenticateToken, issueCoupon);
router.post('/:couponId/use', authenticateToken, useCoupon);
router.get('/:couponId', authenticateToken, getCoupon);

module.exports = router;
