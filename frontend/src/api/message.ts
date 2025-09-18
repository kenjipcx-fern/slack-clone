import api from './config';
import { User } from './auth';

export interface Message {
  id: string;
  channelId: string;
  userId: string;
  content: string;
  type: 'text' | 'file' | 'image' | 'video' | 'audio' | 'code' | 'system';
  parentId?: string;
  threadCount: number;
  isEdited: boolean;
  editedAt?: string;
  isDeleted: boolean;
  isPinned: boolean;
  attachments?: any[];
  mentions?: string[];
  reactions?: Record<string, {
    emoji: string;
    emojiId?: string;
    users: string[];
    count: number;
  }>;
  createdAt: string;
  updatedAt: string;
  User?: User;
  replies?: Message[];
}

export const messageAPI = {
  send: async (channelId: string, data: {
    content: string;
    type?: string;
    parentId?: string;
    attachments?: any[];
    mentions?: string[];
  }) => {
    const response = await api.post(`/messages/channel/${channelId}`, data);
    return response.data;
  },

  getChannelMessages: async (channelId: string, params?: {
    limit?: number;
    before?: string;
    after?: string;
    threadId?: string;
    includeThreads?: boolean;
  }) => {
    const response = await api.get(`/messages/channel/${channelId}`, { params });
    return response.data;
  },

  get: async (messageId: string) => {
    const response = await api.get(`/messages/${messageId}`);
    return response.data;
  },

  update: async (messageId: string, content: string) => {
    const response = await api.put(`/messages/${messageId}`, { content });
    return response.data;
  },

  delete: async (messageId: string) => {
    const response = await api.delete(`/messages/${messageId}`);
    return response.data;
  },

  addReaction: async (messageId: string, emoji: string, emojiId?: string) => {
    const response = await api.post(`/messages/${messageId}/reactions`, { emoji, emojiId });
    return response.data;
  },

  removeReaction: async (messageId: string, emoji: string) => {
    const response = await api.delete(`/messages/${messageId}/reactions`, { data: { emoji } });
    return response.data;
  },

  pin: async (messageId: string) => {
    const response = await api.post(`/messages/${messageId}/pin`);
    return response.data;
  },

  unpin: async (messageId: string) => {
    const response = await api.delete(`/messages/${messageId}/pin`);
    return response.data;
  },

  getPinned: async (channelId: string) => {
    const response = await api.get(`/messages/channel/${channelId}/pinned`);
    return response.data;
  },

  search: async (workspaceId: string, params: {
    q: string;
    channelId?: string;
    userId?: string;
    type?: string;
    from?: string;
    to?: string;
    limit?: number;
  }) => {
    const response = await api.get(`/messages/search/workspace/${workspaceId}`, { params });
    return response.data;
  },
};
