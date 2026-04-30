'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  BackIcon, 
  PhoneIcon, 
  VideoIcon, 
  MoreIcon, 
  SendIcon, 
  AttachIcon, 
  CameraIcon, 
  MicIcon,
  DoubleCheckIcon,
  CheckIcon,
} from './CRMIcons';

const formatTime = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  
  if (isToday) return 'היום';
  
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'אתמול';
  
  return date.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' });
};

function MessageBubble({ message, isOutgoing }) {
  const isRead = message.status === 'read';
  
  return (
    <div className={`flex ${isOutgoing ? 'justify-start' : 'justify-end'} mb-2`}>
      <div
        className={`
          max-w-[75%] rounded-2xl px-3 py-2 shadow-sm
          ${isOutgoing 
            ? 'rounded-br-sm text-white' 
            : 'bg-white text-gray-900 rounded-bl-sm'
          }
        `}
        style={isOutgoing ? { background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' } : {}}
      >
        <p className="text-sm break-words whitespace-pre-wrap">{message.message || '[מדיה]'}</p>
        <div className={`flex items-center justify-end gap-1 mt-1 ${isOutgoing ? 'text-cyan-100' : 'text-gray-400'}`}>
          <span className="text-[10px]">{formatTime(message.timestamp)}</span>
          {isOutgoing && (
            <span className={isRead ? 'text-cyan-200' : ''}>
              {isRead ? <DoubleCheckIcon className="w-3.5 h-3.5" /> : <CheckIcon className="w-3.5 h-3.5" />}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function DateSeparator({ date }) {
  return (
    <div className="flex justify-center my-4">
      <span className="bg-white/80 backdrop-blur-sm text-gray-500 text-xs px-3 py-1 rounded-full shadow-sm">
        {formatDate(date)}
      </span>
    </div>
  );
}

export default function ChatView({
  conversation,
  lead,
  messages = [],
  onBack,
  onSendMessage,
  sending = false,
  connected = false,
  isMobile = false,
}) {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const displayName = lead?.name || conversation?.name || formatPhone(conversation?.phone);
  
  function formatPhone(phone) {
    if (!phone) return '';
    if (phone.startsWith('972')) {
      return '0' + phone.substring(3);
    }
    return phone;
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!newMessage.trim() || sending || !connected) return;
    onSendMessage(newMessage);
    setNewMessage('');
    inputRef.current?.focus();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = new Date(message.timestamp).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {});

  return (
    <div className="flex flex-col h-full bg-gray-100">
      {/* Header */}
      <header 
        className="flex items-center gap-3 px-3 py-2 bg-white border-b border-gray-200 shadow-sm"
        style={{ minHeight: '56px' }}
      >
        {/* Back button (mobile only) */}
        {isMobile && (
          <button
            onClick={onBack}
            className="p-1 -mr-1 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
          >
            <BackIcon className="w-6 h-6 text-gray-600" />
          </button>
        )}

        {/* Avatar */}
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
        >
          {displayName.substring(0, 2).toUpperCase()}
        </div>

        {/* Name & Status */}
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-gray-900 text-sm truncate">{displayName}</h2>
          <p className="text-xs text-gray-500">
            {connected ? (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                מחובר
              </span>
            ) : (
              formatPhone(conversation?.phone)
            )}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          <button 
            className="p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
            style={{ color: '#0891b2' }}
          >
            <PhoneIcon className="w-5 h-5" />
          </button>
          <button 
            className="p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors hidden sm:block"
            style={{ color: '#0891b2' }}
          >
            <VideoIcon className="w-5 h-5" />
          </button>
          <button className="p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors text-gray-600">
            <MoreIcon className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Messages Area */}
      <div 
        className="flex-1 overflow-y-auto px-3 py-2"
        style={{ background: 'linear-gradient(180deg, #e5ddd5 0%, #d4ccc4 100%)' }}
      >
        {Object.entries(groupedMessages).map(([date, dateMessages]) => (
          <div key={date}>
            <DateSeparator date={dateMessages[0]?.timestamp} />
            {dateMessages.map((msg, idx) => (
              <MessageBubble 
                key={msg.id || idx} 
                message={msg} 
                isOutgoing={msg.type === 'outgoing'} 
              />
            ))}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 px-2 py-2">
        <div className="flex items-end gap-2">
          {/* Attachment button */}
          <button 
            className="p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors flex-shrink-0"
            style={{ color: '#0891b2' }}
          >
            <AttachIcon className="w-5 h-5" />
          </button>

          {/* Input field */}
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={connected ? 'הקלד הודעה...' : 'מנותק מהשרת...'}
              disabled={!connected}
              className="w-full px-4 py-2.5 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ focusRingColor: '#0891b2' }}
              dir="rtl"
            />
          </div>

          {/* Camera/Mic or Send button */}
          {newMessage.trim() ? (
            <button
              onClick={handleSend}
              disabled={sending || !connected}
              className="p-2.5 rounded-full text-white transition-all flex-shrink-0 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
            >
              <SendIcon className="w-5 h-5" />
            </button>
          ) : (
            <div className="flex items-center gap-1 flex-shrink-0">
              <button 
                className="p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
                style={{ color: '#0891b2' }}
              >
                <CameraIcon className="w-5 h-5" />
              </button>
              <button 
                className="p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
                style={{ color: '#0891b2' }}
              >
                <MicIcon className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
