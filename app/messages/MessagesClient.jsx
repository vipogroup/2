'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import Link from 'next/link';
import { useAdminMessageTargets } from './hooks/useAdminMessageTargets';

const ROLE_LABELS = {
  admin: 'מנהל',
  super_admin: 'מנהל ראשי',
  business_admin: 'מנהל עסק',
  agent: 'סוכן',
  customer: 'לקוח',
  all: 'כולם',
};

const ADMIN_TARGET_OPTIONS = [
  { value: 'all', label: 'הודעה לכל המשתמשים' },
  { value: 'admin', label: 'מנהלים בלבד' },
  { value: 'agent', label: 'סוכנים בלבד' },
  { value: 'customer', label: 'לקוחות בלבד' },
  { value: 'direct', label: 'הודעה ישירה למשתמש ספציפי' },
];

function formatTime(ts) {
  if (!ts) return '';
  const date = new Date(ts);
  return date.toLocaleTimeString('he-IL', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(ts) {
  if (!ts) return '';
  const date = new Date(ts);
  return `${date.toLocaleDateString('he-IL')} ${date.toLocaleTimeString('he-IL', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

function MessageBubble({ message, isOutgoing, currentUser }) {
  const isRead = (message.readBy || []).some(
    (r) => r.userId !== currentUser?.id
  );

  return (
    <div className={`flex ${isOutgoing ? 'justify-start' : 'justify-end'} mb-2 px-3`}>
      <div
        className={`
          max-w-[75%] rounded-2xl px-3 py-1.5 shadow-sm
          ${isOutgoing
            ? 'bg-white text-gray-900 rounded-br-sm'
            : 'rounded-bl-sm text-white'
          }
        `}
        style={!isOutgoing ? { background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' } : {}}
      >
        <div className="flex items-end gap-2">
          <p className="text-sm break-words whitespace-pre-wrap flex-1">{message.message}</p>
          <span className={`text-[10px] flex-shrink-0 ${isOutgoing ? 'text-gray-400' : 'text-cyan-100'}`}>
            {formatTime(message.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function MessagesClient({ currentUser }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [messageText, setMessageText] = useState('');
  const [targetRole, setTargetRole] = useState('all');
  const [targetUserId, setTargetUserId] = useState('');
  const [limit, setLimit] = useState(50);
  const [replyContext, setReplyContext] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';
  const isBusinessAdmin = currentUser?.role === 'business_admin';
  const canManageMessages = isAdmin || isBusinessAdmin;
  const hasTenant = !!currentUser?.tenantId;
  const [userTarget, setUserTarget] = useState('business_admin');
  const { targets: knownTargets, activeTarget } = useAdminMessageTargets(
    messages,
    targetRole,
    targetUserId.trim() || null,
  );

  const fetchMessages = useCallback(async (opts = {}) => {
    const { showLoader = true } = opts;
    if (showLoader) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError('');
    if (!showLoader) {
      setReplyContext((prev) => prev);
    }
    try {
      const params = new URLSearchParams();
      params.set('limit', String(limit));
      if (canManageMessages && targetRole === 'direct' && targetUserId.trim()) {
        params.set('userId', targetUserId.trim());
      }

      const res = await fetch(`/api/messages?${params.toString()}`, { cache: 'no-store' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'שגיאה בטעינת ההודעות');
      }
      const data = await res.json();
      setMessages(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      setError(err.message || 'שגיאה בטעינה');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [canManageMessages, limit, targetRole, targetUserId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Auto-refresh messages every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchMessages({ showLoader: false });
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  // Mark all messages as read when entering the messages page
  useEffect(() => {
    const markAllAsRead = async () => {
      try {
        await fetch('/api/messages/read-all', { method: 'POST' });
      } catch (_) {
        // ignore errors
      }
    };
    markAllAsRead();
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError('');
    const text = messageText.trim();
    if (!text) {
      setError('נא להזין תוכן להודעה');
      return;
    }
    if (text.length > 2000) {
      setError('ההודעה חורגת מהמגבלה (2000 תווים)');
      return;
    }

    try {
      const payload = { message: text };
      if (canManageMessages) {
        if (targetRole === 'direct') {
          const trimmed = targetUserId.trim();
          if (!trimmed) {
            setError('נא לציין מזהה משתמש עבור הודעה ישירה');
            return;
          }
          payload.targetRole = 'direct';
          payload.targetUserId = trimmed;
        } else {
          payload.targetRole = targetRole;
        }
      } else if (hasTenant) {
        payload.targetRole = userTarget;
      }

      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'שליחת ההודעה נכשלה');
      }

      const data = await res.json();
      setMessages((prev) => (data.item ? [data.item, ...prev] : prev));
      setMessageText('');
      if (canManageMessages && targetRole === 'direct' && !replyContext) setTargetUserId('');
    } catch (err) {
      setError(err.message || 'שליחת ההודעה נכשלה');
    }
  }, [canManageMessages, messageText, targetRole, targetUserId, replyContext, hasTenant, userTarget]);

  const resolvedTargetRole = useMemo(() => {
    if (!canManageMessages) return isBusinessAdmin ? 'לקוחות העסק' : 'admin';
    if (targetRole === 'direct') {
      if (replyContext?.userId) {
        return `מענה אל ${ROLE_LABELS[replyContext.role] || replyContext.role} (${replyContext.userId})`;
      }
      return targetUserId.trim() ? `משתמש ${targetUserId.trim()}` : 'הודעה ישירה';
    }
    return ROLE_LABELS[targetRole] || targetRole;
  }, [canManageMessages, isBusinessAdmin, targetRole, targetUserId, replyContext]);

  const canSend = messageText.trim().length > 0 && (!canManageMessages || targetRole !== 'direct' || targetUserId.trim());

  const handleReply = useCallback(
    (item) => {
      if (!canManageMessages) return;
      const directTargetId = item.senderRole === 'admin' ? item.targetUserId : item.senderId;
      const directTargetRole = item.senderRole === 'admin' ? item.targetRole : item.senderRole;
      if (!directTargetId) {
        setTargetRole('admin');
        setTargetUserId('');
        setReplyContext(null);
        return;
      }
      setTargetRole('direct');
      setTargetUserId(String(directTargetId));
      setReplyContext({
        userId: String(directTargetId),
        role: directTargetRole,
      });
    },
    [canManageMessages],
  );

  const clearReplyContext = useCallback(() => {
    setReplyContext(null);
    setTargetUserId('');
    setTargetRole('all');
  }, []);

  const handleDelete = useCallback(
    async (messageId) => {
      if (!messageId) return;
      const confirmDelete = window.confirm('האם למחוק את ההודעה הזו? הפעולה אינה ניתנת לשחזור.');
      if (!confirmDelete) return;

      setDeletingId(messageId);
      setError('');
      try {
        const res = await fetch(`/api/messages/${messageId}`, {
          method: 'DELETE',
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'מחיקת ההודעה נכשלה');
        }
        setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
      } catch (err) {
        setError(err.message || 'מחיקת ההודעה נכשלה');
      } finally {
        setDeletingId(null);
      }
    },
    [],
  );

  const messagesEndRef = useRef(null);
  const sortedMessages = useMemo(() => {
    return [...messages].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sortedMessages]);

  // For non-admin users: simple chat view
  if (!canManageMessages) {
    return (
      <div className="flex flex-col bg-gray-100 overflow-hidden" style={{ height: '100dvh', maxHeight: '-webkit-fill-available', position: 'fixed', inset: 0, zIndex: 50 }}>
        {/* Chat Header */}
        <header
          className="flex items-center gap-3 px-4 py-3 shadow-sm"
          style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
        >
          <Link href="/shop" className="text-white/80 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div className="flex-1">
            <h1 className="text-white font-semibold">שירות לקוחות</h1>
            <p className="text-white/70 text-xs">
              {hasTenant
                ? (userTarget === 'admin' ? 'שליחה למנהל ראשי' : 'שליחה למנהל החנות')
                : 'שלח הודעה ונחזור אליך בהקדם'}
            </p>
          </div>
        </header>

        {/* Messages Area */}
        <div
          className="flex-1 overflow-y-auto flex flex-col"
          style={{ background: 'linear-gradient(180deg, rgba(30, 58, 138, 0.08) 0%, rgba(8, 145, 178, 0.12) 100%)' }}
        >
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500 text-sm">טוען הודעות...</div>
            </div>
          ) : sortedMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-sm">אין הודעות עדיין</p>
              <p className="text-xs mt-1">שלח הודעה כדי להתחיל שיחה</p>
            </div>
          ) : (
            <>
              <div className="flex-1" />
              <div className="py-4">
                {sortedMessages.map((item) => {
                  const isOutgoing = currentUser?.id && item.senderId
                    ? String(item.senderId) === String(currentUser.id)
                    : false;
                  return (
                    <MessageBubble
                      key={item.id}
                      message={item}
                      isOutgoing={isOutgoing}
                      currentUser={currentUser}
                    />
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </>
          )}
        </div>

        {/* Target Selector for tenant users */}
        {hasTenant && (
          <div className="bg-white border-t px-3 py-1.5 flex items-center gap-2">
            <span className="text-xs text-gray-500">שלח אל:</span>
            <button
              type="button"
              onClick={() => setUserTarget('business_admin')}
              className={`text-xs px-3 py-1 rounded-full transition-all ${
                userTarget === 'business_admin'
                  ? 'text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={userTarget === 'business_admin' ? { background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' } : {}}
            >
              <svg className="w-3 h-3 inline-block ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              מנהל החנות
            </button>
            <button
              type="button"
              onClick={() => setUserTarget('admin')}
              className={`text-xs px-3 py-1 rounded-full transition-all ${
                userTarget === 'admin'
                  ? 'text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={userTarget === 'admin' ? { background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' } : {}}
            >
              <svg className="w-3 h-3 inline-block ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              מנהל ראשי
            </button>
          </div>
        )}

        {/* Input Area - WhatsApp Style */}
        <form onSubmit={handleSubmit} className="bg-gray-100 px-2 py-1.5 flex items-center gap-2">
          <div className="flex-1">
            <input
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (canSend) handleSubmit(e);
                }
              }}
              maxLength={2000}
              className="w-full text-sm bg-white rounded-full px-4 py-2 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              placeholder="הודעה"
              style={{ height: '36px' }}
            />
          </div>
          <button
            type="submit"
            disabled={!canSend}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
          >
            <svg className="w-4 h-4 scale-x-[-1]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </form>
        {error && (
          <div className="bg-red-50 text-red-600 text-xs px-4 py-2 text-center">{error}</div>
        )}
      </div>
    );
  }

  // For admin/business_admin: full management view with chat style
  return (
    <div className="flex flex-col bg-gray-100 overflow-hidden" style={{ height: '100dvh', maxHeight: '-webkit-fill-available', position: 'fixed', inset: 0, zIndex: 50 }}>
      {/* Admin Header */}
      <header
        className="flex items-center gap-3 px-4 py-3 shadow-sm"
        style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
      >
        <Link href={isBusinessAdmin ? '/business' : '/admin'} className="text-white/80 hover:text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-white font-semibold">מרכז הודעות</h1>
          <p className="text-white/70 text-xs">
            {replyContext
              ? `מענה ל${ROLE_LABELS[replyContext.role] || replyContext.role}`
              : `שליחה אל: ${resolvedTargetRole}`}
          </p>
        </div>
        <button
          onClick={() => fetchMessages({ showLoader: false })}
          className="text-white/80 hover:text-white p-2"
        >
          <svg className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </header>

      {/* Target Selection Bar */}
      <div className="bg-white border-b px-4 py-2 flex items-center gap-2 flex-wrap">
        <select
          value={targetRole}
          onChange={(e) => {
            setTargetRole(e.target.value);
            if (e.target.value !== 'direct') {
              setReplyContext(null);
              setTargetUserId('');
            }
          }}
          className="text-xs border rounded-full px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        >
          {ADMIN_TARGET_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        {targetRole === 'direct' && (
          <input
            value={targetUserId}
            onChange={(e) => setTargetUserId(e.target.value)}
            placeholder="מזהה משתמש..."
            className="text-xs border rounded-full px-3 py-1.5 w-32 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        )}
        {replyContext && (
          <button
            onClick={clearReplyContext}
            className="text-xs px-2 py-1 rounded-full bg-red-50 text-red-600 hover:bg-red-100"
          >
            בטל מענה
          </button>
        )}
        {knownTargets.length > 0 && targetRole === 'direct' && (
          <div className="flex gap-1 flex-wrap">
            {knownTargets.slice(0, 5).map((t) => (
              <button
                key={t.userId}
                onClick={() => {
                  setTargetUserId(t.userId);
                  setReplyContext({ userId: t.userId, role: t.role });
                }}
                className={`text-[10px] px-2 py-1 rounded-full ${
                  t.userId === targetUserId ? 'bg-cyan-100 text-cyan-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div
        className="flex-1 overflow-y-auto flex flex-col"
        style={{ background: 'linear-gradient(180deg, rgba(30, 58, 138, 0.08) 0%, rgba(8, 145, 178, 0.12) 100%)' }}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500 text-sm">טוען הודעות...</div>
          </div>
        ) : sortedMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-sm">אין הודעות להצגה</p>
          </div>
        ) : (
          <>
            <div className="flex-1" />
            <div className="py-4">
              {sortedMessages.map((item) => {
                const isOutgoing = currentUser?.id && item.senderId
                  ? String(item.senderId) === String(currentUser.id)
                  : false;
                return (
                  <div key={item.id} className="group relative">
                    <MessageBubble
                      message={item}
                      isOutgoing={isOutgoing}
                      currentUser={currentUser}
                    />
                    {/* Admin actions on hover */}
                    <div className="absolute top-1 left-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      {(item.senderRole !== currentUser?.role || item.targetUserId) && (
                        <button
                          onClick={() => handleReply(item)}
                          className="text-[10px] px-2 py-0.5 rounded bg-white/90 text-cyan-700 shadow-sm hover:bg-white"
                        >
                          השב
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={deletingId === item.id}
                        className="text-[10px] px-2 py-0.5 rounded bg-white/90 text-red-600 shadow-sm hover:bg-white disabled:opacity-50"
                      >
                        {deletingId === item.id ? '...' : 'מחק'}
                      </button>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </>
        )}
      </div>

      {/* Input Area - WhatsApp Style */}
      <form onSubmit={handleSubmit} className="bg-gray-100 px-2 py-1.5 flex items-center gap-2">
        <div className="flex-1">
          <input
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (canSend) handleSubmit(e);
              }
            }}
            maxLength={2000}
            className="w-full text-sm bg-white rounded-full px-4 py-2 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            placeholder="הודעה"
            style={{ height: '36px' }}
          />
        </div>
        <button
          type="submit"
          disabled={!canSend}
          className="w-9 h-9 rounded-full flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
        >
          <svg className="w-4 h-4 scale-x-[-1]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </form>
      {error && (
        <div className="bg-red-50 text-red-600 text-xs px-4 py-2 text-center">{error}</div>
      )}
    </div>
  );
}
