'use client';

import { InboxIcon, LeadsIcon, PipelineIcon, MoreIcon, TasksIcon } from './CRMIcons';

const tabs = [
  { id: 'inbox', label: 'Inbox', Icon: InboxIcon },
  { id: 'leads', label: 'לידים', Icon: LeadsIcon },
  { id: 'pipeline', label: 'Pipeline', Icon: PipelineIcon },
  { id: 'more', label: 'עוד', Icon: MoreIcon },
];

export default function CRMBottomNav({ activeTab, onTabChange, unreadCount = 0 }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-bottom z-50 md:hidden">
      <div className="flex items-center justify-around h-14">
        {tabs.map(({ id, label, Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`
                flex flex-col items-center justify-center flex-1 h-full
                transition-colors relative
                ${isActive ? '' : 'text-gray-500'}
              `}
              style={isActive ? { color: '#0891b2' } : {}}
            >
              <div className="relative">
                <Icon className={`w-6 h-6 ${isActive ? '' : 'opacity-70'}`} />
                {id === 'inbox' && unreadCount > 0 && (
                  <span 
                    className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-white text-[10px] font-bold flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-0.5 font-medium ${isActive ? 'font-semibold' : ''}`}>
                {label}
              </span>
              {isActive && (
                <div 
                  className="absolute top-0 left-1/2 transform -translate-x-1/2 w-12 h-0.5 rounded-full"
                  style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
