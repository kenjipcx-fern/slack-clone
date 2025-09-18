const express = require('express');
const router = express.Router();
const multer = require('multer');
const emojiController = require('../controllers/emojiController');
const { authMiddleware, workspaceAuth } = require('../middleware/auth');

// Configure multer for emoji uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB limit for emojis
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PNG, JPEG, GIF, and WebP are allowed.'));
    }
  }
});

// All routes require authentication
router.use(authMiddleware);

// Default emojis (no workspace required)
router.get('/default', emojiController.getDefaultEmojis);

// Workspace emojis
router.get('/workspace/:workspaceId', emojiController.getWorkspaceEmojis);
router.post('/workspace/:workspaceId', workspaceAuth, emojiController.createCustomEmoji);
router.post('/workspace/:workspaceId/upload', workspaceAuth, upload.single('emoji'), emojiController.uploadCustomEmoji);
router.delete('/workspace/:workspaceId/emoji/:emojiId', workspaceAuth, emojiController.deleteCustomEmoji);

// Search and usage
router.get('/workspace/:workspaceId/search', emojiController.searchEmojis);
router.get('/workspace/:workspaceId/frequent', emojiController.getFrequentlyUsedEmojis);

module.exports = router;
