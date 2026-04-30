'use client';

import ShareButtons from '@/app/components/ShareButtons';

export default function ShareModal({ isOpen, onClose, product, couponCode, referralLink }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div 
          className="px-5 py-4"
          style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">שתף מוצר</h3>
            <button 
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Product Info */}
        <div className="p-4 border-b border-gray-100">
          <p className="font-semibold text-gray-900 text-sm">{product?.name}</p>
          <p className="text-lg font-bold" style={{ color: '#1e3a8a' }}>₪{product?.price?.toLocaleString('he-IL')}</p>
        </div>

        {/* Share Buttons */}
        <div className="p-4">
          <ShareButtons 
            product={product} 
            couponCode={couponCode}
            referralLink={referralLink}
            onShare={onClose}
          />
        </div>
      </div>
    </div>
  );
}
