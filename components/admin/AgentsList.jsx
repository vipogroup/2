'use client';

import { useState, useEffect } from 'react';

export default function AgentsList({ embedded = false }) {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);
  const [copiedAgentId, setCopiedAgentId] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    commissionPercent: 10,
    discountPercent: 10,
  });

  useEffect(() => {
    fetchAgents();
  }, []);

  async function fetchAgents() {
    try {
      setLoading(true);
      const res = await fetch('/api/agents');
      if (!res.ok) throw new Error('Failed to fetch agents');
      const data = await res.json();
      setAgents(data.agents || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleCopyCoupon(agent) {
    if (!agent?.couponCode) return;
    navigator.clipboard.writeText(agent.couponCode.toUpperCase());
    setCopiedAgentId(agent._id);
    setTimeout(() => setCopiedAgentId(null), 2000);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    try {
      const url = editingAgent ? `/api/agents/${editingAgent._id}` : '/api/agents';
      const method = editingAgent ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save agent');
      }

      // Reset form and refresh list
      setFormData({ fullName: '', email: '', phone: '', password: '', commissionPercent: 10, discountPercent: 10 });
      setEditingAgent(null);
      setShowForm(false);
      fetchAgents();
    } catch (err) {
      setError(err.message);
    }
  }

  function handleEdit(agent) {
    setEditingAgent(agent);
    setFormData({
      fullName: agent.fullName,
      email: agent.email,
      phone: agent.phone,
      password: '', // Don't populate password
      commissionPercent: agent.commissionPercent ?? 10,
      discountPercent: agent.discountPercent ?? 10,
    });
    setShowForm(true);
  }

  function handleCancel() {
    setShowForm(false);
    setEditingAgent(null);
    setFormData({ fullName: '', email: '', phone: '', password: '', commissionPercent: 10, discountPercent: 10 });
    setError('');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-gray-200 rounded-full"></div>
          <div
            className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin absolute top-0"
            style={{
              borderTopColor: '#0891b2',
              borderRightColor: '#0891b2',
              borderBottomColor: '#1e3a8a',
            }}
          ></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header - hidden when embedded */}
      {!embedded && (
      <div className="bg-white rounded-lg sm:rounded-xl shadow-md p-3 sm:p-4 mb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
          <div>
            <p className="text-sm sm:text-base text-gray-600">סה״כ {agents.length} סוכנים במערכת</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="text-white font-semibold px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 text-sm sm:text-base self-start sm:self-auto"
            style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background =
                'linear-gradient(135deg, #0891b2 0%, #1e3a8a 100%)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background =
                'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            הוסף סוכן
          </button>
        </div>
      </div>
      )}

      {error && (
        <div className="bg-white rounded-xl p-4 mb-6 border-2" style={{ borderColor: '#ef4444' }}>
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5"
              style={{ color: '#ef4444' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm font-medium" style={{ color: '#ef4444' }}>
              {error}
            </span>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3
              className="text-xl font-bold mb-6"
              style={{
                background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {editingAgent ? 'עריכת סוכן' : 'הוספת סוכן חדש'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">שם מלא</label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">אימייל</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">טלפון</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  סיסמה {editingAgent && '(השאר ריק לשמירת הסיסמה הנוכחית)'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required={!editingAgent}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">עמלה (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.commissionPercent}
                    onChange={(e) => setFormData({ ...formData, commissionPercent: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">הנחה (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.discountPercent}
                    onChange={(e) => setFormData({ ...formData, discountPercent: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 border-2 rounded-lg font-medium transition-all"
                  style={{ borderColor: '#e5e7eb' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f3f4f6')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white rounded-lg font-medium transition-all shadow-md"
                  style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background =
                      'linear-gradient(135deg, #0891b2 0%, #1e3a8a 100%)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background =
                      'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {editingAgent ? 'עדכן' : 'הוסף'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Desktop Table & Mobile Cards */}
      <div className="bg-white rounded-lg sm:rounded-xl shadow-md overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead
              style={{
                background:
                  'linear-gradient(135deg, rgba(30, 58, 138, 0.05) 0%, rgba(8, 145, 178, 0.05) 100%)',
                borderBottom: '2px solid #0891b2',
              }}
            >
              <tr>
                <th
                  className="px-4 py-3 text-right text-xs font-semibold"
                  style={{ color: '#1e3a8a' }}
                >
                  שם
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-semibold"
                  style={{ color: '#1e3a8a' }}
                >
                  אימייל
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-semibold"
                  style={{ color: '#1e3a8a' }}
                >
                  טלפון
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-semibold"
                  style={{ color: '#1e3a8a' }}
                >
                  קוד קופון
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-semibold"
                  style={{ color: '#1e3a8a' }}
                >
                  הנחה
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-semibold"
                  style={{ color: '#1e3a8a' }}
                >
                  עמלה
                </th>
                <th
                  className="hidden lg:table-cell px-4 py-3 text-right text-xs font-semibold"
                  style={{ color: '#1e3a8a' }}
                >
                  סטטוס קופון
                </th>
                <th
                  className="hidden lg:table-cell px-4 py-3 text-right text-xs font-semibold"
                  style={{ color: '#1e3a8a' }}
                >
                  סטטוס משתמש
                </th>
                <th
                  className="hidden xl:table-cell px-4 py-3 text-right text-xs font-semibold"
                  style={{ color: '#1e3a8a' }}
                >
                  תאריך יצירה
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-semibold"
                  style={{ color: '#1e3a8a' }}
                >
                  פעולות
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {agents.map((agent) => (
                <tr key={agent._id} className="transition-all hover:bg-gray-50">
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-gray-900 font-medium">
                    {agent.fullName}
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-gray-700 break-all">{agent.email}</td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">{agent.phone || '-'}</td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">
                        {(agent.couponCode || '---').toUpperCase()}
                      </code>
                      <button
                        onClick={() => handleCopyCoupon(agent)}
                        disabled={!agent.couponCode}
                        className="text-xs"
                        style={{ color: '#0891b2' }}
                        title="העתק קוד קופון"
                      >
                        {copiedAgentId === agent._id ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="hidden md:table-cell px-4 sm:px-6 py-4 whitespace-nowrap text-gray-700">
                    {agent.discountPercent ?? 0}%
                  </td>
                  <td className="hidden md:table-cell px-4 sm:px-6 py-4 whitespace-nowrap text-gray-700">
                    {agent.commissionPercent ?? 0}%
                  </td>
                  <td className="hidden lg:table-cell px-4 sm:px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        agent.couponStatus === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {agent.couponStatus === 'active' ? 'פעיל' : 'לא פעיל'}
                    </span>
                  </td>
                  <td className="hidden lg:table-cell px-4 sm:px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        agent.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {agent.isActive ? 'פעיל' : 'לא פעיל'}
                    </span>
                  </td>
                  <td className="hidden xl:table-cell px-4 sm:px-6 py-4 whitespace-nowrap text-gray-500">
                    {new Date(agent.createdAt).toLocaleDateString('he-IL')}
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleEdit(agent)}
                      className="text-white font-medium px-3 py-1.5 rounded-lg text-xs"
                      style={{ background: '#0891b2' }}
                    >
                      ערוך
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden p-4 space-y-3">
          {agents.map((agent) => (
            <div key={agent._id} className="p-4 rounded-lg border-2 border-gray-200 bg-white">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900 mb-1">{agent.fullName}</p>
                  <p className="text-xs text-gray-500 break-all">{agent.email}</p>
                  {agent.phone && <p className="text-xs text-gray-500 mt-1">{agent.phone}</p>}
                </div>
                <div className="flex gap-2">
                  <span
                    className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${
                      agent.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {agent.isActive ? 'פעיל' : 'לא פעיל'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div>
                  <span className="text-gray-500">קוד קופון:</span>
                  <div className="flex items-center gap-1 mt-1">
                    <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">
                      {(agent.couponCode || '---').toUpperCase()}
                    </code>
                    <button
                      onClick={() => handleCopyCoupon(agent)}
                      disabled={!agent.couponCode}
                      className="text-xs"
                      style={{ color: '#0891b2' }}
                      title="העתק קוד קופון"
                    >
                      {copiedAgentId === agent._id ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">הנחה:</span>
                  <span className="font-semibold mr-1" style={{ color: '#1e3a8a' }}>
                    {agent.discountPercent ?? 0}%
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">עמלה:</span>
                  <span className="font-semibold mr-1" style={{ color: '#16a34a' }}>
                    {agent.commissionPercent ?? 0}%
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">סטטוס קופון:</span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full mr-1 ${
                      agent.couponStatus === 'active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {agent.couponStatus === 'active' ? 'פעיל' : 'לא פעיל'}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  {new Date(agent.createdAt).toLocaleDateString('he-IL')}
                </p>
                <button
                  onClick={() => handleEdit(agent)}
                  className="text-white font-medium px-3 py-1.5 rounded-lg text-xs"
                  style={{ background: '#0891b2' }}
                >
                  ערוך
                </button>
              </div>
            </div>
          ))}
        </div>

        {agents.length === 0 && (
          <div className="p-8 sm:p-12 text-center">
            <div
              className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
              style={{
                background:
                  'linear-gradient(135deg, rgba(30, 58, 138, 0.1) 0%, rgba(8, 145, 178, 0.1) 100%)',
              }}
            >
              <svg
                className="w-8 h-8"
                style={{ color: '#0891b2' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <p className="text-gray-600 font-medium mb-2">אין סוכנים במערכת</p>
            <p className="text-sm text-gray-500">לחץ על &quot;הוסף סוכן&quot; כדי להתחיל</p>
          </div>
        )}
      </div>
    </div>
  );
}
