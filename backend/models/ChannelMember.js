const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ChannelMember = sequelize.define('ChannelMember', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  channelId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Channels',
      key: 'id'
    }
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  role: {
    type: DataTypes.ENUM('admin', 'member'),
    defaultValue: 'member'
  },
  joinedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  lastReadAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  lastReadMessageId: {
    type: DataTypes.UUID,
    defaultValue: null
  },
  unreadCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  isMuted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  mutedUntil: {
    type: DataTypes.DATE,
    defaultValue: null
  },
  notificationPreference: {
    type: DataTypes.ENUM('all', 'mentions', 'nothing'),
    defaultValue: 'all'
  },
  isPinned: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  timestamps: true,
  indexes: [
    {
      fields: ['channelId', 'userId'],
      unique: true
    }
  ]
});

module.exports = ChannelMember;
