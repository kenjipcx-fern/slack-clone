const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Emoji = sequelize.define('Emoji', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  workspaceId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Workspaces',
      key: 'id'
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      is: /^[a-z0-9_-]+$/
    }
  },
  category: {
    type: DataTypes.STRING,
    defaultValue: 'custom'
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  unicode: {
    type: DataTypes.STRING,
    allowNull: true
  },
  shortcodes: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  isCustom: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isAnimated: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  usageCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  timestamps: true,
  indexes: [
    {
      fields: ['workspaceId', 'name'],
      unique: true,
      where: {
        workspaceId: {
          [sequelize.Sequelize.Op.ne]: null
        }
      }
    }
  ]
});

module.exports = Emoji;
