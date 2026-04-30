'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { useCartContext } from '@/app/context/CartContext';

export default function CartToast() {
  const { lastAdded, dismissLastAdded } = useCartContext();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!lastAdded) {
      setIsVisible(false);
      return;
    }

    setIsVisible(true);
    const timer = setTimeout(() => {
      setIsVisible(false);
      dismissLastAdded();
    }, 3200);

    return () => clearTimeout(timer);
  }, [lastAdded, dismissLastAdded]);

  if (!lastAdded || !isVisible) return null;

  return (
    <div className="fixed bottom-6 right-4 left-4 sm:left-auto sm:w-80 z-[1000]">
      <div className="bg-white shadow-2xl rounded-2xl px-4 py-3 flex flex-col gap-2 animate-[slide-up_0.25s_ease-out]" style={{ border: '2px solid transparent', backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)', backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box', boxShadow: '0 8px 25px rgba(8, 145, 178, 0.25)' }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-gray-500">נוסף לסל</p>
            <p className="text-base font-semibold text-gray-900">{lastAdded.name}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsVisible(false);
              dismissLastAdded();
            }}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none"
            aria-label="סגור הודעה"
          >
            ×
          </button>
        </div>
        <div className="text-sm text-gray-600">כמות בסל: {lastAdded.totalQuantity}</div>
        <Link
          href="/cart"
          className="inline-flex items-center justify-center gap-2 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all"
          style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)', boxShadow: '0 2px 8px rgba(8, 145, 178, 0.3)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, #0891b2 0%, #1e3a8a 100%)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)'; e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          מעבר לסל
        </Link>
      </div>
      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(16px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
