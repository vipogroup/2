'use client';

import { useState, useEffect, useCallback } from 'react';

const TABS = [
  { id: 'pending_approval', label: 'ממתין לאישור' },
  { id: 'published',        label: 'פורסם' },
  { id: 'failed',           label: 'נכשל' },
  { id: 'all',              label: 'הכל' },
];

const PLATFORM_LABELS = {
  facebook_page:         { label: 'Facebook', color: 'bg-blue-100 text-blue-800' },
  instagram_business:    { label: 'Instagram', color: 'bg-pink-100 text-pink-800' },
};

const KIND_LABELS = {
  product:               { label: 'מוצר', color: 'bg-green-100 text-green-800' },
  affiliate_recruitment: { label: 'גיוס שותפים', color: 'bg-purple-100 text-purple-800' },
  weekly_summary:        { label: 'סיכום שבועי', color: 'bg-yellow-100 text-yellow-800' },
  story:                 { label: 'Story', color: 'bg-orange-100 text-orange-800' },
};

const STATUS_LABELS = {
  pending_approval: { label: 'ממתין', color: 'bg-amber-100 text-amber-800' },
  published:        { label: 'פורסם', color: 'bg-green-100 text-green-800' },
  failed:           { label: 'נכשל', color: 'bg-red-100 text-red-800' },
  skipped:          { label: 'דולג', color: 'bg-gray-100 text-gray-600' },
};

function Badge({ label, color }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}

function PostCard({ post, onApprove, onReject, onDelete, actionLoading }) {
  const platform = PLATFORM_LABELS[post.platform] || { label: post.platform, color: 'bg-gray-100 text-gray-700' };
  const kind     = KIND_LABELS[post.postKind]   || { label: post.postKind,   color: 'bg-gray-100 text-gray-700' };
  const status   = STATUS_LABELS[post.status]   || { label: post.status,     color: 'bg-gray-100 text-gray-700' };
  const isPending = post.status === 'pending_approval';
  const loading   = actionLoading === post._id;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge label={platform.label} color={platform.color} />
        <Badge label={kind.label}     color={kind.color} />
        <Badge label={status.label}   color={status.color} />
        {post.productName && (
          <span className="text-xs text-gray-500 truncate max-w-[180px]" title={post.productName}>
            {post.productName}
          </span>
        )}
        <span className="text-xs text-gray-400 mr-auto">
          {post.createdAt ? new Date(post.createdAt).toLocaleString('he-IL') : ''}
        </span>
      </div>

      {post.imageUrl && (
        <img
          src={post.imageUrl}
          alt="תמונת פוסט"
          className="w-full max-h-48 object-cover rounded-lg border border-gray-100"
        />
      )}

      <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed line-clamp-5">
        {post.caption || '—'}
      </p>

      {post.hashtags?.length > 0 && (
        <p className="text-xs text-blue-500 truncate">{post.hashtags.join(' ')}</p>
      )}

      {post.errorMessage && (
        <p className="text-xs text-red-500 bg-red-50 rounded p-2">{post.errorMessage}</p>
      )}

      {post.analytics?.impressions > 0 && (
        <div className="flex gap-4 text-xs text-gray-500 border-t pt-2">
          <span>חשיפות: {post.analytics.impressions.toLocaleString()}</span>
          <span>הגעה: {post.analytics.reach.toLocaleString()}</span>
          <span>מעורבות: {post.analytics.engagement.toLocaleString()}</span>
          <span>קליקים: {post.analytics.clicks.toLocaleString()}</span>
        </div>
      )}

      <div className="flex gap-2 mt-1">
        {isPending && (
          <>
            <button
              onClick={() => onApprove(post._id)}
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition"
            >
              {loading ? '...' : 'אשר ופרסם'}
            </button>
            <button
              onClick={() => onReject(post._id)}
              disabled={loading}
              className="flex-1 bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-700 text-sm font-medium py-2 rounded-lg border border-red-200 transition"
            >
              {loading ? '...' : 'דחה'}
            </button>
          </>
        )}
        <button
          onClick={() => onDelete(post._id)}
          disabled={loading}
          className="px-3 bg-gray-50 hover:bg-gray-100 disabled:opacity-50 text-gray-500 text-sm rounded-lg border border-gray-200 transition"
          title="מחק רשומה"
        >
          🗑
        </button>
      </div>
    </div>
  );
}

export default function SocialPostsClient() {
  const [activeTab, setActiveTab]       = useState('pending_approval');
  const [posts, setPosts]               = useState([]);
  const [total, setTotal]               = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [page, setPage]                 = useState(1);
  const [loading, setLoading]           = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError]               = useState('');
  const LIMIT = 12;

  const fetchPosts = useCallback(async (tab, pg) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/social-posts?status=${tab}&limit=${LIMIT}&page=${pg}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'שגיאה בטעינת פוסטים');
      setPosts(data.posts || []);
      setTotal(data.total || 0);
      setPendingCount(data.pendingCount || 0);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    fetchPosts(activeTab, 1);
  }, [activeTab, fetchPosts]);

  useEffect(() => {
    fetchPosts(activeTab, page);
  }, [page, activeTab, fetchPosts]);

  async function handleAction(id, action, reason = '') {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/social-posts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'שגיאה');
      fetchPosts(activeTab, page);
    } catch (e) {
      alert(e.message);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(id) {
    if (!confirm('למחוק את הרשומה?')) return;
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/social-posts/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'שגיאה');
      fetchPosts(activeTab, page);
    } catch (e) {
      alert(e.message);
    } finally {
      setActionLoading(null);
    }
  }

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8" dir="rtl">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ניהול פרסומים ברשתות חברתיות</h1>
            <p className="text-sm text-gray-500 mt-1">אישור, דחייה ומעקב אחר פוסטים שנוצרו על ידי ה-AI</p>
          </div>
          {pendingCount > 0 && (
            <span className="bg-amber-500 text-white text-sm font-bold px-4 py-1.5 rounded-full shadow">
              {pendingCount} ממתינים לאישור
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 mb-6 w-fit shadow-sm flex-wrap">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
              {tab.id === 'pending_approval' && pendingCount > 0 && (
                <span className="mr-1.5 bg-amber-400 text-white text-xs rounded-full px-1.5">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-4 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg">אין פוסטים להצגה</p>
            <p className="text-sm mt-1">הסוכן יצור פוסטים בהתאם ללוח הזמנים היומי</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {posts.map((post) => (
              <PostCard
                key={post._id}
                post={post}
                onApprove={(id) => handleAction(id, 'approve')}
                onReject={(id) => handleAction(id, 'reject', 'rejected_by_admin')}
                onDelete={handleDelete}
                actionLoading={actionLoading}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm disabled:opacity-40 hover:bg-gray-50"
            >
              הקודם
            </button>
            <span className="text-sm text-gray-600">
              עמוד {page} מתוך {totalPages} ({total} סה״כ)
            </span>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm disabled:opacity-40 hover:bg-gray-50"
            >
              הבא
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
