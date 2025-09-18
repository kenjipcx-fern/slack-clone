const jwt = require('jsonwebtoken');
const { User } = require('../models');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.token;
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    req.userId = user.id;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    return res.status(500).json({ error: 'Authentication error' });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.token;
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.id, {
        attributes: { exclude: ['password'] }
      });
      
      if (user) {
        req.user = user;
        req.userId = user.id;
      }
    }
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

const workspaceAuth = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const { WorkspaceMember } = require('../models');
    
    const member = await WorkspaceMember.findOne({
      where: {
        workspaceId,
        userId: req.userId,
        isActive: true
      }
    });

    if (!member) {
      return res.status(403).json({ error: 'Not a member of this workspace' });
    }

    req.workspaceMember = member;
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Workspace authorization error' });
  }
};

const channelAuth = async (req, res, next) => {
  try {
    const { channelId } = req.params;
    const { ChannelMember, Channel } = require('../models');
    
    const channel = await Channel.findByPk(channelId);
    
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    // Check if public channel or user is member
    if (channel.type === 'public') {
      req.channel = channel;
      next();
    } else {
      const member = await ChannelMember.findOne({
        where: {
          channelId,
          userId: req.userId
        }
      });

      if (!member) {
        return res.status(403).json({ error: 'Not a member of this channel' });
      }

      req.channelMember = member;
      req.channel = channel;
      next();
    }
  } catch (error) {
    return res.status(500).json({ error: 'Channel authorization error' });
  }
};

module.exports = {
  authMiddleware,
  optionalAuth,
  workspaceAuth,
  channelAuth
};
