'use client';

import { useState, useEffect } from 'react';
import { BUSINESS_MENU_ITEMS, BUSINESS_MENU_CATEGORIES, ALL_MENU_ITEMS } from '@/lib/businessMenuConfig';

/**
 * מודאל לניהול הרשאות תפריטים עבור Business Admin
 * מאפשר ל-Super Admin לקבוע איזה תפריטים יוצגו למנהל העסק
 */
export default function BusinessMenuPermissionsModal({ tenant, isOpen, onClose, onSave }) {
  const [selectedMenus, setSelectedMenus] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && tenant) {
      const currentMenus = Array.isArray(tenant.allowedMenus) ? tenant.allowedMenus : [];
      setSelectedMenus([...currentMenus]);
      setError('');
    }
  }, [isOpen, tenant]);

  const handleToggleMenu = (menuId) => {
    setSelectedMenus((prev) => {
      if (prev.includes(menuId)) {
        return prev.filter((m) => m !== menuId);
      }
      return [...prev, menuId];
    });
  };

  const handleToggleCategory = (categoryId) => {
    const category = BUSINESS_MENU_CATEGORIES[categoryId];
    if (!category) return;

    const allSelected = category.items.every((item) => selectedMenus.includes(item));
    
    if (allSelected) {
      // בטל את כל הפריטים בקטגוריה
      setSelectedMenus((prev) => prev.filter((m) => !category.items.includes(m)));
    } else {
      // בחר את כל הפריטים בקטגוריה
      const newMenus = [...selectedMenus];
      category.items.forEach((item) => {
        if (!newMenus.includes(item)) {
          newMenus.push(item);
        }
      });
      setSelectedMenus(newMenus);
    }
  };

  const handleSelectAll = () => {
    setSelectedMenus([...ALL_MENU_ITEMS]);
  };

  const handleDeselectAll = () => {
    setSelectedMenus([]);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      
      const res = await fetch(`/api/tenants/${tenant._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowedMenus: selectedMenus, allowedMenusConfigured: true }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'שמירת ההרשאות נכשלה');
      }

      const { tenant: updatedTenant } = await res.json();
      onSave(updatedTenant);
      onClose();
    } catch (err) {
      setError(err.message || 'שגיאה בשמירת ההרשאות');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" dir="rtl">
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
              הרשאות תפריטים - {tenant?.name}
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
            בחר את התפריטים שיוצגו למנהל העסק בדשבורד שלו
          </p>
        </div>

        {/* Quick Actions */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-3">
          <button
            type="button"
            onClick={handleSelectAll}
            className="text-xs px-3 py-1.5 rounded-lg font-semibold transition text-white"
            style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
          >
            בחר הכל
          </button>
          <button
            type="button"
            onClick={handleDeselectAll}
            className="text-xs px-3 py-1.5 rounded-lg font-semibold transition border-2"
            style={{ borderColor: '#0891b2', color: '#0891b2', background: 'white' }}
          >
            בטל הכל
          </button>
          <span className="text-sm text-gray-500 mr-auto">
            {selectedMenus.length} / {ALL_MENU_ITEMS.length} תפריטים נבחרו
          </span>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 220px)' }}>
          {error && (
            <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4">
              {error}
            </div>
          )}

          <div className="space-y-6">
            {Object.entries(BUSINESS_MENU_CATEGORIES).map(([categoryId, category]) => {
              const categoryItems = category.items;
              const allSelected = categoryItems.every((item) => selectedMenus.includes(item));
              const someSelected = categoryItems.some((item) => selectedMenus.includes(item));

              return (
                <div key={categoryId} className="bg-gray-50 rounded-xl p-4">
                  {/* Category Header */}
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-gray-800 flex items-center gap-2">
                      <span
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white"
                        style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
                      >
                        {getCategoryIcon(categoryId)}
                      </span>
                      {category.label}
                    </h4>
                    <button
                      type="button"
                      onClick={() => handleToggleCategory(categoryId)}
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

                  {/* Menu Items */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {categoryItems.map((menuId) => {
                      const menuItem = BUSINESS_MENU_ITEMS[menuId];
                      if (!menuItem) return null;
                      
                      const isSelected = selectedMenus.includes(menuId);

                      return (
                        <label
                          key={menuId}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition ${
                            isSelected ? 'bg-cyan-50 border-2 border-cyan-300' : 'bg-white border-2 border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleMenu(menuId)}
                            className="w-5 h-5 rounded text-cyan-600 focus:ring-cyan-500"
                            style={{ accentColor: '#0891b2' }}
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-gray-700 block truncate">{menuItem.label}</span>
                            {menuItem.isWidget && (
                              <span className="text-xs text-gray-400">ווידג&apos;ט</span>
                            )}
                          </div>
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
            {selectedMenus.length === 0 && (
              <span className="text-orange-600 font-medium">
                שים לב: לא נבחרו תפריטים - מנהל העסק יראה רק את הדף הראשי
              </span>
            )}
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

function getCategoryIcon(categoryId) {
  switch (categoryId) {
    case 'users':
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      );
    case 'catalog':
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      );
    case 'finance':
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'settings':
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    case 'widgets':
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
      );
    default:
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      );
  }
}
