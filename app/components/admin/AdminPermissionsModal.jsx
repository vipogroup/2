'use client';

import { useState, useEffect } from 'react';
import { ADMIN_PERMISSIONS } from '@/lib/superAdmins';

const PERMISSION_GROUPS = {
  'ניהול משתמשים': [
    { key: ADMIN_PERMISSIONS.VIEW_USERS, label: 'צפייה במשתמשים' },
    { key: ADMIN_PERMISSIONS.EDIT_USERS, label: 'עריכת משתמשים' },
    { key: ADMIN_PERMISSIONS.DELETE_USERS, label: 'מחיקת משתמשים' },
    { key: ADMIN_PERMISSIONS.CHANGE_USER_ROLES, label: 'שינוי תפקידי משתמשים' },
  ],
  'ניהול מוצרים': [
    { key: ADMIN_PERMISSIONS.VIEW_PRODUCTS, label: 'צפייה במוצרים' },
    { key: ADMIN_PERMISSIONS.EDIT_PRODUCTS, label: 'עריכת מוצרים' },
    { key: ADMIN_PERMISSIONS.DELETE_PRODUCTS, label: 'מחיקת מוצרים' },
  ],
  'ניהול הזמנות': [
    { key: ADMIN_PERMISSIONS.VIEW_ORDERS, label: 'צפייה בהזמנות' },
    { key: ADMIN_PERMISSIONS.EDIT_ORDERS, label: 'עריכת הזמנות' },
    { key: ADMIN_PERMISSIONS.DELETE_ORDERS, label: 'מחיקת הזמנות' },
  ],
  'דוחות וניתוחים': [
    { key: ADMIN_PERMISSIONS.VIEW_REPORTS, label: 'צפייה בדוחות' },
    { key: ADMIN_PERMISSIONS.VIEW_ANALYTICS, label: 'צפייה בניתוחים' },
    { key: ADMIN_PERMISSIONS.EXPORT_DATA, label: 'ייצוא נתונים' },
  ],
  'התראות': [
    { key: ADMIN_PERMISSIONS.MANAGE_NOTIFICATIONS, label: 'ניהול תבניות התראות' },
    { key: ADMIN_PERMISSIONS.SEND_NOTIFICATIONS, label: 'שליחת התראות' },
  ],
  'הגדרות מערכת': [
    { key: ADMIN_PERMISSIONS.VIEW_SETTINGS, label: 'צפייה בהגדרות' },
    { key: ADMIN_PERMISSIONS.EDIT_SETTINGS, label: 'עריכת הגדרות' },
  ],
  'ניהול סוכנים': [
    { key: ADMIN_PERMISSIONS.VIEW_AGENTS, label: 'צפייה בסוכנים' },
    { key: ADMIN_PERMISSIONS.MANAGE_AGENTS, label: 'ניהול סוכנים' },
    { key: ADMIN_PERMISSIONS.VIEW_COMMISSIONS, label: 'צפייה בעמלות' },
    { key: ADMIN_PERMISSIONS.EDIT_COMMISSIONS, label: 'עריכת עמלות' },
  ],
  'כלי בדיקות': [
    { key: ADMIN_PERMISSIONS.MANAGE_TEST_HARNESS, label: 'ניהול Test Harness' },
  ],
};

export default function AdminPermissionsModal({ user, isOpen, onClose, onSave }) {
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && user) {
      console.log('AdminPermissionsModal opened for user:', user);
      setSelectedPermissions(user.permissions || []);
      setError('');
    }
  }, [isOpen, user]);

  const handleTogglePermission = (permission) => {
    setSelectedPermissions((prev) => {
      if (prev.includes(permission)) {
        return prev.filter((p) => p !== permission);
      }
      return [...prev, permission];
    });
  };

  const handleToggleGroup = (groupPermissions) => {
    const allSelected = groupPermissions.every((p) => selectedPermissions.includes(p.key));
    
    if (allSelected) {
      setSelectedPermissions((prev) => prev.filter((p) => !groupPermissions.find((gp) => gp.key === p)));
    } else {
      const newPerms = [...selectedPermissions];
      groupPermissions.forEach((p) => {
        if (!newPerms.includes(p.key)) {
          newPerms.push(p.key);
        }
      });
      setSelectedPermissions(newPerms);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      
      const res = await fetch(`/api/users/${user._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: selectedPermissions }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update permissions');
      }

      const { user: updatedUser } = await res.json();
      onSave(updatedUser);
      onClose();
    } catch (err) {
      setError(err.message || 'שמירת ההרשאות נכשלה');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3
              className="text-xl font-bold"
              style={{
                background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              הרשאות מנהל - {user?.fullName || user?.email}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            בחר את ההרשאות שהמנהל יוכל לגשת אליהן
          </p>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 180px)' }}>
          {error && (
            <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4">
              {error}
            </div>
          )}

          <div className="space-y-6">
            {Object.entries(PERMISSION_GROUPS).map(([groupName, permissions]) => {
              const allSelected = permissions.every((p) => selectedPermissions.includes(p.key));
              const someSelected = permissions.some((p) => selectedPermissions.includes(p.key));

              return (
                <div key={groupName} className="bg-gray-50 rounded-xl p-4">
                  {/* Group Header */}
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-gray-800">{groupName}</h4>
                    <button
                      type="button"
                      onClick={() => handleToggleGroup(permissions)}
                      className="text-xs px-3 py-1 rounded-lg font-semibold transition"
                      style={{
                        background: allSelected ? '#0891b2' : 'white',
                        color: allSelected ? 'white' : '#0891b2',
                        border: '2px solid #0891b2',
                      }}
                    >
                      {allSelected ? 'בטל הכל' : 'בחר הכל'}
                    </button>
                  </div>

                  {/* Permissions */}
                  <div className="space-y-2">
                    {permissions.map((permission) => {
                      const isSelected = selectedPermissions.includes(permission.key);

                      return (
                        <label
                          key={permission.key}
                          className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition hover:bg-white"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleTogglePermission(permission.key)}
                            className="w-5 h-5 rounded text-cyan-600 focus:ring-cyan-500"
                            style={{ accentColor: '#0891b2' }}
                          />
                          <span className="text-sm text-gray-700">{permission.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {selectedPermissions.length} הרשאות נבחרו
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-lg font-semibold text-gray-700 bg-white border-2 border-gray-300 hover:bg-gray-50 transition disabled:opacity-50"
            >
              ביטול
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 rounded-lg font-semibold text-white transition disabled:opacity-50"
              style={{
                background: saving ? '#6b7280' : 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
                cursor: saving ? 'wait' : 'pointer',
              }}
            >
              {saving ? 'שומר...' : 'שמור הרשאות'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
