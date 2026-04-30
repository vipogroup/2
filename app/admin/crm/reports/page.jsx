'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const SOURCE_LABELS = {
  website: 'אתר',
  whatsapp: 'וואטסאפ',
  phone: 'טלפון',
  referral: 'הפניה',
  agent: 'סוכן',
  manual: 'ידני',
  facebook: 'פייסבוק',
  instagram: 'אינסטגרם',
  google: 'גוגל',
  other: 'אחר',
};

const STAGE_LABELS = {
  lead: 'ליד חדש',
  contact: 'יצירת קשר',
  meeting: 'פגישה',
  proposal: 'הצעת מחיר',
  negotiation: 'משא ומתן',
  won: 'נסגר בהצלחה',
  lost: 'אבוד',
};

export default function CrmReportsPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30');

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/crm/stats?period=${period}`);
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <main className="min-h-screen bg-white p-6 flex items-center justify-center">
        <div className="text-gray-500">טוען נתונים...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white p-3 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/crm" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <h1
              className="text-xl sm:text-2xl md:text-3xl font-bold"
              style={{
                background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              דוחות CRM
            </h1>
          </div>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="7">7 ימים</option>
            <option value="30">30 ימים</option>
            <option value="90">90 ימים</option>
            <option value="365">שנה</option>
          </select>
        </div>

        {/* Main Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'סה"כ לידים', value: stats?.leads?.total || 0, icon: 'U' },
            { label: 'לידים חדשים', value: stats?.leads?.new || 0, icon: '+' },
            { label: 'שיעור המרה', value: `${stats?.leads?.conversionRate || 0}%`, icon: '%' },
            { label: 'ערך פיפליין', value: `₪${(stats?.pipeline?.totalValue || 0).toLocaleString()}`, icon: '$' },
          ].map((stat, i) => (
            <div
              key={i}
              className="rounded-xl p-4 shadow-md"
              style={{
                border: '2px solid transparent',
                backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)',
                backgroundOrigin: 'border-box',
                backgroundClip: 'padding-box, border-box',
              }}
            >
              <div className="text-2xl mb-2">{stat.icon}</div>
              <div className="text-sm text-gray-500">{stat.label}</div>
              <div className="text-2xl font-bold" style={{ color: '#1e3a8a' }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Leads by Source */}
          <div
            className="rounded-xl p-4 shadow-md"
            style={{
              border: '2px solid transparent',
              backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)',
              backgroundOrigin: 'border-box',
              backgroundClip: 'padding-box, border-box',
            }}
          >
            <h3 className="font-semibold mb-4" style={{ color: '#1e3a8a' }}>לידים לפי מקור</h3>
            <div className="space-y-3">
              {Object.entries(stats?.leads?.bySource || {}).map(([source, count]) => {
                const total = stats?.leads?.total || 1;
                const percentage = ((count / total) * 100).toFixed(0);
                return (
                  <div key={source}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{SOURCE_LABELS[source] || source}</span>
                      <span className="text-gray-500">{count} ({percentage}%)</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${percentage}%`,
                          background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
              {Object.keys(stats?.leads?.bySource || {}).length === 0 && (
                <div className="text-gray-400 text-center py-4">אין נתונים</div>
              )}
            </div>
          </div>

          {/* Leads by Stage */}
          <div
            className="rounded-xl p-4 shadow-md"
            style={{
              border: '2px solid transparent',
              backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)',
              backgroundOrigin: 'border-box',
              backgroundClip: 'padding-box, border-box',
            }}
          >
            <h3 className="font-semibold mb-4" style={{ color: '#1e3a8a' }}>לידים לפי שלב</h3>
            <div className="space-y-3">
              {Object.entries(stats?.leads?.byStage || {}).map(([stage, count]) => {
                const total = stats?.leads?.total || 1;
                const percentage = ((count / total) * 100).toFixed(0);
                return (
                  <div key={stage}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{STAGE_LABELS[stage] || stage}</span>
                      <span className="text-gray-500">{count} ({percentage}%)</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${percentage}%`,
                          background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
              {Object.keys(stats?.leads?.byStage || {}).length === 0 && (
                <div className="text-gray-400 text-center py-4">אין נתונים</div>
              )}
            </div>
          </div>
        </div>

        {/* Tasks Stats */}
        <div
          className="rounded-xl p-4 shadow-md"
          style={{
            border: '2px solid transparent',
            backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)',
            backgroundOrigin: 'border-box',
            backgroundClip: 'padding-box, border-box',
          }}
        >
          <h3 className="font-semibold mb-4" style={{ color: '#1e3a8a' }}>משימות</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold" style={{ color: '#1e3a8a' }}>{stats?.tasks?.total || 0}</div>
              <div className="text-sm text-gray-500">סה״כ</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{stats?.tasks?.completed || 0}</div>
              <div className="text-sm text-gray-500">הושלמו</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-500">{stats?.tasks?.overdue || 0}</div>
              <div className="text-sm text-gray-500">באיחור</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold" style={{ color: '#0891b2' }}>{stats?.tasks?.completionRate || 0}%</div>
              <div className="text-sm text-gray-500">שיעור השלמה</div>
            </div>
          </div>
        </div>

        {/* Segment Distribution */}
        <div
          className="rounded-xl p-4 shadow-md"
          style={{
            border: '2px solid transparent',
            backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)',
            backgroundOrigin: 'border-box',
            backgroundClip: 'padding-box, border-box',
          }}
        >
          <h3 className="font-semibold mb-4" style={{ color: '#1e3a8a' }}>סגמנטציית לקוחות</h3>
          <div className="grid grid-cols-4 gap-4 text-center">
            {[
              { key: 'cold', label: 'קרים', color: '#3b82f6' },
              { key: 'warm', label: 'חמימים', color: '#f59e0b' },
              { key: 'hot', label: 'חמים', color: '#ef4444' },
              { key: 'vip', label: 'VIP', color: '#8b5cf6' },
            ].map((seg) => (
              <div key={seg.key}>
                <div className="text-3xl font-bold" style={{ color: seg.color }}>
                  {stats?.leads?.bySegment?.[seg.key] || 0}
                </div>
                <div className="text-sm text-gray-500">{seg.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
