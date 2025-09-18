import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import { Hash, Lock, Plus, ChevronDown, ChevronRight, Circle, Phone, LogOut, Settings, User } from 'lucide-react';
import { CreateChannelModal } from './CreateChannelModal';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { currentWorkspace, channels, setCurrentChannel, currentChannel } = useWorkspaceStore();
  const [showChannels, setShowChannels] = useState(true);
  const [showDirectMessages, setShowDirectMessages] = useState(true);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const publicChannels = channels.filter(ch => ch.type === 'public');
  const privateChannels = channels.filter(ch => ch.type === 'private');
  const directMessages = channels.filter(ch => ch.type === 'direct' || ch.type === 'group');

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <div className="w-64 bg-slack-sidebar flex flex-col h-full">
      {/* Workspace Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slack-border">
        <button className="flex items-center space-x-2 text-white hover:bg-slack-hover rounded px-2 py-1">
          <span className="font-bold text-lg">{currentWorkspace?.name || 'Workspace'}</span>
          <ChevronDown className="w-4 h-4" />
        </button>
        <button className="text-white hover:bg-slack-hover rounded p-1">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
      </div>

      {/* User Status */}
      <div className="px-4 py-3 border-b border-slack-border">
        <div className="relative">
          <button 
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-2 text-slack-text hover:bg-slack-hover rounded px-2 py-1 w-full"
          >
            <div className="relative">
              <img 
                src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.fullName}&background=random`} 
                alt={user?.fullName}
                className="w-8 h-8 rounded"
              />
              <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slack-sidebar ${
                user?.status === 'active' ? 'bg-green-500' : 
                user?.status === 'away' ? 'bg-yellow-500' : 
                user?.status === 'dnd' ? 'bg-red-500' : 
                'bg-gray-500'
              }`} />
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm font-medium">{user?.fullName}</div>
              <div className="text-xs opacity-75">{user?.status || 'active'}</div>
            </div>
          </button>
          
          {showUserMenu && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg z-50 py-2">
              <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2">
                <User className="w-4 h-4" />
                Profile
              </button>
              <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Settings
              </button>
              <hr className="my-1" />
              <button 
                onClick={handleLogout}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 text-red-600"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Channels & Messages */}
      <div className="flex-1 overflow-y-auto">
        {/* Huddle Button */}
        <div className="px-3 py-2">
          <button className="w-full flex items-center justify-center gap-2 bg-slack-green text-white rounded-lg py-2 hover:bg-slack-green/90">
            <Phone className="w-4 h-4" />
            <span>Start Huddle</span>
          </button>
        </div>

        {/* Channels */}
        <div className="mt-4">
          <button 
            onClick={() => setShowChannels(!showChannels)}
            className="flex items-center justify-between w-full px-3 py-1 text-slack-text/70 hover:text-slack-text"
          >
            <div className="flex items-center gap-1">
              {showChannels ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <span className="text-sm font-medium">Channels</span>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowCreateChannel(true);
              }}
              className="hover:bg-slack-hover rounded p-1"
            >
              <Plus className="w-4 h-4" />
            </button>
          </button>
          
          {showChannels && (
            <div className="mt-1">
              {publicChannels.map(channel => (
                <button
                  key={channel.id}
                  onClick={() => setCurrentChannel(channel)}
                  className={`channel-item w-full text-left ${
                    currentChannel?.id === channel.id ? 'bg-slack-blue/20 text-white' : ''
                  }`}
                >
                  <Hash className="w-4 h-4" />
                  <span>{channel.name}</span>
                  {(channel.unreadCount ?? 0) > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2">
                      {channel.unreadCount}
                    </span>
                  )}
                </button>
              ))}
              
              {privateChannels.map(channel => (
                <button
                  key={channel.id}
                  onClick={() => setCurrentChannel(channel)}
                  className={`channel-item w-full text-left ${
                    currentChannel?.id === channel.id ? 'bg-slack-blue/20 text-white' : ''
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  <span>{channel.name}</span>
                  {(channel.unreadCount ?? 0) > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2">
                      {channel.unreadCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Direct Messages */}
        <div className="mt-4">
          <button 
            onClick={() => setShowDirectMessages(!showDirectMessages)}
            className="flex items-center justify-between w-full px-3 py-1 text-slack-text/70 hover:text-slack-text"
          >
            <div className="flex items-center gap-1">
              {showDirectMessages ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <span className="text-sm font-medium">Direct Messages</span>
            </div>
            <Plus className="w-4 h-4 hover:bg-slack-hover rounded" />
          </button>
          
          {showDirectMessages && (
            <div className="mt-1">
              {directMessages.map(dm => (
                <button
                  key={dm.id}
                  onClick={() => setCurrentChannel(dm)}
                  className={`channel-item w-full text-left ${
                    currentChannel?.id === dm.id ? 'bg-slack-blue/20 text-white' : ''
                  }`}
                >
                  <Circle className="w-2 h-2 fill-current text-green-500" />
                  <span>{dm.displayName || dm.name}</span>
                  {(dm.unreadCount ?? 0) > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2">
                      {dm.unreadCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Channel Modal */}
      {showCreateChannel && (
        <CreateChannelModal onClose={() => setShowCreateChannel(false)} />
      )}
    </div>
  );
};
