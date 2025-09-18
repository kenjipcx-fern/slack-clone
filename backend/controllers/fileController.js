const { File, Channel, ChannelMember, Message, WorkspaceMember } = require('../models');
const { sequelize } = require('../config/database');
const cloudinary = require('cloudinary').v2;
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// Configure Cloudinary (if available)
if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

const uploadFile = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { workspaceId } = req.params;
    const { channelId, messageContent } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Check workspace membership
    const workspaceMember = await WorkspaceMember.findOne({
      where: {
        workspaceId,
        userId: req.userId,
        isActive: true
      }
    });

    if (!workspaceMember) {
      return res.status(403).json({ error: 'Not a workspace member' });
    }

    // Check channel membership if channelId provided
    if (channelId) {
      const channel = await Channel.findByPk(channelId);
      if (!channel || channel.workspaceId !== workspaceId) {
        return res.status(404).json({ error: 'Channel not found in workspace' });
      }

      if (channel.type !== 'public') {
        const channelMember = await ChannelMember.findOne({
          where: {
            channelId,
            userId: req.userId
          }
        });

        if (!channelMember) {
          return res.status(403).json({ error: 'Not a channel member' });
        }
      }
    }

    // Determine file type
    const mimeType = req.file.mimetype;
    let fileType = 'other';
    
    if (mimeType.startsWith('image/')) fileType = 'image';
    else if (mimeType.startsWith('video/')) fileType = 'video';
    else if (mimeType.startsWith('audio/')) fileType = 'audio';
    else if (mimeType.includes('pdf') || mimeType.includes('document')) fileType = 'document';
    else if (mimeType.includes('zip') || mimeType.includes('tar') || mimeType.includes('rar')) fileType = 'archive';
    else if (mimeType.includes('text/') || mimeType.includes('application/javascript')) fileType = 'code';

    let fileUrl = '';
    let thumbnailUrl = null;
    let publicId = null;

    // Upload to Cloudinary if configured
    if (process.env.CLOUDINARY_CLOUD_NAME) {
      const uploadOptions = {
        folder: `slack-clone/${workspaceId}/files`,
        public_id: `${uuidv4()}-${req.file.originalname}`,
        resource_type: 'auto'
      };

      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(req.file.buffer);
      });

      fileUrl = result.secure_url;
      publicId = result.public_id;

      // Generate thumbnail for images and videos
      if (fileType === 'image' || fileType === 'video') {
        thumbnailUrl = cloudinary.url(result.public_id, {
          width: 200,
          height: 200,
          crop: 'fill',
          resource_type: result.resource_type
        });
      }
    } else {
      // For demo, use placeholder URL
      const filename = `${uuidv4()}-${req.file.originalname}`;
      fileUrl = `/uploads/${workspaceId}/files/${filename}`;
      
      if (fileType === 'image') {
        thumbnailUrl = `/uploads/${workspaceId}/thumbnails/${filename}`;
      }
    }

    // Create file record
    const file = await File.create({
      workspaceId,
      uploadedBy: req.userId,
      channelId,
      filename: `${uuidv4()}-${req.file.originalname}`,
      originalName: req.file.originalname,
      mimeType,
      size: req.file.size,
      url: fileUrl,
      thumbnailUrl,
      publicId,
      type: fileType,
      metadata: {
        encoding: req.file.encoding,
        uploadedAt: new Date()
      }
    }, { transaction: t });

    // If channelId provided, create a message with the file
    let message = null;
    if (channelId) {
      message = await Message.create({
        channelId,
        userId: req.userId,
        content: messageContent || `Uploaded ${req.file.originalname}`,
        type: 'file',
        attachments: [{
          id: file.id,
          name: file.originalName,
          url: file.url,
          thumbnailUrl: file.thumbnailUrl,
          type: file.type,
          size: file.size,
          mimeType: file.mimeType
        }]
      }, { transaction: t });

      await file.update({ messageId: message.id }, { transaction: t });

      // Update channel activity
      await Channel.update(
        { lastActivityAt: new Date() },
        { where: { id: channelId }, transaction: t }
      );
    }

    await t.commit();

    res.status(201).json({
      message: 'File uploaded successfully',
      file,
      message
    });
  } catch (error) {
    await t.rollback();
    console.error('Upload file error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
};

const getFile = async (req, res) => {
  try {
    const { fileId } = req.params;

    const file = await File.findByPk(fileId, {
      include: [{
        model: User,
        as: 'uploader',
        attributes: ['id', 'username', 'fullName', 'avatar']
      }]
    });

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check access permissions
    const workspaceMember = await WorkspaceMember.findOne({
      where: {
        workspaceId: file.workspaceId,
        userId: req.userId,
        isActive: true
      }
    });

    if (!workspaceMember) {
      return res.status(403).json({ error: 'Not authorized to access this file' });
    }

    // If file is in a private channel, check channel membership
    if (file.channelId) {
      const channel = await Channel.findByPk(file.channelId);
      if (channel.type !== 'public') {
        const channelMember = await ChannelMember.findOne({
          where: {
            channelId: file.channelId,
            userId: req.userId
          }
        });

        if (!channelMember) {
          return res.status(403).json({ error: 'Not authorized to access this file' });
        }
      }
    }

    // Increment download count
    await file.increment('downloadCount');

    res.json({ file });
  } catch (error) {
    console.error('Get file error:', error);
    res.status(500).json({ error: 'Failed to get file' });
  }
};

const downloadFile = async (req, res) => {
  try {
    const { fileId } = req.params;

    const file = await File.findByPk(fileId);

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check access permissions
    const workspaceMember = await WorkspaceMember.findOne({
      where: {
        workspaceId: file.workspaceId,
        userId: req.userId,
        isActive: true
      }
    });

    if (!workspaceMember) {
      return res.status(403).json({ error: 'Not authorized to download this file' });
    }

    // Increment download count
    await file.increment('downloadCount');

    // Redirect to file URL (in production, you might want to stream the file)
    res.redirect(file.url);
  } catch (error) {
    console.error('Download file error:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
};

const deleteFile = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { fileId } = req.params;

    const file = await File.findByPk(fileId);

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check if user is uploader or workspace admin
    if (file.uploadedBy !== req.userId) {
      const workspaceMember = await WorkspaceMember.findOne({
        where: {
          workspaceId: file.workspaceId,
          userId: req.userId,
          role: ['owner', 'admin']
        }
      });

      if (!workspaceMember) {
        return res.status(403).json({ error: 'Not authorized to delete this file' });
      }
    }

    // Delete from Cloudinary if configured
    if (process.env.CLOUDINARY_CLOUD_NAME && file.publicId) {
      try {
        await cloudinary.uploader.destroy(file.publicId);
      } catch (err) {
        console.error('Error deleting from Cloudinary:', err);
      }
    }

    // Soft delete the file
    await file.destroy({ transaction: t });

    // Update message if associated
    if (file.messageId) {
      await Message.update(
        {
          attachments: sequelize.literal(`
            CASE 
              WHEN attachments IS NULL THEN '[]'::jsonb
              ELSE attachments - '{id}'::text[]
            END
          `)
        },
        {
          where: { id: file.messageId },
          transaction: t
        }
      );
    }

    await t.commit();

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    await t.rollback();
    console.error('Delete file error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
};

const getWorkspaceFiles = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { 
      channelId,
      type,
      userId,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      order = 'DESC'
    } = req.query;

    // Check workspace membership
    const workspaceMember = await WorkspaceMember.findOne({
      where: {
        workspaceId,
        userId: req.userId,
        isActive: true
      }
    });

    if (!workspaceMember) {
      return res.status(403).json({ error: 'Not a workspace member' });
    }

    // Build query
    const whereClause = { workspaceId };
    
    if (type) {
      whereClause.type = type;
    }

    if (userId) {
      whereClause.uploadedBy = userId;
    }

    if (channelId) {
      // Check channel access
      const channel = await Channel.findByPk(channelId);
      if (channel && channel.type !== 'public') {
        const channelMember = await ChannelMember.findOne({
          where: {
            channelId,
            userId: req.userId
          }
        });

        if (!channelMember) {
          return res.status(403).json({ error: 'Not authorized to view files from this channel' });
        }
      }
      whereClause.channelId = channelId;
    } else {
      // Get user's accessible channels
      const accessibleChannels = await ChannelMember.findAll({
        where: { userId: req.userId },
        attributes: ['channelId'],
        include: [{
          model: Channel,
          where: { workspaceId },
          attributes: []
        }]
      });

      const publicChannels = await Channel.findAll({
        where: {
          workspaceId,
          type: 'public'
        },
        attributes: ['id']
      });

      const channelIds = [
        ...accessibleChannels.map(cm => cm.channelId),
        ...publicChannels.map(c => c.id)
      ];

      whereClause[sequelize.Sequelize.Op.or] = [
        { channelId: { [sequelize.Sequelize.Op.in]: channelIds } },
        { channelId: null }
      ];
    }

    const files = await File.findAndCountAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'uploader',
        attributes: ['id', 'username', 'fullName', 'avatar']
      }],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [[sortBy, order]]
    });

    res.json({
      files: files.rows,
      total: files.count,
      page: parseInt(page),
      totalPages: Math.ceil(files.count / parseInt(limit))
    });
  } catch (error) {
    console.error('Get workspace files error:', error);
    res.status(500).json({ error: 'Failed to get workspace files' });
  }
};

const searchFiles = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { q, type, page = 1, limit = 20 } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // Check workspace membership
    const workspaceMember = await WorkspaceMember.findOne({
      where: {
        workspaceId,
        userId: req.userId,
        isActive: true
      }
    });

    if (!workspaceMember) {
      return res.status(403).json({ error: 'Not a workspace member' });
    }

    // Build search query
    const whereClause = {
      workspaceId,
      originalName: { [sequelize.Sequelize.Op.iLike]: `%${q}%` }
    };

    if (type) {
      whereClause.type = type;
    }

    const files = await File.findAndCountAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'uploader',
        attributes: ['id', 'username', 'fullName', 'avatar']
      }],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      files: files.rows,
      total: files.count,
      query: q,
      page: parseInt(page),
      totalPages: Math.ceil(files.count / parseInt(limit))
    });
  } catch (error) {
    console.error('Search files error:', error);
    res.status(500).json({ error: 'Failed to search files' });
  }
};

module.exports = {
  uploadFile,
  getFile,
  downloadFile,
  deleteFile,
  getWorkspaceFiles,
  searchFiles
};
