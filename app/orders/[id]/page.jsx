'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import MainLayout from '@/app/components/layout/MainLayout';

export default function OrderDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params?.id;

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!orderId) return;

    async function fetchOrder() {
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        if (!res.ok) {
          if (res.status === 401) {
            router.push('/login');
            return;
          }
          if (res.status === 404) {
            setError('ההזמנה לא נמצאה');
            return;
          }
          throw new Error('Failed to fetch order');
        }
        const data = await res.json();
        setOrder(data);
      } catch (err) {
        console.error('Error fetching order:', err);
        setError('שגיאה בטעינת ההזמנה');
      } finally {
        setLoading(false);
      }
    }

    fetchOrder();
  }, [orderId, router]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid':
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'paid':
        return 'שולם';
      case 'completed':
        return 'הושלמה';
      case 'pending':
        return 'ממתינה';
      case 'cancelled':
        return 'בוטלה';
      default:
        return status;
    }
  };

  const getOrderTypeBadge = (order) => {
    const items = Array.isArray(order?.items) ? order.items : [];
    const groupItems = items.filter((item) => (item?.purchaseType || item?.type) === 'group');
    const isGroup = groupItems.length > 0 || order?.orderType === 'group';

    if (!isGroup) {
      return { label: 'רכישה רגילה', isGroup: false, kind: 'regular' };
    }

    const allSharedContainer =
      groupItems.length > 0 &&
      groupItems.every(
        (item) => String(item?.groupPurchaseType || '').trim().toLowerCase() === 'shared_container',
      );

    return {
      label: allSharedContainer ? 'מכולה משותפת' : 'רכישה קבוצתית',
      isGroup: true,
      kind: allSharedContainer ? 'shared_container' : 'group',
    };
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div
            className="bg-white rounded-xl p-8"
            style={{
              border: '2px solid transparent',
              backgroundImage:
                'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)',
              backgroundOrigin: 'border-box',
              backgroundClip: 'padding-box, border-box',
              boxShadow: '0 4px 20px rgba(8, 145, 178, 0.15)',
            }}
          >
            <div
              className="animate-spin rounded-full h-12 w-12 mx-auto"
              style={{
                border: '4px solid rgba(8, 145, 178, 0.2)',
                borderTopColor: '#0891b2',
              }}
            ></div>
            <p className="text-gray-600 mt-4 text-center font-medium">טוען פרטי הזמנה...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-white py-8">
          <div className="max-w-3xl mx-auto px-4">
            <div
              className="bg-white rounded-xl p-8 text-center"
              style={{
                border: '2px solid transparent',
                backgroundImage:
                  'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)',
                backgroundOrigin: 'border-box',
                backgroundClip: 'padding-box, border-box',
                boxShadow: '0 4px 20px rgba(8, 145, 178, 0.15)',
              }}
            >
              <svg
                className="w-16 h-16 mx-auto mb-4 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <h2 className="text-xl font-bold text-gray-900 mb-2">{error}</h2>
              <Link
                href="/orders"
                className="inline-block mt-4 px-6 py-2 rounded-lg font-medium text-white"
                style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
              >
                חזרה להזמנות
              </Link>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  const totals = order?.totals || {};
  const subtotal = totals.subtotal || order?.totalAmount || 0;
  const discountAmount = totals.discountAmount || order?.discountAmount || 0;
  const totalAmount = totals.totalAmount || order?.totalAmount || 0;
  const orderTypeBadge = getOrderTypeBadge(order);

  return (
    <MainLayout>
      <div className="min-h-screen bg-white py-8">
        <div className="max-w-3xl mx-auto px-4">
          {/* Back Button */}
          <Link
            href="/orders"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            חזרה להזמנות
          </Link>

          {/* Order Header */}
          <div
            className="bg-white rounded-xl p-6 mb-6"
            style={{
              border: '2px solid transparent',
              backgroundImage:
                'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)',
              backgroundOrigin: 'border-box',
              backgroundClip: 'padding-box, border-box',
              boxShadow: '0 4px 20px rgba(8, 145, 178, 0.15)',
            }}
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1
                  className="text-2xl font-bold mb-2"
                  style={{
                    background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  הזמנה #{order?._id?.slice(-6)}
                </h1>
                <p className="text-gray-600">
                  תאריך: {new Date(order?.createdAt).toLocaleDateString('he-IL')}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span
                  className={`inline-flex px-4 py-2 rounded-full text-sm font-semibold ${
                    orderTypeBadge.isGroup
                      ? 'bg-orange-100 text-orange-700 border border-orange-200'
                      : 'bg-blue-100 text-blue-700 border border-blue-200'
                  }`}
                >
                  {orderTypeBadge.label}
                </span>
                <span
                  className={`inline-flex px-4 py-2 rounded-full text-sm font-semibold border ${getStatusColor(order?.status)}`}
                >
                  {getStatusText(order?.status)}
                </span>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div
            className="bg-white rounded-xl p-6 mb-6"
            style={{
              border: '2px solid transparent',
              backgroundImage:
                'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)',
              backgroundOrigin: 'border-box',
              backgroundClip: 'padding-box, border-box',
              boxShadow: '0 4px 20px rgba(8, 145, 178, 0.15)',
            }}
          >
            <h2 className="text-lg font-bold mb-4" style={{ color: '#1e3a8a' }}>
              פריטים בהזמנה
            </h2>
            <div className="space-y-4">
              {order?.items?.map((item, index) => (
                <div
                  key={item.productId || index}
                  className="flex items-center gap-4 py-3 border-b last:border-b-0"
                  style={{ borderColor: 'rgba(8, 145, 178, 0.1)' }}
                >
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.name || 'מוצר'}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{item.name || 'מוצר'}</h3>
                    <p className="text-sm text-gray-600">כמות: {item.quantity}</p>
                  </div>
                  <div className="text-left">
                    <p className="font-bold" style={{ color: '#1e3a8a' }}>
                      ₪{(item.totalPrice || item.unitPrice * item.quantity || 0).toFixed(2)}
                    </p>
                    {item.quantity > 1 && (
                      <p className="text-xs text-gray-500">₪{item.unitPrice?.toFixed(2)} ליחידה</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div
            className="bg-white rounded-xl p-6"
            style={{
              border: '2px solid transparent',
              backgroundImage:
                'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)',
              backgroundOrigin: 'border-box',
              backgroundClip: 'padding-box, border-box',
              boxShadow: '0 4px 20px rgba(8, 145, 178, 0.15)',
            }}
          >
            <h2 className="text-lg font-bold mb-4" style={{ color: '#1e3a8a' }}>
              סיכום הזמנה
            </h2>
            <div className="space-y-2 text-gray-700">
              <div className="flex justify-between">
                <span>סכום ביניים</span>
                <span className="font-semibold">₪{subtotal.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>הנחה</span>
                  <span className="font-semibold">-₪{discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>משלוח</span>
                <span className="font-semibold text-green-600">חינם</span>
              </div>
              <div
                className="flex justify-between text-lg font-bold pt-3 mt-3 border-t"
                style={{ borderColor: 'rgba(8, 145, 178, 0.2)', color: '#1e3a8a' }}
              >
                <span>סה&quot;כ</span>
                <span>₪{totalAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Coupon Info */}
            {order?.appliedCouponCode && (
              <div
                className="mt-4 p-3 rounded-lg"
                style={{
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                }}
              >
                <p className="text-sm text-green-700">
                  <span className="font-semibold">קופון:</span> {order.appliedCouponCode}
                </p>
              </div>
            )}
          </div>

          {/* Customer Info */}
          {order?.customer && (
            <div
              className="bg-white rounded-xl p-6 mt-6"
              style={{
                border: '2px solid transparent',
                backgroundImage:
                  'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)',
                backgroundOrigin: 'border-box',
                backgroundClip: 'padding-box, border-box',
                boxShadow: '0 4px 20px rgba(8, 145, 178, 0.15)',
              }}
            >
              <h2 className="text-lg font-bold mb-4" style={{ color: '#1e3a8a' }}>
                פרטי משלוח
              </h2>
              <div className="space-y-2 text-gray-700">
                <p>
                  <span className="font-semibold">שם:</span> {order.customer.fullName}
                </p>
                <p>
                  <span className="font-semibold">טלפון:</span> {order.customer.phone}
                </p>
                <p>
                  <span className="font-semibold">אימייל:</span> {order.customer.email}
                </p>
                {order.customer.address && (
                  <p>
                    <span className="font-semibold">כתובת:</span> {order.customer.address}
                    {order.customer.city && `, ${order.customer.city}`}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
