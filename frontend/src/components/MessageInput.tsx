import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Smile, AtSign } from 'lucide-react';
import { useMessageStore } from '../store/messageStore';
import socketService from '../services/socket';
import EmojiPicker from 'emoji-picker-react';

interface MessageInputProps {
  channelId: string;
  channelName: string;
  parentId?: string;
}

export const MessageInput: React.FC<MessageInputProps> = ({ channelId, channelName, parentId }) => {
  const { sendMessage } = useMessageStore();
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Focus input when channel changes
    inputRef.current?.focus();
  }, [channelId]);

  const handleSend = async () => {
    if (message.trim()) {
      await sendMessage(channelId, message.trim(), parentId);
      setMessage('');
      setIsTyping(false);
      socketService.stopTyping(channelId);
    }
  };

  const handleTyping = (value: string) => {
    setMessage(value);
    
    // Handle typing indicator
    if (!isTyping && value.trim()) {
      setIsTyping(true);
      socketService.startTyping(channelId);
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        socketService.stopTyping(channelId);
      }
    }, 2000);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiSelect = (emoji: any) => {
    setMessage((prev) => prev + emoji.emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  return (
    <div className="border-t border-gray-200 px-6 py-4">
      <div className="relative">
        <div className="flex items-end gap-2 bg-white border border-gray-300 rounded-lg px-3 py-2 focus-within:border-slack-purple">
          <div className="flex-1">
            <textarea
              ref={inputRef}
              value={message}
              onChange={(e) => handleTyping(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={`Message #${channelName}`}
              className="w-full resize-none outline-none min-h-[24px] max-h-[200px]"
              rows={1}
              style={{
                height: 'auto',
                overflowY: message.split('\n').length > 5 ? 'auto' : 'hidden'
              }}
            />
          </div>
          
          <div className="flex items-center gap-1 pb-0.5">
            <button 
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
              title="Add emoji"
            >
              <Smile className="w-5 h-5" />
            </button>
            
            <button 
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
              title="Attach file"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            
            <button 
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
              title="Mention someone"
            >
              <AtSign className="w-5 h-5" />
            </button>
            
            <button
              onClick={handleSend}
              disabled={!message.trim()}
              className={`p-1.5 rounded transition-colors ${
                message.trim() 
                  ? 'text-white bg-slack-green hover:bg-slack-green/90' 
                  : 'text-gray-400 bg-gray-100 cursor-not-allowed'
              }`}
              title="Send message"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Emoji Picker */}
        {showEmojiPicker && (
          <div className="absolute bottom-full right-0 mb-2 z-50">
            <EmojiPicker 
              onEmojiClick={handleEmojiSelect}
              width={350}
              height={400}
            />
          </div>
        )}

        {/* Formatting help text */}
        <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">Shift</kbd> + 
              <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs ml-1">Enter</kbd> for new line
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
