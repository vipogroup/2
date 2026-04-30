'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useMemo, useState, useEffect, useCallback } from 'react';

import { useCartContext } from '@/app/context/CartContext';
import { validateCouponClient, calculateDiscount, calculateTotal } from '@/lib/couponsClient';

export default function CartPage() {
  const router = useRouter();
  const {
    items,
    totals,
    isEmpty,
    incrementItem,
    decrementItem,
    setItemQuantity,
    removeItem,
    clearCart,
  } = useCartContext();

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [autoCouponChecked, setAutoCouponChecked] = useState(false);
  const [user, setUser] = useState(null);
  const [showMarquee, setShowMarquee] = useState(true);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [selectedItems, setSelectedItems] = useState({});

  // Initialize selected items when items change
  useEffect(() => {
    const newSelected = {};
    items.forEach(item => {
      // Keep existing selection or default to true
      newSelected[item.productId] = selectedItems[item.productId] !== undefined 
        ? selectedItems[item.productId] 
        : true;
    });
    setSelectedItems(newSelected);
    // Only when cart membership changes (length), not on every selectedItems tweak — avoids feedback loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  // Toggle item selection
  const toggleItemSelection = (productId) => {
    setSelectedItems(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };

  // Select/Deselect all
  const toggleSelectAll = () => {
    const allSelected = items.every(item => selectedItems[item.productId]);
    const newSelected = {};
    items.forEach(item => {
      newSelected[item.productId] = !allSelected;
    });
    setSelectedItems(newSelected);
  };

  // Calculate totals for selected items only
  const selectedItemsList = useMemo(() => 
    items.filter(item => selectedItems[item.productId]),
    [items, selectedItems]
  );

  const selectedTotals = useMemo(() => {
    const subtotal = selectedItemsList.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalQuantity = selectedItemsList.reduce((sum, item) => sum + item.quantity, 0);
    return { subtotal, totalQuantity };
  }, [selectedItemsList]);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    }
    fetchUser();
  }, []);

  const gradientPrimary = 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)';
  const gradientReverse = 'linear-gradient(135deg, #0891b2 0%, #1e3a8a 100%)';

  const formatCurrency = (value) =>
    `₪${value.toLocaleString('he-IL', { minimumFractionDigits: 0 })}`;

  // Calculate discount using shared helper (consistent with Checkout) - for SELECTED items only
  const discountPercent = appliedCoupon?.discountPercent || 0;
  const discount = useMemo(
    () => calculateDiscount(selectedTotals.subtotal, discountPercent),
    [selectedTotals.subtotal, discountPercent],
  );
  const finalTotal = useMemo(
    () => calculateTotal(selectedTotals.subtotal, discount),
    [selectedTotals.subtotal, discount],
  );

  const handleApplyCoupon = useCallback( async (codeOverride) => {
    // If codeOverride is not a string (e.g., Event object from button click), ignore it
    const code = typeof codeOverride === 'string' ? codeOverride : couponCode;
    const codeToValidate = code.trim();
    if (!codeToValidate) {
      setCouponError('אנא הזן קוד קופון');
      return;
    }

    if (typeof codeOverride === 'string') {
      setCouponCode(codeToValidate);
    }

    setIsApplying(true);
    setCouponError('');

    try {
      // Use real API validation (same as Checkout)
      const result = await validateCouponClient(codeToValidate);

      if (result.ok && result.coupon) {
        setAppliedCoupon(result.coupon);
        setCouponError('');
      } else {
        setCouponError(result.error || 'קוד קופון לא תקין');
        setAppliedCoupon(null);
      }
    } catch (error) {
      setCouponError('שגיאה בבדיקת הקופון');
      setAppliedCoupon(null);
    } finally {
      setIsApplying(false);
    }
  }, [couponCode]);

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
  };

  useEffect(() => {
    if (autoCouponChecked || appliedCoupon) return;

    let cancelled = false;

    async function applyAutoCoupon() {
      try {
        const res = await fetch('/api/referral/auto-coupon', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json().catch(() => ({}));
        const autoCode = data?.coupon;
        if (autoCode && !cancelled) {
          await handleApplyCoupon(autoCode);
        }
      } catch (error) {
        console.error('Auto coupon fetch failed:', error);
      } finally {
        if (!cancelled) {
          setAutoCouponChecked(true);
        }
      }
    }

    applyAutoCoupon();

    return () => {
      cancelled = true;
    };
  }, [appliedCoupon, autoCouponChecked, handleApplyCoupon]);

  async function handleUpgradeToAgent() {
    try {
      setUpgrading(true);
      const res = await fetch('/api/users/upgrade-to-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        alert('ברכות! הפכת לסוכן בהצלחה!');
        window.location.href = '/agent';
      } else {
        const data = await res.json();
        alert('שגיאה: ' + (data.error || 'לא ניתן לשדרג לסוכן'));
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      alert('שגיאה בשדרוג לסוכן');
    } finally {
      setUpgrading(false);
      setShowAgentModal(false);
    }
  }

  if (isEmpty) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-white">
        <div className="text-center space-y-4 max-w-md px-4">
          <svg
            className="w-24 h-24 mx-auto text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <h1 className="text-2xl font-bold text-gray-900">הסל שלך ריק</h1>
          <p className="text-gray-500">התחל להוסיף מוצרים</p>
          <Link
            href="/shop"
            className="inline-block text-white font-medium px-6 py-3 rounded-lg transition-all duration-300"
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

  return (
    <div className="min-h-[calc(100vh-64px)] bg-white">
      {/* Marquee Banner - Only for customers */}
      {showMarquee && user?.role === 'customer' && (
        <div
          className="relative overflow-hidden py-3 cursor-pointer"
          style={{ background: gradientPrimary }}
          onClick={() => setShowAgentModal(true)}
        >
          <div className="marquee-container">
            <div className="marquee-content">
              <div className="flex items-center gap-3 whitespace-nowrap">
                <span className="flex items-center gap-2 text-white font-bold text-lg">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z" />
                  </svg>
                  רוצים להרוויח כסף?
                </span>
                <span className="text-white text-base">•</span>
                <span className="text-white font-semibold text-lg">
                  הפכו לסוכן וקבלו 10% עמלה על כל מכירה!
                </span>
                <span className="text-white text-base">•</span>
                <span className="bg-white text-blue-900 px-4 py-1 rounded-full font-bold text-sm">
                  לחצו כאן להצטרפות
                </span>
                <span className="text-white text-base">•</span>
              </div>
            </div>
            <div className="marquee-content" aria-hidden="true">
              <div className="flex items-center gap-3 whitespace-nowrap">
                <span className="flex items-center gap-2 text-white font-bold text-lg">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z" />
                  </svg>
                  רוצים להרוויח כסף?
                </span>
                <span className="text-white text-base">•</span>
                <span className="text-white font-semibold text-lg">
                  הפכו לסוכן וקבלו 10% עמלה על כל מכירה!
                </span>
                <span className="text-white text-base">•</span>
                <span className="bg-white text-blue-900 px-4 py-1 rounded-full font-bold text-sm">
                  לחצו כאן להצטרפות
                </span>
                <span className="text-white text-base">•</span>
              </div>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMarquee(false);
            }}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 rounded-full p-1 transition-colors"
            aria-label="סגור"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      )}

      <style jsx>{`
        .marquee-container {
          display: flex;
          animation: marquee 10s linear infinite;
        }
        .marquee-content {
          display: flex;
          flex-shrink: 0;
          min-width: 100%;
        }
        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(50%);
          }
        }
        .marquee-container:hover {
          animation-play-state: paused;
        }
      `}</style>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-gray-100 transition-colors" title="חזרה">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <div>
              <h1
                className="text-3xl font-bold mb-1"
                style={{
                  background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                סל קניות ({totals.totalQuantity})
              </h1>
              <div
                className="h-1 w-24 rounded-full"
                style={{ background: 'linear-gradient(90deg, #1e3a8a 0%, #0891b2 100%)' }}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={clearCart}
            className="text-sm font-medium px-4 py-2 rounded-lg transition-all duration-300"
            style={{
              color: '#ef4444',
              border: '2px solid #ef4444',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#ef4444';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#ef4444';
            }}
          >
            ריקון הסל
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-2">
            {/* Select All Header */}
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg text-xs">
              <input
                type="checkbox"
                checked={items.every(item => selectedItems[item.productId])}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
              />
              <span className="text-gray-600">בחר הכל</span>
              <span className="text-gray-400 mr-auto">
                {selectedItemsList.length}/{items.length}
              </span>
            </div>


            {items.map((item) => {
              const hasDiscount = item.originalPrice && item.originalPrice > item.price;
              const itemSaving = hasDiscount ? (item.originalPrice - item.price) * item.quantity : 0;
              
              return (
                <div
                  key={item.productId}
                  className="rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300"
                  style={{
                    background: 'white',
                    border: '2px solid transparent',
                    backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)',
                    backgroundOrigin: 'border-box',
                    backgroundClip: 'padding-box, border-box',
                    opacity: selectedItems[item.productId] ? 1 : 0.6,
                  }}
                >
                  <div className="p-4">
                    {/* Top Row: Checkbox, Image, Info, Delete */}
                    <div className="flex gap-3">
                      {/* Checkbox */}
                      <div className="flex items-start pt-1">
                        <input
                          type="checkbox"
                          checked={selectedItems[item.productId] || false}
                          onChange={() => toggleItemSelection(item.productId)}
                          className="w-5 h-5 rounded-lg border-2 border-cyan-500 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                        />
                      </div>

                      {/* Product Image */}
                      <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                        <Image
                          src={item.image || 'https://placehold.co/80x80/f3f4f6/9ca3af?text=%F0%9F%93%A6'}
                          alt={item.name || 'Product'}
                          width={80}
                          height={80}
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                        {hasDiscount && (
                          <div 
                            className="absolute top-1 right-1 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-lg"
                            style={{ background: 'linear-gradient(135deg, #ef4444, #f97316)' }}
                          >
                            -{Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)}%
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 text-sm line-clamp-2 mb-1">{item.name}</p>
                        <div className="flex items-center gap-2">
                          <span 
                            className="text-lg font-black"
                            style={{ 
                              background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                            }}
                          >
                            {formatCurrency(item.price)}
                          </span>
                          {hasDiscount && (
                            <span className="text-xs text-gray-400 line-through">
                              {formatCurrency(item.originalPrice)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => removeItem(item.productId)}
                        className="p-2 h-fit text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>

                    {/* Bottom Row: Quantity & Total */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                      {/* Quantity Controls */}
                      <div 
                        className="flex items-center rounded-xl overflow-hidden"
                        style={{
                          border: '2px solid transparent',
                          backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)',
                          backgroundOrigin: 'border-box',
                          backgroundClip: 'padding-box, border-box',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => decrementItem(item.productId)}
                          className="w-9 h-9 flex items-center justify-center hover:bg-gray-100 transition-colors"
                        >
                          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                          </svg>
                        </button>
                        <span className="w-10 text-center text-sm font-bold text-gray-900 border-x border-gray-200">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => incrementItem(item.productId)}
                          className="w-9 h-9 flex items-center justify-center hover:bg-gray-100 transition-colors"
                        >
                          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      </div>

                      {/* Total Price */}
                      <div className="text-left">
                        <p className="text-xs text-gray-500">סה״כ</p>
                        <p 
                          className="text-lg font-black"
                          style={{ 
                            background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                          }}
                        >
                          {formatCurrency(item.price * item.quantity)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div
            className="rounded-xl p-6 h-fit sticky top-20 space-y-4"
            style={{
              border: '2px solid transparent',
              backgroundImage:
                'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)',
              backgroundOrigin: 'border-box',
              backgroundClip: 'padding-box, border-box',
              boxShadow: '0 4px 20px rgba(8, 145, 178, 0.15)',
            }}
          >
            <div className="mb-4">
              <h2
                className="text-2xl font-bold mb-1"
                style={{
                  background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                סיכום הזמנה
              </h2>
              <div
                className="h-1 w-20 rounded-full"
                style={{ background: 'linear-gradient(90deg, #1e3a8a 0%, #0891b2 100%)' }}
              />
            </div>

            {/* Coupon Code Section */}
            <div className="border-t border-b border-gray-200 py-4">
              {!appliedCoupon ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">קוד קופון</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="הזן קוד"
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isApplying}
                    />
                    <button
                      onClick={handleApplyCoupon}
                      disabled={isApplying}
                      className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-all duration-300 disabled:opacity-50"
                      style={{
                        background: isApplying
                          ? '#9CA3AF'
                          : 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
                        boxShadow: isApplying ? 'none' : '0 2px 8px rgba(8, 145, 178, 0.2)',
                      }}
                      onMouseEnter={(e) => {
                        if (!isApplying) {
                          e.currentTarget.style.background =
                            'linear-gradient(135deg, #0891b2 0%, #1e3a8a 100%)';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isApplying) {
                          e.currentTarget.style.background =
                            'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }
                      }}
                    >
                      {isApplying ? '...' : 'החל'}
                    </button>
                  </div>
                  {couponError && <p className="text-xs text-red-600">{couponError}</p>}
                </div>
              ) : (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-md p-3">
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-5 h-5 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-green-900">{appliedCoupon.code}</p>
                      <p className="text-xs text-green-700">{discountPercent}% הנחה</p>
                    </div>
                  </div>
                  <button
                    onClick={handleRemoveCoupon}
                    className="text-green-600 hover:text-green-700"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-2 text-sm">
              {/* Original Price */}
              {(() => {
                const originalTotal = selectedItemsList.reduce((sum, item) => {
                  const price = item.originalPrice || item.price;
                  return sum + (price * item.quantity);
                }, 0);
                const productDiscount = selectedItemsList.reduce((sum, item) => {
                  if (item.originalPrice && item.originalPrice > item.price) {
                    return sum + (item.originalPrice - item.price) * item.quantity;
                  }
                  return sum;
                }, 0);
                
                return (
                  <>
                    <div className="flex justify-between text-gray-600">
                      <span>מחיר מקורי ({selectedTotals.totalQuantity} פריטים):</span>
                      <span className="font-medium text-gray-900">{formatCurrency(originalTotal)}</span>
                    </div>
                    {productDiscount > 0 && (
                      <div className="flex justify-between text-emerald-600">
                        <span>הנחת מוצרים:</span>
                        <span className="font-medium">-{formatCurrency(productDiscount)}</span>
                      </div>
                    )}
                  </>
                );
              })()}
              {appliedCoupon && (
                <div className="flex justify-between text-emerald-600">
                  <span>הנחת קופון ({appliedCoupon.code}):</span>
                  <span className="font-medium">-{formatCurrency(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>משלוח:</span>
                <span className="font-medium text-emerald-600">חינם</span>
              </div>
            </div>
            <div className="border-t pt-3 flex justify-between items-center">
              <span className="text-base font-bold text-gray-900">סה&quot;כ לתשלום:</span>
              <span 
                className="text-2xl font-black"
                style={{ 
                  background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {formatCurrency(finalTotal)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                // Save selected items to localStorage for checkout
                const selectedProductIds = Object.entries(selectedItems)
                  .filter(([_, isSelected]) => isSelected)
                  .map(([productId]) => productId);
                localStorage.setItem('checkout_selected_items', JSON.stringify(selectedProductIds));
                router.push(appliedCoupon?.code ? `/checkout?coupon=${encodeURIComponent(appliedCoupon.code)}` : '/checkout');
              }}
              disabled={selectedItemsList.length === 0}
              className="w-full text-white font-bold py-3 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: selectedItemsList.length === 0 ? '#9ca3af' : 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
                boxShadow: selectedItemsList.length === 0 ? 'none' : '0 4px 12px rgba(8, 145, 178, 0.3)',
              }}
              onMouseEnter={(e) => {
                if (selectedItemsList.length > 0) {
                  e.currentTarget.style.background =
                    'linear-gradient(135deg, #0891b2 0%, #1e3a8a 100%)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(8, 145, 178, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedItemsList.length > 0) {
                  e.currentTarget.style.background =
                    'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(8, 145, 178, 0.3)';
                }
              }}
            >
              {selectedItemsList.length === 0 ? 'בחר מוצרים לתשלום' : `המשך לתשלום (${selectedItemsList.length})`}
            </button>
            <Link
              href="/shop"
              className="block w-full text-center font-medium py-3 rounded-lg transition-all duration-300"
              style={{
                backgroundColor: 'white',
                border: '2px solid #1e3a8a',
                color: '#1e3a8a',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background =
                  'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)';
                e.currentTarget.style.color = 'white';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.color = '#1e3a8a';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              המשך לקנות
            </Link>
          </div>
        </div>

      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>

      {/* Upgrade to Agent Modal */}
      {showAgentModal && user?.role === 'customer' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8">
            <div className="text-center mb-6">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: gradientPrimary }}
              >
                <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z" />
                </svg>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-2">הפוך לסוכן!</h3>
              <p className="text-gray-600">צור הכנסה פאסיבית על ידי שיתוף מוצרים</p>
            </div>

            <div
              className="rounded-xl p-6 mb-6"
              style={{
                background:
                  'linear-gradient(135deg, rgba(30, 58, 138, 0.1) 0%, rgba(8, 145, 178, 0.1) 100%)',
                border: '2px solid rgba(8, 145, 178, 0.3)',
              }}
            >
              <h4 className="font-bold mb-3 text-lg" style={{ color: '#1e3a8a' }}>
                מה תקבל כסוכן?
              </h4>
              <ul className="space-y-2" style={{ color: '#1e3a8a' }}>
                <li className="flex items-start gap-2">
                  <span className="font-bold" style={{ color: '#0891b2' }}>
                    [v]
                  </span>
                  <span>
                    <strong>עמלות של 10%</strong> על כל מכירה שתבצע
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold" style={{ color: '#0891b2' }}>
                    [v]
                  </span>
                  <span>
                    <strong>קוד קופון ייחודי</strong> לשיתוף עם חברים
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold" style={{ color: '#0891b2' }}>
                    [v]
                  </span>
                  <span>
                    <strong>דשבורד סוכן מתקדם</strong> עם סטטיסטיקות
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold" style={{ color: '#0891b2' }}>
                    [v]
                  </span>
                  <span>
                    <strong>מעקב אחר הרווחים</strong> בזמן אמת
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold" style={{ color: '#0891b2' }}>
                    [v]
                  </span>
                  <span>
                    <strong>בונוסים ותגמולים</strong> למוכרים מצטיינים
                  </span>
                </li>
              </ul>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                <strong>שים לב:</strong> השדרוג הוא חד-פעמי ולא ניתן לבטל אותו. לאחר השדרוג תקבל
                גישה לדשבורד הסוכנים ותוכל להתחיל להרוויח!
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleUpgradeToAgent}
                disabled={upgrading}
                className="flex-1 text-white font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: gradientPrimary }}
                onMouseEnter={(e) => {
                  if (!upgrading) e.currentTarget.style.background = gradientReverse;
                }}
                onMouseLeave={(e) => {
                  if (!upgrading) e.currentTarget.style.background = gradientPrimary;
                }}
              >
                {upgrading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    משדרג...
                  </span>
                ) : (
                  'כן, אני רוצה להפוך לסוכן!'
                )}
              </button>
              <button
                onClick={() => setShowAgentModal(false)}
                disabled={upgrading}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-4 rounded-xl transition-all disabled:opacity-50"
              >
                אולי מאוחר יותר
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
