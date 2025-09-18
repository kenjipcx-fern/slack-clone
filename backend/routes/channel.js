const express = require('express');
const router = express.Router();
const channelController = require('../controllers/channelController');
const { authMiddleware, workspaceAuth, channelAuth } = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

// Channel operations within workspace
router.post('/workspace/:workspaceId', workspaceAuth, channelController.createChannel);
router.get('/workspace/:workspaceId', workspaceAuth, channelController.getWorkspaceChannels);

// Channel-specific operations
router.get('/:channelId', channelController.getChannel);
router.put('/:channelId', channelAuth, channelController.updateChannel);
router.post('/:channelId/join', channelController.joinChannel);
router.post('/:channelId/leave', channelController.leaveChannel);
router.post('/:channelId/archive', channelAuth, channelController.archiveChannel);
router.post('/:channelId/unarchive', channelAuth, channelController.unarchiveChannel);

// Channel member management
router.get('/:channelId/members', channelAuth, channelController.getChannelMembers);
router.post('/:channelId/members', channelAuth, channelController.addChannelMember);
router.delete('/:channelId/members/:memberId', channelAuth, channelController.removeChannelMember);

module.exports = router;
