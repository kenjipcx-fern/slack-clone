import React, { useEffect, useState, useRef } from 'react';
import { Channel } from '../api/channel';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { useMessageStore } from '../store/messageStore';
import { Hash, Lock, Users, Pin, Info, Phone, Video } from 'lucide-react';

interface ChannelViewProps {
  channel: Channel;
}

export const ChannelView: React.FC<ChannelViewProps> = ({ channel }) => {
  const { loadMessages, messages, isLoading } = useMessageStore();
  const [showChannelInfo, setShowChannelInfo] = useState(false);
  
  useEffect(() => {
    if (channel?.id) {
      loadMessages(channel.id);
    }
  }, [channel?.id]);

  const channelMessages = messages[channel.id] || [];

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Channel Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          {channel.type === 'public' ? (
            <Hash className="w-5 h-5 text-gray-500" />
          ) : (
            <Lock className="w-5 h-5 text-gray-500" />
          )}
          <h2 className="text-lg font-semibold text-gray-900">
            {channel.displayName || channel.name}
          </h2>
          {channel.memberCount > 0 && (
            <button className="flex items-center gap-1 text-gray-500 hover:text-gray-700">
              <Users className="w-4 h-4" />
              <span className="text-sm">{channel.memberCount}</span>
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded">
            <Phone className="w-5 h-5" />
          </button>
          <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded">
            <Video className="w-5 h-5" />
          </button>
          <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded">
            <Pin className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setShowChannelInfo(!showChannelInfo)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
          >
            <Info className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Channel Topic/Description */}
      {channel.description && (
        <div className="px-6 py-2 bg-gray-50 border-b border-gray-200">
          <p className="text-sm text-gray-600">{channel.description}</p>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden flex">
        <div className="flex-1 flex flex-col">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slack-purple mx-auto"></div>
                <p className="mt-2 text-sm text-gray-500">Loading messages...</p>
              </div>
            </div>
          ) : channelMessages.length > 0 ? (
            <MessageList messages={channelMessages} channelId={channel.id} />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-md">
                <Hash className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Welcome to #{channel.name}!
                </h3>
                <p className="text-gray-500">
                  This is the very beginning of the #{channel.name} channel.
                  {channel.description && (
                    <span className="block mt-2">{channel.description}</span>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Message Input */}
          <MessageInput channelId={channel.id} channelName={channel.name} />
        </div>

        {/* Channel Info Sidebar */}
        {showChannelInfo && (
          <div className="w-80 border-l border-gray-200 bg-white p-4 overflow-y-auto">
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">About</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Channel Name</p>
                  <p className="text-sm text-gray-900">#{channel.name}</p>
                </div>
                {channel.description && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Description</p>
                    <p className="text-sm text-gray-900">{channel.description}</p>
                  </div>
                )}
                {channel.topic && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Topic</p>
                    <p className="text-sm text-gray-900">{channel.topic}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500 uppercase">Created</p>
                  <p className="text-sm text-gray-900">
                    {new Date(channel.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Members ({channel.memberCount})</h3>
              <div className="space-y-2">
                {/* Member list would go here */}
                <p className="text-sm text-gray-500">Loading members...</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
