const { Workspace, WorkspaceMember, User, Channel, ChannelMember } = require('../models');
const { sequelize } = require('../config/database');

const createWorkspace = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Workspace name is required' });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    // Check if slug exists
    const existingWorkspace = await Workspace.findOne({ where: { slug } });
    if (existingWorkspace) {
      return res.status(409).json({ error: 'Workspace URL already exists' });
    }

    // Create workspace
    const workspace = await Workspace.create({
      name,
      slug,
      description,
      ownerId: req.userId,
      memberCount: 1
    }, { transaction: t });

    // Add creator as owner
    await WorkspaceMember.create({
      workspaceId: workspace.id,
      userId: req.userId,
      role: 'owner',
      displayName: req.user.fullName
    }, { transaction: t });

    // Create default channels
    const generalChannel = await Channel.create({
      workspaceId: workspace.id,
      name: 'general',
      displayName: 'General',
      type: 'public',
      description: 'Company-wide announcements and work-based matters',
      creatorId: req.userId,
      isGeneral: true,
      memberCount: 1
    }, { transaction: t });

    const randomChannel = await Channel.create({
      workspaceId: workspace.id,
      name: 'random',
      displayName: 'Random',
      type: 'public',
      description: 'Non-work banter and water cooler conversation',
      creatorId: req.userId,
      memberCount: 1
    }, { transaction: t });

    // Add creator to default channels
    await ChannelMember.bulkCreate([
      {
        channelId: generalChannel.id,
        userId: req.userId,
        role: 'admin'
      },
      {
        channelId: randomChannel.id,
        userId: req.userId,
        role: 'admin'
      }
    ], { transaction: t });

    await t.commit();

    res.status(201).json({
      message: 'Workspace created successfully',
      workspace,
      channels: [generalChannel, randomChannel]
    });
  } catch (error) {
    await t.rollback();
    console.error('Create workspace error:', error);
    res.status(500).json({ error: 'Failed to create workspace' });
  }
};

const getWorkspace = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    
    const workspace = await Workspace.findByPk(workspaceId, {
      include: [
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'username', 'fullName', 'avatar']
        }
      ]
    });

    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // Check if user is member
    const member = await WorkspaceMember.findOne({
      where: {
        workspaceId,
        userId: req.userId
      }
    });

    if (!member) {
      return res.status(403).json({ error: 'Not a member of this workspace' });
    }

    res.json({ workspace, memberInfo: member });
  } catch (error) {
    console.error('Get workspace error:', error);
    res.status(500).json({ error: 'Failed to get workspace' });
  }
};

const updateWorkspace = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { name, description, icon, settings } = req.body;

    // Check if user is admin/owner
    const member = await WorkspaceMember.findOne({
      where: {
        workspaceId,
        userId: req.userId,
        role: ['owner', 'admin']
      }
    });

    if (!member) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const workspace = await Workspace.findByPk(workspaceId);
    
    const updateData = {};
    if (name) {
      updateData.name = name;
      updateData.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    }
    if (description !== undefined) updateData.description = description;
    if (icon) updateData.icon = icon;
    if (settings) updateData.settings = { ...workspace.settings, ...settings };

    await workspace.update(updateData);

    res.json({
      message: 'Workspace updated successfully',
      workspace
    });
  } catch (error) {
    console.error('Update workspace error:', error);
    res.status(500).json({ error: 'Failed to update workspace' });
  }
};

const deleteWorkspace = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    // Check if user is owner
    const workspace = await Workspace.findOne({
      where: {
        id: workspaceId,
        ownerId: req.userId
      }
    });

    if (!workspace) {
      return res.status(403).json({ error: 'Only workspace owner can delete workspace' });
    }

    await workspace.destroy();

    res.json({ message: 'Workspace deleted successfully' });
  } catch (error) {
    console.error('Delete workspace error:', error);
    res.status(500).json({ error: 'Failed to delete workspace' });
  }
};

const getWorkspaceMembers = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { page = 1, limit = 50, search, role } = req.query;

    const whereClause = {
      workspaceId,
      isActive: true
    };

    if (role) {
      whereClause.role = role;
    }

    const members = await WorkspaceMember.findAndCountAll({
      where: whereClause,
      include: [{
        model: User,
        attributes: ['id', 'username', 'email', 'fullName', 'avatar', 'status', 'statusMessage', 'isOnline'],
        where: search ? {
          [sequelize.Sequelize.Op.or]: [
            { fullName: { [sequelize.Sequelize.Op.iLike]: `%${search}%` } },
            { username: { [sequelize.Sequelize.Op.iLike]: `%${search}%` } },
            { email: { [sequelize.Sequelize.Op.iLike]: `%${search}%` } }
          ]
        } : undefined
      }],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['joinedAt', 'DESC']]
    });

    res.json({
      members: members.rows,
      total: members.count,
      page: parseInt(page),
      totalPages: Math.ceil(members.count / parseInt(limit))
    });
  } catch (error) {
    console.error('Get workspace members error:', error);
    res.status(500).json({ error: 'Failed to get members' });
  }
};

const inviteMember = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { workspaceId } = req.params;
    const { email, role = 'member' } = req.body;

    // Check if inviter has permission
    const inviter = await WorkspaceMember.findOne({
      where: {
        workspaceId,
        userId: req.userId,
        isActive: true
      }
    });

    if (!inviter || (!inviter.permissions.canInvite && !['owner', 'admin'].includes(inviter.role))) {
      return res.status(403).json({ error: 'No permission to invite members' });
    }

    // Find or create user
    let user = await User.findOne({ where: { email } });
    
    if (!user) {
      // Create placeholder user
      const username = email.split('@')[0] + Math.random().toString(36).substr(2, 5);
      user = await User.create({
        email,
        username,
        fullName: email.split('@')[0],
        password: Math.random().toString(36).substr(2, 10), // Temporary password
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(email)}&background=random`
      }, { transaction: t });
    }

    // Check if already member
    const existingMember = await WorkspaceMember.findOne({
      where: {
        workspaceId,
        userId: user.id
      }
    });

    if (existingMember) {
      await t.rollback();
      return res.status(409).json({ error: 'User is already a member' });
    }

    // Add to workspace
    const member = await WorkspaceMember.create({
      workspaceId,
      userId: user.id,
      role,
      invitedBy: req.userId,
      displayName: user.fullName
    }, { transaction: t });

    // Add to general channel
    const generalChannel = await Channel.findOne({
      where: {
        workspaceId,
        isGeneral: true
      }
    });

    if (generalChannel) {
      await ChannelMember.create({
        channelId: generalChannel.id,
        userId: user.id,
        role: 'member'
      }, { transaction: t });

      await generalChannel.increment('memberCount', { transaction: t });
    }

    // Update workspace member count
    await Workspace.increment('memberCount', {
      where: { id: workspaceId },
      transaction: t
    });

    await t.commit();

    res.status(201).json({
      message: 'Member invited successfully',
      member,
      user: user.toJSON()
    });
  } catch (error) {
    await t.rollback();
    console.error('Invite member error:', error);
    res.status(500).json({ error: 'Failed to invite member' });
  }
};

const removeMember = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { workspaceId, memberId } = req.params;

    // Check permissions
    const requester = await WorkspaceMember.findOne({
      where: {
        workspaceId,
        userId: req.userId,
        role: ['owner', 'admin']
      }
    });

    if (!requester) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const member = await WorkspaceMember.findOne({
      where: {
        workspaceId,
        userId: memberId
      }
    });

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Cannot remove owner
    if (member.role === 'owner') {
      return res.status(403).json({ error: 'Cannot remove workspace owner' });
    }

    // Remove from all channels
    await ChannelMember.destroy({
      where: {
        userId: memberId
      },
      include: [{
        model: Channel,
        where: { workspaceId }
      }],
      transaction: t
    });

    // Remove from workspace
    await member.destroy({ transaction: t });

    // Update member count
    await Workspace.decrement('memberCount', {
      where: { id: workspaceId },
      transaction: t
    });

    await t.commit();

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    await t.rollback();
    console.error('Remove member error:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
};

const updateMemberRole = async (req, res) => {
  try {
    const { workspaceId, memberId } = req.params;
    const { role } = req.body;

    // Check permissions
    const requester = await WorkspaceMember.findOne({
      where: {
        workspaceId,
        userId: req.userId,
        role: ['owner', 'admin']
      }
    });

    if (!requester) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const member = await WorkspaceMember.findOne({
      where: {
        workspaceId,
        userId: memberId
      }
    });

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Cannot change owner role
    if (member.role === 'owner' || role === 'owner') {
      return res.status(403).json({ error: 'Cannot change owner role' });
    }

    await member.update({ role });

    res.json({
      message: 'Member role updated successfully',
      member
    });
  } catch (error) {
    console.error('Update member role error:', error);
    res.status(500).json({ error: 'Failed to update member role' });
  }
};

const leaveWorkspace = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { workspaceId } = req.params;

    const member = await WorkspaceMember.findOne({
      where: {
        workspaceId,
        userId: req.userId
      }
    });

    if (!member) {
      return res.status(404).json({ error: 'Not a member of this workspace' });
    }

    // Cannot leave if owner
    if (member.role === 'owner') {
      return res.status(403).json({ error: 'Workspace owner cannot leave. Transfer ownership first.' });
    }

    // Remove from all channels
    await ChannelMember.destroy({
      where: {
        userId: req.userId
      },
      include: [{
        model: Channel,
        where: { workspaceId }
      }],
      transaction: t
    });

    // Remove from workspace
    await member.destroy({ transaction: t });

    // Update member count
    await Workspace.decrement('memberCount', {
      where: { id: workspaceId },
      transaction: t
    });

    await t.commit();

    res.json({ message: 'Left workspace successfully' });
  } catch (error) {
    await t.rollback();
    console.error('Leave workspace error:', error);
    res.status(500).json({ error: 'Failed to leave workspace' });
  }
};

module.exports = {
  createWorkspace,
  getWorkspace,
  updateWorkspace,
  deleteWorkspace,
  getWorkspaceMembers,
  inviteMember,
  removeMember,
  updateMemberRole,
  leaveWorkspace
};
