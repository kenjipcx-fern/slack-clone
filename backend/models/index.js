const { sequelize } = require('../config/database');
const User = require('./User');
const Workspace = require('./Workspace');
const Channel = require('./Channel');
const Message = require('./Message');
const WorkspaceMember = require('./WorkspaceMember');
const ChannelMember = require('./ChannelMember');
const Huddle = require('./Huddle');
const Emoji = require('./Emoji');
const File = require('./File');

// User associations
User.hasMany(Workspace, { as: 'ownedWorkspaces', foreignKey: 'ownerId' });
User.belongsToMany(Workspace, { through: WorkspaceMember, foreignKey: 'userId' });
User.hasMany(Message, { foreignKey: 'userId' });
User.hasMany(Channel, { as: 'createdChannels', foreignKey: 'creatorId' });
User.belongsToMany(Channel, { through: ChannelMember, foreignKey: 'userId' });
User.hasMany(Huddle, { as: 'initiatedHuddles', foreignKey: 'initiatorId' });
User.hasMany(File, { foreignKey: 'uploadedBy' });

// Workspace associations
Workspace.belongsTo(User, { as: 'owner', foreignKey: 'ownerId' });
Workspace.belongsToMany(User, { through: WorkspaceMember, foreignKey: 'workspaceId' });
Workspace.hasMany(Channel, { foreignKey: 'workspaceId' });
Workspace.hasMany(Emoji, { foreignKey: 'workspaceId' });
Workspace.hasMany(File, { foreignKey: 'workspaceId' });

// Channel associations
Channel.belongsTo(Workspace, { foreignKey: 'workspaceId' });
Channel.belongsTo(User, { as: 'creator', foreignKey: 'creatorId' });
Channel.belongsToMany(User, { through: ChannelMember, foreignKey: 'channelId' });
Channel.hasMany(Message, { foreignKey: 'channelId' });
Channel.hasMany(Huddle, { foreignKey: 'channelId' });

// Message associations
Message.belongsTo(Channel, { foreignKey: 'channelId' });
Message.belongsTo(User, { foreignKey: 'userId' });
Message.belongsTo(Message, { as: 'parent', foreignKey: 'parentId' });
Message.hasMany(Message, { as: 'replies', foreignKey: 'parentId' });
Message.hasMany(File, { foreignKey: 'messageId' });

// WorkspaceMember associations
WorkspaceMember.belongsTo(User, { foreignKey: 'userId' });
WorkspaceMember.belongsTo(Workspace, { foreignKey: 'workspaceId' });

// ChannelMember associations
ChannelMember.belongsTo(User, { foreignKey: 'userId' });
ChannelMember.belongsTo(Channel, { foreignKey: 'channelId' });

// Huddle associations
Huddle.belongsTo(Channel, { foreignKey: 'channelId' });
Huddle.belongsTo(User, { as: 'initiator', foreignKey: 'initiatorId' });

// Emoji associations
Emoji.belongsTo(Workspace, { foreignKey: 'workspaceId' });
Emoji.belongsTo(User, { as: 'creator', foreignKey: 'createdBy' });

// File associations
File.belongsTo(Workspace, { foreignKey: 'workspaceId' });
File.belongsTo(User, { as: 'uploader', foreignKey: 'uploadedBy' });
File.belongsTo(Channel, { foreignKey: 'channelId' });
File.belongsTo(Message, { foreignKey: 'messageId' });

module.exports = {
  sequelize,
  User,
  Workspace,
  Channel,
  Message,
  WorkspaceMember,
  ChannelMember,
  Huddle,
  Emoji,
  File
};
