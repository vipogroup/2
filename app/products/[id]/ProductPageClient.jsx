'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getProductById, fetchProductById } from '@/app/lib/products';
import { useCartContext } from '@/app/context/CartContext';
import { useTheme } from '@/app/context/ThemeContext';
import {
  isGroupPurchase,
  getGroupTimeRemaining,
  formatGroupCountdown,
} from '@/app/lib/groupPurchase';
import {
  getMainImageSrc,
  getThumbnailSrc,
  getZoomImageSrc,
  getOptimizedImageSrc,
} from '@/lib/cloudinary-transforms';
import { getProductPublicPath } from '@/lib/stainlessSeoCategories';
import { getVisibilityForUi, productPassesMarketplaceVisibility } from '@/lib/marketplaceProductVisibility';
import { isProbablyRichHtml, sanitizeProductHtmlFragment } from '@/lib/htmlContentSafe';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.vipo-group.com').trim();
const ShareModal = dynamic(() => import('@/app/components/ShareModal'));

function stringifyTenantId(raw) {
  if (raw == null) return '';
  if (typeof raw === 'object' && raw !== null && '$oid' in raw) return String(raw.$oid);
  return String(raw);
}

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const variant = pathname?.includes('/products/shared-container/') ? 'shared_container' : undefined;

  const [product, setProduct] = useState(null);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [showZoom, setShowZoom] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [user, setUser] = useState(null);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [productError, setProductError] = useState(false);
  const [groupTimeLeft, setGroupTimeLeft] = useState(null);
  const [showAllFeatures, setShowAllFeatures] = useState(false);
  const [showSpecs, setShowSpecs] = useState(false);
  const [showDescription, setShowDescription] = useState(true);
  const [showSuitableFor, setShowSuitableFor] = useState(false);
  const [showWhyChooseUs, setShowWhyChooseUs] = useState(false);
  const [showWarranty, setShowWarranty] = useState(false);
  const [customFieldsOpen, setCustomFieldsOpen] = useState({});
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loadingRelated, setLoadingRelated] = useState(true);
  const [tenants, setTenants] = useState([]);
  const [containerProgress, setContainerProgress] = useState(null);
  /** כשה־API מחזיר tenantId בלי אובייקט tenant — נטען מ־/api/tenants/public */
  const [resolvedTenant, setResolvedTenant] = useState(null);
  const relatedScrollRef = useRef(null);
  const galleryTouchRef = useRef({ startX: 0, startY: 0, isDragging: false });
  const { addItem } = useCartContext();
  const { settings: themeSettings } = useTheme();

  const {
    primaryColor,
    secondaryColor,
    accentColor,
    textColor,
    backgroundGradient,
    cardBackground,
    buttonGradient,
    borderSoftColor,
  } = useMemo(() => {
    const primary = themeSettings?.primaryColor || '#4f46e5';
    const secondary = themeSettings?.secondaryColor || '#4338ca';
    const accent = themeSettings?.accentColor || '#ec4899';
    const text = themeSettings?.textColor || '#1f2937';
    const background =
      themeSettings?.backgroundGradient ||
      `linear-gradient(135deg, ${primary} 0%, ${secondary} 50%, ${accent} 100%)`;
    const cardBg =
      themeSettings?.cardGradient ||
      'linear-gradient(145deg, rgba(255,255,255,0.92) 0%, rgba(240,246,255,0.98) 100%)';
    const buttonBg =
      themeSettings?.buttonGradient ||
      `linear-gradient(135deg, ${primary} 0%, ${secondary} 48%, ${accent} 100%)`;
    const borderColor = themeSettings?.primaryColor
      ? `${themeSettings.primaryColor}33`
      : 'rgba(79,70,229,0.28)';

    return {
      primaryColor: primary,
      secondaryColor: secondary,
      accentColor: accent,
      textColor: text,
      backgroundGradient: background,
      cardBackground: cardBg,
      buttonGradient: buttonBg,
      borderSoftColor: borderColor,
    };
  }, [themeSettings]);

  const outlineHoverColor = useMemo(
    () =>
      themeSettings?.backgroundColor
        ? `${themeSettings.backgroundColor}dd`
        : 'rgba(255,255,255,0.85)',
    [themeSettings],
  );

  const loadProduct = useCallback(async () => {
    const id = params.id;
    if (!id) {
      setProduct(null);
      setProductError(true);
      setLoadingProduct(false);
      return;
    }

    setLoadingProduct(true);
    setProductError(false);

    const cached = getProductById(id);
    if (cached) {
      setProduct(cached);
    }

    try {
      const remote = await fetchProductById(id);
      if (remote) {
        setProduct(remote);
        setProductError(false);
      } else if (!cached) {
        setProduct(null);
        setProductError(true);
      }
    } catch (error) {
      console.error('Failed to load product', error);
      if (!cached) {
        setProduct(null);
        setProductError(true);
      }
    }
    setLoadingProduct(false);
  }, [params.id]);

  useEffect(() => {
    loadProduct();
    async function fetchUser() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else setUser(null);
      } catch {
        setUser(null);
      }
    }
    fetchUser();
  }, [params.id, loadProduct]);

  useEffect(() => {
    const update = () => {
      loadProduct();
    };
    window.addEventListener('productsUpdated', update);
    return () => window.removeEventListener('productsUpdated', update);
  }, [params.id, loadProduct]);

  useEffect(() => setSelectedMediaIndex(0), [product?._id]);

  useEffect(() => {
    let cancelled = false;
    async function loadTenantPreview() {
      if (!product) {
        setResolvedTenant(null);
        return;
      }
      if (product.tenant?.slug) {
        setResolvedTenant(null);
        return;
      }
      const tid = stringifyTenantId(product.tenantId);
      if (!tid || !/^[a-f0-9]{24}$/i.test(tid)) {
        setResolvedTenant(null);
        return;
      }
      try {
        const res = await fetch(`/api/tenants/public/${encodeURIComponent(tid)}`, {
          cache: 'no-store',
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (data?.tenant?.slug && !cancelled) {
          setResolvedTenant(data.tenant);
        }
      } catch {
        if (!cancelled) setResolvedTenant(null);
      }
    }
    loadTenantPreview();
    return () => {
      cancelled = true;
    };
  }, [product]);

  const tenantForUi = useMemo(() => {
    if (product?.tenant?.slug) return product.tenant;
    return resolvedTenant;
  }, [product?.tenant, resolvedTenant]);

  const visibleSeoLead = useMemo(() => {
    if (!product) return null;
    const strip = (s) =>
      String(s || '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    const parts = [
      product.fullDescription,
      product.description,
      product.whyChooseUs,
      product.suitableFor,
    ]
      .map(strip)
      .filter(Boolean);
    const combined = [...new Set(parts)].join(' ').trim();
    if (combined.length < 55) return null;
    const title = strip(product.name);
    if (combined === title) return null;
    if (combined.startsWith(title) && combined.length <= title.length + 35) return null;
    return combined.length > 400 ? `${combined.slice(0, 397).trim()}…` : combined;
  }, [product]);

  // Load related products
  useEffect(() => {
    if (!product?._id) {
      setRelatedProducts([]);
      setLoadingRelated(false);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    const pickRandom = (list, count) =>
      [...list]
        .sort(() => Math.random() - 0.5)
        .slice(0, count);

    const parseProducts = async (response) => {
      if (!response?.ok) return [];
      const payload = await response.json();
      return Array.isArray(payload?.products) ? payload.products : [];
    };

    const loadRelatedProducts = async () => {
      setLoadingRelated(true);
      try {
        const settingsRes = await fetch('/api/settings', { signal: controller.signal });
        let visibilityForUi = getVisibilityForUi({});
        if (settingsRes.ok) {
          const data = await settingsRes.json();
          const s = data?.settings;
          if (s && typeof s === 'object') {
            visibilityForUi = getVisibilityForUi({
              marketplaceShowStock: s.marketplaceShowStock !== false,
              marketplaceShowGroup: s.marketplaceShowGroup !== false,
              marketplaceShowSharedContainer: s.marketplaceShowSharedContainer !== false,
            });
          }
        }

        const urls = [];
        if (visibilityForUi.marketplaceShowStock) {
          urls.push('/api/marketplace/products?limit=48&type=regular');
        }
        if (visibilityForUi.marketplaceShowGroup || visibilityForUi.marketplaceShowSharedContainer) {
          urls.push('/api/marketplace/products?limit=48&type=group');
        }

        const responses = await Promise.all(
          urls.map((u) => fetch(u, { signal: controller.signal })),
        );
        const chunks = await Promise.all(responses.map((r) => parseProducts(r)));

        const byId = new Map();
        for (const list of chunks) {
          for (const item of list) {
            if (item?._id && item._id !== product._id && !byId.has(item._id)) {
              byId.set(item._id, item);
            }
          }
        }

        let pool = [...byId.values()].filter((p) => productPassesMarketplaceVisibility(p, visibilityForUi));
        const mixed = pickRandom(pool, 8);

        if (!cancelled) {
          setRelatedProducts(mixed);
        }
      } catch (error) {
        if (error?.name !== 'AbortError') {
          console.error('Failed to load related products:', error);
        }
        if (!cancelled) {
          setRelatedProducts([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingRelated(false);
        }
      }
    };

    loadRelatedProducts();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [product?._id]);

  // Auto-scroll related products carousel
  useEffect(() => {
    if (!relatedProducts.length || !relatedScrollRef.current) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isSmallViewport = window.innerWidth < 768;
    if (prefersReducedMotion || isSmallViewport) return;
    
    const container = relatedScrollRef.current;
    const scrollSpeed = 1; // pixels per frame
    let scrollDirection = 1; // 1 = right, -1 = left
    let animationId;
    let isPaused = false;
    
    const autoScroll = () => {
      if (!isPaused && container) {
        container.scrollLeft += scrollSpeed * scrollDirection;
        
        // Reverse direction at edges
        if (container.scrollLeft >= container.scrollWidth - container.clientWidth - 5) {
          scrollDirection = -1;
        } else if (container.scrollLeft <= 5) {
          scrollDirection = 1;
        }
      }
      animationId = requestAnimationFrame(autoScroll);
    };
    
    // Start auto-scroll after 2 seconds
    const startTimeout = setTimeout(() => {
      animationId = requestAnimationFrame(autoScroll);
    }, 2000);
    
    // Pause on hover/touch
    const handleMouseEnter = () => { isPaused = true; };
    const handleMouseLeave = () => { isPaused = false; };
    const handleTouchStart = () => { isPaused = true; };
    const handleTouchEnd = () => { setTimeout(() => { isPaused = false; }, 3000); };
    
    container.addEventListener('mouseenter', handleMouseEnter);
    container.addEventListener('mouseleave', handleMouseLeave);
    container.addEventListener('touchstart', handleTouchStart);
    container.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      clearTimeout(startTimeout);
      if (animationId) cancelAnimationFrame(animationId);
      container.removeEventListener('mouseenter', handleMouseEnter);
      container.removeEventListener('mouseleave', handleMouseLeave);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [relatedProducts]);


  useEffect(() => {
    if (!product || !isGroupPurchase(product)) {
      setGroupTimeLeft(null);
      return;
    }

    const tick = () => setGroupTimeLeft(getGroupTimeRemaining(product));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [product]);

  // Fetch cross-tenant container progress for shared_container products with containerScope='shared'
  useEffect(() => {
    if (!product) return;
    const isSC = product.groupPurchaseType === 'shared_container' || variant === 'shared_container';
    const isSharedScope = product.containerScope === 'shared';
    if (!isSC || product.purchaseType !== 'group' || !isSharedScope) {
      setContainerProgress(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/marketplace/container-progress?scope=shared', { cache: 'no-store' });
        if (res.ok && !cancelled) {
          const data = await res.json();
          setContainerProgress(data);
        }
      } catch (err) {
        console.error('Failed to fetch container progress', err);
      }
    })();
    return () => { cancelled = true; };
  }, [product, variant]);

  // Sticky Bar - show when scrolling past action buttons
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setShowStickyBar(scrollY > 600);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);


  // Load tenants only when opening share modal to avoid extra work on initial page load.
  useEffect(() => {
    if (!showShareModal || tenants.length > 0) return;

    const controller = new AbortController();
    let cancelled = false;

    const fetchTenants = async () => {
      try {
        const res = await fetch('/api/marketplace/products?limit=1', { signal: controller.signal });
        if (res.ok && !cancelled) {
          const data = await res.json();
          setTenants(Array.isArray(data?.tenants) ? data.tenants : []);
        }
      } catch (error) {
        if (error?.name !== 'AbortError') {
          console.error('Failed to fetch tenants for share modal:', error);
        }
      }
    };

    fetchTenants();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [showShareModal, tenants.length]);

  const canonicalProductUrl = useMemo(() => {
    if (!product) return SITE_URL;
    const path = getProductPublicPath(product);
    return path ? `${SITE_URL}${path}` : SITE_URL;
  }, [product]);

  const breadcrumbItems = useMemo(
    () => [
      { name: 'דף הבית', url: SITE_URL },
      { name: product?.name || 'מוצר', url: canonicalProductUrl },
    ],
    [product?.name, canonicalProductUrl],
  );

  const handleGalleryTouchStart = useCallback((e) => {
    galleryTouchRef.current.startX = e.touches[0].clientX;
    galleryTouchRef.current.startY = e.touches[0].clientY;
    galleryTouchRef.current.isDragging = true;
  }, []);

  const handleGalleryTouchEnd = useCallback((e) => {
    if (!galleryTouchRef.current.isDragging) return;
    galleryTouchRef.current.isDragging = false;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const diffX = galleryTouchRef.current.startX - endX;
    const diffY = galleryTouchRef.current.startY - endY;
    const mediaImages = Array.isArray(product?.media?.images) ? product.media.images : [];
    const imgCount = [...new Set(mediaImages.map(i => i?.url).filter(Boolean))].length;
    const videoCount = product?.media?.videoUrl ? 1 : 0;
    const totalMedia = Math.max(imgCount + videoCount, 1);
    if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX > 0) {
        setSelectedMediaIndex(prev => (prev < totalMedia - 1 ? prev + 1 : 0));
      } else {
        setSelectedMediaIndex(prev => (prev > 0 ? prev - 1 : totalMedia - 1));
      }
      setShowZoom(false);
    }
  }, [product]);

  if (loadingProduct) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-10 py-12 text-center max-w-md">
          <div className="flex items-center justify-center mb-6">
            <div
              className="h-12 w-12 rounded-full border-4 border-gray-200 animate-spin"
              style={{ borderTopColor: '#1e3a8a', borderBottomColor: '#0891b2' }}
            ></div>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">טוען מוצר...</h2>
          <p className="text-gray-600">אנא המתן</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">מוצר לא נמצא</h1>
          <p className="text-gray-600 mb-6">המוצר שחיפשת אינו קיים במערכת</p>
          <Link
            href="/products"
            className="inline-block text-white font-semibold px-6 py-3 rounded-lg transition-all duration-300"
            style={{
              background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
              boxShadow: '0 2px 8px rgba(8, 145, 178, 0.2)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background =
                'linear-gradient(135deg, #0891b2 0%, #1e3a8a 100%)';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(8, 145, 178, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background =
                'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(8, 145, 178, 0.2)';
            }}
          >
            חזרה לחנות
          </Link>
        </div>
      </div>
    );
  }

  const productHeading =
    (product.seo?.h1 && String(product.seo.h1).trim()) || product.name || 'מוצר';

  const mediaImages = Array.isArray(product.media?.images) ? product.media.images : [];
  const seenMediaUrls = new Set();
  const mediaItems = [];
  for (const img of mediaImages) {
    const src = img?.url;
    if (!src || seenMediaUrls.has(src)) continue;
    seenMediaUrls.add(src);
    mediaItems.push({
      type: 'image',
      src,
      alt: typeof img?.alt === 'string' ? img.alt.trim() : '',
    });
  }
  if (product.media?.videoUrl) {
    mediaItems.push({ type: 'video', src: product.media.videoUrl, alt: '' });
  }

  if (mediaItems.length === 0) {
    mediaItems.push({
      type: 'image',
      src: 'https://via.placeholder.com/800x600?text=No+Image',
      alt: productHeading ? `אין תמונה — ${productHeading}` : 'אין תמונה זמינה',
    });
  }

  const selectedMedia = mediaItems[selectedMediaIndex];
  const primaryImageSrc = mediaItems.find((m) => m.type === 'image')?.src || '';
  const videoPosterSrc = primaryImageSrc ? getMainImageSrc(primaryImageSrc) : undefined;

  const hasDiscount =
    typeof product.originalPrice === 'number' && product.originalPrice > product.price;

  const discountPercent = hasDiscount
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  const handleBuyNow = () => {
    addItem(product, quantity);
    router.push('/checkout');
  };

  const handleShare = () => {
    if (!product) return;
    if (!user) {
      router.push('/register');
      return;
    }
    setShowShareModal(true);
  };

  // Get first 4 features for preview
  const visibleFeatures = product.features?.filter(f => f)?.slice(0, showAllFeatures ? undefined : 4) || [];
  const hasMoreFeatures = (product.features?.filter(f => f)?.length || 0) > 4;
  const isPublished = product?.status === 'published';
  const isSharedContainer = product?.groupPurchaseType === 'shared_container' || variant === 'shared_container';
  const groupPurchaseTitle = isSharedContainer ? 'מכולה משותפת' : 'רכישה קבוצתית';
  const groupPurchaseSubtitle = isSharedContainer ? 'הצטרפו למכולה וחסכו!' : 'הצטרפו לקבוצה וחסכו!';
  const groupUrgencyTitle = isSharedContainer ? 'המכולה נסגרת בעוד:' : 'המבצע נגמר בעוד:';
  const groupProgressTitle = isSharedContainer ? 'התקדמות המכולה' : 'התקדמות הקבוצה';
  const groupJoinedLabel = isSharedContainer ? 'הוזמנו' : 'נרשמו';
  const groupTargetLabel = isSharedContainer ? 'יחידות' : 'משתתפים';
  const groupDaysLeftLabel = isSharedContainer ? 'ימים לסגירה' : 'ימים נותרו';

  // Safe group purchase calculations (prevent NaN)
  // For shared_container: use cross-tenant aggregated totalUnits from containerProgress API
  const gpd = product?.groupPurchaseDetails || {};
  const gpCurrentLocal = gpd.currentQuantity || product?.groupCurrentQuantity || 0;
  const gpCurrent = (isSharedContainer && containerProgress)
    ? containerProgress.totalUnits
    : gpCurrentLocal;
  const gpMin = gpd.minQuantity || product?.groupMinQuantity || 1;
  const gpRatio = gpMin > 0 ? gpCurrent / gpMin : 0;
  const gpPercent = Math.round(gpRatio * 100);
  const gpRemaining = Math.max(0, gpMin - gpCurrent);
  const richDescription = [
    product.fullDescription,
    product.description,
    product.suitableFor,
    product.whyChooseUs,
    product.warranty,
    product.faq,
    product.structuredData,
  ]
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .join('\n\n');

  return (
    <div className="min-h-screen pb-0 -mt-3.5 bg-gradient-to-b from-slate-100/90 via-gray-50 to-white">

      {/* Urgency Banner - flush, no gap */}
      {product.purchaseType === 'group' && product.groupPurchaseDetails && groupTimeLeft && !groupTimeLeft.expired && (
        <div className="w-full" style={{ background: 'linear-gradient(90deg, #1e3a8a 0%, #0891b2 100%)' }}>
          <div className="max-w-2xl mx-auto px-5 py-2.5">
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span className="text-sm font-bold">{groupUrgencyTitle}</span>
              </div>
              <div className="flex items-center gap-1 font-mono font-bold" dir="ltr">
                <span className="bg-white/20 px-2 py-1 rounded text-sm">{String(groupTimeLeft.days || 0).padStart(2, '0')}</span>
                <span className="text-xs opacity-70">:</span>
                <span className="bg-white/20 px-2 py-1 rounded text-sm">{String(groupTimeLeft.hours || 0).padStart(2, '0')}</span>
                <span className="text-xs opacity-70">:</span>
                <span className="bg-white/20 px-2 py-1 rounded text-sm">{String(groupTimeLeft.minutes || 0).padStart(2, '0')}</span>
                <span className="text-xs opacity-70">:</span>
                <span className="bg-white/20 px-2 py-1 rounded text-sm">{String(groupTimeLeft.seconds || 0).padStart(2, '0')}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-3 sm:px-4 pt-4 product-page-desktop-layout">
        
        {/* ═══ Gallery Card ═══ */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-md ring-1 ring-slate-200/60 product-gallery">
          <div 
            className={`relative ${selectedMedia.type === 'video' ? 'aspect-video' : 'aspect-[4/3]'} bg-gray-50`}
            onTouchStart={handleGalleryTouchStart}
            onTouchEnd={handleGalleryTouchEnd}
          >
            {/* Navigation Arrows */}
            {mediaItems.length > 1 && (
              <>
                <button
                  onClick={() => setSelectedMediaIndex(prev => (prev > 0 ? prev - 1 : mediaItems.length - 1))}
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full flex items-center justify-center transition-opacity"
                  style={{ background: 'rgba(255,255,255,0.85)', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }}
                  aria-label="תמונה קודמת"
                >
                  <svg className="w-5 h-5" fill="none" stroke="#374151" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => setSelectedMediaIndex(prev => (prev < mediaItems.length - 1 ? prev + 1 : 0))}
                  className="absolute right-14 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full flex items-center justify-center transition-opacity"
                  style={{ background: 'rgba(255,255,255,0.85)', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }}
                  aria-label="תמונה הבאה"
                >
                  <svg className="w-5 h-5" fill="none" stroke="#374151" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}

            {selectedMedia.type === 'video' ? (
              selectedMedia.src.includes('youtube') || selectedMedia.src.includes('youtu.be') ? (
                <iframe
                  src={selectedMedia.src}
                  className="w-full h-full"
                  allowFullScreen
                  title={productHeading ? `סרטון מוצר — ${productHeading}` : 'סרטון מוצר'}
                />
              ) : (
                /* eslint-disable-next-line jsx-a11y/media-has-caption */
                <video 
                  src={selectedMedia.src} 
                  controls 
                  playsInline
                  preload="metadata"
                  poster={videoPosterSrc}
                  className="w-full h-full object-cover"
                  onError={(e) => console.error('Video error:', e.target.error, selectedMedia.src)}
                >
                  הדפדפן שלך לא תומך בתגית וידאו
                </video>
              )
            ) : (
              <Image
                src={getMainImageSrc(selectedMedia.src || 'https://placehold.co/400x300/f3f4f6/9ca3af?text=%F0%9F%93%A6')}
                alt={
                  selectedMedia.type === 'image' && selectedMedia.alt
                    ? selectedMedia.alt
                    : productHeading
                      ? `תמונה של ${productHeading}`
                      : 'תמונת מוצר'
                }
                aria-label={productHeading || 'מוצר'}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 640px"
                className="object-contain cursor-zoom-in"
                priority={selectedMediaIndex === 0}
                fetchPriority={selectedMediaIndex === 0 ? 'high' : 'low'}
                onClick={() => setShowZoom(true)}
              />
            )}
            
            {/* Back Button */}
            <button
              onClick={() => router.back()}
              className="absolute top-3 right-3 z-10 w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.9)', boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }}
              aria-label="חזרה לחנות"
            >
              <svg className="w-5 h-5" fill="none" stroke="#374151" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Share Button */}
            <button
              onClick={handleShare}
              className="absolute top-3 z-10 w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.9)', boxShadow: '0 1px 3px rgba(0,0,0,0.12)', right: '56px' }}
              aria-label="שתף מוצר"
            >
              <svg className="w-5 h-5" fill="none" stroke="#0891b2" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>

            {/* Discount Badge */}
            {hasDiscount && (
              <div className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold" style={{ background: 'rgba(236, 253, 245, 0.95)', color: '#047857', border: '1px solid #6ee7b7' }}>
                {discountPercent}% הנחה
              </div>
            )}

            {/* Image Counter */}
            {mediaItems.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/40 text-white px-3 py-1 rounded-full text-xs">
                {selectedMediaIndex + 1} / {mediaItems.length}
              </div>
            )}
          </div>

          {/* Thumbnail Strip */}
          {mediaItems.length > 1 && (
            <div className="flex gap-2 px-4 py-3 overflow-x-auto border-t border-gray-100">
              {mediaItems.map((item, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setSelectedMediaIndex(i);
                    setShowZoom(false);
                  }}
                  className={`relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${i === selectedMediaIndex ? 'border-cyan-500 ring-1 ring-cyan-200' : 'border-gray-200'}`}
                >
                  {item.type === 'video' ? (
                    <div className="w-full h-full bg-gray-800 text-white flex items-center justify-center">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" /></svg>
                    </div>
                  ) : (
                    <Image
                      src={getThumbnailSrc(item.src)}
                      alt={
                        item.type === 'image' && item.alt
                          ? item.alt
                          : `תמונה ממוזערת ${i + 1} של ${productHeading}`
                      }
                      fill
                      sizes="56px"
                      className="object-cover"
                      loading="lazy"
                    />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* עמודת מחיר + רכישה (דסקטופ: עמודה ימנית אחת; מובייל: ערימה) */}
        <div className="product-page-buy-stack mt-3 flex w-full min-w-0 flex-col gap-3">
        {/* ═══ Product Info Card ═══ */}
        <div className="bg-white rounded-2xl px-5 py-5 shadow-md ring-1 ring-slate-200/70 product-info">
          <nav
            aria-label="מיקום בעמוד"
            className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] sm:text-xs text-slate-500 mb-4 pb-3 border-b border-slate-100"
          >
            <Link href="/" className="hover:text-cyan-800 transition-colors shrink-0 font-medium">
              דף הבית
            </Link>
            <span className="text-slate-300 select-none" aria-hidden>
              ›
            </span>
            {tenantForUi?.slug ? (
              <>
                <Link
                  href={`/t/${encodeURIComponent(String(tenantForUi.slug).trim())}`}
                  className="hover:text-cyan-800 transition-colors truncate max-w-[min(11rem,40vw)] font-medium"
                >
                  {tenantForUi.name || 'חנות'}
                </Link>
                <span className="text-slate-300 select-none" aria-hidden>
                  ›
                </span>
              </>
            ) : null}
            <span className="text-slate-400 truncate min-w-0 flex-1">{productHeading}</span>
          </nav>

          {product.category && (
            <span className="inline-block text-[11px] font-semibold text-cyan-900/90 tracking-wide uppercase mb-2 px-2 py-0.5 rounded-md bg-cyan-50 border border-cyan-100/90">
              {product.category}
            </span>
          )}

          <h1 className="text-xl sm:text-2xl font-bold leading-snug tracking-tight mb-3" style={{ color: '#1e3a8a' }}>
            {productHeading}
          </h1>

          {tenantForUi?.slug ? (
            <Link
              href={`/t/${encodeURIComponent(String(tenantForUi.slug).trim())}`}
              className="flex items-center gap-3 rounded-xl border border-slate-200/90 bg-gradient-to-l from-white to-slate-50/90 px-3 py-2.5 mb-4 transition hover:border-cyan-200/90 hover:shadow-sm no-underline group"
            >
              {tenantForUi.logo ? (
                <Image
                  src={tenantForUi.logo}
                  alt={tenantForUi.name ? `לוגו ${tenantForUi.name}` : 'לוגו חנות'}
                  width={40}
                  height={40}
                  className="rounded-lg object-cover border border-slate-100 shrink-0"
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0"
                  style={{ background: tenantForUi.primaryColor || '#1e3a8a' }}
                >
                  {(tenantForUi.name || 'ח')[0]}
                </div>
              )}
              <div className="min-w-0 text-right flex-1">
                <p className="text-[11px] text-slate-500 font-medium tracking-wide">נמכר ב־</p>
                <p className="text-sm font-semibold text-slate-900 group-hover:text-cyan-900 truncate">
                  {tenantForUi.name || 'חנות'}
                </p>
              </div>
              <span className="text-slate-400 text-lg shrink-0 leading-none" aria-hidden>
                ‹
              </span>
            </Link>
          ) : null}

          {visibleSeoLead ? (
            <section
              className="mb-4 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-3"
              aria-labelledby="product-seo-lead-heading"
            >
              <h2 id="product-seo-lead-heading" className="sr-only">
                תיאור המוצר
              </h2>
              <p className="text-sm text-slate-700 leading-relaxed">{visibleSeoLead}</p>
            </section>
          ) : null}

          {/* Price Row */}
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-2xl sm:text-[1.75rem] font-bold tabular-nums" style={{ color: '#1e3a8a' }}>
              ₪{product.price.toLocaleString('he-IL')}
            </span>
            {hasDiscount && (
              <>
                <span className="text-sm text-gray-400 line-through">
                  ₪{product.originalPrice.toLocaleString('he-IL')}
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(236, 253, 245, 0.9)', color: '#047857' }}>
                  חיסכון ₪{(product.originalPrice - product.price).toLocaleString('he-IL')}
                </span>
              </>
            )}
          </div>
        </div>

        {/* ═══ Purchase Details & Actions ═══ */}
        <div className="product-purchase-section bg-white rounded-2xl px-4 py-5 shadow-md ring-1 ring-slate-200/60">

          {/* Group Purchase Card */}
          {product.purchaseType === 'group' && product.groupPurchaseDetails && (
            <div 
              className="rounded-xl p-4 mb-4"
              style={{
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.06) 0%, rgba(251, 191, 36, 0.06) 100%)',
                border: '1px solid rgba(245, 158, 11, 0.2)',
              }}
            >
              {/* Header */}
              <div className="flex items-center gap-3 mb-3">
                <div 
                  className="w-9 h-9 rounded-full text-white flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)' }}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" /></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-base" style={{ color: '#d97706' }}>{groupPurchaseTitle}</span>
                  <p className="text-xs text-gray-500 leading-tight">{groupPurchaseSubtitle}</p>
                </div>
              </div>

              {/* Inline Stats Row */}
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 bg-white rounded-lg py-2 px-3 text-center" style={{ border: '1px solid rgba(245,158,11,0.15)' }}>
                  <div className="text-base font-bold" style={{ color: gpRatio >= 0.5 ? '#1e3a8a' : '#d97706' }}>{gpCurrent}</div>
                  <div className="text-[11px] text-gray-400">{groupJoinedLabel}</div>
                </div>
                <div className="flex-1 bg-white rounded-lg py-2 px-3 text-center" style={{ border: '1px solid rgba(245,158,11,0.15)' }}>
                  <div className="text-base font-bold" style={{ color: '#d97706' }}>{gpRemaining}</div>
                  <div className="text-[11px] text-gray-400">נותרו</div>
                </div>
                <div className="flex-1 bg-white rounded-lg py-2 px-3 text-center" style={{ border: '1px solid rgba(245,158,11,0.15)' }}>
                  <div className="text-base font-bold" style={{ color: '#d97706' }}>
                    {groupTimeLeft && !groupTimeLeft.expired ? (groupTimeLeft.days || 0) : 0}
                  </div>
                  <div className="text-[11px] text-gray-400">{groupDaysLeftLabel}</div>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="mb-3">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-500">{groupProgressTitle}</span>
                  <span className="font-bold" style={{ color: gpRatio >= 0.5 ? '#1e3a8a' : '#d97706' }}>{gpPercent}%</span>
                </div>
                <div className="h-2 bg-white rounded-full overflow-hidden relative" dir="rtl">
                  <div
                    className="absolute top-0 right-0 h-full rounded-r-full transition-all duration-500"
                    style={{ width: `${Math.min(50, gpPercent)}%`, background: 'linear-gradient(270deg, #f59e0b 0%, #fbbf24 100%)' }}
                  />
                  {gpRatio > 0.5 && (
                    <div
                      className="absolute top-0 h-full rounded-l-full transition-all duration-500"
                      style={{ right: '50%', width: `${Math.min(50, gpPercent - 50)}%`, background: 'linear-gradient(270deg, #1e3a8a 0%, #0891b2 100%)' }}
                    />
                  )}
                </div>
              </div>

              {/* Delivery Info - single row */}
              <div className="flex items-center justify-between text-xs text-gray-500 pt-2.5 border-t" style={{ borderColor: 'rgba(245,158,11,0.15)' }}>
                <span>אספקה: ~{product.groupPurchaseDetails.totalDays || (product.groupPurchaseDetails.closingDays || 0) + (product.groupPurchaseDetails.shippingDays || 0)} ימים</span>
                <span className="font-bold" style={{ color: '#059669' }}>משלוח חינם</span>
              </div>
            </div>
          )}

          {/* Regular Purchase - Stock & Fast Delivery */}
          {product.purchaseType !== 'group' && (
            <div 
              className="rounded-xl p-4 mb-4"
              style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.06) 0%, rgba(6, 182, 212, 0.06) 100%)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div 
                  className="w-9 h-9 rounded-full text-white flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)' }}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base" style={{ color: '#059669' }}>במלאי מיידי</span>
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#10b981' }} />
                  </div>
                  <p className="text-xs text-gray-500">המוצר זמין ומוכן למשלוח</p>
                </div>
              </div>

              {/* Inline Info */}
              <div className="flex items-center justify-between text-xs text-gray-500 pt-2.5 border-t" style={{ borderColor: 'rgba(16,185,129,0.15)' }}>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" style={{ color: '#10b981' }} fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                    <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7h4.05a1 1 0 01.9.55l1.95 3.9a1 1 0 01.1.45V15a1 1 0 01-1 1h-1.05a2.5 2.5 0 00-4.9 0H14V7z" />
                  </svg>
                  <span>עד 3 ימי עסקים</span>
                </div>
                <span className="font-bold" style={{ color: '#059669' }}>
                  {product.stockCount > 0 ? `${product.stockCount} יח׳ במלאי` : 'במלאי'}
                </span>
                {product.price >= 200 && (
                  <span className="font-bold" style={{ color: '#059669' }}>משלוח חינם</span>
                )}
              </div>
            </div>
          )}

          {/* Quantity + Actions */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-600 font-medium">כמות</span>
            <div className="flex items-center bg-gray-100 rounded-full">
              <button 
                onClick={() => setQuantity(Math.max(1, quantity - 1))} 
                className="w-11 h-11 flex items-center justify-center text-lg text-gray-700 hover:bg-gray-200 rounded-full transition"
              >
                −
              </button>
              <span className="w-10 text-center font-bold text-base">{quantity}</span>
              <button 
                onClick={() => setQuantity(quantity + 1)} 
                className="w-11 h-11 flex items-center justify-center text-lg text-gray-700 hover:bg-gray-200 rounded-full transition"
              >
                +
              </button>
            </div>
          </div>

          {/* Buttons Row */}
          <div className="flex gap-3">
            <button
              data-testid="add-to-cart"
              onClick={() => addItem(product, quantity)}
              className="flex-1 h-13 rounded-xl text-base font-bold transition-all flex items-center justify-center gap-2"
              style={{
                border: '2px solid transparent',
                backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)',
                backgroundOrigin: 'border-box',
                backgroundClip: 'padding-box, border-box',
                color: '#1e3a8a',
                minHeight: '52px',
              }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              הוסף לסל
            </button>
            <button
              onClick={handleBuyNow}
              className="flex-[2] h-13 rounded-xl text-base font-bold text-white transition-all flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)', minHeight: '52px' }}
            >
              {product.purchaseType === 'group' ? 'הצטרף עכשיו' : 'קנה עכשיו'}
            </button>
          </div>
        </div>
        </div>

        {/* ═══ Product Details ═══ */}
        <div className="product-page-details-divider mt-6 mb-4 flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(8, 145, 178, 0.2), transparent)' }} />
          <span className="text-xs text-gray-400 font-medium tracking-wider uppercase">פרטי המוצר</span>
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(8, 145, 178, 0.2), transparent)' }} />
        </div>

        <div className="product-details-section">
          
          {/* Features Section */}
          {product.features && product.features.some(f => f) && (
            <div className="bg-white rounded-2xl mb-4 shadow-sm overflow-hidden">
              <button
                onClick={() => setShowAllFeatures(!showAllFeatures)}
                className="w-full px-5 py-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.1) 0%, rgba(8, 145, 178, 0.1) 100%)' }}
                  >
                    <svg className="w-5 h-5" style={{ color: '#0891b2' }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900 text-base">תכונות עיקריות</div>
                    <div className="text-sm text-gray-500">{product.features.filter(f => f).length} תכונות</div>
                  </div>
                </div>
                <svg className={`w-5 h-5 text-gray-400 transition-transform ${showAllFeatures ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {showAllFeatures && (
                <div className="px-5 pb-5">
                  <div 
                    className="rounded-xl overflow-hidden"
                    style={{
                      border: '1px solid transparent',
                      backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, rgba(30, 58, 138, 0.2), rgba(8, 145, 178, 0.2))',
                      backgroundOrigin: 'border-box',
                      backgroundClip: 'padding-box, border-box',
                    }}
                  >
                    {product.features.filter(f => f).map((feature, i) => (
                      <div 
                        key={i} 
                        className="flex items-center gap-3 px-4 py-3"
                        style={{ 
                          background: i % 2 === 0 ? 'rgba(30, 58, 138, 0.03)' : 'white',
                          borderBottom: i < product.features.filter(f => f).length - 1 ? '1px solid rgba(30, 58, 138, 0.08)' : 'none',
                        }}
                      >
                        <div 
                          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
                        >
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="text-base font-medium" style={{ color: '#374151' }}>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Specs Section */}
          {product.specs && (typeof product.specs === 'string' ? product.specs.trim() : Object.values(product.specs).some(v => v && v.trim())) && (
            <div className="bg-white rounded-2xl mb-4 shadow-sm overflow-hidden">
              <button
                onClick={() => setShowSpecs(!showSpecs)}
                className="w-full px-5 py-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.1) 0%, rgba(8, 145, 178, 0.1) 100%)' }}
                  >
                    <svg className="w-5 h-5" style={{ color: '#1e3a8a' }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900 text-base">מפרט טכני</div>
                  </div>
                </div>
                <svg className={`w-5 h-5 text-gray-400 transition-transform ${showSpecs ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {showSpecs && (
                <div className="px-5 pb-5">
                  <div 
                    className="rounded-xl p-5"
                    style={{
                      border: '1px solid transparent',
                      backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, rgba(30, 58, 138, 0.2), rgba(8, 145, 178, 0.2))',
                      backgroundOrigin: 'border-box',
                      backgroundClip: 'padding-box, border-box',
                    }}
                  >
                    {typeof product.specs === 'string' ? (
                      <p className="text-base leading-relaxed whitespace-pre-line" style={{ color: '#374151' }}>
                        {product.specs}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {Object.entries(product.specs).filter(([_, value]) => value && value.trim()).map(([key, value]) => (
                          <div key={key} className="flex justify-between text-sm" style={{ color: '#374151' }}>
                            <span className="font-medium">{key.replace('spec', 'מפרט ')}</span>
                            <span>{value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Suitable For Section */}
          {product.suitableFor && (
            <div className="bg-white rounded-2xl mb-4 shadow-sm overflow-hidden">
              <button
                onClick={() => setShowSuitableFor(!showSuitableFor)}
                className="w-full px-5 py-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.1) 0%, rgba(8, 145, 178, 0.1) 100%)' }}
                  >
                    <svg className="w-5 h-5" style={{ color: '#0891b2' }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900 text-base">למי זה מתאים?</div>
                  </div>
                </div>
                <svg className={`w-5 h-5 text-gray-400 transition-transform ${showSuitableFor ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {showSuitableFor && (
                <div className="px-5 pb-5">
                  <div 
                    className="rounded-xl p-5"
                    style={{
                      border: '1px solid transparent',
                      backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, rgba(30, 58, 138, 0.2), rgba(8, 145, 178, 0.2))',
                      backgroundOrigin: 'border-box',
                      backgroundClip: 'padding-box, border-box',
                    }}
                  >
                    <p className="text-base leading-relaxed whitespace-pre-line" style={{ color: '#374151' }}>
                      {product.suitableFor}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Why Choose Us Section */}
          {product.whyChooseUs && (
            <div className="bg-white rounded-2xl mb-4 shadow-sm overflow-hidden">
              <button
                onClick={() => setShowWhyChooseUs(!showWhyChooseUs)}
                className="w-full px-5 py-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.1) 0%, rgba(8, 145, 178, 0.1) 100%)' }}
                  >
                    <svg className="w-5 h-5" style={{ color: '#1e3a8a' }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900 text-base">למה לבחור בנו?</div>
                  </div>
                </div>
                <svg className={`w-5 h-5 text-gray-400 transition-transform ${showWhyChooseUs ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {showWhyChooseUs && (
                <div className="px-5 pb-5">
                  <div 
                    className="rounded-xl p-5"
                    style={{
                      border: '1px solid transparent',
                      backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, rgba(30, 58, 138, 0.2), rgba(8, 145, 178, 0.2))',
                      backgroundOrigin: 'border-box',
                      backgroundClip: 'padding-box, border-box',
                    }}
                  >
                    <p className="text-base leading-relaxed whitespace-pre-line" style={{ color: '#374151' }}>
                      {product.whyChooseUs}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Warranty Section */}
          {product.warranty && (
            <div className="bg-white rounded-2xl mb-4 shadow-sm overflow-hidden">
              <button
                onClick={() => setShowWarranty(!showWarranty)}
                className="w-full px-5 py-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.1) 0%, rgba(8, 145, 178, 0.1) 100%)' }}
                  >
                    <svg className="w-5 h-5" style={{ color: '#0891b2' }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900 text-base">אחריות</div>
                  </div>
                </div>
                <svg className={`w-5 h-5 text-gray-400 transition-transform ${showWarranty ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {showWarranty && (
                <div className="px-5 pb-5">
                  <div 
                    className="rounded-xl p-5"
                    style={{
                      border: '1px solid transparent',
                      backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, rgba(30, 58, 138, 0.2), rgba(8, 145, 178, 0.2))',
                      backgroundOrigin: 'border-box',
                      backgroundClip: 'padding-box, border-box',
                    }}
                  >
                    <p className="text-base leading-relaxed whitespace-pre-line" style={{ color: '#374151' }}>
                      {product.warranty}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Custom Fields Sections */}
          {product.customFields && product.customFields.length > 0 && product.customFields.map((field, index) => (
            field.title && field.content && (
              <div key={index} className="bg-white rounded-2xl mb-4 shadow-sm overflow-hidden">
                <button
                  onClick={() => {
                    const newState = { ...customFieldsOpen };
                    newState[index] = !newState[index];
                    setCustomFieldsOpen(newState);
                  }}
                  className="w-full px-5 py-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-11 h-11 rounded-xl flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.1) 0%, rgba(8, 145, 178, 0.1) 100%)' }}
                    >
                      <svg className="w-5 h-5" style={{ color: '#1e3a8a' }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-900 text-base">{field.title}</div>
                    </div>
                  </div>
                  <svg className={`w-5 h-5 text-gray-400 transition-transform ${customFieldsOpen[index] ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {customFieldsOpen[index] && (
                  <div className="px-5 pb-5">
                    <div 
                      className="rounded-xl p-5"
                      style={{
                        border: '1px solid transparent',
                        backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, rgba(30, 58, 138, 0.2), rgba(8, 145, 178, 0.2))',
                        backgroundOrigin: 'border-box',
                        backgroundClip: 'padding-box, border-box',
                      }}
                    >
                      <p className="text-base leading-relaxed whitespace-pre-line" style={{ color: '#374151' }}>
                        {field.content}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )
          ))}

          {/* Description Section */}
          {richDescription && (
            <div className="bg-white rounded-2xl mb-4 shadow-sm overflow-hidden">
              <button
                onClick={() => setShowDescription(!showDescription)}
                className="w-full px-5 py-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.1) 0%, rgba(8, 145, 178, 0.1) 100%)' }}
                  >
                    <svg className="w-5 h-5" style={{ color: '#0891b2' }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
                    </svg>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900 text-base">תיאור המוצר</div>
                  </div>
                </div>
                <svg className={`w-5 h-5 text-gray-400 transition-transform ${showDescription ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {showDescription && (
                <div className="px-5 pb-5">
                  <div 
                    className="rounded-xl p-5"
                    style={{
                      border: '1px solid transparent',
                      backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, rgba(30, 58, 138, 0.2), rgba(8, 145, 178, 0.2))',
                      backgroundOrigin: 'border-box',
                      backgroundClip: 'padding-box, border-box',
                    }}
                  >
                    {isProbablyRichHtml(richDescription) ? (
                      <div
                        className="text-base leading-relaxed [&_img]:max-w-full [&_img]:h-auto [&_a]:text-cyan-700 [&_a]:underline"
                        style={{ color: '#374151' }}
                        // eslint-disable-next-line react/no-danger
                        dangerouslySetInnerHTML={{
                          __html: sanitizeProductHtmlFragment(richDescription, productHeading),
                        }}
                      />
                    ) : (
                      <p className="text-base leading-relaxed whitespace-pre-line" style={{ color: '#374151' }}>
                        {richDescription}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>


      {/* Sticky Bottom Bar */}
      {product.purchaseType === 'group' && showStickyBar && (
        <div 
          className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t shadow-2xl"
          style={{ 
            borderColor: 'rgba(245, 158, 11, 0.3)',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
          }}
        >
          <div className="max-w-lg mx-auto px-5 py-3.5">
            <div className="flex items-center gap-3">
              {/* Price & Timer */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold" style={{ color: '#d97706' }}>
                    ₪{(product.salePrice || product.price || 0).toLocaleString()}
                  </span>
                  {product.salePrice && product.price > product.salePrice && (
                    <span className="text-base text-gray-400 line-through">
                      ₪{product.price.toLocaleString()}
                    </span>
                  )}
                </div>
                {groupTimeLeft && !groupTimeLeft.expired && (
                  <div className="flex items-center gap-1.5 text-sm" style={{ color: '#dc2626' }}>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    <span>נותרו {groupTimeLeft.days}:{String(groupTimeLeft.hours).padStart(2,'0')}:{String(groupTimeLeft.minutes).padStart(2,'0')}</span>
                  </div>
                )}
              </div>
              
              {/* CTA Button */}
              <button
                onClick={handleBuyNow}
                className="px-7 py-3.5 rounded-xl font-bold text-base text-white transition-all flex items-center gap-2"
                style={{ 
                  background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                  boxShadow: '0 4px 15px rgba(245, 158, 11, 0.4)',
                }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                הצטרף עכשיו
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Section 5: Related Products ═══ */}
      {relatedProducts.length > 0 && (
        <div className="relative">
          {/* Wave top */}
          <div className="overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.04) 0%, rgba(8, 145, 178, 0.06) 100%)' }}>
            <svg className="w-full block" viewBox="0 0 1440 40" preserveAspectRatio="none" style={{ height: '22px' }}>
              <path d="M0,0 L1440,0 L1440,10 Q1080,40 720,20 Q360,0 0,30 Z" fill="#f9fafb" />
            </svg>
          </div>
          <div className="max-w-2xl mx-auto px-4 pt-5 pb-10 product-related-section" style={{ background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.04) 0%, rgba(8, 145, 178, 0.06) 100%)' }}>
            <h2 className="text-xl font-bold mb-5" style={{ color: '#1e3a8a' }}>
              מוצרים נוספים שיעניינו אותך
            </h2>
          
          {/* Horizontal Scroll Container */}
          <div ref={relatedScrollRef} className="overflow-x-auto pb-5 -mx-4 px-4 scroll-smooth related-products-container">
            <div className="flex gap-4 related-products-grid" style={{ minWidth: 'max-content' }}>
              {relatedProducts.map((relProduct) => (
                <Link
                  key={relProduct._id}
                  href={getProductPublicPath(relProduct)}
                  className="flex-shrink-0 w-40 bg-white rounded-xl overflow-hidden border border-gray-100 hover:border-blue-200 hover:shadow-lg transition-all duration-200 no-underline"
                  style={{ textDecoration: 'none' }}
                >
                  {/* Product Image */}
                  <div className="relative aspect-square bg-gray-50">
                    <Image
                      src={
                        getOptimizedImageSrc(relProduct.media?.images?.[0]?.url, {
                          width: 300,
                          crop: 'limit',
                          quality: 'auto:good',
                          format: 'auto',
                        }) || 'https://placehold.co/200x200/f3f4f6/9ca3af?text=%F0%9F%93%A6'
                      }
                      alt={String(relProduct.name || '').trim() || 'מוצר נלווה'}
                      fill
                      sizes="144px"
                      className="object-contain p-2"
                      loading="lazy"
                    />
                    {/* Type Badge */}
                    {relProduct.purchaseType === 'group' && (
                      <div 
                        className="absolute top-1.5 right-1.5 text-xs font-bold text-white px-2 py-0.5 rounded-full"
                        style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)' }}
                      >
                        קבוצתי
                      </div>
                    )}
                    {/* Discount Badge */}
                    {relProduct.originalPrice && relProduct.originalPrice > relProduct.price && (
                      <div 
                        className="absolute top-1.5 left-1.5 text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(236, 253, 245, 0.9)', color: '#047857', border: '1px solid #6ee7b7' }}
                      >
                        {Math.round(((relProduct.originalPrice - relProduct.price) / relProduct.originalPrice) * 100)}%-
                      </div>
                    )}
                  </div>
                  
                  {/* Product Info */}
                  <div className="p-3">
                    <h3 className="text-sm font-medium text-gray-800 line-clamp-2 leading-tight mb-1.5" style={{ minHeight: '2.5em' }}>
                      {relProduct.name}
                    </h3>
                    <div className="flex items-center gap-1.5">
                      <span 
                        className="text-base font-bold"
                        style={{ color: relProduct.purchaseType === 'group' ? '#d97706' : '#1e3a8a' }}
                      >
                        ₪{(relProduct.price || 0).toLocaleString()}
                      </span>
                      {relProduct.originalPrice && relProduct.originalPrice > relProduct.price && (
                        <span className="text-xs text-gray-400 line-through">
                          ₪{relProduct.originalPrice.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
          
          {/* View All Button */}
          <Link
            href="/products"
            className="flex items-center justify-center gap-2 mt-5 py-3.5 rounded-xl font-medium text-base transition-all"
            style={{
              background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.05) 0%, rgba(8, 145, 178, 0.05) 100%)',
              color: '#1e3a8a',
              border: '1px solid rgba(30, 58, 138, 0.1)',
            }}
          >
            צפה בכל המוצרים
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
        </div>
        </div>
      )}

      {showZoom && selectedMedia?.type === 'image' && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setShowZoom(false)}
        >
          <div
            className="relative w-full max-w-4xl bg-white rounded-xl overflow-hidden"
            style={{ aspectRatio: '4 / 3' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowZoom(false)}
              className="absolute top-3 right-3 z-10 w-10 h-10 rounded-full bg-white/90 text-gray-700 shadow-md"
              aria-label="סגור"
            >
              ✕
            </button>
            <Image
              src={getZoomImageSrc(selectedMedia.src)}
              alt={
                selectedMedia.type === 'image'
                  ? (String(selectedMedia.alt || '').trim()
                    || (productHeading ? `תמונה מוגדלת — ${productHeading}` : 'תמונת מוצר'))
                  : 'תמונת מוצר'
              }
              fill
              sizes="100vw"
              className="object-contain"
              unoptimized
            />
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          product={product}
          tenants={tenants}
          user={user}
        />
      )}


    </div>
  );
}
