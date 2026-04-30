'use client';

import { useState, useEffect } from 'react';
import ProductShareCard from './ProductShareCard';

export default function ProductsGallery({ couponCode, referralLink }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch('/api/products?featured=true');
        const data = await res.json();
        const productsList = data.products || data;
        if (Array.isArray(productsList)) {
          setProducts(productsList.slice(0, 6));
        }
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="animate-pulse bg-gray-100 rounded-xl aspect-square" />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>אין מוצרים להצגה</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {products.map((product) => (
        <ProductShareCard
          key={product._id}
          product={product}
          couponCode={couponCode}
          referralLink={referralLink}
        />
      ))}
    </div>
  );
}
