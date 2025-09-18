import React, { useState } from 'react';
import { Message } from '../api/message';
import { format } from 'date-fns';
import { MoreHorizontal, Edit2, Trash2, Pin, Smile, MessageSquare } from 'lucide-react';
import { useMessageStore } from '../store/messageStore';
import { useAuthStore } from '../store/authStore';
import EmojiPicker from 'emoji-picker-react';

interface MessageItemProps {
  message: Message;
  showAvatar: boolean;
  channelId: string;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message, showAvatar, channelId }) => {
  const { user } = useAuthStore();
  const { updateMessage, deleteMessage, addReaction, removeReaction, pinMessage, unpinMessage } = useMessageStore();
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const isOwnMessage = user?.id === message.userId;

  const handleEdit = async () => {
    if (editContent.trim() && editContent !== message.content) {
      await updateMessage(message.id, editContent);
    }
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this message?')) {
      await deleteMessage(message.id);
    }
  };

  const handleReaction = async (emoji: string) => {
    const existingReaction = message.reactions?.[emoji];
    if (existingReaction?.users.includes(user?.id || '')) {
      await removeReaction(message.id, emoji);
    } else {
      await addReaction(message.id, emoji);
    }
    setShowEmojiPicker(false);
  };

  const handlePin = async () => {
    if (message.isPinned) {
      await unpinMessage(message.id);
    } else {
      await pinMessage(message.id);
    }
  };

  return (
    <div 
      className={`group flex gap-3 py-1 px-2 hover:bg-gray-50 rounded ${showAvatar ? 'mt-4' : 'mt-0.5'}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar or timestamp */}
      <div className="w-10 flex-shrink-0">
        {showAvatar ? (
          <img 
            src={message.User?.avatar || `https://ui-avatars.com/api/?name=${message.User?.fullName}&background=random`}
            alt={message.User?.fullName}
            className="w-9 h-9 rounded"
          />
        ) : (
          <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100">
            {format(new Date(message.createdAt), 'HH:mm')}
          </span>
        )}
      </div>

      {/* Message content */}
      <div className="flex-1 min-w-0">
        {showAvatar && (
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className="font-semibold text-gray-900">
              {message.User?.fullName || message.User?.username}
            </span>
            <span className="text-xs text-gray-500">
              {format(new Date(message.createdAt), 'h:mm a')}
            </span>
            {message.isPinned && (
              <span className="text-xs text-amber-600 flex items-center gap-1">
                <Pin className="w-3 h-3" />
                Pinned
              </span>
            )}
            {message.isEdited && (
              <span className="text-xs text-gray-400">(edited)</span>
            )}
          </div>
        )}

        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 rounded resize-none focus:outline-none focus:border-slack-purple"
              rows={2}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleEdit();
                } else if (e.key === 'Escape') {
                  setIsEditing(false);
                  setEditContent(message.content);
                }
              }}
            />
            <div className="flex gap-2">
              <button 
                onClick={handleEdit}
                className="px-3 py-1 bg-slack-green text-white text-sm rounded hover:bg-slack-green/90"
              >
                Save
              </button>
              <button 
                onClick={() => {
                  setIsEditing(false);
                  setEditContent(message.content);
                }}
                className="px-3 py-1 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="text-gray-900 break-words">
              {message.type === 'system' ? (
                <span className="italic text-gray-500">{message.content}</span>
              ) : (
                message.content
              )}
            </div>

            {/* Attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-2 space-y-2">
                {message.attachments.map((attachment, index) => (
                  <div key={index} className="border border-gray-200 rounded p-2">
                    {attachment.type === 'image' ? (
                      <img 
                        src={attachment.url} 
                        alt={attachment.name}
                        className="max-w-md rounded"
                      />
                    ) : (
                      <a 
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slack-blue hover:underline flex items-center gap-2"
                      >
                        📎 {attachment.name}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Reactions */}
            {message.reactions && Object.keys(message.reactions).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {Object.entries(message.reactions).map(([emoji, data]) => (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(emoji)}
                    className={`px-2 py-1 rounded-full border text-sm flex items-center gap-1 hover:bg-gray-100 ${
                      data.users.includes(user?.id || '') 
                        ? 'bg-blue-50 border-blue-300' 
                        : 'bg-gray-50 border-gray-300'
                    }`}
                  >
                    <span>{emoji}</span>
                    <span className="text-xs text-gray-600">{data.count}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Thread preview */}
            {message.threadCount > 0 && (
              <button className="mt-2 text-slack-blue text-sm hover:underline flex items-center gap-1">
                <MessageSquare className="w-4 h-4" />
                {message.threadCount} {message.threadCount === 1 ? 'reply' : 'replies'}
              </button>
            )}
          </>
        )}
      </div>

      {/* Message actions */}
      {showActions && !isEditing && (
        <div className="flex items-start gap-1 bg-white border border-gray-200 rounded-lg shadow-sm px-1 py-1 absolute right-6">
          <button 
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-1 hover:bg-gray-100 rounded text-gray-500"
            title="Add reaction"
          >
            <Smile className="w-4 h-4" />
          </button>
          <button 
            className="p-1 hover:bg-gray-100 rounded text-gray-500"
            title="Reply in thread"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
          {isOwnMessage && (
            <>
              <button 
                onClick={() => setIsEditing(true)}
                className="p-1 hover:bg-gray-100 rounded text-gray-500"
                title="Edit message"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button 
                onClick={handleDelete}
                className="p-1 hover:bg-gray-100 rounded text-red-500"
                title="Delete message"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
          <button 
            onClick={handlePin}
            className="p-1 hover:bg-gray-100 rounded text-gray-500"
            title={message.isPinned ? 'Unpin message' : 'Pin message'}
          >
            <Pin className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="absolute z-50" style={{ top: '100%', right: 0 }}>
          <EmojiPicker 
            onEmojiClick={(emoji) => handleReaction(emoji.emoji)}
            width={300}
            height={400}
          />
        </div>
      )}
    </div>
  );
};
