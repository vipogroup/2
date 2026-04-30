'use client';

import { useState } from 'react';
import NotificationsManagerClient from '../notifications/NotificationsManagerClient';
import MarketingAssetsClient from '../marketing-assets/MarketingAssetsClient';
import SettingsForm from '@/components/admin/SettingsForm';
import SiteTextsPage from '../site-texts/page';
import AdminBrandingPage from '../branding/page';
import BotManagerPage from '../bot-manager/page';

// ─── SVG Icon Components ─────────────────────────────────────
const BellIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);

const MegaphoneIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
  </svg>
);

const GearIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const TextIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const PaletteIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
  </svg>
);

const BotIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
  </svg>
);

// ─── Tab definitions ─────────────────────────────────────────
const TABS = [
  { id: 'notifications', label: 'התראות', icon: BellIcon },
  { id: 'marketing', label: 'שיווק', icon: MegaphoneIcon },
  { id: 'settings', label: 'הגדרות', icon: GearIcon },
  { id: 'texts', label: 'ניהול טקסטים', icon: TextIcon },
  { id: 'branding', label: 'ניהול צבעים', icon: PaletteIcon },
  { id: 'bot', label: 'בוט צאט', icon: BotIcon },
];

export default function SettingsHubClient() {
  const [activeTab, setActiveTab] = useState('notifications');

  return (
    <div style={{ background: '#f8fafc', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

      {/* Header bar */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #e2e8f0',
        padding: '10px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <GearIcon className="w-5 h-5" style={{ color: '#1e3a8a' }} />
          <h1 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>מרכז הגדרות</h1>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>התראות, שיווק, הגדרות כלליות, טקסטים, צבעים וניהול בוט</span>
        </div>
      </div>

      {/* Content area */}
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 12px' }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>

          {/* Tabs */}
          <div style={{ borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto' }}>
            {TABS.map(tab => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px',
                    fontSize: 12.5, fontWeight: isActive ? 600 : 500,
                    color: isActive ? '#6366f1' : '#64748b',
                    background: 'none', border: 'none',
                    borderBottom: `2px solid ${isActive ? '#6366f1' : 'transparent'}`,
                    cursor: 'pointer', transition: 'all 150ms',
                    fontFamily: 'inherit', whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => { if (!isActive) { e.currentTarget.style.color = '#0f172a'; e.currentTarget.style.background = '#f1f5f9'; } }}
                  onMouseLeave={e => { if (!isActive) { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = 'none'; } }}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Panels */}
          <div>
            {activeTab === 'notifications' && (
              <div style={{ padding: 0 }}>
                <NotificationsManagerClient embedded={true} />
              </div>
            )}

            {activeTab === 'marketing' && (
              <div style={{ padding: 0 }}>
                <MarketingAssetsClient embedded={true} />
              </div>
            )}

            {activeTab === 'settings' && (
              <div style={{ padding: 0 }}>
                <SettingsForm embedded={true} />
              </div>
            )}

            {activeTab === 'texts' && (
              <div style={{ padding: 0 }}>
                <SiteTextsPage embedded={true} />
              </div>
            )}

            {activeTab === 'branding' && (
              <div style={{ padding: 0 }}>
                <AdminBrandingPage embedded={true} />
              </div>
            )}

            {activeTab === 'bot' && (
              <div style={{ padding: 0 }}>
                <BotManagerPage embedded={true} />
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
