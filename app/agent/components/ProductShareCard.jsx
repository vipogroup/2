'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function ProductShareCard({ product, couponCode, referralLink }) {
  const router = useRouter();

  const discountPercent = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;
  const mediaImages = Array.isArray(product.media?.images) ? product.media.images : [];
  const firstImage = mediaImages[0];
  const primaryImage =
    firstImage?.url || 'https://placehold.co/300x300/f3f4f6/9ca3af?text=%F0%9F%93%A6';

  return (
    <div
        className="bg-white rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg"
        style={{
          border: '2px solid transparent',
          backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)',
          backgroundOrigin: 'border-box',
          backgroundClip: 'padding-box, border-box',
        }}
      >
        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-gray-50">
          <Image
            src={primaryImage}
            alt={product.name || 'מוצר'}
            fill
            className="object-cover"
            unoptimized
          />

          {/* Share Button - Small Icon */}
          <button
            type="button"
            onClick={() => router.push(`/agent/share/${product._id}`)}
            className="absolute top-2 left-2 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
            style={{
              background: 'rgba(255, 255, 255, 0.9)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            }}
            aria-label="שתף מוצר"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="#0891b2"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>

          {/* Discount Badge */}
          {discountPercent > 0 && (
            <div
              className="absolute top-2 right-2 text-white px-2 py-1 rounded-lg text-xs font-bold"
              style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
            >
              -{discountPercent}%
            </div>
          )}

          {/* Commission Badge */}
          {product.commission && (
            <div className="absolute bottom-2 left-2 bg-emerald-500 text-white px-2 py-1 rounded-lg text-xs font-bold">
              ₪{product.commission} עמלה
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-3">
          {/* Product Name */}
          <h3 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-2 h-10">
            {product.name}
          </h3>

          {/* Price */}
          <div className="flex items-center gap-2">
            <span 
              className="text-lg font-bold"
              style={{ color: '#1e3a8a' }}
            >
              ₪{product.price?.toLocaleString('he-IL')}
            </span>
            {product.originalPrice && (
              <span className="text-xs line-through text-gray-400">
                ₪{product.originalPrice?.toLocaleString('he-IL')}
              </span>
            )}
          </div>
        </div>
      </div>
  );
}
