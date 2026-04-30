'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

type CatalogProduct = {
  _id: string;
  title: string;
  category: string;
  price: number;
  images: string[];
  createdAt: string | null;
};

type CatalogFormData = {
  title: string;
  description: string;
  price: string;
  category: string;
  image: string;
};

type Tenant = {
  _id: string;
  name: string;
  status: string;
};

export default function CatalogManagerPage() {
  const [items, setItems] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [formData, setFormData] = useState<CatalogFormData>({
    title: '',
    description: '',
    price: '',
    category: '',
    image: '',
  });
  
  // Selection & Copy to Tenant
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [copying, setCopying] = useState(false);
  const [copyMessage, setCopyMessage] = useState('');
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    const res = await fetch('/api/admin/catalog-manager');
    if (!res.ok) {
      throw new Error('Failed to load catalog products');
    }
    const data = await res.json();
    return Array.isArray(data?.items) ? data.items : [];
  }, []);

  const loadTenants = useCallback(async () => {
    const res = await fetch('/api/tenants');
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.tenants) ? data.tenants.filter((t: Tenant) => t.status === 'active') : [];
  }, []);

  useEffect(() => {
    let isActive = true;

    const load = async () => {
      try {
        setLoading(true);
        const [nextItems, nextTenants] = await Promise.all([loadItems(), loadTenants()]);
        if (isActive) {
          setItems(nextItems);
          setTenants(nextTenants);
          setError('');
        }
      } catch (err) {
        if (isActive) {
          setError(err?.message || 'Failed to load catalog products');
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      isActive = false;
    };
  }, [loadItems, loadTenants]);

  // Toggle selection
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map(i => i._id));
    }
  };

  // Copy to tenant
  const handleCopyToTenant = async () => {
    if (selectedIds.length === 0) {
      setCopyMessage('יש לבחור מוצרים להעתקה');
      return;
    }
    if (!selectedTenantId) {
      setCopyMessage('יש לבחור עסק יעד');
      return;
    }

    setCopying(true);
    setCopyMessage('');

    try {
      const res = await fetch('/api/admin/catalog-manager/copy-to-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productIds: selectedIds,
          tenantId: selectedTenantId,
        }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data?.error || 'שגיאה בהעתקה');
      }

      setCopyMessage(data.message || `הועתקו ${data.copied} מוצרים בהצלחה!`);
      setSelectedIds([]);
    } catch (err) {
      setCopyMessage(err?.message || 'שגיאה בהעתקת המוצרים');
    } finally {
      setCopying(false);
    }
  };

  const handleDuplicate = async (item: CatalogProduct) => {
    setDuplicatingId(item._id);
    try {
      const payload = {
        title: `${item.title} (עותק)`,
        description: '',
        price: item.price,
        category: item.category,
        images: item.images || [],
      };

      const res = await fetch('/api/admin/catalog-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'שגיאה בשכפול המוצר');
      }

      const nextItems = await loadItems();
      setItems(nextItems);
    } catch (err) {
      alert(err?.message || 'שגיאה בשכפול המוצר');
    } finally {
      setDuplicatingId(null);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      price: '',
      category: '',
      image: '',
    });
  };

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError('');

    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        price: formData.price,
        category: formData.category,
        images: formData.image ? [formData.image] : [],
      };

      const res = await fetch('/api/admin/catalog-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to create catalog product');
      }

      const nextItems = await loadItems();
      setItems(nextItems);
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      setSubmitError(err?.message || 'Failed to create catalog product');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ניהול קטלוג מוצרים</h1>
          <p className="text-gray-500 text-sm">Catalog Manager - בחר מוצרים והעתק לחנויות</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            type="button" 
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + הוסף מוצר לקטלוג
          </button>
          <Link
            href="/admin"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            חזרה לדשבורד
          </Link>
        </div>
      </div>

      {/* Copy to Tenant Section */}
      {items.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-3">העתקת מוצרים לחנות</h3>
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">נבחרו:</span>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                {selectedIds.length} מוצרים
              </span>
            </div>
            
            <select
              value={selectedTenantId}
              onChange={(e) => setSelectedTenantId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[200px]"
            >
              <option value="">בחר חנות יעד...</option>
              {tenants.map((tenant) => (
                <option key={tenant._id} value={tenant._id}>
                  {tenant.name}
                </option>
              ))}
            </select>
            
            <button
              onClick={handleCopyToTenant}
              disabled={copying || selectedIds.length === 0 || !selectedTenantId}
              className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              {copying ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                  מעתיק...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg> העתק לחנות
                </>
              )}
            </button>
          </div>
          
          {copyMessage && (
            <div className={`mt-3 p-2 rounded-lg text-sm ${
              copyMessage.includes('שגיאה') || copyMessage.includes('יש לבחור') 
                ? 'bg-red-100 text-red-700' 
                : 'bg-green-100 text-green-700'
            }`}>
              {copyMessage}
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-200 border-t-blue-600"></div>
        </div>
      )}

      {!loading && error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">{error}</div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <div className="mb-3"><svg className="w-10 h-10 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg></div>
          <p>עדיין אין מוצרים בקטלוג</p>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-right">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === items.length && items.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">תמונה</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">כותרת</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">קטגוריה</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">מחיר</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">תאריך</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">פעולות</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item) => (
                <tr 
                  key={item._id} 
                  className={`hover:bg-gray-50 cursor-pointer ${selectedIds.includes(item._id) ? 'bg-blue-50' : ''}`}
                  onClick={() => toggleSelect(item._id)}
                >
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item._id)}
                      onChange={() => toggleSelect(item._id)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    {item.images?.[0] ? (
                      <Image 
                        src={item.images[0]} 
                        alt={item.title} 
                        width={50} 
                        height={50} 
                        className="rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                        📷
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{item.title}</td>
                  <td className="px-4 py-3 text-gray-600">{item.category || '-'}</td>
                  <td className="px-4 py-3 text-gray-900">₪{item.price}</td>
                  <td className="px-4 py-3 text-gray-500 text-sm">
                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString('he-IL') : '-'}
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleDuplicate(item)}
                      disabled={duplicatingId === item._id}
                      className="px-3 py-1.5 text-sm bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
                      title="שכפל מוצר"
                    >
                      {duplicatingId === item._id ? (
                        <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      )}
                      שכפל
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <dialog open>
          <form onSubmit={handleCreate}>
            <h2>הוספת מוצר לקטלוג</h2>

            {submitError && <div>{submitError}</div>}

            <div>
              <label htmlFor="title">כותרת</label>
              <input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <label htmlFor="description">תיאור</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <label htmlFor="price">מחיר</label>
              <input
                id="price"
                name="price"
                type="number"
                value={formData.price}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <label htmlFor="category">קטגוריה</label>
              <input
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <label htmlFor="image">Image URL</label>
              <input
                id="image"
                name="image"
                value={formData.image}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <button type="submit">שמור</button>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
              >
                בטל
              </button>
            </div>
          </form>
        </dialog>
      )}
    </div>
  );
}
