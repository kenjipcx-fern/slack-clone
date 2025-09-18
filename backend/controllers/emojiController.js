const { Emoji, Workspace, WorkspaceMember } = require('../models');
const { sequelize } = require('../config/database');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary (if available)
if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

const getDefaultEmojis = async (req, res) => {
  try {
    // Get standard emojis (workspace-agnostic)
    const defaultEmojis = await Emoji.findAll({
      where: {
        workspaceId: null,
        isCustom: false
      },
      order: [['category', 'ASC'], ['name', 'ASC']]
    });

    // Group by category
    const emojisByCategory = defaultEmojis.reduce((acc, emoji) => {
      if (!acc[emoji.category]) {
        acc[emoji.category] = [];
      }
      acc[emoji.category].push(emoji);
      return acc;
    }, {});

    res.json({
      emojis: defaultEmojis,
      byCategory: emojisByCategory,
      total: defaultEmojis.length
    });
  } catch (error) {
    console.error('Get default emojis error:', error);
    res.status(500).json({ error: 'Failed to get default emojis' });
  }
};

const getWorkspaceEmojis = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { includeDefault = true } = req.query;

    // Check if user is workspace member
    const member = await WorkspaceMember.findOne({
      where: {
        workspaceId,
        userId: req.userId,
        isActive: true
      }
    });

    if (!member) {
      return res.status(403).json({ error: 'Not a workspace member' });
    }

    // Build query
    const whereClause = includeDefault 
      ? {
          [sequelize.Sequelize.Op.or]: [
            { workspaceId: null },
            { workspaceId }
          ]
        }
      : { workspaceId };

    const emojis = await Emoji.findAll({
      where: whereClause,
      order: [
        ['isCustom', 'DESC'],
        ['usageCount', 'DESC'],
        ['name', 'ASC']
      ]
    });

    // Separate custom and default
    const customEmojis = emojis.filter(e => e.isCustom);
    const defaultEmojis = emojis.filter(e => !e.isCustom);

    res.json({
      custom: customEmojis,
      default: defaultEmojis,
      total: emojis.length
    });
  } catch (error) {
    console.error('Get workspace emojis error:', error);
    res.status(500).json({ error: 'Failed to get workspace emojis' });
  }
};

const createCustomEmoji = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { name, imageUrl, category = 'custom' } = req.body;

    if (!name || !imageUrl) {
      return res.status(400).json({ error: 'Name and image URL are required' });
    }

    // Validate name format
    if (!/^[a-z0-9_-]+$/.test(name)) {
      return res.status(400).json({ error: 'Emoji name must contain only lowercase letters, numbers, underscores, and hyphens' });
    }

    // Check if user has permission
    const member = await WorkspaceMember.findOne({
      where: {
        workspaceId,
        userId: req.userId,
        isActive: true
      }
    });

    if (!member) {
      return res.status(403).json({ error: 'Not a workspace member' });
    }

    // Check if emoji name already exists in workspace
    const existingEmoji = await Emoji.findOne({
      where: {
        workspaceId,
        name
      }
    });

    if (existingEmoji) {
      return res.status(409).json({ error: 'Emoji with this name already exists' });
    }

    // Create custom emoji
    const emoji = await Emoji.create({
      workspaceId,
      name,
      category,
      imageUrl,
      shortcodes: [`:${name}:`],
      createdBy: req.userId,
      isCustom: true,
      isAnimated: imageUrl.endsWith('.gif')
    });

    res.status(201).json({
      message: 'Custom emoji created successfully',
      emoji
    });
  } catch (error) {
    console.error('Create custom emoji error:', error);
    res.status(500).json({ error: 'Failed to create custom emoji' });
  }
};

const uploadCustomEmoji = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { name, category = 'custom' } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Emoji name is required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    // Validate name format
    if (!/^[a-z0-9_-]+$/.test(name)) {
      return res.status(400).json({ error: 'Emoji name must contain only lowercase letters, numbers, underscores, and hyphens' });
    }

    // Check if user has permission
    const member = await WorkspaceMember.findOne({
      where: {
        workspaceId,
        userId: req.userId,
        isActive: true
      }
    });

    if (!member) {
      return res.status(403).json({ error: 'Not a workspace member' });
    }

    // Check if emoji name already exists
    const existingEmoji = await Emoji.findOne({
      where: {
        workspaceId,
        name
      }
    });

    if (existingEmoji) {
      return res.status(409).json({ error: 'Emoji with this name already exists' });
    }

    let imageUrl = '';
    
    // Upload to Cloudinary if configured, otherwise use local storage
    if (process.env.CLOUDINARY_CLOUD_NAME) {
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            folder: `slack-clone/emojis/${workspaceId}`,
            public_id: name,
            resource_type: 'image',
            transformation: [
              { width: 64, height: 64, crop: 'fit' }
            ]
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(req.file.buffer);
      });
      
      imageUrl = result.secure_url;
    } else {
      // For demo, use a placeholder URL
      imageUrl = `/uploads/emojis/${workspaceId}/${name}.${req.file.mimetype.split('/')[1]}`;
    }

    // Create custom emoji
    const emoji = await Emoji.create({
      workspaceId,
      name,
      category,
      imageUrl,
      shortcodes: [`:${name}:`],
      createdBy: req.userId,
      isCustom: true,
      isAnimated: req.file.mimetype === 'image/gif'
    });

    res.status(201).json({
      message: 'Custom emoji uploaded successfully',
      emoji
    });
  } catch (error) {
    console.error('Upload custom emoji error:', error);
    res.status(500).json({ error: 'Failed to upload custom emoji' });
  }
};

const deleteCustomEmoji = async (req, res) => {
  try {
    const { workspaceId, emojiId } = req.params;

    // Check if user has permission (admin/owner)
    const member = await WorkspaceMember.findOne({
      where: {
        workspaceId,
        userId: req.userId,
        role: ['owner', 'admin']
      }
    });

    if (!member) {
      return res.status(403).json({ error: 'Only workspace admins can delete custom emojis' });
    }

    const emoji = await Emoji.findOne({
      where: {
        id: emojiId,
        workspaceId,
        isCustom: true
      }
    });

    if (!emoji) {
      return res.status(404).json({ error: 'Custom emoji not found' });
    }

    // Delete from Cloudinary if configured
    if (process.env.CLOUDINARY_CLOUD_NAME && emoji.imageUrl.includes('cloudinary')) {
      try {
        const publicId = `slack-clone/emojis/${workspaceId}/${emoji.name}`;
        await cloudinary.uploader.destroy(publicId);
      } catch (err) {
        console.error('Error deleting from Cloudinary:', err);
      }
    }

    await emoji.destroy();

    res.json({ message: 'Custom emoji deleted successfully' });
  } catch (error) {
    console.error('Delete custom emoji error:', error);
    res.status(500).json({ error: 'Failed to delete custom emoji' });
  }
};

const searchEmojis = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { q, limit = 20 } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // Check if user is workspace member
    const member = await WorkspaceMember.findOne({
      where: {
        workspaceId,
        userId: req.userId,
        isActive: true
      }
    });

    if (!member) {
      return res.status(403).json({ error: 'Not a workspace member' });
    }

    const emojis = await Emoji.findAll({
      where: {
        [sequelize.Sequelize.Op.and]: [
          {
            [sequelize.Sequelize.Op.or]: [
              { workspaceId: null },
              { workspaceId }
            ]
          },
          {
            [sequelize.Sequelize.Op.or]: [
              { name: { [sequelize.Sequelize.Op.iLike]: `%${q}%` } },
              sequelize.literal(`'${q}' = ANY(shortcodes)`)
            ]
          }
        ]
      },
      limit: parseInt(limit),
      order: [
        ['usageCount', 'DESC'],
        ['name', 'ASC']
      ]
    });

    res.json({
      emojis,
      query: q,
      total: emojis.length
    });
  } catch (error) {
    console.error('Search emojis error:', error);
    res.status(500).json({ error: 'Failed to search emojis' });
  }
};

const getFrequentlyUsedEmojis = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { limit = 20 } = req.query;

    // Check if user is workspace member
    const member = await WorkspaceMember.findOne({
      where: {
        workspaceId,
        userId: req.userId,
        isActive: true
      }
    });

    if (!member) {
      return res.status(403).json({ error: 'Not a workspace member' });
    }

    const emojis = await Emoji.findAll({
      where: {
        [sequelize.Sequelize.Op.or]: [
          { workspaceId: null },
          { workspaceId }
        ],
        usageCount: { [sequelize.Sequelize.Op.gt]: 0 }
      },
      limit: parseInt(limit),
      order: [['usageCount', 'DESC']]
    });

    res.json({
      emojis,
      total: emojis.length
    });
  } catch (error) {
    console.error('Get frequently used emojis error:', error);
    res.status(500).json({ error: 'Failed to get frequently used emojis' });
  }
};

// Initialize default emojis (run once during setup)
const initializeDefaultEmojis = async () => {
  try {
    const defaultEmojiList = [
      // Smileys & Emotion
      { name: 'smile', unicode: '😊', shortcodes: [':smile:', ':)'], category: 'smileys' },
      { name: 'laughing', unicode: '😂', shortcodes: [':laughing:', ':joy:'], category: 'smileys' },
      { name: 'heart', unicode: '❤️', shortcodes: [':heart:', '<3'], category: 'smileys' },
      { name: 'thumbsup', unicode: '👍', shortcodes: [':thumbsup:', ':+1:'], category: 'smileys' },
      { name: 'thumbsdown', unicode: '👎', shortcodes: [':thumbsdown:', ':-1:'], category: 'smileys' },
      { name: 'clap', unicode: '👏', shortcodes: [':clap:'], category: 'smileys' },
      { name: 'fire', unicode: '🔥', shortcodes: [':fire:'], category: 'smileys' },
      { name: 'rocket', unicode: '🚀', shortcodes: [':rocket:'], category: 'smileys' },
      { name: 'eyes', unicode: '👀', shortcodes: [':eyes:'], category: 'smileys' },
      { name: 'thinking', unicode: '🤔', shortcodes: [':thinking:'], category: 'smileys' },
      { name: 'cry', unicode: '😢', shortcodes: [':cry:', ':\'('], category: 'smileys' },
      { name: 'wink', unicode: '😉', shortcodes: [':wink:', ';)'], category: 'smileys' },
      // Work & Office
      { name: 'computer', unicode: '💻', shortcodes: [':computer:'], category: 'work' },
      { name: 'briefcase', unicode: '💼', shortcodes: [':briefcase:'], category: 'work' },
      { name: 'calendar', unicode: '📅', shortcodes: [':calendar:'], category: 'work' },
      { name: 'chart', unicode: '📊', shortcodes: [':chart:'], category: 'work' },
      { name: 'memo', unicode: '📝', shortcodes: [':memo:'], category: 'work' },
      // Celebrations
      { name: 'party', unicode: '🎉', shortcodes: [':party:', ':tada:'], category: 'celebration' },
      { name: 'confetti', unicode: '🎊', shortcodes: [':confetti:'], category: 'celebration' },
      { name: 'trophy', unicode: '🏆', shortcodes: [':trophy:'], category: 'celebration' },
      { name: 'medal', unicode: '🥇', shortcodes: [':medal:', ':1st:'], category: 'celebration' },
      // Status
      { name: 'check', unicode: '✅', shortcodes: [':check:', ':white_check_mark:'], category: 'status' },
      { name: 'x', unicode: '❌', shortcodes: [':x:', ':cross:'], category: 'status' },
      { name: 'warning', unicode: '⚠️', shortcodes: [':warning:'], category: 'status' },
      { name: 'question', unicode: '❓', shortcodes: [':question:'], category: 'status' },
      { name: 'exclamation', unicode: '❗', shortcodes: [':exclamation:'], category: 'status' }
    ];

    for (const emojiData of defaultEmojiList) {
      await Emoji.findOrCreate({
        where: { name: emojiData.name, workspaceId: null },
        defaults: {
          ...emojiData,
          isCustom: false,
          workspaceId: null
        }
      });
    }

    console.log('Default emojis initialized successfully');
  } catch (error) {
    console.error('Error initializing default emojis:', error);
  }
};

module.exports = {
  getDefaultEmojis,
  getWorkspaceEmojis,
  createCustomEmoji,
  uploadCustomEmoji,
  deleteCustomEmoji,
  searchEmojis,
  getFrequentlyUsedEmojis,
  initializeDefaultEmojis
};
