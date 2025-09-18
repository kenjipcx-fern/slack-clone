const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Message = sequelize.define('Message', {
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
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('text', 'file', 'image', 'video', 'audio', 'code', 'system'),
    defaultValue: 'text'
  },
  parentId: {
    type: DataTypes.UUID,
    defaultValue: null,
    references: {
      model: 'Messages',
      key: 'id'
    }
  },
  threadCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  isEdited: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  editedAt: {
    type: DataTypes.DATE,
    defaultValue: null
  },
  isDeleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  deletedAt: {
    type: DataTypes.DATE,
    defaultValue: null
  },
  isPinned: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  pinnedBy: {
    type: DataTypes.UUID,
    defaultValue: null
  },
  pinnedAt: {
    type: DataTypes.DATE,
    defaultValue: null
  },
  attachments: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  mentions: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  reactions: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  timestamps: true,
  paranoid: true,
  indexes: [
    {
      fields: ['channelId', 'createdAt']
    },
    {
      fields: ['parentId']
    }
  ]
});

module.exports = Message;
