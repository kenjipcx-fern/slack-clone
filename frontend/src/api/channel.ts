import api from './config';

export interface Channel {
  id: string;
  workspaceId: string;
  name: string;
  displayName?: string;
  type: 'public' | 'private' | 'direct' | 'group';
  description?: string;
  topic?: string;
  creatorId: string;
  isArchived: boolean;
  isGeneral: boolean;
  memberCount: number;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChannelMember {
  id: string;
  channelId: string;
  userId: string;
  role: 'admin' | 'member';
  joinedAt: string;
  lastReadAt: string;
  unreadCount: number;
  isMuted: boolean;
  isPinned: boolean;
}

export const channelAPI = {
  create: async (workspaceId: string, data: {
    name: string;
    displayName?: string;
    description?: string;
    type?: 'public' | 'private';
    memberIds?: string[];
  }) => {
    const response = await api.post(`/channels/workspace/${workspaceId}`, data);
    return response.data;
  },

  getWorkspaceChannels: async (workspaceId: string, includePrivate: boolean = false) => {
    const response = await api.get(`/channels/workspace/${workspaceId}`, {
      params: { includePrivate }
    });
    return response.data;
  },

  get: async (channelId: string) => {
    const response = await api.get(`/channels/${channelId}`);
    return response.data;
  },

  update: async (channelId: string, data: Partial<Channel>) => {
    const response = await api.put(`/channels/${channelId}`, data);
    return response.data;
  },

  join: async (channelId: string) => {
    const response = await api.post(`/channels/${channelId}/join`);
    return response.data;
  },

  leave: async (channelId: string) => {
    const response = await api.post(`/channels/${channelId}/leave`);
    return response.data;
  },

  getMembers: async (channelId: string, params?: { page?: number; limit?: number }) => {
    const response = await api.get(`/channels/${channelId}/members`, { params });
    return response.data;
  },

  addMember: async (channelId: string, userId: string) => {
    const response = await api.post(`/channels/${channelId}/members`, { userId });
    return response.data;
  },

  removeMember: async (channelId: string, memberId: string) => {
    const response = await api.delete(`/channels/${channelId}/members/${memberId}`);
    return response.data;
  },

  archive: async (channelId: string) => {
    const response = await api.post(`/channels/${channelId}/archive`);
    return response.data;
  },

  unarchive: async (channelId: string) => {
    const response = await api.post(`/channels/${channelId}/unarchive`);
    return response.data;
  },
};
