const express = require('express');
const router = express.Router();
const multer = require('multer');
const fileController = require('../controllers/fileController');
const { authMiddleware, workspaceAuth } = require('../middleware/auth');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// All routes require authentication
router.use(authMiddleware);

// File operations
router.post('/workspace/:workspaceId/upload', workspaceAuth, upload.single('file'), fileController.uploadFile);
router.get('/:fileId', fileController.getFile);
router.get('/:fileId/download', fileController.downloadFile);
router.delete('/:fileId', fileController.deleteFile);

// Workspace files
router.get('/workspace/:workspaceId', workspaceAuth, fileController.getWorkspaceFiles);
router.get('/workspace/:workspaceId/search', workspaceAuth, fileController.searchFiles);

module.exports = router;
