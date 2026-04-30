'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function CheckoutCancelContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  return (
    <div className="min-h-screen bg-white py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div
          className="rounded-3xl p-8 shadow-xl text-center"
          style={{
            border: '2px solid transparent',
            backgroundImage:
              'linear-gradient(white, white), linear-gradient(135deg, #ef4444, #dc2626)',
            backgroundOrigin: 'border-box',
            backgroundClip: 'padding-box, border-box',
          }}
        >
          {/* Cancel Icon */}
          <div className="mb-6">
            <div 
              className="w-20 h-20 mx-auto rounded-full flex items-center justify-center"
              style={{ background: 'rgba(239, 68, 68, 0.1)' }}
            >
              <span className="text-5xl text-red-500">X</span>
            </div>
          </div>

          {/* Status Badge */}
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-red-100 text-red-700 border border-red-200">
              <span className="w-2 h-2 rounded-full bg-current" />
              בוטל
            </div>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            התשלום בוטל
          </h1>
          
          <p className="text-gray-600 mb-8">
            התשלום בוטל ולא חויבת. ניתן לחזור לסל הקניות ולנסות שוב.
          </p>

          {orderId && (
            <p className="text-sm text-gray-500 mb-8">
              מספר הזמנה: <span className="font-semibold text-gray-800">#{orderId.slice(-6)}</span>
            </p>
          )}

          {/* Info Box */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-8 text-right">
            <p className="text-amber-800 text-sm">
              <strong>טיפ:</strong> אם נתקלת בבעיה בתשלום, ניתן לנסות אמצעי תשלום אחר או ליצור קשר עם התמיכה.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col md:flex-row gap-3 justify-center">
            <Link
              href="/cart"
              className="px-6 py-3 rounded-2xl text-white font-semibold shadow-lg transition-transform hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
            >
              חזרה לסל הקניות
            </Link>
            <Link
              href="/shop"
              className="px-6 py-3 rounded-2xl font-semibold border-2 transition-transform hover:scale-105"
              style={{ borderColor: '#1e3a8a', color: '#1e3a8a' }}
            >
              המשך קניות
            </Link>
          </div>

          {/* Help Link */}
          <p className="mt-8 text-sm text-gray-500">
            צריך עזרה?{' '}
            <Link href="/contact" className="underline" style={{ color: '#0891b2' }}>
              צור קשר עם התמיכה
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutCancelPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">טוען...</div>}>
      <CheckoutCancelContent />
    </Suspense>
  );
}
