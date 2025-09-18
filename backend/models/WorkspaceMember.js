const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const WorkspaceMember = sequelize.define('WorkspaceMember', {
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
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  role: {
    type: DataTypes.ENUM('owner', 'admin', 'member', 'guest'),
    defaultValue: 'member'
  },
  displayName: {
    type: DataTypes.STRING,
    defaultValue: null
  },
  title: {
    type: DataTypes.STRING,
    defaultValue: null
  },
  department: {
    type: DataTypes.STRING,
    defaultValue: null
  },
  joinedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  invitedBy: {
    type: DataTypes.UUID,
    defaultValue: null
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  permissions: {
    type: DataTypes.JSONB,
    defaultValue: {
      canInvite: true,
      canCreateChannels: true,
      canArchiveChannels: false,
      canDeleteMessages: false,
      canManageApps: false
    }
  }
}, {
  timestamps: true,
  indexes: [
    {
      fields: ['workspaceId', 'userId'],
      unique: true
    }
  ]
});

module.exports = WorkspaceMember;
