/**
 * Client-side coupon validation helper
 * Used by both Cart and Checkout pages for consistent behavior
 */

/**
 * Validate a coupon code against the API
 * @param {string} code - The coupon code to validate
 * @returns {Promise<{ok: boolean, coupon?: object, error?: string}>}
 */
export async function validateCouponClient(code) {
  const trimmedCode = (code || '').trim();

  if (!trimmedCode) {
    return { ok: false, error: 'נא להזין קוד קופון' };
  }

  try {
    const res = await fetch('/api/coupons/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: trimmedCode }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const errorMessage =
        data.error === 'coupon_not_found'
          ? 'קופון לא נמצא או אינו פעיל'
          : data.error === 'code_required'
            ? 'נא להזין קוד קופון'
            : 'אירעה שגיאה באימות הקופון';

      return { ok: false, error: errorMessage };
    }

    const data = await res.json();

    if (!data.ok || !data.coupon) {
      return { ok: false, error: 'קופון לא תקף' };
    }

    // Return normalized coupon object
    return {
      ok: true,
      coupon: {
        code: data.coupon.code,
        discountPercent: data.coupon.discountPercent || 0,
        commissionPercent: data.coupon.commissionPercent || 0,
        agentId: data.coupon.agentId || null,
        agentName: data.coupon.agentName || null,
        status: data.coupon.status || 'active',
      },
    };
  } catch (err) {
    console.error('Coupon validation error:', err);
    return { ok: false, error: 'שגיאת רשת - נסה שוב' };
  }
}

/**
 * Calculate discount amount from subtotal and discount percent
 * @param {number} subtotal
 * @param {number} discountPercent
 * @returns {number}
 */
export function calculateDiscount(subtotal, discountPercent) {
  if (!subtotal || !discountPercent) return 0;
  return Number(((subtotal * discountPercent) / 100).toFixed(2));
}

/**
 * Calculate final total after discount
 * @param {number} subtotal
 * @param {number} discountAmount
 * @returns {number}
 */
export function calculateTotal(subtotal, discountAmount) {
  if (!subtotal) return 0;
  return Math.max(0, subtotal - (discountAmount || 0));
}
