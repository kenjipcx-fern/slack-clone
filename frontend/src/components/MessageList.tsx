import React, { useEffect, useRef } from 'react';
import { Message } from '../api/message';
import { MessageItem } from './MessageItem';
import { format, isToday, isYesterday } from 'date-fns';

interface MessageListProps {
  messages: Message[];
  channelId: string;
}

export const MessageList: React.FC<MessageListProps> = ({ messages, channelId }) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to bottom on new messages
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getDateSeparator = (date: string) => {
    const messageDate = new Date(date);
    
    if (isToday(messageDate)) {
      return 'Today';
    } else if (isYesterday(messageDate)) {
      return 'Yesterday';
    } else {
      return format(messageDate, 'EEEE, MMMM d');
    }
  };

  const groupedMessages = messages.reduce((groups: any[], message) => {
    const date = format(new Date(message.createdAt), 'yyyy-MM-dd');
    
    if (!groups.length || groups[groups.length - 1].date !== date) {
      groups.push({
        date,
        label: getDateSeparator(message.createdAt),
        messages: [message]
      });
    } else {
      groups[groups.length - 1].messages.push(message);
    }
    
    return groups;
  }, []);

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto px-6 py-4">
      {groupedMessages.map((group) => (
        <div key={group.date}>
          {/* Date separator */}
          <div className="flex items-center my-4">
            <div className="flex-1 border-t border-gray-200"></div>
            <span className="px-3 text-xs text-gray-500 font-medium">
              {group.label}
            </span>
            <div className="flex-1 border-t border-gray-200"></div>
          </div>

          {/* Messages for this date */}
          {group.messages.map((message: any, index: number) => {
            const prevMessage = index > 0 ? group.messages[index - 1] : null;
            const showAvatar = !prevMessage || 
              prevMessage.userId !== message.userId || 
              (new Date(message.createdAt).getTime() - new Date(prevMessage.createdAt).getTime()) > 300000; // 5 minutes
            
            return (
              <MessageItem 
                key={message.id} 
                message={message} 
                showAvatar={showAvatar}
                channelId={channelId}
              />
            );
          })}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
};
