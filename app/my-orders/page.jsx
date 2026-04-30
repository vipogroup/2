'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import MainLayout from '@/app/components/layout/MainLayout';

export default function MyOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedBusiness, setSelectedBusiness] = useState(null); // null = all

  const fetchOrders = useCallback(async () => {
    try {
      // Try the new grouped API first
      const groupedRes = await fetch('/api/customer/orders');
      if (groupedRes.ok) {
        const groupedData = await groupedRes.json();
        if (groupedData.ok) {
          setBusinesses(groupedData.businesses || []);
          // Flatten all orders for backward compatibility
          const allOrders = groupedData.businesses?.flatMap(b => b.orders) || [];
          setOrders(allOrders);
          setLoading(false);
          return;
        }
      }

      // Fallback to old API
      const res = await fetch('/api/my-orders');
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch orders');
      }
      const data = await res.json();
      setOrders(Array.isArray(data.orders) ? data.orders : []);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('שגיאה בטעינת ההזמנות');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Filter orders by selected business
  const filteredOrders = selectedBusiness
    ? businesses.find(b => b.tenantId === selectedBusiness)?.orders || []
    : orders;

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'shipped':
        return 'bg-cyan-100 text-cyan-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'הושלמה';
      case 'pending':
        return 'ממתינה';
      case 'cancelled':
        return 'בוטלה';
      case 'processing':
        return 'בהכנה';
      case 'shipped':
        return 'נשלחה';
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

  const selectedOrderTypeBadge = selectedOrder ? getOrderTypeBadge(selectedOrder) : null;

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
            <p className="text-gray-600 mt-4 text-center font-medium">טוען הזמנות...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-white py-8">
        <div className="max-w-7xl mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <h1
              className="text-4xl font-bold mb-2"
              style={{
                background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              ההזמנות שלי
            </h1>
            <div
              className="h-1 w-32 rounded-full"
              style={{ background: 'linear-gradient(90deg, #1e3a8a 0%, #0891b2 100%)' }}
            />
          </div>

          {/* Business Filter - Only show if there are multiple businesses */}
          {businesses.length > 1 && (
            <div className="mb-6">
              <p className="text-sm text-gray-500 mb-3">עסקים שקניתי מהם:</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedBusiness(null)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    selectedBusiness === null
                      ? 'text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  style={selectedBusiness === null ? {
                    background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)'
                  } : {}}
                >
                  הכל ({orders.length})
                </button>
                {businesses.map((business) => (
                  <button
                    key={business.tenantId || 'global'}
                    onClick={() => setSelectedBusiness(business.tenantId)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                      selectedBusiness === business.tenantId
                        ? 'text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    style={selectedBusiness === business.tenantId ? {
                      background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)'
                    } : {}}
                  >
                    {business.tenantLogo ? (
                      <Image
                        src={business.tenantLogo}
                        alt={business.tenantName}
                        width={20}
                        height={20}
                        className="w-5 h-5 rounded-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <div 
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                        style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
                      >
                        {business.tenantName?.charAt(0) || 'W'}
                      </div>
                    )}
                    <span>{business.tenantName}</span>
                    <span className="opacity-70">({business.ordersCount})</span>
                  </button>
                ))}
              </div>
              
              {/* Quick link to selected business shop */}
              {selectedBusiness && businesses.find(b => b.tenantId === selectedBusiness)?.tenantSlug && (
                <Link
                  href={`/t/${businesses.find(b => b.tenantId === selectedBusiness).tenantSlug}`}
                  className="inline-flex items-center gap-2 mt-3 text-sm font-medium hover:underline"
                  style={{ color: '#1e3a8a' }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  קנה עוד מ{businesses.find(b => b.tenantId === selectedBusiness).tenantName}
                </Link>
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border-2 border-red-200 text-red-700 px-6 py-4 rounded-xl mb-6">
              {error}
            </div>
          )}

          {filteredOrders.length === 0 ? (
            <div className="text-center py-16">
              <div
                className="bg-white rounded-xl p-12"
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
                  className="w-24 h-24 mx-auto mb-4"
                  style={{ color: '#0891b2' }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                  />
                </svg>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">אין הזמנות עדיין</h2>
                <p className="text-gray-600 mb-6">התחל לקנות מוצרים כדי לראות את ההזמנות שלך כאן</p>
                <Link
                  href="/shop"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all shadow-md"
                  style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background =
                      'linear-gradient(135deg, #0891b2 0%, #1e3a8a 100%)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(8, 145, 178, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background =
                      'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                  }}
                >
                  עבור לחנות
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => {
                const orderTypeBadge = getOrderTypeBadge(order);

                return (
                  <div
                    key={order._id}
                    className="bg-white rounded-xl p-6 transition-all hover:shadow-lg"
                    style={{
                      border: '2px solid transparent',
                      backgroundImage:
                        'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)',
                      backgroundOrigin: 'border-box',
                      backgroundClip: 'padding-box, border-box',
                      boxShadow: '0 4px 20px rgba(8, 145, 178, 0.15)',
                    }}
                  >
                  {/* Header Row */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-lg font-bold text-gray-900">
                        הזמנה #{order._id?.slice(-6)}
                      </h3>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          orderTypeBadge.isGroup
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {orderTypeBadge.label}
                      </span>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}
                    >
                      {getStatusText(order.status)}
                    </span>
                  </div>

                  {/* Product Thumbnails */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex -space-x-3 rtl:space-x-reverse">
                      {order.items?.slice(0, 3).map((item, idx) => (
                        <div
                          key={idx}
                          className="w-12 h-12 rounded-lg border-2 border-white bg-gray-100 overflow-hidden shadow-sm"
                        >
                          {item.image ? (
                            <Image
                              src={item.image}
                              alt={item.name || 'מוצר'}
                              width={48}
                              height={48}
                              className="w-full h-full object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                            </div>
                          )}
                        </div>
                      ))}
                      {order.items?.length > 3 && (
                        <div className="w-12 h-12 rounded-lg border-2 border-white bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 shadow-sm">
                          +{order.items.length - 3}
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>{order.items?.length || 0} פריטים</p>
                      <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString('he-IL')}</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs mb-2">
                      {['pending', 'processing', 'shipped', 'completed'].map((step, idx) => {
                        const steps = ['pending', 'processing', 'shipped', 'completed'];
                        const currentIdx = steps.indexOf(order.status);
                        const isActive = idx <= currentIdx && order.status !== 'cancelled';
                        const isCurrent = step === order.status;
                        const labels = ['התקבלה', 'בהכנה', 'נשלחה', 'נמסרה'];
                        
                        return (
                          <div key={step} className="flex flex-col items-center flex-1">
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center mb-1 transition-all ${
                                isCurrent ? 'ring-2 ring-offset-1' : ''
                              }`}
                              style={{
                                background: isActive
                                  ? 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)'
                                  : '#e5e7eb',
                                ringColor: isActive ? '#0891b2' : 'transparent',
                              }}
                            >
                              {isActive ? (
                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <span className="w-2 h-2 bg-gray-400 rounded-full" />
                              )}
                            </div>
                            <span className={`text-[10px] ${isActive ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                              {labels[idx]}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="relative h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="absolute top-0 right-0 h-full rounded-full transition-all duration-500"
                        style={{
                          background: 'linear-gradient(90deg, #1e3a8a 0%, #0891b2 100%)',
                          width: order.status === 'cancelled' ? '0%' :
                                 order.status === 'pending' ? '12.5%' :
                                 order.status === 'processing' ? '37.5%' :
                                 order.status === 'shipped' ? '62.5%' :
                                 order.status === 'completed' ? '100%' : '0%',
                        }}
                      />
                    </div>
                  </div>

                  {/* Estimated Delivery */}
                  {order.status !== 'completed' && order.status !== 'cancelled' && (
                    <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 rounded-lg">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <div className="text-sm">
                        <span className="text-blue-600 font-medium">משלוח משוער: </span>
                        <span className="text-blue-800 font-bold">
                          {new Date(new Date(order.createdAt).getTime() + (order.status === 'shipped' ? 2 : 5) * 24 * 60 * 60 * 1000).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Footer Row */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div>
                      <p className="text-sm text-gray-500">סה&quot;כ</p>
                      <p className="text-xl font-bold text-gray-900">
                        ₪{(order?.totals?.totalAmount ?? order?.totalAmount ?? 0).toLocaleString('he-IL')}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="px-5 py-2.5 rounded-xl font-medium transition-all hover:scale-105"
                      style={{
                        background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
                        color: 'white',
                      }}
                    >
                      צפה בפרטים
                    </button>
                  </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedOrder(null)}
        >
          <div 
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            style={{
              border: '2px solid transparent',
              backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)',
              backgroundOrigin: 'border-box',
              backgroundClip: 'padding-box, border-box',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
            }}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white p-6 border-b flex items-center justify-between rounded-t-2xl">
              <div>
                <h2 className="text-2xl font-bold" style={{ color: '#1e3a8a' }}>
                  הזמנה #{selectedOrder._id?.slice(-6)}
                </h2>
                <p className="text-sm text-gray-500">
                  {new Date(selectedOrder.createdAt).toLocaleDateString('he-IL', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Status & Type */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(selectedOrder.status)}`}>
                  {getStatusText(selectedOrder.status)}
                </span>
                <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
                  selectedOrderTypeBadge?.isGroup ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {selectedOrderTypeBadge?.label}
                </span>
              </div>

              {/* Order Items */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">פריטים בהזמנה</h3>
                <div className="space-y-3">
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                      <div className="w-16 h-16 rounded-lg bg-gray-200 overflow-hidden flex-shrink-0">
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt={item.name || 'מוצר'}
                            width={64}
                            height={64}
                            className="w-full h-full object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{item.name || 'מוצר'}</p>
                        <p className="text-sm text-gray-500">כמות: {item.quantity || 1}</p>
                      </div>
                      <p className="font-bold text-lg" style={{ color: '#1e3a8a' }}>
                        ₪{(item.totalPrice || item.unitPrice || item.price || 0).toLocaleString('he-IL')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Customer Details */}
              {selectedOrder.customer && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">פרטי לקוח</h3>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                    {selectedOrder.customer.name && (
                      <p className="text-gray-700"><span className="font-medium">שם:</span> {selectedOrder.customer.name}</p>
                    )}
                    {selectedOrder.customer.email && (
                      <p className="text-gray-700"><span className="font-medium">אימייל:</span> {selectedOrder.customer.email}</p>
                    )}
                    {selectedOrder.customer.phone && (
                      <p className="text-gray-700"><span className="font-medium">טלפון:</span> {selectedOrder.customer.phone}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Shipping Address */}
              {selectedOrder.shippingAddress && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">כתובת למשלוח</h3>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-gray-700">
                      {selectedOrder.shippingAddress.street && `${selectedOrder.shippingAddress.street}, `}
                      {selectedOrder.shippingAddress.city && `${selectedOrder.shippingAddress.city} `}
                      {selectedOrder.shippingAddress.zipCode && `(${selectedOrder.shippingAddress.zipCode})`}
                    </p>
                  </div>
                </div>
              )}

              {/* Order Summary */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-bold text-gray-900 mb-4">סיכום הזמנה</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-gray-600">
                    <span>סכום ביניים:</span>
                    <span>₪{(selectedOrder.totals?.subtotal || selectedOrder.subtotal || 0).toLocaleString('he-IL')}</span>
                  </div>
                  {(selectedOrder.totals?.discount || selectedOrder.discountAmount) > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>הנחה:</span>
                      <span>-₪{(selectedOrder.totals?.discount || selectedOrder.discountAmount || 0).toLocaleString('he-IL')}</span>
                    </div>
                  )}
                  {(selectedOrder.totals?.shipping || selectedOrder.shippingCost) > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>משלוח:</span>
                      <span>₪{(selectedOrder.totals?.shipping || selectedOrder.shippingCost || 0).toLocaleString('he-IL')}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xl font-bold pt-2 border-t">
                    <span>סה&quot;כ:</span>
                    <span style={{ color: '#1e3a8a' }}>
                      ₪{(selectedOrder.totals?.totalAmount || selectedOrder.totalAmount || 0).toLocaleString('he-IL')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Link
                  href="/shop"
                  className="flex-1 py-3 rounded-xl font-medium text-center transition-all hover:scale-105"
                  style={{
                    background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
                    color: 'white',
                  }}
                >
                  הזמן שוב
                </Link>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="flex-1 py-3 rounded-xl font-medium border-2 transition-all hover:bg-gray-50"
                  style={{ borderColor: '#1e3a8a', color: '#1e3a8a' }}
                >
                  סגור
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
