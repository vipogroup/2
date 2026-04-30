'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const ROLE_LABELS = {
  admin: { label: 'מנהל', color: 'bg-red-100 text-red-800' },
  super_admin: { label: 'מנהל ראשי', color: 'bg-cyan-100 text-cyan-800' },
  business_admin: { label: 'מנהל עסק', color: 'bg-orange-100 text-orange-800' },
  agent: { label: 'סוכן', color: 'bg-cyan-100 text-cyan-800' },
  customer: { label: 'לקוח', color: 'bg-blue-100 text-blue-800' },
};

const ALL_ROLE_OPTIONS = [
  { value: 'customer', label: 'לקוח' },
  { value: 'agent', label: 'סוכן' },
  { value: 'business_admin', label: 'מנהל עסק' },
  { value: 'admin', label: 'מנהל' },
];

const BUSINESS_ADMIN_ROLE_OPTIONS = [
  { value: 'customer', label: 'לקוח' },
  { value: 'agent', label: 'סוכן' },
];

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [referredUsers, setReferredUsers] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  const [actionLoading, setActionLoading] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isBusinessAdmin, setIsBusinessAdmin] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    if (!params?.id) return;
    
    async function loadData() {
      setLoading(true);
      try {
        // Load user data
        const res = await fetch(`/api/users/${params.id}`, { credentials: 'include' });
        const json = await res.json();
        
        if (!res.ok) {
          throw new Error(json.error || 'Failed to load user');
        }
        
        setUser(json.user);

        // Load user's orders
        const ordersRes = await fetch(`/api/orders?userId=${params.id}`, { credentials: 'include' });
        const ordersJson = await ordersRes.json();
        if (ordersRes.ok) {
          setOrders(ordersJson.orders || []);
        }

        // Load agent-specific data
        if (json.user?.role === 'agent') {
          // Load referred users (customers this agent referred)
          const referredRes = await fetch(`/api/users?referredBy=${params.id}`, { credentials: 'include' });
          const referredJson = await referredRes.json();
          if (referredRes.ok) {
            setReferredUsers(referredJson.users || []);
          }

          // Load commissions
          const commissionsRes = await fetch(`/api/admin/commissions?agentId=${params.id}`, { credentials: 'include' });
          const commissionsJson = await commissionsRes.json();
          if (commissionsRes.ok) {
            setCommissions(commissionsJson.commissions || []);
          }
        }

        // Get current user ID and role
        const meRes = await fetch('/api/auth/me', { credentials: 'include' });
        const meJson = await meRes.json();
        if (meRes.ok && meJson.user) {
          setCurrentUserId(meJson.user._id || meJson.user.id);
          setIsBusinessAdmin(meJson.user.role === 'business_admin');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [params?.id]);

  const isCurrentUser = user?._id === currentUserId;

  // Action handlers
  const handleToggleActive = async () => {
    if (!user) return;
    setActionLoading('toggle');
    try {
      const res = await fetch(`/api/users/${user._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      if (!res.ok) throw new Error('Failed to update user');
      setUser({ ...user, isActive: !user.isActive });
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRoleChange = async (newRole) => {
    if (!user) return;
    setActionLoading('role');
    try {
      const res = await fetch(`/api/users/${user._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) throw new Error('Failed to update role');
      setUser({ ...user, role: newRole });
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetPassword = async () => {
    if (!user) return;
    if (!confirm(`לאפס סיסמה עבור ${user.fullName || user.email}?`)) return;
    setActionLoading('reset');
    try {
      const res = await fetch(`/api/users/${user._id}/reset-password`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');
      alert(data.tempPassword ? `סיסמה זמנית: ${data.tempPassword}` : 'הסיסמה אופסה בהצלחה');
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    if (!confirm(`האם למחוק את המשתמש ${user.fullName || user.email}? פעולה זו בלתי הפיכה!`)) return;
    setActionLoading('delete');
    try {
      const res = await fetch(`/api/users/${user._id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete user');
      }
      router.push('/admin/users');
    } catch (err) {
      alert(err.message);
      setActionLoading(null);
    }
  };

  const startEditing = () => {
    setEditForm({
      fullName: user.fullName || '',
      email: user.email || '',
      phone: user.phone || '',
      address: user.address || '',
      city: user.city || '',
      zipCode: user.zipCode || '',
      vatId: user.vatId || '',
      companyName: user.companyName || '',
      commissionPercent: user.commissionPercent || 0,
      discountPercent: user.discountPercent || 0,
      couponCode: user.couponCode || '',
      paypalEmail: user.paypalEmail || '',
      preferredPayoutMethod: user.preferredPayoutMethod || 'bank',
      bankDetails: {
        bankName: user.bankDetails?.bankName || '',
        branchNumber: user.bankDetails?.branchNumber || '',
        accountNumber: user.bankDetails?.accountNumber || '',
        accountName: user.bankDetails?.accountName || '',
      },
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditForm({});
  };

  const handleSaveEdit = async () => {
    setActionLoading('save');
    try {
      const res = await fetch(`/api/users/${user._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(editForm),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save changes');
      }
      
      const { user: updatedUser } = await res.json();
      setUser({ ...user, ...updatedUser });
      setIsEditing(false);
      alert('השינויים נשמרו בהצלחה');
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const updateEditForm = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const updateBankDetails = (field, value) => {
    setEditForm(prev => ({
      ...prev,
      bankDetails: { ...prev.bankDetails, [field]: value }
    }));
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">טוען פרופיל...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-red-600 font-medium">{error}</p>
          <button 
            onClick={() => router.back()} 
            className="mt-4 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
          >
            חזרה
          </button>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const roleInfo = ROLE_LABELS[user.role] || ROLE_LABELS.customer;
  const isAgent = user.role === 'agent';

  // Define tabs based on user role
  const tabs = [
    { id: 'details', label: 'פרטים', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
    { id: 'orders', label: 'הזמנות', icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z', count: orders.length },
    ...(isAgent ? [
      { id: 'customers', label: 'לקוחות', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', count: referredUsers.length },
      { id: 'commissions', label: 'עמלות', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', count: commissions.length },
    ] : []),
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6" dir="rtl">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={() => router.back()}
            className="p-2 rounded-lg hover:bg-white transition-colors"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <h1
            className="text-2xl sm:text-3xl font-bold"
            style={{
              background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            פרופיל משתמש
          </h1>
        </div>

        {/* User Card with Actions */}
        <div 
          className="rounded-xl p-6 mb-6 bg-white"
          style={{
            border: '2px solid transparent',
            backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)',
            backgroundOrigin: 'border-box',
            backgroundClip: 'padding-box, border-box',
          }}
        >
          <div className="flex flex-col md:flex-row md:items-start gap-4">
            {/* User Info */}
            <div className="flex items-start gap-4 flex-1">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold shrink-0"
                style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
              >
                {user.fullName?.charAt(0) || '?'}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <h2 className="text-xl font-bold text-gray-900">{user.fullName || 'ללא שם'}</h2>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${roleInfo.color}`}>
                    {roleInfo.label}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {user.isActive !== false ? 'פעיל' : 'לא פעיל'}
                  </span>
                </div>
                
                <div className="text-sm text-gray-500 space-y-1">
                  <p>{user.email}</p>
                  {user.phone && <p>{user.phone}</p>}
                  {user.couponCode && (
                    <code className="px-2 py-0.5 bg-cyan-100 text-cyan-700 rounded text-xs font-bold">
                      קוד: {user.couponCode.toUpperCase()}
                    </code>
                  )}
                </div>
              </div>
            </div>

            {/* Actions Panel */}
            <div className="flex flex-col gap-2 md:w-48">
              {/* Role Change */}
              {!isCurrentUser && (
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">שנה תפקיד:</label>
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(e.target.value)}
                    disabled={actionLoading === 'role'}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-cyan-500"
                  >
                    {(isBusinessAdmin ? BUSINESS_ADMIN_ROLE_OPTIONS : ALL_ROLE_OPTIONS).map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 mt-2">
                {!isCurrentUser && (
                  <>
                    <button
                      onClick={handleToggleActive}
                      disabled={actionLoading === 'toggle'}
                      className="flex-1 min-w-[80px] px-3 py-2 text-sm rounded-lg transition-all"
                      style={{ 
                        background: user.isActive ? '#fef2f2' : '#f0fdf4',
                        color: user.isActive ? '#dc2626' : '#16a34a'
                      }}
                    >
                      {actionLoading === 'toggle' ? '...' : (user.isActive ? 'כבה' : 'הפעל')}
                    </button>
                    
                    <button
                      onClick={handleResetPassword}
                      disabled={actionLoading === 'reset'}
                      className="flex-1 min-w-[80px] px-3 py-2 text-sm rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all"
                    >
                      {actionLoading === 'reset' ? '...' : 'איפוס'}
                    </button>
                    
                    <button
                      onClick={handleDelete}
                      disabled={actionLoading === 'delete'}
                      className="flex-1 min-w-[80px] px-3 py-2 text-sm rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-all"
                    >
                      {actionLoading === 'delete' ? '...' : 'מחק'}
                    </button>
                  </>
                )}
                
                {user.phone && (
                  <a
                    href={`https://wa.me/972${user.phone.replace(/^0/, '').replace(/-/g, '')}?text=${encodeURIComponent(`שלום ${user.fullName || ''}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-[80px] px-3 py-2 text-sm rounded-lg text-white text-center transition-all"
                    style={{ background: '#25D366' }}
                  >
                    WhatsApp
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl overflow-hidden shadow-sm mb-6">
          <div className="flex border-b overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-all border-b-2 ${
                  activeTab === tab.id
                    ? 'border-cyan-500 text-cyan-600 bg-cyan-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                </svg>
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    activeTab === tab.id ? 'bg-cyan-100 text-cyan-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-4 sm:p-6">
            {/* Details Tab */}
            {activeTab === 'details' && (
              <div>
                {/* Edit/View Toggle Button */}
                {!isCurrentUser && (
                  <div className="flex justify-end mb-4">
                    {isEditing ? (
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveEdit}
                          disabled={actionLoading === 'save'}
                          className="px-4 py-2 text-sm rounded-lg text-white transition-all"
                          style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
                        >
                          {actionLoading === 'save' ? 'שומר...' : 'שמור שינויים'}
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="px-4 py-2 text-sm rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all"
                        >
                          ביטול
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={startEditing}
                        className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg text-white transition-all"
                        style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        ערוך פרטים
                      </button>
                    )}
                  </div>
                )}

                {isEditing ? (
                  /* Edit Form */
                  <div className="space-y-6">
                    {/* Basic Info */}
                    <div className="bg-gray-50 rounded-xl p-5">
                      <h3 className="font-bold text-gray-900 mb-4">פרטים אישיים</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">שם מלא</label>
                          <input
                            type="text"
                            value={editForm.fullName}
                            onChange={(e) => updateEditForm('fullName', e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">אימייל</label>
                          <input
                            type="email"
                            value={editForm.email}
                            onChange={(e) => updateEditForm('email', e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">טלפון</label>
                          <input
                            type="tel"
                            value={editForm.phone}
                            onChange={(e) => updateEditForm('phone', e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">ת.ז / ח.פ</label>
                          <input
                            type="text"
                            value={editForm.vatId}
                            onChange={(e) => updateEditForm('vatId', e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">שם חברה</label>
                          <input
                            type="text"
                            value={editForm.companyName}
                            onChange={(e) => updateEditForm('companyName', e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Address */}
                    <div className="bg-gray-50 rounded-xl p-5">
                      <h3 className="font-bold text-gray-900 mb-4">כתובת</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm text-gray-600 mb-1">כתובת</label>
                          <input
                            type="text"
                            value={editForm.address}
                            onChange={(e) => updateEditForm('address', e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">עיר</label>
                          <input
                            type="text"
                            value={editForm.city}
                            onChange={(e) => updateEditForm('city', e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">מיקוד</label>
                          <input
                            type="text"
                            value={editForm.zipCode}
                            onChange={(e) => updateEditForm('zipCode', e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Agent Settings */}
                    {isAgent && (
                      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-5">
                        <h3 className="font-bold text-gray-900 mb-4">הגדרות סוכן</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm text-gray-600 mb-1">אחוז עמלה</label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={editForm.commissionPercent}
                              onChange={(e) => updateEditForm('commissionPercent', e.target.value)}
                              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-600 mb-1">אחוז הנחה</label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={editForm.discountPercent}
                              onChange={(e) => updateEditForm('discountPercent', e.target.value)}
                              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-600 mb-1">קוד קופון</label>
                            <input
                              type="text"
                              value={editForm.couponCode}
                              onChange={(e) => updateEditForm('couponCode', e.target.value)}
                              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent uppercase"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Bank Details for Agent */}
                    {isAgent && (
                      <div className="bg-gray-50 rounded-xl p-5">
                        <h3 className="font-bold text-gray-900 mb-4">פרטי בנק להעברת עמלות</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm text-gray-600 mb-1">שם הבנק</label>
                            <input
                              type="text"
                              value={editForm.bankDetails?.bankName || ''}
                              onChange={(e) => updateBankDetails('bankName', e.target.value)}
                              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-600 mb-1">מספר סניף</label>
                            <input
                              type="text"
                              value={editForm.bankDetails?.branchNumber || ''}
                              onChange={(e) => updateBankDetails('branchNumber', e.target.value)}
                              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-600 mb-1">מספר חשבון</label>
                            <input
                              type="text"
                              value={editForm.bankDetails?.accountNumber || ''}
                              onChange={(e) => updateBankDetails('accountNumber', e.target.value)}
                              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-600 mb-1">שם בעל החשבון</label>
                            <input
                              type="text"
                              value={editForm.bankDetails?.accountName || ''}
                              onChange={(e) => updateBankDetails('accountName', e.target.value)}
                              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                        
                        {/* Payout Method */}
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm text-gray-600 mb-1">אימייל PayPal</label>
                            <input
                              type="email"
                              value={editForm.paypalEmail || ''}
                              onChange={(e) => updateEditForm('paypalEmail', e.target.value)}
                              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-600 mb-1">שיטת תשלום מועדפת</label>
                            <select
                              value={editForm.preferredPayoutMethod || 'bank'}
                              onChange={(e) => updateEditForm('preferredPayoutMethod', e.target.value)}
                              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                            >
                              <option value="bank">העברה בנקאית</option>
                              <option value="paypal">PayPal</option>
                              <option value="check">צ&apos;ק</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* View Mode */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Contact Info */}
                    <div className="bg-gray-50 rounded-xl p-5">
                      <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        פרטי קשר
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between"><span className="text-gray-500">טלפון:</span><span className="font-medium">{user.phone || '-'}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">אימייל:</span><span className="font-medium text-sm">{user.email || '-'}</span></div>
                        {user.address && <div className="flex justify-between"><span className="text-gray-500">כתובת:</span><span className="font-medium text-sm">{user.address}</span></div>}
                        {user.city && <div className="flex justify-between"><span className="text-gray-500">עיר:</span><span className="font-medium text-sm">{user.city}</span></div>}
                        {user.vatId && <div className="flex justify-between"><span className="text-gray-500">ת.ז/ח.פ:</span><span className="font-medium text-sm">{user.vatId}</span></div>}
                        {user.companyName && <div className="flex justify-between"><span className="text-gray-500">חברה:</span><span className="font-medium text-sm">{user.companyName}</span></div>}
                      </div>
                    </div>

                    {/* Account Info */}
                    <div className="bg-gray-50 rounded-xl p-5">
                      <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        פרטי חשבון
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between"><span className="text-gray-500">תאריך הרשמה:</span><span className="font-medium">{formatDate(user.createdAt)}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">סטטוס:</span><span className={`font-medium ${user.isActive !== false ? 'text-green-600' : 'text-red-600'}`}>{user.isActive !== false ? 'פעיל' : 'לא פעיל'}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">תפקיד:</span><span className="font-medium">{roleInfo.label}</span></div>
                      </div>
                    </div>

                    {/* Agent Stats */}
                    {isAgent && (
                      <div className="md:col-span-2 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-5">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                          <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          נתוני עמלות
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div className="text-center p-3 bg-white rounded-lg">
                            <p className="text-2xl font-bold" style={{ color: '#1e3a8a' }}>₪{(user.commissionBalance || 0).toLocaleString()}</p>
                            <p className="text-xs text-gray-500">יתרה נוכחית</p>
                          </div>
                          <div className="text-center p-3 bg-white rounded-lg">
                            <p className="text-2xl font-bold text-yellow-600">₪{(user.commissionOnHold || 0).toLocaleString()}</p>
                            <p className="text-xs text-gray-500">בהמתנה</p>
                          </div>
                          <div className="text-center p-3 bg-white rounded-lg">
                            <p className="text-2xl font-bold text-green-600">{user.commissionPercent || 0}%</p>
                            <p className="text-xs text-gray-500">אחוז עמלה</p>
                          </div>
                          <div className="text-center p-3 bg-white rounded-lg">
                            <p className="text-2xl font-bold text-cyan-600">{user.discountPercent || 0}%</p>
                            <p className="text-xs text-gray-500">אחוז הנחה</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Bank Details for Agent */}
                    {isAgent && (
                      <div className="md:col-span-2 bg-gray-50 rounded-xl p-5">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                          <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                          פרטי בנק להעברת עמלות
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div><span className="text-gray-500 text-sm">שם הבנק:</span><p className="font-medium">{user.bankDetails?.bankName || '-'}</p></div>
                          <div><span className="text-gray-500 text-sm">סניף:</span><p className="font-medium">{user.bankDetails?.branchNumber || '-'}</p></div>
                          <div><span className="text-gray-500 text-sm">מספר חשבון:</span><p className="font-medium">{user.bankDetails?.accountNumber || '-'}</p></div>
                          <div><span className="text-gray-500 text-sm">שם בעל החשבון:</span><p className="font-medium">{user.bankDetails?.accountName || '-'}</p></div>
                        </div>
                        {user.preferredPayoutMethod && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <span className="text-gray-500 text-sm">שיטת תשלום מועדפת: </span>
                            <span className="font-medium">
                              {user.preferredPayoutMethod === 'bank' ? 'העברה בנקאית' : 
                               user.preferredPayoutMethod === 'paypal' ? 'PayPal' : 'צ\'ק'}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <div>
                {orders.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    <p>אין הזמנות</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orders.map((order) => (
                      <div key={order._id || order.orderId} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all">
                        <div>
                          <p className="font-medium text-gray-900">הזמנה #{order.orderNumber || order._id?.slice(-6)}</p>
                          <p className="text-sm text-gray-500">{formatDate(order.createdAt || order.orderDate)}</p>
                        </div>
                        <div className="text-left">
                          <p className="font-bold" style={{ color: '#1e3a8a' }}>₪{(order.total || order.orderTotal || 0).toLocaleString()}</p>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            order.status === 'completed' ? 'bg-green-100 text-green-700' :
                            order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {order.status === 'completed' ? 'הושלם' : order.status === 'pending' ? 'ממתין' : order.status || 'לא ידוע'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Customers Tab (Agent Only) */}
            {activeTab === 'customers' && isAgent && (
              <div>
                {referredUsers.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p>אין לקוחות שהופנו על ידי סוכן זה</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {referredUsers.map((customer) => (
                      <Link 
                        key={customer._id} 
                        href={`/admin/users/${customer._id}`}
                        className="flex justify-between items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}>
                            {customer.fullName?.charAt(0) || '?'}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{customer.fullName || 'ללא שם'}</p>
                            <p className="text-sm text-gray-500">{customer.email}</p>
                          </div>
                        </div>
                        <div className="text-left">
                          <p className="text-sm text-gray-500">{formatDate(customer.createdAt)}</p>
                          <span className={`text-xs px-2 py-1 rounded-full ${customer.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {customer.isActive !== false ? 'פעיל' : 'לא פעיל'}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Commissions Tab (Agent Only) */}
            {activeTab === 'commissions' && isAgent && (
              <div>
                {commissions.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p>אין עמלות</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {commissions.map((commission) => (
                      <div key={commission._id || commission.orderId} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{commission.customerName || 'לקוח'}</p>
                          <p className="text-sm text-gray-500">{formatDate(commission.orderDate || commission.createdAt)}</p>
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-green-600">₪{(commission.commissionAmount || 0).toLocaleString()}</p>
                          <p className="text-xs text-gray-500">מתוך ₪{(commission.orderTotal || 0).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <Link 
                  href={`/admin/commissions?agentId=${params.id}`}
                  className="block text-center mt-4 py-2 text-white rounded-lg"
                  style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
                >
                  צפה בכל העמלות
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex gap-3">
          <Link
            href="/admin/users"
            className="px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 transition-all border"
          >
            חזרה לרשימה
          </Link>
        </div>
      </div>
    </div>
  );
}
