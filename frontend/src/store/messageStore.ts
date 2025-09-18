import { create } from 'zustand';
import { Message, messageAPI } from '../api/message';
import socketService from '../services/socket';

interface MessageState {
  messages: Record<string, Message[]>; // channelId -> messages
  typingUsers: Record<string, Set<string>>; // channelId -> userIds
  isLoading: boolean;
  error: string | null;

  loadMessages: (channelId: string, params?: any) => Promise<void>;
  sendMessage: (channelId: string, content: string, parentId?: string) => Promise<void>;
  updateMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  addReaction: (messageId: string, emoji: string) => Promise<void>;
  removeReaction: (messageId: string, emoji: string) => Promise<void>;
  pinMessage: (messageId: string) => Promise<void>;
  unpinMessage: (messageId: string) => Promise<void>;
  
  addMessage: (channelId: string, message: Message) => void;
  updateMessageInStore: (message: Message) => void;
  removeMessage: (channelId: string, messageId: string) => void;
  
  addTypingUser: (channelId: string, userId: string) => void;
  removeTypingUser: (channelId: string, userId: string) => void;
}

export const useMessageStore = create<MessageState>((set, get) => ({
  messages: {},
  typingUsers: {},
  isLoading: false,
  error: null,

  loadMessages: async (channelId, params) => {
    set({ isLoading: true, error: null });
    try {
      const response = await messageAPI.getChannelMessages(channelId, params);
      set((state) => ({
        messages: {
          ...state.messages,
          [channelId]: response.messages,
        },
        isLoading: false,
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to load messages',
        isLoading: false,
      });
    }
  },

  sendMessage: async (channelId, content, parentId) => {
    try {
      // Send via WebSocket for real-time delivery
      socketService.sendMessage({
        channelId,
        content,
        parentId,
        type: 'text',
      });
      
      // Also send via API for persistence
      const response = await messageAPI.send(channelId, {
        content,
        parentId,
        type: 'text',
      });
      
      // Message will be added via WebSocket event
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to send message' });
      throw error;
    }
  },

  updateMessage: async (messageId, content) => {
    try {
      // Update via WebSocket
      socketService.updateMessage({ messageId, content });
      
      // Also update via API
      await messageAPI.update(messageId, content);
      
      // Message will be updated via WebSocket event
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to update message' });
      throw error;
    }
  },

  deleteMessage: async (messageId) => {
    try {
      // Delete via WebSocket
      socketService.deleteMessage(messageId);
      
      // Also delete via API
      await messageAPI.delete(messageId);
      
      // Message will be removed via WebSocket event
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to delete message' });
      throw error;
    }
  },

  addReaction: async (messageId, emoji) => {
    try {
      socketService.addReaction(messageId, emoji);
      await messageAPI.addReaction(messageId, emoji);
    } catch (error: any) {
      console.error('Failed to add reaction:', error);
    }
  },

  removeReaction: async (messageId, emoji) => {
    try {
      socketService.removeReaction(messageId, emoji);
      await messageAPI.removeReaction(messageId, emoji);
    } catch (error: any) {
      console.error('Failed to remove reaction:', error);
    }
  },

  pinMessage: async (messageId) => {
    try {
      await messageAPI.pin(messageId);
      
      // Update message in store
      set((state) => {
        const newMessages = { ...state.messages };
        Object.keys(newMessages).forEach(channelId => {
          newMessages[channelId] = newMessages[channelId].map(msg =>
            msg.id === messageId ? { ...msg, isPinned: true } : msg
          );
        });
        return { messages: newMessages };
      });
    } catch (error: any) {
      throw error;
    }
  },

  unpinMessage: async (messageId) => {
    try {
      await messageAPI.unpin(messageId);
      
      // Update message in store
      set((state) => {
        const newMessages = { ...state.messages };
        Object.keys(newMessages).forEach(channelId => {
          newMessages[channelId] = newMessages[channelId].map(msg =>
            msg.id === messageId ? { ...msg, isPinned: false } : msg
          );
        });
        return { messages: newMessages };
      });
    } catch (error: any) {
      throw error;
    }
  },

  addMessage: (channelId, message) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [channelId]: [...(state.messages[channelId] || []), message],
      },
    }));
  },

  updateMessageInStore: (message) => {
    set((state) => {
      const newMessages = { ...state.messages };
      const channelId = message.channelId;
      
      if (newMessages[channelId]) {
        newMessages[channelId] = newMessages[channelId].map(msg =>
          msg.id === message.id ? message : msg
        );
      }
      
      return { messages: newMessages };
    });
  },

  removeMessage: (channelId, messageId) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [channelId]: state.messages[channelId]?.filter(msg => msg.id !== messageId) || [],
      },
    }));
  },

  addTypingUser: (channelId, userId) => {
    set((state) => {
      const typingUsers = { ...state.typingUsers };
      if (!typingUsers[channelId]) {
        typingUsers[channelId] = new Set();
      }
      typingUsers[channelId].add(userId);
      return { typingUsers };
    });
  },

  removeTypingUser: (channelId, userId) => {
    set((state) => {
      const typingUsers = { ...state.typingUsers };
      typingUsers[channelId]?.delete(userId);
      return { typingUsers };
    });
  },
}));
