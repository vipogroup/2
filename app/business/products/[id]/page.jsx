'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { refreshProductsFromApi } from '@/app/lib/products';
import {
  fetchCategoriesFromAPI,
  DEFAULT_PRODUCT_CATEGORIES,
} from '@/app/lib/productCategories';
import MultiMediaUpload from '@/app/components/MultiMediaUpload';

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [productLoading, setProductLoading] = useState(true);

  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    fullDescription: '',
    price: '',
    originalPrice: '',
    category: '',
    media: {
      images: [],
      videoUrl: '',
    },
    inStock: true,
    stockCount: '',
    rating: '4.5',
    reviews: '0',
    purchaseType: 'regular',
    groupPurchaseDetails: {
      closingDays: '40',
      shippingDays: '60',
      minQuantity: '10',
      currentQuantity: '0',
    },
    features: ['', '', '', ''],
    specs: '',
    suitableFor: '',
    whyChooseUs: '',
    warranty: '',
    customFields: [],
    shippingEnabled: false,
    shippingPrice: '',
  });

  const [categories, setCategories] = useState(DEFAULT_PRODUCT_CATEGORIES);

  // Check auth and load product
  useEffect(() => {
    async function init() {
      try {
        // Check auth
        const authRes = await fetch('/api/auth/me', { credentials: 'include' });
        if (!authRes.ok) {
          router.push('/login');
          return;
        }
        const authData = await authRes.json();
        if (authData.user?.role !== 'business_admin' && authData.user?.role !== 'admin' && authData.user?.role !== 'super_admin') {
          router.push('/login');
          return;
        }
        setUser(authData.user);

        // Load categories
        const cats = await fetchCategoriesFromAPI();
        setCategories(cats);

        // Load product
        const productRes = await fetch(`/api/products/${params.id}`, { credentials: 'include' });
        if (!productRes.ok) {
          setError('המוצר לא נמצא');
          setProductLoading(false);
          return;
        }
        const product = await productRes.json();
        
        setFormData({
          sku: product.sku || '',
          name: product.name || '',
          description: product.description || '',
          fullDescription: product.fullDescription || '',
          price: product.price?.toString() || '',
          originalPrice: product.originalPrice?.toString() || '',
          category: product.category || '',
          media: {
            images: Array.isArray(product.media?.images) ? product.media.images : [],
            videoUrl: product.media?.videoUrl || '',
          },
          inStock: product.inStock ?? true,
          stockCount: product.stockCount?.toString() || '',
          rating: product.rating?.toString() || '4.5',
          reviews: product.reviews?.toString() || '0',
          purchaseType: product.purchaseType || 'regular',
          groupPurchaseDetails: product.groupPurchaseDetails || {
            closingDays: '40',
            shippingDays: '60',
            minQuantity: '10',
            currentQuantity: '0',
          },
          features: product.features || ['', '', '', ''],
          specs: product.specs || '',
          suitableFor: product.suitableFor || '',
          whyChooseUs: product.whyChooseUs || '',
          warranty: product.warranty || '',
          customFields: product.customFields || [],
          shippingEnabled: product.shippingEnabled || false,
          shippingPrice: product.shippingPrice?.toString() || '',
        });
        
        setProductLoading(false);
      } catch (err) {
        setError(err.message);
        setProductLoading(false);
      }
    }
    init();
  }, [router, params.id]);

  const categoryOptions = useMemo(
    () => [...categories].sort((a, b) => a.localeCompare(b, 'he')),
    [categories],
  );

  const mediaImages = useMemo(
    () => (Array.isArray(formData.media?.images) ? formData.media.images : []),
    [formData.media?.images],
  );

  const mediaImageSources = useMemo(
    () => mediaImages.map((img) => img?.url).filter(Boolean),
    [mediaImages],
  );

  const handleMediaImagesChange = useCallback((urls) => {
    setFormData((prev) => {
      const nextImages = urls.map((url, index) => ({
        url,
        alt: prev.media?.images?.[index]?.alt || '',
        position: index,
        publicId: prev.media?.images?.[index]?.publicId || '',
      }));

      return {
        ...prev,
        media: {
          ...(prev.media || {}),
          images: nextImages,
        },
      };
    });
  }, []);

  const handleMediaVideoChange = useCallback((videoUrl) => {
    setFormData((prev) => ({
      ...prev,
      media: {
        ...(prev.media || {}),
        videoUrl,
      },
    }));
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const payload = {
        ...formData,
        price: parseFloat(formData.price) || 0,
        originalPrice: parseFloat(formData.originalPrice) || null,
        stockCount: parseInt(formData.stockCount) || 0,
        shippingPrice: parseFloat(formData.shippingPrice) || 0,
        features: formData.features.filter(f => f.trim()),
      };

      const res = await fetch(`/api/products/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'שגיאה בעדכון המוצר');
      }

      await refreshProductsFromApi();
      router.push('/business');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!user || productLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8" dir="rtl">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6">
          <Link href="/business" className="text-blue-600 hover:underline">
            ← חזרה לדשבורד
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h1 className="text-2xl font-bold mb-6">עריכת מוצר</h1>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">שם המוצר *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">מקט</label>
                <input
                  type="text"
                  name="sku"
                  value={formData.sku}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">תיאור קצר</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">מחיר *</label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  required
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">מחיר מקורי</label>
                <input
                  type="number"
                  name="originalPrice"
                  value={formData.originalPrice}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">קטגוריה</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">בחר קטגוריה</option>
                  {categoryOptions.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Stock */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="inStock"
                  checked={formData.inStock}
                  onChange={handleChange}
                  className="w-5 h-5 rounded"
                />
                <label className="text-sm font-medium text-gray-700">במלאי</label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">כמות במלאי</label>
                <input
                  type="number"
                  name="stockCount"
                  value={formData.stockCount}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Images */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">תמונות</label>
              <MultiMediaUpload
                images={mediaImageSources}
                onImagesChange={handleMediaImagesChange}
                videoUrl={formData.media?.videoUrl || ''}
                onVideoChange={handleMediaVideoChange}
              />
            </div>

            {/* Submit */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 text-white rounded-lg disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)' }}
              >
                {submitting ? 'שומר...' : 'שמור שינויים'}
              </button>
              <Link
                href="/business"
                className="px-6 py-3 border rounded-lg hover:bg-gray-50"
              >
                ביטול
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
