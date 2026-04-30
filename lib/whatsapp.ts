// lib/whatsapp.ts

/**
 * מנקה ומנרמל מספרי טלפון ישראליים לפורמט שוואטסאפ אוהב (972...).
 * מקבל כל אחד מהפורמטים הבאים:
 * - 0533752633
 * - 533752633
 * - +972533752633
 * - 972533752633
 */
export function normalizeIsraeliPhone(rawPhone: string | number | null | undefined): string | null {
  if (!rawPhone) return null;

  let phone = rawPhone.toString().trim();

  // מסיר כל תו שאינו ספרה או פלוס בתחילת המספר
  phone = phone.replace(/[^\d+]/g, '');

  // אם מתחיל ב"+" – מסיר את ה"+" ומשאיר רק ספרות
  if (phone.startsWith('+')) {
    phone = phone.slice(1);
  }

  // אם מתחיל ב"0" ויש 10 ספרות (נניח 0533752633)
  if (phone.startsWith('0') && phone.length === 10) {
    phone = '972' + phone.slice(1); // 0XXXXXXXXX → 972XXXXXXXXX
  }

  // אם אין קידומת בכלל (9 ספרות, לדוגמה 533752633) – מוסיפים 972
  if (!phone.startsWith('972') && phone.length === 9) {
    phone = '972' + phone;
  }

  // בסוף אנחנו מצפים ל־972XXXXXXXXX (12 ספרות)
  if (!phone.startsWith('972') || phone.length < 11) {
    console.warn('normalizeIsraeliPhone: unexpected phone format', rawPhone, '→', phone);
  }

  return phone;
}

/**
 * יוצר URL של וואטסאפ מהמספר והטקסט.
 */
export function buildWhatsAppUrl(rawPhone: string | number, message: string): string {
  const normalized = normalizeIsraeliPhone(rawPhone);
  if (!normalized) {
    throw new Error('buildWhatsAppUrl: invalid phone');
  }

  const encodedMessage = encodeURIComponent(message || '');
  return `https://wa.me/${normalized}?text=${encodedMessage}`;
}

/**
 * מחזיר URL לשליחת הודעה למנהל, לפי NEXT_PUBLIC_MANAGER_WHATSAPP.
 */
export function buildManagerWhatsAppUrl(message: string): string {
  const managerPhone = process.env.NEXT_PUBLIC_MANAGER_WHATSAPP || '972533752633'; // fallback אם אין ENV

  return buildWhatsAppUrl(managerPhone, message);
}
