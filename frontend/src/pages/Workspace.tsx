import React, { useEffect, useState } from 'react';
import { Sidebar } from '../components/Sidebar';
import { ChannelView } from '../components/ChannelView';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useAuthStore } from '../store/authStore';
import { useMessageStore } from '../store/messageStore';
import socketService from '../services/socket';
import { useNavigate } from 'react-router-dom';

export const Workspace: React.FC = () => {
  const navigate = useNavigate();
  const { user, token, isAuthenticated } = useAuthStore();
  const { currentWorkspace, currentChannel, loadWorkspace } = useWorkspaceStore();
  const { addMessage, updateMessageInStore, removeMessage, addTypingUser, removeTypingUser } = useMessageStore();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      navigate('/login');
      return;
    }

    // Connect to WebSocket
    if (token && !isConnected) {
      socketService.connect(token);
      setIsConnected(true);

      // Set up WebSocket event listeners
      socketService.on('connected', () => {
        console.log('WebSocket connected');
      });

      socketService.on('message:new', (message) => {
        if (message.channelId) {
          addMessage(message.channelId, message);
        }
      });

      socketService.on('message:updated', (message) => {
        updateMessageInStore(message);
      });

      socketService.on('message:deleted', (data) => {
        if (data.channelId && data.messageId) {
          removeMessage(data.channelId, data.messageId);
        }
      });

      socketService.on('message:reaction', (data) => {
        // Handle reaction updates
        console.log('Reaction update:', data);
      });

      socketService.on('user:typing', (data) => {
        if (data.channelId && data.userId && data.userId !== user?.id) {
          addTypingUser(data.channelId, data.userId);
          
          // Remove after 3 seconds
          setTimeout(() => {
            removeTypingUser(data.channelId, data.userId);
          }, 3000);
        }
      });

      socketService.on('user:stopped_typing', (data) => {
        if (data.channelId && data.userId) {
          removeTypingUser(data.channelId, data.userId);
        }
      });
    }

    // Load default workspace if available
    const workspaces = JSON.parse(localStorage.getItem('workspaces') || '[]');
    if (workspaces.length > 0 && !currentWorkspace) {
      loadWorkspace(workspaces[0].Workspace?.id || workspaces[0].id);
    }

    return () => {
      // Cleanup listeners
      if (isConnected) {
        socketService.off('connected', () => {});
        socketService.off('message:new', () => {});
        socketService.off('message:updated', () => {});
        socketService.off('message:deleted', () => {});
        socketService.off('message:reaction', () => {});
        socketService.off('user:typing', () => {});
        socketService.off('user:stopped_typing', () => {});
      }
    };
  }, [isAuthenticated, token, navigate, isConnected, user, currentWorkspace]);

  useEffect(() => {
    // Join/leave channels via WebSocket
    if (currentChannel && isConnected) {
      socketService.joinChannel(currentChannel.id);
      
      return () => {
        socketService.leaveChannel(currentChannel.id);
      };
    }
  }, [currentChannel, isConnected]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="h-screen flex overflow-hidden bg-white">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {currentChannel ? (
          <ChannelView channel={currentChannel} />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No channel selected</h3>
              <p className="mt-1 text-sm text-gray-500">
                Choose a channel from the sidebar to start messaging
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
