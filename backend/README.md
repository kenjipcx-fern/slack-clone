# Slack Clone Backend API

## 🚀 Live Demo

**Backend API**: https://slack-backend-morphvm-8p9e2k2g.http.cloud.morph.so

## 📋 Features

### Core Functionality
- ✅ **User Authentication**: JWT-based auth with register/login/logout
- ✅ **Workspaces**: Create and manage team workspaces
- ✅ **Channels**: Public/private channels with full CRUD operations
- ✅ **Real-time Messaging**: WebSocket-based instant messaging
- ✅ **Huddles**: Voice/video calls with WebRTC signaling
- ✅ **Emoji System**: Default emojis + custom workspace emojis
- ✅ **File Uploads**: Support for images, documents, and other files
- ✅ **Message Reactions**: Add emoji reactions to messages
- ✅ **Threading**: Reply to messages in threads
- ✅ **Search**: Search messages and files
- ✅ **User Presence**: Online/offline status tracking
- ✅ **Typing Indicators**: See when others are typing
- ✅ **Message Editing/Deletion**: Edit and delete your messages
- ✅ **Pinned Messages**: Pin important messages
- ✅ **Notifications**: Real-time notifications for mentions

### Technical Features
- RESTful API with Express.js
- WebSocket support with Socket.IO
- SQLite database (PostgreSQL ready)
- JWT authentication
- Rate limiting
- CORS support
- File upload handling
- Comprehensive error handling

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/refresh-token` - Refresh JWT token
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile
- `POST /api/auth/change-password` - Change password

### Workspaces
- `POST /api/workspaces` - Create workspace
- `GET /api/workspaces/:id` - Get workspace
- `PUT /api/workspaces/:id` - Update workspace
- `DELETE /api/workspaces/:id` - Delete workspace
- `GET /api/workspaces/:id/members` - Get members
- `POST /api/workspaces/:id/members/invite` - Invite member
- `DELETE /api/workspaces/:id/members/:memberId` - Remove member
- `PUT /api/workspaces/:id/members/:memberId/role` - Update member role

### Channels
- `POST /api/channels/workspace/:workspaceId` - Create channel
- `GET /api/channels/workspace/:workspaceId` - List workspace channels
- `GET /api/channels/:id` - Get channel
- `PUT /api/channels/:id` - Update channel
- `POST /api/channels/:id/join` - Join channel
- `POST /api/channels/:id/leave` - Leave channel
- `GET /api/channels/:id/members` - Get channel members
- `POST /api/channels/:id/archive` - Archive channel

### Messages
- `POST /api/messages/channel/:channelId` - Send message
- `GET /api/messages/channel/:channelId` - Get messages
- `GET /api/messages/:id` - Get single message
- `PUT /api/messages/:id` - Update message
- `DELETE /api/messages/:id` - Delete message
- `POST /api/messages/:id/reactions` - Add reaction
- `DELETE /api/messages/:id/reactions` - Remove reaction
- `POST /api/messages/:id/pin` - Pin message
- `GET /api/messages/search/workspace/:workspaceId` - Search messages

### Huddles (Voice/Video)
- `POST /api/huddles/channel/:channelId/start` - Start huddle
- `POST /api/huddles/:id/join` - Join huddle
- `POST /api/huddles/:id/leave` - Leave huddle
- `POST /api/huddles/:id/end` - End huddle
- `GET /api/huddles/:id` - Get huddle info
- `GET /api/huddles/workspace/:workspaceId/active` - Get active huddles
- `PUT /api/huddles/:id/participant/status` - Update participant status

### Emojis
- `GET /api/emojis/default` - Get default emojis
- `GET /api/emojis/workspace/:workspaceId` - Get workspace emojis
- `POST /api/emojis/workspace/:workspaceId` - Create custom emoji
- `POST /api/emojis/workspace/:workspaceId/upload` - Upload emoji image
- `DELETE /api/emojis/workspace/:workspaceId/emoji/:emojiId` - Delete emoji
- `GET /api/emojis/workspace/:workspaceId/search` - Search emojis
- `GET /api/emojis/workspace/:workspaceId/frequent` - Get frequently used

### Files
- `POST /api/files/workspace/:workspaceId/upload` - Upload file
- `GET /api/files/:id` - Get file info
- `GET /api/files/:id/download` - Download file
- `DELETE /api/files/:id` - Delete file
- `GET /api/files/workspace/:workspaceId` - List workspace files
- `GET /api/files/workspace/:workspaceId/search` - Search files

## 🔄 WebSocket Events

### Client → Server
- `channel:join` - Join a channel room
- `channel:leave` - Leave a channel room
- `message:send` - Send a message
- `message:update` - Update a message
- `message:delete` - Delete a message
- `message:react` - Add reaction
- `message:unreact` - Remove reaction
- `typing:start` - Start typing
- `typing:stop` - Stop typing
- `status:update` - Update user status
- `huddle:join` - Join huddle room
- `huddle:leave` - Leave huddle room
- `webrtc:offer` - WebRTC offer
- `webrtc:answer` - WebRTC answer
- `webrtc:ice_candidate` - ICE candidate

### Server → Client
- `message:new` - New message received
- `message:updated` - Message updated
- `message:deleted` - Message deleted
- `message:reaction` - Reaction added/removed
- `user:typing` - User is typing
- `user:stopped_typing` - User stopped typing
- `user:online` - User came online
- `user:offline` - User went offline
- `user:status_changed` - User status changed
- `huddle:participant_joined` - Someone joined huddle
- `huddle:participant_left` - Someone left huddle
- `notification:mention` - You were mentioned
- `webrtc:offer` - Incoming WebRTC offer
- `webrtc:answer` - WebRTC answer received
- `webrtc:ice_candidate` - ICE candidate received

## 🚀 Quick Start

### Test the API

1. **Register a new user**:
```bash
curl -X POST https://slack-backend-morphvm-8p9e2k2g.http.cloud.morph.so/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "username": "testuser",
    "fullName": "Test User",
    "workspaceName": "My Workspace"
  }'
```

2. **Login**:
```bash
curl -X POST https://slack-backend-morphvm-8p9e2k2g.http.cloud.morph.so/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

3. **Create a channel** (use token from login):
```bash
curl -X POST https://slack-backend-morphvm-8p9e2k2g.http.cloud.morph.so/api/channels/workspace/{workspaceId} \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "project-updates",
    "displayName": "Project Updates",
    "description": "Updates about our projects",
    "type": "public"
  }'
```

4. **Send a message**:
```bash
curl -X POST https://slack-backend-morphvm-8p9e2k2g.http.cloud.morph.so/api/messages/channel/{channelId} \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Hello, team! 👋",
    "type": "text"
  }'
```

## 🔧 WebSocket Connection

```javascript
const socket = io('https://slack-backend-morphvm-8p9e2k2g.http.cloud.morph.so', {
  auth: {
    token: 'YOUR_JWT_TOKEN'
  }
});

socket.on('connect', () => {
  console.log('Connected to server');
  
  // Join a channel
  socket.emit('channel:join', 'channel-id');
  
  // Send a message
  socket.emit('message:send', {
    channelId: 'channel-id',
    content: 'Hello from WebSocket!'
  });
});

socket.on('message:new', (message) => {
  console.log('New message:', message);
});

socket.on('user:typing', (data) => {
  console.log(`${data.user.fullName} is typing...`);
});
```

## 🏗️ Architecture

- **Framework**: Express.js
- **Database**: SQLite (development) / PostgreSQL (production ready)
- **ORM**: Sequelize
- **Authentication**: JWT
- **Real-time**: Socket.IO
- **File Storage**: Cloudinary (configured) / Local (fallback)
- **WebRTC**: For huddles (voice/video calls)

## 📦 Models

- **User**: User accounts with profiles
- **Workspace**: Team workspaces
- **Channel**: Communication channels
- **Message**: Chat messages
- **WorkspaceMember**: Workspace membership
- **ChannelMember**: Channel membership
- **Huddle**: Voice/video calls
- **Emoji**: Custom and default emojis
- **File**: Uploaded files

## 🔐 Security

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting on API endpoints
- CORS protection
- Input validation
- SQL injection protection via ORM
- XSS protection with Helmet

## 🚀 Production Ready Features

- Comprehensive error handling
- Request logging with Morgan
- Response compression
- Database connection pooling
- Graceful shutdown handling
- Environment-based configuration
- Health check endpoint
- WebSocket authentication

## 📈 Scalability

- Stateless authentication (JWT)
- Database indexing for performance
- Message pagination
- File upload limits
- Connection pooling
- Rate limiting
- Lazy loading of messages

## 🧪 Testing the API

The API is fully functional and ready to use. You can test it using:
- Postman
- cURL
- Frontend application
- WebSocket testing tools

## 📝 Environment Variables

```env
PORT=5000
NODE_ENV=production
DATABASE_URL=your_database_url
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CORS_ORIGIN=*
```

## 🎯 Next Steps

This backend is ready to be integrated with a frontend application. It provides:
- Complete REST API for all Slack features
- WebSocket support for real-time updates
- WebRTC signaling for voice/video calls
- File upload capabilities
- Emoji support with reactions

The API is production-ready with proper error handling, security measures, and scalability considerations.
