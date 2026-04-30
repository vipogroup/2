/**
 * WhatsApp Checkout Redirect - פתרון זמני
 * 
 * במקום תשלום באשראי, מפנה את הלקוח לוואטסאפ עם פרטי ההזמנה.
 * כשתחובר מערכת גבייה, יש להסיר קובץ זה ולהחזיר את הלוגיקה המקורית.
 */

// מספר וואטסאפ קבוע - שינוי זמני עד חיבור מערכת גבייה
const WHATSAPP_NUMBER = '972533752633';

/**
 * בונה הודעת וואטסאפ מפורטת עם סיכום ההזמנה
 */
export function buildWhatsAppOrderMessage({ orderId, items, customer, totals, coupon, deliveryMethod, pickupPoint, shippingCost, shippingDistance }) {
  const lines = [];

  lines.push('🛒 *הזמנה חדשה!*');
  lines.push('');

  if (orderId) {
    lines.push(`📋 מספר הזמנה: *${orderId}*`);
    lines.push('');
  }

  // פרטי לקוח
  lines.push('👤 *פרטי הלקוח:*');
  if (customer?.fullName) lines.push(`שם: ${customer.fullName}`);
  if (customer?.email) lines.push(`אימייל: ${customer.email}`);
  if (customer?.phone) lines.push(`טלפון: ${customer.phone}`);
  if (customer?.address) lines.push(`כתובת: ${customer.address}`);
  if (customer?.city) lines.push(`עיר: ${customer.city}`);
  if (customer?.zipCode) lines.push(`מיקוד: ${customer.zipCode}`);
  lines.push('');

  // פרטי מוצרים
  if (items && items.length > 0) {
    lines.push('📦 *המוצרים:*');
    items.forEach((item, i) => {
      const name = item.name || item.productName || `מוצר ${i + 1}`;
      const qty = item.quantity || 1;
      const price = item.price != null ? `₪${Number(item.price).toLocaleString('he-IL')}` : '';
      lines.push(`${i + 1}. ${name} × ${qty} ${price}`);
    });
    lines.push('');
  }

  // משלוח / איסוף
  if (deliveryMethod) {
    if (deliveryMethod === 'shipping') {
      lines.push('🚚 *אופן קבלה: משלוח עד הבית*');
      if (shippingDistance) {
        lines.push(`מרחק: ${shippingDistance} ק"מ`);
      }
      if (shippingCost > 0) {
        lines.push(`עלות משלוח: ₪${Number(shippingCost).toLocaleString('he-IL')}`);
      }
    } else {
      lines.push('📍 *אופן קבלה: איסוף עצמי*');
      if (pickupPoint) {
        lines.push(`נקודת איסוף: ${pickupPoint.name} - ${pickupPoint.address}`);
      }
    }
  }

  // קופון
  if (coupon?.code) {
    lines.push(`🎟️ קופון: ${coupon.code} (${coupon.discountPercent || 0}% הנחה)`);
  }

  // סיכום מחיר
  if (totals) {
    lines.push('');
    lines.push('💰 *סיכום:*');
    if (totals.subtotal != null) lines.push(`סכום ביניים: ₪${Number(totals.subtotal).toLocaleString('he-IL')}`);
    if (totals.discount > 0) lines.push(`הנחה: -₪${Number(totals.discount).toLocaleString('he-IL')}`);
    if (totals.shipping > 0) lines.push(`משלוח: ₪${Number(totals.shipping).toLocaleString('he-IL')}`);
    lines.push(`*סה"כ לתשלום: ₪${Number(totals.total).toLocaleString('he-IL')}*`);
  }

  lines.push('');
  lines.push('אשמח לסיים את התשלום. תודה! 🙏');

  return lines.join('\n');
}

/**
 * פותח וואטסאפ עם הודעת הזמנה
 */
export function redirectToWhatsApp(message) {
  const encoded = encodeURIComponent(message);
  const url = `https://api.whatsapp.com/send?phone=${WHATSAPP_NUMBER}&text=${encoded}`;
  window.location.href = url;
}

/**
 * פונקציה משולבת - בונה הודעה ופותחת וואטסאפ
 */
export function sendOrderToWhatsApp(orderData) {
  const message = buildWhatsAppOrderMessage(orderData);
  redirectToWhatsApp(message);
}
