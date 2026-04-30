'use client';

import Link from 'next/link';
import Image from 'next/image';
import { getPrimaryImageSrc } from '@/app/lib/mediaSSOT';
import { getCardImageSrc } from '@/lib/cloudinary-transforms';
import { getProductPublicPath } from '@/lib/stainlessSeoCategories';
import { getCatalogProductMode } from '@/lib/catalogProductMode';

const DEFAULT_ACCENT = 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)';

const OPTIMIZED_REMOTE_HOSTS = new Set([
  'res.cloudinary.com',
  'images.unsplash.com',
  'm.media-amazon.com',
  'placehold.co',
  'via.placeholder.com',
  'raw.githubusercontent.com',
]);

function shouldBypassNextImageOptimizer(url) {
  if (!url || typeof url !== 'string') return false;
  if (url.startsWith('/')) return false;
  if (url.startsWith('data:')) return true;
  try {
    const { hostname } = new URL(url);
    return !OPTIMIZED_REMOTE_HOSTS.has(hostname);
  } catch {
    return true;
  }
}

const ShareIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
    />
  </svg>
);

const StoreIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
    />
  </svg>
);

function trackCampaignEvent(campaignId, event) {
  if (!campaignId) return;
  fetch('/api/campaigns/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ campaignId, event }),
  }).catch(() => {});
}

/**
 * כרטיס מוצר אחיד — מרקטפלייס וחנות טננט (עיצוב כמו MarketplaceHome).
 */
export default function CatalogProductCard({
  product,
  displayMode,
  isLoggedIn,
  onOpenShareModal,
  accentGradient = DEFAULT_ACCENT,
  titleColor = '#1e3a8a',
  showTenantRow = true,
  bottomSlot = null,
}) {
  const productMode = getCatalogProductMode(product);
  const productPath = getProductPublicPath(product);
  const displayPrice =
    (displayMode === 'group' || displayMode === 'shared_container') && product.groupPrice
      ? product.groupPrice
      : product.price;
  const hasDiscount = product.originalPrice && product.originalPrice > displayPrice;
  const discountPercent = hasDiscount
    ? Math.round((1 - displayPrice / product.originalPrice) * 100)
    : 0;
  const primaryImage = getPrimaryImageSrc(product);
  const cardImage = primaryImage ? getCardImageSrc(primaryImage) : '';
  const bypassCardImageOptimization = shouldBypassNextImageOptimizer(cardImage);

  const handleShare = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onOpenShareModal?.(product);
  };

  const isSharedContainer = productMode === 'shared_container';
  const tenantSlug = product.tenant?.slug ? String(product.tenant.slug).trim() : '';

  return (
    <div className="group bg-white rounded-xl sm:rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col border border-blue-200 hover:border-blue-400">
      <Link
        href={productPath}
        onClick={() => product.isSponsored && product._campaignId && trackCampaignEvent(product._campaignId, 'click')}
        className="flex flex-col flex-1 min-h-0 no-underline text-inherit"
      >
        <div className="flex items-center justify-between px-2 py-1.5 bg-white">
          <div className="flex items-center gap-1 flex-wrap">
            {product.isSponsored && (
              <span className="bg-cyan-50 text-cyan-700 text-[9px] px-1.5 py-0.5 rounded-full font-bold border border-cyan-300">
                ממומן
              </span>
            )}
            {productMode === 'stock' ? (
              <span className="bg-emerald-50 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full font-semibold border border-emerald-300">
                במלאי
              </span>
            ) : isSharedContainer ? (
              <span className="bg-sky-50 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-semibold border border-blue-300">
                מכולה משותפת
              </span>
            ) : (
              <span className="bg-amber-50 text-amber-700 text-[10px] px-2 py-0.5 rounded-full font-semibold border border-amber-300">
                רכישה קבוצתית
              </span>
            )}
            {product.isFeatured && (
              <span className="bg-amber-50 text-amber-600 text-[9px] px-1.5 py-0.5 rounded-full font-bold border border-amber-200">
                מומלץ
              </span>
            )}
          </div>
          {hasDiscount ? (
            <span
              className="text-white text-[10px] px-2 py-0.5 rounded-full font-bold"
              style={{ background: accentGradient }}
            >
              {discountPercent}%-
            </span>
          ) : null}
        </div>

        <div className="relative aspect-square overflow-hidden bg-white">
          {cardImage ? (
            <Image
              src={cardImage}
              alt={product.name}
              fill
              className="object-contain p-3 group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              unoptimized={bypassCardImageOptimization}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
              <StoreIcon />
            </div>
          )}
        </div>

        <div className="px-2.5 pt-1.5 pb-1 flex flex-col gap-0.5">
          <h3
            className="font-semibold text-[13px] sm:text-[14px] leading-tight line-clamp-2 group-hover:opacity-90 transition-opacity"
            style={{ color: titleColor }}
          >
            {product.name}
          </h3>
        </div>
      </Link>

      <div className="px-2.5 pb-2 flex flex-col gap-0.5">
        {showTenantRow && product.tenant && tenantSlug ? (
          <Link
            href={`/t/${encodeURIComponent(tenantSlug)}`}
            className="flex items-center gap-1 no-underline min-w-0 hover:opacity-90"
            title={`לדף ${product.tenant.name}`}
          >
            {product.tenant.logo ? (
              <Image
                src={product.tenant.logo}
                alt=""
                width={12}
                height={12}
                className="rounded-full flex-shrink-0"
              />
            ) : (
              <div
                className="w-3 h-3 rounded-full flex items-center justify-center text-white text-[6px] font-bold flex-shrink-0"
                style={{ background: product.tenant.primaryColor || '#1e3a8a' }}
              >
                {product.tenant.name?.[0]}
              </div>
            )}
            <span className="text-[10px] text-gray-500 truncate underline-offset-2 hover:underline">
              {product.tenant.name}
            </span>
          </Link>
        ) : showTenantRow && product.tenant ? (
          <div className="flex items-center gap-1 min-w-0">
            {product.tenant.logo ? (
              <Image
                src={product.tenant.logo}
                alt=""
                width={12}
                height={12}
                className="rounded-full flex-shrink-0"
              />
            ) : (
              <div
                className="w-3 h-3 rounded-full flex items-center justify-center text-white text-[6px] font-bold flex-shrink-0"
                style={{ background: product.tenant.primaryColor || '#1e3a8a' }}
              >
                {product.tenant.name?.[0]}
              </div>
            )}
            <span className="text-[10px] text-gray-400 truncate">{product.tenant.name}</span>
          </div>
        ) : null}

        <div className="flex items-center justify-between pt-1">
          <Link href={productPath} className="flex items-baseline gap-1 no-underline min-w-0">
            <span className="text-[17px] sm:text-[18px] font-bold" style={{ color: titleColor }}>
              ₪{Number(displayPrice).toLocaleString('he-IL')}
            </span>
            {hasDiscount ? (
              <span className="text-[10px] text-gray-400 line-through">
                ₪{Number(product.originalPrice).toLocaleString('he-IL')}
              </span>
            ) : null}
          </Link>
          <button
            type="button"
            onClick={handleShare}
            className="w-6 h-6 text-gray-400 hover:text-emerald-600 rounded-full flex items-center justify-center transition-colors flex-shrink-0"
            title="שתף והרווח"
          >
            <ShareIcon />
          </button>
        </div>

        {bottomSlot ? <div className="pt-1.5 space-y-2">{bottomSlot}</div> : null}
      </div>
    </div>
  );
}
