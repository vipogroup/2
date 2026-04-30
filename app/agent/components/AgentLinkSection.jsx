'use client';

import Link from 'next/link';
import { useTenant } from './AgentDashboardClient';
import CopyCouponButton from './CopyCouponButton';
import ShareButton from './ShareButton';

/**
 * AgentLinkSection - הקישור האישי וקוד הקופון לפי העסק הנבחר
 */
export default function AgentLinkSection() {
  const { currentBusiness, stats, loading, hasBusinesses } = useTenant();

  if (loading) {
    return (
      <section
        className="rounded-xl overflow-hidden mb-6 animate-pulse"
        style={{
          border: '2px solid #e5e7eb',
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.05)',
        }}
      >
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <div className="h-5 bg-gray-200 rounded w-32"></div>
        </div>
        <div className="p-3 space-y-3">
          <div className="h-10 bg-gray-100 rounded-lg"></div>
          <div className="h-10 bg-gray-100 rounded-lg"></div>
        </div>
      </section>
    );
  }

  if (!hasBusinesses) {
    return (
      <section className="rounded-xl overflow-hidden mb-6 bg-gradient-to-l from-[#1e3a8a]/5 to-[#0891b2]/5 border border-[#0891b2]/20">
        <div className="p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-l from-[#1e3a8a] to-[#0891b2] flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">הצטרף לעסק כדי להתחיל!</h3>
          <p className="text-gray-500 text-sm mb-4">בחר עסק משוק העסקים וקבל קוד קופון אישי</p>
          <Link
            href="/agent/marketplace"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-white font-semibold transition-all hover:shadow-lg"
            style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            הצטרף לעסק
          </Link>
        </div>
      </section>
    );
  }

  const referralLink = stats?.referralLink || '';
  const couponCode = currentBusiness?.couponCode || stats?.referralCode || '';

  return (
    <section
      className="rounded-xl overflow-hidden mb-6"
      style={{
        border: '2px solid transparent',
        backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)',
        backgroundOrigin: 'border-box',
        backgroundClip: 'padding-box, border-box',
        boxShadow: '0 4px 15px rgba(8, 145, 178, 0.12)',
      }}
    >
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold" style={{ color: '#1e3a8a' }}>הקישור האישי שלך</h3>
          <p className="text-[11px] text-gray-500">שתף את הקישור - ההנחה כבר מובנית בו!</p>
        </div>
        {currentBusiness && (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-[#0891b2]/10 rounded-lg">
            <div className="w-5 h-5 rounded-full bg-gradient-to-l from-[#1e3a8a] to-[#0891b2] flex items-center justify-center text-white text-[10px] font-bold">
              {currentBusiness.tenantName?.charAt(0) || 'W'}
            </div>
            <span className="text-xs font-medium text-[#0891b2]">{currentBusiness.tenantName}</span>
          </div>
        )}
      </div>
      <div className="p-3 space-y-2">
        {/* Referral Link */}
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2 min-w-0">
            <p className="text-xs font-mono text-gray-600 truncate" dir="ltr">{referralLink || '-'}</p>
          </div>
          <CopyCouponButton code={referralLink} label="העתק" variant="primary" />
          <ShareButton link={referralLink} />
        </div>

        {/* Coupon Code */}
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2 min-w-0">
            <p className="text-[10px] text-gray-400">קוד קופון</p>
            <p
              className="text-sm font-bold tracking-wider"
              style={{
                background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {couponCode?.toUpperCase() || '-'}
            </p>
          </div>
          <CopyCouponButton code={couponCode} label="העתק" variant="outline" />
        </div>

        {/* Link to products */}
        <Link
          href={`/agent/products${currentBusiness?.tenantId ? `?tenantId=${currentBusiness.tenantId}` : ''}`}
          className="flex items-center justify-center gap-2 mt-3 py-2.5 px-4 rounded-lg text-sm font-semibold text-white transition-all hover:shadow-lg hover:scale-[1.02]"
          style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
        >
          <span>בחר מוצרים לשיתוף עם הקוד שלך</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
      </div>
    </section>
  );
}
