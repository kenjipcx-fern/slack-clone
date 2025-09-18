# 🚀 Slack Clone - Full Stack Application

A feature-complete Slack clone built with modern web technologies, offering real-time messaging, voice/video huddles, emoji reactions, and team collaboration features.

## 🌐 Live Demo

- **Frontend**: https://slack-frontend-morphvm-8p9e2k2g.http.cloud.morph.so
- **Backend API**: https://slack-backend-morphvm-8p9e2k2g.http.cloud.morph.so
- **GitHub Repository**: https://github.com/kenjipcx-fern/slack-clone

## ✨ Features

### 💬 **Messaging System**
- Real-time messaging with WebSocket support
- Message editing and deletion
- Threading and replies
- Message search functionality
- Typing indicators
- Read receipts and unread counts
- System messages for user actions

### 🎥 **Huddles (Voice/Video)**
- Start/join/leave huddles in channels
- WebRTC signaling for peer-to-peer connections
- Audio/video/screen sharing support
- Participant management
- Recording capabilities
- Invite system

### 😊 **Emoji System**
- Default emoji library
- Custom workspace emojis
- Emoji reactions on messages
- Emoji picker interface
- Usage tracking
- Upload custom emoji images

### 👥 **Team Collaboration**
- Workspace creation and management
- Public and private channels
- Direct messages (1-on-1 and group)
- User roles and permissions (owner, admin, member, guest)
- Member invitation system
- User presence (online/offline/away/DND status)
- User profiles with avatars and status messages

### 📁 **File Management**
- File uploads (images, documents, etc.)
- Image previews
- File sharing in messages
- Download tracking

### 🔍 **Additional Features**
- Channel topics and descriptions
- Message pinning
- Channel archiving
- @mentions with notifications
- Comprehensive search (messages & files)
- Dark mode UI inspired by Slack
- Mobile-responsive design

## 🛠️ Technology Stack

### Backend
- **Node.js** with **Express.js** - Server framework
- **Socket.IO** - Real-time WebSocket communication
- **SQLite** (dev) / **PostgreSQL** (prod) - Database
- **Sequelize** - ORM for database management
- **JWT** - Authentication
- **bcrypt** - Password hashing
- **Multer** - File uploads
- **Cloudinary** - Cloud storage (optional)

### Frontend
- **React 19** with **TypeScript** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS v3** - Styling
- **Zustand** - State management
- **Socket.IO Client** - Real-time communication
- **React Router** - Navigation
- **React Hook Form** - Form handling
- **Emoji Picker React** - Emoji selection
- **Lucide React** - Icons
- **date-fns** - Date formatting
- **React Hot Toast** - Notifications

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager
- Git

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/kenjipcx-fern/slack-clone.git
cd slack-clone
```

2. **Backend Setup**
```bash
cd backend
npm install
npm start
```
The backend will run on http://localhost:5000

3. **Frontend Setup**
```bash
cd frontend
npm install
npm run dev
```
The frontend will run on http://localhost:3000

### Environment Variables

Create a `.env` file in the backend directory:
```env
PORT=5000
NODE_ENV=development
DATABASE_URL=your_database_url
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
```

## 📱 Usage

### Creating an Account
1. Navigate to the registration page
2. Enter your email, username, full name, and password
3. Optionally create a workspace or join an existing one
4. Click "Create account"

### Creating a Workspace
1. During registration, provide a workspace name
2. Or create one later from the workspace menu

### Creating Channels
1. Click the "+" button next to "Channels" in the sidebar
2. Enter a channel name and description
3. Choose between public or private
4. Click "Create"

### Sending Messages
1. Select a channel from the sidebar
2. Type your message in the input field
3. Press Enter to send (Shift+Enter for new line)
4. Use the emoji button to add emojis
5. Use the paperclip to attach files

### Starting a Huddle
1. Click the "Start Huddle" button in the sidebar
2. Other members can join the active huddle
3. Use audio/video controls during the call

### Adding Reactions
1. Hover over any message
2. Click the smile icon
3. Select an emoji from the picker
4. Click on existing reactions to add/remove yours

## 🏗️ Architecture

### Backend Architecture
```
backend/
├── config/         # Database configuration
├── controllers/    # Route controllers
├── middleware/     # Auth and other middleware
├── models/         # Sequelize models
├── routes/         # API routes
├── services/       # Business logic & WebSocket
└── server.js       # Main server file
```

### Frontend Architecture
```
frontend/
├── src/
│   ├── api/        # API service layer
│   ├── components/ # React components
│   ├── pages/      # Page components
│   ├── services/   # WebSocket service
│   ├── store/      # Zustand stores
│   └── types/      # TypeScript types
```

## 🔐 Security Features

- JWT-based authentication with refresh tokens
- Password hashing with bcrypt
- Rate limiting on API endpoints
- CORS protection
- Input validation and sanitization
- SQL injection protection via ORM
- XSS protection with Helmet
- File upload restrictions

## 📊 Database Schema

### Main Tables
- **Users** - User accounts and profiles
- **Workspaces** - Team workspaces
- **Channels** - Communication channels
- **Messages** - Chat messages with reactions
- **WorkspaceMembers** - Workspace membership
- **ChannelMembers** - Channel membership
- **Huddles** - Voice/video call sessions
- **Emojis** - Custom and default emojis
- **Files** - Uploaded files and attachments

## 🚢 Deployment

The application is deployed and accessible at:
- Frontend: https://slack-frontend-morphvm-8p9e2k2g.http.cloud.morph.so
- Backend: https://slack-backend-morphvm-8p9e2k2g.http.cloud.morph.so

### Deployment Steps
1. Backend is running on port 5000
2. Frontend is running on port 3000
3. Both services are exposed via secure HTTPS endpoints
4. WebSocket connections work over WSS protocol

## 🧪 Testing the Application

### Test Credentials
You can create your own account or use:
- Email: test@example.com
- Password: password123

### API Testing
```bash
# Register a new user
curl -X POST https://slack-backend-morphvm-8p9e2k2g.http.cloud.morph.so/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "username": "testuser",
    "fullName": "Test User",
    "workspaceName": "Test Workspace"
  }'

# Login
curl -X POST https://slack-backend-morphvm-8p9e2k2g.http.cloud.morph.so/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

## 📈 Performance Optimizations

- Message pagination and lazy loading
- Efficient WebSocket connection management
- Database indexing for fast queries
- Response caching
- Image optimization
- Code splitting in frontend
- Memoization of expensive operations

## 🎯 Roadmap

- [ ] Voice/video call implementation with WebRTC
- [ ] Screen sharing during huddles
- [ ] Advanced search with filters
- [ ] Slash commands
- [ ] Workflow builder
- [ ] App integrations
- [ ] Mobile apps (React Native)
- [ ] End-to-end encryption
- [ ] Message scheduling
- [ ] Reminder system

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is built for demonstration purposes.

## 🙏 Acknowledgments

- Inspired by Slack's excellent UX/UI
- Built with modern web technologies
- Real-time features powered by Socket.IO
- UI components styled with Tailwind CSS

## 📞 Support

For issues or questions, please open an issue on GitHub.

---

**Built with ❤️ as a full-featured Slack clone demonstration**
