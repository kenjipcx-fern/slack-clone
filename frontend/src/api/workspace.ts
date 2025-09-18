import api from './config';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  ownerId: string;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member' | 'guest';
  displayName?: string;
  title?: string;
  joinedAt: string;
  User?: any;
}

export const workspaceAPI = {
  create: async (data: { name: string; description?: string }) => {
    const response = await api.post('/workspaces', data);
    return response.data;
  },

  get: async (workspaceId: string) => {
    const response = await api.get(`/workspaces/${workspaceId}`);
    return response.data;
  },

  update: async (workspaceId: string, data: Partial<Workspace>) => {
    const response = await api.put(`/workspaces/${workspaceId}`, data);
    return response.data;
  },

  delete: async (workspaceId: string) => {
    const response = await api.delete(`/workspaces/${workspaceId}`);
    return response.data;
  },

  getMembers: async (workspaceId: string, params?: { page?: number; limit?: number; search?: string }) => {
    const response = await api.get(`/workspaces/${workspaceId}/members`, { params });
    return response.data;
  },

  inviteMember: async (workspaceId: string, email: string, role: string = 'member') => {
    const response = await api.post(`/workspaces/${workspaceId}/members/invite`, { email, role });
    return response.data;
  },

  removeMember: async (workspaceId: string, memberId: string) => {
    const response = await api.delete(`/workspaces/${workspaceId}/members/${memberId}`);
    return response.data;
  },

  updateMemberRole: async (workspaceId: string, memberId: string, role: string) => {
    const response = await api.put(`/workspaces/${workspaceId}/members/${memberId}/role`, { role });
    return response.data;
  },

  leave: async (workspaceId: string) => {
    const response = await api.post(`/workspaces/${workspaceId}/leave`);
    return response.data;
  },
};
