'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getProductById } from '@/app/lib/products';
import { sendOrderToWhatsApp } from '@/lib/whatsappCheckout';
import { getShippingCostForAddress, SHIPPING_CONSTANTS } from '@/lib/shippingCalculator';
import { getAttributionPayloadForOrder } from '@/lib/attributionClient';

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.productId;

  const [product, setProduct] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    zipCode: '',
    paymentMethod: 'whatsapp',
    agreeToTerms: false,
    deliveryMethod: 'pickup',
    pickupPoint: 'beer_yaakov',
  });

  const PICKUP_POINTS = [
    { id: 'beer_yaakov', name: 'באר יעקב', address: 'זבוטינסקי 3, באר יעקב' },
    { id: 'naale', name: 'נעלה', address: 'לשם 10, נעלה' },
  ];

  // Shipping calculation state
  const [shippingCalc, setShippingCalc] = useState(null);
  const [calculatingShipping, setCalculatingShipping] = useState(false);
  const [shippingCalcError, setShippingCalcError] = useState('');
  const currentShippingPrice = shippingCalc?.price || SHIPPING_CONSTANTS.BASE_PRICE;

  // Calculate shipping cost when address and city change
  const calcShippingTimeoutRef = useRef(null);
  useEffect(() => {
    if (formData.deliveryMethod !== 'shipping') return;
    if (!formData.address?.trim() || !formData.city?.trim()) {
      setShippingCalc(null);
      setShippingCalcError('');
      return;
    }
    if (calcShippingTimeoutRef.current) clearTimeout(calcShippingTimeoutRef.current);
    calcShippingTimeoutRef.current = setTimeout(async () => {
      setCalculatingShipping(true);
      setShippingCalcError('');
      try {
        const result = await getShippingCostForAddress(formData.address, formData.city);
        if (result) {
          setShippingCalc(result);
        } else {
          setShippingCalc(null);
          setShippingCalcError('לא הצלחנו לאתר את הכתובת. עלות המשלוח תהיה ' + SHIPPING_CONSTANTS.BASE_PRICE + ' ₪ (בסיס).');
        }
      } catch {
        setShippingCalc(null);
      } finally {
        setCalculatingShipping(false);
      }
    }, 1000);
    return () => { if (calcShippingTimeoutRef.current) clearTimeout(calcShippingTimeoutRef.current); };
  }, [formData.address, formData.city, formData.deliveryMethod]);

  const gradientStyle = useMemo(
    () => ({
      background:
        'linear-gradient(135deg, #1e3a8a 0%, #0891b2 50%, #06b6d4 100%)',
    }),
    [],
  );

  const loadData = useCallback(async () => {
    if (!productId) return;
    setLoading(true);

    // Load product
    const prod = getProductById(productId);
    if (!prod) {
      alert('מוצר לא נמצא');
      router.push('/shop');
      return;
    }
    setProduct(prod);

    // Load user if logged in
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        // Pre-fill form with user data
        setFormData((prev) => ({
          ...prev,
          fullName: data.user.fullName || '',
          email: data.user.email || '',
          phone: data.user.phone || '',
        }));
      }
    } catch (error) {
      console.error('Failed to load user:', error);
    }

    setLoading(false);
  }, [productId, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.agreeToTerms) {
      alert('עליך לאשר את התנאים וההגבלות');
      return;
    }

    setProcessing(true);

    try {
      const sp = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const attribution = getAttributionPayloadForOrder(sp);
      // Create order - send items array as expected by API
      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [
            {
              productId: product._id,
              quantity: 1,
            },
          ],
          customer: {
            name: formData.fullName,
            email: formData.email,
            phone: formData.phone,
            address: formData.address,
            city: formData.city,
            zipCode: formData.zipCode,
          },
          paymentMethod: 'whatsapp',
          ...(attribution ? { attribution } : {}),
        }),
      });

      if (!orderRes.ok) {
        throw new Error('Failed to create order');
      }

      const orderData = await orderRes.json();

      // Create sale record
      if (user) {
        await fetch('/api/sales', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerId: user.id,
            productId: product._id,
            productName: product.name,
            salePrice: product.price,
          }),
        });
      }

      const shippingCost = formData.deliveryMethod === 'shipping' ? currentShippingPrice : 0;
      const totalPrice = product.price + shippingCost;

      // --- זמני: הפניה לוואטסאפ במקום תשלום באשראי ---
      sendOrderToWhatsApp({
        orderId: orderData.orderId,
        items: [{
          name: product.name,
          quantity: 1,
          price: product.price,
        }],
        customer: {
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          zipCode: formData.zipCode,
        },
        totals: {
          subtotal: product.price,
          discount: 0,
          shipping: shippingCost,
          total: totalPrice,
        },
        deliveryMethod: formData.deliveryMethod,
        pickupPoint: formData.deliveryMethod === 'pickup'
          ? PICKUP_POINTS.find(p => p.id === formData.pickupPoint)
          : null,
        shippingCost,
        shippingDistance: shippingCalc?.distance || null,
      });

      router.push(`/checkout/success?orderId=${orderData.orderId}`);
    } catch (error) {
      console.error('Checkout error:', error);
      alert('שגיאה בביצוע ההזמנה. אנא נסה שוב.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={gradientStyle}>
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">טוען...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return null;
  }

  const mediaImages = Array.isArray(product.media?.images) ? product.media.images : [];
  const firstImage = mediaImages[0];
  const primaryImage =
    firstImage?.url || 'https://placehold.co/120x120/f3f4f6/9ca3af?text=%F0%9F%93%A6';

  return (
    <div className="min-h-screen p-8" style={gradientStyle}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">סל קניות ותשלום</h1>
            <Link href="/products" className="text-cyan-600 hover:text-cyan-700 font-semibold">
              ← חזור למוצרים
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Side - Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-8">
              {/* Customer Details */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <span>פרטים אישיים</span>
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      שם מלא *
                    </label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-cyan-600 transition-all"
                      placeholder="דוד כהן"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      אימייל *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-cyan-600 transition-all"
                      placeholder="david@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      טלפון *
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-cyan-600 transition-all"
                      placeholder="053-375-2633"
                    />
                  </div>
                </div>
              </div>

              {/* Delivery Method */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <span>{formData.deliveryMethod === 'pickup' ? 'נקודת איסוף' : 'כתובת למשלוח'}</span>
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Delivery Method Selection */}
                  <div className="md:col-span-2 mb-2">
                    <label className="block text-sm font-semibold text-gray-900 mb-3">אופן קבלת ההזמנה *</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label
                        className="flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all"
                        style={{
                          border: formData.deliveryMethod === 'pickup' ? '2px solid #0891b2' : '2px solid #e5e7eb',
                          background: formData.deliveryMethod === 'pickup' ? 'rgba(8, 145, 178, 0.05)' : 'white',
                        }}
                      >
                        <input type="radio" name="deliveryMethod" value="pickup" checked={formData.deliveryMethod === 'pickup'} onChange={handleChange} className="w-5 h-5" style={{ accentColor: '#0891b2' }} />
                        <div className="flex-1">
                          <span className="font-bold text-gray-900">איסוף עצמי</span>
                          <p className="text-sm text-green-600 font-medium mt-1">חינם</p>
                        </div>
                      </label>
                      <label
                        className="flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all"
                        style={{
                          border: formData.deliveryMethod === 'shipping' ? '2px solid #0891b2' : '2px solid #e5e7eb',
                          background: formData.deliveryMethod === 'shipping' ? 'rgba(8, 145, 178, 0.05)' : 'white',
                        }}
                      >
                        <input type="radio" name="deliveryMethod" value="shipping" checked={formData.deliveryMethod === 'shipping'} onChange={handleChange} className="w-5 h-5" style={{ accentColor: '#0891b2' }} />
                        <div className="flex-1">
                          <span className="font-bold text-gray-900">משלוח עד הבית</span>
                          <p className="text-sm font-medium mt-1" style={{ color: '#0891b2' }}>החל מ-{SHIPPING_CONSTANTS.BASE_PRICE} ₪ (לפי מרחק)</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Pickup Points */}
                  {formData.deliveryMethod === 'pickup' && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-900 mb-3">בחר נקודת איסוף *</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {PICKUP_POINTS.map((point) => (
                          <label
                            key={point.id}
                            className="flex items-start gap-3 p-4 rounded-xl cursor-pointer transition-all"
                            style={{
                              border: formData.pickupPoint === point.id ? '2px solid #0891b2' : '2px solid #e5e7eb',
                              background: formData.pickupPoint === point.id ? 'rgba(8, 145, 178, 0.05)' : 'white',
                            }}
                          >
                            <input type="radio" name="pickupPoint" value={point.id} checked={formData.pickupPoint === point.id} onChange={handleChange} className="w-5 h-5 mt-0.5" style={{ accentColor: '#0891b2' }} />
                            <div>
                              <span className="font-bold text-gray-900">{point.name}</span>
                              <p className="text-sm text-gray-600 mt-1">{point.address}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Shipping Address Fields */}
                  {formData.deliveryMethod === 'shipping' && (
                    <>
                      <div className="md:col-span-2 p-3 rounded-xl" style={{ background: 'rgba(234, 179, 8, 0.08)', border: '1px solid rgba(234, 179, 8, 0.3)' }}>
                        <p className="text-sm" style={{ color: '#92400e' }}>
                          {"משלוח עד 30 ק\"מ: 250 ₪. עלות המשלוח תחושב אוטומטית לפי הכתובת."}
                        </p>
                      </div>
                      {calculatingShipping && (
                        <div className="md:col-span-2 p-3 rounded-xl flex items-center gap-2" style={{ background: 'rgba(8, 145, 178, 0.05)', border: '1px solid rgba(8, 145, 178, 0.2)' }}>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-cyan-600 border-t-transparent"></div>
                          <p className="text-sm" style={{ color: '#0891b2' }}>מחשב מרחק ועלות משלוח...</p>
                        </div>
                      )}
                      {!calculatingShipping && shippingCalc && (
                        <div className="md:col-span-2 p-3 rounded-xl" style={{ background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                          <p className="text-sm font-semibold" style={{ color: '#065f46' }}>
                            {"עלות משלוח: "}<strong>{shippingCalc.price} ₪</strong>
                          </p>
                        </div>
                      )}
                      {!calculatingShipping && shippingCalcError && (
                        <div className="md:col-span-2 p-3 rounded-xl" style={{ background: 'rgba(234, 179, 8, 0.06)', border: '1px solid rgba(234, 179, 8, 0.3)' }}>
                          <p className="text-sm" style={{ color: '#92400e' }}>{shippingCalcError}</p>
                        </div>
                      )}
                      <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-900 mb-2">כתובת מלאה *</label>
                        <input type="text" name="address" value={formData.address} onChange={handleChange} required className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-cyan-600 transition-all" placeholder="רחוב הרצל 123" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">עיר *</label>
                        <input type="text" name="city" value={formData.city} onChange={handleChange} required className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-cyan-600 transition-all" placeholder="תל אביב" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">מיקוד *</label>
                        <input type="text" name="zipCode" value={formData.zipCode} onChange={handleChange} required className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-cyan-600 transition-all" placeholder="1234567" />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Payment Method - WhatsApp (temporary) */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <span>אופן תשלום</span>
                </h2>

                <div
                  className="flex items-center gap-3 p-4 rounded-xl"
                  style={{
                    border: '2px solid #25D366',
                    background: 'linear-gradient(135deg, rgba(37, 211, 102, 0.08) 0%, rgba(8, 145, 178, 0.05) 100%)',
                  }}
                >
                  <svg className="w-8 h-8 flex-shrink-0" viewBox="0 0 24 24" fill="#25D366">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  <div>
                    <span className="font-bold text-gray-900 block">תשלום דרך וואטסאפ</span>
                    <span className="text-sm text-gray-600">לאחר אישור ההזמנה, תפתח הודעה בוואטסאפ עם פרטי ההזמנה לתיאום התשלום.</span>
                  </div>
                </div>
              </div>

              {/* Terms */}
              <div className="mb-6">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="agreeToTerms"
                    checked={formData.agreeToTerms}
                    onChange={handleChange}
                    className="w-5 h-5 text-cyan-600 rounded mt-1"
                  />
                  <span className="text-sm text-gray-700">
                    אני מאשר/ת את{' '}
                    <Link href="/terms" className="text-cyan-600 hover:underline font-semibold">
                      התנאים וההגבלות
                    </Link>{' '}
                    ואת{' '}
                    <Link href="/privacy" className="text-cyan-600 hover:underline font-semibold">
                      מדיניות הפרטיות
                    </Link>
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={processing || !formData.agreeToTerms}
                className={`w-full py-4 rounded-xl font-bold text-lg transition-all shadow-lg ${
                  processing || !formData.agreeToTerms
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : `bg-gradient-to-r ${theme.buttonGradient} text-white hover:shadow-xl`
                }`}
              >
                {processing ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    מעבד...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    שלח הזמנה בוואטסאפ
                  </span>
                )}
              </button>
            </form>
          </div>

          {/* Right Side - Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-xl p-6 sticky top-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">סיכום הזמנה</h2>

              {/* Product */}
              <div className="mb-6 pb-6 border-b border-gray-200">
                <div className="flex gap-4">
                  <Image
                    src={primaryImage}
                    alt={product.name || 'מוצר'}
                    width={120}
                    height={120}
                    className="w-20 h-20 object-cover rounded-xl"
                  />
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 mb-1">{product.name}</h3>
                    <p className="text-sm text-gray-600">{product.category}</p>
                    <p className="text-sm text-gray-500 mt-1">כמות: 1</p>
                  </div>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-700">
                  <span>מחיר מוצר:</span>
                  <span className="font-semibold">₪{product.price}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>
                    {formData.deliveryMethod === 'shipping'
                      ? `משלוח${shippingCalc ? ` (${shippingCalc.distance} ק"מ)` : ''}`
                      : `איסוף עצמי - ${PICKUP_POINTS.find(p => p.id === formData.pickupPoint)?.name || ''}`}
                  </span>
                  <span className={`font-semibold ${formData.deliveryMethod === 'shipping' ? '' : 'text-green-600'}`}>
                    {formData.deliveryMethod === 'shipping'
                      ? (calculatingShipping ? '...' : `₪${currentShippingPrice}`)
                      : 'חינם'}
                  </span>
                </div>
                {product.originalPrice && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>חסכת:</span>
                    <span className="font-semibold">₪{product.originalPrice - product.price}</span>
                  </div>
                )}
              </div>

              {/* Total */}
              <div className="pt-6 border-t-2 border-gray-300">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xl font-bold text-gray-900">{`סה"כ לתשלום:`}</span>
                  <span className="text-3xl font-bold text-cyan-600">₪{product.price + (formData.deliveryMethod === 'shipping' ? currentShippingPrice : 0)}</span>
                </div>
              </div>

              {/* Security Badge */}
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl text-green-600">S</span>
                  <span className="font-bold text-green-900">תשלום מאובטח</span>
                </div>
                <p className="text-sm text-green-800">התשלום שלך מוגן בהצפנה ברמה הגבוהה ביותר</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
