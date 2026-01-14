const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
    getChallenges,
    getChallenge,
    joinChallenge,
    getChallengeStatus
} = require('../controllers/challengeController');

router.get('/', authenticateToken, getChallenges);
router.get('/:challengeId', authenticateToken, getChallenge);
router.post('/:challengeId/join', authenticateToken, joinChallenge);
router.get('/:challengeId/status', authenticateToken, getChallengeStatus);

module.exports = router;
