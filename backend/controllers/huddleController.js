const { Huddle, Channel, ChannelMember, User, Message } = require('../models');
const { sequelize } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const startHuddle = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { channelId } = req.params;
    const { type = 'audio', name, settings } = req.body;

    // Check if user is channel member
    const member = await ChannelMember.findOne({
      where: {
        channelId,
        userId: req.userId
      }
    });

    if (!member) {
      return res.status(403).json({ error: 'Not a channel member' });
    }

    // Check if there's an active huddle in the channel
    const activeHuddle = await Huddle.findOne({
      where: {
        channelId,
        status: 'active'
      }
    });

    if (activeHuddle) {
      return res.status(409).json({ 
        error: 'There is already an active huddle in this channel',
        huddle: activeHuddle
      });
    }

    // Create huddle
    const huddle = await Huddle.create({
      channelId,
      initiatorId: req.userId,
      name: name || `Huddle in #${(await Channel.findByPk(channelId)).name}`,
      type,
      status: 'active',
      participants: [{
        userId: req.userId,
        username: req.user.username,
        fullName: req.user.fullName,
        avatar: req.user.avatar,
        joinedAt: new Date(),
        isMuted: false,
        isVideoOn: type === 'video',
        isScreenSharing: false
      }],
      settings: settings || {}
    }, { transaction: t });

    // Create system message
    await Message.create({
      channelId,
      userId: req.userId,
      content: `${req.user.fullName} started a huddle`,
      type: 'system',
      metadata: {
        huddleId: huddle.id,
        huddleType: type
      }
    }, { transaction: t });

    await t.commit();

    // Generate WebRTC signaling room ID
    const roomId = `huddle-${huddle.id}`;

    res.status(201).json({
      message: 'Huddle started successfully',
      huddle,
      roomId,
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });
  } catch (error) {
    await t.rollback();
    console.error('Start huddle error:', error);
    res.status(500).json({ error: 'Failed to start huddle' });
  }
};

const joinHuddle = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { huddleId } = req.params;

    const huddle = await Huddle.findByPk(huddleId);
    
    if (!huddle) {
      return res.status(404).json({ error: 'Huddle not found' });
    }

    if (huddle.status !== 'active') {
      return res.status(400).json({ error: 'Huddle is not active' });
    }

    // Check if user is channel member
    const member = await ChannelMember.findOne({
      where: {
        channelId: huddle.channelId,
        userId: req.userId
      }
    });

    if (!member) {
      return res.status(403).json({ error: 'Not a channel member' });
    }

    // Check if already in huddle
    const participants = huddle.participants || [];
    const isAlreadyInHuddle = participants.some(p => p.userId === req.userId);

    if (isAlreadyInHuddle) {
      return res.status(409).json({ error: 'Already in huddle' });
    }

    // Check max participants
    if (participants.length >= huddle.maxParticipants) {
      return res.status(403).json({ error: 'Huddle is full' });
    }

    // Add participant
    participants.push({
      userId: req.userId,
      username: req.user.username,
      fullName: req.user.fullName,
      avatar: req.user.avatar,
      joinedAt: new Date(),
      isMuted: huddle.settings.muteOnEntry || false,
      isVideoOn: huddle.settings.videoOnEntry && huddle.type === 'video',
      isScreenSharing: false
    });

    await huddle.update({ participants }, { transaction: t });

    // Create system message
    await Message.create({
      channelId: huddle.channelId,
      userId: req.userId,
      content: `${req.user.fullName} joined the huddle`,
      type: 'system',
      metadata: {
        huddleId: huddle.id
      }
    }, { transaction: t });

    await t.commit();

    const roomId = `huddle-${huddle.id}`;

    res.json({
      message: 'Joined huddle successfully',
      huddle,
      roomId,
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });
  } catch (error) {
    await t.rollback();
    console.error('Join huddle error:', error);
    res.status(500).json({ error: 'Failed to join huddle' });
  }
};

const leaveHuddle = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { huddleId } = req.params;

    const huddle = await Huddle.findByPk(huddleId);
    
    if (!huddle) {
      return res.status(404).json({ error: 'Huddle not found' });
    }

    // Remove participant
    let participants = huddle.participants || [];
    participants = participants.filter(p => p.userId !== req.userId);

    // If no participants left, end huddle
    if (participants.length === 0) {
      await huddle.update({
        participants: [],
        status: 'ended',
        endedAt: new Date()
      }, { transaction: t });

      // Create system message
      await Message.create({
        channelId: huddle.channelId,
        userId: req.userId,
        content: `Huddle ended`,
        type: 'system',
        metadata: {
          huddleId: huddle.id
        }
      }, { transaction: t });
    } else {
      await huddle.update({ participants }, { transaction: t });

      // Create system message
      await Message.create({
        channelId: huddle.channelId,
        userId: req.userId,
        content: `${req.user.fullName} left the huddle`,
        type: 'system',
        metadata: {
          huddleId: huddle.id
        }
      }, { transaction: t });
    }

    await t.commit();

    res.json({
      message: 'Left huddle successfully',
      huddleEnded: participants.length === 0
    });
  } catch (error) {
    await t.rollback();
    console.error('Leave huddle error:', error);
    res.status(500).json({ error: 'Failed to leave huddle' });
  }
};

const endHuddle = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { huddleId } = req.params;

    const huddle = await Huddle.findByPk(huddleId);
    
    if (!huddle) {
      return res.status(404).json({ error: 'Huddle not found' });
    }

    // Check if user is initiator or channel admin
    if (huddle.initiatorId !== req.userId) {
      const member = await ChannelMember.findOne({
        where: {
          channelId: huddle.channelId,
          userId: req.userId,
          role: 'admin'
        }
      });

      if (!member) {
        return res.status(403).json({ error: 'Only huddle initiator or channel admin can end huddle' });
      }
    }

    await huddle.update({
      status: 'ended',
      endedAt: new Date()
    }, { transaction: t });

    // Create system message
    await Message.create({
      channelId: huddle.channelId,
      userId: req.userId,
      content: `${req.user.fullName} ended the huddle`,
      type: 'system',
      metadata: {
        huddleId: huddle.id
      }
    }, { transaction: t });

    await t.commit();

    res.json({
      message: 'Huddle ended successfully'
    });
  } catch (error) {
    await t.rollback();
    console.error('End huddle error:', error);
    res.status(500).json({ error: 'Failed to end huddle' });
  }
};

const getHuddle = async (req, res) => {
  try {
    const { huddleId } = req.params;

    const huddle = await Huddle.findByPk(huddleId, {
      include: [
        {
          model: Channel,
          attributes: ['id', 'name', 'displayName']
        },
        {
          model: User,
          as: 'initiator',
          attributes: ['id', 'username', 'fullName', 'avatar']
        }
      ]
    });

    if (!huddle) {
      return res.status(404).json({ error: 'Huddle not found' });
    }

    res.json({ huddle });
  } catch (error) {
    console.error('Get huddle error:', error);
    res.status(500).json({ error: 'Failed to get huddle' });
  }
};

const getActiveHuddles = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    // Get user's channels
    const memberChannels = await ChannelMember.findAll({
      where: { userId: req.userId },
      attributes: ['channelId'],
      include: [{
        model: Channel,
        where: { workspaceId },
        attributes: []
      }]
    });

    const channelIds = memberChannels.map(mc => mc.channelId);

    const huddles = await Huddle.findAll({
      where: {
        channelId: channelIds,
        status: 'active'
      },
      include: [
        {
          model: Channel,
          attributes: ['id', 'name', 'displayName']
        },
        {
          model: User,
          as: 'initiator',
          attributes: ['id', 'username', 'fullName', 'avatar']
        }
      ]
    });

    res.json({ huddles });
  } catch (error) {
    console.error('Get active huddles error:', error);
    res.status(500).json({ error: 'Failed to get active huddles' });
  }
};

const updateParticipantStatus = async (req, res) => {
  try {
    const { huddleId } = req.params;
    const { isMuted, isVideoOn, isScreenSharing } = req.body;

    const huddle = await Huddle.findByPk(huddleId);
    
    if (!huddle) {
      return res.status(404).json({ error: 'Huddle not found' });
    }

    if (huddle.status !== 'active') {
      return res.status(400).json({ error: 'Huddle is not active' });
    }

    // Update participant status
    const participants = huddle.participants || [];
    const participantIndex = participants.findIndex(p => p.userId === req.userId);

    if (participantIndex === -1) {
      return res.status(404).json({ error: 'Not a participant in this huddle' });
    }

    if (isMuted !== undefined) {
      participants[participantIndex].isMuted = isMuted;
    }
    if (isVideoOn !== undefined) {
      participants[participantIndex].isVideoOn = isVideoOn;
    }
    if (isScreenSharing !== undefined) {
      participants[participantIndex].isScreenSharing = isScreenSharing;
    }

    await huddle.update({ participants });

    res.json({
      message: 'Participant status updated',
      participant: participants[participantIndex]
    });
  } catch (error) {
    console.error('Update participant status error:', error);
    res.status(500).json({ error: 'Failed to update participant status' });
  }
};

const inviteToHuddle = async (req, res) => {
  try {
    const { huddleId } = req.params;
    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'User IDs are required' });
    }

    const huddle = await Huddle.findByPk(huddleId);
    
    if (!huddle) {
      return res.status(404).json({ error: 'Huddle not found' });
    }

    if (huddle.status !== 'active') {
      return res.status(400).json({ error: 'Huddle is not active' });
    }

    // Send invitations (in real implementation, would send notifications)
    const channel = await Channel.findByPk(huddle.channelId);
    
    // Create invitation messages
    for (const userId of userIds) {
      await Message.create({
        channelId: huddle.channelId,
        userId: req.userId,
        content: `invited <@${userId}> to join the huddle`,
        type: 'system',
        metadata: {
          huddleId: huddle.id,
          invitedUserId: userId
        }
      });
    }

    res.json({
      message: 'Invitations sent successfully',
      invitedUsers: userIds
    });
  } catch (error) {
    console.error('Invite to huddle error:', error);
    res.status(500).json({ error: 'Failed to send invitations' });
  }
};

const toggleRecording = async (req, res) => {
  try {
    const { huddleId } = req.params;
    const { isRecording } = req.body;

    const huddle = await Huddle.findByPk(huddleId);
    
    if (!huddle) {
      return res.status(404).json({ error: 'Huddle not found' });
    }

    // Check if user is initiator or admin
    if (huddle.initiatorId !== req.userId) {
      const member = await ChannelMember.findOne({
        where: {
          channelId: huddle.channelId,
          userId: req.userId,
          role: 'admin'
        }
      });

      if (!member) {
        return res.status(403).json({ error: 'Only huddle initiator or channel admin can manage recording' });
      }
    }

    if (!huddle.settings.allowRecording) {
      return res.status(403).json({ error: 'Recording is not allowed for this huddle' });
    }

    await huddle.update({ isRecording });

    // Create system message
    await Message.create({
      channelId: huddle.channelId,
      userId: req.userId,
      content: isRecording 
        ? `${req.user.fullName} started recording the huddle`
        : `${req.user.fullName} stopped recording the huddle`,
      type: 'system',
      metadata: {
        huddleId: huddle.id,
        recordingStatus: isRecording
      }
    });

    res.json({
      message: isRecording ? 'Recording started' : 'Recording stopped',
      isRecording
    });
  } catch (error) {
    console.error('Toggle recording error:', error);
    res.status(500).json({ error: 'Failed to toggle recording' });
  }
};

module.exports = {
  startHuddle,
  joinHuddle,
  leaveHuddle,
  endHuddle,
  getHuddle,
  getActiveHuddles,
  updateParticipantStatus,
  inviteToHuddle,
  toggleRecording
};
