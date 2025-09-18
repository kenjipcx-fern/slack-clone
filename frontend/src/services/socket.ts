import { io, Socket } from 'socket.io-client';
import { WS_URL } from '../api/config';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();

  connect(token: string) {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('Connected to WebSocket server');
      this.emit('connected');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
      this.emit('disconnected');
    });

    this.socket.on('error', (error: any) => {
      console.error('WebSocket error:', error);
      this.emit('error', error);
    });

    // Message events
    this.socket.on('message:new', (data) => {
      this.emit('message:new', data);
    });

    this.socket.on('message:updated', (data) => {
      this.emit('message:updated', data);
    });

    this.socket.on('message:deleted', (data) => {
      this.emit('message:deleted', data);
    });

    this.socket.on('message:reaction', (data) => {
      this.emit('message:reaction', data);
    });

    // User events
    this.socket.on('user:typing', (data) => {
      this.emit('user:typing', data);
    });

    this.socket.on('user:stopped_typing', (data) => {
      this.emit('user:stopped_typing', data);
    });

    this.socket.on('user:online', (data) => {
      this.emit('user:online', data);
    });

    this.socket.on('user:offline', (data) => {
      this.emit('user:offline', data);
    });

    this.socket.on('user:status_changed', (data) => {
      this.emit('user:status_changed', data);
    });

    // Huddle events
    this.socket.on('huddle:participant_joined', (data) => {
      this.emit('huddle:participant_joined', data);
    });

    this.socket.on('huddle:participant_left', (data) => {
      this.emit('huddle:participant_left', data);
    });

    // WebRTC events
    this.socket.on('webrtc:offer', (data) => {
      this.emit('webrtc:offer', data);
    });

    this.socket.on('webrtc:answer', (data) => {
      this.emit('webrtc:answer', data);
    });

    this.socket.on('webrtc:ice_candidate', (data) => {
      this.emit('webrtc:ice_candidate', data);
    });

    // Notifications
    this.socket.on('notification:mention', (data) => {
      this.emit('notification:mention', data);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinChannel(channelId: string) {
    this.socket?.emit('channel:join', channelId);
  }

  leaveChannel(channelId: string) {
    this.socket?.emit('channel:leave', channelId);
  }

  sendMessage(data: {
    channelId: string;
    content: string;
    type?: string;
    parentId?: string;
    attachments?: any[];
    mentions?: string[];
  }) {
    this.socket?.emit('message:send', data);
  }

  updateMessage(data: { messageId: string; content: string }) {
    this.socket?.emit('message:update', data);
  }

  deleteMessage(messageId: string) {
    this.socket?.emit('message:delete', messageId);
  }

  addReaction(messageId: string, emoji: string) {
    this.socket?.emit('message:react', { messageId, emoji });
  }

  removeReaction(messageId: string, emoji: string) {
    this.socket?.emit('message:unreact', { messageId, emoji });
  }

  startTyping(channelId: string) {
    this.socket?.emit('typing:start', channelId);
  }

  stopTyping(channelId: string) {
    this.socket?.emit('typing:stop', channelId);
  }

  updateStatus(status: string) {
    this.socket?.emit('status:update', status);
  }

  joinHuddle(huddleId: string) {
    this.socket?.emit('huddle:join', huddleId);
  }

  leaveHuddle(huddleId: string) {
    this.socket?.emit('huddle:leave', huddleId);
  }

  sendWebRTCOffer(targetUserId: string, offer: any, huddleId: string) {
    this.socket?.emit('webrtc:offer', { targetUserId, offer, huddleId });
  }

  sendWebRTCAnswer(targetUserId: string, answer: any, huddleId: string) {
    this.socket?.emit('webrtc:answer', { targetUserId, answer, huddleId });
  }

  sendWebRTCIceCandidate(targetUserId: string, candidate: any, huddleId: string) {
    this.socket?.emit('webrtc:ice_candidate', { targetUserId, candidate, huddleId });
  }

  // Event listener management
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: Function) {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, data?: any) {
    this.listeners.get(event)?.forEach(callback => callback(data));
  }
}

export default new SocketService();
