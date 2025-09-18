const express = require('express');
const router = express.Router();
const huddleController = require('../controllers/huddleController');
const { authMiddleware } = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

// Huddle operations
router.post('/channel/:channelId/start', huddleController.startHuddle);
router.post('/:huddleId/join', huddleController.joinHuddle);
router.post('/:huddleId/leave', huddleController.leaveHuddle);
router.post('/:huddleId/end', huddleController.endHuddle);
router.get('/:huddleId', huddleController.getHuddle);
router.get('/workspace/:workspaceId/active', huddleController.getActiveHuddles);

// Participant operations
router.put('/:huddleId/participant/status', huddleController.updateParticipantStatus);
router.post('/:huddleId/invite', huddleController.inviteToHuddle);

// Recording
router.post('/:huddleId/recording', huddleController.toggleRecording);

module.exports = router;
