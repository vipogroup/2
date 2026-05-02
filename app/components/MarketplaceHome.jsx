'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import PageTextEditor from '@/components/PageTextEditor';
import CatalogProductCard from '@/app/components/CatalogProductCard';
import { getCatalogProductMode } from '@/lib/catalogProductMode';
import { getVisibilityForUi, productPassesMarketplaceVisibility } from '@/lib/marketplaceProductVisibility';

const ShareModal = dynamic(() => import('./ShareModal'));

const AUTH_CACHE_KEY = 'marketplace_home_auth_v1';
const SETTINGS_CACHE_KEY = 'marketplace_home_settings_v1';
const SPONSORED_CACHE_KEY = 'marketplace_home_sponsored_v1';
const AUTH_CACHE_MS = 2 * 60 * 1000;
const SETTINGS_CACHE_MS = 5 * 60 * 1000;
const SPONSORED_CACHE_MS = 3 * 60 * 1000;
function readSessionCache(key, maxAgeMs) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.timestamp !== 'number') return null;
    if (Date.now() - parsed.timestamp > maxAgeMs) return null;
    return parsed.value;
  } catch {
    return null;
  }
}

function writeSessionCache(key, value) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(key, JSON.stringify({ timestamp: Date.now(), value }));
  } catch {
    // Ignore cache write failures in private mode/quota limits.
  }
}

// אייקונים SVG
const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const FilterIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
  </svg>
);

const StoreIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// קומפוננטה ראשית
export default function MarketplaceHome() {
  const [products, setProducts] = useState([]);
  const [sponsored, setSponsored] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareModalProduct, setShareModalProduct] = useState(null);

  const gradientPrimary = 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)';
  const gradientReverse = 'linear-gradient(135deg, #0891b2 0%, #1e3a8a 100%)';

  // Marketplace visibility settings (controlled by admin)
  const [visibilitySettings, setVisibilitySettings] = useState({
    marketplaceShowStock: true,
    marketplaceShowGroup: true,
    marketplaceShowSharedContainer: true,
  });

  /** אם כל המתגים כבויים ב-API — לא מסתירים הכל (אחרת המרקטפלייס ריק) */
  const visibilityForUi = useMemo(() => getVisibilityForUi(visibilitySettings), [visibilitySettings]);

  // פילטרים
  const [selectedTenant, setSelectedTenant] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedInventoryMode, setSelectedInventoryMode] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  
  // Toast
  const [toast, setToast] = useState(null);

  const fetchProducts = useCallback(async (signal) => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (selectedTenant) params.set('tenant', selectedTenant);
      if (selectedCategory) params.set('category', selectedCategory);
      if (searchQuery) params.set('search', searchQuery);
      // סינון לפי סוג רכישה - group, shared_container או regular (עם מלאי)
      if (selectedInventoryMode === 'stock') {
        params.set('type', 'regular');
      } else if (selectedInventoryMode === 'group') {
        params.set('type', 'group');
        params.set('groupPurchaseType', 'group');
      } else if (selectedInventoryMode === 'shared_container') {
        params.set('type', 'group');
        params.set('groupPurchaseType', 'shared_container');
      }
      params.set('page', page.toString());
      params.set('limit', '24');

      const res = await fetch(`/api/marketplace/products?${params}`, { signal });
      if (!res.ok) throw new Error('Failed to fetch');
      
      const data = await res.json();
      if (signal?.aborted) return;
      setProducts(data.products || []);
      setTenants(data.tenants || []);
      setCategories(data.categories || []);
      setPagination(data.pagination || { total: 0, pages: 1 });
    } catch (err) {
      if (err?.name === 'AbortError') return;
      setError('שגיאה בטעינת המוצרים');
      console.error(err);
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [selectedTenant, selectedCategory, selectedInventoryMode, searchQuery, page]);

  useEffect(() => {
    const controller = new AbortController();
    fetchProducts(controller.signal);
    return () => controller.abort();
  }, [fetchProducts]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      const normalized = searchInput.trim();
      setSearchQuery((prev) => (prev === normalized ? prev : normalized));
      setPage(1);
    }, 350);

    return () => clearTimeout(debounce);
  }, [searchInput]);

  // Fetch sponsored / paid-campaign products
  useEffect(() => {
    const fetchSponsored = async () => {
      const cached = readSessionCache(SPONSORED_CACHE_KEY, SPONSORED_CACHE_MS);
      if (Array.isArray(cached) && cached.length > 0) {
        setSponsored(cached);
        cached.forEach((p) => p?._campaignId && trackCampaignEvent(p._campaignId, 'impression'));
        return;
      }

      try {
        const res = await fetch('/api/campaigns/sponsored?placement=homepage&limit=4');
        if (res.ok) {
          const data = await res.json();
          const items = data.sponsored || [];
          setSponsored(items);
          writeSessionCache(SPONSORED_CACHE_KEY, items);
          // Fire impression tracking for each sponsored item
          items.forEach((p) => p._campaignId && trackCampaignEvent(p._campaignId, 'impression'));
        }
      } catch (_) { /* non-critical */ }
    };
    fetchSponsored();
  }, []);

  // Check if user is logged in via API
  useEffect(() => {
    const checkAuth = async () => {
      const cached = readSessionCache(AUTH_CACHE_KEY, AUTH_CACHE_MS);
      if (cached && typeof cached === 'object') {
        const cachedUser = cached.user || null;
        setCurrentUser(cachedUser);
        setIsLoggedIn(Boolean(cachedUser));
        return;
      }

      try {
        const res = await fetch('/api/auth/me', { 
          credentials: 'include',
          cache: 'no-store'
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.user) {
            setIsLoggedIn(true);
            setCurrentUser(data.user);
            writeSessionCache(AUTH_CACHE_KEY, { user: data.user });
          }
        } else {
          writeSessionCache(AUTH_CACHE_KEY, { user: null });
        }
      } catch (_) {
        // User not logged in
      }
    };
    checkAuth();
  }, []);

  // Fetch marketplace visibility settings
  useEffect(() => {
    const fetchVisibility = async () => {
      const cached = readSessionCache(SETTINGS_CACHE_KEY, SETTINGS_CACHE_MS);
      if (cached && typeof cached === 'object') {
        setVisibilitySettings({
          marketplaceShowStock: cached.marketplaceShowStock !== false,
          marketplaceShowGroup: cached.marketplaceShowGroup !== false,
          marketplaceShowSharedContainer: cached.marketplaceShowSharedContainer !== false,
        });
        return;
      }

      try {
        const res = await fetch('/api/settings');
        if (!res.ok) return;
        const data = await res.json();
        if (data?.settings) {
          const nextSettings = {
            marketplaceShowStock: data.settings.marketplaceShowStock !== false,
            marketplaceShowGroup: data.settings.marketplaceShowGroup !== false,
            marketplaceShowSharedContainer: data.settings.marketplaceShowSharedContainer !== false,
          };
          writeSessionCache(SETTINGS_CACHE_KEY, nextSettings);
          setVisibilitySettings({
            marketplaceShowStock: nextSettings.marketplaceShowStock,
            marketplaceShowGroup: nextSettings.marketplaceShowGroup,
            marketplaceShowSharedContainer: nextSettings.marketplaceShowSharedContainer,
          });
        }
      } catch {
        // ignore - defaults are all true
      }
    };
    fetchVisibility();
  }, []);

  // Count how many product types are active
  const activeTypeCount = [visibilityForUi.marketplaceShowStock, visibilityForUi.marketplaceShowGroup, visibilityForUi.marketplaceShowSharedContainer].filter(Boolean).length;
  const singleActiveMode = activeTypeCount === 1
    ? (visibilityForUi.marketplaceShowStock ? 'stock' : visibilityForUi.marketplaceShowGroup ? 'group' : 'shared_container')
    : null;

  // When only 1 type is active, auto-select it; also reset if current type becomes hidden
  useEffect(() => {
    if (singleActiveMode) {
      setSelectedInventoryMode(singleActiveMode);
    } else if (selectedInventoryMode === 'stock' && !visibilityForUi.marketplaceShowStock) {
      setSelectedInventoryMode('all');
    } else if (selectedInventoryMode === 'group' && !visibilityForUi.marketplaceShowGroup) {
      setSelectedInventoryMode('all');
    } else if (selectedInventoryMode === 'shared_container' && !visibilityForUi.marketplaceShowSharedContainer) {
      setSelectedInventoryMode('all');
    }
  }, [visibilityForUi, selectedInventoryMode, singleActiveMode]);

  const openShareModal = (product) => {
    if (!isLoggedIn) {
      window.location.href = '/register';
      return;
    }
    setShareModalProduct(product);
    setShareModalOpen(true);
  };

  const clearFilters = () => {
    setSelectedTenant('');
    setSelectedCategory('');
    setSelectedInventoryMode('all');
    setSearchInput('');
    setSearchQuery('');
    setPage(1);
  };

  const hasActiveFilters = selectedTenant || selectedCategory || searchInput;

  // סינון לפי inventoryMode בצד הלקוח + visibility settings (תואם ל-/api/products)
  const filteredProducts = products.filter(product => {
    if (!productPassesMarketplaceVisibility(product, visibilityForUi)) return false;

    const mode = getCatalogProductMode(product);

    // Then: filter by selected inventory mode
    if (selectedInventoryMode === 'all') return true;
    if (selectedInventoryMode === 'stock') return mode === 'stock';
    if (selectedInventoryMode === 'group') return mode === 'group';
    if (selectedInventoryMode === 'shared_container') return mode === 'shared_container';
    return true;
  });

  return (
    <PageTextEditor pageKey="marketplace-home">
    <div className="min-h-screen bg-gray-50/50 pl-14 sm:pl-16" dir="rtl">
      {/* Header + רקע ממשיך למטה */}
      <header className="text-white pt-[42px] pb-10 sm:pb-12 rounded-b-3xl" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0e7490 60%, #0891b2 100%)', marginTop: '-42px' }}>
        <div className="max-w-7xl mx-auto px-4 py-3 md:py-5">
          <div className="flex flex-col md:flex-row md:items-center md:gap-6">
            <div className="text-center md:text-right md:flex-shrink-0">
              <h1 className="text-lg md:text-2xl font-bold leading-tight">
                מרקטפלייס המוצרים
              </h1>
              <p className="text-blue-100 text-xs md:text-sm">
                מוצרים מכל העסקים במקום אחד • שתף והרווח 10% מכל רכישה
              </p>
            </div>

            {/* חיפוש */}
            <div className="max-w-xl w-full mx-auto md:mx-0 mt-2 md:mt-0 relative flex-1">
              <input
                type="text"
                placeholder="חפש מוצרים..."
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                }}
                className="w-full px-4 py-2 pr-10 rounded-full text-gray-900 text-sm placeholder-gray-500 shadow-md focus:outline-none focus:ring-2 focus:ring-cyan-400"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <SearchIcon />
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* פילטרים - צף מעל ה-header עם רקע מעוגל */}
      <div className="sticky top-[42px] z-40 -mt-6 sm:-mt-8">
        <div className="mx-auto max-w-3xl px-3">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 px-2 sm:px-3 py-2">
          <div className="flex items-center justify-center gap-1.5 sm:gap-2 scroll-x-auto">
            {/* כפתורי זמינות - מוסתרים כשרק סוג אחד פעיל */}
            {activeTypeCount > 1 && (
            <>
            <button
              onClick={() => setSelectedInventoryMode('all')}
              className={`h-8 sm:h-9 px-3 sm:px-5 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 flex items-center justify-center ${
                selectedInventoryMode === 'all'
                  ? 'text-white shadow-lg'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
              style={selectedInventoryMode === 'all' ? { background: gradientPrimary } : {}}
            >
              הכל
            </button>
            {visibilityForUi.marketplaceShowStock && (
            <button
              onClick={() => setSelectedInventoryMode('stock')}
              className={`h-8 sm:h-9 px-3 sm:px-5 rounded-full text-xs sm:text-sm font-medium transition-all flex-shrink-0 flex items-center justify-center whitespace-nowrap ${
                selectedInventoryMode === 'stock'
                  ? 'text-white shadow-lg'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
              style={selectedInventoryMode === 'stock' ? { background: gradientPrimary } : {}}
            >
              זמין במלאי
            </button>
            )}
            {visibilityForUi.marketplaceShowGroup && (
            <button
              onClick={() => setSelectedInventoryMode('group')}
              className={`h-8 sm:h-9 px-3 sm:px-5 rounded-full text-xs sm:text-sm font-medium transition-all flex-shrink-0 flex items-center justify-center whitespace-nowrap ${
                selectedInventoryMode === 'group'
                  ? 'text-white shadow-lg'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
              style={selectedInventoryMode === 'group' ? { background: gradientPrimary } : {}}
            >
              רכישה קבוצתית
            </button>
            )}
            {visibilityForUi.marketplaceShowSharedContainer && (
            <button
              onClick={() => setSelectedInventoryMode('shared_container')}
              className={`h-8 sm:h-9 px-3 sm:px-5 rounded-full text-xs sm:text-sm font-medium transition-all flex-shrink-0 flex items-center justify-center whitespace-nowrap ${
                selectedInventoryMode === 'shared_container'
                  ? 'text-white shadow-lg'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
              style={selectedInventoryMode === 'shared_container' ? { background: gradientPrimary } : {}}
            >
              מכירה משותפת
            </button>
            )}
            </>
            )}

            {/* מפריד - רק כשכפתורי הזמינות מוצגים */}
            {activeTypeCount > 1 && <div className="hidden md:block w-px h-5 bg-gray-300/60 mx-1" />}

            {/* עסקים */}
            <select
              value={selectedTenant}
              onChange={(e) => {
                setSelectedTenant(e.target.value);
                setPage(1);
              }}
              className="hidden md:block h-9 px-4 bg-white border border-gray-200 rounded-full text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-400 cursor-pointer hover:bg-gray-50"
            >
              <option value="">כל העסקים</option>
              {tenants.map(t => (
                <option key={t._id} value={t.slug}>{t.name}</option>
              ))}
            </select>

            {/* קטגוריות */}
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(1);
              }}
              className="hidden md:block h-9 px-4 bg-white border border-gray-200 rounded-full text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-400 cursor-pointer hover:bg-gray-50"
            >
              <option value="">כל הקטגוריות</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* כפתור פילטרים (מובייל בלבד) */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="md:hidden h-9 flex-shrink-0 flex items-center justify-center gap-1.5 px-4 rounded-full text-sm font-medium whitespace-nowrap transition-all bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              <FilterIcon />
              <span>עוד</span>
              {hasActiveFilters && (
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
              )}
            </button>

            {/* ניקוי פילטרים */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="h-9 px-4 text-sm text-red-500 hover:bg-red-50 rounded-full transition-colors whitespace-nowrap font-medium"
              >
                איפוס
              </button>
            )}
          </div>
        </div>
        </div>
      </div>

      {/* Bottom Sheet - פילטרים מובייל */}
      {showFilters && (
        <div className="md:hidden fixed inset-0 z-50">
          {/* Overlay */}
          <div 
            className="absolute inset-0 bg-black/50 transition-opacity"
            onClick={() => setShowFilters(false)}
          />
          {/* Drawer */}
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl animate-slide-up">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>
            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-4 border-b">
              <h3 className="text-lg font-bold text-gray-900">סינון מוצרים</h3>
              <button 
                onClick={() => setShowFilters(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500"
              >
                ✕
              </button>
            </div>
            {/* Content */}
            <div className="p-5 space-y-5 max-h-[60vh] overflow-y-auto">
              {/* זמינות - מוסתר כשרק סוג אחד פעיל */}
              {activeTypeCount > 1 && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-3 block">זמינות</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'all', label: 'הכל' },
                    { value: 'stock', label: 'זמין במלאי', visKey: 'marketplaceShowStock' },
                    { value: 'group', label: 'רכישה קבוצתית', visKey: 'marketplaceShowGroup' },
                    { value: 'shared_container', label: 'מכירה משותפת', visKey: 'marketplaceShowSharedContainer' },
                  ].filter(opt => !opt.visKey || visibilityForUi[opt.visKey]).map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setSelectedInventoryMode(opt.value)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        selectedInventoryMode === opt.value
                          ? 'text-white shadow-md'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                      style={selectedInventoryMode === opt.value ? { background: gradientPrimary } : {}}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              )}
              {/* עסק */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">עסק</label>
                <select
                  value={selectedTenant}
                  onChange={(e) => {
                    setSelectedTenant(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                >
                  <option value="">כל העסקים</option>
                  {tenants.map(t => (
                    <option key={t._id} value={t.slug}>{t.name}</option>
                  ))}
                </select>
              </div>
              {/* קטגוריה */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">קטגוריה</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                >
                  <option value="">כל הקטגוריות</option>
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            {/* Footer */}
            <div className="p-5 border-t bg-gray-50 flex gap-3">
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex-1 py-3 text-red-600 bg-white border border-red-200 rounded-xl text-sm font-medium"
                >
                  נקה הכל
                </button>
              )}
              <button
                onClick={() => setShowFilters(false)}
                className="flex-1 py-3 text-white rounded-xl text-sm font-medium shadow-lg"
                style={{ background: gradientPrimary }}
              >
                הצג {products.length} מוצרים
              </button>
            </div>
          </div>
        </div>
      )}

      {/* תוכן ראשי */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-3 lg:px-6 lg:py-4">
        {selectedTenant && (
          <div className="mb-4 rounded-xl border border-cyan-200/80 bg-gradient-to-l from-cyan-50 to-white px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm">
            <p className="text-sm text-gray-700">
              מציגים מוצרים מ־
              <span className="font-semibold text-gray-900">
                {tenants.find((t) => t.slug === selectedTenant)?.name || 'העסק שנבחר'}
              </span>
            </p>
            <Link
              href={`/t/${encodeURIComponent(selectedTenant)}`}
              className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:opacity-95 whitespace-nowrap"
              style={{ background: gradientPrimary }}
            >
              עבור לדף החנות המלא
            </Link>
          </div>
        )}
        {/* סטטוס */}
        {!loading && (
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">
              {pagination.total > 0 
                ? `נמצאו ${pagination.total} מוצרים`
                : 'לא נמצאו מוצרים'}
            </p>
          </div>
        )}

        {/* טעינה */}
        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 lg:gap-4">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse">
                <div className="aspect-square bg-gray-200" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                  <div className="h-4 bg-gray-200 rounded" />
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                  <div className="h-5 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* שגיאה */}
        {error && !loading && (
          <div className="text-center py-12">
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={fetchProducts}
              className="px-4 py-2 bg-cyan-600 text-white rounded-lg"
            >
              נסה שוב
            </button>
          </div>
        )}

        {/* מוצרים */}
        {!loading && !error && (filteredProducts.length > 0 || sponsored.length > 0) && (
          <div data-no-edit="true" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 lg:gap-4">
            {/* ממומן - תמיד בראש הרשימה */}
            {sponsored.map((product) => (
              <CatalogProductCard
                key={`sponsored-${product._campaignId}`}
                product={product}
                displayMode={selectedInventoryMode}
                isLoggedIn={isLoggedIn}
                onOpenShareModal={openShareModal}
              />
            ))}
            {filteredProducts.map((product) => (
              <CatalogProductCard
                key={product._id}
                product={product}
                displayMode={selectedInventoryMode}
                isLoggedIn={isLoggedIn}
                onOpenShareModal={openShareModal}
              />
            ))}
          </div>
        )}

        {/* אין מוצרים */}
        {!loading && !error && filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 text-gray-300">
              <StoreIcon />
            </div>
            <p className="text-gray-500 mb-4">
              {selectedInventoryMode === 'stock' && 'לא נמצאו מוצרים במלאי מיידי'}
              {selectedInventoryMode === 'group' && 'לא נמצאו מוצרים ברכישה קבוצתית'}
              {selectedInventoryMode === 'shared_container' && 'לא נמצאו מוצרים במכירה משותפת'}
              {selectedInventoryMode === 'all' && 'לא נמצאו מוצרים התואמים לחיפוש'}
            </p>
            {(hasActiveFilters || selectedInventoryMode !== 'all') && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-cyan-600 text-white rounded-lg"
              >
                נקה פילטרים
              </button>
            )}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-8">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-gray-100 rounded-lg disabled:opacity-50"
            >
              הקודם
            </button>
            <span className="text-sm text-gray-600">
              עמוד {page} מתוך {pagination.pages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
              disabled={page === pagination.pages}
              className="px-4 py-2 bg-gray-100 rounded-lg disabled:opacity-50"
            >
              הבא
            </button>
          </div>
        )}
      </main>

      {/* CTA להירשם כסוכן / לשתף */}
      <section className="text-white py-12 mt-10 rounded-t-[2rem]" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0e7490 60%, #0891b2 100%)' }}>
        <div className="max-w-4xl mx-auto px-4 text-center">
          {isLoggedIn ? (
            <>
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                כל יום אתה משתף - למה לא להרוויח מזה?
              </h2>
              <p className="text-blue-100 mb-6">
                החברים שלך קונים בכל מקרה. שתף מוצר אחד ברשתות החברתיות וקבל 10% מכל רכישה!
              </p>
              <Link
                href="/join"
                className="inline-block px-8 py-3 bg-white text-blue-900 font-bold rounded-full hover:bg-blue-50 transition-colors"
              >
                הפוך לסוכן עכשיו
              </Link>
              <p className="text-blue-200 text-sm mt-3">
                אלפי משתמשים כבר מרוויחים - אל תפספס!
              </p>
            </>
          ) : (
            <>
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                רוצה להרוויח מכל שיתוף?
              </h2>
              <p className="text-blue-100 mb-6">
                הירשם כסוכן ותקבל 10% מכל רכישה שנעשית דרך הלינק שלך
              </p>
              <Link
                href="/register"
                className="inline-block px-8 py-3 bg-white text-blue-900 font-bold rounded-full hover:bg-blue-50 transition-colors"
              >
                הירשם עכשיו - חינם!
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Share Modal */}
      {shareModalOpen && (
        <ShareModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          product={shareModalProduct}
          tenants={tenants}
          user={currentUser}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-fade-in">
          <span className="text-green-400">✓</span>
          <span className="text-sm">{toast}</span>
          <button onClick={() => setToast(null)} className="text-gray-400 hover:text-white">
            <CloseIcon />
          </button>
        </div>
      )}
    </div>
    </PageTextEditor>
  );
}
