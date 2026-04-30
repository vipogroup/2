'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getPrimaryImageSrc } from '@/app/lib/mediaSSOT';
import { getCardImageSrc } from '@/lib/cloudinary-transforms';
import { getProductPublicPath } from '@/lib/stainlessSeoCategories';
import { useRouter } from 'next/navigation';
import EditableTextField from './EditableTextField';
import { useSiteTexts } from '@/lib/useSiteTexts';

export default function FeaturedCarousel({ darkBackground = true, title = 'מוצרים במחיר מפעל', textKey = 'HOME_CAROUSEL_TITLE' }) {
  const { editMode } = useSiteTexts();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [user, setUser] = useState(null);

  // Fetch user to check if agent
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };
    fetchUser();
  }, []);

  // Fetch featured products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch('/api/products?featured=true&marketplace=true');
        const data = await res.json();
        const productsList = data.products || data;
        if (Array.isArray(productsList)) {
          const featured = productsList.filter(p => p.isFeatured);
          setProducts(featured.length > 0 ? featured : productsList.slice(0, 10));
        }
      } catch (error) {
        console.error('Error fetching featured products:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // Auto-rotate carousel
  useEffect(() => {
    if (products.length === 0 || isPaused) return;
    
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % products.length);
    }, 2500);
    
    return () => clearInterval(interval);
  }, [products.length, isPaused]);

  if (loading) {
    return (
      <div className="py-0 md:py-2 px-4 pb-0" style={{ position: 'relative', zIndex: 2, marginTop: '60px', marginBottom: '0', minHeight: '420px' }}>
        <div className="text-center mb-2 md:mb-4">
          <EditableTextField 
            textKey={textKey}
            fallback={title}
            as="h2"
            className="text-xl font-bold drop-shadow-lg"
            style={darkBackground ? { color: '#ffffff', textShadow: '2px 2px 8px rgba(0, 0, 0, 0.7)' } : { background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
          />
          <div 
            className="h-1 w-16 mx-auto mt-2 rounded-full"
            style={{ background: darkBackground ? 'linear-gradient(90deg, rgba(255,255,255,0.3) 0%, #ffffff 50%, rgba(255,255,255,0.3) 100%)' : 'linear-gradient(90deg, #1e3a8a 0%, #0891b2 100%)' }}
          />
        </div>
        <div className="animate-pulse flex justify-center gap-4 overflow-hidden">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="w-32 h-56 bg-white/20 rounded-xl flex-shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return null;
  }

  // Calculate position for 3D carousel
  const getCardStyle = (index) => {
    const total = products.length;
    const anglePerItem = 360 / total;
    const rotation = (index - currentIndex) * anglePerItem;
    const radius = 220; // Distance from center
    
    // Convert to radians
    const radians = (rotation * Math.PI) / 180;
    
    // Calculate 3D position
    const translateX = Math.sin(radians) * radius;
    const translateZ = Math.cos(radians) * radius - radius;
    const scale = (translateZ + radius * 2) / (radius * 2);
    const opacity = scale < 0.5 ? 0 : Math.min(1, scale);
    const zIndex = Math.round(scale * 100);
    
    return {
      transform: `translateX(${translateX}px) translateZ(${translateZ}px) scale(${Math.max(0.6, scale)})`,
      opacity,
      zIndex,
      transition: 'all 0.5s ease-out',
    };
  };

  return (
    <div className="py-0 md:py-2 px-4 pb-0" style={{ position: 'relative', zIndex: 2, marginTop: '60px', marginBottom: '0', minHeight: '420px' }}>
      {/* Section Header */}
      <div className="text-center mb-2 md:mb-4">
        <EditableTextField 
          textKey={textKey}
          fallback={title}
          as="h2"
          className="text-xl font-bold drop-shadow-lg"
          style={darkBackground ? { color: '#ffffff', textShadow: '2px 2px 8px rgba(0, 0, 0, 0.7)' } : { background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
        />
        <div 
          className="h-1 w-16 mx-auto mt-2 rounded-full"
          style={{ background: darkBackground ? 'linear-gradient(90deg, rgba(255,255,255,0.3) 0%, #ffffff 50%, rgba(255,255,255,0.3) 100%)' : 'linear-gradient(90deg, #1e3a8a 0%, #0891b2 100%)' }}
        />
      </div>

      {/* 3D Carousel */}
      <div 
        className="relative mx-auto"
        style={{ 
          perspective: '1000px',
          height: '320px',
          maxWidth: '100%',
        }}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        <div 
          className="absolute left-1/2 top-1/2"
          style={{ 
            transformStyle: 'preserve-3d',
            transform: 'translate(-50%, -50%)',
          }}
        >
          {products.map((product, index) => (
            <div
              key={product._id}
              className="absolute"
              style={{
                ...getCardStyle(index),
                left: '-80px', // Half of card width (w-40 = 160px)
                top: '-140px', // Half of card height
              }}
            >
              <FeaturedProductCard 
                product={product}
                user={user}
              />
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

function FeaturedProductCard({ product, user }) {
  const router = useRouter();

  const discountPercent = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;
  const primaryImage = getPrimaryImageSrc(product);
  const cardImage = primaryImage ? getCardImageSrc(primaryImage) : '';
  const productPath = getProductPublicPath(product);

  return (
    <div
      className="flex-shrink-0 w-40 rounded-xl overflow-hidden group flex flex-col transition-all duration-300"
      style={{
        border: '2px solid transparent',
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.7), rgba(255,255,255,0.7)), linear-gradient(135deg, #1e3a8a, #0891b2)',
        backgroundOrigin: 'border-box',
        backgroundClip: 'padding-box, border-box',
        boxShadow: '0 4px 15px rgba(8, 145, 178, 0.15)',
        backdropFilter: 'blur(8px)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 12px 24px rgba(8, 145, 178, 0.25)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 15px rgba(8, 145, 178, 0.15)';
      }}
    >
      {/* Image Container */}
      <Link href={productPath} className="block relative">
        <div className="relative aspect-square overflow-hidden bg-gray-50">
          <Image
            src={cardImage || primaryImage || 'https://placehold.co/300x300/f3f4f6/9ca3af?text=%F0%9F%93%A6'}
            alt={product.name || 'מוצר'}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            unoptimized
          />


          {/* Inventory Mode Badge */}
          <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
            {(product.inventoryMode === 'stock' || (!product.inventoryMode && product.purchaseType !== 'group' && product.type !== 'group')) ? (
              <span className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[9px] px-1.5 py-0.5 rounded-full shadow-sm">
                זמין במלאי
              </span>
            ) : (
              <span className={`text-white text-[9px] px-1.5 py-0.5 rounded-full shadow-sm ${product.groupPurchaseType === 'shared_container' ? 'bg-teal-600' : 'bg-amber-500'}`}>
                {product.groupPurchaseType === 'shared_container' ? 'מכולה משותפת' : 'רכישה קבוצתית'}
              </span>
            )}
            {discountPercent > 0 && (
              <span
                className="text-white px-1.5 py-0.5 rounded text-[9px] font-bold"
                style={{
                  background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
                }}
              >
                -{discountPercent}%
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* Product Info */}
      <div className="p-2.5 flex-1 flex flex-col">
        {/* Product Title */}
        <Link href={productPath}>
          <h3 className="text-xs font-medium mb-1.5 line-clamp-2 hover:text-cyan-600 leading-snug" style={{ color: '#374151' }}>
            {product.name}
          </h3>
        </Link>

        {/* Price */}
        <div className="mb-2">
          {product.originalPrice ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span 
                className="text-base font-black"
                style={{ 
                  background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                ₪{product.price?.toLocaleString('he-IL')}
              </span>
              <span className="text-[10px] line-through text-gray-400">
                ₪{product.originalPrice?.toLocaleString('he-IL')}
              </span>
            </div>
          ) : (
            <span 
              className="text-base font-bold"
              style={{ 
                background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              ₪{product.price?.toLocaleString('he-IL')}
            </span>
          )}
        </div>

              </div>

    </div>
  );
}
