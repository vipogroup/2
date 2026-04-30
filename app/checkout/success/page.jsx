'use client';

import { useEffect, useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const statusConfig = {
  paid: {
    title: 'התשלום התקבל בהצלחה',
    description: 'הזמנתך אושרה ואנחנו מתחילים להכין אותה.',
    badgeClasses: 'bg-green-100 text-green-700 border border-green-200',
  },
  pending: {
    title: 'הזמנה נקלטה – התשלום בהמתנה',
    description: 'אנחנו מוודאים את התשלום מול חברת האשראי. ברגע שיאושר נשלח עדכון.',
    badgeClasses: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
  },
  failed: {
    title: 'התשלום נכשל',
    description: 'נראה שהתשלום לא הושלם. ניתן לנסות שוב או לבחור אמצעי תשלום אחר.',
    badgeClasses: 'bg-red-100 text-red-700 border border-red-200',
  },
};

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(!!orderId);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!orderId) {
      setError('חסר מספר הזמנה בנתיב החזרה');
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/orders/${orderId}`, { signal: controller.signal });
        if (!res.ok) {
          const details = await res.json().catch(() => ({}));
          throw new Error(details.error || 'נכשל בטעינת ההזמנה');
        }
        const data = await res.json();
        setOrder(data);
        setError('');
      } catch (err) {
        if (err.name === 'AbortError') return;
        setError(err.message || 'שגיאה בטעינת הנתונים');
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [orderId]);

  const status = order?.status?.toLowerCase?.() || 'pending';
  const config = statusConfig[status] || statusConfig.pending;

  const totals = useMemo(() => {
    if (!order?.totals) return null;
    return {
      subtotal: order.totals.subtotal?.toFixed?.(2) ?? null,
      discount: order.totals.discountAmount?.toFixed?.(2) ?? null,
      total: order.totals.totalAmount?.toFixed?.(2) ?? order.totalAmount?.toFixed?.(2) ?? null,
    };
  }, [order]);

  // Determine the correct shop URL based on tenant
  const shopUrl = useMemo(() => {
    if (order?.tenantSlug) {
      return `/t/${order.tenantSlug}`;
    }
    return '/shop';
  }, [order]);

  return (
    <div className="min-h-screen bg-white py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div
          className="rounded-3xl p-8 shadow-xl text-center"
          style={{
            border: '2px solid transparent',
            backgroundImage:
              'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)',
            backgroundOrigin: 'border-box',
            backgroundClip: 'padding-box, border-box',
          }}
        >
          <div className="mb-6">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${config.badgeClasses}`}>
              <span className="w-2 h-2 rounded-full bg-current" />
              {status === 'paid' ? 'שולם' : status === 'failed' ? 'נכשל' : 'ממתין' }
            </div>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-3">{config.title}</h1>
          <p className="text-gray-600 mb-8">{config.description}</p>

          {orderId && (
            <p className="text-sm text-gray-500 mb-8">
              מספר הזמנה: <span className="font-semibold text-gray-800">#{orderId.slice(-6)}</span>
            </p>
          )}

          {loading && <p className="text-gray-500">טוען נתוני הזמנה...</p>}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl mb-6">
              {error}
            </div>
          )}

          {order && !error && (
            <div className="bg-gray-50 rounded-2xl p-6 text-right mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">סיכום הזמנה</h2>
              <ul className="space-y-2 text-gray-700">
                {order.items?.map((item) => (
                  <li key={item.productId} className="flex justify-between text-sm">
                    <span>
                      {item.name} <span className="text-gray-500">× {item.quantity}</span>
                    </span>
                    <span>₪{(item.totalPrice || 0).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              {totals && (
                <div className="mt-6 border-t border-dashed border-gray-200 pt-4 space-y-1 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>סכום ביניים</span>
                    <span>₪{totals.subtotal || '0.00'}</span>
                  </div>
                  {totals.discount && totals.discount !== '0.00' && (
                    <div className="flex justify-between text-gray-600">
                      <span>הנחה</span>
                      <span>-₪{totals.discount}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-900 font-semibold text-base">
                    <span>לתשלום</span>
                    <span>₪{totals.total || '0.00'}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-3 justify-center">
            <Link
              href={shopUrl}
              className="px-6 py-3 rounded-2xl text-white font-semibold shadow-lg"
              style={{ background: 'linear-gradient(135deg, #1e3a8a, #0891b2)' }}
            >
              המשך קניות
            </Link>
            <Link
              href="/orders"
              className="px-6 py-3 rounded-2xl font-semibold border-2"
              style={{ borderColor: '#1e3a8a', color: '#1e3a8a' }}
            >
              לצפייה בכל ההזמנות
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">טוען...</div>}>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
