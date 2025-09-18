const express = require('express');
const router = express.Router();
const workspaceController = require('../controllers/workspaceController');
const { authMiddleware, workspaceAuth } = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

// Workspace CRUD
router.post('/', workspaceController.createWorkspace);
router.get('/:workspaceId', workspaceController.getWorkspace);
router.put('/:workspaceId', workspaceAuth, workspaceController.updateWorkspace);
router.delete('/:workspaceId', workspaceController.deleteWorkspace);

// Member management
router.get('/:workspaceId/members', workspaceAuth, workspaceController.getWorkspaceMembers);
router.post('/:workspaceId/members/invite', workspaceAuth, workspaceController.inviteMember);
router.delete('/:workspaceId/members/:memberId', workspaceAuth, workspaceController.removeMember);
router.put('/:workspaceId/members/:memberId/role', workspaceAuth, workspaceController.updateMemberRole);
router.post('/:workspaceId/leave', workspaceAuth, workspaceController.leaveWorkspace);

module.exports = router;
