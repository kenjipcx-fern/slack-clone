const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { authMiddleware } = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

// Message operations
router.post('/channel/:channelId', messageController.sendMessage);
router.get('/channel/:channelId', messageController.getChannelMessages);
router.get('/:messageId', messageController.getMessage);
router.put('/:messageId', messageController.updateMessage);
router.delete('/:messageId', messageController.deleteMessage);

// Reactions
router.post('/:messageId/reactions', messageController.addReaction);
router.delete('/:messageId/reactions', messageController.removeReaction);

// Pinning
router.post('/:messageId/pin', messageController.pinMessage);
router.delete('/:messageId/pin', messageController.unpinMessage);
router.get('/channel/:channelId/pinned', messageController.getPinnedMessages);

// Search
router.get('/search/workspace/:workspaceId', messageController.searchMessages);

module.exports = router;
