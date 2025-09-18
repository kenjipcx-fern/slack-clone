const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User, Workspace, WorkspaceMember, Channel, ChannelMember } = require('../models');
const { sequelize } = require('../config/database');

const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email,
      username: user.username 
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '24h' }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
  );
};

const register = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { email, password, username, fullName, workspaceName } = req.body;

    // Validate input
    if (!email || !password || !username || !fullName) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user exists
    const existingUser = await User.findOne({
      where: { 
        [sequelize.Sequelize.Op.or]: [{ email }, { username }] 
      }
    });

    if (existingUser) {
      return res.status(409).json({ 
        error: existingUser.email === email ? 'Email already exists' : 'Username already taken' 
      });
    }

    // Create user
    const user = await User.create({
      email,
      password,
      username,
      fullName,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random`
    }, { transaction: t });

    // Create default workspace if provided
    let workspace = null;
    if (workspaceName) {
      const slug = workspaceName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      
      workspace = await Workspace.create({
        name: workspaceName,
        slug,
        ownerId: user.id
      }, { transaction: t });

      // Add user as workspace owner
      await WorkspaceMember.create({
        workspaceId: workspace.id,
        userId: user.id,
        role: 'owner',
        displayName: user.fullName
      }, { transaction: t });

      // Create default channels
      const generalChannel = await Channel.create({
        workspaceId: workspace.id,
        name: 'general',
        displayName: 'General',
        type: 'public',
        description: 'This is the beginning of the General channel',
        creatorId: user.id,
        isGeneral: true
      }, { transaction: t });

      const randomChannel = await Channel.create({
        workspaceId: workspace.id,
        name: 'random',
        displayName: 'Random',
        type: 'public',
        description: 'A place for random conversations',
        creatorId: user.id
      }, { transaction: t });

      // Add user to default channels
      await ChannelMember.bulkCreate([
        {
          channelId: generalChannel.id,
          userId: user.id,
          role: 'admin'
        },
        {
          channelId: randomChannel.id,
          userId: user.id,
          role: 'admin'
        }
      ], { transaction: t });
    }

    await t.commit();

    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    res.status(201).json({
      message: 'Registration successful',
      user: user.toJSON(),
      workspace,
      token,
      refreshToken
    });
  } catch (error) {
    await t.rollback();
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed', details: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user by email or username
    const user = await User.findOne({
      where: {
        [sequelize.Sequelize.Op.or]: [
          { email },
          { username: email }
        ]
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update user status
    await user.update({
      isOnline: true,
      status: 'active',
      lastSeen: new Date()
    });

    // Get user's workspaces
    const workspaces = await WorkspaceMember.findAll({
      where: { userId: user.id, isActive: true },
      include: [{
        model: Workspace,
        attributes: ['id', 'name', 'slug', 'icon']
      }]
    });

    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    res.json({
      message: 'Login successful',
      user: user.toJSON(),
      workspaces,
      token,
      refreshToken
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
};

const logout = async (req, res) => {
  try {
    // Update user status
    await req.user.update({
      isOnline: false,
      status: 'offline',
      lastSeen: new Date()
    });

    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
};

const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const newToken = generateToken(user);
    const newRefreshToken = generateRefreshToken(user);

    res.json({
      token: newToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Refresh token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    res.status(500).json({ error: 'Token refresh failed' });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId, {
      attributes: { exclude: ['password'] }
    });

    const workspaces = await WorkspaceMember.findAll({
      where: { userId: req.userId, isActive: true },
      include: [{
        model: Workspace,
        attributes: ['id', 'name', 'slug', 'icon']
      }]
    });

    res.json({ user, workspaces });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user info' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { fullName, avatar, status, statusMessage, timezone, phoneNumber } = req.body;
    
    const updateData = {};
    if (fullName) updateData.fullName = fullName;
    if (avatar) updateData.avatar = avatar;
    if (status) updateData.status = status;
    if (statusMessage !== undefined) updateData.statusMessage = statusMessage;
    if (timezone) updateData.timezone = timezone;
    if (phoneNumber) updateData.phoneNumber = phoneNumber;

    await req.user.update(updateData);

    res.json({ 
      message: 'Profile updated successfully',
      user: req.user.toJSON()
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords are required' });
    }

    const user = await User.findByPk(req.userId);
    
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
};

module.exports = {
  register,
  login,
  logout,
  refreshToken,
  getMe,
  updateProfile,
  changePassword
};
