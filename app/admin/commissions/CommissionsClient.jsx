'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

const STATUS_LABELS = {
  pending: { label: 'ממתין לשחרור', color: 'bg-yellow-100 text-yellow-800' },
  available: { label: 'זמין למשיכה', color: 'bg-green-100 text-green-800' },
  claimed: { label: 'נמשך', color: 'bg-blue-100 text-blue-800' },
  cancelled: { label: 'בוטל', color: 'bg-red-100 text-red-800' },
};

// Calculate days until commission is available
function getDaysUntilAvailable(availableAt) {
  if (!availableAt) return null;
  const now = new Date();
  const available = new Date(availableAt);
  const diffTime = available.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

// Export to CSV (Excel compatible)
function exportToExcel(agentsSummary, commissions) {
  // BOM for UTF-8 support in Excel
  const BOM = '\uFEFF';
  
  // Create agents summary CSV
  let csv = BOM;
  csv += 'סיכום עמלות לפי סוכן\n';
  csv += 'שם סוכן,קופון,הזמנות,ממתין,זמין למשיכה,נמשך,סה״כ הרוויח\n';
  
  agentsSummary?.forEach(agent => {
    csv += `"${agent.fullName}","${agent.couponCode || ''}",${agent.ordersCount},${agent.pendingAmount || 0},${agent.availableForWithdrawal ?? agent.currentBalance ?? 0},${agent.claimedAmount || 0},${agent.totalEarned || 0}\n`;
  });
  
  csv += '\n\nפירוט עמלות\n';
  csv += 'תאריך,סוכן,קופון,לקוח,טלפון,סכום הזמנה,עמלה,סטטוס,תאריך שחרור\n';
  
  commissions?.forEach(c => {
    const status = STATUS_LABELS[c.commissionStatus]?.label || c.commissionStatus;
    const date = c.orderDate ? new Date(c.orderDate).toLocaleDateString('he-IL') : '';
    const availableAt = c.commissionAvailableAt ? new Date(c.commissionAvailableAt).toLocaleDateString('he-IL') : '';
    csv += `"${date}","${c.agent?.fullName || 'לא ידוע'}","${c.agent?.couponCode || ''}","${c.customerName}","${c.customerPhone}",${c.orderTotal || 0},${c.commissionAmount || 0},"${status}","${availableAt}"\n`;
  });
  
  // Create and download file
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `commissions-report-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function CommissionsClient({ basePath = '/admin', embedded = false }) {
  const isBusiness = basePath === '/business';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('agents'); // 'agents' | 'orders'
  const [filters, setFilters] = useState({
    agentId: '',
    status: '',
    from: '',
    to: '',
  });
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [agentDetails, setAgentDetails] = useState(null);
  const [loadingAgentDetails, setLoadingAgentDetails] = useState(false);
  const [editingDateId, setEditingDateId] = useState(null);
  const [editingDateValue, setEditingDateValue] = useState('');
  const [savingDate, setSavingDate] = useState(false);
  const [releasingId, setReleasingId] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [resettingCommissions, setResettingCommissions] = useState(false);

  // Export commissions to CSV (for business)
  const handleExportCSV = async () => {
    try {
      setExporting(true);
      const params = new URLSearchParams();
      if (filters.agentId) params.append('agentId', filters.agentId);
      if (filters.status) params.append('status', filters.status);
      if (filters.from) params.append('from', filters.from);
      if (filters.to) params.append('to', filters.to);
      
      const url = `/api/business/commissions/export${params.toString() ? '?' + params.toString() : ''}`;
      const res = await fetch(url, { credentials: 'include' });
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'שגיאה בייצוא');
      }
      
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `commissions-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      alert(err.message || 'שגיאה בייצוא הנתונים');
    } finally {
      setExporting(false);
    }
  };

  // Fetch agent sales details
  const fetchAgentDetails = async (agentId) => {
    try {
      setLoadingAgentDetails(true);
      const res = await fetch(`/api/business/commissions/agent/${agentId}`, { credentials: 'include' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch');
      setAgentDetails(json);
    } catch (err) {
      alert('שגיאה בטעינת פרטי הסוכן: ' + err.message);
    } finally {
      setLoadingAgentDetails(false);
    }
  };

  // Reset all commissions
  const handleResetAllCommissions = async () => {
    const confirmText = prompt('פעולה זו תמחק את כל העמלות במערכת!\n\nהקלד "אפס עמלות" כדי לאשר:');
    if (confirmText !== 'אפס עמלות') {
      if (confirmText !== null) alert('הטקסט שהוזן אינו תואם. הפעולה בוטלה.');
      return;
    }
    
    setResettingCommissions(true);
    try {
      const res = await fetch('/api/admin/commissions/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to reset commissions');
      
      alert(`איפוס הושלם!\n\nהזמנות שאופסו: ${json.ordersReset || 0}\nמשתמשים שאופסו: ${json.usersReset || 0}`);
      fetchData();
    } catch (err) {
      alert('שגיאה באיפוס העמלות: ' + err.message);
    } finally {
      setResettingCommissions(false);
    }
  };

  // Fix commission balance (for orders released before the fix)
  const handleFixBalance = async (orderId) => {
    if (!confirm('האם לתקן את יתרת העמלה? זה יוסיף את הסכום ליתרה של הסוכן.')) return;
    setReleasingId(orderId);
    try {
      const res = await fetch('/api/admin/commissions/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'fix_balance', orderId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fix balance');
      
      alert('יתרת העמלה תוקנה בהצלחה! הסוכן יכול עכשיו לבקש משיכה.');
      fetchData(); // Refresh data
    } catch (err) {
      alert('שגיאה בתיקון היתרה: ' + err.message);
    } finally {
      setReleasingId(null);
    }
  };

  // Release single commission
  const handleReleaseCommission = async (orderId) => {
    if (!confirm('האם לשחרר את העמלה הזו? הסוכן יוכל לבקש משיכה מיידית.')) return;
    setReleasingId(orderId);
    try {
      const res = await fetch('/api/admin/commissions/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'release_single', orderId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to release');
      
      // Update local state
      setData(prev => ({
        ...prev,
        commissions: prev.commissions.map(c => 
          c.orderId === orderId 
            ? { ...c, commissionStatus: 'available' }
            : c
        )
      }));
      alert('העמלה שוחררה בהצלחה!');
    } catch (err) {
      alert('שגיאה בשחרור העמלה: ' + err.message);
    } finally {
      setReleasingId(null);
    }
  };

  // Update commission release date
  const handleUpdateReleaseDate = async (orderId, newDate) => {
    if (!newDate) return;
    setSavingDate(true);
    try {
      const res = await fetch(`/api/admin/commissions/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commissionAvailableAt: newDate }),
      });
      if (!res.ok) throw new Error('Failed to update');
      
      // Update local state
      setData(prev => ({
        ...prev,
        commissions: prev.commissions.map(c => 
          c.orderId === orderId 
            ? { ...c, commissionAvailableAt: newDate }
            : c
        )
      }));
      setEditingDateId(null);
    } catch (err) {
      alert('שגיאה בעדכון התאריך');
    } finally {
      setSavingDate(false);
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (filters.agentId) params.append('agentId', filters.agentId);
    if (filters.status) params.append('status', filters.status);
    if (filters.from) params.append('from', filters.from);
    if (filters.to) params.append('to', filters.to);

    try {
      const res = await fetch(`/api/admin/commissions?${params}`, { credentials: 'include' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch');
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const formatDateTime = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading && !data) {
    return (
      <main className={embedded ? 'p-4 flex items-center justify-center' : 'min-h-screen bg-white p-3 sm:p-6 md:p-8 flex items-center justify-center'}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">טוען נתוני עמלות...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className={embedded ? 'p-4 flex items-center justify-center' : 'min-h-screen bg-white p-3 sm:p-6 md:p-8 flex items-center justify-center'}>
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-red-600 font-medium">{error}</p>
          <button onClick={fetchData} className="mt-4 px-4 py-2 text-white rounded-lg" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}>
            נסה שוב
          </button>
        </div>
      </main>
    );
  }

  const { summary, agentsSummary, commissions, agents } = data || {};

  return (
    <main className={embedded ? 'bg-white p-2' : 'min-h-screen bg-white p-3 sm:p-6 md:p-8'}>
      <div className={embedded ? 'space-y-4' : 'max-w-7xl mx-auto space-y-6'}>
        {/* Actions */}
        {!embedded && (
        <div className="flex gap-2 flex-wrap justify-end">
            {!isBusiness && (
              <button
                onClick={handleResetAllCommissions}
                disabled={resettingCommissions}
                className="px-4 py-2 rounded-lg font-medium transition-all border-2 disabled:opacity-50"
                style={{ borderColor: '#dc2626', color: '#dc2626' }}
              >
                {resettingCommissions ? 'מאפס...' : 'איפוס עמלות'}
              </button>
            )}
            <button
              onClick={isBusiness ? handleExportCSV : () => exportToExcel(data?.agentsSummary, data?.commissions)}
              disabled={!data || exporting}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all text-white disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
            >
              {exporting ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  מייצא...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  הורד דוח CSV
                </>
              )}
            </button>
            <button
              onClick={fetchData}
              className="px-4 py-2 rounded-lg font-medium transition-all border-2"
              style={{ borderColor: '#0891b2', color: '#1e3a8a' }}
            >
              רענן נתונים
            </button>
        </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div
            className="rounded-xl p-4 sm:p-5 shadow-md"
            style={{
              border: '2px solid transparent',
              backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)',
              backgroundOrigin: 'border-box',
              backgroundClip: 'padding-box, border-box',
            }}
          >
            <p className="text-xs sm:text-sm text-gray-500 mb-1">ממתין לשחרור</p>
            <p className="text-lg sm:text-2xl font-bold" style={{ color: '#eab308' }}>
              ₪{(summary?.totalPending || 0).toLocaleString()}
            </p>
          </div>
          <div
            className="rounded-xl p-4 sm:p-5 shadow-md"
            style={{
              border: '2px solid transparent',
              backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)',
              backgroundOrigin: 'border-box',
              backgroundClip: 'padding-box, border-box',
            }}
          >
            <p className="text-xs sm:text-sm text-gray-500 mb-1">זמין למשיכה</p>
            <p className="text-lg sm:text-2xl font-bold" style={{ color: '#16a34a' }}>
              ₪{(summary?.actualAvailable ?? summary?.totalAvailable ?? 0).toLocaleString()}
            </p>
          </div>
          <div
            className="rounded-xl p-4 sm:p-5 shadow-md"
            style={{
              border: '2px solid transparent',
              backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)',
              backgroundOrigin: 'border-box',
              backgroundClip: 'padding-box, border-box',
            }}
          >
            <p className="text-xs sm:text-sm text-gray-500 mb-1">נמשך</p>
            <p className="text-lg sm:text-2xl font-bold" style={{ color: '#1e3a8a' }}>
              ₪{(summary?.totalClaimed || 0).toLocaleString()}
            </p>
          </div>
          <div
            className="rounded-xl p-4 sm:p-5 shadow-md"
            style={{
              border: '2px solid transparent',
              backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)',
              backgroundOrigin: 'border-box',
              backgroundClip: 'padding-box, border-box',
            }}
          >
            <p className="text-xs sm:text-sm text-gray-500 mb-1">סה״כ עמלות</p>
            <p className="text-lg sm:text-2xl font-bold" style={{ color: '#0891b2' }}>
              ₪{(summary?.totalAmount || 0).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Release Date Info */}
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="font-semibold text-blue-800 text-sm">תקופת המתנה לשחרור עמלות</h4>
              <p className="text-xs text-blue-700 mt-1">
                <span className="font-medium">רכישה רגילה:</span> 30 יום מתאריך ההזמנה &nbsp;|&nbsp; 
                <span className="font-medium">רכישה קבוצתית:</span> 100 יום מתאריך ההזמנה
              </p>
              <p className="text-xs text-blue-600 mt-1">
                לחץ על תאריך השחרור בטבלה כדי לערוך אותו ידנית
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-50 rounded-xl p-4 sm:p-6">
          <h3 className="font-bold mb-4" style={{ color: '#1e3a8a' }}>פילטרים</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">סוכן</label>
              <select
                value={filters.agentId}
                onChange={(e) => setFilters({ ...filters, agentId: e.target.value })}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
              >
                <option value="">כל הסוכנים</option>
                {agents?.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.fullName} ({agent.couponCode || 'ללא קופון'})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">סטטוס עמלה</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
              >
                <option value="">הכל</option>
                <option value="pending">ממתין לשחרור</option>
                <option value="available">זמין למשיכה</option>
                <option value="claimed">נמשך</option>
                <option value="cancelled">בוטל</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">מתאריך</label>
              <input
                type="date"
                value={filters.from}
                onChange={(e) => setFilters({ ...filters, from: e.target.value })}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">עד תאריך</label>
              <input
                type="date"
                value={filters.to}
                onChange={(e) => setFilters({ ...filters, to: e.target.value })}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b-2 border-gray-200">
          <button
            onClick={() => setActiveTab('agents')}
            className={`px-4 py-2 font-medium transition-all ${
              activeTab === 'agents'
                ? 'border-b-2 -mb-[2px]'
                : 'text-gray-500'
            }`}
            style={activeTab === 'agents' ? { borderColor: '#0891b2', color: '#1e3a8a' } : {}}
          >
            סיכום לפי סוכן ({agentsSummary?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 font-medium transition-all ${
              activeTab === 'orders'
                ? 'border-b-2 -mb-[2px]'
                : 'text-gray-500'
            }`}
            style={activeTab === 'orders' ? { borderColor: '#0891b2', color: '#1e3a8a' } : {}}
          >
            כל העמלות ({commissions?.length || 0})
          </button>
        </div>

        {/* Agents Summary Tab */}
        {activeTab === 'agents' && (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead style={{ borderBottom: '2px solid #0891b2' }}>
                  <tr>
                    <th className="px-4 py-3 text-right text-xs font-semibold" style={{ color: '#1e3a8a' }}>סוכן</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold" style={{ color: '#1e3a8a' }}>קופון</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold" style={{ color: '#1e3a8a' }}>הזמנות</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold" style={{ color: '#1e3a8a' }}>ממתין</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold" style={{ color: '#1e3a8a' }}>זמין למשיכה</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold" style={{ color: '#1e3a8a' }}>נמשך</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold" style={{ color: '#1e3a8a' }}>סה״כ הרוויח</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold" style={{ color: '#1e3a8a' }}>פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {agentsSummary?.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                        אין נתונים להצגה
                      </td>
                    </tr>
                  ) : (
                    agentsSummary?.map((agent) => (
                      <tr
                        key={agent.agentId}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-all"
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium">{agent.fullName}</div>
                          <div className="text-xs text-gray-500">{agent.phone}</div>
                        </td>
                        <td className="px-4 py-3">
                          <code className="px-2 py-1 bg-cyan-100 text-cyan-700 rounded text-sm">
                            {agent.couponCode?.toUpperCase() || '-'}
                          </code>
                        </td>
                        <td className="px-4 py-3 text-center font-medium">{agent.ordersCount}</td>
                        <td className="px-4 py-3 text-center" style={{ color: '#eab308' }}>
                          ₪{agent.pendingAmount?.toLocaleString() || 0}
                        </td>
                        <td className="px-4 py-3 text-center" style={{ color: '#16a34a' }}>
                          ₪{(agent.availableForWithdrawal ?? agent.currentBalance ?? 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-center font-bold" style={{ color: '#1e3a8a' }}>
                          ₪{agent.claimedAmount?.toLocaleString() || 0}
                        </td>
                        <td className="px-4 py-3 text-center font-bold" style={{ color: '#0891b2' }}>
                          ₪{agent.totalEarned?.toLocaleString() || 0}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => {
                                setFilters({ ...filters, agentId: agent.agentId });
                                setActiveTab('orders');
                              }}
                              className="px-3 py-1 text-sm rounded-lg text-white"
                              style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
                            >
                              צפה בעמלות
                            </button>
                            {isBusiness && (
                              <button
                                onClick={() => fetchAgentDetails(agent.agentId)}
                                className="px-3 py-1 text-sm rounded-lg border-2"
                                style={{ borderColor: '#0891b2', color: '#1e3a8a' }}
                                title="פירוט מכירות"
                              >
                                [LIST]
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden p-4 space-y-4">
              {agentsSummary?.length === 0 ? (
                <p className="text-center text-gray-500 py-8">אין נתונים להצגה</p>
              ) : (
                agentsSummary?.map((agent) => (
                  <div key={agent.agentId} className="p-4 rounded-xl border-2 border-gray-200 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold">{agent.fullName}</p>
                        <p className="text-xs text-gray-500">{agent.phone}</p>
                      </div>
                      <code className="px-2 py-1 bg-cyan-100 text-cyan-700 rounded text-sm">
                        {agent.couponCode?.toUpperCase() || '-'}
                      </code>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">הזמנות:</span>
                        <span className="mr-1 font-medium">{agent.ordersCount}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">ממתין:</span>
                        <span className="mr-1" style={{ color: '#eab308' }}>₪{agent.pendingAmount?.toLocaleString() || 0}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">זמין:</span>
                        <span className="mr-1" style={{ color: '#16a34a' }}>₪{(agent.availableForWithdrawal ?? agent.currentBalance ?? 0).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">נמשך:</span>
                        <span className="mr-1 font-bold" style={{ color: '#1e3a8a' }}>₪{agent.claimedAmount?.toLocaleString() || 0}</span>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
                      <div>
                        <span className="text-gray-500 text-sm">סה״כ הרוויח:</span>
                        <span className="mr-1 font-bold" style={{ color: '#0891b2' }}>₪{agent.totalEarned?.toLocaleString() || 0}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setFilters({ ...filters, agentId: agent.agentId });
                            setActiveTab('orders');
                          }}
                          className="px-3 py-1 text-sm rounded-lg text-white"
                          style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
                        >
                          צפה בעמלות
                        </button>
                        {isBusiness && (
                          <button
                            onClick={() => fetchAgentDetails(agent.agentId)}
                            className="px-3 py-1 text-sm rounded-lg border-2"
                            style={{ borderColor: '#0891b2', color: '#1e3a8a' }}
                          >
                            [LIST]
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead style={{ borderBottom: '2px solid #0891b2' }}>
                  <tr>
                    <th className="px-4 py-3 text-right text-xs font-semibold" style={{ color: '#1e3a8a' }}>תאריך</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold" style={{ color: '#1e3a8a' }}>סוג רכישה</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold" style={{ color: '#1e3a8a' }}>סוכן</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold" style={{ color: '#1e3a8a' }}>לקוח</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold" style={{ color: '#1e3a8a' }}>סכום הזמנה</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold" style={{ color: '#1e3a8a' }}>עמלה</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold" style={{ color: '#1e3a8a' }}>סטטוס</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold" style={{ color: '#1e3a8a' }}>תאריך שחרור</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions?.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                        אין עמלות להצגה
                      </td>
                    </tr>
                  ) : (
                    commissions?.map((c) => {
                      const statusInfo = STATUS_LABELS[c.commissionStatus] || STATUS_LABELS.pending;
                      const isGroup = c.orderTypeKind
                        ? c.orderTypeKind !== 'regular'
                        : c.orderType === 'group';
                      const orderTypeLabel =
                        c.orderTypeLabel ||
                        (c.orderTypeKind === 'shared_container'
                          ? 'מכולה משותפת'
                          : isGroup
                            ? 'רכישה קבוצתית'
                            : 'מכירה רגילה');
                      return (
                        <tr key={c.orderId} className="border-b border-gray-100 hover:bg-gray-50 transition-all">
                          <td className="px-4 py-3 text-sm">
                            {formatDateTime(c.orderDate)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {isGroup ? (
                              <span className="px-2 py-1 text-xs rounded-full bg-cyan-100 text-cyan-700">{orderTypeLabel}</span>
                            ) : (
                              <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">{orderTypeLabel}</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-start gap-2">
                              <div className="flex-1">
                                <div className="text-sm font-medium">{c.agent?.fullName || 'לא ידוע'}</div>
                                <code className="text-xs bg-cyan-50 text-cyan-700 px-1 rounded">
                                  {c.agent?.couponCode?.toUpperCase() || '-'}
                                </code>
                                {c.agent?.phone && (
                                  <div className="text-xs text-gray-500 mt-1">{c.agent.phone}</div>
                                )}
                              </div>
                              {c.agent?.id && (
                                <Link 
                                  href={`/admin/users/${c.agent.id}`}
                                  className="p-1 rounded hover:bg-gray-100 transition-all"
                                  title="צפה בפרופיל סוכן"
                                >
                                  <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                </Link>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm">{c.customerName}</div>
                            <div className="text-xs text-gray-500">{c.customerPhone}</div>
                          </td>
                          <td className="px-4 py-3 text-center">₪{c.orderTotal?.toLocaleString()}</td>
                          <td className="px-4 py-3 text-center font-bold" style={{ color: '#16a34a' }}>
                            ₪{c.commissionAmount?.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-1 text-xs rounded-full ${statusInfo.color}`}>
                              {statusInfo.label}
                            </span>
                            {c.commissionStatus === 'available' && !c.commissionSettled && (
                              <button
                                onClick={() => handleFixBalance(c.orderId)}
                                disabled={releasingId === c.orderId}
                                className="mt-1 px-2 py-1 text-xs rounded bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50"
                                title="תיקון יתרה - הסכום לא נוסף לסוכן"
                              >
                                {releasingId === c.orderId ? '...' : 'תקן יתרה'}
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center text-sm">
                            {editingDateId === c.orderId ? (
                              <div className="flex flex-col gap-1">
                                <input
                                  type="date"
                                  value={editingDateValue}
                                  onChange={(e) => setEditingDateValue(e.target.value)}
                                  className="px-2 py-1 border rounded text-sm"
                                  disabled={savingDate}
                                />
                                <div className="flex gap-1 justify-center">
                                  <button
                                    onClick={() => handleUpdateReleaseDate(c.orderId, editingDateValue)}
                                    disabled={savingDate}
                                    className="px-2 py-1 text-xs text-white rounded" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
                                  >
                                    {savingDate ? '...' : 'שמור'}
                                  </button>
                                  <button
                                    onClick={() => setEditingDateId(null)}
                                    className="px-2 py-1 text-xs bg-gray-300 rounded hover:bg-gray-400"
                                  >
                                    ביטול
                                  </button>
                                </div>
                              </div>
                            ) : c.commissionAvailableAt ? (
                              <div 
                                className="cursor-pointer hover:bg-gray-100 rounded p-1 transition-all"
                                onClick={() => {
                                  setEditingDateId(c.orderId);
                                  setEditingDateValue(new Date(c.commissionAvailableAt).toISOString().split('T')[0]);
                                }}
                                title="לחץ לעריכה"
                              >
                                <div className="text-gray-600 flex items-center justify-center gap-1">
                                  {formatDate(c.commissionAvailableAt)}
                                  <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                </div>
                                {c.commissionStatus === 'pending' && getDaysUntilAvailable(c.commissionAvailableAt) > 0 && (
                                  <div className="text-xs text-yellow-600">
                                    עוד {getDaysUntilAvailable(c.commissionAvailableAt)} ימים
                                  </div>
                                )}
                                {c.commissionStatus === 'pending' && getDaysUntilAvailable(c.commissionAvailableAt) <= 0 && (
                                  <div className="flex flex-col items-center gap-1">
                                    <div className="text-xs text-green-600 font-medium">מוכן לשחרור!</div>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleReleaseCommission(c.orderId); }}
                                      disabled={releasingId === c.orderId}
                                      className="px-2 py-1 text-xs rounded bg-gradient-to-r from-blue-900 to-cyan-600 text-white hover:opacity-90 disabled:opacity-50"
                                    >
                                      {releasingId === c.orderId ? 'משחרר...' : 'שחרר עכשיו'}
                                    </button>
                                  </div>
                                )}
                              </div>
                            ) : '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden p-4 space-y-4">
              {commissions?.length === 0 ? (
                <p className="text-center text-gray-500 py-8">אין עמלות להצגה</p>
              ) : (
                commissions?.map((c) => {
                  const statusInfo = STATUS_LABELS[c.commissionStatus] || STATUS_LABELS.pending;
                  const isGroup = c.orderTypeKind
                    ? c.orderTypeKind !== 'regular'
                    : c.orderType === 'group';
                  const mobileOrderTypeLabel =
                    c.orderTypeKind === 'shared_container' ? 'מכולה משותפת' : isGroup ? 'קבוצתית' : 'רגילה';
                  return (
                    <div key={c.orderId} className="p-4 rounded-xl border-2 border-gray-200 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs text-gray-500">{formatDateTime(c.orderDate)}</p>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{c.agent?.fullName || 'לא ידוע'}</p>
                            {c.agent?.id && (
                              <Link 
                                href={`/admin/users/${c.agent.id}`}
                                className="p-1 rounded bg-blue-50 hover:bg-blue-100"
                                title="פרופיל סוכן"
                              >
                                <svg className="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              </Link>
                            )}
                          </div>
                          {c.agent?.phone && (
                            <p className="text-xs text-gray-500">{c.agent.phone}</p>
                          )}
                          <code className="text-xs bg-cyan-50 text-cyan-700 px-1 rounded">
                            {c.agent?.couponCode?.toUpperCase() || '-'}
                          </code>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {isGroup ? (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-cyan-100 text-cyan-700">{mobileOrderTypeLabel}</span>
                          ) : (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">{mobileOrderTypeLabel}</span>
                          )}
                          <span className={`px-2 py-0.5 text-xs rounded-full ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-500">לקוח:</span>
                        <span className="mr-1">{c.customerName}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t border-gray-100">
                        <div>
                          <span className="text-gray-500">סכום הזמנה:</span>
                          <span className="mr-1">₪{c.orderTotal?.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">עמלה:</span>
                          <span className="mr-1 font-bold" style={{ color: '#16a34a' }}>
                            ₪{c.commissionAmount?.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      {/* Release Date - Mobile */}
                      <div className="pt-2 border-t border-gray-100">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">תאריך שחרור:</span>
                          {editingDateId === c.orderId ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="date"
                                value={editingDateValue}
                                onChange={(e) => setEditingDateValue(e.target.value)}
                                className="px-2 py-1 border rounded text-xs w-32"
                                disabled={savingDate}
                              />
                              <button
                                onClick={() => handleUpdateReleaseDate(c.orderId, editingDateValue)}
                                disabled={savingDate}
                                className="px-2 py-1 text-xs bg-green-500 text-white rounded"
                              >
                                [v]
                              </button>
                              <button
                                onClick={() => setEditingDateId(null)}
                                className="px-2 py-1 text-xs bg-gray-300 rounded"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <div 
                              className="flex items-center gap-1 cursor-pointer"
                              onClick={() => {
                                setEditingDateId(c.orderId);
                                setEditingDateValue(c.commissionAvailableAt ? new Date(c.commissionAvailableAt).toISOString().split('T')[0] : '');
                              }}
                            >
                              <span className="text-xs font-medium">{formatDate(c.commissionAvailableAt)}</span>
                              <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        {c.commissionStatus === 'pending' && c.commissionAvailableAt && getDaysUntilAvailable(c.commissionAvailableAt) > 0 && (
                          <div className="text-xs text-yellow-600 text-left mt-1">
                            עוד {getDaysUntilAvailable(c.commissionAvailableAt)} ימים
                          </div>
                        )}
                        {c.commissionStatus === 'pending' && c.commissionAvailableAt && getDaysUntilAvailable(c.commissionAvailableAt) <= 0 && (
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-green-600 font-medium">מוכן לשחרור!</span>
                            <button
                              onClick={() => handleReleaseCommission(c.orderId)}
                              disabled={releasingId === c.orderId}
                              className="px-3 py-1 text-xs rounded bg-gradient-to-r from-blue-900 to-cyan-600 text-white hover:opacity-90 disabled:opacity-50"
                            >
                              {releasingId === c.orderId ? 'משחרר...' : 'שחרר עכשיו'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Agent Details Modal */}
        {agentDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div 
              className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              style={{
                border: '2px solid transparent',
                backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)',
                backgroundOrigin: 'border-box',
                backgroundClip: 'padding-box, border-box',
              }}
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-white p-4 border-b flex justify-between items-center">
                <h3 
                  className="text-xl font-bold"
                  style={{
                    background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  פירוט מכירות - {agentDetails.agent?.fullName}
                </h3>
                <button
                  onClick={() => setAgentDetails(null)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-all"
                >
                  <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {loadingAgentDetails ? (
                <div className="p-8 text-center">
                  <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-500">טוען פרטי סוכן...</p>
                </div>
              ) : (
                <div className="p-4 space-y-4">
                  {/* Agent Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-sm text-gray-500">שם סוכן</p>
                      <p className="font-medium">{agentDetails.agent?.fullName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">טלפון</p>
                      <p className="font-medium">{agentDetails.agent?.phone || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">אימייל</p>
                      <p className="font-medium">{agentDetails.agent?.email || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">קוד קופון</p>
                      <code className="px-2 py-1 bg-cyan-100 text-cyan-700 rounded">
                        {agentDetails.agent?.couponCode?.toUpperCase() || '-'}
                      </code>
                    </div>
                    {agentDetails.agent?.vatId && (
                      <div>
                        <p className="text-sm text-gray-500">ת.ז / ח.פ</p>
                        <p className="font-medium">{agentDetails.agent.vatId}</p>
                      </div>
                    )}
                    {agentDetails.agent?.bankDetails?.bankName && (
                      <div className="md:col-span-2">
                        <p className="text-sm text-gray-500">פרטי בנק</p>
                        <p className="font-medium">
                          {agentDetails.agent.bankDetails.bankName} | 
                          סניף {agentDetails.agent.bankDetails.branchNumber} | 
                          חשבון {agentDetails.agent.bankDetails.accountNumber}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 bg-blue-50 rounded-xl text-center">
                      <p className="text-xs text-gray-500">סה״כ הזמנות</p>
                      <p className="text-lg font-bold" style={{ color: '#1e3a8a' }}>{agentDetails.summary?.totalOrders || 0}</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-xl text-center">
                      <p className="text-xs text-gray-500">סה״כ מכירות</p>
                      <p className="text-lg font-bold" style={{ color: '#16a34a' }}>₪{agentDetails.summary?.totalSales?.toLocaleString() || 0}</p>
                    </div>
                    <div className="p-3 bg-cyan-50 rounded-xl text-center">
                      <p className="text-xs text-gray-500">סה״כ עמלות</p>
                      <p className="text-lg font-bold" style={{ color: '#0891b2' }}>₪{agentDetails.summary?.totalCommissions?.toLocaleString() || 0}</p>
                    </div>
                    <div className="p-3 bg-yellow-50 rounded-xl text-center">
                      <p className="text-xs text-gray-500">ממתין לשחרור</p>
                      <p className="text-lg font-bold" style={{ color: '#eab308' }}>₪{agentDetails.summary?.pendingCommissions?.toLocaleString() || 0}</p>
                    </div>
                  </div>

                  {/* Sales Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead style={{ borderBottom: '2px solid #0891b2' }}>
                        <tr>
                          <th className="px-3 py-2 text-right text-xs font-semibold" style={{ color: '#1e3a8a' }}>תאריך</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold" style={{ color: '#1e3a8a' }}>מוצרים</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold" style={{ color: '#1e3a8a' }}>לקוח</th>
                          <th className="px-3 py-2 text-center text-xs font-semibold" style={{ color: '#1e3a8a' }}>סכום</th>
                          <th className="px-3 py-2 text-center text-xs font-semibold" style={{ color: '#1e3a8a' }}>עמלה</th>
                          <th className="px-3 py-2 text-center text-xs font-semibold" style={{ color: '#1e3a8a' }}>סטטוס</th>
                        </tr>
                      </thead>
                      <tbody>
                        {agentDetails.sales?.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-3 py-8 text-center text-gray-500">אין מכירות להצגה</td>
                          </tr>
                        ) : (
                          agentDetails.sales?.map((sale) => {
                            const statusInfo = STATUS_LABELS[sale.commissionStatus] || STATUS_LABELS.pending;
                            return (
                              <tr key={sale.orderId} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="px-3 py-2 text-xs">
                                  {new Date(sale.orderDate).toLocaleDateString('he-IL')}
                                </td>
                                <td className="px-3 py-2">
                                  {sale.items?.map((item, i) => (
                                    <div key={i} className="text-xs">
                                      {item.name} {item.sku ? `(${item.sku})` : ''} x{item.quantity}
                                    </div>
                                  ))}
                                </td>
                                <td className="px-3 py-2">
                                  <div className="text-xs">{sale.customer?.name}</div>
                                  <div className="text-xs text-gray-500">{sale.customer?.phone}</div>
                                </td>
                                <td className="px-3 py-2 text-center">₪{sale.totalAmount?.toLocaleString()}</td>
                                <td className="px-3 py-2 text-center font-bold" style={{ color: '#16a34a' }}>
                                  ₪{sale.commissionAmount?.toLocaleString()}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <span className={`px-2 py-0.5 text-xs rounded-full ${statusInfo.color}`}>
                                    {statusInfo.label}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
