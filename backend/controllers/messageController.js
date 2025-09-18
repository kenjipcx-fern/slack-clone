const { Message, User, Channel, ChannelMember, File, Emoji } = require('../models');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');

const sendMessage = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { channelId } = req.params;
    const { content, type = 'text', parentId, attachments, mentions } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    // Check if user is channel member
    const member = await ChannelMember.findOne({
      where: {
        channelId,
        userId: req.userId
      }
    });

    if (!member) {
      // Check if public channel
      const channel = await Channel.findByPk(channelId);
      if (!channel || channel.type !== 'public') {
        return res.status(403).json({ error: 'Not authorized to send messages to this channel' });
      }
    }

    // Create message
    const message = await Message.create({
      channelId,
      userId: req.userId,
      content,
      type,
      parentId,
      attachments,
      mentions
    }, { transaction: t });

    // If reply, increment thread count
    if (parentId) {
      await Message.increment('threadCount', {
        where: { id: parentId },
        transaction: t
      });
    }

    // Update channel last activity
    await Channel.update(
      { lastActivityAt: new Date() },
      { where: { id: channelId }, transaction: t }
    );

    // Update unread counts for other members
    await ChannelMember.increment('unreadCount', {
      where: {
        channelId,
        userId: { [Op.ne]: req.userId }
      },
      transaction: t
    });

    await t.commit();

    // Get full message with user info
    const fullMessage = await Message.findByPk(message.id, {
      include: [{
        model: User,
        attributes: ['id', 'username', 'fullName', 'avatar']
      }]
    });

    res.status(201).json({
      message: 'Message sent successfully',
      data: fullMessage
    });
  } catch (error) {
    await t.rollback();
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

const getChannelMessages = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { 
      limit = 50, 
      before, 
      after, 
      threadId,
      includeThreads = false 
    } = req.query;

    // Check if user has access to channel
    const channel = await Channel.findByPk(channelId);
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    if (channel.type !== 'public') {
      const member = await ChannelMember.findOne({
        where: {
          channelId,
          userId: req.userId
        }
      });

      if (!member) {
        return res.status(403).json({ error: 'Not authorized to view messages' });
      }
    }

    // Build query
    const whereClause = {
      channelId,
      isDeleted: false
    };

    if (threadId) {
      whereClause[Op.or] = [
        { id: threadId },
        { parentId: threadId }
      ];
    } else if (!includeThreads) {
      whereClause.parentId = null;
    }

    if (before) {
      whereClause.createdAt = { [Op.lt]: new Date(before) };
    }

    if (after) {
      whereClause.createdAt = { [Op.gt]: new Date(after) };
    }

    const messages = await Message.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          attributes: ['id', 'username', 'fullName', 'avatar', 'status']
        },
        {
          model: Message,
          as: 'parent',
          include: [{
            model: User,
            attributes: ['id', 'username', 'fullName', 'avatar']
          }]
        },
        {
          model: File,
          attributes: ['id', 'filename', 'url', 'thumbnailUrl', 'mimeType', 'size', 'type']
        }
      ],
      limit: parseInt(limit),
      order: [['createdAt', 'DESC']]
    });

    // Mark messages as read
    await ChannelMember.update(
      { 
        lastReadAt: new Date(),
        unreadCount: 0
      },
      {
        where: {
          channelId,
          userId: req.userId
        }
      }
    );

    res.json({
      messages: messages.reverse(),
      hasMore: messages.length === parseInt(limit)
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
};

const getMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findByPk(messageId, {
      include: [
        {
          model: User,
          attributes: ['id', 'username', 'fullName', 'avatar', 'status']
        },
        {
          model: Message,
          as: 'replies',
          include: [{
            model: User,
            attributes: ['id', 'username', 'fullName', 'avatar']
          }],
          limit: 5,
          order: [['createdAt', 'DESC']]
        }
      ]
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json({ message });
  } catch (error) {
    console.error('Get message error:', error);
    res.status(500).json({ error: 'Failed to get message' });
  }
};

const updateMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    const message = await Message.findOne({
      where: {
        id: messageId,
        userId: req.userId,
        isDeleted: false
      }
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found or unauthorized' });
    }

    await message.update({
      content,
      isEdited: true,
      editedAt: new Date()
    });

    const updatedMessage = await Message.findByPk(messageId, {
      include: [{
        model: User,
        attributes: ['id', 'username', 'fullName', 'avatar']
      }]
    });

    res.json({
      message: 'Message updated successfully',
      data: updatedMessage
    });
  } catch (error) {
    console.error('Update message error:', error);
    res.status(500).json({ error: 'Failed to update message' });
  }
};

const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findOne({
      where: {
        id: messageId,
        userId: req.userId
      }
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found or unauthorized' });
    }

    await message.update({
      isDeleted: true,
      deletedAt: new Date()
    });

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
};

const addReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji, emojiId } = req.body;

    if (!emoji && !emojiId) {
      return res.status(400).json({ error: 'Emoji is required' });
    }

    const message = await Message.findByPk(messageId);
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Validate emoji if custom
    let emojiKey = emoji;
    if (emojiId) {
      const customEmoji = await Emoji.findByPk(emojiId);
      if (!customEmoji) {
        return res.status(404).json({ error: 'Custom emoji not found' });
      }
      emojiKey = `:${customEmoji.name}:`;
      
      // Increment usage count
      await customEmoji.increment('usageCount');
    }

    // Add or update reaction
    const reactions = message.reactions || {};
    
    if (!reactions[emojiKey]) {
      reactions[emojiKey] = {
        emoji: emojiKey,
        emojiId,
        users: [],
        count: 0
      };
    }

    // Check if user already reacted
    if (!reactions[emojiKey].users.includes(req.userId)) {
      reactions[emojiKey].users.push(req.userId);
      reactions[emojiKey].count++;
      
      await message.update({ reactions });
      
      res.json({
        message: 'Reaction added successfully',
        reactions
      });
    } else {
      res.status(409).json({ error: 'Already reacted with this emoji' });
    }
  } catch (error) {
    console.error('Add reaction error:', error);
    res.status(500).json({ error: 'Failed to add reaction' });
  }
};

const removeReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;

    if (!emoji) {
      return res.status(400).json({ error: 'Emoji is required' });
    }

    const message = await Message.findByPk(messageId);
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const reactions = message.reactions || {};
    
    if (reactions[emoji] && reactions[emoji].users.includes(req.userId)) {
      reactions[emoji].users = reactions[emoji].users.filter(id => id !== req.userId);
      reactions[emoji].count--;
      
      if (reactions[emoji].count === 0) {
        delete reactions[emoji];
      }
      
      await message.update({ reactions });
      
      res.json({
        message: 'Reaction removed successfully',
        reactions
      });
    } else {
      res.status(404).json({ error: 'Reaction not found' });
    }
  } catch (error) {
    console.error('Remove reaction error:', error);
    res.status(500).json({ error: 'Failed to remove reaction' });
  }
};

const pinMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findByPk(messageId);
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Check if user is channel member with permissions
    const member = await ChannelMember.findOne({
      where: {
        channelId: message.channelId,
        userId: req.userId
      }
    });

    if (!member) {
      return res.status(403).json({ error: 'Not authorized to pin messages' });
    }

    await message.update({
      isPinned: true,
      pinnedBy: req.userId,
      pinnedAt: new Date()
    });

    res.json({
      message: 'Message pinned successfully',
      data: message
    });
  } catch (error) {
    console.error('Pin message error:', error);
    res.status(500).json({ error: 'Failed to pin message' });
  }
};

const unpinMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findByPk(messageId);
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Check if user is channel member with permissions
    const member = await ChannelMember.findOne({
      where: {
        channelId: message.channelId,
        userId: req.userId
      }
    });

    if (!member) {
      return res.status(403).json({ error: 'Not authorized to unpin messages' });
    }

    await message.update({
      isPinned: false,
      pinnedBy: null,
      pinnedAt: null
    });

    res.json({
      message: 'Message unpinned successfully',
      data: message
    });
  } catch (error) {
    console.error('Unpin message error:', error);
    res.status(500).json({ error: 'Failed to unpin message' });
  }
};

const getPinnedMessages = async (req, res) => {
  try {
    const { channelId } = req.params;

    const messages = await Message.findAll({
      where: {
        channelId,
        isPinned: true,
        isDeleted: false
      },
      include: [{
        model: User,
        attributes: ['id', 'username', 'fullName', 'avatar']
      }],
      order: [['pinnedAt', 'DESC']]
    });

    res.json({ messages });
  } catch (error) {
    console.error('Get pinned messages error:', error);
    res.status(500).json({ error: 'Failed to get pinned messages' });
  }
};

const searchMessages = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { q, channelId, userId, type, from, to, limit = 20 } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // Build search query
    const whereClause = {
      content: { [Op.iLike]: `%${q}%` },
      isDeleted: false
    };

    if (channelId) {
      whereClause.channelId = channelId;
    }

    if (userId) {
      whereClause.userId = userId;
    }

    if (type) {
      whereClause.type = type;
    }

    if (from) {
      whereClause.createdAt = { ...whereClause.createdAt, [Op.gte]: new Date(from) };
    }

    if (to) {
      whereClause.createdAt = { ...whereClause.createdAt, [Op.lte]: new Date(to) };
    }

    // Get user's accessible channels
    const accessibleChannels = await ChannelMember.findAll({
      where: { userId: req.userId },
      attributes: ['channelId'],
      include: [{
        model: Channel,
        where: { workspaceId },
        attributes: []
      }]
    });

    const channelIds = accessibleChannels.map(cm => cm.channelId);
    
    // Also include public channels
    const publicChannels = await Channel.findAll({
      where: {
        workspaceId,
        type: 'public'
      },
      attributes: ['id']
    });

    const allChannelIds = [...new Set([...channelIds, ...publicChannels.map(c => c.id)])];
    whereClause.channelId = { [Op.in]: allChannelIds };

    const messages = await Message.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          attributes: ['id', 'username', 'fullName', 'avatar']
        },
        {
          model: Channel,
          attributes: ['id', 'name', 'displayName', 'type']
        }
      ],
      limit: parseInt(limit),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      messages,
      query: q,
      total: messages.length
    });
  } catch (error) {
    console.error('Search messages error:', error);
    res.status(500).json({ error: 'Failed to search messages' });
  }
};

module.exports = {
  sendMessage,
  getChannelMessages,
  getMessage,
  updateMessage,
  deleteMessage,
  addReaction,
  removeReaction,
  pinMessage,
  unpinMessage,
  getPinnedMessages,
  searchMessages
};
