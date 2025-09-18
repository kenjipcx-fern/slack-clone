const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Workspace = sequelize.define('Workspace', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [1, 100]
    }
  },
  slug: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isLowercase: true,
      is: /^[a-z0-9-]+$/
    }
  },
  description: {
    type: DataTypes.TEXT,
    defaultValue: null
  },
  icon: {
    type: DataTypes.STRING,
    defaultValue: null
  },
  ownerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  settings: {
    type: DataTypes.JSONB,
    defaultValue: {
      allowGuestAccess: false,
      defaultChannels: ['general', 'random'],
      maxFileSize: 10485760, // 10MB
      retentionDays: 90,
      allowEmailInvites: true,
      requireTwoFactor: false
    }
  },
  memberCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  subscription: {
    type: DataTypes.JSONB,
    defaultValue: {
      plan: 'free',
      expiresAt: null,
      maxMembers: 10
    }
  }
}, {
  timestamps: true
});

module.exports = Workspace;
