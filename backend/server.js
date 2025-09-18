require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const http = require('http');
const path = require('path');

// Import database and models
const { sequelize, testConnection } = require('./config/database');
const models = require('./models');
const { initializeDefaultEmojis } = require('./controllers/emojiController');

// Import routes
const authRoutes = require('./routes/auth');
const workspaceRoutes = require('./routes/workspace');
const channelRoutes = require('./routes/channel');
const messageRoutes = require('./routes/message');
const huddleRoutes = require('./routes/huddle');
const emojiRoutes = require('./routes/emoji');
const fileRoutes = require('./routes/file');

// Import socket service
const { initializeSocket } = require('./services/socketService');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = initializeSocket(server);

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(compression());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter);

// Static files (for uploaded files in development)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/huddles', huddleRoutes);
app.use('/api/emojis', emojiRoutes);
app.use('/api/files', fileRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Slack Clone API',
    version: '1.0.0',
    description: 'Backend API for Slack clone with messaging, huddles, and emojis',
    endpoints: {
      health: '/health',
      api: {
        auth: '/api/auth',
        workspaces: '/api/workspaces',
        channels: '/api/channels',
        messages: '/api/messages',
        huddles: '/api/huddles',
        emojis: '/api/emojis',
        files: '/api/files'
      },
      websocket: 'ws://[host]:[port]'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  // Multer file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large' });
  }
  
  if (err.message && err.message.includes('Invalid file type')) {
    return res.status(400).json({ error: err.message });
  }
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize database and start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Test database connection
    await testConnection();
    
    // Sync database models
    await sequelize.sync({ alter: true });
    console.log('Database models synchronized');
    
    // Initialize default emojis
    await initializeDefaultEmojis();
    console.log('Default emojis initialized');
    
    // Start server
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`
========================================
🚀 Slack Clone Backend Server Started
========================================
📍 Server: http://0.0.0.0:${PORT}
🔌 WebSocket: ws://0.0.0.0:${PORT}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
📊 Database: Connected to Neon PostgreSQL
========================================
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(async () => {
    console.log('HTTP server closed');
    await sequelize.close();
    console.log('Database connection closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(async () => {
    console.log('HTTP server closed');
    await sequelize.close();
    console.log('Database connection closed');
    process.exit(0);
  });
});

// Start the server
startServer();
