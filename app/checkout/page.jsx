'use client';

import React, { Suspense, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';

import { useCartContext } from '@/app/context/CartContext';
import { sendOrderToWhatsApp } from '@/lib/whatsappCheckout';
import { getShippingCostForAddress, SHIPPING_CONSTANTS } from '@/lib/shippingCalculator';
import { getAttributionPayloadForOrder } from '@/lib/attributionClient';

const SKIP_REQUIRED_FIELDS = process.env.NEXT_PUBLIC_SKIP_CHECKOUT_VALIDATION === 'true';

function CheckoutFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="text-center text-gray-600">טוען עמוד התשלום…</div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<CheckoutFallback />}>
      <CheckoutClient />
    </Suspense>
  );
}

function CheckoutClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { items, totals, isEmpty, hydrated, clearCart, removeItem } = useCartContext();
  
  // Filter items based on selected items from cart page
  const [selectedProductIds, setSelectedProductIds] = useState(null);
  
  useEffect(() => {
    try {
      const saved = localStorage.getItem('checkout_selected_items');
      if (saved) {
        setSelectedProductIds(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Error loading selected items:', e);
    }
  }, []);

  // Filter to only selected items (or all if no selection saved)
  const checkoutItems = useMemo(() => {
    if (!selectedProductIds || selectedProductIds.length === 0) {
      return items; // Show all items if no selection
    }
    return items.filter(item => selectedProductIds.includes(item.productId));
  }, [items, selectedProductIds]);

  // Recalculate totals for checkout items only
  const checkoutTotals = useMemo(() => {
    const subtotal = checkoutItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalQuantity = checkoutItems.reduce((sum, item) => sum + item.quantity, 0);
    return { subtotal, totalQuantity };
  }, [checkoutItems]);

  const isCartReady = checkoutItems.length > 0;

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [openSections, setOpenSections] = useState({ 1: true, 2: false, 3: false });
  const [expandAll, setExpandAll] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    zipCode: '',
    paymentMethod: 'whatsapp',
    agreeToTerms: false,
    deliveryMethod: 'pickup', // 'pickup' or 'shipping'
    pickupPoint: 'beer_yaakov', // 'beer_yaakov' or 'naale'
  });

  const PICKUP_POINTS = [
    { id: 'beer_yaakov', name: 'באר יעקב', address: 'זבוטינסקי 3, באר יעקב' },
    { id: 'naale', name: 'נעלה', address: 'לשם 10, נעלה' },
  ];

  // Shipping calculation state
  const [shippingCalc, setShippingCalc] = useState(null); // { price, distance, nearestPointName, ... }
  const [calculatingShipping, setCalculatingShipping] = useState(false);
  const [shippingCalcError, setShippingCalcError] = useState('');

  const currentShippingPrice = shippingCalc?.price || SHIPPING_CONSTANTS.BASE_PRICE;

  const [fieldErrors, setFieldErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});
  const [autoCouponChecked, setAutoCouponChecked] = useState(false);
  const markFieldTouched = useCallback((fieldName) => {
    setTouchedFields((prev) => (prev[fieldName] ? prev : { ...prev, [fieldName]: true }));
  }, []);
  const isFieldValid = useCallback(
    (fieldName) => {
      if (!touchedFields[fieldName]) return false;
      if (fieldName === 'paymentMethod') {
        return !!formData.paymentMethod && !fieldErrors.paymentMethod;
      }
      if (fieldName === 'agreeToTerms') {
        return formData.agreeToTerms && !fieldErrors.agreeToTerms;
      }
      const value = formData[fieldName];
      if (typeof value === 'string') {
        return Boolean(value.trim()) && !fieldErrors[fieldName];
      }
      return Boolean(value) && !fieldErrors[fieldName];
    },
    [fieldErrors, formData, touchedFields],
  );
  const getInputBorderClass = useCallback(
    (fieldName) => {
      if (fieldErrors[fieldName]) return 'border-red-400 focus:border-red-500';
      if (isFieldValid(fieldName)) return 'border-green-500 focus:border-green-600';
      return 'border-gray-300 focus:border-cyan-600';
    },
    [fieldErrors, isFieldValid],
  );
  const renderSuccessIcon = (fieldName) =>
    isFieldValid(fieldName) ? (
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600">
        <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
        <span className="sr-only">שדה מולא בהצלחה</span>
      </span>
    ) : null;

  const toggleSection = (section) => {
    if (expandAll) return; // Don't toggle if expand all is active
    setOpenSections((prev) => ({
      1: section === 1,
      2: section === 2,
      3: section === 3,
    }));
  };

  const toggleExpandAll = () => {
    setExpandAll(!expandAll);
    if (!expandAll) {
      setOpenSections({ 1: true, 2: true, 3: true });
    } else {
      setOpenSections({ 1: true, 2: false, 3: false });
    }
  };
  const gradientStyle = useMemo(
    () => ({
      background:
        'linear-gradient(135deg, #1e3a8a 0%, #0891b2 50%, #06b6d4 100%)',
    }),
    [],
  );

  const steps = [
    { number: 1, title: 'פרטים אישיים', icon: 'user' },
    { number: 2, title: 'כתובת משלוח', icon: 'location' },
    { number: 3, title: 'אמצעי תשלום', icon: 'payment' },
    { number: 4, title: 'סיכום ואישור', icon: 'check' },
  ];

  const validators = useMemo(
    () => ({
      fullName: (value) =>
        !value?.trim()
          ? 'נא למלא שם מלא'
          : value.trim().split(/\s+/).length < 2
            ? 'יש להזין שם פרטי ומשפחה'
            : '',
      email: (value) =>
        !value?.trim()
          ? 'נא להזין כתובת אימייל'
          : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
            ? 'כתובת האימייל אינה תקינה'
            : '',
      phone: (value) => {
        if (!value?.trim()) return 'נא להזין מספר טלפון';
        const normalized = value.replace(/[\s-]/g, '');
        const phoneRegex = /^(0\d{9}|\+972\d{9})$/;
        return phoneRegex.test(normalized) ? '' : 'מספר הטלפון חייב להיות בפורמט ישראלי תקין';
      },
      address: (value) => (!value?.trim() ? 'נא להזין כתובת מלאה' : ''),
      city: (value) => (!value?.trim() ? 'נא להזין עיר' : ''),
      zipCode: (value) =>
        !value?.trim()
          ? 'נא להזין מיקוד'
          : !/^\d{5,7}$/.test(value.trim())
            ? 'המיקוד חייב להכיל 5-7 ספרות'
            : '',
      paymentMethod: (value) => (!value ? 'נא לבחור אמצעי תשלום' : ''),
    }),
    [],
  );

  const stepFields = useMemo(
    () => ({
      1: ['fullName', 'email', 'phone'],
      2: formData.deliveryMethod === 'shipping' ? ['address', 'city', 'zipCode'] : [],
      3: ['paymentMethod'],
      4: [],
    }),
    [formData.deliveryMethod],
  );

  const validateField = useCallback(
    (fieldName, value) => {
      markFieldTouched(fieldName);
      const validator = validators[fieldName];
      if (!validator) return '';
      const message = validator(value);
      setFieldErrors((prev) => {
        const next = { ...prev };
        if (message) {
          next[fieldName] = message;
        } else {
          delete next[fieldName];
        }
        return next;
      });
      return message;
    },
    [markFieldTouched, validators],
  );

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
      setError('');
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError('');
    }
  };

  const validateStep = useCallback(
    (stepToValidate = currentStep) => {
      const fields = stepFields[stepToValidate] || [];
      let hasErrors = false;

      fields.forEach((field) => {
        const message = validateField(field, formData[field]);
        if (message) hasErrors = true;
      });

      if (stepToValidate === 4) {
        if (!formData.agreeToTerms) {
          setFieldErrors((prev) => ({ ...prev, agreeToTerms: 'יש לאשר את התנאים לפני התשלום' }));
          hasErrors = true;
        } else {
          setFieldErrors((prev) => {
            const next = { ...prev };
            delete next.agreeToTerms;
            return next;
          });
        }
      }

      if (hasErrors) {
        setError('נא להשלים את כל השדות המסומנים לפני המעבר לשלב הבא');
      } else {
        setError('');
      }

      return !hasErrors;
    },
    [currentStep, formData, stepFields, validateField],
  );

  // מיפוי שמות שדות לעברית
  const fieldLabels = useMemo(() => ({
    fullName: 'שם מלא',
    email: 'אימייל',
    phone: 'טלפון',
    address: 'כתובת',
    city: 'עיר',
    zipCode: 'מיקוד',
    paymentMethod: 'אמצעי תשלום',
    agreeToTerms: 'אישור תנאים',
  }), []);

  const validateAllSteps = useCallback(() => {
    let valid = true;
    let firstInvalidStep = null;
    const missingFields = [];

    [1, 2, 3, 4].forEach((step) => {
      const fields = stepFields[step] || [];
      fields.forEach((field) => {
        const message = validateField(field, formData[field]);
        if (message) {
          valid = false;
          if (!firstInvalidStep) firstInvalidStep = step;
          missingFields.push(fieldLabels[field] || field);
        }
      });

      // בדיקת אישור תנאים בשלב 4
      if (step === 4 && !formData.agreeToTerms) {
        setFieldErrors((prev) => ({ ...prev, agreeToTerms: 'יש לאשר את התנאים לפני התשלום' }));
        valid = false;
        if (!firstInvalidStep) firstInvalidStep = 4;
        missingFields.push('אישור תנאים');
      }
    });

    if (!isCartReady) {
      setError('העגלה ריקה או שאינה נטענה כראוי');
      return false;
    }

    if (!valid && missingFields.length > 0) {
      // הצגת הודעה ברורה עם השדות החסרים
      const uniqueFields = [...new Set(missingFields)];
      if (uniqueFields.length <= 3) {
        setError(`נא להשלים: ${uniqueFields.join(', ')}`);
      } else {
        setError(`נא להשלים ${uniqueFields.length} שדות חסרים`);
      }

      // מעבר לשלב עם השגיאה הראשונה
      if (firstInvalidStep && firstInvalidStep !== currentStep) {
        setCurrentStep(firstInvalidStep);
      }

      // גלילה למעלה כדי לראות את ההודעה
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    return valid;
  }, [isCartReady, validateField, formData, stepFields, fieldLabels, currentStep]);

  const handleNext = () => {
    if (validateStep()) {
      nextStep();
    }
  };

  const handleFieldChange = (event) => {
    const { name, value, type, checked } = event.target;
    const fieldValue = type === 'checkbox' ? checked : value;
    setFormData((prev) => ({
      ...prev,
      [name]: fieldValue,
    }));
    if (fieldErrors[name] || touchedFields[name]) {
      validateField(name, fieldValue);
    }
  };

  useEffect(() => {
    if (!hydrated) return;
    if (isEmpty) {
      router.replace('/cart');
      return;
    }

    async function loadUser() {
      setLoading(true);
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          setFormData((prev) => ({
            ...prev,
            fullName: data.user.fullName || '',
            email: data.user.email || '',
            phone: data.user.phone || '',
            // טעינת פרטי משלוח שמורים (אם קיימים)
            address: data.user.shippingAddress || prev.address || '',
            city: data.user.shippingCity || prev.city || '',
            zipCode: data.user.shippingZipCode || prev.zipCode || '',
          }));
        } else if (res.status === 401) {
          router.replace('/login?redirect=/checkout');
        }
      } catch (err) {
        console.error('Failed to load user', err);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [hydrated, isEmpty, router]);

  const handleApplyCoupon = useCallback(
    async (codeOverride) => {
      const code = (codeOverride ?? couponInput).trim();
      if (!code) {
        setCouponError('נא להזין קוד קופון');
        return;
      }

      if (codeOverride) {
        setCouponInput(code);
      }

      setApplyingCoupon(true);
      setCouponError('');

      try {
        const res = await fetch('/api/coupons/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });

        if (!res.ok) {
          setAppliedCoupon(null);
          const data = await res.json().catch(() => ({}));
          throw new Error(
            data.error === 'coupon_not_found'
              ? 'קופון לא נמצא או אינו פעיל'
              : 'אירעה שגיאה באימות הקופון',
          );
        }

        const data = await res.json();
        setAppliedCoupon(data.coupon);
        setCouponError('');
      } catch (err) {
        setCouponError(err.message || 'קופון לא תקף');
      } finally {
        setApplyingCoupon(false);
      }
    },
    [couponInput],
  );

  useEffect(() => {
    if (!hydrated) return;
    if (autoCouponChecked || appliedCoupon) return;

    let cancelled = false;

    async function applyAutoCoupon() {
      try {
        // First try API (reads from cookie)
        const res = await fetch('/api/referral/auto-coupon', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          const autoCode = data?.coupon;
          if (autoCode && !cancelled) {
            setCouponInput(autoCode);
            await handleApplyCoupon(autoCode);
            return;
          }
        }
        
        // Fallback: read from localStorage (referrerId)
        if (!cancelled) {
          try {
            const storedRef = localStorage.getItem('referrerId');
            if (storedRef) {
              setCouponInput(storedRef);
              await handleApplyCoupon(storedRef);
            }
          } catch (e) {
            console.log('localStorage not available');
          }
        }
      } catch (error) {
        console.error('Auto coupon fetch failed:', error);
      } finally {
        if (!cancelled) {
          setAutoCouponChecked(true);
        }
      }
    }

    applyAutoCoupon();

    return () => {
      cancelled = true;
    };
  }, [hydrated, appliedCoupon, autoCouponChecked, handleApplyCoupon]);

  useEffect(() => {
    if (!hydrated) return;
    const couponParam = searchParams?.get('coupon');
    if (couponParam && !appliedCoupon) {
      setCouponInput(couponParam);
      handleApplyCoupon(couponParam);
    }
  }, [appliedCoupon, handleApplyCoupon, hydrated, searchParams]);

  const discountPercent = appliedCoupon?.discountPercent || 0;
  const discountAmount = useMemo(() => {
    if (!checkoutTotals?.subtotal || !discountPercent) return 0;
    return Number(((checkoutTotals.subtotal * discountPercent) / 100).toFixed(2));
  }, [checkoutTotals?.subtotal, discountPercent]);

  const grandTotal = useMemo(() => {
    if (!checkoutTotals?.subtotal) return 0;
    const baseTotal = Math.max(0, checkoutTotals.subtotal - discountAmount);
    if (formData.deliveryMethod === 'shipping') {
      return baseTotal + currentShippingPrice;
    }
    return baseTotal;
  }, [checkoutTotals?.subtotal, discountAmount, formData.deliveryMethod, currentShippingPrice]);

  // Calculate shipping cost when address and city change
  const calcShippingTimeoutRef = React.useRef(null);
  useEffect(() => {
    if (formData.deliveryMethod !== 'shipping') return;
    if (!formData.address?.trim() || !formData.city?.trim()) {
      setShippingCalc(null);
      setShippingCalcError('');
      return;
    }
    // Debounce: wait 1s after user stops typing
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

  const handleChange = (event) => {
    handleFieldChange(event);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (processing) return;

    if (!SKIP_REQUIRED_FIELDS) {
      const canSubmit = validateAllSteps();
      if (!canSubmit) {
        // הודעת שגיאה כבר הוצגה ב-validateAllSteps
        return;
      }
    }

    setProcessing(true);
    setError('');

    try {
      const attribution = getAttributionPayloadForOrder(searchParams);
      const payload = {
        items: checkoutItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        customer: {
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          zipCode: formData.zipCode,
        },
        paymentMethod: 'whatsapp',
        deliveryMethod: formData.deliveryMethod,
        pickupPoint: formData.deliveryMethod === 'pickup' ? formData.pickupPoint : null,
        shippingCost: formData.deliveryMethod === 'shipping' ? currentShippingPrice : 0,
        coupon: appliedCoupon
          ? {
              code: appliedCoupon.code,
              agentId: appliedCoupon.agentId,
            }
          : null,
        ...(attribution ? { attribution } : {}),
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'שגיאה ביצירת הזמנה');
      }

      const data = await res.json();
      if (!data?.orderId) {
        throw new Error('שגיאה בקבלת מספר הזמנה');
      }

      // --- זמני: הפניה לוואטסאפ במקום תשלום באשראי ---
      sendOrderToWhatsApp({
        orderId: data.orderId,
        items: checkoutItems.map((item) => ({
          name: item.name || item.productName,
          quantity: item.quantity,
          price: item.price,
        })),
        customer: {
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          zipCode: formData.zipCode,
        },
        totals: {
          subtotal: checkoutTotals.subtotal,
          discount: discountAmount,
          shipping: formData.deliveryMethod === 'shipping' ? currentShippingPrice : 0,
          total: grandTotal,
        },
        coupon: appliedCoupon ? { code: appliedCoupon.code, discountPercent: appliedCoupon.discountPercent } : null,
        deliveryMethod: formData.deliveryMethod,
        pickupPoint: formData.deliveryMethod === 'pickup'
          ? PICKUP_POINTS.find(p => p.id === formData.pickupPoint)
          : null,
        shippingCost: formData.deliveryMethod === 'shipping' ? currentShippingPrice : 0,
        shippingDistance: shippingCalc?.distance || null,
      });

      clearCart();
      window.location.href = `/checkout/success?orderId=${data.orderId}`;
    } catch (err) {
      console.error('Checkout error', err);
      setError(err.message || 'שגיאה בביצוע ההזמנה');
    } finally {
      setProcessing(false);
    }
  };

  if (!hydrated || loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div
          className="bg-white rounded-xl p-8"
          style={{
            border: '2px solid transparent',
            backgroundImage:
              'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)',
            backgroundOrigin: 'border-box',
            backgroundClip: 'padding-box, border-box',
            boxShadow: '0 4px 20px rgba(8, 145, 178, 0.15)',
          }}
        >
          <div
            className="animate-spin rounded-full h-12 w-12 mx-auto"
            style={{
              border: '4px solid rgba(8, 145, 178, 0.2)',
              borderTopColor: '#0891b2',
            }}
          ></div>
          <p className="text-gray-600 mt-4 text-center font-medium">טוען...</p>
        </div>
      </div>
    );
  }

  // אם הסל ריק - חזור לסל
  if (isEmpty) return null;

  return (
    <div className="min-h-screen bg-white py-6">
      <div className="max-w-6xl mx-auto px-4">
        {/* Back to Cart Button - Top Left */}
        <div className="mb-4">
          <Link
            href="/cart"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all shadow-md"
            style={{
              background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
              color: 'white',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background =
                'linear-gradient(135deg, #0891b2 0%, #1e3a8a 100%)';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(8, 145, 178, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background =
                'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
            }}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            חזרה לסל
          </Link>
        </div>

        <div
          className="bg-white rounded-xl p-4 sm:p-6 mb-6"
          style={{
            border: '2px solid transparent',
            backgroundImage:
              'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)',
            backgroundOrigin: 'border-box',
            backgroundClip: 'padding-box, border-box',
            boxShadow: '0 4px 20px rgba(8, 145, 178, 0.15)',
          }}
        >
          <div className="mb-4">
            <h1
              className="text-3xl font-bold mb-2"
              style={{
                background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              אימות ותשלום
            </h1>
            <div
              className="h-1 w-24 rounded-full mb-3"
              style={{ background: 'linear-gradient(90deg, #1e3a8a 0%, #0891b2 100%)' }}
            />
            <div className="flex items-center gap-3 flex-wrap">
              <div
                className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(30, 58, 138, 0.1) 0%, rgba(8, 145, 178, 0.1) 100%)',
                  color: '#1e3a8a',
                  border: '1px solid rgba(8, 145, 178, 0.3)',
                }}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                    clipRule="evenodd"
                  />
                </svg>
                תשלום מאובטח SSL
              </div>
              <div
                className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(30, 58, 138, 0.1) 0%, rgba(8, 145, 178, 0.1) 100%)',
                  color: '#1e3a8a',
                  border: '1px solid rgba(8, 145, 178, 0.3)',
                }}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                מאומת בטוח
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-xl p-3 sm:p-4 lg:p-6 lg:col-span-2 space-y-4 sm:space-y-6 order-2 lg:order-1"
            style={{
              border: '2px solid transparent',
              backgroundImage:
                'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)',
              backgroundOrigin: 'border-box',
              backgroundClip: 'padding-box, border-box',
              boxShadow: '0 4px 20px rgba(8, 145, 178, 0.15)',
            }}
          >
            {/* Expand All Button */}
            <div className="flex justify-end mb-4">
              <button
                type="button"
                onClick={toggleExpandAll}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all"
                style={{
                  backgroundColor: expandAll
                    ? 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)'
                    : 'white',
                  border: '2px solid #1e3a8a',
                  color: expandAll ? 'white' : '#1e3a8a',
                  background: expandAll
                    ? 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)'
                    : 'white',
                }}
              >
                {expandAll ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 15l7-7 7 7"
                      />
                    </svg>
                    כווץ הכל
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                    פתח הכל
                  </>
                )}
              </button>
            </div>

            <section
              className="border-2 rounded-xl p-4"
              style={{
                borderColor: openSections[1] || expandAll ? '#0891b2' : '#e5e7eb',
                background:
                  openSections[1] || expandAll
                    ? 'linear-gradient(135deg, rgba(30, 58, 138, 0.02) 0%, rgba(8, 145, 178, 0.02) 100%)'
                    : 'white',
              }}
            >
              <button
                type="button"
                onClick={() => toggleSection(1)}
                className="w-full flex items-center justify-between mb-4 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{
                      background:
                        openSections[1] || expandAll
                          ? 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)'
                          : '#e5e7eb',
                    }}
                  >
                    <svg
                      className="w-5 h-5"
                      style={{ color: openSections[1] || expandAll ? 'white' : '#9ca3af' }}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <h2
                    className="text-xl font-bold"
                    style={{
                      background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    פרטים אישיים
                  </h2>
                </div>
                <svg
                  className="w-6 h-6 transition-transform duration-300"
                  style={{
                    transform: openSections[1] || expandAll ? 'rotate(180deg)' : 'rotate(0deg)',
                    color: '#1e3a8a',
                  }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {(openSections[1] || expandAll) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2 relative">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      שם מלא *
                    </label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      onBlur={(e) => validateField(e.target.name, e.target.value)}
                      required={!SKIP_REQUIRED_FIELDS}
                      className={`w-full px-4 pr-12 py-3 border-2 rounded-xl focus:outline-none ${getInputBorderClass('fullName')}`}
                      placeholder="דני ישראלי"
                    />
                    {renderSuccessIcon('fullName')}
                    {fieldErrors.fullName && (
                      <p className="text-xs text-red-600 mt-1">{fieldErrors.fullName}</p>
                    )}
                  </div>
                  <div className="relative">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      אימייל *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      onBlur={(e) => validateField(e.target.name, e.target.value)}
                      required
                      className={`w-full px-4 pr-12 py-3 border-2 rounded-xl focus:outline-none ${getInputBorderClass('email')}`}
                      placeholder="you@example.com"
                    />
                    {renderSuccessIcon('email')}
                    {fieldErrors.email && (
                      <p className="text-xs text-red-600 mt-1">{fieldErrors.email}</p>
                    )}
                  </div>
                  <div className="relative">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      טלפון *
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      onBlur={(e) => validateField(e.target.name, e.target.value)}
                      required
                      className={`w-full px-4 pr-12 py-3 border-2 rounded-xl focus:outline-none ${getInputBorderClass('phone')}`}
                      placeholder="053-375-2633"
                    />
                    {renderSuccessIcon('phone')}
                    {fieldErrors.phone && (
                      <p className="text-xs text-red-600 mt-1">{fieldErrors.phone}</p>
                    )}
                  </div>
                </div>
              )}
            </section>

            <section
              className="border-2 rounded-xl p-4"
              style={{
                borderColor: openSections[2] || expandAll ? '#0891b2' : '#e5e7eb',
                background:
                  openSections[2] || expandAll
                    ? 'linear-gradient(135deg, rgba(30, 58, 138, 0.02) 0%, rgba(8, 145, 178, 0.02) 100%)'
                    : 'white',
              }}
            >
              <button
                type="button"
                onClick={() => toggleSection(2)}
                className="w-full flex items-center justify-between mb-4 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{
                      background:
                        openSections[2] || expandAll
                          ? 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)'
                          : '#e5e7eb',
                    }}
                  >
                    <svg
                      className="w-5 h-5"
                      style={{ color: openSections[2] || expandAll ? 'white' : '#9ca3af' }}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                    </svg>
                  </div>
                  <h2
                    className="text-xl font-bold"
                    style={{
                      background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    {formData.deliveryMethod === 'pickup' ? 'נקודת איסוף' : 'כתובת למשלוח'}
                  </h2>
                </div>
                <svg
                  className="w-6 h-6 transition-transform duration-300"
                  style={{
                    transform: openSections[2] || expandAll ? 'rotate(180deg)' : 'rotate(0deg)',
                    color: '#1e3a8a',
                  }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {(openSections[2] || expandAll) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Delivery Method Selection */}
                  <div className="md:col-span-2 mb-4">
                    <label className="block text-sm font-semibold text-gray-900 mb-3">
                      אופן קבלת ההזמנה *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Pickup Option */}
                      <label
                        className="flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all"
                        style={{
                          border: formData.deliveryMethod === 'pickup' 
                            ? '2px solid #0891b2' 
                            : '2px solid #e5e7eb',
                          background: formData.deliveryMethod === 'pickup'
                            ? 'linear-gradient(135deg, rgba(30, 58, 138, 0.05) 0%, rgba(8, 145, 178, 0.05) 100%)'
                            : 'white',
                        }}
                      >
                        <input
                          type="radio"
                          name="deliveryMethod"
                          value="pickup"
                          checked={formData.deliveryMethod === 'pickup'}
                          onChange={handleChange}
                          className="w-5 h-5"
                          style={{ accentColor: '#0891b2' }}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <svg className="w-5 h-5" style={{ color: '#1e3a8a' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            <span className="font-bold" style={{ color: '#1e3a8a' }}>איסוף עצמי</span>
                          </div>
                          <p className="text-sm text-green-600 font-medium mt-1">חינם</p>
                        </div>
                      </label>

                      {/* Shipping Option - always available */}
                      <label
                        className="flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all"
                        style={{
                          border: formData.deliveryMethod === 'shipping' 
                            ? '2px solid #0891b2' 
                            : '2px solid #e5e7eb',
                          background: formData.deliveryMethod === 'shipping'
                            ? 'linear-gradient(135deg, rgba(30, 58, 138, 0.05) 0%, rgba(8, 145, 178, 0.05) 100%)'
                            : 'white',
                        }}
                      >
                        <input
                          type="radio"
                          name="deliveryMethod"
                          value="shipping"
                          checked={formData.deliveryMethod === 'shipping'}
                          onChange={handleChange}
                          className="w-5 h-5"
                          style={{ accentColor: '#0891b2' }}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <svg className="w-5 h-5" style={{ color: '#1e3a8a' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                            </svg>
                            <span className="font-bold" style={{ color: '#1e3a8a' }}>משלוח עד הבית</span>
                          </div>
                          <p className="text-sm font-medium mt-1" style={{ color: '#0891b2' }}>
                            החל מ-{SHIPPING_CONSTANTS.BASE_PRICE} ₪ (לפי מרחק)
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Pickup Points - shown when pickup is selected */}
                  {formData.deliveryMethod === 'pickup' && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-900 mb-3">
                        בחר נקודת איסוף *
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {PICKUP_POINTS.map((point) => (
                          <label
                            key={point.id}
                            className="flex items-start gap-3 p-4 rounded-xl cursor-pointer transition-all"
                            style={{
                              border: formData.pickupPoint === point.id
                                ? '2px solid #0891b2'
                                : '2px solid #e5e7eb',
                              background: formData.pickupPoint === point.id
                                ? 'linear-gradient(135deg, rgba(30, 58, 138, 0.05) 0%, rgba(8, 145, 178, 0.05) 100%)'
                                : 'white',
                            }}
                          >
                            <input
                              type="radio"
                              name="pickupPoint"
                              value={point.id}
                              checked={formData.pickupPoint === point.id}
                              onChange={handleChange}
                              className="w-5 h-5 mt-0.5"
                              style={{ accentColor: '#0891b2' }}
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4" style={{ color: '#1e3a8a' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span className="font-bold" style={{ color: '#1e3a8a' }}>{point.name}</span>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">{point.address}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Shipping Address Fields - shown only when shipping is selected */}
                  {formData.deliveryMethod === 'shipping' && (
                    <>
                      <div className="md:col-span-2 p-3 rounded-xl" style={{ background: 'rgba(234, 179, 8, 0.08)', border: '1px solid rgba(234, 179, 8, 0.3)' }}>
                        <p className="text-sm" style={{ color: '#92400e' }}>
                          {"משלוח עד 30 ק\"מ: 250 ₪. עלות המשלוח תחושב אוטומטית לפי הכתובת."}
                        </p>
                      </div>

                      {/* Shipping calculation result */}
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

                      <div className="md:col-span-2 relative">
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                          כתובת מלאה *
                        </label>
                        <input
                          type="text"
                          name="address"
                          value={formData.address}
                          onChange={handleChange}
                          onBlur={(e) => validateField(e.target.name, e.target.value)}
                          required
                          className={`w-full px-4 pr-12 py-3 border-2 rounded-xl focus:outline-none ${getInputBorderClass('address')}`}
                          placeholder="רחוב הרצל 123"
                        />
                        {renderSuccessIcon('address')}
                        {fieldErrors.address && (
                          <p className="text-xs text-red-600 mt-1">{fieldErrors.address}</p>
                        )}
                      </div>
                      <div className="relative">
                        <label className="block text-sm font-semibold text-gray-900 mb-2">עיר *</label>
                        <input
                          type="text"
                          name="city"
                          value={formData.city}
                          onChange={handleChange}
                          onBlur={(e) => validateField(e.target.name, e.target.value)}
                          required
                          className={`w-full px-4 pr-12 py-3 border-2 rounded-xl focus:outline-none ${getInputBorderClass('city')}`}
                          placeholder="תל אביב"
                        />
                        {renderSuccessIcon('city')}
                        {fieldErrors.city && (
                          <p className="text-xs text-red-600 mt-1">{fieldErrors.city}</p>
                        )}
                      </div>
                      <div className="relative">
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                          מיקוד *
                        </label>
                        <input
                          type="text"
                          name="zipCode"
                          value={formData.zipCode}
                          onChange={handleChange}
                          onBlur={(e) => validateField(e.target.name, e.target.value)}
                          required
                          className={`w-full px-4 pr-12 py-3 border-2 rounded-xl focus:outline-none ${getInputBorderClass('zipCode')}`}
                          placeholder="1234567"
                        />
                        {renderSuccessIcon('zipCode')}
                        {fieldErrors.zipCode && (
                          <p className="text-xs text-red-600 mt-1">{fieldErrors.zipCode}</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </section>

            <section
              className="border-2 rounded-xl p-4"
              style={{
                borderColor: openSections[3] || expandAll ? '#0891b2' : '#e5e7eb',
                background:
                  openSections[3] || expandAll
                    ? 'linear-gradient(135deg, rgba(30, 58, 138, 0.02) 0%, rgba(8, 145, 178, 0.02) 100%)'
                    : 'white',
              }}
            >
              <button
                type="button"
                onClick={() => toggleSection(3)}
                className="w-full flex items-center justify-between mb-4 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{
                      background:
                        openSections[3] || expandAll
                          ? 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)'
                          : '#e5e7eb',
                    }}
                  >
                    <svg
                      className="w-5 h-5"
                      style={{ color: openSections[3] || expandAll ? 'white' : '#9ca3af' }}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                      <path
                        fillRule="evenodd"
                        d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <h2
                    className="text-xl font-bold"
                    style={{
                      background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    אופן תשלום
                  </h2>
                </div>
                <svg
                  className="w-6 h-6 transition-transform duration-300"
                  style={{
                    transform: openSections[3] || expandAll ? 'rotate(180deg)' : 'rotate(0deg)',
                    color: '#1e3a8a',
                  }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {(openSections[3] || expandAll) && (
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
              )}
            </section>

            <section>
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  name="agreeToTerms"
                  checked={formData.agreeToTerms}
                  onChange={handleChange}
                  className="w-5 h-5 text-cyan-600 rounded"
                />
                <span className="text-sm text-gray-700">
                  אני מאשר/ת את{' '}
                  <Link href="/terms" className="underline hover:text-gray-700">
                    תנאי השימוש
                  </Link>
                  {' '}
                  ו
                  <Link href="/privacy" className="underline hover:text-gray-700">
                    מדיניות הנוגעת לפרטיות
                  </Link>
                </span>
              </label>
              {fieldErrors.agreeToTerms && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.agreeToTerms}</p>
              )}
            </section>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={processing || !formData.agreeToTerms}
              className="w-full py-4 rounded-xl font-bold text-lg transition shadow-lg"
              style={{
                background:
                  processing || !formData.agreeToTerms
                    ? '#d1d5db'
                    : 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
                color: processing || !formData.agreeToTerms ? '#6b7280' : 'white',
                cursor: processing || !formData.agreeToTerms ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={(e) => {
                if (!processing && formData.agreeToTerms) {
                  e.currentTarget.style.background =
                    'linear-gradient(135deg, #0891b2 0%, #1e3a8a 100%)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 10px 25px rgba(8, 145, 178, 0.3)';
                }
              }}
              onMouseLeave={(e) => {
                if (!processing && formData.agreeToTerms) {
                  e.currentTarget.style.background =
                    'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(8, 145, 178, 0.25)';
                }
              }}
            >
              {processing ? (
                <span className="flex items-center justify-center gap-2">
                  <span
                    className="h-5 w-5 rounded-full border-2 border-white/40 border-t-white animate-spin"
                    aria-hidden="true"
                  />
                  מעבד את ההזמנה…
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

            {processing ? (
              <div className="mt-3 flex items-center justify-center gap-2 text-sm text-gray-600" role="status">
                <svg
                  className="h-4 w-4 text-gray-400 animate-pulse"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                מפנים אותך לוואטסאפ, אנא המתן לרגע…
              </div>
            ) : null}
          </form>

          <aside
            className="bg-white rounded-xl p-4 sm:p-6 space-y-6 lg:sticky lg:top-6 h-fit order-1 lg:order-2"
            style={{
              border: '2px solid transparent',
              backgroundImage:
                'linear-gradient(white, white), linear-gradient(135deg, #1e3a8a, #0891b2)',
              backgroundOrigin: 'border-box',
              backgroundClip: 'padding-box, border-box',
              boxShadow: '0 4px 20px rgba(8, 145, 178, 0.15)',
            }}
          >
            <div className="mb-4">
              <h2
                className="text-2xl font-bold mb-1"
                style={{
                  background: 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                סיכום הזמנה
              </h2>
              <div
                className="h-1 w-20 rounded-full mb-2"
                style={{ background: 'linear-gradient(90deg, #1e3a8a 0%, #0891b2 100%)' }}
              />
              <div
                className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium inline-flex"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(30, 58, 138, 0.1) 0%, rgba(8, 145, 178, 0.1) 100%)',
                  color: '#1e3a8a',
                  border: '1px solid rgba(8, 145, 178, 0.3)',
                }}
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                    clipRule="evenodd"
                  />
                </svg>
                מאובטח
              </div>
            </div>
            <div className="space-y-4">
              {checkoutItems.map((item) => (
                <div key={item.productId} className="flex gap-4 items-center">
                  <Image
                    src={item.image || 'https://placehold.co/80x80/f3f4f6/9ca3af?text=%F0%9F%93%A6'}
                    alt={item.name || 'פריט בסל'}
                    width={80}
                    height={80}
                    className="w-16 h-16 object-cover rounded-xl"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{item.name}</p>
                    <p className="text-sm text-gray-500">כמות: {item.quantity}</p>
                  </div>
                  <div className="text-sm font-semibold text-cyan-600">
                    ₪{(item.price * item.quantity).toLocaleString('he-IL')}
                  </div>
                </div>
              ))}
            </div>
            {/* Coupon Input Section */}
            <div className="border-t pt-4 mb-4">
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                קוד קופון
              </label>
              {appliedCoupon ? (
                <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="font-semibold text-green-700">{appliedCoupon.code}</span>
                    <span className="text-sm text-green-600">({appliedCoupon.discountPercent}% הנחה)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAppliedCoupon(null)}
                    className="text-gray-500 hover:text-red-500 transition"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    placeholder="הזן קוד קופון"
                    className="flex-1 px-4 py-2 border-2 rounded-xl focus:outline-none focus:border-cyan-500 border-gray-300 min-w-0"
                  />
                  <button
                    type="button"
                    onClick={() => handleApplyCoupon()}
                    disabled={applyingCoupon || !couponInput.trim()}
                    className="px-4 py-2 rounded-xl font-semibold text-white transition whitespace-nowrap flex-shrink-0"
                    style={{
                      background: applyingCoupon || !couponInput.trim() ? '#d1d5db' : 'linear-gradient(135deg, #1e3a8a 0%, #0891b2 100%)',
                      cursor: applyingCoupon || !couponInput.trim() ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {applyingCoupon ? '...' : 'החל'}
                  </button>
                </div>
              )}
              {couponError && (
                <p className="text-xs text-red-600 mt-1">{couponError}</p>
              )}
            </div>

            <div className="border-t pt-4 space-y-2 text-gray-700">
              <div className="flex justify-between">
                <span>סכום ביניים</span>
                <span className="font-semibold">₪{checkoutTotals.subtotal.toLocaleString('he-IL')}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-green-600 font-semibold">
                  <span>הנחת קופון ({discountPercent}%)</span>
                  <span>-₪{discountAmount.toLocaleString('he-IL')}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>
                  {formData.deliveryMethod === 'shipping'
                    ? `משלוח${shippingCalc ? ` (${shippingCalc.distance} ק"מ)` : ''}`
                    : `איסוף עצמי - ${PICKUP_POINTS.find(p => p.id === formData.pickupPoint)?.name || ''}`}
                </span>
                <span className={`font-semibold ${formData.deliveryMethod === 'shipping' ? '' : 'text-green-600'}`}>
                  {formData.deliveryMethod === 'shipping'
                    ? (calculatingShipping ? '...' : `₪${currentShippingPrice.toLocaleString('he-IL')}`)
                    : 'חינם'}
                </span>
              </div>
              <div className="flex justify-between text-lg font-bold text-gray-900 border-t pt-3">
                <span>{`סה"כ לתשלום`}</span>
                <span>₪{grandTotal.toLocaleString('he-IL')}</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
