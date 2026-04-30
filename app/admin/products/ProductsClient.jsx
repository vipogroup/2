'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { refreshProductsFromApi, getProducts } from '@/app/lib/products';
import { isSuperAdminUser } from '@/lib/superAdmins';

export default function ProductsClient({ tenantId = null, embedded = false }) {
  const pathname = usePathname();
  const basePath = pathname?.startsWith('/business') ? '/business' : '/admin';
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tenants, setTenants] = useState([]);
  const [selectedTenantId, setSelectedTenantId] = useState(tenantId || '');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState(() => new Set());
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [sortField, setSortField] = useState('position');
  const [sortDirection, setSortDirection] = useState('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSaleType, setFilterSaleType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterStock, setFilterStock] = useState('');
  const [quickFilter, setQuickFilter] = useState('');
  const [editingCell, setEditingCell] = useState(null); // { productId, field }
  const [editValue, setEditValue] = useState('');

  // Marketplace visibility toggles
  const [marketplaceVisibility, setMarketplaceVisibility] = useState({
    marketplaceShowStock: true,
    marketplaceShowGroup: true,
    marketplaceShowSharedContainer: true,
  });
  const [visibilityLoading, setVisibilityLoading] = useState(false);

  const selectedCount = selectedProducts.size;

  const canManageAllCategories = useMemo(() => {
    if (embedded) return false;
    if (basePath !== '/admin') return false;
    return isSuperAdminUser(user);
  }, [basePath, embedded, user]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json().catch(() => ({}));
        setUser(data?.user || null);

        // If user has a tenantId (business_admin), auto-select it
        if (data?.user?.tenantId && !tenantId) {
          setSelectedTenantId(data.user.tenantId);
        }

        // Fetch tenants list for super_admin — default view is ALL stores (marketplace-wide)
        if (isSuperAdminUser(data?.user)) {
          try {
            const tenantsRes = await fetch('/api/tenants', { credentials: 'include' });
            if (tenantsRes.ok) {
              const tenantsData = await tenantsRes.json();
              const list = tenantsData.tenants || tenantsData || [];
              setTenants(list);
            }
          } catch {}
        }
      } catch {
        // ignore
      }
    })();
  }, [tenantId]);

  // Load marketplace visibility settings
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/settings', { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        if (data?.settings) {
          setMarketplaceVisibility({
            marketplaceShowStock: data.settings.marketplaceShowStock !== false,
            marketplaceShowGroup: data.settings.marketplaceShowGroup !== false,
            marketplaceShowSharedContainer: data.settings.marketplaceShowSharedContainer !== false,
          });
        }
      } catch {
        // ignore - defaults are all true
      }
    })();
  }, []);

  // Toggle marketplace visibility setting
  const toggleMarketplaceVisibility = async (key) => {
    const newValue = !marketplaceVisibility[key];
    const updated = { ...marketplaceVisibility, [key]: newValue };
    setMarketplaceVisibility(updated);
    setVisibilityLoading(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ settings: { [key]: newValue } }),
      });
      if (!res.ok) {
        // Revert on failure
        setMarketplaceVisibility(prev => ({ ...prev, [key]: !newValue }));
        alert('שגיאה בשמירת ההגדרה');
      } else if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem(
            'marketplace_home_settings_v1',
            JSON.stringify({
              timestamp: Date.now(),
              value: {
                marketplaceShowStock: updated.marketplaceShowStock,
                marketplaceShowGroup: updated.marketplaceShowGroup,
                marketplaceShowSharedContainer: updated.marketplaceShowSharedContainer,
              },
            }),
          );
        } catch {
          /* ignore */
        }
      }
    } catch {
      setMarketplaceVisibility(prev => ({ ...prev, [key]: !newValue }));
      alert('שגיאה בשמירת ההגדרה');
    } finally {
      setVisibilityLoading(false);
    }
  };

  // Get unique categories for filter
  const categories = useMemo(() => {
    const cats = [...new Set(products.map(p => p.category).filter(Boolean))];
    return cats.sort((a, b) => a.localeCompare(b, 'he'));
  }, [products]);

  // Filter and sort products
  const filteredAndSortedProducts = useMemo(() => {
    let result = [...products];
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      result = result.filter(p => 
        p.name?.toLowerCase().includes(query) ||
        p.sku?.toLowerCase().includes(query) ||
        p.category?.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
      );
    }
    
    // Category filter
    if (filterCategory) {
      result = result.filter(p => p.category === filterCategory);
    }
    
    // Sale type filter
    if (filterSaleType) {
      if (filterSaleType === 'shared_container') {
        result = result.filter(p => p.groupPurchaseType === 'shared_container');
      } else if (filterSaleType === 'group') {
        result = result.filter(p => (p.purchaseType === 'group' || p.type === 'group') && p.groupPurchaseType !== 'shared_container');
      } else {
        result = result.filter(p => p.purchaseType !== 'group' && p.type !== 'group');
      }
    }
    
    // Status filter
    if (filterStatus) {
      result = result.filter((p) => (p?.status || 'published') === filterStatus);
    }
    
    // Stock filter
    if (filterStock) {
      if (filterStock === 'out') {
        result = result.filter(p => (p.stockCount ?? p.stock ?? 0) === 0);
      } else if (filterStock === 'low') {
        result = result.filter(p => {
          const stock = p.stockCount ?? p.stock ?? 0;
          return stock > 0 && stock <= 10;
        });
      } else if (filterStock === 'in') {
        result = result.filter(p => (p.stockCount ?? p.stock ?? 0) > 10);
      }
    }
    
    // Quick filters
    if (quickFilter) {
      if (quickFilter === 'outOfStock') {
        result = result.filter(p => (p.stockCount ?? p.stock ?? 0) === 0);
      } else if (quickFilter === 'featured') {
        result = result.filter(p => p.isFeatured);
      }
    }
    
    // Sort
    if (sortField) {
      result.sort((a, b) => {
        let aVal, bVal;
        
        switch (sortField) {
          case 'name':
            aVal = a.name?.toLowerCase() || '';
            bVal = b.name?.toLowerCase() || '';
            break;
          case 'sku':
            aVal = a.sku?.toLowerCase() || '';
            bVal = b.sku?.toLowerCase() || '';
            break;
          case 'price':
            aVal = parseFloat(a.price) || 0;
            bVal = parseFloat(b.price) || 0;
            break;
          case 'stock':
            aVal = a.stockCount ?? a.stock ?? 0;
            bVal = b.stockCount ?? b.stock ?? 0;
            break;
          case 'category':
            aVal = a.category?.toLowerCase() || '';
            bVal = b.category?.toLowerCase() || '';
            break;
          case 'position':
            // Products with position come first, then by position number
            aVal = a.position != null ? a.position : 99999;
            bVal = b.position != null ? b.position : 99999;
            break;
          default:
            return 0;
        }
        
        if (typeof aVal === 'string') {
          const cmp = aVal.localeCompare(bVal, 'he');
          return sortDirection === 'asc' ? cmp : -cmp;
        }
        
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      });
    }
    
    return result;
  }, [products, searchQuery, filterCategory, filterSaleType, filterStatus, filterStock, quickFilter, sortField, sortDirection]);

  const allSelected = useMemo(() => {
    if (!selectionMode || filteredAndSortedProducts.length === 0) return false;
    return selectedProducts.size === filteredAndSortedProducts.length;
  }, [selectionMode, filteredAndSortedProducts.length, selectedProducts]);

  // Handle sort click
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sort indicator component
  const SortIndicator = ({ field }) => {
    if (sortField !== field) return <span className="text-gray-300 mr-1">⇅</span>;
    return <span className="mr-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setFilterCategory('');
    setFilterSaleType('');
    setFilterStatus('');
    setFilterStock('');
    setQuickFilter('');
    setSortField('position');
    setSortDirection('asc');
  };

  // Handle quick filter click
  const handleQuickFilter = (filter) => {
    setQuickFilter(prev => prev === filter ? '' : filter);
  };

  // Start inline editing
  const startEditing = (productId, field, currentValue) => {
    setEditingCell({ productId, field });
    setEditValue(currentValue || '');
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingCell(null);
    setEditValue('');
  };

  // Save inline edit
  const saveInlineEdit = async () => {
    if (!editingCell) return;
    
    const { productId, field } = editingCell;
    const product = products.find(p => p._id === productId);
    if (!product) return;

    // Get current value based on field
    let currentValue;
    switch (field) {
      case 'sku': currentValue = product.sku || ''; break;
      case 'name': currentValue = product.name || ''; break;
      case 'price': currentValue = String(product.price); break;
      case 'originalPrice': currentValue = String(product.originalPrice || ''); break;
      case 'category': currentValue = product.category || ''; break;
      case 'stock': currentValue = String(product.stockCount ?? product.stock ?? 0); break;
      case 'purchaseType': currentValue = product.purchaseType || product.type || 'regular'; break;
      case 'position': currentValue = String(product.position ?? ''); break;
      default: currentValue = '';
    }

    if (editValue === currentValue) {
      cancelEditing();
      return;
    }

    try {
      setLoading(true);
      const updateData = {};
      
      switch (field) {
        case 'sku':
          updateData.sku = editValue;
          break;
        case 'name':
          if (!editValue.trim()) {
            alert('שם המוצר לא יכול להיות ריק');
            return;
          }
          updateData.name = editValue.trim();
          break;
        case 'price':
          const priceNum = parseFloat(editValue);
          if (isNaN(priceNum) || priceNum < 0) {
            alert('מחיר לא תקין');
            return;
          }
          updateData.price = priceNum;
          break;
        case 'category':
          updateData.category = editValue;
          break;
        case 'stock':
          const stockNum = parseInt(editValue, 10);
          if (isNaN(stockNum) || stockNum < 0) {
            alert('מלאי לא תקין');
            return;
          }
          updateData.stockCount = stockNum;
          break;
        case 'originalPrice':
          if (editValue === '' || editValue === null) {
            updateData.originalPrice = null;
          } else {
            const origPriceNum = parseFloat(editValue);
            if (isNaN(origPriceNum) || origPriceNum < 0) {
              alert('מחיר מקורי לא תקין');
              return;
            }
            updateData.originalPrice = origPriceNum;
          }
          break;
        case 'purchaseType':
          if (editValue === 'shared_container') {
            updateData.purchaseType = 'group';
            updateData.type = 'group';
            updateData.groupPurchaseType = 'shared_container';
          } else {
            updateData.purchaseType = editValue;
            updateData.type = editValue === 'group' ? 'group' : 'online';
            updateData.groupPurchaseType = editValue === 'group' ? 'group' : undefined;
          }
          break;
        case 'position':
          if (editValue === '' || editValue === null) {
            updateData.position = null;
          } else {
            const posNum = parseInt(editValue, 10);
            if (isNaN(posNum) || posNum < 0) {
              alert('מיקום לא תקין');
              return;
            }
            updateData.position = posNum;
          }
          break;
      }

      const res = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'שגיאה בעדכון');
      }

      await loadProducts();
      cancelEditing();
    } catch (error) {
      console.error('Inline edit error:', error);
      alert(error.message || 'שגיאה בעדכון');
    } finally {
      setLoading(false);
    }
  };

  // Handle key press in edit mode
  const handleEditKeyDown = (e) => {
    if (e.key === 'Enter') {
      saveInlineEdit();
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  const effectiveTenantId = selectedTenantId || tenantId || null;

  const tenantNameById = useMemo(() => {
    const m = new Map();
    for (const t of tenants) {
      if (t?._id) m.set(String(t._id), t.name || t.slug || String(t._id));
    }
    return m;
  }, [tenants]);

  const showTenantColumn = useMemo(
    () => Boolean(user && isSuperAdminUser(user) && !effectiveTenantId && tenants.length > 0),
    [user, effectiveTenantId, tenants.length],
  );

  const editQueryForProduct = useCallback(
    (product) => {
      if (tenantId) return `?tenantId=${encodeURIComponent(String(tenantId))}`;
      const tid = effectiveTenantId || product?.tenantId;
      if (!tid) return '';
      return `?tenantId=${encodeURIComponent(String(tid))}`;
    },
    [tenantId, effectiveTenantId],
  );

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const allTenants =
        basePath === '/admin' &&
        !embedded &&
        !effectiveTenantId &&
        user &&
        isSuperAdminUser(user);
      const list = await refreshProductsFromApi({
        includeInactive: true,
        tenantId: effectiveTenantId || null,
        allTenants: Boolean(allTenants),
      });
      if (Array.isArray(list)) {
        setProducts(list);
      } else {
        setProducts(getProducts());
      }
    } catch (error) {
      console.error('Failed to refresh products', error);
      setProducts(getProducts());
    } finally {
      setLoading(false);
    }
  }, [effectiveTenantId, basePath, embedded, user]);

  /** מושך מחדש מוצרים מ־API (MongoDB) ומרענן רשימת חנויות למנהל־על */
  const refreshFromDatabase = useCallback(async () => {
    if (user && isSuperAdminUser(user)) {
      try {
        const tenantsRes = await fetch('/api/tenants', {
          credentials: 'include',
          cache: 'no-store',
        });
        if (tenantsRes.ok) {
          const tenantsData = await tenantsRes.json();
          const list = tenantsData.tenants || tenantsData || [];
          setTenants(list);
        }
      } catch {
        // ignore
      }
    }
    await loadProducts();
  }, [user, loadProducts]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    const handleProductsUpdate = () => {
      loadProducts();
    };

    window.addEventListener('productsUpdated', handleProductsUpdate);
    return () => window.removeEventListener('productsUpdated', handleProductsUpdate);
  }, [loadProducts]);

  const handleDelete = async (productId, productName) => {
    console.info('Product delete is disabled in Product Manager UI', { productId, productName });
    alert('מחיקת מוצרים מתבצעת רק דרך Catalog Manager.');
  };

  const handleToggleFeatured = async (productId, currentFeatured) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFeatured: !currentFeatured }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data?.error || 'שגיאה בעדכון המוצר');
        return;
      }

      await loadProducts();
    } catch (error) {
      console.error('Toggle featured error:', error);
      alert('שגיאה בעדכון המוצר');
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async (product) => {
    if (!confirm(`האם אתה בטוח שברצונך לשכפל את "${product.name}"?`)) {
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/products/duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product._id }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data?.error || 'שגיאה בשכפול המוצר');
        return;
      }

      const data = await res.json();
      alert(`המוצר שוכפל בהצלחה! שם המוצר החדש: "${data.product?.name || 'עותק'}"`);
      await loadProducts();
    } catch (error) {
      console.error('Duplicate error:', error);
      alert('שגיאה בשכפול המוצר');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectionMode = () => {
    setSelectionMode((prev) => {
      const next = !prev;
      if (!next) {
        setSelectedProducts(new Set());
      }
      return next;
    });
  };

  const toggleProductSelection = (productId) => {
    setSelectedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedProducts(new Set());
      return;
    }

    setSelectedProducts(new Set(filteredAndSortedProducts.map((product) => product._id)));
  };

  const handleBulkDelete = async () => {
    console.info('Bulk product delete is disabled in Product Manager UI', {
      selectedCount,
      selectedIds: Array.from(selectedProducts),
    });
    alert('מחיקת מוצרים מתבצעת רק דרך Catalog Manager.');
  };

  return (
    <div className={embedded ? 'bg-white p-2' : 'min-h-screen bg-white p-3 sm:p-6 md:p-8'}>
      <div className={embedded ? '' : 'max-w-7xl mx-auto'}>
        <div className="mb-4 sm:mb-6">
          {!embedded && (
          <div className="mb-4">
            <div className="flex items-center justify-between gap-3 mb-1">
              <h1
                className="text-xl sm:text-2xl md:text-3xl font-bold"
                style={{
                  background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                ניהול מוצרים
              </h1>
              <Link
                href={basePath}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-all hover:opacity-90 shrink-0"
                style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                חזרה
              </Link>
            </div>
            {showTenantColumn && (
              <p className="text-sm text-slate-600 max-w-2xl">
                תצוגה: <strong>כל החנויות</strong> — כל המוצרים המשויכים לעסקים במרקטפלייס
              </p>
            )}
          </div>
          )}

          {/* Tenant/Store selector */}
          {tenants.length > 0 && (
            <div className="mb-4 flex items-center gap-3 p-3 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.06) 0%, rgba(8, 145, 178, 0.06) 100%)', border: '1px solid rgba(8, 145, 178, 0.2)' }}>
              <svg className="w-5 h-5 flex-shrink-0" style={{ color: '#1e3a8a' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <select
                value={selectedTenantId}
                onChange={(e) => setSelectedTenantId(e.target.value)}
                className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:border-cyan-500 transition-all"
                style={{ maxWidth: '380px' }}
              >
                {user && isSuperAdminUser(user) && (
                  <option value="">כל החנויות (מרקטפלייס מלא)</option>
                )}
                {tenants.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name || t.slug}
                  </option>
                ))}
              </select>
              <span className="text-xs font-medium" style={{ color: '#64748b' }}>
                {`${filteredAndSortedProducts.length} מוצרים`}
              </span>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => refreshFromDatabase()}
              disabled={loading}
              title="טעינה מחדש של כל המוצרים ממסד הנתונים (MongoDB) — מעדכן את הטבלה לפי השינויים האחרונים"
              className="font-semibold px-3 sm:px-5 py-2 sm:py-3 rounded-lg sm:rounded-xl transition-all shadow-sm flex items-center gap-2 text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'white',
                border: '2px solid #0e7490',
                color: '#0e7490',
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.background = 'rgba(14, 116, 144, 0.06)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'white';
              }}
            >
              <svg
                className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 ${loading ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span className="hidden sm:inline">רענן ממסד הנתונים</span>
              <span className="sm:hidden">רענון</span>
            </button>
            <Link
              href="/products"
              className="font-semibold px-3 sm:px-5 py-2 sm:py-3 rounded-lg sm:rounded-xl transition-all shadow-sm flex items-center gap-2 text-xs sm:text-sm"
              style={{
                background: 'white',
                border: '2px solid #0891b2',
                color: '#0891b2',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background =
                  'linear-gradient(135deg, rgba(30, 58, 138, 0.05) 0%, rgba(8, 145, 178, 0.05) 100%)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'white';
              }}
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              <span className="hidden sm:inline">צפייה בדף המוצרים באתר</span>
              <span className="sm:hidden">צפה באתר</span>
            </Link>
            <button
              onClick={toggleSelectionMode}
              className="font-semibold px-3 sm:px-5 py-2 sm:py-3 rounded-lg sm:rounded-xl transition-all shadow-sm flex items-center gap-2 text-xs sm:text-sm"
              style={{
                background: selectionMode ? 'rgba(220, 38, 38, 0.05)' : 'white',
                border: '2px solid #dc2626',
                color: '#dc2626',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(220, 38, 38, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = selectionMode
                  ? 'rgba(220, 38, 38, 0.05)'
                  : 'white';
              }}
            >
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              <span className="hidden sm:inline">
                {selectionMode ? 'בטל מחיקה מרובה' : 'מחיקת מוצרים'}
              </span>
              <span className="sm:hidden">{selectionMode ? 'בטל' : 'מחק'}</span>
            </button>
            {selectionMode && (
              <>
                <button
                  onClick={handleSelectAll}
                  className="font-semibold px-3 sm:px-5 py-2 sm:py-3 rounded-lg sm:rounded-xl transition-all shadow-sm text-xs sm:text-sm"
                  style={{
                    background: 'white',
                    border: '2px solid #6b7280',
                    color: '#374151',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f3f4f6')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
                >
                  <span className="hidden sm:inline">
                    {allSelected ? 'בטל סימון הכול' : 'סמן את כל המוצרים'}
                  </span>
                  <span className="sm:hidden">{allSelected ? 'בטל הכל' : 'סמן הכל'}</span>
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={loading || selectedCount === 0}
                  className="text-white font-semibold px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
                  style={{
                    background:
                      loading || selectedCount === 0
                        ? '#9ca3af'
                        : 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
                  }}
                  onMouseEnter={(e) =>
                    !(loading || selectedCount === 0) &&
                    (e.currentTarget.style.background =
                      'linear-gradient(135deg, #b91c1c 0%, #dc2626 100%)')
                  }
                  onMouseLeave={(e) =>
                    !(loading || selectedCount === 0) &&
                    (e.currentTarget.style.background =
                      'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)')
                  }
                >
                  מחק {selectedCount ? `${selectedCount} מוצרים` : 'מוצרים נבחרים'}
                </button>
              </>
            )}

            {canManageAllCategories && (
              <Link
                href="/admin/products/categories"
                className="font-semibold px-3 sm:px-5 py-2 sm:py-3 rounded-lg sm:rounded-xl transition-all shadow-sm flex items-center gap-2 text-xs sm:text-sm"
                style={{
                  background: 'white',
                  border: '2px solid #1e3a8a',
                  color: '#1e3a8a',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background =
                    'linear-gradient(135deg, rgba(30, 58, 138, 0.05) 0%, rgba(8, 145, 178, 0.05) 100%)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'white';
                }}
                title="ניהול קטגוריות גלובלי לכל החנויות"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 7h.01M7 3h10a4 4 0 014 4v10a4 4 0 01-4 4H7a4 4 0 01-4-4V7a4 4 0 014-4z"
                  />
                </svg>
                <span className="hidden sm:inline">ניהול קטגוריות</span>
                <span className="sm:hidden">קטגוריות</span>
              </Link>
            )}

            <Link
              href={`${basePath}/products/new${effectiveTenantId ? `?tenantId=${effectiveTenantId}` : ''}`}
              className="text-white font-semibold px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl transition-all shadow-lg flex items-center gap-2 text-xs sm:text-sm"
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
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span className="hidden sm:inline">הוסף מוצר חדש</span>
              <span className="sm:hidden">הוסף</span>
            </Link>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-4">
          <div className="flex flex-col gap-3">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="חיפוש לפי שם, מקט, קטגוריה או תיאור..."
                className="w-full px-4 py-2.5 pr-10 rounded-xl border-2 border-gray-200 focus:border-cyan-500 focus:outline-none transition-colors text-sm"
              />
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            
            {/* Filters Row */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Category Filter */}
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-cyan-500 focus:outline-none text-sm bg-white cursor-pointer"
              >
                <option value="">כל הקטגוריות</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              
              {/* Sale Type Filter */}
              <select
                value={filterSaleType}
                onChange={(e) => setFilterSaleType(e.target.value)}
                className="px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-cyan-500 focus:outline-none text-sm bg-white cursor-pointer"
              >
                <option value="">סוג מכירה</option>
                <option value="regular">רגילה</option>
                <option value="group">קבוצתית</option>
                <option value="shared_container">מכולה משותפת</option>
              </select>
              
              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-cyan-500 focus:outline-none text-sm bg-white cursor-pointer"
              >
                <option value="">כל הסטטוסים</option>
                <option value="published">מפורסם</option>
                <option value="draft">טיוטה</option>
                <option value="archived">ארכיון</option>
              </select>
              
              {/* Stock Filter */}
              <select
                value={filterStock}
                onChange={(e) => setFilterStock(e.target.value)}
                className="px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-cyan-500 focus:outline-none text-sm bg-white cursor-pointer"
              >
                <option value="">מלאי</option>
                <option value="in">במלאי (10+)</option>
                <option value="low">מלאי נמוך (1-10)</option>
                <option value="out">אזל מהמלאי</option>
              </select>
              
              {/* Quick Filter Buttons */}
              <div className="flex gap-1 mr-2">
                <button
                  onClick={() => handleQuickFilter('outOfStock')}
                  className={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                    quickFilter === 'outOfStock' 
                      ? 'bg-red-500 text-white' 
                      : 'bg-red-50 text-red-600 hover:bg-red-100'
                  }`}
                >
                  אזל מהמלאי
                </button>
                <button
                  onClick={() => handleQuickFilter('featured')}
                  className={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                    quickFilter === 'featured' 
                      ? 'text-white' 
                      : 'text-cyan-600 hover:bg-cyan-100'
                  }`}
                  style={quickFilter === 'featured' ? { background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' } : { background: 'rgba(8, 145, 178, 0.1)' }}
                >
                  מומלצים
                </button>
              </div>
              
              {/* Clear Filters */}
              {(searchQuery || filterCategory || filterSaleType || filterStatus || filterStock || quickFilter || sortField) && (
                <button
                  onClick={clearFilters}
                  className="px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1"
                  style={{ color: '#dc2626', border: '2px solid #dc2626' }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  נקה הכל
                </button>
              )}
              
              {/* Results count */}
              <span className="text-sm text-gray-500 mr-auto">
                {filteredAndSortedProducts.length} מוצרים {filteredAndSortedProducts.length !== products.length && `(מתוך ${products.length})`}
              </span>
            </div>
          </div>
        </div>

        {/* Marketplace Visibility Toggles - only for super admin */}
        {!embedded && canManageAllCategories && (
          <div className="rounded-xl shadow-md p-4 mb-4" style={{ background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.04) 0%, rgba(8, 145, 178, 0.04) 100%)', border: '1px solid rgba(8, 145, 178, 0.15)' }}>
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5" style={{ color: '#1e3a8a' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <h3 className="text-sm font-bold" style={{ color: '#1e3a8a' }}>
                נראות ללקוחות (מרקטפלייס וחנויות עסקים)
              </h3>
              {visibilityLoading && (
                <span className="text-xs text-gray-400 mr-2">שומר...</span>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              {/* זמין במלאי */}
              <button
                onClick={() => toggleMarketplaceVisibility('marketplaceShowStock')}
                disabled={visibilityLoading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border-2 disabled:opacity-60"
                style={marketplaceVisibility.marketplaceShowStock
                  ? { background: 'rgba(16, 185, 129, 0.08)', borderColor: '#10b981', color: '#065f46' }
                  : { background: 'rgba(107, 114, 128, 0.06)', borderColor: '#d1d5db', color: '#9ca3af' }
                }
              >
                <span className={`inline-flex items-center justify-center w-9 h-5 rounded-full transition-all ${
                  marketplaceVisibility.marketplaceShowStock ? 'bg-emerald-500' : 'bg-gray-300'
                }`}>
                  <span className={`block w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform ${
                    marketplaceVisibility.marketplaceShowStock ? 'translate-x-[-8px]' : 'translate-x-[8px]'
                  }`} />
                </span>
                <span>זמין במלאי</span>
                {marketplaceVisibility.marketplaceShowStock
                  ? <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">מוצג</span>
                  : <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">מוסתר</span>
                }
              </button>
              {/* רכישה קבוצתית */}
              <button
                onClick={() => toggleMarketplaceVisibility('marketplaceShowGroup')}
                disabled={visibilityLoading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border-2 disabled:opacity-60"
                style={marketplaceVisibility.marketplaceShowGroup
                  ? { background: 'rgba(245, 158, 11, 0.08)', borderColor: '#f59e0b', color: '#78350f' }
                  : { background: 'rgba(107, 114, 128, 0.06)', borderColor: '#d1d5db', color: '#9ca3af' }
                }
              >
                <span className={`inline-flex items-center justify-center w-9 h-5 rounded-full transition-all ${
                  marketplaceVisibility.marketplaceShowGroup ? 'bg-amber-500' : 'bg-gray-300'
                }`}>
                  <span className={`block w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform ${
                    marketplaceVisibility.marketplaceShowGroup ? 'translate-x-[-8px]' : 'translate-x-[8px]'
                  }`} />
                </span>
                <span>רכישה קבוצתית</span>
                {marketplaceVisibility.marketplaceShowGroup
                  ? <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">מוצג</span>
                  : <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">מוסתר</span>
                }
              </button>
              {/* מכולה משותפת */}
              <button
                onClick={() => toggleMarketplaceVisibility('marketplaceShowSharedContainer')}
                disabled={visibilityLoading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border-2 disabled:opacity-60"
                style={marketplaceVisibility.marketplaceShowSharedContainer
                  ? { background: 'rgba(14, 116, 144, 0.08)', borderColor: '#0e7490', color: '#164e63' }
                  : { background: 'rgba(107, 114, 128, 0.06)', borderColor: '#d1d5db', color: '#9ca3af' }
                }
              >
                <span className={`inline-flex items-center justify-center w-9 h-5 rounded-full transition-all ${
                  marketplaceVisibility.marketplaceShowSharedContainer ? 'bg-cyan-600' : 'bg-gray-300'
                }`}>
                  <span className={`block w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform ${
                    marketplaceVisibility.marketplaceShowSharedContainer ? 'translate-x-[-8px]' : 'translate-x-[8px]'
                  }`} />
                </span>
                <span>מכולה משותפת</span>
                {marketplaceVisibility.marketplaceShowSharedContainer
                  ? <span className="text-[10px] bg-cyan-100 text-cyan-700 px-1.5 py-0.5 rounded-full">מוצג</span>
                  : <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">מוסתר</span>
                }
              </button>
            </div>
            <p className="text-[11px] text-gray-400 mt-2">
              כיבוי מתג יסתיר את כפתור הסינון והמוצרים מהסוג הזה במרקטפלייס ובדף החנות של כל עסק (/t/…). המוצרים לא נמחקים.
            </p>
          </div>
        )}

        {filteredAndSortedProducts.length > 0 ? (
          <div className="bg-white rounded-lg sm:rounded-xl shadow-md overflow-hidden">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '2px solid #0891b2' }}>
                    {selectionMode && (
                      <th className="px-4 py-4 w-12 text-center">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={handleSelectAll}
                          aria-label="select all products"
                        />
                      </th>
                    )}
                    <th
                      className="px-4 py-4 text-center text-sm font-semibold cursor-pointer hover:bg-gray-50 transition-colors select-none"
                      style={{ color: '#1e3a8a' }}
                      onClick={() => handleSort('position')}
                    >
                      <span className="flex items-center justify-center gap-1">
                        <SortIndicator field="position" />
                        מיקום
                      </span>
                    </th>
                    <th
                      className="px-6 py-4 text-right text-sm font-semibold cursor-pointer hover:bg-gray-50 transition-colors select-none"
                      style={{ color: '#1e3a8a' }}
                      onClick={() => handleSort('sku')}
                    >
                      <span className="flex items-center gap-1">
                        <SortIndicator field="sku" />
                        מק&#34;ט
                      </span>
                    </th>
                    <th
                      className="px-6 py-4 text-right text-sm font-semibold cursor-pointer hover:bg-gray-50 transition-colors select-none"
                      style={{ color: '#1e3a8a' }}
                      onClick={() => handleSort('name')}
                    >
                      <span className="flex items-center gap-1">
                        <SortIndicator field="name" />
                        שם המוצר
                      </span>
                    </th>
                    {showTenantColumn && (
                      <th
                        className="px-4 py-4 text-right text-sm font-semibold select-none max-w-[140px]"
                        style={{ color: '#1e3a8a' }}
                      >
                        חנות
                      </th>
                    )}
                    <th
                      className="px-6 py-4 text-right text-sm font-semibold cursor-pointer hover:bg-gray-50 transition-colors select-none"
                      style={{ color: '#1e3a8a' }}
                      onClick={() => handleSort('price')}
                    >
                      <span className="flex items-center gap-1">
                        <SortIndicator field="price" />
                        מחיר
                      </span>
                    </th>
                    <th
                      className="px-6 py-4 text-right text-sm font-semibold select-none"
                      style={{ color: '#1e3a8a' }}
                    >
                      מחיר מקורי
                    </th>
                    <th
                      className="px-6 py-4 text-right text-sm font-semibold cursor-pointer hover:bg-gray-50 transition-colors select-none"
                      style={{ color: '#1e3a8a' }}
                      onClick={() => handleSort('category')}
                    >
                      <span className="flex items-center gap-1">
                        <SortIndicator field="category" />
                        קטגוריה
                      </span>
                    </th>
                    <th
                      className="px-6 py-4 text-right text-sm font-semibold cursor-pointer hover:bg-gray-50 transition-colors select-none"
                      style={{ color: '#1e3a8a' }}
                      onClick={() => handleSort('stock')}
                    >
                      <span className="flex items-center gap-1">
                        <SortIndicator field="stock" />
                        מלאי
                      </span>
                    </th>
                    <th
                      className="px-6 py-4 text-right text-sm font-semibold"
                      style={{ color: '#1e3a8a' }}
                    >
                      סוג מכירה
                    </th>
                    <th
                      className="px-6 py-4 text-right text-sm font-semibold"
                      style={{ color: '#1e3a8a' }}
                    >
                      סטטוס
                    </th>
                    <th
                      className="px-6 py-4 text-center text-sm font-semibold"
                      style={{ color: '#1e3a8a' }}
                      title="מוצרים מומלצים יופיעו בדף הבית"
                    >
                      מומלץ
                    </th>
                    <th
                      className="px-6 py-4 text-right text-sm font-semibold"
                      style={{ color: '#1e3a8a' }}
                    >
                      פעולות
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredAndSortedProducts.map((product, index) => (
                    <tr
                      key={product._id}
                      className="border-b border-gray-100 transition-all"
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          'linear-gradient(135deg, rgba(30, 58, 138, 0.02) 0%, rgba(8, 145, 178, 0.02) 100%)')
                      }
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
                    >
                      {selectionMode && (
                        <td className="px-4 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={selectedProducts.has(product._id)}
                            onChange={() => toggleProductSelection(product._id)}
                            aria-label={`select product ${product.name}`}
                          />
                        </td>
                      )}
                      <td className="px-4 py-4 text-center">
                        {editingCell?.productId === product._id && editingCell?.field === 'position' ? (
                          <input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={handleEditKeyDown}
                            onBlur={saveInlineEdit}
                            autoFocus
                            min="1"
                            className="w-16 px-2 py-1 border-2 border-cyan-500 rounded text-sm focus:outline-none text-center"
                          />
                        ) : (
                          <span 
                            onClick={() => startEditing(product._id, 'position', String(product.position || index + 1))}
                            className="cursor-pointer hover:bg-cyan-50 px-3 py-1 rounded-full transition-colors font-semibold text-sm"
                            style={{ 
                              background: product.position 
                                ? 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' 
                                : '#f3f4f6', 
                              color: product.position ? 'white' : '#374151',
                              border: product.position ? 'none' : '1px dashed #9ca3af'
                            }}
                            title={product.position ? 'מיקום מוגדר - לחץ לעריכה' : 'מיקום אוטומטי - לחץ לקבוע מיקום'}
                          >
                            {product.position || index + 1}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-600 text-sm font-mono">
                        {editingCell?.productId === product._id && editingCell?.field === 'sku' ? (
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={handleEditKeyDown}
                            onBlur={saveInlineEdit}
                            autoFocus
                            className="w-full px-2 py-1 border-2 border-cyan-500 rounded text-sm focus:outline-none"
                          />
                        ) : (
                          <span 
                            onClick={() => startEditing(product._id, 'sku', product.sku)}
                            className="cursor-pointer hover:bg-cyan-50 px-2 py-1 rounded transition-colors"
                            title="לחץ לעריכה"
                          >
                            {product.sku || '—'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-900">
                        {editingCell?.productId === product._id && editingCell?.field === 'name' ? (
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={handleEditKeyDown}
                            onBlur={saveInlineEdit}
                            autoFocus
                            className="w-full px-2 py-1 border-2 border-cyan-500 rounded text-sm focus:outline-none"
                          />
                        ) : (
                          <span 
                            onClick={() => startEditing(product._id, 'name', product.name)}
                            className="cursor-pointer hover:bg-cyan-50 px-2 py-1 rounded transition-colors"
                            title="לחץ לעריכה"
                          >
                            {product.name}
                          </span>
                        )}
                      </td>
                      {showTenantColumn && (
                        <td className="px-4 py-4 text-gray-700 text-sm max-w-[140px]">
                          <span className="line-clamp-2" title={tenantNameById.get(String(product.tenantId || '')) || ''}>
                            {tenantNameById.get(String(product.tenantId || '')) || '—'}
                          </span>
                        </td>
                      )}
                      <td className="px-6 py-4 text-gray-900">
                        {editingCell?.productId === product._id && editingCell?.field === 'price' ? (
                          <div className="flex items-center gap-1">
                            <span>₪</span>
                            <input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={handleEditKeyDown}
                              onBlur={saveInlineEdit}
                              autoFocus
                              min="0"
                              step="0.01"
                              className="w-24 px-2 py-1 border-2 border-cyan-500 rounded text-sm focus:outline-none"
                            />
                          </div>
                        ) : (
                          <span 
                            onClick={() => startEditing(product._id, 'price', String(product.price))}
                            className="cursor-pointer hover:bg-cyan-50 px-2 py-1 rounded transition-colors"
                            title="לחץ לעריכה"
                          >
                            ₪{product.price}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {editingCell?.productId === product._id && editingCell?.field === 'originalPrice' ? (
                          <div className="flex items-center gap-1">
                            <span>₪</span>
                            <input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={handleEditKeyDown}
                              onBlur={saveInlineEdit}
                              autoFocus
                              min="0"
                              step="0.01"
                              className="w-24 px-2 py-1 border-2 border-cyan-500 rounded text-sm focus:outline-none"
                            />
                          </div>
                        ) : (
                          <span 
                            onClick={() => startEditing(product._id, 'originalPrice', String(product.originalPrice || ''))}
                            className="cursor-pointer hover:bg-cyan-50 px-2 py-1 rounded transition-colors"
                            title="לחץ לעריכה"
                          >
                            {product.originalPrice ? `₪${product.originalPrice}` : '—'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {editingCell?.productId === product._id && editingCell?.field === 'category' ? (
                          <select
                            value={editValue}
                            onChange={(e) => { setEditValue(e.target.value); }}
                            onBlur={saveInlineEdit}
                            onKeyDown={handleEditKeyDown}
                            autoFocus
                            className="w-full px-2 py-1 border-2 border-cyan-500 rounded text-sm focus:outline-none bg-white cursor-pointer"
                          >
                            <option value="">בחר קטגוריה</option>
                            {categories.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        ) : (
                          <span 
                            onClick={() => startEditing(product._id, 'category', product.category)}
                            className="cursor-pointer hover:bg-cyan-50 px-2 py-1 rounded transition-colors"
                            title="לחץ לעריכה"
                          >
                            {product.category || '—'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {editingCell?.productId === product._id && editingCell?.field === 'stock' ? (
                          <input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={handleEditKeyDown}
                            onBlur={saveInlineEdit}
                            autoFocus
                            min="0"
                            className="w-20 px-2 py-1 border-2 border-cyan-500 rounded text-sm focus:outline-none"
                          />
                        ) : (
                          <span
                            onClick={() => startEditing(product._id, 'stock', String(product.stockCount ?? product.stock ?? 0))}
                            className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer hover:opacity-80 transition-opacity ${
                              (product.stockCount ?? product.stock ?? 0) > 10
                                ? 'bg-green-100 text-green-700'
                                : (product.stockCount ?? product.stock ?? 0) > 0
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                            title="לחץ לעריכה"
                          >
                            {product.stockCount ?? product.stock ?? 0}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {editingCell?.productId === product._id && editingCell?.field === 'purchaseType' ? (
                          <select
                            value={editValue}
                            onChange={(e) => { setEditValue(e.target.value); }}
                            onBlur={saveInlineEdit}
                            onKeyDown={handleEditKeyDown}
                            autoFocus
                            className="px-2 py-1 border-2 border-cyan-500 rounded text-sm focus:outline-none bg-white cursor-pointer"
                          >
                            <option value="regular">רגילה</option>
                            <option value="group">קבוצתית</option>
                            <option value="shared_container">מכולה משותפת</option>
                          </select>
                        ) : (
                          <span
                            onClick={() => startEditing(product._id, 'purchaseType', product.groupPurchaseType === 'shared_container' ? 'shared_container' : product.purchaseType || product.type || 'regular')}
                            className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer hover:opacity-80 transition-opacity ${
                              product.groupPurchaseType === 'shared_container'
                                ? 'bg-amber-100 text-amber-700'
                                : product.purchaseType === 'group' || product.type === 'group'
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-blue-100 text-blue-700'
                            }`}
                            title="לחץ לעריכה"
                          >
                            {product.groupPurchaseType === 'shared_container' ? 'מכולה משותפת' : product.purchaseType === 'group' || product.type === 'group' ? 'קבוצתית' : 'רגילה'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            (product.status || 'published') === 'published'
                              ? 'bg-green-100 text-green-700'
                              : (product.status || 'published') === 'draft'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          {(product.status || 'published') === 'published'
                            ? 'מפורסם'
                            : (product.status || 'published') === 'draft'
                              ? 'טיוטה'
                              : 'ארכיון'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleToggleFeatured(product._id, product.isFeatured)}
                          disabled={loading}
                          className="p-0.5 rounded-full transition-all disabled:opacity-50 hover:scale-110"
                          style={{
                            background: product.isFeatured
                              ? 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)'
                              : 'transparent',
                          }}
                          title={product.isFeatured ? 'הסר מדף הבית' : 'הצג בדף הבית'}
                        >
                          <svg
                            className="w-4 h-4"
                            fill={product.isFeatured ? '#ffffff' : 'none'}
                            stroke={product.isFeatured ? '#ffffff' : '#9ca3af'}
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setOpenDropdownId(openDropdownId === product._id ? null : product._id)}
                            className="p-2 rounded-lg transition-all"
                            style={{ 
                              background: openDropdownId === product._id ? 'linear-gradient(135deg, rgba(30, 58, 138, 0.1) 0%, rgba(8, 145, 178, 0.1) 100%)' : 'transparent',
                              color: '#1e3a8a'
                            }}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                          </button>
                          
                          {openDropdownId === product._id && (
                            <div 
                              className="absolute left-0 mt-1 w-40 bg-white rounded-xl py-2 z-50"
                              style={{
                                border: '2px solid transparent',
                                backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)',
                                backgroundOrigin: 'border-box',
                                backgroundClip: 'padding-box, border-box',
                                boxShadow: '0 8px 25px rgba(8, 145, 178, 0.25)',
                              }}
                            >
                              <Link
                                href={`${basePath}/products/${product._id}/edit${editQueryForProduct(product)}`}
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-right transition-colors"
                                style={{ color: '#1e3a8a' }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, rgba(30, 58, 138, 0.05) 0%, rgba(8, 145, 178, 0.05) 100%)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                onClick={() => setOpenDropdownId(null)}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                ערוך
                              </Link>
                              <button
                                type="button"
                                onClick={() => { handleToggleFeatured(product._id, product.isFeatured); setOpenDropdownId(null); }}
                                disabled={loading}
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-right transition-colors"
                                style={{ color: '#1e3a8a' }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, rgba(30, 58, 138, 0.05) 0%, rgba(8, 145, 178, 0.05) 100%)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                              >
                                <svg className="w-4 h-4" fill={product.isFeatured ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                </svg>
                                {product.isFeatured ? 'הסר מובלט' : 'הבלט'}
                              </button>
                              <button
                                type="button"
                                onClick={() => { handleDuplicate(product); setOpenDropdownId(null); }}
                                disabled={loading}
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-right transition-colors"
                                style={{ color: '#1e3a8a' }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, rgba(30, 58, 138, 0.05) 0%, rgba(8, 145, 178, 0.05) 100%)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                שכפל
                              </button>
                              <button
                                type="button"
                                onClick={() => { handleDelete(product._id, product.name); setOpenDropdownId(null); }}
                                disabled={loading}
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-right hover:bg-red-50 border-t border-gray-100"
                                style={{ color: '#dc2626' }}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                מחק
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden p-4">
              <div className="grid grid-cols-2 gap-3">
                {filteredAndSortedProducts.map((product) => (
                  <div
                    key={product._id}
                    className="p-3 rounded-lg border-2 border-gray-200 bg-white"
                  >
                    <div className="mb-2">
                      <p className="text-xs font-semibold text-gray-900 mb-1 line-clamp-2">
                        {product.name}
                      </p>
                      {showTenantColumn && product.tenantId && (
                        <p className="text-[10px] text-cyan-800 font-medium mb-1 truncate" title={tenantNameById.get(String(product.tenantId)) || ''}>
                          {tenantNameById.get(String(product.tenantId)) || '—'}
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-gray-500">{product.category}</p>
                        {product.sku && (
                          <span className="text-xs text-gray-400 font-mono">#{product.sku}</span>
                        )}
                      </div>
                    </div>

                    <div className="mb-2 flex flex-wrap items-center gap-1">
                      <span className="text-sm font-bold" style={{ color: '#1e3a8a' }}>
                        ₪{product.price}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          (product.stockCount ?? product.stock ?? 0) > 10
                            ? 'bg-green-100 text-green-700'
                            : (product.stockCount ?? product.stock ?? 0) > 0
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        מלאי: {product.stockCount ?? product.stock ?? 0}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          product.groupPurchaseType === 'shared_container'
                            ? 'bg-amber-100 text-amber-700'
                            : product.purchaseType === 'group' || product.type === 'group'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {product.groupPurchaseType === 'shared_container' ? 'מכולה משותפת' : product.purchaseType === 'group' || product.type === 'group' ? 'קבוצתית' : 'רגילה'}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          (product.status || 'published') === 'published'
                            ? 'bg-green-100 text-green-700'
                            : (product.status || 'published') === 'draft'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        {(product.status || 'published') === 'published'
                          ? 'מפורסם'
                          : (product.status || 'published') === 'draft'
                            ? 'טיוטה'
                            : 'ארכיון'}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-gray-100 flex flex-col gap-2">
                      {selectionMode && (
                        <input
                          type="checkbox"
                          checked={selectedProducts.has(product._id)}
                          onChange={() => toggleProductSelection(product._id)}
                          aria-label={`select product ${product.name}`}
                          className="w-4 h-4"
                        />
                      )}
                      <div className="flex gap-1 flex-wrap">
                        <Link
                          href={`${basePath}/products/${product._id}/edit${editQueryForProduct(product)}`}
                          className="flex-1 text-center text-white font-medium px-2 py-1.5 rounded text-xs min-w-[60px]"
                          style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
                        >
                          ערוך
                        </Link>
                        <button
                          onClick={() => handleDuplicate(product)}
                          disabled={loading}
                          className="flex-1 font-medium px-2 py-1.5 rounded text-xs min-w-[60px]"
                          style={{
                            background: loading ? '#e5e7eb' : 'white',
                            border: '2px solid #0891b2',
                            color: loading ? '#6b7280' : '#1e3a8a',
                          }}
                        >
                          שכפל
                        </button>
                        <button
                          onClick={() => handleDelete(product._id, product.name)}
                          disabled={loading}
                          className="flex-1 font-medium px-2 py-1.5 rounded text-xs min-w-[60px]"
                          style={{
                            background: loading ? '#e5e7eb' : 'white',
                            border: '2px solid #dc2626',
                            color: loading ? '#6b7280' : '#dc2626',
                          }}
                        >
                          מחק
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div
            className="bg-white rounded-xl shadow-lg p-12 text-center"
            style={{
              border: '2px solid transparent',
              backgroundImage:
                'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)',
              backgroundOrigin: 'border-box',
              backgroundClip: 'padding-box, border-box',
            }}
          >
            <svg
              className="w-24 h-24 mx-auto mb-4"
              style={{ color: '#0891b2' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
            <h3
              className="text-2xl font-bold mb-2"
              style={{
                background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              אין מוצרים במערכת
            </h3>
            <p className="text-gray-600 mb-4">התחל בהוספת המוצר הראשון שלך, או רענן אם עדכנת נתונים מבחוץ.</p>
            <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
              <button
                type="button"
                onClick={() => refreshFromDatabase()}
                disabled={loading}
                className="inline-flex items-center gap-2 font-semibold px-5 py-2.5 rounded-xl transition-all border-2 disabled:opacity-50"
                style={{ borderColor: '#0e7490', color: '#0e7490', background: 'white' }}
              >
                <svg
                  className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                רענן ממסד הנתונים
              </button>
            </div>
            <Link
              href={`${basePath}/products/new${effectiveTenantId ? `?tenantId=${effectiveTenantId}` : ''}`}
              className="inline-flex items-center gap-2 text-white font-semibold px-6 py-3 rounded-xl transition-all shadow-lg"
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
              הוסף מוצר
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
