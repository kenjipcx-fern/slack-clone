import { create } from 'zustand';
import { Workspace, WorkspaceMember, workspaceAPI } from '../api/workspace';
import { Channel, channelAPI } from '../api/channel';

interface WorkspaceState {
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  members: WorkspaceMember[];
  channels: Channel[];
  currentChannel: Channel | null;
  isLoading: boolean;
  error: string | null;

  setCurrentWorkspace: (workspace: Workspace | null) => void;
  setWorkspaces: (workspaces: Workspace[]) => void;
  loadWorkspace: (workspaceId: string) => Promise<void>;
  loadChannels: (workspaceId: string) => Promise<void>;
  loadMembers: (workspaceId: string) => Promise<void>;
  setCurrentChannel: (channel: Channel | null) => void;
  createChannel: (workspaceId: string, data: any) => Promise<Channel>;
  joinChannel: (channelId: string) => Promise<void>;
  leaveChannel: (channelId: string) => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  currentWorkspace: null,
  workspaces: [],
  members: [],
  channels: [],
  currentChannel: null,
  isLoading: false,
  error: null,

  setCurrentWorkspace: (workspace) => {
    set({ currentWorkspace: workspace });
  },

  setWorkspaces: (workspaces) => {
    set({ workspaces });
  },

  loadWorkspace: async (workspaceId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await workspaceAPI.get(workspaceId);
      set({ currentWorkspace: response.workspace, isLoading: false });
      
      // Load channels and members
      await get().loadChannels(workspaceId);
      await get().loadMembers(workspaceId);
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to load workspace',
        isLoading: false,
      });
    }
  },

  loadChannels: async (workspaceId) => {
    try {
      const response = await channelAPI.getWorkspaceChannels(workspaceId);
      const allChannels = [
        ...response.memberChannels,
        ...response.publicChannels.filter((pc: Channel) => 
          !response.memberChannels.find((mc: any) => mc.id === pc.id)
        )
      ];
      set({ channels: allChannels });
    } catch (error: any) {
      console.error('Failed to load channels:', error);
      set({ error: 'Failed to load channels' });
    }
  },

  loadMembers: async (workspaceId) => {
    try {
      const response = await workspaceAPI.getMembers(workspaceId);
      set({ members: response.members });
    } catch (error: any) {
      console.error('Failed to load members:', error);
    }
  },

  setCurrentChannel: (channel) => {
    set({ currentChannel: channel });
  },

  createChannel: async (workspaceId, data) => {
    try {
      const response = await channelAPI.create(workspaceId, data);
      const channel = response.channel;
      
      set((state) => ({
        channels: [...state.channels, channel],
      }));
      
      return channel;
    } catch (error: any) {
      throw error;
    }
  },

  joinChannel: async (channelId) => {
    try {
      await channelAPI.join(channelId);
      
      // Update channel membership
      set((state) => ({
        channels: state.channels.map(ch => 
          ch.id === channelId 
            ? { ...ch, memberCount: ch.memberCount + 1 }
            : ch
        ),
      }));
    } catch (error: any) {
      throw error;
    }
  },

  leaveChannel: async (channelId) => {
    try {
      await channelAPI.leave(channelId);
      
      // Update channel membership
      set((state) => ({
        channels: state.channels.map(ch => 
          ch.id === channelId 
            ? { ...ch, memberCount: ch.memberCount - 1 }
            : ch
        ),
        currentChannel: state.currentChannel?.id === channelId ? null : state.currentChannel,
      }));
    } catch (error: any) {
      throw error;
    }
  },
}));
