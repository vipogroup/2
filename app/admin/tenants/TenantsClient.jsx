'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';

// Icon components
const Building2 = ({ className = 'w-6 h-6' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-3v14" />
  </svg>
);

const Plus = ({ className = 'w-6 h-6' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const Search = ({ className = 'w-6 h-6' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const Edit = ({ className = 'w-6 h-6' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const Trash2 = ({ className = 'w-6 h-6' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const Eye = ({ className = 'w-6 h-6' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const Check = ({ className = 'w-6 h-6' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const X = ({ className = 'w-6 h-6' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const RefreshCw = ({ className = 'w-6 h-6' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const UserPlus = ({ className = 'w-6 h-6' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
  </svg>
);

const ExternalLink = ({ className = 'w-6 h-6' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

const LayoutDashboard = ({ className = 'w-6 h-6' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
  </svg>
);

const Package = ({ className = 'w-6 h-6' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);

const ShoppingCart = ({ className = 'w-6 h-6' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const Copy = ({ className = 'w-6 h-6' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const Link2 = ({ className = 'w-6 h-6' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
  </svg>
);

const Shield = ({ className = 'w-6 h-6' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const AlertTriangle = ({ className = 'w-6 h-6' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

export default function TenantsClient({ embedded = false }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [showAdminModal, setShowAdminModal] = useState(null); // tenant for which to create admin
  const [showPermissionsModal, setShowPermissionsModal] = useState(null); // tenant for menu permissions
  const [registrationUrl, setRegistrationUrl] = useState('/register-business');
  const [copied, setCopied] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Set registration URL on client side only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setRegistrationUrl(`${window.location.origin}/register-business`);
    }
  }, []);

  useEffect(() => {
    if (embedded) return;
    if (searchParams?.get('create') === '1') {
      setShowCreateModal(true);
    }
  }, [embedded, searchParams]);

  const loadTenants = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      
      const res = await fetch(`/api/tenants?${params}`, { credentials: 'include' });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'שגיאה בטעינת העסקים');
      
      setTenants(data.tenants || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadTenants();
  }, [loadTenants]);

  const filteredTenants = tenants.filter(tenant => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      tenant.name?.toLowerCase().includes(term) ||
      tenant.slug?.toLowerCase().includes(term) ||
      tenant.domain?.toLowerCase().includes(term)
    );
  });

  const handleStatusChange = async (tenantId, newStatus) => {
    try {
      const res = await fetch(`/api/tenants/${tenantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'שגיאה בעדכון הסטטוס');
      }
      
      loadTenants();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (tenantId, tenantName) => {
    if (!confirm(`האם למחוק את העסק ${tenantName}? פעולה זו בלתי הפיכה.`)) return;
    
    try {
      const res = await fetch(`/api/tenants/${tenantId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'שגיאה במחיקת העסק');
      }
      
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(tenantId); return next; });
      loadTenants();
    } catch (err) {
      alert(err.message);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredTenants.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTenants.map((t) => t._id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const names = tenants.filter((t) => selectedIds.has(t._id)).map((t) => t.name).join(', ');
    if (!confirm(`האם למחוק ${selectedIds.size} עסקים?\n${names}\n\nפעולה זו בלתי הפיכה!`)) return;
    setBulkDeleting(true);
    let deleted = 0;
    let errors = [];
    for (const id of selectedIds) {
      try {
        const res = await fetch(`/api/tenants/${id}`, { method: 'DELETE', credentials: 'include' });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          errors.push(data.error || 'שגיאה');
        } else {
          deleted++;
        }
      } catch (err) {
        errors.push(err.message);
      }
    }
    setBulkDeleting(false);
    setSelectedIds(new Set());
    loadTenants();
    if (errors.length > 0) {
      alert(`נמחקו ${deleted} עסקים, ${errors.length} שגיאות`);
    } else {
      alert(`נמחקו ${deleted} עסקים בהצלחה`);
    }
  };

  // Enter tenant dashboard as super admin
  // Reset all tenants (for testing)
  const handleResetAllTenants = async () => {
    const confirmText = 'מחק הכל';
    const userInput = prompt(`אזהרה! פעולה זו תמחק את כל העסקים וכל הנתונים שלהם!\n\nהקלד "${confirmText}" לאישור:`);
    
    if (userInput !== confirmText) {
      if (userInput !== null) alert('הטקסט שהוזן לא תואם. הפעולה בוטלה.');
      return;
    }
    
    setResetting(true);
    try {
      const res = await fetch('/api/admin/reset-tenants', {
        method: 'DELETE',
        credentials: 'include',
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'שגיאה באיפוס העסקים');
      }
      
      alert(`${data.message}`);
      loadTenants();
    } catch (err) {
      alert(`שגיאה: ${err.message}`);
    } finally {
      setResetting(false);
    }
  };

  // Enter tenant dashboard as super admin - opens in new tab with tenantId
  const handleEnterDashboard = (tenantId) => {
    window.open(`/business?tenantId=${tenantId}`, '_blank');
  };

  // Enter tenant products page as super admin
  const handleEnterProducts = (tenantId) => {
    window.open(`/business/products?tenantId=${tenantId}`, '_blank');
  };

  // Enter tenant orders page as super admin
  const handleEnterOrders = (tenantId) => {
    window.open(`/business/orders?tenantId=${tenantId}`, '_blank');
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      inactive: 'bg-gray-100 text-gray-800',
      suspended: 'bg-red-100 text-red-800',
    };
    const labels = {
      active: 'פעיל',
      pending: 'ממתין',
      inactive: 'לא פעיל',
      suspended: 'מושהה',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.inactive}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className={embedded ? '' : 'p-3 sm:p-6 max-w-7xl mx-auto'} dir="rtl">
      {/* Actions bar - hidden when embedded */}
      {!embedded && (
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div className="flex items-center gap-1 sm:gap-2 bg-green-50 border border-green-200 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2">
          <Link2 className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
          <span className="text-xs sm:text-sm text-green-700 font-medium hidden sm:inline">קישור הרשמה:</span>
          <code className="text-xs bg-white px-1 sm:px-2 py-0.5 sm:py-1 rounded border text-gray-600 max-w-[120px] sm:max-w-none truncate">
            {registrationUrl}
          </code>
          <button
            onClick={() => {
              navigator.clipboard.writeText(registrationUrl);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className={`p-1 sm:p-1.5 rounded transition-colors ${copied ? 'text-green-700 bg-green-100' : 'text-green-600 hover:bg-green-100'}`}
            title="העתק קישור"
          >
            {copied ? <Check className="w-3 h-3 sm:w-4 sm:h-4" /> : <Copy className="w-3 h-3 sm:w-4 sm:h-4" />}
          </button>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-white rounded-lg transition-colors text-sm sm:text-base"
          style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          עסק חדש
        </button>
      </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          <div className="flex-1 min-w-0">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              <input
                type="text"
                placeholder="חיפוש..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-9 sm:pr-10 pl-3 sm:pl-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 sm:flex-none px-2 sm:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
            >
              <option value="">כל הסטטוסים</option>
              <option value="active">פעיל</option>
              <option value="pending">ממתין</option>
              <option value="inactive">לא פעיל</option>
              <option value="suspended">מושהה</option>
            </select>
            <button
              onClick={loadTenants}
              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">רענון</span>
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              title="מחיקת חנויות"
            >
              <Trash2 className="w-4 h-4" />
              <span className="text-xs sm:text-sm">מחק חנויות</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : (
        /* Tenants Table */
        <div className="bg-white rounded-lg shadow-sm overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-center px-2 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={filteredTenants.length > 0 && selectedIds.size === filteredTenants.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    title="בחר הכל"
                  />
                </th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">עסק</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">דומיין</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">סטטוס</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">עמלה</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">סטטיסטיקות</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">פעולות</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-gray-500">
                    {searchTerm || statusFilter ? 'לא נמצאו עסקים התואמים לחיפוש' : 'אין עסקים במערכת'}
                  </td>
                </tr>
              ) : (
                filteredTenants.map((tenant) => (
                  <tr key={tenant._id} className={`hover:bg-gray-50 ${selectedIds.has(tenant._id) ? 'bg-blue-50' : ''}`}>
                    <td className="text-center px-2 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(tenant._id)}
                        onChange={() => toggleSelect(tenant._id)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {tenant.branding?.logo ? (
                          <Image
                            src={tenant.branding.logo}
                            alt="לוגו"
                            width={40}
                            height={40}
                            className="w-10 h-10 rounded-lg object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-blue-600" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-gray-900">{tenant.name}</div>
                          <div className="text-sm text-gray-500">{tenant.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        {tenant.domain || tenant.subdomain ? (
                          <a 
                            href={`https://${tenant.domain || tenant.subdomain + '.vipo.co.il'}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {tenant.domain || `${tenant.subdomain}.vipo.co.il`}
                          </a>
                        ) : (
                          <span className="text-gray-400">לא הוגדר</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(tenant.status)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium">{tenant.platformCommissionRate || 5}%</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>מוצרים: {tenant.stats?.totalProducts || 0}</div>
                        <div>הזמנות: {tenant.stats?.totalOrders || 0}</div>
                        <div>משתמשים: {tenant.stats?.totalUsers || 0}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEnterDashboard(tenant._id)}
                          className="p-2 text-cyan-600 hover:bg-cyan-50 rounded-lg"
                          title="כניסה לדשבורד עסק"
                        >
                          <LayoutDashboard className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEnterProducts(tenant._id)}
                          className="p-2 text-cyan-600 hover:bg-cyan-50 rounded-lg"
                          title="ניהול מוצרים"
                        >
                          <Package className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEnterOrders(tenant._id)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                          title="הזמנות"
                        >
                          <ShoppingCart className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setShowAdminModal(tenant)}
                          className="p-2 hover:bg-cyan-50 rounded-lg"
                          style={{ color: '#0891b2' }}
                          title="הוסף מנהל עסק"
                        >
                          <UserPlus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setShowPermissionsModal(tenant)}
                          className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg"
                          title="הרשאות תפריטים"
                        >
                          <Shield className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingTenant(tenant)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                          title="עריכה"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {tenant.status !== 'active' ? (
                          <button
                            onClick={() => handleStatusChange(tenant._id, 'active')}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                            title="הפעלה"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleStatusChange(tenant._id, 'suspended')}
                            className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg"
                            title="השהייה"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(tenant._id, tenant.name)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="מחיקה"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary Stats - hidden when embedded */}
      {!embedded && <div className="grid grid-cols-4 gap-4 mt-6">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-gray-900">{tenants.length}</div>
          <div className="text-sm text-gray-500">סהכ עסקים</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-green-600">
            {tenants.filter(t => t.status === 'active').length}
          </div>
          <div className="text-sm text-gray-500">פעילים</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-yellow-600">
            {tenants.filter(t => t.status === 'pending').length}
          </div>
          <div className="text-sm text-gray-500">ממתינים</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-blue-600">
            {tenants.reduce((sum, t) => sum + (t.stats?.totalOrders || 0), 0)}
          </div>
          <div className="text-sm text-gray-500">סהכ הזמנות</div>
        </div>
      </div>}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingTenant) && (
        <TenantModal
          tenant={editingTenant}
          onClose={() => {
            setShowCreateModal(false);
            setEditingTenant(null);
          }}
          onSave={() => {
            setShowCreateModal(false);
            setEditingTenant(null);
            loadTenants();
          }}
        />
      )}

      {/* Create Business Admin Modal */}
      {showAdminModal && (
        <CreateAdminModal
          tenant={showAdminModal}
          onClose={() => setShowAdminModal(null)}
          onSave={() => {
            setShowAdminModal(null);
            loadTenants();
          }}
        />
      )}

      {/* Business Menu Permissions Modal */}
      {showPermissionsModal && (
        <MenuPermissionsModal
          tenant={showPermissionsModal}
          onClose={() => setShowPermissionsModal(null)}
          onSave={() => {
            setShowPermissionsModal(null);
            loadTenants();
          }}
        />
      )}

      {/* Delete Tenants Modal */}
      {showDeleteModal && (
        <DeleteTenantsModal
          tenants={tenants}
          onClose={() => setShowDeleteModal(false)}
          onDeleted={() => {
            setShowDeleteModal(false);
            setSelectedIds(new Set());
            loadTenants();
          }}
        />
      )}
    </div>
  );
}

/**
 * Modal for selecting and deleting multiple tenants
 */
function DeleteTenantsModal({ tenants, onClose, onDeleted }) {
  const [selected, setSelected] = useState(new Set());
  const [deleting, setDeleting] = useState(false);
  const [progress, setProgress] = useState('');

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === tenants.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(tenants.map((t) => t._id)));
    }
  };

  const handleDelete = async () => {
    if (selected.size === 0) return;
    const names = tenants.filter((t) => selected.has(t._id)).map((t) => t.name).join('\n• ');
    if (!confirm(`האם למחוק ${selected.size} חנויות?\n\n• ${names}\n\nפעולה זו בלתי הפיכה ותמחק גם בשרת החיצוני!`)) return;

    setDeleting(true);
    let deleted = 0;
    let errors = 0;
    const ids = [...selected];

    for (let i = 0; i < ids.length; i++) {
      const t = tenants.find((x) => x._id === ids[i]);
      setProgress(`מוחק ${i + 1}/${ids.length}: ${t?.name || ids[i]}...`);
      try {
        const res = await fetch(`/api/tenants/${ids[i]}`, { method: 'DELETE', credentials: 'include' });
        if (res.ok) deleted++; else errors++;
      } catch {
        errors++;
      }
    }

    setDeleting(false);
    alert(`נמחקו ${deleted} חנויות${errors > 0 ? `, ${errors} שגיאות` : ' בהצלחה'}`);
    onDeleted();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" dir="rtl">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b rounded-t-xl flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' }}>
          <h2 className="text-lg font-bold text-white">מחיקת חנויות</h2>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Store list */}
        <div className="flex-1 overflow-y-auto p-4">
          {tenants.length === 0 ? (
            <p className="text-center text-gray-500 py-8">אין חנויות במערכת</p>
          ) : (
            <>
              {/* Select all */}
              <label className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 mb-3 cursor-pointer hover:bg-gray-100 transition-colors">
                <input
                  type="checkbox"
                  checked={tenants.length > 0 && selected.size === tenants.length}
                  onChange={toggleAll}
                  className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
                />
                <span className="font-semibold text-gray-700">
                  {selected.size === tenants.length ? 'בטל הכל' : 'בחר הכל'} ({tenants.length} חנויות)
                </span>
              </label>

              {/* Individual stores */}
              <div className="space-y-2">
                {tenants.map((tenant) => (
                  <label
                    key={tenant._id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selected.has(tenant._id)
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(tenant._id)}
                      onChange={() => toggle(tenant._id)}
                      className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
                    />
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {tenant.branding?.logo ? (
                        <Image
                          src={tenant.branding.logo}
                          alt=""
                          width={32}
                          height={32}
                          className="w-8 h-8 rounded-lg object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                          <Building2 className="w-4 h-4 text-blue-600" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 truncate">{tenant.name}</div>
                        <div className="text-xs text-gray-500 flex gap-2">
                          <span>{tenant.slug}</span>
                          <span>•</span>
                          <span>{tenant.stats?.totalProducts || 0} מוצרים</span>
                        </div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 rounded-b-xl flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            disabled={deleting}
            className="px-4 py-2 border rounded-lg hover:bg-gray-100 text-sm disabled:opacity-50"
          >
            ביטול
          </button>
          <div className="flex items-center gap-3">
            {progress && <span className="text-xs text-gray-500">{progress}</span>}
            <button
              onClick={handleDelete}
              disabled={deleting || selected.size === 0}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? 'מוחק...' : `מחק ${selected.size} חנויות`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TenantModal({ tenant, onClose, onSave }) {
  const isEdit = !!tenant;
  const [formData, setFormData] = useState({
    name: tenant?.name || '',
    slug: tenant?.slug || '',
    domain: tenant?.domain || '',
    subdomain: tenant?.subdomain || '',
    platformCommissionRate: tenant?.platformCommissionRate || 5,
    status: tenant?.status || 'pending',
    // Contact fields
    contactAddress: tenant?.contact?.address || '',
    contactWhatsapp: tenant?.contact?.whatsapp || '',
    // Admin fields
    adminId: tenant?.admin?._id || '',
    adminName: tenant?.admin?.fullName || '',
    adminEmail: tenant?.admin?.email || '',
    adminPhone: tenant?.admin?.phone || '',
    adminPassword: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [generatedPassword, setGeneratedPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    // Validate admin fields for new tenant
    if (!isEdit) {
      if (!formData.adminEmail || !formData.adminPassword || !formData.adminName) {
        setError('יש למלא שם, מייל וסיסמה למנהל העסק');
        setSaving(false);
        return;
      }
      if (formData.adminPassword.length < 8) {
        setError('הסיסמה חייבת להכיל לפחות 8 תווים, מספר אחד ואות אחת');
        setSaving(false);
        return;
      }
      if (!/\d/.test(formData.adminPassword)) {
        setError('הסיסמה חייבת להכיל לפחות מספר אחד');
        setSaving(false);
        return;
      }
      if (!/[a-zA-Zא-ת]/.test(formData.adminPassword)) {
        setError('הסיסמה חייבת להכיל לפחות אות אחת');
        setSaving(false);
        return;
      }
    }

    try {
      const url = isEdit ? `/api/tenants/${tenant._id}` : '/api/tenants';
      const method = isEdit ? 'PUT' : 'POST';

      // Prepare data - include admin info for both new and edit
      const submitData = isEdit 
        ? { 
            name: formData.name, 
            slug: formData.slug, 
            domain: formData.domain, 
            subdomain: formData.subdomain, 
            platformCommissionRate: formData.platformCommissionRate, 
            status: formData.status, 
            contactAddress: formData.contactAddress, 
            contactWhatsapp: formData.contactWhatsapp,
            // Admin update info
            adminId: formData.adminId,
            adminName: formData.adminName,
            adminEmail: formData.adminEmail,
            adminPhone: formData.adminPhone,
          }
        : { ...formData, createAdmin: true };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(submitData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'שגיאה בשמירת העסק');

      onSave();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" dir="rtl">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b rounded-t-xl" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}>
          <h2 className="text-xl font-bold text-white">{isEdit ? 'עריכת עסק' : 'יצירת עסק חדש'}</h2>
          {!isEdit && <p className="text-cyan-100 text-sm mt-1">כולל יצירת מנהל עסק</p>}
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>
          )}
          
          {/* Business Info Section */}
          <div className="pb-3 border-b">
            <h3 className="font-medium text-gray-900 mb-3">פרטי העסק</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">שם העסק *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug (מזהה) *</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/^-+|-+$/g, '') })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 font-mono"
                  required
                  placeholder="my-business"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">דומיין</label>
                  <input
                    type="text"
                    value={formData.domain}
                    onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500"
                    placeholder="shop.example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subdomain</label>
                  <input
                    type="text"
                    value={formData.subdomain}
                    onChange={(e) => setFormData({ ...formData, subdomain: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500"
                    placeholder="shop"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">עמלת פלטפורמה (%)</label>
                  <input
                    type="number"
                    value={formData.platformCommissionRate}
                    onChange={(e) => setFormData({ ...formData, platformCommissionRate: Number(e.target.value) })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500"
                    min="0"
                    max="100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">סטטוס</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="pending">ממתין</option>
                    <option value="active">פעיל</option>
                    <option value="inactive">לא פעיל</option>
                    <option value="suspended">מושהה</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Info Section */}
          <div className="pb-3 border-b">
            <h3 className="font-medium text-gray-900 mb-3">פרטי קשר העסק</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">כתובת</label>
                <input
                  type="text"
                  value={formData.contactAddress}
                  onChange={(e) => setFormData({ ...formData, contactAddress: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500"
                  placeholder="רחוב, עיר"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">וואטסאפ</label>
                <input
                  type="tel"
                  value={formData.contactWhatsapp}
                  onChange={(e) => setFormData({ ...formData, contactWhatsapp: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500"
                  placeholder="053-375-2633"
                />
              </div>
            </div>
          </div>

          {/* Admin Info Section */}
          <div className="pt-2">
            <h3 className="font-medium text-gray-900 mb-3">פרטי מנהל העסק</h3>
            
            {isEdit && !formData.adminId && (
              <div className="bg-yellow-50 text-yellow-700 p-3 rounded-lg text-sm mb-3">
                לעסק זה אין מנהל מוגדר
              </div>
            )}
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">שם מלא {!isEdit && '*'}</label>
                <input
                  type="text"
                  value={formData.adminName}
                  onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500"
                  required={!isEdit}
                  placeholder="ישראל ישראלי"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">אימייל {!isEdit && '*'}</label>
                <input
                  type="email"
                  value={formData.adminEmail}
                  onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500"
                  required={!isEdit}
                  placeholder="admin@business.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">טלפון</label>
                <input
                  type="tel"
                  value={formData.adminPhone}
                  onChange={(e) => setFormData({ ...formData, adminPhone: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500"
                  placeholder="053-375-2633"
                />
              </div>

              {/* Password - required for new, optional reset for edit */}
              {!isEdit ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">סיסמה *</label>
                  <input
                    type="password"
                    value={formData.adminPassword}
                    onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500"
                    required
                    minLength={8}
                    placeholder="לפחות 8 תווים, מספר ואות"
                  />
                </div>
              ) : formData.adminId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">איפוס סיסמה</label>
                  {!showResetPassword ? (
                    <button
                      type="button"
                      onClick={() => setShowResetPassword(true)}
                      className="px-4 py-2 text-sm border border-orange-500 text-orange-600 rounded-lg hover:bg-orange-50"
                    >
                      🔑 איפוס סיסמה למנהל
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500"
                        placeholder="הזן סיסמה חדשה (8+ תווים, מספר ואות)"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            if (newPassword.length < 8 || !/\d/.test(newPassword) || !/[a-zA-Zא-ת]/.test(newPassword)) {
                              setError('הסיסמה חייבת להכיל לפחות 8 תווים, מספר ואות');
                              return;
                            }
                            try {
                              const res = await fetch(`/api/users/${formData.adminId}/reset-password`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                credentials: 'include',
                                body: JSON.stringify({ password: newPassword }),
                              });
                              const data = await res.json();
                              if (!res.ok) throw new Error(data.error || 'שגיאה באיפוס הסיסמה');
                              setGeneratedPassword(newPassword);
                              setNewPassword('');
                            } catch (err) {
                              setError(err.message);
                            }
                          }}
                          className="px-3 py-1 text-sm text-white rounded-lg"
                          style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
                        >
                          אפס סיסמה
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowResetPassword(false); setNewPassword(''); }}
                          className="px-3 py-1 text-sm border rounded-lg hover:bg-gray-50"
                        >
                          ביטול
                        </button>
                      </div>
                      {generatedPassword && (
                        <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                          <p className="text-sm text-green-800 font-medium">סיסמה חדשה:</p>
                          <div className="flex items-center gap-2 mt-1">
                            <code className="bg-white px-3 py-1 rounded border text-lg font-mono">{generatedPassword}</code>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(generatedPassword);
                              }}
                              className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
                            >
                              העתק
                            </button>
                          </div>
                          <p className="text-xs text-green-600 mt-2">שלח את הסיסמה למנהל העסק</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 text-white rounded-lg disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
            >
              {saving ? 'שומר...' : (isEdit ? 'עדכון' : 'יצירה')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border rounded-lg hover:bg-gray-50"
            >
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateAdminModal({ tenant, onClose, onSave }) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Password validation
    const pwd = formData.password;
    if (pwd.length < 8 || !/\d/.test(pwd) || !/[a-zA-Zא-ת]/.test(pwd)) {
      setError('הסיסמה חייבת להכיל לפחות 8 תווים, מספר אחד ואות אחת');
      return;
    }

    setSaving(true);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          role: 'business_admin',
          tenantId: tenant._id,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'שגיאה ביצירת המשתמש');

      setSuccess(true);
      setTimeout(() => {
        onSave();
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" dir="rtl">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        <div className="p-6 border-b rounded-t-xl" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}>
          <h2 className="text-xl font-bold text-white">יצירת מנהל עסק</h2>
          <p className="text-cyan-100 text-sm mt-1">עבור: {tenant.name}</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>
          )}
          {success && (
            <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm">
              מנהל העסק נוצר בהצלחה!
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">שם מלא *</label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500"
              required
              placeholder="ישראל ישראלי"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">אימייל *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500"
              required
              placeholder="admin@business.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">טלפון</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500"
              placeholder="053-375-2633"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">סיסמה *</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500"
              required
              minLength={8}
              placeholder="לפחות 8 תווים, מספר ואות"
            />
          </div>

          <div className="bg-cyan-50 p-3 rounded-lg text-sm text-cyan-800">
            <strong>שים לב:</strong> המשתמש יקבל הרשאות מלאות לניהול העסק {tenant.name} בלבד.
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={saving || success}
              className="flex-1 py-2 text-white rounded-lg disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
            >
              {saving ? 'יוצר...' : 'צור מנהל עסק'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border rounded-lg hover:bg-gray-50"
            >
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Business Menu Permissions Modal
function MenuPermissionsModal({ tenant, onClose, onSave }) {
  const [allowedMenus, setAllowedMenus] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Menu categories with their items
  const menuCategories = useMemo(() => ([
    {
      id: 'users',
      label: 'ניהול משתמשים',
      items: [
        { id: 'users', label: 'ניהול משתמשים' },
        { id: 'agents', label: 'ניהול סוכנים' },
      ],
    },
    {
      id: 'catalog',
      label: 'קטלוג ומכירות',
      items: [
        { id: 'products', label: 'ניהול מוצרים' },
        { id: 'products_new', label: 'הוספת מוצר' },
        { id: 'orders', label: 'ניהול הזמנות' },
      ],
    },
    {
      id: 'finance',
      label: 'כספים ודוחות',
      items: [
        { id: 'reports', label: 'דוחות' },
        { id: 'sales_status', label: 'מצב מכירות' },
        { id: 'commissions', label: 'עמלות' },
        { id: 'withdrawals', label: 'בקשות משיכה' },
        { id: 'transactions', label: 'עסקאות' },
        { id: 'analytics', label: 'אנליטיקס' },
      ],
    },
    {
      id: 'settings',
      label: 'הגדרות ושיווק',
      items: [
        { id: 'settings', label: 'הגדרות חנות' },
        { id: 'marketing', label: 'שיווק' },
        { id: 'notifications', label: 'התראות' },
        { id: 'integrations', label: 'אינטגרציות' },
        { id: 'crm', label: 'CRM' },
        { id: 'bot_manager', label: 'ניהול בוט צאט' },
        { id: 'site_texts', label: 'ניהול טקסטים' },
        { id: 'branding', label: 'מיתוג וצבעים' },
      ],
    },
    {
      id: 'widgets',
      label: 'ווידג\'טים',
      items: [
        { id: 'new_users_widget', label: 'משתמשים חדשים' },
        { id: 'recent_orders_widget', label: 'הזמנות אחרונות' },
      ],
    },
  ]), []);

  useEffect(() => {
    setAllowedMenus(Array.isArray(tenant?.allowedMenus) ? tenant.allowedMenus : []);
  }, [tenant?._id, tenant?.allowedMenus]);

  const toggleMenu = (menuId) => {
    setAllowedMenus((prev) =>
      prev.includes(menuId)
        ? prev.filter((id) => id !== menuId)
        : [...prev, menuId]
    );
  };

  const toggleCategory = (category) => {
    const categoryItems = category.items.map((item) => item.id);
    const allSelected = categoryItems.every((id) => allowedMenus.includes(id));

    if (allSelected) {
      setAllowedMenus((prev) => prev.filter((id) => !categoryItems.includes(id)));
    } else {
      setAllowedMenus((prev) => [...new Set([...prev, ...categoryItems])]);
    }
  };

  const selectAll = () => {
    const allMenus = menuCategories.flatMap((cat) => cat.items.map((item) => item.id));
    setAllowedMenus(allMenus);
  };

  const clearAll = () => {
    setAllowedMenus([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const res = await fetch(`/api/tenants/${tenant._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ allowedMenus, allowedMenusConfigured: true }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'שגיאה בשמירת ההרשאות');

      onSave();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" dir="rtl">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div
          className="p-6 border-b rounded-t-xl"
          style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
        >
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-white" />
            <div>
              <h2 className="text-xl font-bold text-white">הרשאות תפריטים</h2>
              <p className="text-cyan-100 text-sm mt-1">עבור: {tenant.name}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 m-4 rounded-lg text-sm">{error}</div>
          )}

          {/* Quick actions */}
          <div className="flex gap-2 p-4 border-b bg-gray-50">
            <button
              type="button"
              onClick={selectAll}
              className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
            >
              בחר הכל
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
            >
              נקה הכל
            </button>
            <span className="text-sm text-gray-500 mr-auto">
              נבחרו: {allowedMenus.length} תפריטים
            </span>
          </div>

          {/* Menu categories */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {menuCategories.map((category) => {
              const categoryItems = category.items.map((item) => item.id);
              const selectedCount = categoryItems.filter((id) => allowedMenus.includes(id)).length;
              const allSelected = selectedCount === categoryItems.length;
              const someSelected = selectedCount > 0 && !allSelected;

              return (
                <div key={category.id} className="border rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleCategory(category)}
                    className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                          allSelected
                            ? 'bg-cyan-600 border-cyan-600'
                            : someSelected
                            ? 'bg-cyan-200 border-cyan-400'
                            : 'border-gray-300'
                        }`}
                      >
                        {allSelected && <Check className="w-3 h-3 text-white" />}
                        {someSelected && !allSelected && (
                          <div className="w-2 h-2 bg-cyan-600 rounded-sm"></div>
                        )}
                      </div>
                      <span className="font-medium text-gray-900">{category.label}</span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {selectedCount}/{categoryItems.length}
                    </span>
                  </button>

                  <div className="p-3 grid grid-cols-2 gap-2 bg-white">
                    {category.items.map((item) => (
                      <label
                        key={item.id}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={allowedMenus.includes(item.id)}
                          onChange={() => toggleMenu(item.id)}
                          className="w-4 h-4 text-cyan-600 rounded border-gray-300 focus:ring-cyan-500"
                        />
                        <span className="text-sm text-gray-700">{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex gap-3 p-4 border-t bg-gray-50">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 text-white rounded-lg disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
            >
              {saving ? 'שומר...' : 'שמור הרשאות'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border rounded-lg hover:bg-gray-50"
            >
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
