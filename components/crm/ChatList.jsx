'use client';

import { useState } from 'react';
import { SearchIcon, PlusIcon, RefreshIcon, StarIcon } from './CRMIcons';
import ChatCard from './ChatCard';

const filters = [
  { id: 'all', label: 'כל ההודעות', count: null },
  { id: 'new', label: 'חדש', count: null, color: 'bg-green-500' },
  { id: 'vip', label: 'VIP', count: null, icon: StarIcon },
];

export default function ChatList({
  conversations = [],
  leads = [],
  selectedPhone,
  onSelectConversation,
  onRefresh,
  loading = false,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  // Get lead by phone
  const getLeadByPhone = (phone) => {
    return leads.find(l => 
      l.phone === phone || 
      l.phone === formatPhone(phone) ||
      phone?.includes(l.phone?.replace(/\D/g, ''))
    );
  };

  function formatPhone(phone) {
    if (!phone) return '';
    if (phone.startsWith('972')) {
      return '0' + phone.substring(3);
    }
    return phone;
  }

  // Filter conversations
  const filteredConversations = conversations.filter(conv => {
    // Search filter
    if (searchQuery) {
      const lead = getLeadByPhone(conv.phone);
      const searchLower = searchQuery.toLowerCase();
      const matchesPhone = conv.phone?.includes(searchQuery);
      const matchesName = lead?.name?.toLowerCase().includes(searchLower);
      if (!matchesPhone && !matchesName) return false;
    }

    // Status filter
    if (activeFilter === 'new') {
      const lead = getLeadByPhone(conv.phone);
      return lead?.status === 'new' || conv.unread > 0;
    }
    if (activeFilter === 'vip') {
      const lead = getLeadByPhone(conv.phone);
      return lead?.tags?.includes('VIP');
    }

    return true;
  });

  // Count unread
  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread || 0), 0);
  const newCount = conversations.filter(c => {
    const lead = getLeadByPhone(c.phone);
    return lead?.status === 'new' || c.unread > 0;
  }).length;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-3 border-b border-gray-200">
        {/* Search */}
        <div className="relative mb-3">
          <SearchIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="חיפוש..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-10 py-2.5 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2"
            style={{ focusRingColor: '#0891b2' }}
            dir="rtl"
          />
          <button 
            onClick={onRefresh}
            disabled={loading}
            className="absolute left-2 top-1/2 transform -translate-y-1/2 p-1 rounded-full hover:bg-gray-200 transition-colors"
          >
            <PlusIcon className={`w-5 h-5 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {filters.map(filter => {
            const isActive = activeFilter === filter.id;
            const count = filter.id === 'new' ? newCount : filter.id === 'all' ? conversations.length : null;
            
            return (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                  whitespace-nowrap transition-all flex-shrink-0
                  ${isActive 
                    ? 'text-white shadow-md' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }
                `}
                style={isActive ? { background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' } : {}}
              >
                {filter.icon && <filter.icon className="w-3.5 h-3.5" filled={isActive} />}
                {filter.label}
                {count !== null && count > 0 && (
                  <span className={`
                    min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold
                    flex items-center justify-center
                    ${isActive ? 'bg-white/20 text-white' : 'bg-gray-300 text-gray-600'}
                  `}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Refresh indicator */}
      {loading && (
        <div className="flex items-center justify-center py-2 bg-cyan-50">
          <RefreshIcon className="w-4 h-4 text-cyan-600 animate-spin" />
          <span className="text-xs text-cyan-600 mr-2">מרענן...</span>
        </div>
      )}

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 p-4">
            <svg className="w-16 h-16 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-sm">אין שיחות</p>
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="mt-2 text-xs text-cyan-600 hover:underline"
              >
                נקה חיפוש
              </button>
            )}
          </div>
        ) : (
          filteredConversations.map((conv, idx) => {
            const lead = getLeadByPhone(conv.phone);
            return (
              <ChatCard
                key={conv.phone || idx}
                conversation={conv}
                lead={lead}
                isSelected={selectedPhone === conv.phone}
                isVIP={lead?.tags?.includes('VIP')}
                onClick={() => onSelectConversation(conv)}
              />
            );
          })
        )}
      </div>

      {/* Total count footer */}
      {filteredConversations.length > 0 && (
        <div className="px-3 py-2 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            {filteredConversations.length} שיחות
            {totalUnread > 0 && (
              <span className="mr-2 text-cyan-600 font-medium">
                ({totalUnread} לא נקראו)
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
