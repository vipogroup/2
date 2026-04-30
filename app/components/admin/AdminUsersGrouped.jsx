'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Users, Building2, Search, Phone, Mail } from 'lucide-react';
import { buildWhatsAppUrl } from '@/lib/whatsapp';

export default function AdminUsersGrouped() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedTenants, setExpandedTenants] = useState({});
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/users-by-tenant');
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setData(json);
      
      // Expand all tenants by default
      const expanded = {};
      json.tenantGroups?.forEach(group => {
        expanded[group.tenant._id] = true;
      });
      setExpandedTenants(expanded);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function toggleTenant(tenantId) {
    setExpandedTenants(prev => ({
      ...prev,
      [tenantId]: !prev[tenantId]
    }));
  }

  function filterUsers(users) {
    if (!searchQuery) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(u => 
      u.fullName?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.phone?.includes(q)
    );
  }

  const roleLabels = {
    admin: { label: 'מנהל', color: 'bg-red-100 text-red-800' },
    business_admin: { label: 'בעל עסק', color: 'bg-cyan-100 text-cyan-800' },
    agent: { label: 'סוכן', color: 'bg-green-100 text-green-800' },
    customer: { label: 'לקוח', color: 'bg-blue-100 text-blue-800' },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="bg-white rounded-xl p-8 shadow-lg">
          <div className="animate-spin rounded-full h-12 w-12 mx-auto mb-4" style={{
            border: '4px solid rgba(8, 145, 178, 0.2)',
            borderTopColor: '#0891b2',
          }}></div>
          <p className="text-gray-600 text-center font-medium">טוען משתמשים...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-2 border-red-200 text-red-700 px-6 py-4 rounded-xl">
        {error}
      </div>
    );
  }

  const filteredSystemUsers = filterUsers(data?.systemUsers || []);
  const filteredTenantGroups = data?.tenantGroups?.map(group => ({
    ...group,
    users: filterUsers(group.users)
  })).filter(group => group.users.length > 0 || !searchQuery) || [];

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="חפש לפי שם, טלפון או מייל..."
            className="w-full px-4 py-2.5 pr-10 rounded-xl border-2 border-gray-200 focus:border-cyan-500 focus:outline-none"
          />
        </div>
        <div className="flex gap-4 mt-3 text-sm text-gray-600">
          <span>סה״כ: <strong>{data?.totalUsers || 0}</strong> משתמשים</span>
          <span>מערכת ראשית: <strong>{data?.totalSystemUsers || 0}</strong></span>
          <span>עסקים: <strong>{data?.totalTenantUsers || 0}</strong></span>
        </div>
      </div>

      {/* System Users Section */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div 
          className="p-4 flex items-center justify-between cursor-pointer"
          style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
          onClick={() => setExpandedTenants(prev => ({ ...prev, system: !prev.system }))}
        >
          <div className="flex items-center gap-3 text-white">
            <Users className="w-6 h-6" />
            <div>
              <h2 className="text-lg font-bold">משתמשי המערכת הראשית</h2>
              <p className="text-white/80 text-sm">{filteredSystemUsers.length} משתמשים</p>
            </div>
          </div>
          {expandedTenants.system ? (
            <ChevronUp className="w-6 h-6 text-white" />
          ) : (
            <ChevronDown className="w-6 h-6 text-white" />
          )}
        </div>
        
        {expandedTenants.system !== false && (
          <div className="p-4">
            {filteredSystemUsers.length === 0 ? (
              <p className="text-gray-500 text-center py-4">אין משתמשים</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">שם</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">אימייל</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">טלפון</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">תפקיד</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">תאריך</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredSystemUsers.map(user => (
                      <UserRow key={user._id} user={user} roleLabels={roleLabels} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tenant Groups */}
      {filteredTenantGroups.map(group => (
        <div key={group.tenant._id} className="bg-white rounded-xl shadow-md overflow-hidden">
          <div 
            className="p-4 flex items-center justify-between cursor-pointer border-r-4"
            style={{ 
              borderRightColor: '#0891b2',
              background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.05) 0%, rgba(8, 145, 178, 0.05) 100%)'
            }}
            onClick={() => toggleTenant(group.tenant._id)}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}>
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">{group.tenant.name}</h2>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">/t/{group.tenant.slug}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    group.tenant.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {group.tenant.status === 'active' ? 'פעיל' : 'ממתין'}
                  </span>
                  <span className="text-gray-600">{group.users.length} משתמשים</span>
                </div>
              </div>
            </div>
            {expandedTenants[group.tenant._id] ? (
              <ChevronUp className="w-6 h-6 text-gray-400" />
            ) : (
              <ChevronDown className="w-6 h-6 text-gray-400" />
            )}
          </div>
          
          {expandedTenants[group.tenant._id] && (
            <div className="p-4 border-t border-gray-100">
              {group.users.length === 0 ? (
                <p className="text-gray-500 text-center py-4">אין משתמשים בעסק זה</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">שם</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">אימייל</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">טלפון</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">תפקיד</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">תאריך</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {group.users.map(user => (
                        <UserRow key={user._id} user={user} roleLabels={roleLabels} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function UserRow({ user, roleLabels }) {
  const role = roleLabels[user.role] || { label: user.role, color: 'bg-gray-100 text-gray-800' };
  
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3 whitespace-nowrap">
        <span className="font-medium text-gray-900">{user.fullName || '-'}</span>
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
        {user.email || '-'}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">{user.phone || '-'}</span>
          {user.phone && (
            <a
              href={buildWhatsAppUrl(user.phone, `היי ${user.fullName || ''}`)}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 py-1 text-xs font-medium text-white rounded"
              style={{ background: '#0891b2' }}
            >
              WA
            </a>
          )}
        </div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <span className={`px-2 py-1 text-xs rounded-full ${role.color}`}>
          {role.label}
        </span>
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
        {user.createdAt ? new Date(user.createdAt).toLocaleDateString('he-IL') : '-'}
      </td>
    </tr>
  );
}
