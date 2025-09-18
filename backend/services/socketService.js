const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const { User, ChannelMember, Message, Channel, Huddle } = require('../models');

let io;
const userSockets = new Map(); // userId -> Set of socket IDs
const socketUsers = new Map(); // socketId -> userId

const initializeSocket = (server) => {
  io = socketIO(server, {
    cors: {
      origin: process.env.WS_CORS_ORIGIN || '*',
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.id);
      
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user.id;
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket) => {
    console.log(`User ${socket.userId} connected on socket ${socket.id}`);
    
    // Track user socket connections
    if (!userSockets.has(socket.userId)) {
      userSockets.set(socket.userId, new Set());
    }
    userSockets.get(socket.userId).add(socket.id);
    socketUsers.set(socket.id, socket.userId);

    // Update user online status
    await User.update(
      { isOnline: true, status: 'active' },
      { where: { id: socket.userId } }
    );

    // Join user to their channels
    const channelMemberships = await ChannelMember.findAll({
      where: { userId: socket.userId },
      include: [{
        model: Channel,
        attributes: ['id', 'workspaceId']
      }]
    });

    for (const membership of channelMemberships) {
      socket.join(`channel:${membership.channelId}`);
      socket.join(`workspace:${membership.Channel.workspaceId}`);
    }

    // Notify workspace members of user coming online
    const workspaceIds = [...new Set(channelMemberships.map(m => m.Channel.workspaceId))];
    for (const workspaceId of workspaceIds) {
      socket.to(`workspace:${workspaceId}`).emit('user:online', {
        userId: socket.userId,
        status: 'active'
      });
    }

    // Socket event handlers
    
    // Join channel
    socket.on('channel:join', async (channelId) => {
      try {
        const member = await ChannelMember.findOne({
          where: {
            channelId,
            userId: socket.userId
          }
        });

        if (member) {
          socket.join(`channel:${channelId}`);
          socket.emit('channel:joined', { channelId });
        }
      } catch (error) {
        socket.emit('error', { message: 'Failed to join channel' });
      }
    });

    // Leave channel
    socket.on('channel:leave', (channelId) => {
      socket.leave(`channel:${channelId}`);
      socket.emit('channel:left', { channelId });
    });

    // Send message
    socket.on('message:send', async (data) => {
      try {
        const { channelId, content, type = 'text', parentId, attachments, mentions } = data;

        // Validate channel membership
        const member = await ChannelMember.findOne({
          where: {
            channelId,
            userId: socket.userId
          }
        });

        if (!member) {
          const channel = await Channel.findByPk(channelId);
          if (!channel || channel.type !== 'public') {
            return socket.emit('error', { message: 'Not authorized to send message' });
          }
        }

        // Create message
        const message = await Message.create({
          channelId,
          userId: socket.userId,
          content,
          type,
          parentId,
          attachments,
          mentions
        });

        // Get full message with user info
        const fullMessage = await Message.findByPk(message.id, {
          include: [{
            model: User,
            attributes: ['id', 'username', 'fullName', 'avatar', 'status']
          }]
        });

        // Emit to channel members
        io.to(`channel:${channelId}`).emit('message:new', fullMessage);

        // Send notifications for mentions
        if (mentions && mentions.length > 0) {
          for (const mentionedUserId of mentions) {
            const mentionedUserSockets = userSockets.get(mentionedUserId);
            if (mentionedUserSockets) {
              for (const socketId of mentionedUserSockets) {
                io.to(socketId).emit('notification:mention', {
                  message: fullMessage,
                  channelId,
                  mentionedBy: socket.user.fullName
                });
              }
            }
          }
        }
      } catch (error) {
        console.error('Message send error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Update message
    socket.on('message:update', async (data) => {
      try {
        const { messageId, content } = data;

        const message = await Message.findOne({
          where: {
            id: messageId,
            userId: socket.userId
          }
        });

        if (!message) {
          return socket.emit('error', { message: 'Message not found or unauthorized' });
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

        io.to(`channel:${message.channelId}`).emit('message:updated', updatedMessage);
      } catch (error) {
        socket.emit('error', { message: 'Failed to update message' });
      }
    });

    // Delete message
    socket.on('message:delete', async (messageId) => {
      try {
        const message = await Message.findOne({
          where: {
            id: messageId,
            userId: socket.userId
          }
        });

        if (!message) {
          return socket.emit('error', { message: 'Message not found or unauthorized' });
        }

        await message.update({
          isDeleted: true,
          deletedAt: new Date()
        });

        io.to(`channel:${message.channelId}`).emit('message:deleted', {
          messageId,
          channelId: message.channelId
        });
      } catch (error) {
        socket.emit('error', { message: 'Failed to delete message' });
      }
    });

    // Add reaction
    socket.on('message:react', async (data) => {
      try {
        const { messageId, emoji } = data;

        const message = await Message.findByPk(messageId);
        if (!message) {
          return socket.emit('error', { message: 'Message not found' });
        }

        const reactions = message.reactions || {};
        
        if (!reactions[emoji]) {
          reactions[emoji] = {
            emoji,
            users: [],
            count: 0
          };
        }

        if (!reactions[emoji].users.includes(socket.userId)) {
          reactions[emoji].users.push(socket.userId);
          reactions[emoji].count++;
          
          await message.update({ reactions });
          
          io.to(`channel:${message.channelId}`).emit('message:reaction', {
            messageId,
            reactions,
            userId: socket.userId,
            emoji
          });
        }
      } catch (error) {
        socket.emit('error', { message: 'Failed to add reaction' });
      }
    });

    // Remove reaction
    socket.on('message:unreact', async (data) => {
      try {
        const { messageId, emoji } = data;

        const message = await Message.findByPk(messageId);
        if (!message) {
          return socket.emit('error', { message: 'Message not found' });
        }

        const reactions = message.reactions || {};
        
        if (reactions[emoji] && reactions[emoji].users.includes(socket.userId)) {
          reactions[emoji].users = reactions[emoji].users.filter(id => id !== socket.userId);
          reactions[emoji].count--;
          
          if (reactions[emoji].count === 0) {
            delete reactions[emoji];
          }
          
          await message.update({ reactions });
          
          io.to(`channel:${message.channelId}`).emit('message:reaction', {
            messageId,
            reactions,
            userId: socket.userId,
            emoji,
            removed: true
          });
        }
      } catch (error) {
        socket.emit('error', { message: 'Failed to remove reaction' });
      }
    });

    // Typing indicators
    socket.on('typing:start', (channelId) => {
      socket.to(`channel:${channelId}`).emit('user:typing', {
        userId: socket.userId,
        channelId,
        user: {
          id: socket.user.id,
          username: socket.user.username,
          fullName: socket.user.fullName,
          avatar: socket.user.avatar
        }
      });
    });

    socket.on('typing:stop', (channelId) => {
      socket.to(`channel:${channelId}`).emit('user:stopped_typing', {
        userId: socket.userId,
        channelId
      });
    });

    // User status updates
    socket.on('status:update', async (status) => {
      try {
        await socket.user.update({ status });
        
        // Notify all workspaces
        for (const workspaceId of workspaceIds) {
          io.to(`workspace:${workspaceId}`).emit('user:status_changed', {
            userId: socket.userId,
            status
          });
        }
      } catch (error) {
        socket.emit('error', { message: 'Failed to update status' });
      }
    });

    // Huddle events
    socket.on('huddle:join', async (huddleId) => {
      try {
        socket.join(`huddle:${huddleId}`);
        
        const huddle = await Huddle.findByPk(huddleId);
        if (huddle) {
          io.to(`huddle:${huddleId}`).emit('huddle:participant_joined', {
            huddleId,
            participant: {
              userId: socket.userId,
              username: socket.user.username,
              fullName: socket.user.fullName,
              avatar: socket.user.avatar
            }
          });
        }
      } catch (error) {
        socket.emit('error', { message: 'Failed to join huddle' });
      }
    });

    socket.on('huddle:leave', async (huddleId) => {
      try {
        socket.leave(`huddle:${huddleId}`);
        
        io.to(`huddle:${huddleId}`).emit('huddle:participant_left', {
          huddleId,
          userId: socket.userId
        });
      } catch (error) {
        socket.emit('error', { message: 'Failed to leave huddle' });
      }
    });

    // WebRTC signaling for huddles
    socket.on('webrtc:offer', (data) => {
      const { targetUserId, offer, huddleId } = data;
      const targetSockets = userSockets.get(targetUserId);
      
      if (targetSockets) {
        for (const socketId of targetSockets) {
          io.to(socketId).emit('webrtc:offer', {
            offer,
            huddleId,
            fromUserId: socket.userId
          });
        }
      }
    });

    socket.on('webrtc:answer', (data) => {
      const { targetUserId, answer, huddleId } = data;
      const targetSockets = userSockets.get(targetUserId);
      
      if (targetSockets) {
        for (const socketId of targetSockets) {
          io.to(socketId).emit('webrtc:answer', {
            answer,
            huddleId,
            fromUserId: socket.userId
          });
        }
      }
    });

    socket.on('webrtc:ice_candidate', (data) => {
      const { targetUserId, candidate, huddleId } = data;
      const targetSockets = userSockets.get(targetUserId);
      
      if (targetSockets) {
        for (const socketId of targetSockets) {
          io.to(socketId).emit('webrtc:ice_candidate', {
            candidate,
            huddleId,
            fromUserId: socket.userId
          });
        }
      }
    });

    // Disconnect handler
    socket.on('disconnect', async () => {
      console.log(`User ${socket.userId} disconnected from socket ${socket.id}`);
      
      // Remove socket from tracking
      const userSocketSet = userSockets.get(socket.userId);
      if (userSocketSet) {
        userSocketSet.delete(socket.id);
        
        // If user has no more sockets, mark as offline
        if (userSocketSet.size === 0) {
          userSockets.delete(socket.userId);
          
          await User.update(
            { 
              isOnline: false, 
              status: 'offline',
              lastSeen: new Date()
            },
            { where: { id: socket.userId } }
          );

          // Notify workspace members
          for (const workspaceId of workspaceIds) {
            socket.to(`workspace:${workspaceId}`).emit('user:offline', {
              userId: socket.userId
            });
          }
        }
      }
      
      socketUsers.delete(socket.id);
    });
  });

  return io;
};

// Helper functions for emitting events from other parts of the application
const emitToChannel = (channelId, event, data) => {
  if (io) {
    io.to(`channel:${channelId}`).emit(event, data);
  }
};

const emitToUser = (userId, event, data) => {
  if (io) {
    const userSocketSet = userSockets.get(userId);
    if (userSocketSet) {
      for (const socketId of userSocketSet) {
        io.to(socketId).emit(event, data);
      }
    }
  }
};

const emitToWorkspace = (workspaceId, event, data) => {
  if (io) {
    io.to(`workspace:${workspaceId}`).emit(event, data);
  }
};

module.exports = {
  initializeSocket,
  emitToChannel,
  emitToUser,
  emitToWorkspace
};
