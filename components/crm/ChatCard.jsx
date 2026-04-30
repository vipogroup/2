'use client';

import { DoubleCheckIcon, CheckIcon, StarIcon } from './CRMIcons';

const formatTime = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  
  if (isToday) {
    return date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  }
  
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return 'אתמול';
  }
  
  return date.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' });
};

const getStatusBadge = (status) => {
  const badges = {
    new: { label: 'חדשה', color: 'bg-green-500' },
    contacted: { label: 'נערד', color: 'bg-blue-500' },
    qualified: { label: 'מתאים', color: 'bg-purple-500' },
    proposal: { label: 'הצעה', color: 'bg-orange-500' },
    won: { label: 'נסגר', color: 'bg-green-600' },
    lost: { label: 'אבד', color: 'bg-gray-500' },
  };
  return badges[status] || badges.new;
};

export default function ChatCard({ 
  conversation, 
  isSelected, 
  onClick,
  lead,
  isVIP = false,
}) {
  const { phone, lastMessage, unread, name } = conversation;
  const displayName = lead?.name || name || formatPhone(phone);
  const status = lead?.status || 'new';
  const badge = getStatusBadge(status);
  
  function formatPhone(phone) {
    if (!phone) return '';
    if (phone.startsWith('972')) {
      return '0' + phone.substring(3);
    }
    return phone;
  }

  const isRead = lastMessage?.status === 'read';
  const isOutgoing = lastMessage?.type === 'outgoing';

  return (
    <div
      onClick={onClick}
      className={`
        flex items-center gap-3 p-3 cursor-pointer transition-all
        border-b border-gray-100
        ${isSelected ? 'bg-cyan-50' : 'hover:bg-gray-50 active:bg-gray-100'}
      `}
      style={isSelected ? { borderRightWidth: '4px', borderRightColor: '#0891b2' } : {}}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div 
          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm"
          style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
        >
          {displayName.substring(0, 2).toUpperCase()}
        </div>
        {/* Online indicator */}
        {conversation.isOnline && (
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Top row: Name + Time */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900 text-sm truncate">
              {displayName}
            </span>
            {isVIP && (
              <StarIcon className="w-4 h-4 text-yellow-500" filled />
            )}
          </div>
          <span className="text-xs text-gray-500 flex-shrink-0">
            {formatTime(lastMessage?.timestamp)}
          </span>
        </div>

        {/* Middle row: Status badge */}
        <div className="flex items-center gap-2 mb-1">
          <span className={`${badge.color} text-white text-xs px-2 py-0.5 rounded-full`}>
            {badge.label}
          </span>
          {lead?.source && (
            <span className="text-xs text-gray-400">{lead.source}</span>
          )}
        </div>

        {/* Bottom row: Last message + Unread count */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500 truncate flex items-center gap-1">
            {isOutgoing && (
              <span className={isRead ? 'text-cyan-500' : 'text-gray-400'}>
                {isRead ? <DoubleCheckIcon className="w-3.5 h-3.5" /> : <CheckIcon className="w-3.5 h-3.5" />}
              </span>
            )}
            <span className="truncate">
              {lastMessage?.message || '[מדיה]'}
            </span>
          </p>
          
          {unread > 0 && (
            <span 
              className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full text-white text-xs font-bold flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
            >
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
