const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Channel = sequelize.define('Channel', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  workspaceId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Workspaces',
      key: 'id'
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [1, 80],
      is: /^[a-z0-9-_]+$/
    }
  },
  displayName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  type: {
    type: DataTypes.ENUM('public', 'private', 'direct', 'group'),
    defaultValue: 'public'
  },
  description: {
    type: DataTypes.TEXT,
    defaultValue: null
  },
  topic: {
    type: DataTypes.STRING,
    defaultValue: null
  },
  creatorId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  isArchived: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isGeneral: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  memberCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  lastActivityAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  settings: {
    type: DataTypes.JSONB,
    defaultValue: {
      postingPermission: 'all', // all, admins, specific
      pinnedMessages: [],
      muteNotifications: false
    }
  }
}, {
  timestamps: true,
  indexes: [
    {
      fields: ['workspaceId', 'name'],
      unique: true
    }
  ]
});

module.exports = Channel;
