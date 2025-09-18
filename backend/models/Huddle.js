const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Huddle = sequelize.define('Huddle', {
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
  initiatorId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  name: {
    type: DataTypes.STRING,
    defaultValue: 'Huddle'
  },
  type: {
    type: DataTypes.ENUM('audio', 'video', 'screen_share'),
    defaultValue: 'audio'
  },
  status: {
    type: DataTypes.ENUM('active', 'ended', 'scheduled'),
    defaultValue: 'active'
  },
  startedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  endedAt: {
    type: DataTypes.DATE,
    defaultValue: null
  },
  scheduledFor: {
    type: DataTypes.DATE,
    defaultValue: null
  },
  participants: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  maxParticipants: {
    type: DataTypes.INTEGER,
    defaultValue: 50
  },
  isRecording: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  recordingUrl: {
    type: DataTypes.STRING,
    defaultValue: null
  },
  settings: {
    type: DataTypes.JSONB,
    defaultValue: {
      allowGuests: false,
      waitingRoom: false,
      muteOnEntry: false,
      videoOnEntry: true,
      allowScreenShare: true,
      allowRecording: true
    }
  }
}, {
  timestamps: true
});

module.exports = Huddle;
