'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import ShareButtons from '@/app/components/ShareButtons';

export default function ShareProductPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.productId;

  const [product, setProduct] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch product and user data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch user
        const userRes = await fetch('/api/auth/me');
        if (!userRes.ok) {
          router.push('/login');
          return;
        }
        const userData = await userRes.json();
        if (userData.user?.role !== 'agent' && userData.user?.role !== 'admin') {
          router.push('/');
          return;
        }
        setUser(userData.user);

        // Fetch product
        const productRes = await fetch(`/api/products/${productId}`);
        if (productRes.ok) {
          const productData = await productRes.json();
          setProduct(productData.product || productData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [productId, router]);

  const couponCode = user?.couponCode || '';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f8f9fa' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" style={{ borderColor: '#0891b2' }}></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: '#f8f9fa' }}>
        <h1 className="text-xl font-bold text-gray-800 mb-4">המוצר לא נמצא</h1>
        <Link 
          href="/agent"
          className="px-6 py-3 rounded-xl text-white font-medium"
          style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
        >
          חזור לדשבורד
        </Link>
      </div>
    );
  }

  const discountPercent = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;
  const mediaImages = Array.isArray(product.media?.images) ? product.media.images : [];
  const firstImage = mediaImages[0];
  const primaryImage =
    firstImage?.url || 'https://placehold.co/300x300/f3f4f6/9ca3af?text=%F0%9F%93%A6';

  return (
    <div className="min-h-screen pb-8" style={{ background: '#f8f9fa' }}>
      {/* Header */}
      <div 
        className="px-4 py-6"
        style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
      >
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <button 
              onClick={() => router.back()}
              className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-bold text-white">שיתוף מוצר</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-4">
        {/* Product Card */}
        <div 
          className="bg-white rounded-2xl overflow-hidden mb-6"
          style={{ 
            boxShadow: '0 4px 20px rgba(8, 145, 178, 0.15)',
            border: '2px solid transparent',
            backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)',
            backgroundOrigin: 'border-box',
            backgroundClip: 'padding-box, border-box',
          }}
        >
          <div className="flex flex-col sm:flex-row">
            {/* Product Image */}
            <div className="relative w-full sm:w-48 h-48 flex-shrink-0">
              <Image
                src={primaryImage}
                alt={product.name || 'מוצר'}
                fill
                className="object-cover"
                unoptimized
              />
              {discountPercent > 0 && (
                <div 
                  className="absolute top-2 right-2 text-white px-2 py-1 rounded-lg text-xs font-bold"
                  style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
                >
                  -{discountPercent}%
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="p-4 flex-1">
              <h2 className="font-bold text-lg text-gray-900 mb-2">{product.name}</h2>
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">{product.description}</p>
              
              <div className="flex items-center gap-3 mb-3">
                <span 
                  className="text-2xl font-black"
                  style={{ 
                    background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  ₪{product.price?.toLocaleString('he-IL')}
                </span>
                {product.originalPrice && (
                  <span className="text-sm line-through text-gray-400">
                    ₪{product.originalPrice?.toLocaleString('he-IL')}
                  </span>
                )}
              </div>

              {product.commission && (
                <div className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm font-medium">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  עמלה: ₪{product.commission}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Share Buttons Component */}
        <ShareButtons 
          product={product} 
          couponCode={couponCode} 
        />
      </div>
    </div>
  );
}
