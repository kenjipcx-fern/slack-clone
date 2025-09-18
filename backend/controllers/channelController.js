const { Channel, ChannelMember, User, Message, WorkspaceMember } = require('../models');
const { sequelize } = require('../config/database');

const createChannel = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { workspaceId } = req.params;
    const { name, displayName, description, type = 'public', memberIds = [] } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Channel name is required' });
    }

    // Check if user can create channels
    const workspaceMember = await WorkspaceMember.findOne({
      where: {
        workspaceId,
        userId: req.userId,
        isActive: true
      }
    });

    if (!workspaceMember || (!workspaceMember.permissions.canCreateChannels && !['owner', 'admin'].includes(workspaceMember.role))) {
      return res.status(403).json({ error: 'No permission to create channels' });
    }

    // Check if channel name exists
    const existingChannel = await Channel.findOne({
      where: {
        workspaceId,
        name: name.toLowerCase().replace(/[^a-z0-9-_]/g, '')
      }
    });

    if (existingChannel) {
      return res.status(409).json({ error: 'Channel name already exists' });
    }

    // Create channel
    const channel = await Channel.create({
      workspaceId,
      name: name.toLowerCase().replace(/[^a-z0-9-_]/g, ''),
      displayName: displayName || name,
      description,
      type,
      creatorId: req.userId,
      memberCount: 1
    }, { transaction: t });

    // Add creator as admin
    await ChannelMember.create({
      channelId: channel.id,
      userId: req.userId,
      role: 'admin'
    }, { transaction: t });

    // Add additional members if private channel
    if (type === 'private' && memberIds.length > 0) {
      const members = memberIds.map(userId => ({
        channelId: channel.id,
        userId,
        role: 'member'
      }));
      
      await ChannelMember.bulkCreate(members, { transaction: t });
      await channel.increment('memberCount', { by: memberIds.length, transaction: t });
    }

    // Create system message
    await Message.create({
      channelId: channel.id,
      userId: req.userId,
      content: `${req.user.fullName} created the channel`,
      type: 'system'
    }, { transaction: t });

    await t.commit();

    res.status(201).json({
      message: 'Channel created successfully',
      channel
    });
  } catch (error) {
    await t.rollback();
    console.error('Create channel error:', error);
    res.status(500).json({ error: 'Failed to create channel' });
  }
};

const getChannel = async (req, res) => {
  try {
    const { channelId } = req.params;

    const channel = await Channel.findByPk(channelId, {
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'username', 'fullName', 'avatar']
      }]
    });

    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    // Check if user has access
    if (channel.type !== 'public') {
      const member = await ChannelMember.findOne({
        where: {
          channelId,
          userId: req.userId
        }
      });

      if (!member) {
        return res.status(403).json({ error: 'No access to this channel' });
      }
    }

    res.json({ channel });
  } catch (error) {
    console.error('Get channel error:', error);
    res.status(500).json({ error: 'Failed to get channel' });
  }
};

const getWorkspaceChannels = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { includePrivate = false } = req.query;

    // Get channels user is member of
    const memberChannels = await ChannelMember.findAll({
      where: { userId: req.userId },
      include: [{
        model: Channel,
        where: {
          workspaceId,
          isArchived: false
        },
        include: [{
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'fullName', 'avatar']
        }]
      }],
      order: [[Channel, 'name', 'ASC']]
    });

    // Get public channels if requested
    let publicChannels = [];
    if (!includePrivate) {
      publicChannels = await Channel.findAll({
        where: {
          workspaceId,
          type: 'public',
          isArchived: false
        },
        include: [{
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'fullName', 'avatar']
        }],
        order: [['name', 'ASC']]
      });
    }

    const channels = memberChannels.map(mc => ({
      ...mc.Channel.toJSON(),
      membership: {
        joinedAt: mc.joinedAt,
        role: mc.role,
        lastReadAt: mc.lastReadAt,
        unreadCount: mc.unreadCount,
        isMuted: mc.isMuted,
        isPinned: mc.isPinned
      }
    }));

    res.json({
      memberChannels: channels,
      publicChannels
    });
  } catch (error) {
    console.error('Get workspace channels error:', error);
    res.status(500).json({ error: 'Failed to get channels' });
  }
};

const updateChannel = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { displayName, description, topic, settings } = req.body;

    // Check if user is channel admin
    const member = await ChannelMember.findOne({
      where: {
        channelId,
        userId: req.userId,
        role: 'admin'
      }
    });

    if (!member) {
      return res.status(403).json({ error: 'Only channel admins can update channel' });
    }

    const channel = await Channel.findByPk(channelId);
    
    const updateData = {};
    if (displayName) updateData.displayName = displayName;
    if (description !== undefined) updateData.description = description;
    if (topic !== undefined) updateData.topic = topic;
    if (settings) updateData.settings = { ...channel.settings, ...settings };

    await channel.update(updateData);

    res.json({
      message: 'Channel updated successfully',
      channel
    });
  } catch (error) {
    console.error('Update channel error:', error);
    res.status(500).json({ error: 'Failed to update channel' });
  }
};

const joinChannel = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { channelId } = req.params;

    const channel = await Channel.findByPk(channelId);
    
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    if (channel.type !== 'public') {
      return res.status(403).json({ error: 'Cannot join private channel without invitation' });
    }

    // Check if already member
    const existingMember = await ChannelMember.findOne({
      where: {
        channelId,
        userId: req.userId
      }
    });

    if (existingMember) {
      return res.status(409).json({ error: 'Already a member of this channel' });
    }

    // Add to channel
    const member = await ChannelMember.create({
      channelId,
      userId: req.userId,
      role: 'member'
    }, { transaction: t });

    await channel.increment('memberCount', { transaction: t });

    // Create system message
    await Message.create({
      channelId,
      userId: req.userId,
      content: `${req.user.fullName} joined the channel`,
      type: 'system'
    }, { transaction: t });

    await t.commit();

    res.json({
      message: 'Joined channel successfully',
      member
    });
  } catch (error) {
    await t.rollback();
    console.error('Join channel error:', error);
    res.status(500).json({ error: 'Failed to join channel' });
  }
};

const leaveChannel = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { channelId } = req.params;

    const channel = await Channel.findByPk(channelId);
    
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    if (channel.isGeneral) {
      return res.status(403).json({ error: 'Cannot leave general channel' });
    }

    const member = await ChannelMember.findOne({
      where: {
        channelId,
        userId: req.userId
      }
    });

    if (!member) {
      return res.status(404).json({ error: 'Not a member of this channel' });
    }

    await member.destroy({ transaction: t });
    await channel.decrement('memberCount', { transaction: t });

    // Create system message
    await Message.create({
      channelId,
      userId: req.userId,
      content: `${req.user.fullName} left the channel`,
      type: 'system'
    }, { transaction: t });

    await t.commit();

    res.json({ message: 'Left channel successfully' });
  } catch (error) {
    await t.rollback();
    console.error('Leave channel error:', error);
    res.status(500).json({ error: 'Failed to leave channel' });
  }
};

const getChannelMembers = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const members = await ChannelMember.findAndCountAll({
      where: { channelId },
      include: [{
        model: User,
        attributes: ['id', 'username', 'email', 'fullName', 'avatar', 'status', 'statusMessage', 'isOnline']
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
    console.error('Get channel members error:', error);
    res.status(500).json({ error: 'Failed to get members' });
  }
};

const addChannelMember = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { channelId } = req.params;
    const { userId } = req.body;

    const channel = await Channel.findByPk(channelId);
    
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    // Check if requester is channel admin or workspace admin
    const requesterMember = await ChannelMember.findOne({
      where: {
        channelId,
        userId: req.userId,
        role: 'admin'
      }
    });

    if (!requesterMember) {
      return res.status(403).json({ error: 'Only channel admins can add members' });
    }

    // Check if user to add is workspace member
    const workspaceMember = await WorkspaceMember.findOne({
      where: {
        workspaceId: channel.workspaceId,
        userId,
        isActive: true
      }
    });

    if (!workspaceMember) {
      return res.status(404).json({ error: 'User is not a workspace member' });
    }

    // Check if already member
    const existingMember = await ChannelMember.findOne({
      where: {
        channelId,
        userId
      }
    });

    if (existingMember) {
      return res.status(409).json({ error: 'User is already a channel member' });
    }

    // Add to channel
    const member = await ChannelMember.create({
      channelId,
      userId,
      role: 'member'
    }, { transaction: t });

    await channel.increment('memberCount', { transaction: t });

    // Get user info for system message
    const user = await User.findByPk(userId);
    
    // Create system message
    await Message.create({
      channelId,
      userId: req.userId,
      content: `${req.user.fullName} added ${user.fullName} to the channel`,
      type: 'system'
    }, { transaction: t });

    await t.commit();

    res.json({
      message: 'Member added successfully',
      member
    });
  } catch (error) {
    await t.rollback();
    console.error('Add channel member error:', error);
    res.status(500).json({ error: 'Failed to add member' });
  }
};

const removeChannelMember = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { channelId, memberId } = req.params;

    const channel = await Channel.findByPk(channelId);
    
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    // Check if requester is channel admin
    const requesterMember = await ChannelMember.findOne({
      where: {
        channelId,
        userId: req.userId,
        role: 'admin'
      }
    });

    if (!requesterMember && memberId !== req.userId) {
      return res.status(403).json({ error: 'Only channel admins can remove members' });
    }

    const member = await ChannelMember.findOne({
      where: {
        channelId,
        userId: memberId
      }
    });

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    await member.destroy({ transaction: t });
    await channel.decrement('memberCount', { transaction: t });

    // Get user info for system message
    const user = await User.findByPk(memberId);
    
    // Create system message
    const message = memberId === req.userId 
      ? `${user.fullName} left the channel`
      : `${req.user.fullName} removed ${user.fullName} from the channel`;
      
    await Message.create({
      channelId,
      userId: req.userId,
      content: message,
      type: 'system'
    }, { transaction: t });

    await t.commit();

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    await t.rollback();
    console.error('Remove channel member error:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
};

const archiveChannel = async (req, res) => {
  try {
    const { channelId } = req.params;

    // Check if user is channel admin
    const member = await ChannelMember.findOne({
      where: {
        channelId,
        userId: req.userId,
        role: 'admin'
      }
    });

    if (!member) {
      return res.status(403).json({ error: 'Only channel admins can archive channels' });
    }

    const channel = await Channel.findByPk(channelId);
    
    if (channel.isGeneral) {
      return res.status(403).json({ error: 'Cannot archive general channel' });
    }

    await channel.update({ isArchived: true });

    res.json({
      message: 'Channel archived successfully',
      channel
    });
  } catch (error) {
    console.error('Archive channel error:', error);
    res.status(500).json({ error: 'Failed to archive channel' });
  }
};

const unarchiveChannel = async (req, res) => {
  try {
    const { channelId } = req.params;

    // Check if user is channel admin
    const member = await ChannelMember.findOne({
      where: {
        channelId,
        userId: req.userId,
        role: 'admin'
      }
    });

    if (!member) {
      return res.status(403).json({ error: 'Only channel admins can unarchive channels' });
    }

    const channel = await Channel.findByPk(channelId);
    await channel.update({ isArchived: false });

    res.json({
      message: 'Channel unarchived successfully',
      channel
    });
  } catch (error) {
    console.error('Unarchive channel error:', error);
    res.status(500).json({ error: 'Failed to unarchive channel' });
  }
};

module.exports = {
  createChannel,
  getChannel,
  getWorkspaceChannels,
  updateChannel,
  joinChannel,
  leaveChannel,
  getChannelMembers,
  addChannelMember,
  removeChannelMember,
  archiveChannel,
  unarchiveChannel
};
