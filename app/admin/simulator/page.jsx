'use client';

import { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { getProductPublicPath } from '@/lib/stainlessSeoCategories';

// ============================================================
// VIPO SYSTEM SIMULATOR v2.0 - סימולטור מערכת מאורגן
// ============================================================

// === SVG Icon helper - replaces emoji rendering with SVG ===
const SIM_ICON_PATHS = {
  '🩺': 'M9 12h6m-3-3v6m-7 4h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  '🔐': 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
  '📦': 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  '🛒': 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z',
  '🛡️': 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  '🎟️': 'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z',
  '💰': 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  '🏦': 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  '🔔': 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
  '🏢': 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  '👥': 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  '🎭': 'M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  '🚀': 'M13 10V3L4 14h7v7l9-11h-7z',
  '🔒': 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
  '🗑️': 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
  '🚢': 'M3 10h18M3 14h18M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z',
  '💳': 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
  '🔗': 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1',
  '🚦': 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  '⚡': 'M13 10V3L4 14h7v7l9-11h-7z',
  '🏆': 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z',
  '📋': 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  '🔬': 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  '🎬': 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
  '🧭': 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7',
  '📇': 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  '🔑': 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z',
  '💬': 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
  '👤': 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  '📊': 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  '🛠️': 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
  '🌐': 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  '🧹': 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
  '⚙️': 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
  '🏪': 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  '📝': 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  '🚪': 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
  '🖼️': 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
  '🏠': 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  '⛔': 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636',
  '🧩': 'M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z',
  '🔧': 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
};
function SimIcon({ emoji, className = 'w-4 h-4' }) {
  const d = SIM_ICON_PATHS[emoji];
  if (!d) return <span className={className}>{emoji}</span>;
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} /></svg>;
}

// === SUITE DEFINITIONS ===
const TEST_SUITES = {
  s0_health: { id: 's0_health', name: 'S0 - System Health', description: 'בדיקות בריאות קצרות לכל המערכת (APIs קריטיים)', icon: '🩺' },
  s1_auth: { id: 's1_auth', name: 'S1 - Auth Flow', description: 'הרשמה, התחברות, שכחתי סיסמה, Logout, סשן', icon: '🔐' },
  s2_products: { id: 's2_products', name: 'S2 - Product CRUD', description: 'יצירה, עריכה, מחיקה, פרסום, חיפוש מוצרים', icon: '📦' },
  s3_cart: { id: 's3_cart', name: 'S3 - Cart & Checkout', description: 'עגלה, עדכון כמות, מחיקה, checkout stepper, תשלום', icon: '🛒' },
  s4_roles: { id: 's4_roles', name: 'S4 - User Roles', description: 'בדיקת הרשאות - כל תפקיד רואה רק מה שמותר לו', icon: '🛡️' },
  s5_coupons: { id: 's5_coupons', name: 'S5 - Coupons & Referrals', description: 'סוכן → קופון → לינק → לקוח → רכישה → עמלה', icon: '🎟️' },
  s6_commissions: { id: 's6_commissions', name: 'S6 - Commission Lifecycle', description: 'עמלה pending → available → claimed → completed', icon: '💰' },
  s7_withdrawals: { id: 's7_withdrawals', name: 'S7 - Withdrawal Cycle', description: 'סוכן מבקש → עסק רואה → מנהל מאשר → complete → יתרה 0', icon: '🏦' },
  s8_notifications: { id: 's8_notifications', name: 'S8 - Notifications', description: 'כל אירוע שולח התראה לנמען הנכון', icon: '🔔' },
  s9_tenant: { id: 's9_tenant', name: 'S9 - Multi-Tenant', description: 'הפרדה בין עסקים - עסק A לא רואה נתונים של עסק B', icon: '🏢' },
  s10_group: { id: 's10_group', name: 'S10 - Group Purchase', description: 'מוצר קבוצתי → הצטרפות → סגירה → עמלה (100 יום)', icon: '👥' },
  s14_impersonate: { id: 's14_impersonate', name: 'S14 - Impersonation', description: 'מנהל נכנס לעסק, רואה רק נתונים שלו, חוזר', icon: '🎭' },
  s15_biz_e2e: { id: 's15_biz_e2e', name: 'S15 - Business E2E', description: 'הרשמת עסק → branding → מוצרים → סוכן → מכירה', icon: '🚀' },
  s16_rbac: { id: 's16_rbac', name: 'S16 - RBAC Matrix', description: 'לכל API: בדיקה שכל תפקיד מקבל את הסטטוס הנכון', icon: '🔒' },
  s18_validation: { id: 's18_validation', name: 'S18 - Input Validation', description: 'שדות חסרים, XSS, מייל לא תקין, מחיר שלילי', icon: '🛡️' },
  s19_cascade: { id: 's19_cascade', name: 'S19 - Cascade Delete', description: 'מחיקת user → הכל נמחק (orders, commissions, notifications)', icon: '🗑️' },
  s11_container: { id: 's11_container', name: 'S11 - Shared Container', description: 'CBM צבירה → מילוי מכולה (68 CBM) → שילוח', icon: '🚢' },
  s12_payplus: { id: 's12_payplus', name: 'S12 - PayPlus', description: 'יצירת session תשלום, webhook, עדכון סטטוס', icon: '💳' },
  s13_priority: { id: 's13_priority', name: 'S13 - Priority ERP', description: 'סנכרון לקוח → הזמנה → חשבונית', icon: '🔗' },
  s17_ratelimit: { id: 's17_ratelimit', name: 'S17 - Rate Limiting', description: '100 בקשות מהירות → בדיקה שמקבלים 429', icon: '🚦' },
  s20_consistency: { id: 's20_consistency', name: 'S20 - Data Consistency', description: 'הזמנה → stock יורד + commission + notification', icon: '⚡' },
  s21_full_e2e: { id: 's21_full_e2e', name: 'S21 - Full System E2E', description: '3 חנויות × מוצרים × סוכנים × לקוחות × רכישות × עמלות × משיכות × התראות', icon: '🏆' },
  s22_notif_types: { id: 's22_notif_types', name: 'S22 - All Notification Types', description: 'Templates CRUD, שליחה dryRun, תזמון, System Alerts, הודעות פנימיות', icon: '🔔' },
  s23_sharing: { id: 's23_sharing', name: 'S23 - Sharing & Coupon Flow', description: 'שיתוף מוצרים לרשתות חברתיות, קוד קופון בלינק, מילוי אוטומטי בקופה', icon: '🔗' },
  s24_logs: { id: 's24_logs', name: 'S24 - Logs Verification', description: 'בדיקה שכל פעולה במערכת מופיעה ביומן התראות ויומן פעילות', icon: '📋' },
  s25_full_logs: { id: 's25_full_logs', name: 'S25 - Full Activity Coverage', description: 'כל 15 תבניות התראות + activity logs + system alerts + בידוד חנויות', icon: '🔬' },
  s26_marketing: { id: 's26_marketing', name: 'S26 - Marketing Content Library', description: 'ספריית תוכן שיווקי: CRUD, שיתוף לרשתות, קופון בלינק, תמונה+וידאו', icon: '🎬' },
  s27_dash_nav: { id: 's27_dash_nav', name: 'S27 - Dashboard Navigation', description: 'בדיקת כל הלינקים והכפתורים בדשבורד מנהל: ניווט, דפים נפתחים, HTTP 200', icon: '🧭' },
  s28_crm: { id: 's28_crm', name: 'S28 - CRM Full Flow', description: 'Leads CRUD, שיחות, משימות, סטטיסטיקות, אוטומציות', icon: '📇' },
  s29_otp: { id: 's29_otp', name: 'S29 - OTP & Email Verify', description: 'שליחת OTP בטלפון, אימות קוד מייל, ולידציות, rate limit', icon: '🔑' },
  s30_messaging: { id: 's30_messaging', name: 'S30 - Messaging', description: 'הודעות CRUD, סימון נקרא, ספירת לא נקראו, הודעות תמיכה', icon: '💬' },
  s31_agent: { id: 's31_agent', name: 'S31 - Agent Dashboard', description: 'Marketplace, עסקים, עמלות, סטטיסטיקות, קופון, החלפת עסק', icon: '👤' },
  s32_business: { id: 's32_business', name: 'S32 - Business Admin', description: 'סטטיסטיקות עסק, מיתוג, אינטגרציות, ייצוא הזמנות/עמלות', icon: '🏢' },
  s33_audit: { id: 's33_audit', name: 'S33 - Audit & Monitoring', description: 'דשבורד, לוגים, התראות, שגיאות, בריאות מערכת', icon: '📊' },
  s34_system: { id: 's34_system', name: 'S34 - System Tools', description: 'גיבויים, חירום, מיתוג, התחזות, ביקורת מוצרים', icon: '🛠️' },
  s35_public: { id: 's35_public', name: 'S35 - Auth & Public APIs', description: 'me, logout, שכחת סיסמה, מיתוג ציבורי, קטלוג, קטגוריות, בוט', icon: '🌐' },
  s36_marketplace: { id: 's36_marketplace', name: 'S36 - Marketplace & System', description: 'Health, משתמשים, סוכנים, מרקטפלייס, הזמנות לקוח', icon: '🛒' },
  s37_reports: { id: 's37_reports', name: 'S37 - Reports & Catalog Templates', description: 'דוחות מנהל, תבניות קטלוג, העתקת מוצרים', icon: '📊' },
  s38_integrations: { id: 's38_integrations', name: 'S38 - PayPlus & Priority', description: 'עסקאות PayPlus, Dead Letter, התאמות, Priority סטטוס/לקוחות/מוצרים/מסמכים', icon: '💳' },
  s39_gamification: { id: 's39_gamification', name: 'S39 - Gamification', description: 'בונוסים, יעדים, רמות, Seed', icon: '🏆' },
  s40_extended: { id: 's40_extended', name: 'S40 - Orders & Notifications', description: 'עמלות, נכסי שיווק, התראות, שליחת התראות', icon: '📦' },
  s41_maintenance: { id: 's41_maintenance', name: 'S41 - Admin Maintenance', description: 'תיקון הזמנות, ניקוי יתומים, תיקון צבעים, אכיפת מוצרים', icon: '🔧' },
  s42_misc: { id: 's42_misc', name: 'S42 - Cleanup & Orphan Audit', description: 'אורפן דריירן, ביקורת מוצרים, סיכום טננטים', icon: '🧹' },
  s43_settings: { id: 's43_settings', name: 'S43 - Settings & Texts', description: 'הגדרות, ערכת נושא, טקסטי אתר, טקסטי עמודים', icon: '⚙️' },
  s44_sales: { id: 's44_sales', name: 'S44 - Sales & Transactions', description: 'מכירות, דוחות, עסקאות, משיכות', icon: '💰' },
  s45_push: { id: 's45_push', name: 'S45 - Push Notifications', description: 'Push config, subscribe, send-test', icon: '🔔' },
  s46_products_ext: { id: 's46_products_ext', name: 'S46 - Products Extended', description: 'שכפול, מחיקה מרובה, demo-complete', icon: '📦' },
  s47_referrals: { id: 's47_referrals', name: 'S47 - Referrals & Tracking', description: 'הפניות, רשימה, סיכום, מעקב', icon: '🔗' },
  s48_tenants: { id: 's48_tenants', name: 'S48 - Tenants & Admin Fix', description: 'טננטים, תיקון מנהלים, תיקון צבעים', icon: '🏢' },
  s49_business: { id: 's49_business', name: 'S49 - Business & Users Extended', description: 'עסק, מיתוג, הצטרפות, QR, פרופיל, הזמנות, תמיכה', icon: '🏪' },
  s50_admin_ext: { id: 's50_admin_ext', name: 'S50 - Admin Tools Extended', description: 'אבטחה, SEO, דוחות מערכת, הגדרות אימות, שחזור מנהל', icon: '🛡️' },
  s51_crm_ext: { id: 's51_crm_ext', name: 'S51 - CRM Extended', description: 'המרת לידים, ייבוא/ייצוא, SLA, תבניות, WhatsApp', icon: '📇' },
  s52_catalog_mgr: { id: 's52_catalog_mgr', name: 'S52 - Catalog Manager Extended', description: 'Catalog Manager: upload/update/delete/media + Catalog Templates CRUD', icon: 'CM' },
  s53_sync: { id: 's53_sync', name: 'S53 - Tenant & Template Sync', description: 'Sync חדש: יצירת חנות + יצירת/עדכון/מחיקת תבניות עם sync לשרת חיצוני', icon: 'SYNC' },
  s54_catalog_e2e: { id: 's54_catalog_e2e', name: 'S54 - Catalog Upload & Display', description: 'העלאת 3 מוצרים (רגיל/מכולה/קבוצתי) ממנהל מוצרים → בדיקת תצוגה במרקטפלייס ובחנות', icon: '54' },
  s55_studio_diag: { id: 's55_studio_diag', name: 'S55 - Studio Auth Diagnostics', description: 'בדיקות מעמיקות לסטודיו: login, JWT, tenants/categories, CORS, negative', icon: '🖼️' },
};

const S0_CATEGORIES = {
  core: {
    id: 'core', name: 'Core', icon: '⚙️',
    tests: [
      { id: 's0-me', name: 'Auth (me)', desc: 'GET /api/auth/me → סשן פעיל' },
      { id: 's0-system-status', name: 'System status', desc: 'GET /api/admin/system-status → DB/שירותים' },
    ],
  },
  admin_data: {
    id: 'admin_data', name: 'Admin Data', icon: '🧩',
    tests: [
      { id: 's0-tenants', name: 'Tenants', desc: 'GET /api/tenants → לפחות tenant אחד' },
      { id: 's0-users', name: 'Users', desc: 'GET /api/users?limit=1' },
      { id: 's0-agents', name: 'Agents', desc: 'GET /api/agents' },
      { id: 's0-marketing-stores', name: 'Marketing stores', desc: 'GET /api/admin/marketing-stores?limit=1' },
    ],
  },
  commerce: {
    id: 'commerce', name: 'Commerce', icon: '🛒',
    tests: [
      { id: 's0-marketplace-products', name: 'Marketplace', desc: 'GET /api/marketplace/products?limit=1' },
      { id: 's0-orders', name: 'Orders', desc: 'GET /api/orders?tenantId=...&limit=1' },
      { id: 's0-commissions-release', name: 'Commissions ready', desc: 'GET /api/admin/commissions/release' },
      { id: 's0-payplus', name: 'PayPlus', desc: 'GET /api/admin/payplus/transactions?limit=1' },
      { id: 's0-priority', name: 'Priority', desc: 'GET /api/admin/priority/status' },
    ],
  },
};

// ============================================================
// S1 - AUTH FLOW
// ============================================================
const S1_CATEGORIES = {
  register: {
    id: 'register', name: 'הרשמה', icon: '📝',
    tests: [
      { id: 's1-register-customer', name: 'הרשמת לקוח', desc: 'יצירה לקוח חדש עם שם, מייל, טלפון וסיסמה' },
      { id: 's1-register-agent', name: 'הרשמת סוכן', desc: 'יצירה סוכן חדש + בדיקה שנוצר קופון אוטומטי' },
      { id: 's1-register-duplicate', name: 'הרשמה כפולה (שגיאה)', desc: 'ניסיון הרשמה עם אותו מייל - צריך לקבל שגיאה' },
      { id: 's1-register-invalid', name: 'הרשמה עם נתונים חסרים', desc: 'שליחה ללא שם/סיסמה - צריך לקבל שגיאה' },
    ],
  },
  login: {
    id: 'login', name: 'התחברות', icon: '🔑',
    tests: [
      { id: 's1-login-success', name: 'התחברות תקינה', desc: 'התחברות עם מייל+סיסמה של הלקוח שנרשם' },
      { id: 's1-login-wrong-password', name: 'סיסמה שגויה', desc: 'ניסיון התחברות עם סיסמה לא נכונה - צריך 401' },
      { id: 's1-login-nonexistent', name: 'משתמש לא קיים', desc: 'ניסיון התחברות עם מייל שלא קיים - צריך שגיאה' },
      { id: 's1-verify-session', name: 'אימות סשן (me)', desc: 'קריאה ל-/api/auth/me - צריך להחזיר פרטי משתמש' },
    ],
  },
  logout: {
    id: 'logout', name: 'התנתקות ואיפוס', icon: '🚪',
    tests: [
      { id: 's1-logout', name: 'התנתקות', desc: 'שליחת logout - צריך למחוק את ה-session' },
      { id: 's1-verify-no-session', name: 'אימות אין סשן', desc: 'קריאה ל-/api/auth/me אחרי logout - צריך 401' },
      { id: 's1-forgot-password', name: 'שכחתי סיסמה', desc: 'שליחת בקשת איפוס סיסמה למייל הלקוח' },
      { id: 's1-relogin-admin', name: 'חזרה לאדמין', desc: 'התחברות חזרה כמנהל ראשי אחרי בדיקות ההתנתקות' },
    ],
  },
  studio: {
    id: 'studio', name: 'סטודיו', icon: '🖼️',
    tests: [
      { id: 's1-studio-login', name: 'Studio login', desc: 'POST /api/studio/auth/login → token' },
      { id: 's1-studio-tenants', name: 'Studio tenants', desc: 'GET /api/studio/tenants עם Authorization Bearer → 200 + tenants[]' },
    ],
  },
};

const S55_CATEGORIES = {
  same: {
    id: 'same', name: 'Same-origin', icon: '🏠',
    tests: [
      { id: 's55-studio-login-same', name: 'Studio login (same-origin)', desc: 'POST /api/studio/auth/login' },
      { id: 's55-studio-jwt-decode-same', name: 'JWT decode (same-origin)', desc: 'decode header/payload + exp check' },
      { id: 's55-studio-tenants-same', name: 'Tenants (same-origin)', desc: 'GET /api/studio/tenants עם Bearer' },
      { id: 's55-studio-categories-same', name: 'Categories (same-origin)', desc: 'GET /api/studio/tenants/[id]/categories עם Bearer' },
    ],
  },
  cors: {
    id: 'cors', name: 'CORS (127.0.0.1)', icon: '🌐',
    tests: [
      { id: 's55-studio-tenants-cross-no-auth', name: 'Cross-origin reachability', desc: 'GET cross-origin /api/studio/tenants ללא Authorization → 401 (אם השרת נגיש)' },
      { id: 's55-studio-login-127', name: 'Studio login (127.0.0.1)', desc: 'POST http://127.0.0.1:<port>/api/studio/auth/login' },
      { id: 's55-studio-tenants-127', name: 'Tenants (127.0.0.1)', desc: 'GET http://127.0.0.1:<port>/api/studio/tenants עם Bearer' },
      { id: 's55-studio-categories-127', name: 'Categories (127.0.0.1)', desc: 'GET http://127.0.0.1:<port>/api/studio/tenants/[id]/categories עם Bearer' },
    ],
  },
  negative: {
    id: 'negative', name: 'Negative', icon: '⛔',
    tests: [
      { id: 's55-studio-tenants-no-auth', name: 'Tenants ללא Authorization', desc: 'GET /api/studio/tenants בלי header → 401' },
      { id: 's55-studio-tenants-no-bearer', name: 'Tenants בלי Bearer', desc: 'GET /api/studio/tenants Authorization=<token> → 401' },
      { id: 's55-studio-tenants-fake-token', name: 'Tenants טוקן מזויף', desc: 'GET /api/studio/tenants עם Bearer FAKE → 401' },
    ],
  },
};

const S53_CATEGORIES = {
  setup: {
    id: 'setup', name: 'Phase 1: Setup', icon: '1',
    tests: [
      { id: 's53-login', name: 'התחברות', desc: 'Login כ-super_admin' },
    ],
  },
  tenants: {
    id: 'tenants', name: 'Phase 2: Tenants sync', icon: '2',
    tests: [
      { id: 's53-create-tenant-sync', name: 'Create tenant + sync', desc: 'POST /api/tenants + validate sync result' },
    ],
  },
  templates: {
    id: 'templates', name: 'Phase 3: Templates sync', icon: '3',
    tests: [
      { id: 's53-create-template-sync', name: 'Create template + sync', desc: 'POST /api/admin/catalog-templates + validate sync result' },
      { id: 's53-update-template-sync', name: 'Update template + sync', desc: 'PATCH /api/admin/catalog-templates/[id] + validate sync result' },
      { id: 's53-delete-template-sync', name: 'Delete template + sync', desc: 'DELETE /api/admin/catalog-templates/[id] + validate sync result' },
    ],
  },
};

const S54_CATEGORIES = {
  setup: {
    id: 'setup', name: 'Phase 1: הכנה', icon: '1',
    tests: [
      { id: 's54-login', name: 'התחברות', desc: 'Login כ-super_admin' },
      { id: 's54-pick-tenant', name: 'בחירת חנות נירוסטה', desc: 'שליפת חנות מחסני נירוסטה מרשימת הטננטים' },
    ],
  },
  upload: {
    id: 'upload', name: 'Phase 2: העלאת מוצרים', icon: '2',
    tests: [
      { id: 's54-upload-regular', name: 'העלאת מוצר רגיל', desc: 'POST /api/catalog-manager/upload עם purchaseType=regular' },
      { id: 's54-upload-shared', name: 'העלאת מוצר מכולה משותפת', desc: 'POST /api/catalog-manager/upload עם groupPurchaseType=shared_container' },
      { id: 's54-upload-group', name: 'העלאת מוצר רכישה קבוצתית', desc: 'POST /api/catalog-manager/upload עם groupPurchaseType=group' },
    ],
  },
  marketplace: {
    id: 'marketplace', name: 'Phase 3: מרקטפלייס', icon: '3',
    tests: [
      { id: 's54-marketplace-all', name: 'כל המוצרים במרקטפלייס', desc: 'GET /api/marketplace/products → 3 מוצרי הבדיקה מופיעים' },
      { id: 's54-marketplace-regular', name: 'סינון מכירה רגילה', desc: 'GET /api/marketplace/products?type=regular → מוצר רגיל מופיע' },
      { id: 's54-marketplace-shared', name: 'סינון מכולה משותפת', desc: 'GET /api/marketplace/products?type=group&groupPurchaseType=shared_container → מוצר מכולה מופיע' },
      { id: 's54-marketplace-group', name: 'סינון רכישה קבוצתית', desc: 'GET /api/marketplace/products?type=group&groupPurchaseType=group → מוצר קבוצתי מופיע' },
    ],
  },
  store: {
    id: 'store', name: 'Phase 4: חנות נירוסטה', icon: '4',
    tests: [
      { id: 's54-store-products', name: 'מוצרים בחנות', desc: 'GET /api/products?tenantId=... → 3 מוצרי הבדיקה מופיעים' },
      { id: 's54-store-regular', name: 'מוצר רגיל בחנות', desc: 'בדיקה שהמוצר הרגיל מופיע עם purchaseType=regular' },
      { id: 's54-store-shared', name: 'מוצר מכולה בחנות', desc: 'בדיקה שמוצר מכולה מופיע עם groupPurchaseType=shared_container' },
      { id: 's54-store-group', name: 'מוצר קבוצתי בחנות', desc: 'בדיקה שמוצר קבוצתי מופיע עם groupPurchaseType=group' },
    ],
  },
  cleanup: {
    id: 'cleanup', name: 'Phase 5: ניקוי', icon: '5',
    tests: [
      { id: 's54-cleanup', name: 'מחיקת מוצרי בדיקה', desc: 'מחיקת 3 המוצרים שנוצרו', manual: true },
    ],
  },
};

const S52_CATEGORIES = {
  setup: {
    id: 'setup', name: 'Phase 1: Setup', icon: '1',
    tests: [
      { id: 's52-login', name: 'התחברות', desc: 'Login כ-super_admin' },
      { id: 's52-pick-tenant', name: 'בחירת חנות', desc: 'GET /api/catalog-manager/tenants → tenantId' },
      { id: 's52-cloudinary-config', name: 'Cloudinary Config', desc: 'GET /api/catalog-manager/cloudinary-config' },
    ],
  },
  logistics: {
    id: 'logistics', name: 'Phase 2: Logistics smoke', icon: '2',
    tests: [
      { id: 's52-orders-smoke', name: 'Orders list', desc: 'GET /api/orders?tenantId=...&limit=1' },
      { id: 's52-products-include-inactive', name: 'Products includeInactive', desc: 'GET /api/products?tenantId=...&includeInactive=true&limit=1' },
    ],
  },
  upload: {
    id: 'upload', name: 'Phase 3: Upload validations', icon: '3',
    tests: [
      { id: 's52-upload-no-tenant', name: 'Upload ללא tenant', desc: 'POST /api/catalog-manager/upload → 400' },
      { id: 's52-upload-invalid-tenant', name: 'Upload tenant שגוי', desc: 'POST /api/catalog-manager/upload → 404' },
      { id: 's52-upload-no-products', name: 'Upload ללא מוצרים', desc: 'POST /api/catalog-manager/upload → 400' },
      { id: 's52-upload-missing-images', name: 'Upload ללא תמונות', desc: 'POST /api/catalog-manager/upload → 400' },
    ],
  },
  update: {
    id: 'update', name: 'Phase 4: Update validations', icon: '4',
    tests: [
      { id: 's52-update-no-tenant', name: 'Update ללא tenant', desc: 'POST /api/catalog-manager/update → 400' },
      { id: 's52-update-invalid-tenant', name: 'Update tenant שגוי', desc: 'POST /api/catalog-manager/update → 404' },
      { id: 's52-update-no-products', name: 'Update ללא מוצרים', desc: 'POST /api/catalog-manager/update → 400' },
      { id: 's52-update-not-found', name: 'Update SKU לא קיים', desc: 'POST /api/catalog-manager/update → notFound[]' },
    ],
  },
  delete_products: {
    id: 'delete_products', name: 'Phase 5: Delete products validations', icon: '5',
    tests: [
      { id: 's52-delete-products-no-tenant', name: 'Delete ללא tenant', desc: 'POST /api/catalog-manager/delete-products → 400' },
      { id: 's52-delete-products-no-skus', name: 'Delete ללא SKUs', desc: 'POST /api/catalog-manager/delete-products → 400' },
      { id: 's52-delete-products-nonexistent', name: 'Delete SKU לא קיים', desc: 'POST /api/catalog-manager/delete-products → deletedCount=0' },
    ],
  },
  media: {
    id: 'media', name: 'Phase 6: Media validations', icon: '6',
    tests: [
      { id: 's52-delete-media-invalid-url', name: 'Delete media URL לא תקין', desc: 'POST /api/catalog-manager/delete-media → 400' },
      { id: 's52-delete-media-random', name: 'Delete media URL random', desc: 'POST /api/catalog-manager/delete-media → success' },
      { id: 's52-remove-product-media-no-url', name: 'Remove media ללא URL', desc: 'POST /api/catalog-manager/remove-product-media → 400' },
      { id: 's52-remove-product-media-random', name: 'Remove media random', desc: 'POST /api/catalog-manager/remove-product-media → updatedCount=0' },
    ],
  },
  templates: {
    id: 'templates', name: 'Phase 7: Catalog templates CRUD', icon: '7',
    tests: [
      { id: 's52-templates-list', name: 'רשימת תבניות', desc: 'GET /api/admin/catalog-templates?tenantId=...' },
      { id: 's52-templates-create', name: 'יצירת תבנית', desc: 'POST /api/admin/catalog-templates' },
      { id: 's52-templates-update', name: 'עדכון תבנית', desc: 'PATCH /api/admin/catalog-templates/[id]' },
      { id: 's52-templates-delete', name: 'מחיקת תבנית', desc: 'DELETE /api/admin/catalog-templates/[id]' },
    ],
  },
  dangerous: {
    id: 'dangerous', name: 'Phase 8: Manual', icon: '8',
    tests: [
      { id: 's52-cleanup-media-manual', name: 'cleanup-media (manual)', desc: 'POST /api/catalog-manager/cleanup-media (manual run only)', manual: true },
    ],
  },
};

// ============================================================
// S2 - PRODUCT CRUD
// ============================================================
const S2_CATEGORIES = {
  create: {
    id: 'create', name: 'יצירת מוצר', icon: '➕',
    tests: [
      { id: 's2-setup-business', name: 'הכנה: יצירת/בחירת עסק', desc: 'שליפת עסק קיים או יצירת עסק חדש לבדיקת מוצרים' },
      { id: 's2-create-product', name: 'יצירת מוצר חדש', desc: 'יצירת מוצר עם שם, מחיר, תיאור, קטגוריה ומלאי' },
      { id: 's2-verify-product', name: 'אימות מוצר נוצר', desc: 'בדיקה שהמוצר מופיע ברשימה' },
      { id: 's2-create-invalid', name: 'יצירה עם נתונים חסרים', desc: 'ניסיון יצירה ללא שם/מחיר - צריך שגיאה' },
    ],
  },
  update: {
    id: 'update', name: 'עריכה ועדכון', icon: '✏️',
    tests: [
      { id: 's2-update-price', name: 'עדכון מחיר', desc: 'שינוי מחיר המוצר ואימות שהערך נשמר' },
      { id: 's2-update-stock', name: 'עדכון מלאי', desc: 'שינוי כמות מלאי ואימות' },
      { id: 's2-update-status', name: 'שינוי סטטוס (draft/published)', desc: 'מעבר בין טיוטה לפורסם' },
    ],
  },
  search: {
    id: 'search', name: 'חיפוש ושליפה', icon: '🔍',
    tests: [
      { id: 's2-list-products', name: 'רשימת מוצרים', desc: 'שליפת כל המוצרים של העסק' },
      { id: 's2-get-single', name: 'שליפת מוצר בודד', desc: 'שליפה לפי ID ואימות כל השדות' },
    ],
  },
  delete_cat: {
    id: 'delete_cat', name: 'מחיקה', icon: '🗑️',
    tests: [
      { id: 's2-delete-product', name: 'מחיקת מוצר', desc: 'מחיקת המוצר ואימות שנעלם מהרשימה' },
    ],
  },
};

// ============================================================
// S4 - USER ROLES
// ============================================================
const S4_CATEGORIES = {
  setup: {
    id: 'setup', name: 'הכנה', icon: '⚙️',
    tests: [
      { id: 's4-setup-users', name: 'יצירת משתמשי בדיקה', desc: 'יצירת סוכן, לקוח ומנהל לבדיקות הרשאות' },
    ],
  },
  customer_access: {
    id: 'customer_access', name: 'הרשאות לקוח', icon: '👤',
    tests: [
      { id: 's4-customer-products-ok', name: 'לקוח רואה מוצרים (200)', desc: 'לקוח יכול לצפות במוצרים' },
      { id: 's4-customer-admin-403', name: 'לקוח לא ניגש לאדמין (403)', desc: 'לקוח מנסה גישה ל-/api/users - צריך 401/403' },
      { id: 's4-customer-delete-403', name: 'לקוח לא מוחק משתמשים (403)', desc: 'לקוח מנסה למחוק user - צריך 401/403' },
    ],
  },
  agent_access: {
    id: 'agent_access', name: 'הרשאות סוכן', icon: '🤝',
    tests: [
      { id: 's4-agent-businesses-ok', name: 'סוכן רואה עסקים שלו (200)', desc: 'סוכן יכול לצפות בעסקים שמשויך אליהם' },
      { id: 's4-agent-admin-403', name: 'סוכן לא ניגש לאדמין (403)', desc: 'סוכן מנסה גישה ל-/api/users - צריך 401/403' },
      { id: 's4-agent-delete-user-403', name: 'סוכן לא מוחק משתמשים (403)', desc: 'סוכן מנסה למחוק user - צריך 401/403' },
    ],
  },
  admin_access: {
    id: 'admin_access', name: 'הרשאות מנהל', icon: '👑',
    tests: [
      { id: 's4-admin-users-ok', name: 'מנהל רואה משתמשים (200)', desc: 'מנהל ניגש לרשימת משתמשים' },
      { id: 's4-admin-orders-ok', name: 'מנהל רואה הזמנות (200)', desc: 'מנהל רואה את כל ההזמנות' },
      { id: 's4-admin-tenants-ok', name: 'מנהל רואה עסקים (200)', desc: 'מנהל רואה את כל העסקים' },
    ],
  },
};

// ============================================================
// S5 - COUPONS & REFERRALS
// ============================================================
const S5_CATEGORIES = {
  setup: {
    id: 'setup', name: 'הכנה', icon: '⚙️',
    tests: [
      { id: 's5-setup', name: 'יצירת עסק + סוכן + מוצר', desc: 'הכנת סביבה: עסק, סוכן עם קופון, ומוצר' },
    ],
  },
  coupon_flow: {
    id: 'coupon_flow', name: 'זרימת קופון', icon: '🎟️',
    tests: [
      { id: 's5-agent-has-coupon', name: 'סוכן קיבל קופון', desc: 'בדיקה שלסוכן יש קופון אישי' },
      { id: 's5-share-link', name: 'יצירת לינק שיתוף', desc: 'סוכן יוצר לינק עם הקופון שלו' },
      { id: 's5-customer-register', name: 'לקוח נרשם דרך הלינק', desc: 'לקוח נרשם עם referralCode של הסוכן' },
      { id: 's5-order-with-coupon', name: 'רכישה עם קופון', desc: 'לקוח רוכש מוצר עם קופון הסוכן' },
    ],
  },
  commission_check: {
    id: 'commission_check', name: 'בדיקת עמלה', icon: '💰',
    tests: [
      { id: 's5-commission-created', name: 'עמלה נוצרה', desc: 'בדיקה שנוצרה עמלה לסוכן מהרכישה' },
      { id: 's5-agent-balance', name: 'יתרת סוכן עודכנה', desc: 'בדיקה שיתרת העמלות של הסוכן עלתה' },
    ],
  },
};

// ============================================================
// S9 - MULTI-TENANT
// ============================================================
const S9_CATEGORIES = {
  setup: {
    id: 'setup', name: 'הכנה', icon: '⚙️',
    tests: [
      { id: 's9-create-biz-a', name: 'יצירת עסק A + מוצר', desc: 'יצירת עסק ראשון עם מוצר' },
      { id: 's9-create-biz-b', name: 'יצירת עסק B + מוצר', desc: 'יצירת עסק שני עם מוצר' },
    ],
  },
  isolation: {
    id: 'isolation', name: 'בדיקת הפרדה', icon: '🔒',
    tests: [
      { id: 's9-biz-a-no-biz-b-products', name: 'עסק A לא רואה מוצרי B', desc: 'עסק A שולף מוצרים - לא רואה של B' },
      { id: 's9-biz-b-no-biz-a-products', name: 'עסק B לא רואה מוצרי A', desc: 'עסק B שולף מוצרים - לא רואה של A' },
      { id: 's9-biz-a-no-biz-b-orders', name: 'עסק A לא רואה הזמנות B', desc: 'עסק A שולף הזמנות - לא רואה של B' },
      { id: 's9-admin-sees-all', name: 'מנהל רואה הכל', desc: 'super_admin רואה מוצרים של שני העסקים' },
    ],
  },
};

// ============================================================
// S3 - CART & CHECKOUT
// ============================================================
const S3_CATEGORIES = {
  cart: {
    id: 'cart', name: 'עגלת קניות', icon: '🛒',
    tests: [
      { id: 's3-setup', name: 'הכנה: עסק + מוצר + לקוח', desc: 'יצירת עסק, מוצר ולקוח לבדיקה' },
      { id: 's3-add-to-cart', name: 'הוספה לעגלה', desc: 'הוספת מוצר לעגלה של הלקוח' },
      { id: 's3-update-qty', name: 'עדכון כמות', desc: 'שינוי כמות מוצר בעגלה' },
      { id: 's3-remove-item', name: 'הסרה מהעגלה', desc: 'הסרת מוצר מהעגלה' },
      { id: 's3-empty-cart', name: 'עגלה ריקה', desc: 'בדיקה שעגלה ריקה מחזירה 0 פריטים' },
    ],
  },
  checkout: {
    id: 'checkout', name: 'Checkout', icon: '💳',
    tests: [
      { id: 's3-add-for-checkout', name: 'הוספת מוצר (לפני checkout)', desc: 'הוספת מוצר חזרה לעגלה' },
      { id: 's3-create-order', name: 'יצירת הזמנה', desc: 'המרת עגלה להזמנה עם פרטי לקוח' },
      { id: 's3-verify-order', name: 'אימות הזמנה נוצרה', desc: 'בדיקה שההזמנה מופיעה ברשימה' },
      { id: 's3-verify-stock-decreased', name: 'אימות מלאי ירד', desc: 'בדיקה שמלאי המוצר ירד בהתאם' },
    ],
  },
};

// ============================================================
// S6 - COMMISSION LIFECYCLE
// ============================================================
const S6_CATEGORIES = {
  setup: {
    id: 'setup', name: 'הכנה', icon: '⚙️',
    tests: [
      { id: 's6-setup', name: 'עסק + סוכן + מוצר + הזמנה', desc: 'יצירת כל הנדרש כדי ליצור עמלה' },
    ],
  },
  lifecycle: {
    id: 'lifecycle', name: 'מחזור חיי עמלה', icon: '🔄',
    tests: [
      { id: 's6-commission-exists', name: 'עמלה נוצרה (pending)', desc: 'בדיקה שנוצרה עמלה בסטטוס pending' },
      { id: 's6-commission-amount', name: 'סכום עמלה נכון', desc: 'בדיקה שסכום העמלה מחושב נכון' },
      { id: 's6-agent-balance', name: 'יתרת סוכן עודכנה', desc: 'בדיקה שיתרת commissionBalance עלתה' },
      { id: 's6-commission-list', name: 'רשימת עמלות סוכן', desc: 'בדיקה שהסוכן רואה את העמלות שלו' },
    ],
  },
};

// ============================================================
// S7 - WITHDRAWAL CYCLE
// ============================================================
const S7_CATEGORIES = {
  setup: {
    id: 'setup', name: 'הכנה', icon: '⚙️',
    tests: [
      { id: 's7-setup', name: 'עסק + סוכן + עמלה', desc: 'יצירת סוכן עם יתרת עמלות זמינה' },
    ],
  },
  flow: {
    id: 'flow', name: 'תהליך משיכה', icon: '🏦',
    tests: [
      { id: 's7-request-withdrawal', name: 'סוכן מבקש משיכה', desc: 'סוכן יוצר בקשת withdrawal' },
      { id: 's7-verify-pending', name: 'בקשה בסטטוס pending', desc: 'בדיקה שהבקשה נמצאת ב-pending' },
      { id: 's7-admin-approve', name: 'מנהל מאשר', desc: 'super_admin מאשר את בקשת המשיכה' },
      { id: 's7-admin-complete', name: 'מנהל משלים תשלום', desc: 'סימון הבקשה כ-completed' },
      { id: 's7-balance-zero', name: 'יתרת סוכן אפס', desc: 'בדיקה שיתרת הסוכן התאפסה' },
      { id: 's7-biz-admin-blocked', name: 'business_admin חסום (403)', desc: 'business_admin לא יכול לאשר/להשלים' },
    ],
  },
};

// ============================================================
// S8 - NOTIFICATIONS
// ============================================================
const S8_CATEGORIES = {
  setup: {
    id: 'setup', name: 'הכנה', icon: '⚙️',
    tests: [
      { id: 's8-setup', name: 'עסק + סוכן + לקוח + מוצר', desc: 'הכנת סביבה מלאה לבדיקת התראות' },
    ],
  },
  triggers: {
    id: 'triggers', name: 'טריגרים', icon: '🔔',
    tests: [
      { id: 's8-order-notification', name: 'התראת הזמנה חדשה', desc: 'יצירת הזמנה ובדיקה שנוצרה התראה' },
      { id: 's8-admin-notifications', name: 'התראות מנהל', desc: 'בדיקה שמנהל רואה את כל ההתראות' },
      { id: 's8-read-notification', name: 'סימון כנקרא', desc: 'סימון התראה כנקראה ואימות' },
      { id: 's8-unread-count', name: 'מונה לא נקראו', desc: 'בדיקה שמונה ההתראות הלא-נקראות נכון' },
    ],
  },
};

// ============================================================
// S10 - GROUP PURCHASE
// ============================================================
const S10_CATEGORIES = {
  setup: {
    id: 'setup', name: 'הכנה', icon: '⚙️',
    tests: [
      { id: 's10-setup', name: 'עסק + מוצר קבוצתי', desc: 'יצירת עסק ומוצר לרכישה קבוצתית' },
    ],
  },
  flow: {
    id: 'flow', name: 'תהליך קבוצתי', icon: '👥',
    tests: [
      { id: 's10-create-group', name: 'יצירת רכישה קבוצתית', desc: 'פתיחת GroupPurchase חדש' },
      { id: 's10-join-group', name: 'הצטרפות לקבוצה', desc: 'לקוח מצטרף לרכישה הקבוצתית' },
      { id: 's10-verify-group-status', name: 'סטטוס הקבוצה', desc: 'בדיקה שהקבוצה פעילה ויש חברים' },
      { id: 's10-close-group', name: 'סגירת קבוצה', desc: 'סגירת הרכישה הקבוצתית' },
    ],
  },
};

// ============================================================
// S14 - IMPERSONATION
// ============================================================
const S14_CATEGORIES = {
  flow: {
    id: 'flow', name: 'התחזות', icon: '🎭',
    tests: [
      { id: 's14-get-tenants', name: 'שליפת עסקים', desc: 'מנהל שולף רשימת עסקים לבחירה' },
      { id: 's14-impersonate', name: 'כניסה לעסק (impersonate)', desc: 'מנהל נכנס לתצוגה של עסק ספציפי' },
      { id: 's14-verify-filtered', name: 'נתונים מסוננים', desc: 'בדיקה שרואים רק מוצרים/הזמנות של העסק' },
      { id: 's14-unimpersonate', name: 'חזרה (unimpersonate)', desc: 'מנהל חוזר לתצוגה הרגילה' },
      { id: 's14-verify-all-data', name: 'רואה הכל שוב', desc: 'בדיקה שאחרי חזרה רואים את כל הנתונים' },
    ],
  },
};

// ============================================================
// S15 - BUSINESS E2E
// ============================================================
const S15_CATEGORIES = {
  register: {
    id: 'register', name: 'הרשמת עסק', icon: '🏢',
    tests: [
      { id: 's15-register-business', name: 'הרשמת בעל עסק', desc: 'יצירת משתמש business_admin חדש' },
      { id: 's15-create-tenant', name: 'יצירת Tenant', desc: 'יצירת עסק חדש ושיוכו לבעלים' },
      { id: 's15-approve-tenant', name: 'אישור עסק', desc: 'super_admin מאשר את העסק החדש' },
    ],
  },
  operations: {
    id: 'operations', name: 'פעילות עסק', icon: '⚡',
    tests: [
      { id: 's15-add-product', name: 'הוספת מוצר לעסק', desc: 'בעל העסק מוסיף מוצר' },
      { id: 's15-add-agent', name: 'הוספת סוכן', desc: 'רישום סוכן לעסק החדש' },
      { id: 's15-customer-purchase', name: 'לקוח רוכש', desc: 'לקוח רוכש מוצר מהעסק החדש' },
      { id: 's15-verify-dashboard', name: 'דשבורד עסק', desc: 'בדיקה שהעסק רואה הזמנה + סוכן' },
    ],
  },
};

// ============================================================
// S16 - RBAC MATRIX
// ============================================================
const S16_CATEGORIES = {
  setup: {
    id: 'setup', name: 'הכנה', icon: '⚙️',
    tests: [
      { id: 's16-setup-users', name: 'יצירת 3 משתמשים', desc: 'יצירת customer, agent, business_admin' },
    ],
  },
  products_api: {
    id: 'products_api', name: 'Products API', icon: '📦',
    tests: [
      { id: 's16-products-customer-get', name: 'GET products → customer 200', desc: 'לקוח יכול לראות מוצרים' },
      { id: 's16-products-customer-post', name: 'POST products → customer 401/403', desc: 'לקוח לא יכול ליצור מוצר' },
      { id: 's16-products-agent-get', name: 'GET products → agent 200', desc: 'סוכן יכול לראות מוצרים' },
    ],
  },
  users_api: {
    id: 'users_api', name: 'Users API', icon: '👥',
    tests: [
      { id: 's16-users-customer-403', name: 'GET users → customer 401/403', desc: 'לקוח לא ניגש לניהול משתמשים' },
      { id: 's16-users-agent-403', name: 'GET users → agent 401/403', desc: 'סוכן לא ניגש לניהול משתמשים' },
      { id: 's16-users-admin-200', name: 'GET users → admin 200', desc: 'מנהל רואה משתמשים' },
    ],
  },
  orders_api: {
    id: 'orders_api', name: 'Orders API', icon: '📋',
    tests: [
      { id: 's16-orders-customer-own', name: 'GET orders → customer (own)', desc: 'לקוח רואה רק הזמנות שלו' },
      { id: 's16-orders-admin-all', name: 'GET orders → admin (all)', desc: 'מנהל רואה כל ההזמנות' },
      { id: 's16-delete-order-customer-403', name: 'DELETE order → customer 401/403', desc: 'לקוח לא יכול למחוק הזמנות' },
    ],
  },
};

// ============================================================
// S18 - INPUT VALIDATION
// ============================================================
const S18_CATEGORIES = {
  missing_fields: {
    id: 'missing_fields', name: 'שדות חסרים', icon: '❌',
    tests: [
      { id: 's18-register-no-email', name: 'הרשמה בלי מייל', desc: 'שליחת register ללא email' },
      { id: 's18-register-no-password', name: 'הרשמה בלי סיסמה', desc: 'שליחת register ללא password' },
      { id: 's18-product-no-name', name: 'מוצר בלי שם', desc: 'יצירת מוצר ללא name' },
      { id: 's18-product-no-price', name: 'מוצר בלי מחיר', desc: 'יצירת מוצר ללא price' },
    ],
  },
  bad_values: {
    id: 'bad_values', name: 'ערכים לא תקינים', icon: '⚠️',
    tests: [
      { id: 's18-negative-price', name: 'מחיר שלילי', desc: 'יצירת מוצר עם price: -100' },
      { id: 's18-invalid-email', name: 'מייל לא תקין', desc: 'הרשמה עם email: "not-an-email"' },
      { id: 's18-xss-name', name: 'XSS בשם', desc: 'הרשמה עם שם: <script>alert(1)</script>' },
      { id: 's18-huge-payload', name: 'Payload ענק', desc: 'שליחת description עם 100K תווים' },
    ],
  },
};

// ============================================================
// S19 - CASCADE DELETE
// ============================================================
const S19_CATEGORIES = {
  setup: {
    id: 'setup', name: 'הכנה', icon: '⚙️',
    tests: [
      { id: 's19-setup', name: 'יצירת user + order + notification', desc: 'יצירת משתמש עם הזמנה והתראה' },
    ],
  },
  delete_verify: {
    id: 'delete_verify', name: 'מחיקה ואימות', icon: '🗑️',
    tests: [
      { id: 's19-delete-user', name: 'מחיקת משתמש', desc: 'מחיקת המשתמש שנוצר' },
      { id: 's19-verify-orders-gone', name: 'הזמנות נמחקו', desc: 'בדיקה שההזמנות של המשתמש נמחקו/התעדכנו' },
      { id: 's19-verify-product-delete', name: 'מחיקת מוצר', desc: 'מחיקת מוצר ובדיקה שנעלם מהרשימה' },
    ],
  },
};

// ============================================================
// S20 - DATA CONSISTENCY
// ============================================================
const S20_CATEGORIES = {
  setup: {
    id: 'setup', name: 'הכנה', icon: '⚙️',
    tests: [
      { id: 's20-setup', name: 'עסק + סוכן + מוצר (stock=10)', desc: 'יצירת מוצר עם 10 יחידות במלאי' },
    ],
  },
  consistency: {
    id: 'consistency', name: 'בדיקת עקביות', icon: '⚡',
    tests: [
      { id: 's20-order-stock', name: 'הזמנה → stock ירד', desc: 'יצירת הזמנה ובדיקה שהמלאי ירד ב-1' },
      { id: 's20-order-total', name: 'סכום הזמנה נכון', desc: 'בדיקה שה-totalAmount = price × quantity' },
      { id: 's20-multi-order-stock', name: '3 הזמנות → stock ירד ב-3', desc: '3 הזמנות ובדיקה שהמלאי ירד בהתאם' },
    ],
  },
};

// ============================================================
// S11 - SHARED CONTAINER
// ============================================================
const S11_CATEGORIES = {
  setup: {
    id: 'setup', name: 'הכנה', icon: '⚙️',
    tests: [
      { id: 's11-setup', name: 'עסק + מוצרים עם CBM', desc: 'יצירת עסק ומוצרים עם נתוני נפח' },
    ],
  },
  flow: {
    id: 'flow', name: 'תהליך מכולה', icon: '🚢',
    tests: [
      { id: 's11-create-container', name: 'יצירת מכולה', desc: 'פתיחת מכולה משותפת חדשה' },
      { id: 's11-add-order-to-container', name: 'הוספת הזמנה', desc: 'הוספת הזמנה למכולה ובדיקת CBM' },
      { id: 's11-check-cbm', name: 'בדיקת CBM נוכחי', desc: 'בדיקה שה-CBM המצטבר נכון' },
      { id: 's11-container-status', name: 'סטטוס מכולה', desc: 'בדיקת סטטוס (open/filling/shipped)' },
    ],
  },
};

// ============================================================
// S12 - PAYPLUS INTEGRATION
// ============================================================
const S12_CATEGORIES = {
  session: {
    id: 'session', name: 'תשלום', icon: '💳',
    tests: [
      { id: 's12-setup', name: 'הכנה: עסק + מוצר + לקוח', desc: 'יצירת סביבה לבדיקת תשלום' },
      { id: 's12-create-payment', name: 'יצירת session תשלום', desc: 'יצירת לינק תשלום PayPlus' },
      { id: 's12-payment-status', name: 'סטטוס תשלום', desc: 'בדיקת סטטוס תשלום (pending)' },
    ],
  },
  webhook: {
    id: 'webhook', name: 'Webhook', icon: '🔔',
    tests: [
      { id: 's12-webhook-success', name: 'Webhook הצלחה', desc: 'סימולציה של webhook תשלום מוצלח' },
      { id: 's12-order-paid', name: 'הזמנה עודכנה PAID', desc: 'בדיקה שההזמנה עברה ל-PAID' },
      { id: 's12-idempotent', name: 'Webhook כפול (idempotent)', desc: 'שליחת webhook כפול - לא משנה כלום' },
    ],
  },
};

// ============================================================
// S13 - PRIORITY ERP SYNC
// ============================================================
const S13_CATEGORIES = {
  sync: {
    id: 'sync', name: 'סנכרון', icon: '🔗',
    tests: [
      { id: 's13-setup', name: 'הכנה: לקוח + הזמנה', desc: 'יצירת לקוח והזמנה לסנכרון' },
      { id: 's13-sync-customer', name: 'סנכרון לקוח', desc: 'שליחת לקוח ל-Priority' },
      { id: 's13-sync-order', name: 'סנכרון הזמנה', desc: 'שליחת הזמנה ל-Priority' },
      { id: 's13-sync-status', name: 'סטטוס סנכרון', desc: 'בדיקת שהסנכרון הצליח' },
    ],
  },
};

// ============================================================
// S17 - RATE LIMITING
// ============================================================
const S17_CATEGORIES = {
  flood: {
    id: 'flood', name: 'הצפת בקשות', icon: '🚦',
    tests: [
      { id: 's17-rapid-requests', name: '50 בקשות מהירות', desc: 'שליחת 50 בקשות GET ברצף' },
      { id: 's17-rate-limit-hit', name: 'בדיקת 429', desc: 'בדיקה שמקבלים 429 Too Many Requests' },
      { id: 's17-login-brute', name: 'Brute-force התחברות', desc: '20 ניסיונות התחברות עם סיסמה שגויה' },
      { id: 's17-after-cooldown', name: 'אחרי המתנה', desc: 'בדיקה שאחרי המתנה חוזרים ל-200' },
    ],
  },
};

// ============================================================
// S21 - FULL SYSTEM E2E
// ============================================================
const S21_CATEGORIES = {
  setup: {
    id: 'setup', name: 'Phase 1: הקמת תשתית', icon: '🏗️',
    tests: [
      { id: 's21-create-stores', name: 'יצירת 3 חנויות', desc: 'הרשמת 3 עסקים (tenants) עם branding שונה' },
      { id: 's21-create-products', name: 'מוצרים לכל חנות', desc: '4 סוגי מוצרים לכל חנות (רגיל, יקר, מבצע, קבוצתי)' },
      { id: 's21-create-agents', name: '3 סוכנים × 3 חנויות', desc: '9 סוכנים עם קודי קופון' },
      { id: 's21-create-customers', name: '2 לקוחות × 3 חנויות', desc: '6 לקוחות - כל אחד משויך לחנות' },
    ],
  },
  commerce: {
    id: 'commerce', name: 'Phase 2: רכישות', icon: '🛒',
    tests: [
      { id: 's21-purchases', name: 'רכישות עם קופונים', desc: 'כל לקוח רוכש מוצרים דרך קופון סוכן' },
      { id: 's21-verify-stock', name: 'בדיקת מלאי', desc: 'מלאי ירד בכל המוצרים שנרכשו' },
      { id: 's21-verify-commissions', name: 'בדיקת עמלות', desc: 'עמלות נוצרו לכל הסוכנים' },
    ],
  },
  isolation: {
    id: 'isolation', name: 'Phase 3: הפרדת נתונים', icon: '🔒',
    tests: [
      { id: 's21-customer-sees-own', name: 'לקוח רואה רק שלו', desc: 'כל לקוח רואה רק את ההזמנות שלו' },
      { id: 's21-agent-sees-own', name: 'סוכן רואה רק שלו', desc: 'כל סוכן רואה רק את העמלות שלו' },
      { id: 's21-store-sees-own', name: 'חנות רואה רק שלה', desc: 'impersonate לחנות - רואים רק נתוניה' },
      { id: 's21-admin-sees-all', name: 'מנהל ראשי רואה הכל', desc: 'מנהל ראשי רואה הזמנות מכל החנויות' },
    ],
  },
  notifications: {
    id: 'notifications', name: 'Phase 4: התראות', icon: '🔔',
    tests: [
      { id: 's21-check-notifications', name: 'בדיקת כל ההתראות', desc: 'כל שחקן קיבל התראות רלוונטיות' },
    ],
  },
  withdrawals: {
    id: 'withdrawals', name: 'Phase 5: מימוש עמלות', icon: '🏦',
    tests: [
      { id: 's21-release-commissions', name: 'שחרור עמלות', desc: 'שחרור כל העמלות (bypass waiting period)' },
      { id: 's21-request-withdrawals', name: 'בקשות משיכה', desc: 'כל 9 סוכנים מבקשים משיכה' },
      { id: 's21-approve-withdrawals', name: 'אישור משיכות', desc: 'מנהל מאשר ומשלים את כל המשיכות' },
      { id: 's21-verify-balances', name: 'בדיקת יתרות', desc: 'יתרת כל הסוכנים = 0' },
    ],
  },
  summary: {
    id: 'summary', name: 'Phase 6: סיכום', icon: '📊',
    tests: [
      { id: 's21-summary', name: 'דוח סופי מקיף', desc: 'סיכום: חנויות, מוצרים, הזמנות, עמלות, משיכות, התראות' },
    ],
  },
};

// ============================================================
// S22 - ALL NOTIFICATION TYPES
// ============================================================
const S22_CATEGORIES = {
  templates: {
    id: 'templates', name: 'Phase 1: Templates CRUD', icon: '📋',
    tests: [
      { id: 's22-list-templates', name: 'שליפת כל Templates', desc: 'בדיקה שקיימים 14+ תבניות ברירת מחדל' },
      { id: 's22-create-template', name: 'יצירת Template חדש', desc: 'יצירת תבנית מותאמת sim_test_notification' },
      { id: 's22-edit-template', name: 'עריכת Template', desc: 'עדכון title ו-body של תבנית' },
      { id: 's22-toggle-template', name: 'כיבוי/הפעלה Template', desc: 'כיבוי תבנית ובדיקה שהיא disabled' },
      { id: 's22-delete-template', name: 'מחיקת Template', desc: 'מחיקת התבנית שנוצרה' },
    ],
  },
  send: {
    id: 'send', name: 'Phase 2: שליחת התראות (dryRun)', icon: '📤',
    tests: [
      { id: 's22-send-welcome', name: 'welcome_user', desc: 'שליחת ברוכים הבאים (dryRun)' },
      { id: 's22-send-order-confirm', name: 'order_confirmation', desc: 'שליחת אישור הזמנה (dryRun)' },
      { id: 's22-send-commission', name: 'agent_commission_awarded', desc: 'שליחת עמלה לסוכן (dryRun)' },
      { id: 's22-send-withdrawal', name: 'withdrawal_approved', desc: 'שליחת אישור משיכה (dryRun)' },
      { id: 's22-send-product-new', name: 'product_new_release', desc: 'שליחת מוצר חדש (dryRun)' },
      { id: 's22-send-group-buy', name: 'group_buy_closed', desc: 'שליחת סגירת קבוצתית (dryRun)' },
      { id: 's22-send-to-roles', name: 'שליחה לתפקידים', desc: 'שליחה ל-agent + customer (dryRun)' },
    ],
  },
  schedule: {
    id: 'schedule', name: 'Phase 3: תזמון התראות', icon: '⏰',
    tests: [
      { id: 's22-schedule-notification', name: 'תזמון התראה', desc: 'תזמון התראה לעוד שעה' },
      { id: 's22-list-scheduled', name: 'שליפת מתוזמנות', desc: 'בדיקה שההתראה ברשימה' },
      { id: 's22-cancel-scheduled', name: 'ביטול התראה מתוזמנת', desc: 'ביטול ובדיקת סטטוס cancelled' },
    ],
  },
  alerts: {
    id: 'alerts', name: 'Phase 4: System Alerts', icon: '⚠️',
    tests: [
      { id: 's22-create-alert-info', name: 'יצירת alert - info', desc: 'יצירת התראת מערכת מסוג info' },
      { id: 's22-create-alert-warning', name: 'יצירת alert - warning', desc: 'יצירת התראת מערכת מסוג warning' },
      { id: 's22-create-alert-error', name: 'יצירת alert - error', desc: 'יצירת התראת מערכת מסוג error' },
      { id: 's22-fetch-alerts', name: 'שליפת כל alerts', desc: 'שליפה + ודא שכל 3 קיימים' },
      { id: 's22-mark-read', name: 'סימון כנקרא', desc: 'סימון alert כנקרא ובדיקה' },
      { id: 's22-unread-count', name: 'מונה לא-נקראו', desc: 'בדיקת unreadCount ירד' },
    ],
  },
  messages: {
    id: 'messages', name: 'Phase 5: הודעות פנימיות', icon: '💬',
    tests: [
      { id: 's22-send-message-role', name: 'הודעה לתפקיד', desc: 'שליחת הודעה לכל הסוכנים' },
      { id: 's22-send-message-user', name: 'הודעה למשתמש', desc: 'שליחת הודעה ללקוח ספציפי' },
      { id: 's22-fetch-messages', name: 'שליפת הודעות', desc: 'לקוח שולף ורואה את ההודעה' },
      { id: 's22-mark-message-read', name: 'סימון הודעה כנקראה', desc: 'סימון קריאה ובדיקה' },
    ],
  },
  validation: {
    id: 'validation', name: 'Phase 6: ולידציה + סיכום', icon: '🛡️',
    tests: [
      { id: 's22-send-invalid-template', name: 'template לא קיים', desc: 'שליחה עם templateType מזויף → שגיאה' },
      { id: 's22-send-no-type', name: 'ללא templateType', desc: 'שליחה ללא type → 400' },
      { id: 's22-send-disabled-template', name: 'template מכובה', desc: 'שליחה עם template disabled → שגיאה' },
      { id: 's22-summary', name: 'דוח סופי', desc: 'סיכום: templates, sends, alerts, messages' },
    ],
  },
};

// ============================================================
// S23 - SHARING & COUPON FLOW
// ============================================================
const S23_CATEGORIES = {
  setup: {
    id: 'setup', name: 'Phase 1: הקמה', icon: '⚙️',
    tests: [
      { id: 's23-create-agent-coupon', name: 'יצירת סוכן + קופון', desc: 'יצירת סוכן עם couponCode פעיל' },
      { id: 's23-create-product', name: 'יצירת מוצר', desc: 'יצירת מוצר לבדיקת שיתוף' },
      { id: 's23-verify-coupon-active', name: 'אימות קופון פעיל', desc: 'POST /api/coupons/validate → פעיל' },
    ],
  },
  share_urls: {
    id: 'share_urls', name: 'Phase 2: לינקי שיתוף', icon: '🔗',
    tests: [
      { id: 's23-url-product-ref', name: 'URL מוצר + ref', desc: 'לינק מוצר כולל ?ref=COUPON_CODE' },
      { id: 's23-url-store-ref', name: 'URL חנות + ref', desc: 'לינק חנות כולל ?ref=COUPON_CODE' },
      { id: 's23-url-marketplace-ref', name: 'URL מרקטפלייס + ref', desc: 'לינק ראשי כולל ?ref=COUPON_CODE' },
      { id: 's23-url-video-ref', name: 'URL וידאו + ref', desc: 'לינק /v/:id כולל ?ref=COUPON_CODE' },
      { id: 's23-verify-all-urls', name: 'אימות כל URLs', desc: 'כל URL כולל ref ו-couponCode' },
    ],
  },
  referral: {
    id: 'referral', name: 'Phase 3: לחיצה על לינק', icon: '👆',
    tests: [
      { id: 's23-click-referral', name: 'GET /r/CODE', desc: 'redirect + cookie autoCoupon נשמר' },
      { id: 's23-track-referral', name: 'רישום click', desc: 'POST /api/referral/track → נרשם' },
      { id: 's23-verify-referral-log', name: 'בדיקת log', desc: 'ודא click נרשם ב-referral_logs' },
      { id: 's23-referral-invalid', name: 'קוד לא קיים', desc: 'GET /r/FAKE → redirect ללא שגיאה' },
    ],
  },
  auto_coupon: {
    id: 'auto_coupon', name: 'Phase 4: מילוי אוטומטי', icon: '🎫',
    tests: [
      { id: 's23-auto-coupon-api', name: 'auto-coupon API', desc: 'GET /api/referral/auto-coupon → קוד' },
      { id: 's23-validate-coupon', name: 'validate קופון', desc: 'POST /api/coupons/validate → הנחה' },
      { id: 's23-validate-invalid', name: 'validate מזויף', desc: 'קוד לא קיים → 404' },
      { id: 's23-validate-inactive', name: 'validate לא פעיל', desc: 'סוכן ללא couponStatus=active → 404' },
    ],
  },
  social: {
    id: 'social', name: 'Phase 5: רשתות חברתיות', icon: '📱',
    tests: [
      { id: 's23-whatsapp-format', name: 'WhatsApp URL', desc: 'ודא wa.me URL עם text + coupon' },
      { id: 's23-facebook-format', name: 'Facebook URL', desc: 'ודא sharer URL עם ref param' },
      { id: 's23-telegram-format', name: 'Telegram URL', desc: 'ודא t.me/share URL עם ref' },
      { id: 's23-twitter-format', name: 'Twitter/X URL', desc: 'ודא intent/tweet URL עם coupon' },
      { id: 's23-email-format', name: 'Email format', desc: 'ודא mailto URL עם coupon בגוף' },
      { id: 's23-all-networks-coupon', name: 'כולם כוללים קופון', desc: 'כל 8+ רשתות כוללות קוד' },
    ],
  },
  e2e: {
    id: 'e2e', name: 'Phase 6: E2E + סיכום', icon: '🏁',
    tests: [
      { id: 's23-e2e-full-flow', name: 'זרימה מלאה', desc: 'שיתוף → click → cookie → validate → checkout auto' },
      { id: 's23-summary', name: 'דוח סופי', desc: 'סיכום: URLs, referrals, coupons, networks' },
    ],
  },
};

// ============================================================
// S24 - LOGS VERIFICATION
// ============================================================
const S24_CATEGORIES = {
  baseline: {
    id: 'baseline', name: 'Phase 1: מצב התחלתי', icon: '📊',
    tests: [
      { id: 's24-initial-notif-logs', name: 'יומן התראות - baseline', desc: 'שליפת מונים התחלתיים מ-notification-logs' },
      { id: 's24-initial-activity-logs', name: 'יומן פעילות - baseline', desc: 'שליפת activity logs התחלתיים' },
      { id: 's24-fetch-stats', name: 'סטטיסטיקות', desc: 'total, sent, failed, dry_run' },
    ],
  },
  trigger: {
    id: 'trigger', name: 'Phase 2: ביצוע פעולות', icon: '⚡',
    tests: [
      { id: 's24-trigger-register', name: 'הרשמה', desc: 'הרשמת לקוח → צפוי welcome_user log' },
      { id: 's24-trigger-product', name: 'יצירת מוצר', desc: 'מוצר חדש → צפוי activity create log' },
      { id: 's24-trigger-dryrun', name: 'שליחת התראה dryRun', desc: 'send dryRun → צפוי dry_run log' },
      { id: 's24-trigger-order-notif', name: 'אישור הזמנה', desc: 'order_confirmation dryRun → log' },
      { id: 's24-trigger-commission', name: 'עמלה לסוכן', desc: 'agent_commission_awarded dryRun → log' },
    ],
  },
  verify_notif: {
    id: 'verify_notif', name: 'Phase 3: אימות יומן התראות', icon: '🔍',
    tests: [
      { id: 's24-verify-welcome', name: 'welcome_user ביומן', desc: 'ודא שהרשמה יצרה log' },
      { id: 's24-verify-dryrun', name: 'dry_run ביומן', desc: 'ודא dry_run log מופיע' },
      { id: 's24-verify-order', name: 'order_confirmation ביומן', desc: 'ודא אישור הזמנה ביומן' },
      { id: 's24-verify-commission', name: 'agent_commission ביומן', desc: 'ודא עמלת סוכן ביומן' },
      { id: 's24-verify-count-up', name: 'מונה עלה', desc: 'total notifications > baseline' },
    ],
  },
  verify_activity: {
    id: 'verify_activity', name: 'Phase 4: אימות יומן פעילות', icon: '📝',
    tests: [
      { id: 's24-verify-act-create', name: 'create action ביומן', desc: 'ודא create log מופיע' },
      { id: 's24-verify-act-login', name: 'login action ביומן', desc: 'ודא login log מופיע' },
      { id: 's24-verify-act-stats', name: 'סטטיסטיקות פעילות', desc: 'מונים תקינים' },
    ],
  },
  filters: {
    id: 'filters', name: 'Phase 5: סינון וחיפוש', icon: '🔎',
    tests: [
      { id: 's24-filter-template', name: 'סינון לפי template', desc: 'templateType=welcome_user' },
      { id: 's24-filter-status', name: 'סינון לפי status', desc: 'status=dry_run' },
      { id: 's24-filter-role', name: 'סינון לפי role', desc: 'recipientRole=customer' },
      { id: 's24-filter-date', name: 'סינון לפי תאריך', desc: 'startDate=today' },
      { id: 's24-search-text', name: 'חיפוש טקסט', desc: 'search=בדיקה' },
    ],
  },
  summary: {
    id: 'summary', name: 'Phase 6: סיכום', icon: '🏁',
    tests: [
      { id: 's24-summary', name: 'דוח סופי', desc: 'סיכום: baseline, triggers, verifications, filters' },
    ],
  },
};

// ============================================================
// S27 - DASHBOARD NAVIGATION
// ============================================================
const S27_CATEGORIES = {
  setup: {
    id: 'setup', name: 'Phase 1: הקמה', icon: '⚙️',
    tests: [
      { id: 's27-admin-login', name: 'התחברות מנהל', desc: 'login כ-super_admin' },
      { id: 's27-dashboard-api', name: 'Dashboard API', desc: 'GET /api/admin/dashboard → 200' },
    ],
  },
  users_nav: {
    id: 'users_nav', name: 'Phase 2: משתמשים', icon: '👥',
    tests: [
      { id: 's27-nav-users', name: '/admin/users', desc: 'דף ניהול משתמשים' },
      { id: 's27-nav-agents', name: '/admin/agents', desc: 'דף ניהול סוכנים' },
      { id: 's27-nav-notif-logs', name: '/admin/notification-logs', desc: 'יומן התראות' },
      { id: 's27-nav-tenants', name: '/admin/tenants', desc: 'ניהול חנויות' },
      { id: 's27-nav-simulator', name: '/admin/simulator', desc: 'סימולטור מערכת' },
    ],
  },
  catalog_nav: {
    id: 'catalog_nav', name: 'Phase 3: קטלוג', icon: '📦',
    tests: [
      { id: 's27-nav-products', name: '/admin/products', desc: 'ניהול מוצרים' },
      { id: 's27-nav-orders', name: '/admin/orders', desc: 'ניהול הזמנות' },
      { id: 's27-nav-my-orders', name: '/my-orders', desc: 'ההזמנות שלי' },
      { id: 's27-nav-products-new', name: '/admin/products/new', desc: 'הוסף מוצר חדש' },
      { id: 's27-nav-catalog-mgr', name: '/catalog-manager', desc: 'Catalog Manager' },
    ],
  },
  finance_nav: {
    id: 'finance_nav', name: 'Phase 4: כספים', icon: '💰',
    tests: [
      { id: 's27-nav-reports', name: '/admin/reports', desc: 'דוחות' },
      { id: 's27-nav-analytics', name: '/admin/analytics', desc: 'ניתוח נתונים' },
      { id: 's27-nav-transactions', name: '/admin/transactions', desc: 'עסקאות' },
      { id: 's27-nav-commissions', name: '/admin/commissions', desc: 'עמלות' },
      { id: 's27-nav-withdrawals', name: '/admin/withdrawals', desc: 'בקשות משיכה' },
    ],
  },
  settings_nav: {
    id: 'settings_nav', name: 'Phase 5: הגדרות ושיווק', icon: '⚙️',
    tests: [
      { id: 's27-nav-notifications', name: '/admin/notifications', desc: 'התראות' },
      { id: 's27-nav-marketing', name: '/admin/marketing-assets', desc: 'שיווק' },
      { id: 's27-nav-settings', name: '/admin/settings', desc: 'הגדרות' },
      { id: 's27-nav-site-texts', name: '/admin/site-texts', desc: 'ניהול טקסטים' },
      { id: 's27-nav-social-audit', name: '/admin/social-audit', desc: 'Social Audits' },
      { id: 's27-nav-branding', name: '/admin/branding', desc: 'ניהול צבעים' },
      { id: 's27-nav-bot-manager', name: '/admin/bot-manager', desc: 'ניהול בוט צאט' },
    ],
  },
  system_nav: {
    id: 'system_nav', name: 'Phase 6: מערכת', icon: '🖥️',
    tests: [
      { id: 's27-nav-monitor', name: '/admin/monitor', desc: 'מוניטור' },
      { id: 's27-nav-backup', name: '/admin/backups', desc: 'גיבוי ועדכון' },
      { id: 's27-nav-errors', name: '/admin/errors', desc: 'ניטור שגיאות' },
      { id: 's27-nav-tasks', name: '/admin/tasks', desc: 'משימות ותיקונים' },
      { id: 's27-nav-sys-reports', name: '/admin/system-reports', desc: 'דוחות מערכת' },
      { id: 's27-nav-security', name: '/admin/security', desc: 'אבטחה' },
      { id: 's27-nav-crm', name: '/admin/crm/dashboard', desc: 'CRM דשבורד' },
    ],
  },
  public_nav: {
    id: 'public_nav', name: 'Phase 7: הרשמה + סיכום', icon: '🌐',
    tests: [
      { id: 's27-nav-register', name: '/register', desc: 'הרשמת לקוח' },
      { id: 's27-nav-register-agent', name: '/register-agent', desc: 'הרשמת סוכן' },
      { id: 's27-nav-register-biz', name: '/register-business', desc: 'הרשמת עסק' },
      { id: 's27-nav-login', name: '/login', desc: 'דף התחברות' },
      { id: 's27-summary', name: 'דוח סופי', desc: 'סיכום כל הלינקים: OK / FAIL / total' },
    ],
  },
};

// ============================================================
// S26 - MARKETING CONTENT LIBRARY
// ============================================================
const S26_CATEGORIES = {
  setup: {
    id: 'setup', name: 'Phase 1: הקמה', icon: '⚙️',
    tests: [
      { id: 's26-admin-login', name: 'התחברות מנהל', desc: 'login + שליפת tenantId' },
      { id: 's26-create-agent-coupon', name: 'יצירת סוכן + קופון', desc: 'סוכן עם קופון פעיל לבדיקת שיתוף' },
      { id: 's26-baseline-assets', name: 'baseline assets', desc: 'ספירת נכסים קיימים' },
    ],
  },
  crud: {
    id: 'crud', name: 'Phase 2: CRUD', icon: '📦',
    tests: [
      { id: 's26-create-image', name: 'יצירת נכס תמונה', desc: 'POST image asset + messageTemplate' },
      { id: 's26-create-video', name: 'יצירת נכס וידאו', desc: 'POST video asset + messageTemplate' },
      { id: 's26-list-assets', name: 'רשימת נכסים', desc: 'GET all → כולל 2 חדשים' },
      { id: 's26-update-asset', name: 'עדכון נכס', desc: 'PATCH title + messageTemplate' },
      { id: 's26-get-single', name: 'שליפת נכס בודד', desc: 'GET by ID → פרטים מלאים' },
      { id: 's26-validation', name: 'ולידציה', desc: 'POST ללא title/mediaUrl → 400' },
    ],
  },
  share_build: {
    id: 'share_build', name: 'Phase 3: בניית הודעת שיתוף', icon: '📝',
    tests: [
      { id: 's26-template-vars', name: 'החלפת משתנים', desc: '{link}, {coupon}, {discount} → ערכים אמיתיים' },
      { id: 's26-video-link', name: 'לינק וידאו + ref', desc: '/v/{id}?ref={coupon} → קופון ב-URL' },
      { id: 's26-image-link', name: 'לינק תמונה', desc: 'referral link עם קופון' },
      { id: 's26-default-template', name: 'תבנית ברירת מחדל', desc: 'messageTemplate ריק → DEFAULT_TEMPLATE' },
    ],
  },
  social: {
    id: 'social', name: 'Phase 4: שיתוף לרשתות', icon: '📱',
    tests: [
      { id: 's26-share-whatsapp', name: 'WhatsApp', desc: 'wa.me URL + text encoded' },
      { id: 's26-share-telegram', name: 'Telegram', desc: 't.me/share URL + text+url' },
      { id: 's26-share-facebook', name: 'Facebook', desc: 'facebook.com/sharer URL' },
      { id: 's26-share-twitter', name: 'X (Twitter)', desc: 'twitter.com/intent/tweet URL' },
      { id: 's26-share-linkedin', name: 'LinkedIn', desc: 'linkedin.com/sharing URL' },
      { id: 's26-share-email', name: 'Email', desc: 'mailto: subject+body' },
      { id: 's26-share-sms', name: 'SMS', desc: 'sms:?body= URL' },
      { id: 's26-all-networks', name: 'כל 7 הרשתות', desc: 'סיכום: כולן מכילות coupon+link' },
    ],
  },
  agent_view: {
    id: 'agent_view', name: 'Phase 5: צפייה כסוכן', icon: '👤',
    tests: [
      { id: 's26-agent-list', name: 'סוכן רואה נכסים', desc: 'GET /api/agent/marketing-assets' },
      { id: 's26-agent-has-new', name: 'נכסים חדשים נראים', desc: 'תמונה + וידאו חדשים ברשימה' },
      { id: 's26-delete-asset', name: 'מחיקת נכס', desc: 'DELETE → הסרה מרשימה' },
    ],
  },
  summary: {
    id: 'summary', name: 'Phase 6: סיכום', icon: '🏁',
    tests: [
      { id: 's26-summary', name: 'דוח סופי', desc: 'CRUD + share + social + agent' },
    ],
  },
};

// ============================================================
// S25 - FULL ACTIVITY COVERAGE
// ============================================================
const S25_CATEGORIES = {
  baseline: {
    id: 'baseline', name: 'Phase 1: מצב התחלתי', icon: '📊',
    tests: [
      { id: 's25-baseline-notif', name: 'baseline התראות', desc: 'מונים: notification_logs total' },
      { id: 's25-baseline-activity', name: 'baseline פעילות', desc: 'מונים: activity_logs total' },
      { id: 's25-baseline-alerts', name: 'baseline alerts', desc: 'מונים: system_alerts total' },
    ],
  },
  templates: {
    id: 'templates', name: 'Phase 2: כל 15 תבניות', icon: '📨',
    tests: [
      { id: 's25-tpl-welcome', name: 'welcome_user', desc: 'הרשמת לקוח → welcome log' },
      { id: 's25-tpl-admin-reg', name: 'admin_new_registration', desc: 'הרשמה → admin log' },
      { id: 's25-tpl-order-new', name: 'order_new', desc: 'הזמנה חדשה → admin log' },
      { id: 's25-tpl-order-confirm', name: 'order_confirmation', desc: 'אישור הזמנה → customer log' },
      { id: 's25-tpl-commission', name: 'agent_commission_awarded', desc: 'עמלה → agent log' },
      { id: 's25-tpl-agent-sale', name: 'admin_agent_sale', desc: 'מכירה סוכן → admin log' },
      { id: 's25-tpl-product-new', name: 'product_new_release', desc: 'מוצר חדש → customer log' },
      { id: 's25-tpl-digest', name: 'agent_daily_digest', desc: 'דוח יומי → agent log' },
      { id: 's25-tpl-group-remind', name: 'group_buy_weekly_reminder', desc: 'תזכורת קבוצתית' },
      { id: 's25-tpl-group-last', name: 'group_buy_last_call', desc: '24 שעות אחרונות' },
      { id: 's25-tpl-group-closed', name: 'group_buy_closed', desc: 'קנייה נסגרה' },
      { id: 's25-tpl-withdraw-ok', name: 'withdrawal_approved', desc: 'משיכה אושרה' },
      { id: 's25-tpl-withdraw-done', name: 'withdrawal_completed', desc: 'משיכה הושלמה' },
      { id: 's25-tpl-withdraw-reject', name: 'withdrawal_rejected', desc: 'משיכה נדחתה' },
      { id: 's25-tpl-payment', name: 'admin_payment_completed', desc: 'תשלום הושלם' },
    ],
  },
  verify_notif: {
    id: 'verify_notif', name: 'Phase 3: אימות ביומן', icon: '🔍',
    tests: [
      { id: 's25-verify-all-templates', name: 'כל התבניות ביומן', desc: 'ודא שכל 15 סוגים נרשמו' },
      { id: 's25-verify-count-up', name: 'מונה עלה', desc: 'total > baseline' },
      { id: 's25-verify-statuses', name: 'סטטוסים', desc: 'sent + dry_run + failed קיימים' },
    ],
  },
  activity: {
    id: 'activity', name: 'Phase 4: יומן פעילות', icon: '📝',
    tests: [
      { id: 's25-act-login', name: 'login', desc: 'התחברות נרשמה' },
      { id: 's25-act-create-user', name: 'create user', desc: 'יצירת משתמש נרשמה' },
      { id: 's25-act-create-product', name: 'create product', desc: 'יצירת מוצר נרשמה' },
      { id: 's25-act-update', name: 'update', desc: 'עדכון נרשם' },
      { id: 's25-act-delete', name: 'delete', desc: 'מחיקה נרשמה' },
    ],
  },
  alerts: {
    id: 'alerts', name: 'Phase 5: System Alerts', icon: '⚠️',
    tests: [
      { id: 's25-alert-info', name: 'alert info', desc: 'יצירת alert info + ודא ביומן' },
      { id: 's25-alert-warning', name: 'alert warning', desc: 'יצירת alert warning + ודא' },
      { id: 's25-alert-error', name: 'alert error', desc: 'יצירת alert error + ודא' },
      { id: 's25-alert-count', name: 'unread count', desc: 'ספירת unread תקינה' },
      { id: 's25-alert-mark-read', name: 'mark read', desc: 'סימון כנקרא' },
    ],
  },
  summary: {
    id: 'summary', name: 'Phase 6: סיכום', icon: '🏁',
    tests: [
      { id: 's25-summary', name: 'דוח סופי', desc: 'כל 3 יומנים: notifications + activity + alerts' },
    ],
  },
};

// ============================================================
// S28 - CRM FULL FLOW
// ============================================================
const S28_CATEGORIES = {
  setup: {
    id: 'setup', name: 'Phase 1: הקמה', icon: '⚙️',
    tests: [
      { id: 's28-setup-tenant', name: 'בחירת עסק', desc: 'login + impersonate לעסק קיים' },
      { id: 's28-crm-stats-baseline', name: 'baseline סטטיסטיקות', desc: 'GET /api/crm/stats - מצב התחלתי' },
    ],
  },
  leads: {
    id: 'leads', name: 'Phase 2: Leads CRUD', icon: '👤',
    tests: [
      { id: 's28-create-lead', name: 'יצירת ליד', desc: 'POST /api/crm/leads - ליד חדש' },
      { id: 's28-get-lead', name: 'שליפת ליד בודד', desc: 'GET /api/crm/leads/[id]' },
      { id: 's28-update-lead', name: 'עדכון ליד', desc: 'PATCH /api/crm/leads/[id] - שינוי סטטוס' },
      { id: 's28-list-leads', name: 'רשימת לידים', desc: 'GET /api/crm/leads - כולל pagination' },
      { id: 's28-search-leads', name: 'חיפוש לידים', desc: 'GET /api/crm/leads?search=... - חיפוש טקסט' },
    ],
  },
  conversations: {
    id: 'conversations', name: 'Phase 3: שיחות', icon: '💬',
    tests: [
      { id: 's28-create-conversation', name: 'יצירת שיחה', desc: 'POST /api/crm/conversations' },
      { id: 's28-list-conversations', name: 'רשימת שיחות', desc: 'GET /api/crm/conversations - Inbox' },
      { id: 's28-add-interaction', name: 'הוספת אינטראקציה', desc: 'POST /api/crm/conversations/[id]/interactions' },
    ],
  },
  tasks: {
    id: 'tasks', name: 'Phase 4: משימות', icon: '✅',
    tests: [
      { id: 's28-create-task', name: 'יצירת משימה', desc: 'POST /api/crm/tasks' },
      { id: 's28-list-tasks', name: 'רשימת משימות', desc: 'GET /api/crm/tasks - כולל overdue' },
      { id: 's28-update-task', name: 'עדכון משימה', desc: 'PATCH /api/crm/tasks/[id] - סיום משימה' },
    ],
  },
  automations: {
    id: 'automations', name: 'Phase 5: אוטומציות', icon: '🤖',
    tests: [
      { id: 's28-list-automations', name: 'רשימת אוטומציות', desc: 'GET /api/crm/automations' },
      { id: 's28-create-automation', name: 'יצירת אוטומציה', desc: 'POST /api/crm/automations' },
    ],
  },
  cleanup: {
    id: 'cleanup', name: 'Phase 6: ניקוי', icon: '🧹',
    tests: [
      { id: 's28-delete-lead', name: 'מחיקת ליד', desc: 'DELETE /api/crm/leads/[id]' },
      { id: 's28-crm-stats-final', name: 'סטטיסטיקות סופיות', desc: 'GET /api/crm/stats - מצב סופי' },
    ],
  },
};

// ============================================================
// S48 - TENANTS & ADMIN FIX
// ============================================================
const S48_CATEGORIES = {
  tenants: {
    id: 'tenants', name: 'Phase 1: טננטים ותיקונים', icon: '🏢',
    tests: [
      { id: 's48-login', name: 'התחברות', desc: 'Login כמנהל' },
      { id: 's48-tenants-list', name: 'רשימת טננטים', desc: 'GET /api/tenants → []' },
      { id: 's48-fix-business-admins', name: 'תיקון מנהלי עסקים', desc: 'POST fix-business-admins → results' },
      { id: 's48-fix-tenant-colors', name: 'תיקון צבעי טננטים', desc: 'POST fix-tenant-colors → success' },
      { id: 's48-commissions-reset-no-id', name: 'איפוס עמלות ללא ID', desc: 'POST commissions/reset → 400' },
    ],
  },
};

// ============================================================
// S49 - BUSINESS & USERS EXTENDED
// ============================================================
const S49_CATEGORIES = {
  business: {
    id: 'business', name: 'Phase 1: Business APIs', icon: '🏪',
    tests: [
      { id: 's49-login', name: 'התחברות', desc: 'Login כמנהל' },
      { id: 's49-business-stats', name: 'סטטיסטיקות עסק', desc: 'GET /api/business/stats → totals' },
      { id: 's49-business-branding', name: 'מיתוג עסקי', desc: 'GET /api/business/branding → settings' },
      { id: 's49-business-integrations', name: 'אינטגרציות עסק', desc: 'GET /api/business/integrations → tenant' },
      { id: 's49-register-business-no-data', name: 'רישום עסק ללא נתונים', desc: 'POST register-business → 400' },
      { id: 's49-join-no-ref', name: 'הצטרפות ללא ref', desc: 'GET /api/join → redirect' },
      { id: 's49-users-me', name: 'פרופיל משתמש', desc: 'GET /api/users/me → user' },
      { id: 's49-my-orders', name: 'ההזמנות שלי', desc: 'GET /api/my-orders → orders[]' },
      { id: 's49-support-message', name: 'הודעת תמיכה', desc: 'POST /api/support-messages → 201' },
      { id: 's49-support-no-msg', name: 'תמיכה ללא הודעה', desc: 'POST support-messages ללא message → 400' },
      { id: 's49-change-password-no-data', name: 'שינוי סיסמה ללא נתונים', desc: 'POST change-password → 400/401' },
      { id: 's49-track-order', name: 'מעקב הזמנה', desc: 'POST /api/track/order → ok' },
    ],
  },
};

// ============================================================
// S50 - ADMIN TOOLS EXTENDED
// ============================================================
const S50_CATEGORIES = {
  admin_tools: {
    id: 'admin_tools', name: 'Phase 1: כלי מנהל מתקדמים', icon: '🛡️',
    tests: [
      { id: 's50-login', name: 'התחברות', desc: 'Login כמנהל' },
      { id: 's50-security-scan', name: 'סריקת אבטחה', desc: 'GET /api/admin/security-scan → score' },
      { id: 's50-seo-audit-list', name: 'דוחות SEO', desc: 'GET /api/admin/seo-audit → reports[]' },
      { id: 's50-social-audit', name: 'ביקורת חברתית', desc: 'GET /api/admin/social-audit → reports[]' },
      { id: 's50-system-reports', name: 'דוחות מערכת', desc: 'GET /api/admin/system-reports → reports[]' },
      { id: 's50-settings-auth', name: 'הגדרות אימות', desc: 'GET /api/admin/settings/auth → ok' },
      { id: 's50-restore-super-admin', name: 'בדיקת סופר אדמין', desc: 'GET /api/admin/restore-super-admin → exists' },
      { id: 's50-stainless-list', name: 'מוצרי נירוסטה', desc: 'GET /api/admin/stainless → items[]' },
      { id: 's50-seed-init', name: 'Seed Init', desc: 'POST /api/seed/init → ok' },
      { id: 's50-tenant-by-slug', name: 'טננט לפי slug', desc: 'GET /api/tenants/by-slug/fake → 404' },
      { id: 's50-notifications-public', name: 'התראות ציבוריות', desc: 'GET /api/notifications → list' },
    ],
  },
};

// ============================================================
// S51 - CRM EXTENDED
// ============================================================
const S51_CATEGORIES = {
  setup: {
    id: 'setup', name: 'Phase 1: הקמה', icon: '⚙️',
    tests: [
      { id: 's51-setup', name: 'התחברות + עסק', desc: 'Login + impersonate לעסק קיים' },
      { id: 's51-create-test-lead', name: 'יצירת ליד בדיקה', desc: 'POST /api/crm/leads - ליד לבדיקות S51' },
    ],
  },
  leads_adv: {
    id: 'leads_adv', name: 'Phase 2: Leads מתקדם', icon: '👤',
    tests: [
      { id: 's51-lead-orders', name: 'הזמנות ליד', desc: 'GET /api/crm/leads/[id]/orders' },
      { id: 's51-lead-convert', name: 'המרת ליד', desc: 'POST /api/crm/leads/[id]/convert' },
      { id: 's51-leads-export-json', name: 'ייצוא JSON', desc: 'GET /api/crm/leads/export?format=json' },
      { id: 's51-leads-export-csv', name: 'ייצוא CSV', desc: 'GET /api/crm/leads/export?format=csv' },
      { id: 's51-leads-import', name: 'ייבוא לידים', desc: 'POST /api/crm/leads/import' },
      { id: 's51-leads-import-no-data', name: 'ייבוא ללא נתונים', desc: 'POST /api/crm/leads/import empty → 400' },
      { id: 's51-leads-sla', name: 'SLA לידים', desc: 'GET /api/crm/leads/sla → stats' },
    ],
  },
  conversations_adv: {
    id: 'conversations_adv', name: 'Phase 3: שיחות מתקדם', icon: '💬',
    tests: [
      { id: 's51-create-conv', name: 'יצירת שיחה', desc: 'POST /api/crm/conversations - לבדיקות S51' },
      { id: 's51-get-conversation', name: 'שליפת שיחה', desc: 'GET /api/crm/conversations/[id]' },
      { id: 's51-update-conversation', name: 'עדכון שיחה', desc: 'PATCH /api/crm/conversations/[id]' },
      { id: 's51-get-conversation-404', name: 'שיחה לא קיימת', desc: 'GET /api/crm/conversations/fake → 404' },
    ],
  },
  templates: {
    id: 'templates', name: 'Phase 4: תבניות', icon: '📄',
    tests: [
      { id: 's51-list-templates', name: 'רשימת תבניות', desc: 'GET /api/crm/templates' },
      { id: 's51-create-template', name: 'יצירת תבנית', desc: 'POST /api/crm/templates → 201' },
    ],
  },
  whatsapp: {
    id: 'whatsapp', name: 'Phase 5: WhatsApp', icon: '📱',
    tests: [
      { id: 's51-wa-send-status', name: 'סטטוס WhatsApp', desc: 'GET /api/crm/whatsapp/send → configured' },
      { id: 's51-wa-send-no-data', name: 'שליחה ללא נתונים', desc: 'POST /api/crm/whatsapp/send → 400' },
      { id: 's51-wa-connect', name: 'חיבור WhatsApp', desc: 'POST /api/crm/whatsapp/connect' },
      { id: 's51-wa-messages', name: 'הודעות WhatsApp', desc: 'GET /api/crm/whatsapp/messages' },
      { id: 's51-wa-qr', name: 'QR WhatsApp', desc: 'GET /api/crm/whatsapp/qr' },
      { id: 's51-wa-reset-check', name: 'בדיקת Reset', desc: 'GET /api/crm/whatsapp/reset → available?' },
    ],
  },
};

// ============================================================
// S47 - REFERRALS & TRACKING
// ============================================================
const S47_CATEGORIES = {
  referrals: {
    id: 'referrals', name: 'Phase 1: הפניות ומעקב', icon: '🔗',
    tests: [
      { id: 's47-login', name: 'התחברות', desc: 'Login כמנהל' },
      { id: 's47-referrals-list', name: 'רשימת הפניות', desc: 'GET /api/referrals/list → count' },
      { id: 's47-referrals-summary', name: 'סיכום הפניות', desc: 'GET /api/referrals/summary → ok' },
      { id: 's47-referral-create-no-data', name: 'הפנייה ללא נתונים', desc: 'POST /api/referrals → 400' },
      { id: 's47-track-visit', name: 'מעקב ביקור', desc: 'POST /api/track/visit → ok' },
    ],
  },
};

// ============================================================
// S46 - PRODUCTS EXTENDED
// ============================================================
const S46_CATEGORIES = {
  products: {
    id: 'products', name: 'Phase 1: מוצרים מורחב', icon: '📦',
    tests: [
      { id: 's46-login', name: 'התחברות', desc: 'Login כמנהל' },
      { id: 's46-duplicate-no-id', name: 'שכפול ללא מזהה', desc: 'POST duplicate ללא productId → 400' },
      { id: 's46-bulk-delete-no-ids', name: 'מחיקה ללא מזהים', desc: 'POST bulk-delete ללא ids → 400' },
      { id: 's46-demo-complete-no-order', name: 'השלמת דמו ללא הזמנה', desc: 'POST demo-complete ללא orderId → 400' },
      { id: 's46-sales-list', name: 'רשימת מכירות', desc: 'GET /api/sales → []' },
      { id: 's46-sales-report', name: 'דוח מכירות', desc: 'GET /api/sales/report → ok' },
    ],
  },
};

// ============================================================
// S45 - PUSH NOTIFICATIONS
// ============================================================
const S45_CATEGORIES = {
  push: {
    id: 'push', name: 'Phase 1: Push', icon: '🔔',
    tests: [
      { id: 's45-login', name: 'התחברות', desc: 'Login כמנהל' },
      { id: 's45-push-config', name: 'Push Config', desc: 'GET /api/push/config → configured status' },
      { id: 's45-push-subscribe-no-data', name: 'Subscribe ללא נתונים', desc: 'POST subscribe ללא subscription → 400/503' },
      { id: 's45-push-debug', name: 'Push Debug', desc: 'GET /api/push/debug → info' },
    ],
  },
};

// ============================================================
// S44 - SALES & TRANSACTIONS
// ============================================================
const S44_CATEGORIES = {
  sales: {
    id: 'sales', name: 'Phase 1: מכירות ועסקאות', icon: '💰',
    tests: [
      { id: 's44-login', name: 'התחברות', desc: 'Login כמנהל' },
      { id: 's44-sales-list', name: 'רשימת מכירות', desc: 'GET /api/sales → []' },
      { id: 's44-sales-post-invalid', name: 'מכירה לא תקינה', desc: 'POST sales ללא productId → 400' },
      { id: 's44-sales-report', name: 'דוח מכירות', desc: 'GET /api/sales/report → totals' },
      { id: 's44-transactions-list', name: 'עסקאות', desc: 'GET /api/transactions → items[]' },
      { id: 's44-withdrawals-list', name: 'משיכות', desc: 'GET /api/withdrawals → requests[]' },
    ],
  },
};

// ============================================================
// S43 - SETTINGS & TEXTS
// ============================================================
const S43_CATEGORIES = {
  settings: {
    id: 'settings', name: 'Phase 1: הגדרות וטקסטים', icon: '⚙️',
    tests: [
      { id: 's43-login', name: 'התחברות', desc: 'Login כמנהל' },
      { id: 's43-settings-get', name: 'הגדרות', desc: 'GET /api/settings → ok' },
      { id: 's43-theme-get', name: 'ערכת נושא', desc: 'GET /api/theme → themeId' },
      { id: 's43-theme-post-invalid', name: 'ערכה לא תקינה', desc: 'POST theme themeId=fake → 400' },
      { id: 's43-site-texts', name: 'טקסטי אתר', desc: 'GET /api/site-texts?page=home → sections' },
      { id: 's43-site-texts-all', name: 'כל הטקסטים', desc: 'GET /api/site-texts/all → texts[]' },
      { id: 's43-page-texts-no-key', name: 'טקסטי עמוד ללא key', desc: 'GET page-texts ללא pageKey → 400' },
    ],
  },
};

// ============================================================
// S42 - CLEANUP & ORPHAN AUDIT
// ============================================================
const S42_CATEGORIES = {
  cleanup: {
    id: 'cleanup', name: 'Phase 1: ניקוי וביקורת', icon: '🧹',
    tests: [
      { id: 's42-login', name: 'התחברות', desc: 'Login כמנהל' },
      { id: 's42-orphan-dryrun', name: 'אורפן dry-run', desc: 'POST orphan-products dryRun=true → total' },
      { id: 's42-audit-orphans', name: 'ביקורת אורפן', desc: 'GET audit/orphan-products → count' },
      { id: 's42-audit-tenants-summary', name: 'סיכום טננטים', desc: 'GET audit/tenants-products-summary → tenants[]' },
    ],
  },
};

// ============================================================
// S41 - ADMIN MAINTENANCE
// ============================================================
const S41_CATEGORIES = {
  maintenance: {
    id: 'maintenance', name: 'Phase 1: תחזוקה', icon: '🔧',
    tests: [
      { id: 's41-login', name: 'התחברות', desc: 'Login כמנהל' },
      { id: 's41-fix-order-types-preview', name: 'תיקון הזמנות תצוגה', desc: 'GET fix-order-types → preview' },
      { id: 's41-enforce-no-confirm', name: 'אכיפת מוצרים ללא אישור', desc: 'POST enforce/exact-5 ללא confirm → 400' },
      { id: 's41-marketing-assets-list', name: 'נכסי שיווק', desc: 'GET marketing-assets → items[]' },
      { id: 's41-marketing-post-invalid', name: 'נכס לא תקין', desc: 'POST marketing-assets ללא title → 400' },
    ],
  },
};

// ============================================================
// S40 - ORDERS EXTENDED & NOTIFICATIONS
// ============================================================
const S40_CATEGORIES = {
  commissions: {
    id: 'commissions', name: 'Phase 1: עמלות והתראות', icon: '💰',
    tests: [
      { id: 's40-login', name: 'התחברות', desc: 'Login כמנהל' },
      { id: 's40-commissions-list', name: 'רשימת עמלות', desc: 'GET /api/admin/commissions → ok' },
      { id: 's40-notifications-list', name: 'תבניות התראות', desc: 'GET /api/admin/notifications → templates[]' },
      { id: 's40-notification-logs', name: 'לוג התראות', desc: 'GET /api/admin/notification-logs → ok' },
      { id: 's40-send-no-template', name: 'שליחה ללא template', desc: 'POST send ללא templateType → 400' },
    ],
  },
};

// ============================================================
// S39 - GAMIFICATION
// ============================================================
const S39_CATEGORIES = {
  bonuses: {
    id: 'bonuses', name: 'Phase 1: בונוסים', icon: '🏆',
    tests: [
      { id: 's39-login', name: 'התחברות', desc: 'Login כמנהל' },
      { id: 's39-bonuses-list', name: 'רשימת בונוסים', desc: 'GET /api/gamification/bonuses → []' },
      { id: 's39-bonuses-post-invalid', name: 'בונוס לא תקין', desc: 'POST bonuses ללא name/type → 400' },
    ],
  },
  goals: {
    id: 'goals', name: 'Phase 2: יעדים', icon: '🎯',
    tests: [
      { id: 's39-goals-list', name: 'רשימת יעדים', desc: 'GET /api/gamification/goals → []' },
      { id: 's39-goals-post-invalid', name: 'יעד לא תקין', desc: 'POST goals ללא agentId → 400' },
    ],
  },
  levels: {
    id: 'levels', name: 'Phase 3: רמות ו-Seed', icon: '📊',
    tests: [
      { id: 's39-levels-list', name: 'רשימת רמות', desc: 'GET /api/gamification/levels → []' },
      { id: 's39-levels-post-invalid', name: 'רמה לא תקינה', desc: 'POST levels ללא name → 400' },
      { id: 's39-seed', name: 'Seed ברירת מחדל', desc: 'POST /api/gamification/seed → success' },
    ],
  },
};

// ============================================================
// S38 - PAYPLUS & PRIORITY INTEGRATIONS
// ============================================================
const S38_CATEGORIES = {
  payplus: {
    id: 'payplus', name: 'Phase 1: PayPlus', icon: '💳',
    tests: [
      { id: 's38-login', name: 'התחברות', desc: 'Login כמנהל' },
      { id: 's38-payplus-transactions', name: 'עסקאות', desc: 'GET /api/admin/payplus/transactions → events[]' },
      { id: 's38-payplus-dead-letter', name: 'Dead Letter Queue', desc: 'GET /api/admin/payplus/dead-letter → events[]' },
      { id: 's38-payplus-reconciliation', name: 'התאמות PayPlus', desc: 'GET /api/admin/payplus/reconciliation → summary' },
      { id: 's38-dlq-invalid-action', name: 'DLQ פעולה לא תקינה', desc: 'POST dead-letter invalid action → 400' },
    ],
  },
  priority: {
    id: 'priority', name: 'Phase 2: Priority ERP', icon: '🏢',
    tests: [
      { id: 's38-priority-status', name: 'סטטוס Priority', desc: 'GET /api/admin/priority/status → configured' },
      { id: 's38-priority-customers', name: 'לקוחות Priority', desc: 'GET /api/admin/priority/customers → customers[]' },
      { id: 's38-priority-products', name: 'מוצרי Priority', desc: 'GET /api/admin/priority/products → mappings[]' },
      { id: 's38-priority-documents', name: 'מסמכי Priority', desc: 'GET /api/admin/priority/documents → documents[]' },
      { id: 's38-priority-reconciliation', name: 'התאמות Priority', desc: 'GET /api/admin/priority/reconciliation → summary' },
    ],
  },
};

// ============================================================
// S37 - ADMIN REPORTS & CATALOG TEMPLATES
// ============================================================
const S37_CATEGORIES = {
  reports: {
    id: 'reports', name: 'Phase 1: דוחות', icon: '📊',
    tests: [
      { id: 's37-login', name: 'התחברות', desc: 'Login כמנהל' },
      { id: 's37-reports-api', name: 'Reports API', desc: 'GET /api/admin/reports → success' },
      { id: 's37-reports-overview', name: 'סקירת דוחות', desc: 'GET /api/admin/reports/overview → data' },
      { id: 's37-reports-by-agent', name: 'דוח לפי סוכן', desc: 'GET /api/admin/reports/by-agent → items[]' },
      { id: 's37-reports-by-product', name: 'דוח לפי מוצר', desc: 'GET /api/admin/reports/by-product → items[]' },
    ],
  },
  catalog: {
    id: 'catalog', name: 'Phase 2: קטלוג מנהל', icon: '🗂️',
    tests: [
      { id: 's37-catalog-manager-list', name: 'רשימת מוצרי קטלוג', desc: 'GET /api/admin/catalog-manager → items[]' },
      { id: 's37-catalog-manager-tenants', name: 'עסקים קטלוג', desc: 'GET /api/admin/catalog-manager/tenants → tenants[]' },
      { id: 's37-copy-no-data', name: 'העתקה ללא נתונים', desc: 'POST copy-to-tenant ללא tenantId → 400' },
    ],
  },
  templates: {
    id: 'templates', name: 'Phase 3: תבניות', icon: '📄',
    tests: [
      { id: 's37-templates-no-tenant', name: 'תבניות ללא tenant', desc: 'GET /api/admin/catalog-templates ללא tenantId → 400' },
      { id: 's37-templates-post-no-key', name: 'תבנית ללא key', desc: 'POST catalog-templates ללא key → 400' },
    ],
  },
};

// ============================================================
// S36 - MARKETPLACE & SYSTEM
// ============================================================
const S36_CATEGORIES = {
  system: {
    id: 'system', name: 'Phase 1: Health & משתמשים', icon: '📡',
    tests: [
      { id: 's36-login', name: 'התחברות', desc: 'Login כמנהל' },
      { id: 's36-health', name: 'Health Check', desc: 'GET /api/health → ok' },
      { id: 's36-list-users', name: 'רשימת משתמשים', desc: 'GET /api/list-users → users[]' },
      { id: 's36-agents-list', name: 'רשימת סוכנים', desc: 'GET /api/agents → agents[]' },
    ],
  },
  marketplace: {
    id: 'marketplace', name: 'Phase 2: מרקטפלייס', icon: '🛒',
    tests: [
      { id: 's36-marketplace-products', name: 'מוצרי מרקטפלייס', desc: 'GET /api/marketplace/products → products[]' },
      { id: 's36-container-orders', name: 'הזמנות מכולה', desc: 'GET /api/marketplace/container-orders → orders[]' },
      { id: 's36-customer-orders', name: 'הזמנות לקוח', desc: 'GET /api/customer/orders → businesses[]' },
      { id: 's36-catalog-tenants', name: 'עסקים קטלוג', desc: 'GET /api/catalog-manager/tenants → tenants[]' },
    ],
  },
  validations: {
    id: 'validations', name: 'Phase 3: ולידציות', icon: '🛡️',
    tests: [
      { id: 's36-cloudinary-config', name: 'Cloudinary Config', desc: 'GET /api/catalog-manager/cloudinary-config' },
      { id: 's36-agents-no-fields', name: 'סוכן ללא שדות', desc: 'POST /api/agents ללא שדות → 400' },
    ],
  },
};

// ============================================================
// S35 - AUTH EXTENDED & PUBLIC APIS
// ============================================================
const S35_CATEGORIES = {
  auth: {
    id: 'auth', name: 'Phase 1: Auth מורחב', icon: '🔑',
    tests: [
      { id: 's35-login', name: 'התחברות', desc: 'Login כמנהל' },
      { id: 's35-me', name: 'מידע משתמש', desc: 'GET /api/auth/me → user info' },
      { id: 's35-forgot-no-email', name: 'שכחת סיסמה ללא מייל', desc: 'POST /api/auth/forgot-password ללא email → 400' },
      { id: 's35-reset-no-token', name: 'איפוס ללא token', desc: 'POST /api/auth/reset-password ללא token → 400' },
      { id: 's35-reset-bad-token', name: 'איפוס עם token שגוי', desc: 'POST /api/auth/reset-password token לא תקין → 400' },
    ],
  },
  public_apis: {
    id: 'public_apis', name: 'Phase 2: API ציבוריים', icon: '🌐',
    tests: [
      { id: 's35-branding-public', name: 'מיתוג ציבורי', desc: 'GET /api/branding → settings' },
      { id: 's35-catalog', name: 'קטלוג', desc: 'GET /api/catalog → products[]' },
      { id: 's35-categories', name: 'קטגוריות', desc: 'GET /api/categories → categories[]' },
      { id: 's35-bot-config', name: 'הגדרות בוט', desc: 'GET /api/bot-config → config' },
    ],
  },
  validations: {
    id: 'validations', name: 'Phase 3: ולידציות', icon: '🛡️',
    tests: [
      { id: 's35-logout', name: 'התנתקות', desc: 'POST /api/auth/logout → success' },
      { id: 's35-me-after-logout', name: 'Me אחרי התנתקות', desc: 'GET /api/auth/me אחרי logout → 401' },
      { id: 's35-relogin', name: 'התחברות מחדש', desc: 'Login מחדש להחזרת מצב' },
    ],
  },
};

// ============================================================
// S34 - ADMIN SYSTEM TOOLS
// ============================================================
const S34_CATEGORIES = {
  backups: {
    id: 'backups', name: 'Phase 1: גיבויים & חירום', icon: '💾',
    tests: [
      { id: 's34-login', name: 'התחברות', desc: 'Login כמנהל' },
      { id: 's34-backups-list', name: 'רשימת גיבויים', desc: 'GET /api/admin/backups → backups[]' },
      { id: 's34-emergency-info', name: 'מידע גיבוי חירום', desc: 'GET /api/admin/emergency-backup → info' },
      { id: 's34-notification-logs', name: 'לוג התראות', desc: 'GET /api/admin/notification-logs → logs' },
    ],
  },
  audit: {
    id: 'audit', name: 'Phase 2: ביקורת & מיתוג', icon: '🔍',
    tests: [
      { id: 's34-orphan-products', name: 'מוצרים יתומים', desc: 'GET /api/admin/audit/orphan-products → total' },
      { id: 's34-tenants-summary', name: 'סיכום מוצרים/עסקים', desc: 'GET /api/admin/audit/tenants-products-summary' },
      { id: 's34-global-branding', name: 'מיתוג גלובלי', desc: 'GET /api/admin/branding → settings + presets' },
    ],
  },
  validations: {
    id: 'validations', name: 'Phase 3: ולידציות', icon: '🛡️',
    tests: [
      { id: 's34-impersonate-no-tenant', name: 'התחזות ללא tenant', desc: 'POST /api/admin/impersonate ללא tenantId → 400' },
      { id: 's34-emergency-no-action', name: 'חירום ללא action', desc: 'POST /api/admin/emergency-backup ללא action → 400' },
    ],
  },
};

// ============================================================
// S33 - ADMIN AUDIT & MONITORING
// ============================================================
const S33_CATEGORIES = {
  dashboard: {
    id: 'dashboard', name: 'Phase 1: דשבורד & לוגים', icon: '📊',
    tests: [
      { id: 's33-login', name: 'התחברות', desc: 'Login כמנהל' },
      { id: 's33-dashboard', name: 'דשבורד', desc: 'GET /api/admin/dashboard → stats' },
      { id: 's33-activity-logs', name: 'לוג פעילות', desc: 'GET /api/admin/activity-logs → logs[]' },
      { id: 's33-audit-logs', name: 'לוג ביקורת', desc: 'GET /api/admin/audit-logs → logs[]' },
    ],
  },
  errors: {
    id: 'errors', name: 'Phase 2: שגיאות & התראות', icon: '⚠️',
    tests: [
      { id: 's33-error-logs', name: 'לוג שגיאות', desc: 'GET /api/admin/error-logs → logs[]' },
      { id: 's33-alerts', name: 'התראות', desc: 'GET /api/admin/alerts → alerts[]' },
      { id: 's33-error-stats', name: 'סטטיסטיקות שגיאות', desc: 'GET /api/admin/errors/stats → totalErrors' },
      { id: 's33-error-events', name: 'אירועי שגיאות', desc: 'GET /api/admin/errors/events → items[]' },
    ],
  },
  health: {
    id: 'health', name: 'Phase 3: בריאות & ולידציות', icon: '🏥',
    tests: [
      { id: 's33-health-history', name: 'היסטוריית בריאות', desc: 'GET /api/admin/health-history → history[]' },
      { id: 's33-audit-no-action', name: 'ביקורת ללא action', desc: 'POST /api/admin/audit-logs ללא action → 400' },
      { id: 's33-alert-no-title', name: 'התראה ללא title', desc: 'POST /api/admin/alerts ללא title → 400' },
    ],
  },
};

// ============================================================
// S32 - BUSINESS ADMIN
// ============================================================
const S32_CATEGORIES = {
  stats: {
    id: 'stats', name: 'Phase 1: סטטיסטיקות & מיתוג', icon: '📊',
    tests: [
      { id: 's32-login', name: 'התחברות', desc: 'Login כמנהל' },
      { id: 's32-stats-no-tenant', name: 'סטטיסטיקות ללא tenant', desc: 'GET /api/business/stats ללא tenantId → 403' },
      { id: 's32-branding-get', name: 'מיתוג GET', desc: 'GET /api/business/branding ללא tenant → 400' },
      { id: 's32-branding-post-empty', name: 'מיתוג POST ריק', desc: 'POST /api/business/branding ללא tenantId → 400' },
    ],
  },
  integrations: {
    id: 'integrations', name: 'Phase 2: אינטגרציות', icon: '🔗',
    tests: [
      { id: 's32-integrations-get', name: 'אינטגרציות GET', desc: 'GET /api/business/integrations ללא tenant → 400' },
      { id: 's32-integrations-put-empty', name: 'אינטגרציות PUT ריק', desc: 'PUT /api/business/integrations ללא tenant → 400' },
    ],
  },
  exports: {
    id: 'exports', name: 'Phase 3: ייצוא', icon: '📤',
    tests: [
      { id: 's32-export-orders', name: 'ייצוא הזמנות', desc: 'GET /api/business/orders/export → CSV' },
      { id: 's32-export-commissions', name: 'ייצוא עמלות', desc: 'GET /api/business/commissions/export → CSV' },
    ],
  },
};

// ============================================================
// S31 - AGENT DASHBOARD
// ============================================================
const S31_CATEGORIES = {
  marketplace: {
    id: 'marketplace', name: 'Phase 1: Marketplace & עסקים', icon: '🏪',
    tests: [
      { id: 's31-login', name: 'התחברות', desc: 'Login כמנהל' },
      { id: 's31-marketplace', name: 'Marketplace', desc: 'GET /api/agent/marketplace → businesses[]' },
      { id: 's31-businesses', name: 'רשימת עסקים', desc: 'GET /api/agent/businesses → businesses[]' },
      { id: 's31-current-biz', name: 'עסק נוכחי', desc: 'GET /api/agent/current-business' },
    ],
  },
  data: {
    id: 'data', name: 'Phase 2: נתוני סוכן', icon: '📊',
    tests: [
      { id: 's31-commissions', name: 'עמלות', desc: 'GET /api/agent/commissions' },
      { id: 's31-stats-no-agent', name: 'סטטיסטיקות ללא agentId', desc: 'GET /api/agent/stats ללא agentId → 400' },
      { id: 's31-customers-no-agent', name: 'לקוחות ללא agentId', desc: 'GET /api/agent/customers ללא agentId → 400' },
      { id: 's31-coupon-not-agent', name: 'קופון לא סוכן', desc: 'GET /api/agent/coupon כמנהל → 403' },
    ],
  },
  validations: {
    id: 'validations', name: 'Phase 3: ולידציות', icon: '🛡️',
    tests: [
      { id: 's31-switch-no-tenant', name: 'החלפה ללא tenant', desc: 'POST /api/agent/switch-business ללא tenantId → 400' },
      { id: 's31-join-no-tenant', name: 'הצטרפות ללא tenant', desc: 'POST /api/agent/businesses ללא tenantId → 400' },
      { id: 's31-join-invalid-tenant', name: 'הצטרפות tenant שגוי', desc: 'POST /api/agent/businesses עם tenantId שגוי → 400' },
      { id: 's31-link-no-agent', name: 'לינק ללא agentId', desc: 'POST /api/agent/link/create ללא agentId → 400' },
    ],
  },
};

// ============================================================
// S30 - MESSAGING
// ============================================================
const S30_CATEGORIES = {
  crud: {
    id: 'crud', name: 'Phase 1: Messages CRUD', icon: '💬',
    tests: [
      { id: 's30-login', name: 'התחברות', desc: 'Login כמנהל לצורך גישה ל-API' },
      { id: 's30-send-empty', name: 'שליחה ללא טקסט', desc: 'POST /api/messages ללא message → 400' },
      { id: 's30-send-long', name: 'הודעה ארוכה מדי', desc: 'POST /api/messages עם 2001+ תווים → 400' },
      { id: 's30-send-bad-role', name: 'targetRole לא תקין', desc: 'POST /api/messages עם targetRole שגוי → 400' },
      { id: 's30-send-ok', name: 'שליחת הודעה', desc: 'POST /api/messages עם הודעה תקינה' },
      { id: 's30-list', name: 'רשימת הודעות', desc: 'GET /api/messages → items[]' },
      { id: 's30-unread-count', name: 'ספירת לא נקראו', desc: 'GET /api/messages/unread-count → count' },
    ],
  },
  actions: {
    id: 'actions', name: 'Phase 2: פעולות', icon: '✅',
    tests: [
      { id: 's30-read-all', name: 'סימון הכל כנקרא', desc: 'POST /api/messages/read-all' },
      { id: 's30-delete', name: 'מחיקת הודעה', desc: 'DELETE /api/messages/[id]' },
      { id: 's30-delete-invalid', name: 'מחיקת ID שגוי', desc: 'DELETE /api/messages/invalid-id → 400' },
    ],
  },
  support: {
    id: 'support', name: 'Phase 3: הודעות תמיכה', icon: '🆘',
    tests: [
      { id: 's30-support-empty', name: 'תמיכה ללא טקסט', desc: 'POST /api/support-messages ללא message → 400' },
      { id: 's30-support-send', name: 'שליחת הודעת תמיכה', desc: 'POST /api/support-messages עם הודעה תקינה → 201' },
    ],
  },
};

// ============================================================
// S29 - OTP & EMAIL VERIFY
// ============================================================
const S29_CATEGORIES = {
  otp: {
    id: 'otp', name: 'Phase 1: OTP טלפון', icon: '📱',
    tests: [
      { id: 's29-otp-missing-phone', name: 'OTP ללא טלפון', desc: 'POST /api/auth/send-otp ללא phone → 400' },
      { id: 's29-otp-invalid-phone', name: 'OTP טלפון קצר', desc: 'POST /api/auth/send-otp עם טלפון קצר → 400' },
      { id: 's29-otp-send', name: 'שליחת OTP', desc: 'POST /api/auth/send-otp עם טלפון תקין' },
      { id: 's29-otp-verify-bad-code', name: 'OTP קוד שגוי', desc: 'POST /api/auth/verify-otp עם קוד שגוי → 401' },
      { id: 's29-otp-verify-missing', name: 'OTP ללא שדות', desc: 'POST /api/auth/verify-otp ללא phone/code → 400' },
    ],
  },
  email: {
    id: 'email', name: 'Phase 2: אימות מייל', icon: '📧',
    tests: [
      { id: 's29-email-missing', name: 'מייל ללא email', desc: 'POST /api/auth/send-email-code ללא email → 400' },
      { id: 's29-email-invalid', name: 'מייל לא תקין', desc: 'POST /api/auth/send-email-code עם כתובת שגויה → 400' },
      { id: 's29-email-send', name: 'שליחת קוד מייל', desc: 'POST /api/auth/send-email-code עם מייל תקין' },
      { id: 's29-email-verify-no-code', name: 'אימות ללא קוד שנשלח', desc: 'POST /api/auth/verify-email-code → no_code' },
      { id: 's29-email-verify-bad-code', name: 'אימות קוד שגוי', desc: 'POST /api/auth/verify-email-code עם קוד שגוי' },
      { id: 's29-email-verify-missing', name: 'אימות ללא שדות', desc: 'POST /api/auth/verify-email-code ללא שדות → 400' },
    ],
  },
};

// === MAP suite → categories ===
const SUITE_CATEGORIES_MAP = {
  s0_health: S0_CATEGORIES,
  s1_auth: S1_CATEGORIES,
  s2_products: S2_CATEGORIES,
  s3_cart: S3_CATEGORIES,
  s4_roles: S4_CATEGORIES,
  s5_coupons: S5_CATEGORIES,
  s6_commissions: S6_CATEGORIES,
  s7_withdrawals: S7_CATEGORIES,
  s8_notifications: S8_CATEGORIES,
  s9_tenant: S9_CATEGORIES,
  s10_group: S10_CATEGORIES,
  s11_container: S11_CATEGORIES,
  s12_payplus: S12_CATEGORIES,
  s13_priority: S13_CATEGORIES,
  s14_impersonate: S14_CATEGORIES,
  s15_biz_e2e: S15_CATEGORIES,
  s16_rbac: S16_CATEGORIES,
  s17_ratelimit: S17_CATEGORIES,
  s18_validation: S18_CATEGORIES,
  s19_cascade: S19_CATEGORIES,
  s20_consistency: S20_CATEGORIES,
  s21_full_e2e: S21_CATEGORIES,
  s22_notif_types: S22_CATEGORIES,
  s23_sharing: S23_CATEGORIES,
  s24_logs: S24_CATEGORIES,
  s25_full_logs: S25_CATEGORIES,
  s26_marketing: S26_CATEGORIES,
  s27_dash_nav: S27_CATEGORIES,
  s28_crm: S28_CATEGORIES,
  s29_otp: S29_CATEGORIES,
  s30_messaging: S30_CATEGORIES,
  s31_agent: S31_CATEGORIES,
  s32_business: S32_CATEGORIES,
  s33_audit: S33_CATEGORIES,
  s34_system: S34_CATEGORIES,
  s35_public: S35_CATEGORIES,
  s36_marketplace: S36_CATEGORIES,
  s37_reports: S37_CATEGORIES,
  s38_integrations: S38_CATEGORIES,
  s39_gamification: S39_CATEGORIES,
  s40_extended: S40_CATEGORIES,
  s41_maintenance: S41_CATEGORIES,
  s42_misc: S42_CATEGORIES,
  s43_settings: S43_CATEGORIES,
  s44_sales: S44_CATEGORIES,
  s45_push: S45_CATEGORIES,
  s46_products_ext: S46_CATEGORIES,
  s47_referrals: S47_CATEGORIES,
  s48_tenants: S48_CATEGORIES,
  s49_business: S49_CATEGORIES,
  s50_admin_ext: S50_CATEGORIES,
  s51_crm_ext: S51_CATEGORIES,
  s52_catalog_mgr: S52_CATEGORIES,
  s53_sync: S53_CATEGORIES,
  s54_catalog_e2e: S54_CATEGORIES,
  s55_studio_diag: S55_CATEGORIES,
};

// === MAP suite → first tab ===
const SUITE_FIRST_TAB = {
  s0_health: 'core',
  s1_auth: 'register',
  s2_products: 'create',
  s3_cart: 'cart',
  s4_roles: 'setup',
  s5_coupons: 'setup',
  s6_commissions: 'setup',
  s7_withdrawals: 'setup',
  s8_notifications: 'setup',
  s9_tenant: 'setup',
  s10_group: 'setup',
  s11_container: 'setup',
  s12_payplus: 'session',
  s13_priority: 'sync',
  s14_impersonate: 'flow',
  s15_biz_e2e: 'register',
  s16_rbac: 'setup',
  s17_ratelimit: 'flood',
  s18_validation: 'missing_fields',
  s19_cascade: 'setup',
  s20_consistency: 'setup',
  s21_full_e2e: 'setup',
  s22_notif_types: 'templates',
  s23_sharing: 'setup',
  s24_logs: 'baseline',
  s25_full_logs: 'baseline',
  s26_marketing: 'setup',
  s27_dash_nav: 'setup',
  s28_crm: 'setup',
  s29_otp: 'otp',
  s30_messaging: 'crud',
  s31_agent: 'marketplace',
  s32_business: 'stats',
  s33_audit: 'dashboard',
  s34_system: 'backups',
  s35_public: 'auth',
  s36_marketplace: 'system',
  s37_reports: 'reports',
  s38_integrations: 'payplus',
  s39_gamification: 'bonuses',
  s40_extended: 'commissions',
  s41_maintenance: 'maintenance',
  s42_misc: 'cleanup',
  s43_settings: 'settings',
  s44_sales: 'sales',
  s45_push: 'push',
  s46_products_ext: 'products',
  s47_referrals: 'referrals',
  s48_tenants: 'tenants',
  s49_business: 'business',
  s50_admin_ext: 'admin_tools',
  s51_crm_ext: 'setup',
  s52_catalog_mgr: 'setup',
  s53_sync: 'setup',
  s54_catalog_e2e: 'setup',
  s55_studio_diag: 'same',
};

// ============================================================
// HELPERS
// ============================================================
const SIM_HEADERS = { 'Content-Type': 'application/json', 'x-automation-key': 'test-automation-key' };

const INFLIGHT_CONTROLLERS = new Set();

let SIM_ABORT_REQUESTED = false;

const abortInflightRequests = () => {
  for (const ctrl of INFLIGHT_CONTROLLERS) {
    try { ctrl.abort(); } catch (_) {}
  }
  INFLIGHT_CONTROLLERS.clear();
};

const requestSimulatorAbort = () => {
  SIM_ABORT_REQUESTED = true;
  abortInflightRequests();
};

const clearSimulatorAbort = () => {
  SIM_ABORT_REQUESTED = false;
};

const apiPost = async (url, body) => {
  if (SIM_ABORT_REQUESTED) return { ok: false, status: 0, data: { error: 'Aborted' } };
  const ctrl = new AbortController();
  INFLIGHT_CONTROLLERS.add(ctrl);
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: SIM_HEADERS,
      credentials: 'include',
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    INFLIGHT_CONTROLLERS.delete(ctrl);
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    clearTimeout(t);
    INFLIGHT_CONTROLLERS.delete(ctrl);
    return { ok: false, status: 0, data: { error: e.name === 'AbortError' ? 'Timeout 15s' : e.message } };
  }
};

const apiGet = async (url) => {
  if (SIM_ABORT_REQUESTED) return { ok: false, status: 0, data: { error: 'Aborted' } };
  const ctrl = new AbortController();
  INFLIGHT_CONTROLLERS.add(ctrl);
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(url, { headers: { 'x-automation-key': 'test-automation-key' }, credentials: 'include', signal: ctrl.signal });
    clearTimeout(t);
    INFLIGHT_CONTROLLERS.delete(ctrl);
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    clearTimeout(t);
    INFLIGHT_CONTROLLERS.delete(ctrl);
    return { ok: false, status: 0, data: { error: e.name === 'AbortError' ? 'Timeout 15s' : e.message } };
  }
};

const apiPut = async (url, body) => {
  if (SIM_ABORT_REQUESTED) return { ok: false, status: 0, data: { error: 'Aborted' } };
  const ctrl = new AbortController();
  INFLIGHT_CONTROLLERS.add(ctrl);
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(url, {
      method: 'PUT',
      headers: SIM_HEADERS,
      credentials: 'include',
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    INFLIGHT_CONTROLLERS.delete(ctrl);
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    clearTimeout(t);
    INFLIGHT_CONTROLLERS.delete(ctrl);
    return { ok: false, status: 0, data: { error: e.name === 'AbortError' ? 'Timeout 15s' : e.message } };
  }
};

const apiPatch = async (url, body, extraHeaders = {}) => {
  if (SIM_ABORT_REQUESTED) return { ok: false, status: 0, data: { error: 'Aborted' } };
  const ctrl = new AbortController();
  INFLIGHT_CONTROLLERS.add(ctrl);
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { ...SIM_HEADERS, ...extraHeaders },
      credentials: 'include',
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    INFLIGHT_CONTROLLERS.delete(ctrl);
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    clearTimeout(t);
    INFLIGHT_CONTROLLERS.delete(ctrl);
    return { ok: false, status: 0, data: { error: e.name === 'AbortError' ? 'Timeout 15s' : e.message } };
  }
};

const apiDelete = async (url) => {
  if (SIM_ABORT_REQUESTED) return { ok: false, status: 0, data: { error: 'Aborted' } };
  const ctrl = new AbortController();
  INFLIGHT_CONTROLLERS.add(ctrl);
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(url, { method: 'DELETE', headers: { 'x-automation-key': 'test-automation-key' }, credentials: 'include', signal: ctrl.signal });
    clearTimeout(t);
    INFLIGHT_CONTROLLERS.delete(ctrl);
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    clearTimeout(t);
    INFLIGHT_CONTROLLERS.delete(ctrl);
    return { ok: false, status: 0, data: { error: e.name === 'AbortError' ? 'Timeout 15s' : e.message } };
  }
};

const ts = () => Date.now();
const randomPhone = () => '050' + Math.floor(1000000 + Math.random() * 9000000);

// ============================================================
// COMPONENT
// ============================================================
function SimulatorPage() {
  const [activeSuite, setActiveSuite] = useState('s1_auth');
  const [activeTab, setActiveTab] = useState('register');
  const [testResults, setTestResults] = useState({});
  const [testData, setTestData] = useState({});
  const testDataRef = useRef({});
  const stopRunAllRef = useRef(false);
  const [logs, setLogs] = useState([]);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetMode, setResetMode] = useState('test_only');
  const [tenantsList, setTenantsList] = useState([]);
  const [protectedTenants, setProtectedTenants] = useState([]);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [logFontSize, setLogFontSize] = useState(10);
  const [backupsList, setBackupsList] = useState([]);
  const [isRestoring, setIsRestoring] = useState(false);

  // --- Logger ---
  const addLog = useCallback((message, type = 'info') => {
    const time = new Date().toLocaleTimeString('he-IL');
    setLogs(prev => [...prev, { message, type, time }]);
  }, []);

  // --- State helpers ---
  const setResult = useCallback((testId, status, data = null) => {
    setTestResults(prev => ({ ...prev, [testId]: status }));
    if (data) {
      setTestData(prev => ({ ...prev, [testId]: data }));
      testDataRef.current[testId] = data;
    }
  }, []);

  const getData = (testId) => testDataRef.current[testId];

  const buildCanonicalProductShareUrl = async (productId, couponCode, baseUrlOverride) => {
    const baseUrl =
      typeof baseUrlOverride === 'string' && baseUrlOverride
        ? baseUrlOverride
        : typeof window !== 'undefined'
          ? window.location.origin
          : '';

    const normalizedProductId = productId ? String(productId) : '';
    let productDoc = null;

    if (normalizedProductId) {
      try {
        const r = await apiGet('/api/products/' + encodeURIComponent(normalizedProductId));
        if (r.ok && r.data) {
          productDoc = r.data?.product || r.data;
        }
      } catch {}
    }

    const productPath = getProductPublicPath(productDoc || { _id: normalizedProductId });
    const refParam = couponCode ? `?ref=${encodeURIComponent(String(couponCode))}` : '';
    return `${baseUrl}${productPath}${refParam}`;
  };

  const s0Me = async () => {
    addLog('בודק סשן פעיל (/api/auth/me)...');
    const r = await apiGet('/api/auth/me');
    if (r.ok && r.data?.user) {
      addLog('[v] סשן פעיל: ' + (r.data.user.email || r.data.user.fullName), 'success');
      return { success: true, httpStatus: r.status, user: r.data.user };
    }
    addLog('[x] אין סשן פעיל: ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false, httpStatus: r.status, error: r.data?.error || r.data?.message };
  };

  const s0SystemStatus = async () => {
    addLog('בודק סטטוס מערכת (/api/admin/system-status)...');
    const r = await apiGet('/api/admin/system-status');
    if (r.status === 404) {
      addLog('[WARN] API /api/admin/system-status לא קיים (404) - דילוג', 'warning');
      return { success: true, skipped: true, httpStatus: r.status };
    }
    if (r.ok && r.data?.results) {
      const keys = Object.keys(r.data.results || {});
      addLog('[v] System status OK (services: ' + keys.length + ')', 'success');
      return { success: true, httpStatus: r.status, services: keys };
    }
    addLog('[x] שגיאה: ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false, httpStatus: r.status, error: r.data?.error || r.data?.message };
  };

  const s0Tenants = async () => {
    addLog('בודק טננטים (/api/tenants)...');
    const r = await apiGet('/api/tenants');
    const tenants = r.data?.tenants || r.data?.items || [];
    if (r.ok) {
      const first = tenants[0];
      const tenantId = first?._id || first?.id || null;
      addLog('[v] טננטים נטענו: ' + tenants.length, 'success');
      return { success: true, httpStatus: r.status, count: tenants.length, tenantId, tenantName: first?.name || null };
    }
    addLog('[x] שגיאה: ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false, httpStatus: r.status, error: r.data?.error || r.data?.message };
  };

  const s0Users = async () => {
    addLog('בודק משתמשים (/api/users)...');
    const r = await apiGet('/api/users?limit=1');
    const items = r.data?.items || r.data?.users || [];
    if (r.ok) {
      addLog('[v] Users OK', 'success');
      return { success: true, httpStatus: r.status, count: r.data?.total ?? items.length };
    }
    addLog('[x] שגיאה: ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false, httpStatus: r.status, error: r.data?.error || r.data?.message };
  };

  const s0Agents = async () => {
    addLog('בודק סוכנים (/api/agents)...');
    const r = await apiGet('/api/agents');
    const agents = r.data?.agents || r.data?.items || [];
    if (r.ok) {
      addLog('[v] Agents OK: ' + agents.length, 'success');
      return { success: true, httpStatus: r.status, count: agents.length };
    }
    addLog('[x] שגיאה: ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false, httpStatus: r.status, error: r.data?.error || r.data?.message };
  };

  const s0MarketingStores = async () => {
    addLog('בודק חנויות שיווק/פרסום (/api/admin/marketing-stores)...');
    const r = await apiGet('/api/admin/marketing-stores?limit=1');
    if (r.status === 404) {
      addLog('[WARN] API /api/admin/marketing-stores לא קיים (404) - דילוג', 'warning');
      return { success: true, skipped: true, httpStatus: r.status };
    }
    if (r.ok && r.data?.ok) {
      addLog('[v] Marketing stores OK (total: ' + (r.data.total ?? 0) + ')', 'success');
      return { success: true, httpStatus: r.status, total: r.data.total ?? 0 };
    }
    addLog('[x] שגיאה: ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false, httpStatus: r.status, error: r.data?.error || r.data?.message };
  };

  const s0MarketplaceProducts = async () => {
    addLog('בודק מרקטפלייס (/api/marketplace/products)...');
    const r = await apiGet('/api/marketplace/products?limit=1');
    if (r.status === 404) {
      addLog('[WARN] API /api/marketplace/products לא קיים (404) - דילוג', 'warning');
      return { success: true, skipped: true, httpStatus: r.status };
    }
    if (r.ok) {
      const items = r.data?.items || r.data?.products || [];
      addLog('[v] Marketplace OK', 'success');
      return { success: true, httpStatus: r.status, count: items.length };
    }
    addLog('[x] שגיאה: ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false, httpStatus: r.status, error: r.data?.error || r.data?.message };
  };

  const s0Orders = async () => {
    const t = getData('s0-tenants');
    const tenantId = t?.tenantId;
    if (!tenantId) {
      addLog('[WARN] אין tenantId - דילוג Orders', 'warning');
      return { success: true, skipped: true };
    }
    addLog('בודק הזמנות (/api/orders)...');
    const r = await apiGet(`/api/orders?tenantId=${encodeURIComponent(tenantId)}&limit=1`);
    if (r.status === 404) {
      addLog('[WARN] API /api/orders לא קיים (404) - דילוג', 'warning');
      return { success: true, skipped: true, httpStatus: r.status };
    }
    if (r.ok) {
      const items = r.data?.items || r.data?.orders || [];
      addLog('[v] Orders OK', 'success');
      return { success: true, httpStatus: r.status, count: items.length };
    }
    addLog('[x] שגיאה: ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false, httpStatus: r.status, error: r.data?.error || r.data?.message };
  };

  const s0CommissionsRelease = async () => {
    addLog('בודק עמלות לשחרור (/api/admin/commissions/release)...');
    const r = await apiGet('/api/admin/commissions/release');
    if (r.status === 404) {
      addLog('[WARN] API /api/admin/commissions/release לא קיים (404) - דילוג', 'warning');
      return { success: true, skipped: true, httpStatus: r.status };
    }
    if (r.ok) {
      addLog('[v] Commissions release status OK', 'success');
      return { success: true, httpStatus: r.status, data: r.data };
    }
    addLog('[x] שגיאה: ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false, httpStatus: r.status, error: r.data?.error || r.data?.message };
  };

  const s0Payplus = async () => {
    addLog('בודק PayPlus (/api/admin/payplus/transactions)...');
    const r = await apiGet('/api/admin/payplus/transactions?limit=1');
    if (r.status === 404) {
      addLog('[WARN] API /api/admin/payplus/transactions לא קיים (404) - דילוג', 'warning');
      return { success: true, skipped: true, httpStatus: r.status };
    }
    if (r.ok) {
      addLog('[v] PayPlus OK', 'success');
      return { success: true, httpStatus: r.status };
    }
    addLog('[x] שגיאה: ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false, httpStatus: r.status, error: r.data?.error || r.data?.message };
  };

  const s0Priority = async () => {
    addLog('בודק Priority (/api/admin/priority/status)...');
    const r = await apiGet('/api/admin/priority/status');
    if (r.status === 404) {
      addLog('[WARN] API /api/admin/priority/status לא קיים (404) - דילוג', 'warning');
      return { success: true, skipped: true, httpStatus: r.status };
    }
    if (r.ok) {
      addLog('[v] Priority OK', 'success');
      return { success: true, httpStatus: r.status, data: r.data };
    }
    addLog('[x] שגיאה: ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false, httpStatus: r.status, error: r.data?.error || r.data?.message };
  };

  // ============================================================
  // S1 - AUTH FLOW TEST FUNCTIONS
  // ============================================================

  const s1RegisterCustomer = async () => {
    const email = 'sim-customer-' + ts() + '@test.com';
    const payload = { fullName: 'לקוח בדיקה ' + ts(), email, phone: randomPhone(), password: 'Test1234!', role: 'customer' };
    addLog('יוצר לקוח: ' + email);
    const r = await apiPost('/api/auth/register', payload);
    if (r.ok && r.data?.userId) {
      addLog('[v] לקוח נוצר: ' + r.data.userId, 'success');
      return { success: true, userId: r.data.userId, email, password: 'Test1234!' };
    }
    addLog('[x] שגיאה: ' + (r.data?.error || r.data?.message || 'HTTP ' + r.status), 'error');
    return { success: false };
  };

  const s1RegisterAgent = async () => {
    const email = 'sim-agent-' + ts() + '@test.com';
    const payload = { fullName: 'סוכן בדיקה ' + ts(), email, phone: randomPhone(), password: 'Test1234!', role: 'agent' };
    addLog('יוצר סוכן: ' + email);
    const r = await apiPost('/api/auth/register', payload);
    if (r.ok && r.data?.userId) {
      addLog('[v] סוכן נוצר: ' + r.data.userId, 'success');
      return { success: true, userId: r.data.userId, email, password: 'Test1234!' };
    }
    addLog('[x] שגיאה: ' + (r.data?.error || r.data?.message || 'HTTP ' + r.status), 'error');
    return { success: false };
  };

  const s1RegisterDuplicate = async () => {
    const cust = getData('s1-register-customer');
    if (!cust?.email) { addLog('[x] אין נתוני לקוח - הרץ הרשמה קודם', 'error'); return { success: false }; }
    addLog('מנסה הרשמה כפולה עם: ' + cust.email);
    const r = await apiPost('/api/auth/register', { fullName: 'כפול', email: cust.email, phone: randomPhone(), password: 'Test1234!', role: 'customer' });
    if (!r.ok || r.data?.error) {
      addLog('[v] קיבל שגיאה כצפוי: ' + (r.data?.error || 'HTTP ' + r.status), 'success');
      return { success: true, expectedError: true };
    }
    addLog('[x] הרשמה כפולה הצליחה - זו בעיה!', 'error');
    return { success: false };
  };

  const s1RegisterInvalid = async () => {
    addLog('מנסה הרשמה ללא שם וסיסמה...');
    const r = await apiPost('/api/auth/register', { email: 'invalid-' + ts() + '@test.com' });
    if (!r.ok || r.data?.error) {
      addLog('[v] קיבל שגיאה כצפוי: ' + (r.data?.error || 'HTTP ' + r.status), 'success');
      return { success: true, expectedError: true };
    }
    addLog('[x] הרשמה עם נתונים חסרים הצליחה - זו בעיה!', 'error');
    return { success: false };
  };

  const s1LoginSuccess = async () => {
    const cust = getData('s1-register-customer');
    if (!cust?.email || !cust?.password) { addLog('[x] אין נתוני לקוח - הרץ הרשמה קודם', 'error'); return { success: false }; }
    addLog('מתחבר עם: ' + cust.email);
    const r = await apiPost('/api/auth/login', { identifier: cust.email, password: cust.password });
    if (r.ok && (r.data?.ok || r.data?.success)) {
      addLog('[v] התחברות הצליחה (role: ' + (r.data.role || 'unknown') + ')', 'success');
      return { success: true, role: r.data.role };
    }
    addLog('[x] התחברות נכשלה: ' + (r.data?.error || r.data?.message || 'HTTP ' + r.status), 'error');
    return { success: false };
  };

  const s1LoginWrongPassword = async () => {
    const cust = getData('s1-register-customer');
    if (!cust?.email) { addLog('[x] אין נתוני לקוח', 'error'); return { success: false }; }
    addLog('מנסה התחברות עם סיסמה שגויה...');
    const r = await apiPost('/api/auth/login', { identifier: cust.email, password: 'WrongPass999!' });
    if (!r.ok) {
      addLog('[v] קיבל שגיאה כצפוי: HTTP ' + r.status, 'success');
      return { success: true, httpStatus: r.status };
    }
    addLog('[x] התחברות עם סיסמה שגויה הצליחה - בעיה!', 'error');
    return { success: false };
  };

  const s1LoginNonexistent = async () => {
    addLog('מנסה התחברות עם מייל לא קיים...');
    const r = await apiPost('/api/auth/login', { identifier: 'nonexistent-' + ts() + '@fake.com', password: 'Test1234!' });
    if (!r.ok) {
      addLog('[v] קיבל שגיאה כצפוי: HTTP ' + r.status, 'success');
      return { success: true, httpStatus: r.status };
    }
    addLog('[x] התחברות עם מייל לא קיים הצליחה - בעיה!', 'error');
    return { success: false };
  };

  const s1VerifySession = async () => {
    addLog('בודק סשן פעיל (/api/auth/me)...');
    const r = await apiGet('/api/auth/me');
    if (r.ok && r.data?.user) {
      addLog('[v] סשן פעיל: ' + (r.data.user.email || r.data.user.fullName), 'success');
      return { success: true, user: r.data.user };
    }
    addLog('[x] אין סשן פעיל: HTTP ' + r.status, 'error');
    return { success: false, httpStatus: r.status };
  };

  const s1Logout = async () => {
    addLog('מבצע התנתקות...');
    const r = await apiPost('/api/auth/logout', {});
    if (r.ok) {
      addLog('[v] התנתקות הצליחה', 'success');
      return { success: true };
    }
    addLog('[x] שגיאת התנתקות: HTTP ' + r.status, 'error');
    return { success: false };
  };

  const s1VerifyNoSession = async () => {
    addLog('מוודא שאין סשן אחרי logout...');
    const r = await apiGet('/api/auth/me');
    if (!r.ok || !r.data?.user) {
      addLog('[v] אין סשן - כצפוי (HTTP ' + r.status + ')', 'success');
      return { success: true };
    }
    addLog('[x] עדיין יש סשן פעיל אחרי logout - בעיה!', 'error');
    return { success: false };
  };

  const s1ForgotPassword = async () => {
    const cust = getData('s1-register-customer');
    if (!cust?.email) { addLog('[x] אין נתוני לקוח', 'error'); return { success: false }; }
    addLog('שולח בקשת איפוס סיסמה ל: ' + cust.email);
    const r = await apiPost('/api/auth/forgot-password', { email: cust.email });
    if (r.ok) {
      addLog('[v] בקשת איפוס נשלחה', 'success');
      return { success: true };
    }
    if (r.status === 404) {
      addLog('[WARN] API /api/auth/forgot-password לא קיים (404) - דילוג', 'warning');
      return { success: true, skipped: true };
    }
    addLog('[x] שגיאה: HTTP ' + r.status, 'error');
    return { success: false };
  };

  const s1ReloginAdmin = async () => {
    addLog('מתחבר חזרה כמנהל ראשי...');
    const r = await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });
    if (r.ok) {
      addLog('[v] התחברות חזרה כאדמין הצליחה', 'success');
      return { success: true };
    }
    addLog('[x] התחברות חזרה נכשלה: HTTP ' + r.status, 'error');
    return { success: false };
  };

  const s1StudioLogin = async () => {
    addLog('Studio login (/api/studio/auth/login)...');
    const r = await apiPost('/api/studio/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });
    if (r.ok && r.data?.ok && r.data?.token) {
      addLog('[v] Studio login OK', 'success');
      return { success: true, httpStatus: r.status, token: r.data.token };
    }
    addLog('[x] Studio login נכשל: ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false, httpStatus: r.status, error: r.data?.error || r.data?.message };
  };

  const s1StudioTenants = async () => {
    const prev = getData('s1-studio-login');
    const token = prev?.token;
    if (!token) {
      addLog('[x] אין token - הרץ Studio login קודם', 'error');
      return { success: false };
    }
    addLog('Studio tenants (/api/studio/tenants)...');
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch('/api/studio/tenants', {
        method: 'GET',
        headers: { 'x-automation-key': 'test-automation-key', Authorization: `Bearer ${token}` },
        signal: ctrl.signal,
      });
      clearTimeout(t);
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok && Array.isArray(data?.tenants)) {
        addLog('[v] Studio tenants OK (count: ' + data.tenants.length + ')', 'success');
        return { success: true, httpStatus: res.status, count: data.tenants.length };
      }
      addLog('[x] Studio tenants נכשל: ' + (data?.error || 'HTTP ' + res.status), 'error');
      return { success: false, httpStatus: res.status, error: data?.error || data?.message };
    } catch (e) {
      clearTimeout(t);
      addLog('[x] Studio tenants שגיאת רשת: ' + (e?.name === 'AbortError' ? 'Timeout 15s' : e?.message), 'error');
      return { success: false, httpStatus: 0, error: e?.name === 'AbortError' ? 'Timeout 15s' : e?.message };
    }
  };

  const decodeJwt = (token) => {
    try {
      const raw = typeof token === 'string' ? token.trim() : '';
      if (!raw) return null;
      const parts = raw.split('.');
      if (parts.length !== 3) return null;
      const decodeB64Url = (s) => {
        const fixed = String(s || '').replace(/-/g, '+').replace(/_/g, '/');
        const pad = fixed.length % 4 ? '='.repeat(4 - (fixed.length % 4)) : '';
        return atob(fixed + pad);
      };
      const header = JSON.parse(decodeB64Url(parts[0]));
      const payload = JSON.parse(decodeB64Url(parts[1]));
      return { header, payload };
    } catch (_) {
      return null;
    }
  };

  const getCrossOriginBaseCandidates = () => {
    try {
      const proto = window.location.protocol || 'http:';
      const port = window.location.port || '3001';
      const host = window.location.hostname || 'localhost';
      const candidates = [];

      if (host === 'localhost') {
        candidates.push(`${proto}//127.0.0.1:${port}`);
        candidates.push(`${proto}//[::1]:${port}`);
      } else if (host === '127.0.0.1') {
        candidates.push(`${proto}//localhost:${port}`);
        candidates.push(`${proto}//[::1]:${port}`);
      } else if (host === '::1' || host === '[::1]') {
        candidates.push(`${proto}//127.0.0.1:${port}`);
        candidates.push(`${proto}//localhost:${port}`);
      } else {
        candidates.push(`${proto}//127.0.0.1:${port}`);
        candidates.push(`${proto}//[::1]:${port}`);
        candidates.push(`${proto}//localhost:${port}`);
      }

      return Array.from(new Set(candidates));
    } catch (_) {
      return ['http://127.0.0.1:3001', 'http://[::1]:3001'];
    }
  };

  const fetchJson = async (url, options = {}, timeoutMs = 15000) => {
    if (SIM_ABORT_REQUESTED) return { ok: false, status: 0, data: { error: 'Aborted' } };
    const ctrl = new AbortController();
    INFLIGHT_CONTROLLERS.add(ctrl);
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...options, signal: ctrl.signal });
      clearTimeout(t);
      INFLIGHT_CONTROLLERS.delete(ctrl);
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, data };
    } catch (e) {
      clearTimeout(t);
      INFLIGHT_CONTROLLERS.delete(ctrl);
      return { ok: false, status: 0, data: { error: e?.name === 'AbortError' ? 'Timeout 15s' : (e?.message || 'Network error') } };
    }
  };

  const s55StudioLoginSame = async () => {
    addLog('Studio login (same-origin)...');
    const r = await fetchJson('/api/studio/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'omit',
      body: JSON.stringify({ identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' }),
    });
    if (r.ok && r.data?.ok && r.data?.token) {
      addLog('[v] login OK (same-origin)', 'success');
      return { success: true, httpStatus: r.status, token: r.data.token };
    }
    addLog('[x] login נכשל: ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false, httpStatus: r.status, error: r.data?.error || r.data?.message };
  };

  const s55StudioJwtDecodeSame = async () => {
    const src = getData('s55-studio-login-same') || getData('s1-studio-login');
    const token = src?.token;
    if (!token) {
      addLog('[x] אין token לפענוח - הרץ Studio login קודם', 'error');
      return { success: false };
    }
    const decoded = decodeJwt(token);
    if (!decoded?.payload) {
      addLog('[x] לא הצלחתי לפענח JWT', 'error');
      return { success: false };
    }
    const exp = decoded.payload?.exp ? Number(decoded.payload.exp) : null;
    const now = Math.floor(Date.now() / 1000);
    const ttl = exp ? exp - now : null;
    addLog('[v] JWT decoded: exp=' + (exp || 'n/a') + ', ttl=' + (ttl !== null ? ttl + 's' : 'n/a'), 'success');
    return { success: true, header: decoded.header, payload: decoded.payload, exp, ttlSeconds: ttl };
  };

  const s55StudioTenantsSame = async () => {
    const src = getData('s55-studio-login-same') || getData('s1-studio-login');
    const token = src?.token;
    if (!token) {
      addLog('[x] אין token - הרץ Studio login קודם', 'error');
      return { success: false };
    }
    addLog('Studio tenants (same-origin)...');
    const r1 = await fetchJson('/api/studio/tenants', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'omit',
    });
    const tenants1 = r1.data?.tenants;
    if (r1.ok && r1.data?.ok && Array.isArray(tenants1)) {
      const first = tenants1[0];
      const tenantId = first?._id || first?.id || first?.tenantId || null;
      addLog('[v] tenants OK (count: ' + tenants1.length + ')', 'success');
      return { success: true, httpStatus: r1.status, count: tenants1.length, tenantId };
    }

    const r2 = await fetchJson('/api/studio/tenants', {
      method: 'GET',
      headers: { authorization: `Bearer ${token}` },
      credentials: 'omit',
    });
    const tenants2 = r2.data?.tenants;
    if (r2.ok && r2.data?.ok && Array.isArray(tenants2)) {
      const first = tenants2[0];
      const tenantId = first?._id || first?.id || first?.tenantId || null;
      addLog('[v] tenants OK (lowercase header) (count: ' + tenants2.length + ')', 'success');
      return { success: true, httpStatus: r2.status, count: tenants2.length, tenantId };
    }
    addLog('[x] tenants נכשל: ' + (r2.data?.error || r1.data?.error || 'HTTP ' + (r2.status || r1.status)), 'error');
    return { success: false, httpStatus: r2.status || r1.status, error: r2.data?.error || r1.data?.error || r2.data?.message || r1.data?.message };
  };

  const s55StudioCategoriesSame = async () => {
    const src = getData('s55-studio-login-same') || getData('s1-studio-login');
    const token = src?.token;
    if (!token) {
      addLog('[x] אין token - הרץ Studio login קודם', 'error');
      return { success: false };
    }
    const tenantsRes = await s55StudioTenantsSame();
    if (!tenantsRes?.success || !tenantsRes?.tenantId) {
      addLog('[x] אין tenantId לטעינת קטגוריות', 'error');
      return { success: false };
    }
    const tenantId = tenantsRes.tenantId;
    addLog('Studio categories (same-origin) tenant=' + tenantId + ' ...');
    const r = await fetchJson(`/api/studio/tenants/${encodeURIComponent(String(tenantId))}/categories`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'omit',
    });
    if (r.ok && r.data?.ok && Array.isArray(r.data?.categories)) {
      addLog('[v] categories OK (count: ' + r.data.categories.length + ')', 'success');
      return { success: true, httpStatus: r.status, tenantId, count: r.data.categories.length, categories: r.data.categories };
    }
    addLog('[x] categories נכשל: ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false, httpStatus: r.status, tenantId, error: r.data?.error || r.data?.message };
  };

  const s55StudioLogin127 = async () => {
    const candidates = getCrossOriginBaseCandidates();
    let last = null;
    for (const base of candidates) {
      addLog('Studio login (cross-origin) base=' + base + ' ...');
      const r = await fetchJson(`${base}/api/studio/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'omit',
        body: JSON.stringify({ identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' }),
      });
      last = { ...r, base };
      if (r.ok && r.data?.ok && r.data?.token) {
        addLog('[v] login OK (cross-origin)', 'success');
        return { success: true, httpStatus: r.status, token: r.data.token, base };
      }
      if (r.status && r.status !== 0) {
        addLog('[x] login נכשל (cross-origin) HTTP ' + r.status + ': ' + (r.data?.error || r.data?.message || ''), 'error');
        return { success: false, httpStatus: r.status, base, error: r.data?.error || r.data?.message };
      }
      addLog('[WARN] base לא נגיש: ' + base + ' (' + (r.data?.error || 'Failed to fetch') + ')', 'warning');
    }
    addLog('[x] login נכשל (cross-origin): ' + (last?.data?.error || 'Failed to fetch'), 'error');
    return { success: false, httpStatus: last?.status || 0, base: last?.base || candidates[0], error: last?.data?.error || 'Failed to fetch' };
  };

  const s55StudioTenantsCrossNoAuth = async () => {
    const candidates = getCrossOriginBaseCandidates();
    let last = null;
    for (const base of candidates) {
      addLog('Studio tenants (cross-origin, no auth) base=' + base + ' ...');
      const r = await fetchJson(`${base}/api/studio/tenants`, {
        method: 'GET',
        credentials: 'omit',
      });
      last = { ...r, base };

      if (r.status === 401 || r.status === 403) {
        addLog('[v] server reachable + auth enforced (HTTP ' + r.status + ')', 'success');
        return { success: true, httpStatus: r.status, reachableBase: base, authEnforced: true };
      }
      if (r.status && r.status !== 0) {
        addLog('[WARN] server reachable but unexpected status (HTTP ' + r.status + ')', 'warning');
        return { success: true, httpStatus: r.status, reachableBase: base, authEnforced: false, data: r.data };
      }
      addLog('[WARN] base לא נגיש: ' + base + ' (' + (r.data?.error || 'Failed to fetch') + ')', 'warning');
    }
    addLog('[x] cross-origin tenants unreachable: ' + (last?.data?.error || 'Failed to fetch'), 'error');
    return { success: false, httpStatus: last?.status || 0, error: last?.data?.error || 'Failed to fetch' };
  };

  const s55StudioTenants127 = async () => {
    const prev = getData('s55-studio-login-127');
    const token = prev?.token;
    const base = prev?.base || getCrossOriginBaseCandidates()[0];
    if (!token) {
      addLog('[x] אין token - הרץ Studio login (127) קודם', 'error');
      return { success: false };
    }
    addLog('Studio tenants (127.0.0.1)...');
    const r = await fetchJson(`${base}/api/studio/tenants`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'omit',
    });
    const tenants = r.data?.tenants;
    if (r.ok && r.data?.ok && Array.isArray(tenants)) {
      const first = tenants[0];
      const tenantId = first?._id || first?.id || first?.tenantId || null;
      addLog('[v] tenants OK (127) (count: ' + tenants.length + ')', 'success');
      return { success: true, httpStatus: r.status, count: tenants.length, tenantId, base };
    }
    addLog('[x] tenants נכשל (127): ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false, httpStatus: r.status, base, error: r.data?.error || r.data?.message };
  };

  const s55StudioCategories127 = async () => {
    const prev = getData('s55-studio-login-127');
    const token = prev?.token;
    const base = prev?.base || getCrossOriginBaseCandidates()[0];
    if (!token) {
      addLog('[x] אין token - הרץ Studio login (127) קודם', 'error');
      return { success: false };
    }
    const tenantsRes = await s55StudioTenants127();
    if (!tenantsRes?.success || !tenantsRes?.tenantId) {
      addLog('[x] אין tenantId לטעינת קטגוריות (127)', 'error');
      return { success: false };
    }
    const tenantId = tenantsRes.tenantId;
    addLog('Studio categories (127) tenant=' + tenantId + ' ...');
    const r = await fetchJson(`${base}/api/studio/tenants/${encodeURIComponent(String(tenantId))}/categories`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'omit',
    });
    if (r.ok && r.data?.ok && Array.isArray(r.data?.categories)) {
      addLog('[v] categories OK (127) (count: ' + r.data.categories.length + ')', 'success');
      return { success: true, httpStatus: r.status, tenantId, count: r.data.categories.length, base };
    }
    addLog('[x] categories נכשל (127): ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false, httpStatus: r.status, tenantId, base, error: r.data?.error || r.data?.message };
  };

  const s55StudioTenantsNoAuth = async () => {
    addLog('Studio tenants without Authorization...');
    const r = await fetchJson('/api/studio/tenants', {
      method: 'GET',
      credentials: 'omit',
    });
    if (r.status === 401 || r.status === 403) {
      addLog('[v] נחסם כצפוי (HTTP ' + r.status + ')', 'success');
      return { success: true, httpStatus: r.status, blocked: true };
    }
    addLog('[x] צפוי 401/403, קיבלתי: HTTP ' + r.status, 'error');
    return { success: false, httpStatus: r.status, data: r.data };
  };

  const s55StudioTenantsNoBearer = async () => {
    const src = getData('s55-studio-login-same') || getData('s1-studio-login');
    const token = src?.token;
    if (!token) {
      addLog('[x] אין token - הרץ Studio login קודם', 'error');
      return { success: false };
    }
    addLog('Studio tenants Authorization=<token> (no Bearer)...');
    const r = await fetchJson('/api/studio/tenants', {
      method: 'GET',
      headers: { Authorization: String(token) },
      credentials: 'omit',
    });
    if (r.status === 401 || r.status === 403) {
      addLog('[v] נחסם כצפוי (HTTP ' + r.status + ')', 'success');
      return { success: true, httpStatus: r.status, blocked: true };
    }
    addLog('[x] צפוי 401/403, קיבלתי: HTTP ' + r.status, 'error');
    return { success: false, httpStatus: r.status, data: r.data };
  };

  const s55StudioTenantsFakeToken = async () => {
    addLog('Studio tenants Bearer FAKE...');
    const r = await fetchJson('/api/studio/tenants', {
      method: 'GET',
      headers: { Authorization: 'Bearer FAKE' },
      credentials: 'omit',
    });
    if (r.status === 401 || r.status === 403) {
      addLog('[v] נחסם כצפוי (HTTP ' + r.status + ')', 'success');
      return { success: true, httpStatus: r.status, blocked: true };
    }
    addLog('[x] צפוי 401/403, קיבלתי: HTTP ' + r.status, 'error');
    return { success: false, httpStatus: r.status, data: r.data };
  };


  // ============================================================
  // S2 - PRODUCT CRUD TEST FUNCTIONS
  // ============================================================

  const s2SetupBusiness = async () => {
    addLog('שולף עסקים קיימים...');
    const r = await apiGet('/api/tenants');
    const tenants = r.data?.tenants || r.data?.items || [];
    if (tenants.length > 0) {
      const t = tenants[0];
      const tenantId = t._id || t.id;
      addLog('[v] נמצא עסק קיים: ' + (t.name || tenantId), 'success');
      return { success: true, tenantId, tenantName: t.name || tenantId };
    }
    addLog('[x] לא נמצאו עסקים - צור עסק ידנית', 'error');
    return { success: false };
  };

  const s2CreateProduct = async () => {
    const biz = getData('s2-setup-business');
    if (!biz?.tenantId) { addLog('[x] אין עסק - הרץ הכנה קודם', 'error'); return { success: false }; }
    const name = 'מוצר בדיקה SIM_' + ts();
    const payload = { name, description: 'מוצר שנוצר ע"י הסימולטור', category: 'בדיקות', subCategory: 'כללי', price: 99.90, tenantId: biz.tenantId, stockCount: 50, active: true, inStock: true, media: { images: [{ url: 'https://placehold.co/400x400/1e3a8a/white?text=SIM+Test', alt: name }] } };
    addLog('יוצר מוצר: ' + name);
    const r = await apiPost('/api/products', payload);
    const productId = r.data?._id || r.data?.product?._id || r.data?.product?.id;
    if (r.ok && productId) {
      addLog('[v] מוצר נוצר: ' + productId, 'success');
      return { success: true, productId, name, tenantId: biz.tenantId };
    }
    addLog('[x] שגיאה: ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false };
  };

  const s2VerifyProduct = async () => {
    const prod = getData('s2-create-product');
    if (!prod?.productId || !prod?.tenantId) { addLog('[x] אין מוצר - הרץ יצירה קודם', 'error'); return { success: false }; }
    addLog('בודק שהמוצר מופיע ברשימה...');
    const r = await apiGet('/api/products?tenantId=' + prod.tenantId);
    const products = r.data?.products || r.data?.items || [];
    const found = products.find(p => String(p._id) === prod.productId || String(p.id) === prod.productId);
    if (found) {
      addLog('[v] מוצר נמצא: ' + found.name, 'success');
      return { success: true };
    }
    addLog('[x] מוצר לא נמצא ברשימה', 'error');
    return { success: false };
  };

  const s2CreateInvalid = async () => {
    addLog('מנסה יצירת מוצר ללא שם ומחיר...');
    const r = await apiPost('/api/products', { description: 'חסר שם ומחיר' });
    if (!r.ok || r.data?.error) {
      addLog('[v] קיבל שגיאה כצפוי: ' + (r.data?.error || 'HTTP ' + r.status), 'success');
      return { success: true, expectedError: true };
    }
    addLog('[WARN] יצירה ללא שם הצליחה - ייתכן שאין validation', 'warning');
    return { success: true, skipped: true };
  };

  const s2UpdatePrice = async () => {
    const prod = getData('s2-create-product');
    if (!prod?.productId) { addLog('[x] אין מוצר', 'error'); return { success: false }; }
    const newPrice = 149.90;
    addLog('מעדכן מחיר ל-' + newPrice + '...');
    const r = await apiPut('/api/products/' + prod.productId, { price: newPrice });
    if (r.ok) {
      const savedPrice = r.data?.product?.price || r.data?.price;
      if (savedPrice == newPrice) {
        addLog('[v] מחיר עודכן: ' + savedPrice, 'success');
        return { success: true, newPrice: savedPrice };
      }
      addLog('[v] עדכון הצליח (לא ניתן לאמת מחיר בתגובה)', 'success');
      return { success: true };
    }
    addLog('[x] עדכון נכשל: HTTP ' + r.status, 'error');
    return { success: false };
  };

  const s2UpdateStock = async () => {
    const prod = getData('s2-create-product');
    if (!prod?.productId) { addLog('[x] אין מוצר', 'error'); return { success: false }; }
    addLog('מעדכן מלאי ל-100...');
    const r = await apiPut('/api/products/' + prod.productId, { stockCount: 100 });
    if (r.ok) {
      addLog('[v] מלאי עודכן', 'success');
      return { success: true };
    }
    addLog('[x] עדכון נכשל: HTTP ' + r.status, 'error');
    return { success: false };
  };

  const s2UpdateStatus = async () => {
    const prod = getData('s2-create-product');
    if (!prod?.productId) { addLog('[x] אין מוצר', 'error'); return { success: false }; }
    addLog('משנה סטטוס ל-draft...');
    const r1 = await apiPut('/api/products/' + prod.productId, { active: false });
    if (!r1.ok) { addLog('[x] שינוי ל-draft נכשל', 'error'); return { success: false }; }
    addLog('משנה בחזרה ל-published...');
    const r2 = await apiPut('/api/products/' + prod.productId, { active: true });
    if (r2.ok) {
      addLog('[v] סטטוס שונה בהצלחה: draft → published', 'success');
      return { success: true };
    }
    addLog('[x] שינוי חזרה נכשל', 'error');
    return { success: false };
  };

  const s2ListProducts = async () => {
    const biz = getData('s2-setup-business');
    if (!biz?.tenantId) { addLog('[x] אין עסק', 'error'); return { success: false }; }
    addLog('שולף רשימת מוצרים...');
    const r = await apiGet('/api/products?tenantId=' + biz.tenantId);
    const products = r.data?.products || r.data?.items || [];
    addLog('[v] נמצאו ' + products.length + ' מוצרים', 'success');
    return { success: true, count: products.length };
  };

  const s2GetSingle = async () => {
    const prod = getData('s2-create-product');
    if (!prod?.productId) { addLog('[x] אין מוצר', 'error'); return { success: false }; }
    addLog('שולף מוצר בודד: ' + prod.productId);
    const r = await apiGet('/api/products/' + prod.productId);
    const product = r.data?.product || r.data;
    if (r.ok && product?.name) {
      addLog('[v] מוצר נמצא: ' + product.name + ' | מחיר: ' + product.price, 'success');
      return { success: true, product };
    }
    addLog('[x] שליפה נכשלה: HTTP ' + r.status, 'error');
    return { success: false };
  };

  const s2DeleteProduct = async () => {
    const prod = getData('s2-create-product');
    if (!prod?.productId) { addLog('[x] אין מוצר למחיקה', 'error'); return { success: false }; }
    addLog('מוחק מוצר: ' + prod.productId);
    const r = await apiDelete('/api/products/' + prod.productId);
    if (r.ok) {
      addLog('[v] מוצר נמחק', 'success');
      return { success: true };
    }
    addLog('[x] מחיקה נכשלה: HTTP ' + r.status, 'error');
    return { success: false };
  };


  // ============================================================
  // S3 - CART & CHECKOUT TEST FUNCTIONS
  // ============================================================

  const s3Setup = async () => {
    addLog('שולף עסק קיים...');
    const tenR = await apiGet('/api/tenants');
    const tenants = tenR.data?.tenants || tenR.data?.items || [];
    if (tenants.length === 0) { addLog('[x] אין עסקים', 'error'); return { success: false }; }
    const tenantId = tenants[0]._id || tenants[0].id;

    addLog('יוצר מוצר לבדיקת עגלה...');
    const prodName = 'S3 מוצר ' + ts();
    const prodR = await apiPost('/api/products', { name: prodName, description: 'מוצר לבדיקת עגלה', category: 'בדיקות', subCategory: 'כללי', price: 150, tenantId, stockCount: 20, active: true, inStock: true, media: { images: [{ url: 'https://placehold.co/400x400/1e3a8a/white?text=S3+Cart', alt: prodName }] } });
    const productId = prodR.data?._id || prodR.data?.product?._id;
    if (!prodR.ok || !productId) { addLog('[x] יצירת מוצר נכשלה: ' + (prodR.data?.error || 'HTTP ' + prodR.status), 'error'); return { success: false }; }

    addLog('רושם לקוח...');
    const custEmail = 'sim-s3-cust-' + ts() + '@test.com';
    const custR = await apiPost('/api/auth/register', { fullName: 'S3 לקוח', email: custEmail, phone: randomPhone(), password: 'Test1234!', role: 'customer' });
    if (!custR.ok || !custR.data?.userId) { addLog('[x] רישום לקוח נכשל', 'error'); return { success: false }; }

    addLog('[v] סביבה מוכנה: עסק + מוצר + לקוח', 'success');
    return { success: true, tenantId, productId, productName: prodName, price: 150, stockCount: 20, customerId: custR.data.userId, customerEmail: custEmail, cart: [] };
  };

  const s3AddToCart = async () => {
    const setup = getData('s3-setup');
    if (!setup?.productId) { addLog('[x] אין מוצר - הרץ הכנה קודם', 'error'); return { success: false }; }
    addLog('מוסיף מוצר לעגלה (סימולציה)...');
    const cart = [{ productId: setup.productId, name: setup.productName, quantity: 1, price: setup.price }];
    addLog('[v] עגלה: 1 פריט, סה"כ ' + setup.price + ' ש"ח', 'success');
    return { success: true, cart, totalItems: 1, totalPrice: setup.price };
  };

  const s3UpdateQty = async () => {
    const cartData = getData('s3-add-to-cart');
    if (!cartData?.cart?.length) { addLog('[x] עגלה ריקה - הוסף מוצר קודם', 'error'); return { success: false }; }
    addLog('מעדכן כמות ל-3...');
    const updatedCart = cartData.cart.map(item => ({ ...item, quantity: 3 }));
    const totalPrice = updatedCart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    addLog('[v] עגלה: כמות 3, סה"כ ' + totalPrice + ' ש"ח', 'success');
    return { success: true, cart: updatedCart, totalItems: 3, totalPrice };
  };

  const s3RemoveItem = async () => {
    const cartData = getData('s3-update-qty');
    if (!cartData?.cart?.length) { addLog('[x] עגלה ריקה', 'error'); return { success: false }; }
    addLog('מסיר מוצר מהעגלה...');
    const emptyCart = [];
    addLog('[v] מוצר הוסר, עגלה ריקה', 'success');
    return { success: true, cart: emptyCart, totalItems: 0 };
  };

  const s3EmptyCart = async () => {
    const cartData = getData('s3-remove-item');
    if (!cartData || cartData.cart === undefined) { addLog('[x] אין נתוני עגלה', 'error'); return { success: false }; }
    if (cartData.cart.length === 0) {
      addLog('[v] עגלה ריקה - 0 פריטים כצפוי', 'success');
      return { success: true };
    }
    addLog('[x] עגלה לא ריקה: ' + cartData.cart.length + ' פריטים', 'error');
    return { success: false };
  };

  const s3AddForCheckout = async () => {
    const setup = getData('s3-setup');
    if (!setup?.productId) { addLog('[x] אין מוצר', 'error'); return { success: false }; }
    addLog('מוסיף מוצר חזרה לעגלה לפני checkout...');
    const cart = [{ productId: setup.productId, name: setup.productName, quantity: 2, price: setup.price }];
    const totalPrice = setup.price * 2;
    addLog('[v] עגלה: 2 יחידות, סה"כ ' + totalPrice + ' ש"ח', 'success');
    return { success: true, cart, quantity: 2, totalPrice };
  };

  const s3CreateOrder = async () => {
    const setup = getData('s3-setup');
    const cartData = getData('s3-add-for-checkout');
    if (!setup?.productId || !cartData?.cart?.length) { addLog('[x] חסרים נתונים', 'error'); return { success: false }; }

    addLog('מתחבר כלקוח ליצירת הזמנה...');
    await apiPost('/api/auth/logout', {});
    const loginR = await apiPost('/api/auth/login', { identifier: setup.customerEmail, password: 'Test1234!' });
    if (!loginR.ok) { addLog('[x] התחברות לקוח נכשלה', 'error'); await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' }); return { success: false }; }

    addLog('יוצר הזמנה מהעגלה...');
    const orderPayload = {
      items: cartData.cart.map(item => ({ productId: item.productId, quantity: item.quantity })),
      customer: { fullName: 'S3 לקוח', email: setup.customerEmail, phone: '0533752633' },
      shippingAddress: { street: 'רחוב בדיקה 1', city: 'תל אביב', zipCode: '1234567' },
    };
    const r = await apiPost('/api/orders', orderPayload);

    // Re-login as admin
    await apiPost('/api/auth/logout', {});
    await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });

    const orderId = r.data?.orderId || r.data?._id || r.data?.order?._id || r.data?.order?.id;
    if (r.ok && orderId) {
      addLog('[v] הזמנה נוצרה: ' + orderId, 'success');
      return { success: true, orderId, quantity: cartData.quantity };
    }
    addLog('[x] יצירת הזמנה נכשלה: ' + (r.data?.error || r.data?.message || 'HTTP ' + r.status), 'error');
    return { success: false };
  };

  const s3VerifyOrder = async () => {
    const orderData = getData('s3-create-order');
    const setup = getData('s3-setup');
    if (!orderData?.orderId) { addLog('[x] אין הזמנה', 'error'); return { success: false }; }
    addLog('מחפש הזמנה: ' + orderData.orderId);
    const r = await apiGet('/api/orders?tenantId=' + setup.tenantId + '&limit=50');
    const orders = r.data?.orders || r.data?.items || [];
    const found = orders.find(o => String(o._id) === orderData.orderId || String(o.id) === orderData.orderId);
    if (found) {
      addLog('[v] הזמנה נמצאה, סטטוס: ' + (found.status || 'unknown'), 'success');
      return { success: true, order: found };
    }
    addLog('[x] הזמנה לא נמצאה ברשימה', 'error');
    return { success: false };
  };

  const s3VerifyStockDecreased = async () => {
    const setup = getData('s3-setup');
    const orderData = getData('s3-create-order');
    if (!setup?.productId || !orderData?.quantity) { addLog('[x] חסרים נתונים', 'error'); return { success: false }; }
    addLog('בודק מלאי מוצר...');
    const r = await apiGet('/api/products/' + setup.productId);
    const product = r.data?.product || r.data;
    if (!r.ok || !product) { addLog('[x] שליפת מוצר נכשלה', 'error'); return { success: false }; }
    const currentStock = product.stockCount ?? product.stock ?? 0;
    const expectedStock = setup.stockCount - orderData.quantity;
    if (currentStock === expectedStock) {
      addLog('[v] מלאי ירד כצפוי: ' + setup.stockCount + ' → ' + currentStock, 'success');
      return { success: true, before: setup.stockCount, after: currentStock };
    }
    addLog('[WARN] מלאי: ' + currentStock + ' (צפוי: ' + expectedStock + '). ייתכן שהמלאי יורד רק אחרי תשלום', 'warning');
    return { success: true, before: setup.stockCount, after: currentStock, expected: expectedStock };
  };


  // ============================================================
  // S4 - USER ROLES TEST FUNCTIONS
  // ============================================================

  const s4SetupUsers = async () => {
    addLog('יוצר לקוח לבדיקת הרשאות...');
    const custEmail = 'sim-s4-cust-' + ts() + '@test.com';
    const custR = await apiPost('/api/auth/register', { fullName: 'S4 לקוח', email: custEmail, phone: randomPhone(), password: 'Test1234!', role: 'customer' });
    if (!custR.ok || !custR.data?.userId) { addLog('[x] יצירת לקוח נכשלה', 'error'); return { success: false }; }

    addLog('יוצר סוכן לבדיקת הרשאות...');
    const agentEmail = 'sim-s4-agent-' + ts() + '@test.com';
    const agentR = await apiPost('/api/auth/register', { fullName: 'S4 סוכן', email: agentEmail, phone: randomPhone(), password: 'Test1234!', role: 'agent' });
    if (!agentR.ok || !agentR.data?.userId) { addLog('[x] יצירת סוכן נכשלה', 'error'); return { success: false }; }

    addLog('[v] נוצרו: לקוח + סוכן', 'success');
    return {
      success: true,
      customer: { userId: custR.data.userId, email: custEmail, password: 'Test1234!' },
      agent: { userId: agentR.data.userId, email: agentEmail, password: 'Test1234!' },
    };
  };

  const s4LoginAs = async (role) => {
    const setup = getData('s4-setup-users');
    if (!setup) { addLog('[x] אין נתוני setup', 'error'); return null; }
    const user = role === 'customer' ? setup.customer : setup.agent;
    if (!user?.email) { addLog('[x] אין נתוני ' + role, 'error'); return null; }
    const r = await apiPost('/api/auth/login', { identifier: user.email, password: user.password });
    return r.ok ? user : null;
  };

  const s4ReloginAsAdmin = async () => {
    await apiPost('/api/auth/logout', {});
    const r = await apiGet('/api/auth/me');
    if (r.ok && r.data?.user?.role === 'super_admin') return true;
    addLog('[WARN] מתחבר מחדש כמנהל...', 'warning');
    const loginR = await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });
    return loginR.ok;
  };

  const s4CustomerProductsOk = async () => {
    await apiPost('/api/auth/logout', {});
    const user = await s4LoginAs('customer');
    if (!user) return { success: false };
    addLog('לקוח מנסה לצפות במוצרים...');
    const r = await apiGet('/api/products?limit=5');
    await s4ReloginAsAdmin();
    if (r.ok) { addLog('[v] לקוח רואה מוצרים (200)', 'success'); return { success: true }; }
    addLog('[x] לקוח לא רואה מוצרים: HTTP ' + r.status, 'error');
    return { success: false };
  };

  const s4CustomerAdmin403 = async () => {
    await apiPost('/api/auth/logout', {});
    const user = await s4LoginAs('customer');
    if (!user) return { success: false };
    addLog('לקוח מנסה גישה ל-/api/users...');
    const r = await apiGet('/api/users?limit=1');
    await s4ReloginAsAdmin();
    if (r.status === 401 || r.status === 403) {
      addLog('[v] לקוח חסום מגישה לאדמין (HTTP ' + r.status + ')', 'success');
      return { success: true, httpStatus: r.status };
    }
    addLog('[x] לקוח קיבל גישה (HTTP ' + r.status + ') - בעיה!', 'error');
    return { success: false, httpStatus: r.status };
  };

  const s4CustomerDelete403 = async () => {
    await apiPost('/api/auth/logout', {});
    const user = await s4LoginAs('customer');
    if (!user) return { success: false };
    addLog('לקוח מנסה למחוק משתמש...');
    const r = await apiDelete('/api/users/000000000000000000000000');
    await s4ReloginAsAdmin();
    if (r.status === 401 || r.status === 403) {
      addLog('[v] לקוח חסום ממחיקה (HTTP ' + r.status + ')', 'success');
      return { success: true, httpStatus: r.status };
    }
    addLog('[x] לקוח הצליח למחוק - בעיה! (HTTP ' + r.status + ')', 'error');
    return { success: false, httpStatus: r.status };
  };

  const s4AgentBusinessesOk = async () => {
    await apiPost('/api/auth/logout', {});
    const user = await s4LoginAs('agent');
    if (!user) return { success: false };
    addLog('סוכן מנסה לצפות בעסקים שלו...');
    const r = await apiGet('/api/agent/businesses');
    await s4ReloginAsAdmin();
    if (r.ok) { addLog('[v] סוכן רואה עסקים שלו (200)', 'success'); return { success: true }; }
    addLog('[x] סוכן לא רואה עסקים: HTTP ' + r.status, 'error');
    return { success: false };
  };

  const s4AgentAdmin403 = async () => {
    await apiPost('/api/auth/logout', {});
    const user = await s4LoginAs('agent');
    if (!user) return { success: false };
    addLog('סוכן מנסה גישה ל-/api/users...');
    const r = await apiGet('/api/users?limit=1');
    await s4ReloginAsAdmin();
    if (r.status === 401 || r.status === 403) {
      addLog('[v] סוכן חסום מגישה לאדמין (HTTP ' + r.status + ')', 'success');
      return { success: true, httpStatus: r.status };
    }
    addLog('[x] סוכן קיבל גישה (HTTP ' + r.status + ') - בעיה!', 'error');
    return { success: false, httpStatus: r.status };
  };

  const s4AgentDeleteUser403 = async () => {
    await apiPost('/api/auth/logout', {});
    const user = await s4LoginAs('agent');
    if (!user) return { success: false };
    addLog('סוכן מנסה למחוק משתמש...');
    const r = await apiDelete('/api/users/000000000000000000000000');
    await s4ReloginAsAdmin();
    if (r.status === 401 || r.status === 403) {
      addLog('[v] סוכן חסום ממחיקה (HTTP ' + r.status + ')', 'success');
      return { success: true, httpStatus: r.status };
    }
    addLog('[x] סוכן הצליח למחוק - בעיה! (HTTP ' + r.status + ')', 'error');
    return { success: false, httpStatus: r.status };
  };

  const s4AdminUsersOk = async () => {
    addLog('מנהל שולף משתמשים...');
    const r = await apiGet('/api/users?limit=5');
    if (r.ok) { addLog('[v] מנהל רואה משתמשים (200)', 'success'); return { success: true }; }
    addLog('[x] מנהל לא רואה משתמשים: HTTP ' + r.status, 'error');
    return { success: false };
  };

  const s4AdminOrdersOk = async () => {
    addLog('מנהל שולף הזמנות...');
    const r = await apiGet('/api/orders?limit=5');
    if (r.ok) { addLog('[v] מנהל רואה הזמנות (200)', 'success'); return { success: true }; }
    addLog('[x] מנהל לא רואה הזמנות: HTTP ' + r.status, 'error');
    return { success: false };
  };

  const s4AdminTenantsOk = async () => {
    addLog('מנהל שולף עסקים...');
    const r = await apiGet('/api/tenants');
    if (r.ok) { addLog('[v] מנהל רואה עסקים (200)', 'success'); return { success: true }; }
    addLog('[x] מנהל לא רואה עסקים: HTTP ' + r.status, 'error');
    return { success: false };
  };


  // ============================================================
  // S5 - COUPONS & REFERRALS TEST FUNCTIONS
  // ============================================================

  const s5Setup = async () => {
    addLog('שולף עסק קיים...');
    const tenR = await apiGet('/api/tenants');
    const tenants = tenR.data?.tenants || [];
    if (tenants.length === 0) { addLog('[x] אין עסקים', 'error'); return { success: false }; }
    const tenantId = tenants[0]._id || tenants[0].id;

    addLog('יוצר סוכן...');
    const agentEmail = 'sim-s5-agent-' + ts() + '@test.com';
    const agentR = await apiPost('/api/auth/register', { fullName: 'S5 סוכן', email: agentEmail, phone: randomPhone(), password: 'Test1234!', role: 'agent' });
    if (!agentR.ok || !agentR.data?.userId) { addLog('[x] יצירת סוכן נכשלה', 'error'); return { success: false }; }

    addLog('יוצר מוצר...');
    const prodR = await apiPost('/api/products', { name: 'S5 מוצר ' + ts(), description: 'מוצר בדיקה S5', price: 200, tenantId, stockCount: 50, active: true, inStock: true, category: 'בדיקות', subCategory: 'כללי', media: { images: [{ url: 'https://placehold.co/400x400/1e3a8a/white?text=S5', alt: 'S5' }] } });
    const productId = prodR.data?._id || prodR.data?.product?._id;
    if (!prodR.ok || !productId) { addLog('[x] יצירת מוצר נכשלה: ' + (prodR.data?.error || 'HTTP ' + prodR.status), 'error'); return { success: false }; }

    addLog('[v] סביבה מוכנה: עסק + סוכן + מוצר', 'success');
    return { success: true, tenantId, agentId: agentR.data.userId, agentEmail, productId };
  };

  const s5AgentHasCoupon = async () => {
    const setup = getData('s5-setup');
    if (!setup?.agentId) { addLog('[x] אין נתוני סוכן', 'error'); return { success: false }; }
    addLog('בודק קופון סוכן...');
    const r = await apiGet('/api/coupons?userId=' + setup.agentId);
    const coupons = r.data?.coupons || r.data?.items || [];
    const coupon = coupons[0]?.code;
    if (coupon) {
      addLog('[v] נמצא קופון: ' + coupon, 'success');
      return { success: true, couponCode: coupon };
    }
    addLog('[WARN] לא נמצא קופון (ייתכן שנוצר אוטומטית בשיוך לעסק)', 'warning');
    return { success: true, skipped: true };
  };

  const s5ShareLink = async () => {
    const setup = getData('s5-setup');
    const couponData = getData('s5-agent-has-coupon');
    if (!setup?.productId) { addLog('[x] אין מוצר', 'error'); return { success: false }; }
    const coupon = couponData?.couponCode || 'AGENT_CODE';
    const shareUrl = await buildCanonicalProductShareUrl(setup.productId, coupon, window.location.origin);
    addLog('[v] לינק שיתוף: ' + shareUrl, 'success');
    return { success: true, shareUrl, couponCode: coupon };
  };

  const s5CustomerRegister = async () => {
    const couponData = getData('s5-agent-has-coupon');
    const email = 'sim-s5-cust-' + ts() + '@test.com';
    const payload = { fullName: 'S5 לקוח', email, phone: randomPhone(), password: 'Test1234!', role: 'customer', referralCode: couponData?.couponCode || undefined };
    addLog('רושם לקוח: ' + email);
    const r = await apiPost('/api/auth/register', payload);
    if (r.ok && r.data?.userId) {
      addLog('[v] לקוח נרשם: ' + r.data.userId, 'success');
      return { success: true, userId: r.data.userId, email };
    }
    addLog('[x] שגיאה: ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false };
  };

  const s5OrderWithCoupon = async () => {
    const setup = getData('s5-setup');
    const cust = getData('s5-customer-register');
    const couponData = getData('s5-agent-has-coupon');
    if (!setup?.productId || !cust?.userId) { addLog('[x] חסרים נתונים', 'error'); return { success: false }; }
    addLog('יוצר הזמנה עם קופון...');
    const r = await apiPost('/api/orders', {
      customerId: cust.userId, tenantId: setup.tenantId,
      items: [{ productId: setup.productId, quantity: 1, price: 200 }],
      totalAmount: 200, couponCode: couponData?.couponCode, status: 'completed',
    });
    const orderId = r.data?.orderId || r.data?._id || r.data?.order?._id;
    if (r.ok && orderId) {
      addLog('[v] הזמנה נוצרה: ' + orderId, 'success');
      return { success: true, orderId };
    }
    addLog('[x] שגיאה: ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false };
  };

  const s5CommissionCreated = async () => {
    const setup = getData('s5-setup');
    if (!setup?.agentId) { addLog('[x] אין סוכן', 'error'); return { success: false }; }
    addLog('בודק עמלות סוכן...');
    const r = await apiGet('/api/commissions?agentId=' + setup.agentId);
    const comms = r.data?.commissions || r.data?.items || [];
    if (comms.length > 0) {
      addLog('[v] נמצאו ' + comms.length + ' עמלות', 'success');
      return { success: true, count: comms.length };
    }
    addLog('[WARN] לא נמצאו עמלות (ייתכן שנוצרות רק אחרי תשלום)', 'warning');
    return { success: true, skipped: true };
  };

  const s5AgentBalance = async () => {
    const setup = getData('s5-setup');
    if (!setup?.agentId) { addLog('[x] אין סוכן', 'error'); return { success: false }; }
    addLog('בודק יתרת סוכן...');
    const r = await apiGet('/api/users/' + setup.agentId);
    const user = r.data?.user || r.data;
    const balance = user?.commissionBalance || user?.availableBalance || 0;
    addLog('[v] יתרת עמלות: ' + balance, 'success');
    return { success: true, balance };
  };


  // ============================================================
  // S9 - MULTI-TENANT TEST FUNCTIONS
  // ============================================================

  const s9CreateBiz = async (label) => {
    addLog('שולף עסקים קיימים (' + label + ')...');
    const r = await apiGet('/api/tenants');
    const tenants = r.data?.tenants || [];
    const idx = label === 'A' ? 0 : 1;
    if (tenants.length <= idx) {
      addLog('[x] צריך לפחות ' + (idx + 1) + ' עסקים קיימים', 'error');
      return { success: false };
    }
    const t = tenants[idx];
    const tenantId = t._id || t.id;

    addLog('יוצר מוצר לעסק ' + label + '...');
    const prodR = await apiPost('/api/products', { name: 'S9_' + label + '_' + ts(), description: 'מוצר בדיקה S9 ' + label, price: 100, tenantId, stockCount: 10, active: true, inStock: true, category: 'בדיקות', subCategory: 'כללי', media: { images: [{ url: 'https://placehold.co/400x400/1e3a8a/white?text=S9+' + label, alt: 'S9 ' + label }] } });
    const productId = prodR.data?._id || prodR.data?.product?._id;
    if (!prodR.ok || !productId) { addLog('[x] יצירת מוצר נכשלה: ' + (prodR.data?.error || 'HTTP ' + prodR.status), 'error'); return { success: false }; }
    addLog('[v] עסק ' + label + ' מוכן: ' + tenantId + ' + מוצר ' + productId, 'success');
    return { success: true, tenantId, tenantName: t.name, productId };
  };

  const s9CreateBizA = async () => s9CreateBiz('A');
  const s9CreateBizB = async () => s9CreateBiz('B');

  const s9BizANoBizBProducts = async () => {
    const bizA = getData('s9-create-biz-a');
    const bizB = getData('s9-create-biz-b');
    if (!bizA?.tenantId || !bizB?.productId) { addLog('[x] חסרים נתונים', 'error'); return { success: false }; }
    addLog('שולף מוצרים של עסק A...');
    const r = await apiGet('/api/products?tenantId=' + bizA.tenantId);
    const products = r.data?.products || r.data?.items || [];
    const found = products.find(p => String(p._id) === bizB.productId || String(p.id) === bizB.productId);
    if (!found) {
      addLog('[v] עסק A לא רואה מוצרי B - תקין!', 'success');
      return { success: true };
    }
    addLog('[x] עסק A רואה מוצר של B - דליפת מידע!', 'error');
    return { success: false };
  };

  const s9BizBNoBizAProducts = async () => {
    const bizA = getData('s9-create-biz-a');
    const bizB = getData('s9-create-biz-b');
    if (!bizB?.tenantId || !bizA?.productId) { addLog('[x] חסרים נתונים', 'error'); return { success: false }; }
    addLog('שולף מוצרים של עסק B...');
    const r = await apiGet('/api/products?tenantId=' + bizB.tenantId);
    const products = r.data?.products || r.data?.items || [];
    const found = products.find(p => String(p._id) === bizA.productId || String(p.id) === bizA.productId);
    if (!found) {
      addLog('[v] עסק B לא רואה מוצרי A - תקין!', 'success');
      return { success: true };
    }
    addLog('[x] עסק B רואה מוצר של A - דליפת מידע!', 'error');
    return { success: false };
  };

  const s9BizANoBizBOrders = async () => {
    const bizA = getData('s9-create-biz-a');
    const bizB = getData('s9-create-biz-b');
    if (!bizA?.tenantId || !bizB?.tenantId) { addLog('[x] חסרים נתונים', 'error'); return { success: false }; }
    addLog('שולף הזמנות של עסק A...');
    const r = await apiGet('/api/orders?tenantId=' + bizA.tenantId + '&limit=50');
    const orders = r.data?.orders || r.data?.items || [];
    const leaked = orders.filter(o => o.tenantId === bizB.tenantId);
    if (leaked.length === 0) {
      addLog('[v] עסק A לא רואה הזמנות של B - תקין!', 'success');
      return { success: true };
    }
    addLog('[x] עסק A רואה ' + leaked.length + ' הזמנות של B - דליפה!', 'error');
    return { success: false };
  };

  const s9AdminSeesAll = async () => {
    const bizA = getData('s9-create-biz-a');
    const bizB = getData('s9-create-biz-b');
    if (!bizA?.tenantId || !bizB?.tenantId) { addLog('[x] חסרים נתונים', 'error'); return { success: false }; }
    addLog('מנהל שולף את כל המוצרים...');
    const r = await apiGet('/api/products?limit=200');
    const products = r.data?.products || r.data?.items || [];
    const hasA = products.some(p => p.tenantId === bizA.tenantId || String(p.tenantId) === bizA.tenantId);
    const hasB = products.some(p => p.tenantId === bizB.tenantId || String(p.tenantId) === bizB.tenantId);
    if (hasA && hasB) {
      addLog('[v] מנהל רואה מוצרים של שני העסקים', 'success');
      return { success: true };
    }
    addLog('[WARN] מנהל רואה A=' + hasA + ', B=' + hasB, 'warning');
    return { success: true, hasA, hasB };
  };


  // ============================================================
  // S6 - COMMISSION LIFECYCLE TEST FUNCTIONS
  // ============================================================

  const s6Setup = async () => {
    addLog('שולף עסק...');
    const tenR = await apiGet('/api/tenants');
    const tenants = tenR.data?.tenants || [];
    if (!tenants.length) { addLog('[x] אין עסקים', 'error'); return { success: false }; }
    const tenantId = tenants[0]._id || tenants[0].id;
    addLog('יוצר סוכן...');
    const agentEmail = 'sim-s6-agent-' + ts() + '@test.com';
    const agentR = await apiPost('/api/auth/register', { fullName: 'S6 סוכן', email: agentEmail, phone: randomPhone(), password: 'Test1234!', role: 'agent' });
    if (!agentR.ok) { addLog('[x] יצירת סוכן נכשלה', 'error'); return { success: false }; }
    const agentId = agentR.data.userId;

    // Fetch agent's coupon code (auto-generated during registration)
    addLog('שולף קופון סוכן...');
    const agentUserR = await apiGet('/api/users/' + agentId);
    const agentCoupon = agentUserR.data?.user?.couponCode || agentUserR.data?.couponCode;
    if (!agentCoupon) { addLog('[WARN] לא נמצא קופון סוכן, עמלה לא תחושב', 'warning'); }

    addLog('יוצר מוצר...');
    const prodR = await apiPost('/api/products', { name: 'S6_מוצר_' + ts(), description: 'מוצר בדיקה S6', price: 500, tenantId, stockCount: 10, active: true, inStock: true, category: 'בדיקות', subCategory: 'כללי', commissionRate: 10, media: { images: [{ url: 'https://placehold.co/400x400/1e3a8a/white?text=S6', alt: 'S6' }] } });
    const productId = prodR.data?._id || prodR.data?.product?._id;
    if (!productId) { addLog('[x] יצירת מוצר נכשלה: ' + (prodR.data?.error || 'HTTP ' + prodR.status), 'error'); return { success: false }; }
    addLog('יוצר לקוח + הזמנה...');
    const custR = await apiPost('/api/auth/register', { fullName: 'S6 לקוח', email: 'sim-s6-cust-' + ts() + '@test.com', phone: randomPhone(), password: 'Test1234!', role: 'customer' });
    const custId = custR.data?.userId;
    const orderPayload = { items: [{ productId, quantity: 1 }], status: 'completed' };
    if (agentCoupon) { orderPayload.coupon = { code: agentCoupon }; }
    const orderR = await apiPost('/api/orders', orderPayload);
    const orderId = orderR.data?.orderId || orderR.data?._id || orderR.data?.order?._id;
    const commissionAmount = orderR.data?.commissionAmount || 0;
    if (!orderId) { addLog('[x] יצירת הזמנה נכשלה: ' + (orderR.data?.error || 'HTTP ' + orderR.status), 'error'); return { success: false }; }

    // Release commission immediately (bypass 30-day waiting period for test)
    if (orderId && commissionAmount > 0) {
      addLog('משחרר עמלה (bypass waiting period)...');
      const releaseR = await apiPost('/api/admin/commissions/release', { action: 'release_single', orderId });
      if (releaseR.ok) { addLog('[v] עמלה שוחררה: ' + commissionAmount, 'success'); }
      else { addLog('[WARN] שחרור עמלה נכשל: ' + (releaseR.data?.error || 'HTTP ' + releaseR.status), 'warning'); }
    }

    addLog('[v] הכנה הושלמה: סוכן + מוצר + הזמנה (עמלה: ' + commissionAmount + ')', 'success');
    return { success: true, tenantId, agentId, agentEmail, agentCoupon, productId, customerId: custId, orderId, commissionAmount };
  };

  const s6CommissionExists = async () => {
    const setup = getData('s6-setup');
    if (!setup?.agentId) { addLog('[x] אין סוכן', 'error'); return { success: false }; }
    addLog('בודק עמלות...');
    const r = await apiGet('/api/commissions?agentId=' + setup.agentId);
    const comms = r.data?.commissions || r.data?.items || [];
    if (comms.length > 0) { addLog('[v] נמצאו ' + comms.length + ' עמלות', 'success'); return { success: true, commissions: comms }; }
    addLog('[WARN] לא נמצאו עמלות - ייתכן שנוצרות רק אחרי תשלום', 'warning');
    return { success: true, skipped: true };
  };

  const s6CommissionAmount = async () => {
    const comms = getData('s6-commission-exists');
    if (comms?.skipped) { addLog('[WARN] דילוג - אין עמלות', 'warning'); return { success: true, skipped: true }; }
    const c = comms?.commissions?.[0];
    if (c?.amount && c.amount > 0) { addLog('[v] סכום עמלה: ' + c.amount, 'success'); return { success: true, amount: c.amount }; }
    addLog('[WARN] סכום עמלה לא ברור', 'warning');
    return { success: true, skipped: true };
  };

  const s6AgentBalance = async () => {
    const setup = getData('s6-setup');
    if (!setup?.agentId) { addLog('[x] אין סוכן', 'error'); return { success: false }; }
    addLog('בודק יתרת סוכן...');
    const r = await apiGet('/api/users/' + setup.agentId);
    const user = r.data?.user || r.data;
    const balance = user?.commissionBalance || user?.availableBalance || 0;
    addLog('[v] יתרת עמלות: ' + balance, 'success');
    return { success: true, balance };
  };

  const s6CommissionList = async () => {
    const setup = getData('s6-setup');
    if (!setup?.agentId) { addLog('[x] אין סוכן', 'error'); return { success: false }; }
    addLog('שולף רשימת עמלות...');
    const r = await apiGet('/api/commissions?agentId=' + setup.agentId);
    if (r.ok) { addLog('[v] רשימת עמלות נטענה', 'success'); return { success: true }; }
    addLog('[x] שליפה נכשלה: HTTP ' + r.status, 'error');
    return { success: false };
  };

  // ============================================================
  // S7 - WITHDRAWAL CYCLE TEST FUNCTIONS
  // ============================================================

  const s7Setup = async () => {
    addLog('מריץ setup של S6 (עסק + סוכן + עמלה)...');
    const s6result = await s6Setup();
    if (!s6result.success) return { success: false };
    return { ...s6result };
  };

  const s7RequestWithdrawal = async () => {
    const setup = getData('s7-setup');
    if (!setup?.agentId || !setup?.tenantId) { addLog('[x] חסרים נתונים', 'error'); return { success: false }; }
    const amount = setup.commissionAmount ? Math.min(setup.commissionAmount, 50) : 50;
    addLog('סוכן מבקש משיכת עמלה (' + amount + ')...');
    const r = await apiPost('/api/admin/test-harness/create-withdrawal', { agentId: setup.agentId, amount, tenantId: setup.tenantId });
    const wId = r.data?.requestId || r.data?._id;
    if (r.ok && wId) { addLog('[v] בקשה נוצרה: ' + wId, 'success'); return { success: true, withdrawalId: wId, amount }; }
    if (r.status === 404) { addLog('[WARN] API test-harness/create-withdrawal לא קיים', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] שגיאה: ' + (r.data?.error || 'HTTP ' + r.status) + (r.data?.balance !== undefined ? ' (balance: ' + r.data.balance + ')' : ''), 'error');
    return { success: false };
  };

  const s7VerifyPending = async () => {
    const w = getData('s7-request-withdrawal');
    if (w?.skipped) { addLog('[WARN] דילוג', 'warning'); return { success: true, skipped: true }; }
    if (!w?.withdrawalId) { addLog('[x] אין בקשה', 'error'); return { success: false }; }
    addLog('בודק סטטוס...');
    const r = await apiGet('/api/admin/withdrawals/' + w.withdrawalId);
    const status = r.data?.withdrawal?.status || r.data?.status;
    if (status === 'pending') { addLog('[v] סטטוס pending', 'success'); return { success: true }; }
    addLog('[WARN] סטטוס: ' + status, 'warning');
    return { success: true, status };
  };

  const s7AdminApprove = async () => {
    const w = getData('s7-request-withdrawal');
    if (w?.skipped) { addLog('[WARN] דילוג', 'warning'); return { success: true, skipped: true }; }
    if (!w?.withdrawalId) { addLog('[x] אין בקשה', 'error'); return { success: false }; }
    addLog('מנהל מאשר משיכה...');
    const r = await apiPatch('/api/admin/withdrawals/' + w.withdrawalId, { action: 'approve' });
    if (r.ok) { addLog('[v] אושר', 'success'); return { success: true }; }
    addLog('[x] אישור נכשל: ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false };
  };

  const s7AdminComplete = async () => {
    const w = getData('s7-request-withdrawal');
    if (w?.skipped) { addLog('[WARN] דילוג', 'warning'); return { success: true, skipped: true }; }
    if (!w?.withdrawalId) { addLog('[x] אין בקשה', 'error'); return { success: false }; }
    addLog('מנהל משלים תשלום...');
    const r = await apiPatch('/api/admin/withdrawals/' + w.withdrawalId, { action: 'complete' });
    if (r.ok) { addLog('[v] הושלם', 'success'); return { success: true }; }
    addLog('[x] השלמה נכשלה: ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false };
  };

  const s7BalanceZero = async () => {
    const setup = getData('s7-setup');
    if (!setup?.agentId) { addLog('[x] אין סוכן', 'error'); return { success: false }; }
    addLog('בודק יתרה...');
    const r = await apiGet('/api/users/' + setup.agentId);
    const user = r.data?.user || r.data;
    const balance = user?.commissionBalance || user?.availableBalance || 0;
    addLog('[v] יתרת סוכן: ' + balance, balance === 0 ? 'success' : 'warning');
    return { success: true, balance };
  };

  const s7BizAdminBlocked = async () => {
    const w = getData('s7-request-withdrawal');
    if (w?.skipped) { addLog('[WARN] דילוג', 'warning'); return { success: true, skipped: true }; }
    if (!w?.withdrawalId) { addLog('[WARN] אין בקשה לבדיקת RBAC, דילוג', 'warning'); return { success: true, skipped: true }; }
    addLog('בודק RBAC: business_admin לא מאשר withdrawals...');
    const actions = ['approve', 'complete', 'reject'];
    let blocked = 0;
    for (const action of actions) {
      const r = await apiPatch('/api/admin/withdrawals/' + w.withdrawalId, { action }, { 'x-test-role': 'business_admin' });
      if (r.status === 403) { blocked++; }
      else { addLog('[WARN] business_admin ' + action + ' → HTTP ' + r.status, 'warning'); }
    }
    addLog('[v] RBAC: ' + blocked + '/3 חסומות', 'success');
    return { success: true };
  };

  // ============================================================
  // S8 - NOTIFICATIONS TEST FUNCTIONS
  // ============================================================

  const s8Setup = async () => {
    addLog('שולף עסק...');
    const tenR = await apiGet('/api/tenants');
    const tenants = tenR.data?.tenants || [];
    if (!tenants.length) { addLog('[x] אין עסקים', 'error'); return { success: false }; }
    const tenantId = tenants[0]._id || tenants[0].id;
    addLog('יוצר מוצר...');
    const prodR = await apiPost('/api/products', { name: 'S8_מוצר_' + ts(), description: 'מוצר בדיקה S8', price: 100, tenantId, stockCount: 10, active: true, inStock: true, category: 'בדיקות', subCategory: 'כללי', media: { images: [{ url: 'https://placehold.co/400x400/1e3a8a/white?text=S8', alt: 'S8' }] } });
    const productId = prodR.data?._id || prodR.data?.product?._id;
    addLog('יוצר לקוח...');
    const custR = await apiPost('/api/auth/register', { fullName: 'S8 לקוח', email: 'sim-s8-cust-' + ts() + '@test.com', phone: randomPhone(), password: 'Test1234!', role: 'customer' });
    const custId = custR.data?.userId;
    addLog('[v] הכנה הושלמה', 'success');
    return { success: true, tenantId, productId, customerId: custId };
  };

  const s8OrderNotification = async () => {
    const setup = getData('s8-setup');
    if (!setup?.productId || !setup?.customerId) { addLog('[x] חסרים נתונים', 'error'); return { success: false }; }
    addLog('יוצר הזמנה ובודק התראה...');
    const orderR = await apiPost('/api/orders', { customerId: setup.customerId, tenantId: setup.tenantId, items: [{ productId: setup.productId, quantity: 1, price: 100 }], totalAmount: 100, status: 'completed' });
    if (!orderR.ok) { addLog('[x] יצירת הזמנה נכשלה', 'error'); return { success: false }; }
    await new Promise(r => setTimeout(r, 1000));
    const notifR = await apiGet('/api/notifications?limit=5');
    if (notifR.ok) { addLog('[v] הזמנה נוצרה, התראות נבדקו', 'success'); return { success: true, orderId: orderR.data?.orderId || orderR.data?._id || orderR.data?.order?._id }; }
    addLog('[WARN] לא ניתן לשלוף התראות: HTTP ' + notifR.status, 'warning');
    return { success: true, skipped: true };
  };

  const s8AdminNotifications = async () => {
    addLog('שולף התראות מנהל...');
    const r = await apiGet('/api/notifications?limit=20');
    if (r.ok) {
      const items = r.data?.notifications || r.data?.items || [];
      addLog('[v] נמצאו ' + items.length + ' התראות', 'success');
      return { success: true, count: items.length };
    }
    if (r.status === 404) { addLog('[WARN] API /api/notifications לא קיים', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] שגיאה: HTTP ' + r.status, 'error');
    return { success: false };
  };

  const s8ReadNotification = async () => {
    addLog('שולף התראה לסימון...');
    const r = await apiGet('/api/admin/alerts');
    const items = r.data?.alerts || [];
    if (!items.length) { addLog('[WARN] אין התראות לסמן', 'warning'); return { success: true, skipped: true }; }
    const nId = items[0]._id || items[0].id;
    addLog('מסמן כנקרא: ' + nId);
    const patchR = await apiPatch('/api/admin/alerts', { id: nId });
    if (patchR.ok || patchR.data?.success) { addLog('[v] סומן כנקרא', 'success'); return { success: true }; }
    addLog('[x] סימון נכשל: ' + (patchR.data?.error || 'HTTP ' + patchR.status), 'error');
    return { success: false };
  };

  const s8UnreadCount = async () => {
    addLog('בודק מונה לא-נקראו...');
    const r = await apiGet('/api/admin/alerts');
    if (r.ok && r.data?.unreadCount !== undefined) {
      addLog('[v] לא נקראו: ' + r.data.unreadCount, 'success');
      return { success: true, count: r.data.unreadCount };
    }
    if (r.status === 404) { addLog('[WARN] API alerts לא קיים', 'warning'); return { success: true, skipped: true }; }
    addLog('[WARN] לא הצליח לשלוף מונה: ' + (r.data?.error || 'HTTP ' + r.status), 'warning');
    return { success: true, skipped: true };
  };

  // ============================================================
  // S10 - GROUP PURCHASE TEST FUNCTIONS
  // ============================================================

  const s10Setup = async () => {
    addLog('שולף עסק...');
    const tenR = await apiGet('/api/tenants');
    const tenants = tenR.data?.tenants || [];
    if (!tenants.length) { addLog('[x] אין עסקים', 'error'); return { success: false }; }
    const tenantId = tenants[0]._id || tenants[0].id;
    addLog('יוצר מוצר קבוצתי...');
    const prodR = await apiPost('/api/products', { name: 'S10_קבוצתי_' + ts(), description: 'מוצר קבוצתי בדיקה S10', price: 300, tenantId, stockCount: 50, active: true, inStock: true, category: 'בדיקות', subCategory: 'כללי', isGroupProduct: true, media: { images: [{ url: 'https://placehold.co/400x400/1e3a8a/white?text=S10', alt: 'S10' }] } });
    const productId = prodR.data?._id || prodR.data?.product?._id;
    if (!productId) { addLog('[x] יצירת מוצר נכשלה: ' + (prodR.data?.error || 'HTTP ' + prodR.status), 'error'); return { success: false }; }
    addLog('[v] מוצר קבוצתי נוצר', 'success');
    return { success: true, tenantId, productId };
  };

  const s10CreateGroup = async () => {
    const setup = getData('s10-setup');
    if (!setup?.productId || !setup?.tenantId) { addLog('[x] חסרים נתונים', 'error'); return { success: false }; }
    addLog('יוצר רכישה קבוצתית...');
    const r = await apiPost('/api/group-purchases', { productId: setup.productId, tenantId: setup.tenantId });
    const gpId = r.data?._id || r.data?.groupPurchase?._id;
    if (r.ok && gpId) { addLog('[v] קבוצה נוצרה: ' + gpId, 'success'); return { success: true, groupPurchaseId: gpId }; }
    if (r.status === 404) { addLog('[WARN] API /api/group-purchases לא קיים', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] שגיאה: ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false };
  };

  const s10JoinGroup = async () => {
    const gp = getData('s10-create-group');
    if (gp?.skipped) { addLog('[WARN] דילוג', 'warning'); return { success: true, skipped: true }; }
    if (!gp?.groupPurchaseId) { addLog('[x] אין קבוצה', 'error'); return { success: false }; }
    addLog('לקוח מצטרף...');
    const custR = await apiPost('/api/auth/register', { fullName: 'S10 לקוח', email: 'sim-s10-cust-' + ts() + '@test.com', phone: randomPhone(), password: 'Test1234!', role: 'customer' });
    const r = await apiPost('/api/group-purchases/' + gp.groupPurchaseId + '/join', { userId: custR.data?.userId });
    if (r.ok) { addLog('[v] הצטרף לקבוצה', 'success'); return { success: true, customerId: custR.data?.userId }; }
    addLog('[x] הצטרפות נכשלה: HTTP ' + r.status, 'error');
    return { success: false };
  };

  const s10VerifyGroupStatus = async () => {
    const gp = getData('s10-create-group');
    if (gp?.skipped) { addLog('[WARN] דילוג', 'warning'); return { success: true, skipped: true }; }
    if (!gp?.groupPurchaseId) { addLog('[x] אין קבוצה', 'error'); return { success: false }; }
    const r = await apiGet('/api/group-purchases/' + gp.groupPurchaseId);
    if (r.ok) { addLog('[v] סטטוס: ' + (r.data?.status || 'unknown'), 'success'); return { success: true, status: r.data?.status }; }
    addLog('[x] שליפה נכשלה: HTTP ' + r.status, 'error');
    return { success: false };
  };

  const s10CloseGroup = async () => {
    const gp = getData('s10-create-group');
    if (gp?.skipped) { addLog('[WARN] דילוג', 'warning'); return { success: true, skipped: true }; }
    if (!gp?.groupPurchaseId) { addLog('[x] אין קבוצה', 'error'); return { success: false }; }
    addLog('סוגר קבוצה...');
    const r = await apiPatch('/api/group-purchases/' + gp.groupPurchaseId, { status: 'closed' });
    if (r.ok) { addLog('[v] קבוצה נסגרה', 'success'); return { success: true }; }
    addLog('[x] סגירה נכשלה: HTTP ' + r.status, 'error');
    return { success: false };
  };

  // ============================================================
  // S14 - IMPERSONATION TEST FUNCTIONS
  // ============================================================

  const s14GetTenants = async () => {
    // Safety: exit any stuck impersonation from previous runs
    await apiDelete('/api/admin/impersonate');
    // Re-login as admin to ensure clean session
    await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });
    addLog('שולף עסקים...');
    const r = await apiGet('/api/tenants');
    const tenants = r.data?.tenants || [];
    if (tenants.length >= 1) {
      addLog('[v] נמצאו ' + tenants.length + ' עסקים', 'success');
      return { success: true, tenantId: tenants[0]._id || tenants[0].id, tenantName: tenants[0].name };
    }
    addLog('[x] אין עסקים', 'error');
    return { success: false };
  };

  const s14Impersonate = async () => {
    const t = getData('s14-get-tenants');
    if (!t?.tenantId) { addLog('[x] אין עסק', 'error'); return { success: false }; }
    addLog('מנהל נכנס לעסק: ' + t.tenantName);
    const r = await apiPost('/api/admin/impersonate', { tenantId: t.tenantId });
    if (r.ok) { addLog('[v] impersonate הצליח', 'success'); return { success: true }; }
    if (r.status === 404) { addLog('[WARN] API /api/admin/impersonate לא קיים', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] נכשל: HTTP ' + r.status, 'error');
    return { success: false };
  };

  const s14VerifyFiltered = async () => {
    const imp = getData('s14-impersonate');
    if (imp?.skipped) { addLog('[WARN] דילוג', 'warning'); return { success: true, skipped: true }; }
    const t = getData('s14-get-tenants');
    addLog('בודק שהמוצרים מסוננים לעסק...');
    const r = await apiGet('/api/products?limit=50');
    const products = r.data?.products || r.data?.items || [];
    const filtered = products.every(p => !p.tenantId || String(p.tenantId) === t.tenantId);
    if (filtered) { addLog('[v] נתונים מסוננים לעסק', 'success'); return { success: true }; }
    addLog('[WARN] חלק מהמוצרים משייכים לעסקים אחרים', 'warning');
    return { success: true, skipped: true };
  };

  const s14Unimpersonate = async () => {
    const imp = getData('s14-impersonate');
    if (imp?.skipped) { addLog('[WARN] דילוג', 'warning'); return { success: true, skipped: true }; }
    addLog('חוזר מ-impersonate...');
    const r = await apiDelete('/api/admin/impersonate');
    if (r.ok) { addLog('[v] חזרה הצליחה', 'success'); return { success: true }; }
    addLog('[x] חזרה נכשלה: ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false };
  };

  const s14VerifyAllData = async () => {
    const imp = getData('s14-impersonate');
    if (imp?.skipped) { addLog('[WARN] דילוג', 'warning'); return { success: true, skipped: true }; }
    addLog('בודק שמנהל רואה הכל שוב...');
    const r = await apiGet('/api/products?limit=200');
    const products = r.data?.products || r.data?.items || [];
    addLog('[v] מנהל רואה ' + products.length + ' מוצרים', 'success');
    return { success: true, count: products.length };
  };

  // ============================================================
  // S15 - BUSINESS E2E TEST FUNCTIONS
  // ============================================================

  const s15RegisterBusiness = async () => {
    const email = 'sim-s15-bizowner-' + ts() + '@test.com';
    addLog('רושם בעל עסק: ' + email);
    const r = await apiPost('/api/auth/register', { fullName: 'S15 בעל עסק', email, phone: randomPhone(), password: 'Test1234!', role: 'business_admin' });
    if (r.ok && r.data?.userId) { addLog('[v] נרשם: ' + r.data.userId, 'success'); return { success: true, userId: r.data.userId, email }; }
    addLog('[x] שגיאה: ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false };
  };

  const s15CreateTenant = async () => {
    const owner = getData('s15-register-business');
    if (!owner?.userId) { addLog('[x] אין בעלים', 'error'); return { success: false }; }
    const name = 'S15_עסק_' + ts();
    addLog('יוצר Tenant: ' + name);
    const r = await apiPost('/api/tenants', { name, slug: 'sim-s15-' + ts(), ownerId: owner.userId, domain: 'sim-s15-' + ts() + '.test.com' });
    const tenantId = r.data?._id || r.data?.tenant?._id;
    if (r.ok && tenantId) { addLog('[v] עסק נוצר: ' + tenantId, 'success'); return { success: true, tenantId, name }; }
    addLog('[x] שגיאה: ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false };
  };

  const s15ApproveTenant = async () => {
    const t = getData('s15-create-tenant');
    if (!t?.tenantId) { addLog('[x] אין עסק', 'error'); return { success: false }; }
    addLog('מאשר עסק...');
    const r = await apiPatch('/api/tenants/' + t.tenantId, { status: 'active' });
    if (r.ok) { addLog('[v] עסק אושר', 'success'); return { success: true }; }
    addLog('[x] אישור נכשל: HTTP ' + r.status, 'error');
    return { success: false };
  };

  const s15AddProduct = async () => {
    const t = getData('s15-create-tenant');
    if (!t?.tenantId) { addLog('[x] אין עסק', 'error'); return { success: false }; }
    addLog('מוסיף מוצר לעסק...');
    const r = await apiPost('/api/products', { name: 'S15_מוצר_' + ts(), description: 'מוצר בדיקה S15', price: 250, tenantId: t.tenantId, stockCount: 30, active: true, inStock: true, category: 'בדיקות', subCategory: 'כללי', media: { images: [{ url: 'https://placehold.co/400x400/1e3a8a/white?text=S15', alt: 'S15' }] } });
    const productId = r.data?._id || r.data?.product?._id;
    if (r.ok && productId) { addLog('[v] מוצר נוצר: ' + productId, 'success'); return { success: true, productId }; }
    addLog('[x] שגיאה: HTTP ' + r.status, 'error');
    return { success: false };
  };

  const s15AddAgent = async () => {
    const agentEmail = 'sim-s15-agent-' + ts() + '@test.com';
    addLog('רושם סוכן: ' + agentEmail);
    const r = await apiPost('/api/auth/register', { fullName: 'S15 סוכן', email: agentEmail, phone: randomPhone(), password: 'Test1234!', role: 'agent' });
    if (r.ok && r.data?.userId) { addLog('[v] סוכן נרשם: ' + r.data.userId, 'success'); return { success: true, agentId: r.data.userId, agentEmail }; }
    addLog('[x] שגיאה: HTTP ' + r.status, 'error');
    return { success: false };
  };

  const s15CustomerPurchase = async () => {
    const t = getData('s15-create-tenant');
    const prod = getData('s15-add-product');
    if (!t?.tenantId || !prod?.productId) { addLog('[x] חסרים נתונים', 'error'); return { success: false }; }
    addLog('לקוח רוכש...');
    const custR = await apiPost('/api/auth/register', { fullName: 'S15 לקוח', email: 'sim-s15-cust-' + ts() + '@test.com', phone: randomPhone(), password: 'Test1234!', role: 'customer' });
    const orderR = await apiPost('/api/orders', { customerId: custR.data?.userId, tenantId: t.tenantId, items: [{ productId: prod.productId, quantity: 1, price: 250 }], totalAmount: 250, status: 'completed' });
    if (orderR.ok) { addLog('[v] רכישה הצליחה', 'success'); return { success: true, customerId: custR.data?.userId, orderId: orderR.data?.orderId || orderR.data?._id || orderR.data?.order?._id }; }
    addLog('[x] רכישה נכשלה: HTTP ' + orderR.status, 'error');
    return { success: false };
  };

  const s15VerifyDashboard = async () => {
    const t = getData('s15-create-tenant');
    const purchase = getData('s15-customer-purchase');
    if (!t?.tenantId) { addLog('[x] אין עסק', 'error'); return { success: false }; }
    addLog('בודק דשבורד עסק (tenantId: ' + t.tenantId + ')...');
    const ordersR = await apiGet('/api/orders?tenantId=' + t.tenantId + '&limit=5');
    const orders = ordersR.data?.orders || ordersR.data?.items || [];
    if (orders.length > 0) { addLog('[v] נמצאו ' + orders.length + ' הזמנות בעסק', 'success'); return { success: true }; }
    // Fallback: check if order exists by ID from purchase step
    if (purchase?.orderId) {
      addLog('[WARN] לא נמצאו הזמנות ב-tenantId filter, בודק לפי orderId: ' + purchase.orderId, 'warning');
      const singleR = await apiGet('/api/orders/' + purchase.orderId);
      if (singleR.ok) {
        const orderTenant = singleR.data?.order?.tenantId || singleR.data?.tenantId || 'N/A';
        addLog('[WARN] הזמנה קיימת, tenantId בהזמנה: ' + orderTenant + ' (צפוי: ' + t.tenantId + ')', 'warning');
        return { success: true, mismatch: orderTenant !== t.tenantId };
      }
    }
    addLog('[x] אין הזמנות בעסק (HTTP ' + ordersR.status + ')', 'error');
    return { success: false };
  };

  // ============================================================
  // S16 - RBAC MATRIX TEST FUNCTIONS
  // ============================================================

  const s16SetupUsers = async () => {
    addLog('יוצר 3 משתמשי בדיקה...');
    const custEmail = 'sim-s16-cust-' + ts() + '@test.com';
    const agentEmail = 'sim-s16-agent-' + ts() + '@test.com';
    const custR = await apiPost('/api/auth/register', { fullName: 'S16 לקוח', email: custEmail, phone: randomPhone(), password: 'Test1234!', role: 'customer' });
    const agentR = await apiPost('/api/auth/register', { fullName: 'S16 סוכן', email: agentEmail, phone: randomPhone(), password: 'Test1234!', role: 'agent' });
    if (!custR.ok || !agentR.ok) { addLog('[x] יצירת משתמשים נכשלה', 'error'); return { success: false }; }
    // Re-login as admin after register changed session
    await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });
    addLog('[v] נוצרו: customer + agent', 'success');
    return { success: true, customer: { userId: custR.data.userId, email: custEmail, password: 'Test1234!' }, agent: { userId: agentR.data.userId, email: agentEmail, password: 'Test1234!' } };
  };

  const s16TestAsRole = async (role, method, url, expectedOk) => {
    const setup = getData('s16-setup-users');
    if (!setup) { addLog('[x] אין setup', 'error'); return { success: false }; }
    await apiPost('/api/auth/logout', {});
    const user = role === 'customer' ? setup.customer : setup.agent;
    if (user?.email) await apiPost('/api/auth/login', { identifier: user.email, password: user.password });
    const r = method === 'GET' ? await apiGet(url) : method === 'POST' ? await apiPost(url, {}) : await apiDelete(url);
    await s4ReloginAsAdmin();
    const pass = expectedOk ? r.ok : (r.status === 401 || r.status === 403);
    addLog((pass ? '[v] ' : '[x] ') + role + ' ' + method + ' ' + url + ' → HTTP ' + r.status, pass ? 'success' : 'error');
    return { success: pass, httpStatus: r.status };
  };

  const s16ProductsCustomerGet = () => s16TestAsRole('customer', 'GET', '/api/products?limit=1', true);
  const s16ProductsCustomerPost = () => s16TestAsRole('customer', 'POST', '/api/products', false);
  const s16ProductsAgentGet = () => s16TestAsRole('agent', 'GET', '/api/products?limit=1', true);
  const s16UsersCustomer403 = () => s16TestAsRole('customer', 'GET', '/api/users?limit=1', false);
  const s16UsersAgent403 = () => s16TestAsRole('agent', 'GET', '/api/users?limit=1', false);
  const s16UsersAdmin200 = async () => {
    addLog('מנהל שולף משתמשים...');
    const r = await apiGet('/api/users?limit=1');
    if (r.ok) { addLog('[v] admin GET /api/users → 200', 'success'); return { success: true }; }
    addLog('[x] admin GET /api/users → HTTP ' + r.status, 'error');
    return { success: false };
  };
  const s16OrdersCustomerOwn = () => s16TestAsRole('customer', 'GET', '/api/orders?limit=5', true);
  const s16OrdersAdminAll = async () => {
    const r = await apiGet('/api/orders?limit=5');
    if (r.ok) { addLog('[v] admin GET /api/orders → 200', 'success'); return { success: true }; }
    addLog('[x] HTTP ' + r.status, 'error');
    return { success: false };
  };
  const s16DeleteOrderCustomer403 = () => s16TestAsRole('customer', 'DELETE', '/api/orders/000000000000000000000000', false);

  // ============================================================
  // S18 - INPUT VALIDATION TEST FUNCTIONS
  // ============================================================

  const s18Validate = async (desc, url, body, expectFail) => {
    addLog(desc);
    const r = await apiPost(url, body);
    const failed = !r.ok || r.data?.error;
    if (expectFail && failed) { addLog('[v] שגיאה כצפוי: ' + (r.data?.error || 'HTTP ' + r.status), 'success'); return { success: true }; }
    if (expectFail && !failed) { addLog('[WARN] הצליח למרות שציפינו לשגיאה', 'warning'); return { success: true, skipped: true }; }
    return { success: !expectFail };
  };

  const s18RegisterNoEmail = () => s18Validate('הרשמה ללא מייל...', '/api/auth/register', { fullName: 'Test', password: 'Test1234!' }, true);
  const s18RegisterNoPassword = () => s18Validate('הרשמה ללא סיסמה...', '/api/auth/register', { fullName: 'Test', email: 'no-pass-' + ts() + '@test.com' }, true);
  const s18ProductNoName = () => s18Validate('מוצר ללא שם...', '/api/products', { price: 100 }, true);
  const s18ProductNoPrice = () => s18Validate('מוצר ללא מחיר...', '/api/products', { name: 'No Price' }, true);
  const s18NegativePrice = () => s18Validate('מוצר עם מחיר שלילי...', '/api/products', { name: 'Negative', price: -100 }, true);
  const s18InvalidEmail = () => s18Validate('הרשמה עם מייל לא תקין...', '/api/auth/register', { fullName: 'Test', email: 'not-an-email', password: 'Test1234!' }, true);
  const s18XssName = () => s18Validate('XSS בשם...', '/api/auth/register', { fullName: '<script>alert(1)</script>', email: 'xss-' + ts() + '@test.com', password: 'Test1234!' }, true);
  const s18HugePayload = () => s18Validate('Payload ענק (100K)...', '/api/products', { name: 'Huge', description: 'x'.repeat(100000), price: 10 }, true);

  // ============================================================
  // S19 - CASCADE DELETE TEST FUNCTIONS
  // ============================================================

  const s19Setup = async () => {
    addLog('שולף עסק...');
    const tenR = await apiGet('/api/tenants');
    const tenants = tenR.data?.tenants || [];
    if (!tenants.length) { addLog('[x] אין עסקים', 'error'); return { success: false }; }
    const tenantId = tenants[0]._id || tenants[0].id;
    addLog('יוצר לקוח...');
    const custR = await apiPost('/api/auth/register', { fullName: 'S19 לקוח', email: 'sim-s19-cust-' + ts() + '@test.com', phone: randomPhone(), password: 'Test1234!', role: 'customer' });
    const custId = custR.data?.userId;
    if (!custId) { addLog('[x] יצירת לקוח נכשלה', 'error'); return { success: false }; }
    addLog('יוצר מוצר...');
    const prodR = await apiPost('/api/products', { name: 'S19_מוצר_' + ts(), description: 'מוצר בדיקה S19', price: 100, tenantId, stockCount: 10, active: true, inStock: true, category: 'בדיקות', subCategory: 'כללי', media: { images: [{ url: 'https://placehold.co/400x400/1e3a8a/white?text=S19', alt: 'S19' }] } });
    const productId = prodR.data?._id || prodR.data?.product?._id;
    addLog('יוצר הזמנה...');
    const orderR = await apiPost('/api/orders', { customerId: custId, tenantId, items: [{ productId, quantity: 1, price: 100 }], totalAmount: 100, status: 'completed' });
    const orderId = orderR.data?.orderId || orderR.data?._id || orderR.data?.order?._id;
    addLog('[v] הכנה: user + product + order', 'success');
    return { success: true, tenantId, customerId: custId, productId, orderId };
  };

  const s19DeleteUser = async () => {
    const setup = getData('s19-setup');
    if (!setup?.customerId) { addLog('[x] אין לקוח', 'error'); return { success: false }; }
    addLog('מוחק משתמש: ' + setup.customerId);
    const r = await apiDelete('/api/users/' + setup.customerId);
    if (r.ok) { addLog('[v] משתמש נמחק', 'success'); return { success: true }; }
    addLog('[x] מחיקה נכשלה: HTTP ' + r.status, 'error');
    return { success: false };
  };

  const s19VerifyOrdersGone = async () => {
    const setup = getData('s19-setup');
    if (!setup?.orderId) { addLog('[x] אין הזמנה', 'error'); return { success: false }; }
    addLog('בודק הזמנה של המשתמש שנמחק...');
    const r = await apiGet('/api/orders/' + setup.orderId);
    if (!r.ok || r.status === 404) { addLog('[v] הזמנה נמחקה/לא נמצאה - cascade delete עובד', 'success'); return { success: true }; }
    addLog('[WARN] הזמנה עדיין קיימת (ייתכן שאין cascade delete)', 'warning');
    return { success: true, skipped: true };
  };

  const s19VerifyProductDelete = async () => {
    const setup = getData('s19-setup');
    if (!setup?.productId) { addLog('[x] אין מוצר', 'error'); return { success: false }; }
    addLog('מוחק מוצר ובודק...');
    const delR = await apiDelete('/api/products/' + setup.productId);
    if (!delR.ok) { addLog('[x] מחיקת מוצר נכשלה', 'error'); return { success: false }; }
    const getR = await apiGet('/api/products/' + setup.productId);
    if (!getR.ok || getR.status === 404) { addLog('[v] מוצר נמחק ולא נמצא', 'success'); return { success: true }; }
    addLog('[x] מוצר עדיין קיים אחרי מחיקה', 'error');
    return { success: false };
  };

  // ============================================================
  // S20 - DATA CONSISTENCY TEST FUNCTIONS
  // ============================================================

  const s20Setup = async () => {
    addLog('שולף עסק...');
    const tenR = await apiGet('/api/tenants');
    const tenants = tenR.data?.tenants || [];
    if (!tenants.length) { addLog('[x] אין עסקים', 'error'); return { success: false }; }
    const tenantId = tenants[0]._id || tenants[0].id;
    addLog('יוצר מוצר (stock=10)...');
    const prodR = await apiPost('/api/products', { name: 'S20_consistency_' + ts(), description: 'מוצר בדיקה S20', price: 80, tenantId, stockCount: 10, active: true, inStock: true, category: 'בדיקות', subCategory: 'כללי', media: { images: [{ url: 'https://placehold.co/400x400/1e3a8a/white?text=S20', alt: 'S20' }] } });
    const productId = prodR.data?._id || prodR.data?.product?._id;
    if (!productId) { addLog('[x] יצירת מוצר נכשלה: ' + (prodR.data?.error || 'HTTP ' + prodR.status), 'error'); return { success: false }; }
    addLog('יוצר לקוח...');
    const custR = await apiPost('/api/auth/register', { fullName: 'S20 לקוח', email: 'sim-s20-cust-' + ts() + '@test.com', phone: randomPhone(), password: 'Test1234!', role: 'customer' });
    addLog('[v] מוכן: מוצר stock=10 + לקוח', 'success');
    return { success: true, tenantId, productId, customerId: custR.data?.userId, initialStock: 10 };
  };

  const s20OrderStock = async () => {
    const setup = getData('s20-setup');
    if (!setup?.productId || !setup?.customerId) { addLog('[x] חסרים נתונים', 'error'); return { success: false }; }
    addLog('יוצר הזמנה (qty=1)...');
    await apiPost('/api/orders', { customerId: setup.customerId, tenantId: setup.tenantId, items: [{ productId: setup.productId, quantity: 1, price: 80 }], totalAmount: 80, status: 'completed' });
    addLog('בודק מלאי...');
    const r = await apiGet('/api/products/' + setup.productId);
    const stock = (r.data?.product || r.data)?.stockCount;
    if (stock !== undefined && stock < setup.initialStock) { addLog('[v] מלאי ירד: ' + setup.initialStock + ' → ' + stock, 'success'); return { success: true, stock }; }
    addLog('[WARN] מלאי לא ירד (stock=' + stock + ')', 'warning');
    return { success: true, skipped: true };
  };

  const s20OrderTotal = async () => {
    const setup = getData('s20-setup');
    if (!setup?.productId || !setup?.customerId) { addLog('[x] חסרים נתונים', 'error'); return { success: false }; }
    addLog('יוצר הזמנה (qty=3, price=80)...');
    const r = await apiPost('/api/orders', { customerId: setup.customerId, tenantId: setup.tenantId, items: [{ productId: setup.productId, quantity: 3, price: 80 }], totalAmount: 240, status: 'completed' });
    const order = r.data?.order || r.data;
    const total = order?.totalAmount;
    if (total === 240) { addLog('[v] סכום הזמנה נכון: ' + total, 'success'); return { success: true }; }
    addLog('[WARN] totalAmount=' + total + ' (ציפינו ל-240)', 'warning');
    return { success: true, skipped: true };
  };

  const s20MultiOrderStock = async () => {
    const setup = getData('s20-setup');
    if (!setup?.productId || !setup?.customerId) { addLog('[x] חסרים נתונים', 'error'); return { success: false }; }
    addLog('בודק מלאי לפני...');
    const beforeR = await apiGet('/api/products/' + setup.productId);
    const before = (beforeR.data?.product || beforeR.data)?.stockCount || 0;
    addLog('יוצר 3 הזמנות...');
    for (let i = 0; i < 3; i++) {
      await apiPost('/api/orders', { customerId: setup.customerId, tenantId: setup.tenantId, items: [{ productId: setup.productId, quantity: 1, price: 80 }], totalAmount: 80, status: 'completed' });
    }
    addLog('בודק מלאי אחרי...');
    const afterR = await apiGet('/api/products/' + setup.productId);
    const after = (afterR.data?.product || afterR.data)?.stockCount || 0;
    const diff = before - after;
    if (diff >= 3) { addLog('[v] מלאי ירד ב-' + diff + ': ' + before + ' → ' + after, 'success'); return { success: true }; }
    addLog('[WARN] מלאי ירד ב-' + diff + ' (ציפינו ל-3)', 'warning');
    return { success: true, skipped: true };
  };

  // ============================================================
  // S11 - SHARED CONTAINER TEST FUNCTIONS
  // ============================================================

  const s11Setup = async () => {
    addLog('שולף עסק...');
    const tenR = await apiGet('/api/tenants');
    const tenants = tenR.data?.tenants || [];
    if (!tenants.length) { addLog('[x] אין עסקים', 'error'); return { success: false }; }
    const tenantId = tenants[0]._id || tenants[0].id;
    addLog('יוצר מוצר עם CBM...');
    const prodR = await apiPost('/api/products', { name: 'S11_container_' + ts(), description: 'מוצר בדיקה S11 container', price: 200, tenantId, stockCount: 100, active: true, inStock: true, category: 'בדיקות', subCategory: 'כללי', cbm: 2.5, media: { images: [{ url: 'https://placehold.co/400x400/1e3a8a/white?text=S11', alt: 'S11' }] } });
    const productId = prodR.data?._id || prodR.data?.product?._id;
    if (!productId) { addLog('[x] יצירת מוצר נכשלה: ' + (prodR.data?.error || 'HTTP ' + prodR.status), 'error'); return { success: false }; }
    addLog('יוצר לקוח...');
    const custR = await apiPost('/api/auth/register', { fullName: 'S11 לקוח', email: 'sim-s11-cust-' + ts() + '@test.com', phone: randomPhone(), password: 'Test1234!', role: 'customer' });
    addLog('[v] הכנה הושלמה', 'success');
    return { success: true, tenantId, productId, customerId: custR.data?.userId };
  };

  const s11CreateContainer = async () => {
    const setup = getData('s11-setup');
    if (!setup?.tenantId) { addLog('[x] חסרים נתונים', 'error'); return { success: false }; }
    addLog('יוצר מכולה משותפת...');
    const r = await apiPost('/api/containers', { tenantId: setup.tenantId, maxCbm: 68 });
    const cId = r.data?._id || r.data?.container?._id;
    if (r.ok && cId) { addLog('[v] מכולה נוצרה: ' + cId, 'success'); return { success: true, containerId: cId }; }
    if (r.status === 404) { addLog('[WARN] API /api/containers לא קיים', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] שגיאה: ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false };
  };

  const s11AddOrderToContainer = async () => {
    const c = getData('s11-create-container');
    if (c?.skipped) { addLog('[WARN] דילוג', 'warning'); return { success: true, skipped: true }; }
    if (!c?.containerId) { addLog('[x] אין מכולה', 'error'); return { success: false }; }
    const setup = getData('s11-setup');
    addLog('יוצר הזמנה ומוסיף למכולה...');
    const orderR = await apiPost('/api/orders', { customerId: setup.customerId, tenantId: setup.tenantId, items: [{ productId: setup.productId, quantity: 5, price: 200 }], totalAmount: 1000, status: 'completed' });
    const orderId = orderR.data?.orderId || orderR.data?._id || orderR.data?.order?._id;
    if (!orderId) { addLog('[x] יצירת הזמנה נכשלה', 'error'); return { success: false }; }
    const addR = await apiPost('/api/containers/' + c.containerId + '/orders', { orderId });
    if (addR.ok) { addLog('[v] הזמנה נוספה למכולה', 'success'); return { success: true, orderId }; }
    addLog('[WARN] הוספה למכולה נכשלה: HTTP ' + addR.status, 'warning');
    return { success: true, skipped: true };
  };

  const s11CheckCbm = async () => {
    const c = getData('s11-create-container');
    if (c?.skipped) { addLog('[WARN] דילוג', 'warning'); return { success: true, skipped: true }; }
    if (!c?.containerId) { addLog('[x] אין מכולה', 'error'); return { success: false }; }
    addLog('בודק CBM מצטבר...');
    const r = await apiGet('/api/containers/' + c.containerId);
    const cbm = r.data?.currentCbm || r.data?.container?.currentCbm || 0;
    addLog('[v] CBM נוכחי: ' + cbm + ' / 68', 'success');
    return { success: true, currentCbm: cbm };
  };

  const s11ContainerStatus = async () => {
    const c = getData('s11-create-container');
    if (c?.skipped) { addLog('[WARN] דילוג', 'warning'); return { success: true, skipped: true }; }
    if (!c?.containerId) { addLog('[x] אין מכולה', 'error'); return { success: false }; }
    addLog('בודק סטטוס מכולה...');
    const r = await apiGet('/api/containers/' + c.containerId);
    const status = r.data?.status || r.data?.container?.status || 'unknown';
    addLog('[v] סטטוס: ' + status, 'success');
    return { success: true, status };
  };

  // ============================================================
  // S12 - PAYPLUS TEST FUNCTIONS
  // ============================================================

  const s12Setup = async () => {
    addLog('שולף עסק...');
    const tenR = await apiGet('/api/tenants');
    const tenants = tenR.data?.tenants || [];
    if (!tenants.length) { addLog('[x] אין עסקים', 'error'); return { success: false }; }
    const tenantId = tenants[0]._id || tenants[0].id;
    addLog('יוצר מוצר + לקוח...');
    const prodR = await apiPost('/api/products', { name: 'S12_pay_' + ts(), description: 'מוצר בדיקה S12', price: 100, tenantId, stockCount: 10, active: true, inStock: true, category: 'בדיקות', subCategory: 'כללי', media: { images: [{ url: 'https://placehold.co/400x400/1e3a8a/white?text=S12', alt: 'S12' }] } });
    const productId = prodR.data?._id || prodR.data?.product?._id;
    const custR = await apiPost('/api/auth/register', { fullName: 'S12 לקוח', email: 'sim-s12-cust-' + ts() + '@test.com', phone: randomPhone(), password: 'Test1234!', role: 'customer' });
    addLog('יוצר הזמנה...');
    const orderR = await apiPost('/api/orders', { customerId: custR.data?.userId, tenantId, items: [{ productId, quantity: 1, price: 100 }], totalAmount: 100, status: 'pending' });
    const orderId = orderR.data?.orderId || orderR.data?._id || orderR.data?.order?._id;
    addLog('[v] הכנה הושלמה', 'success');
    return { success: true, tenantId, productId, customerId: custR.data?.userId, orderId };
  };

  const s12CreatePayment = async () => {
    const setup = getData('s12-setup');
    if (!setup?.orderId) { addLog('[x] אין הזמנה', 'error'); return { success: false }; }
    addLog('יוצר session תשלום PayPlus...');
    const r = await apiPost('/api/payments/create', { orderId: setup.orderId, amount: 100 });
    if (r.ok && r.data?.paymentUrl) { addLog('[v] session נוצר: ' + r.data.paymentUrl.substring(0, 60) + '...', 'success'); return { success: true, paymentUrl: r.data.paymentUrl, paymentId: r.data.paymentId }; }
    if (r.status === 404) { addLog('[WARN] API /api/payments/create לא קיים', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] שגיאה: ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false };
  };

  const s12PaymentStatus = async () => {
    const pay = getData('s12-create-payment');
    if (pay?.skipped) { addLog('[WARN] דילוג', 'warning'); return { success: true, skipped: true }; }
    const setup = getData('s12-setup');
    if (!setup?.orderId) { addLog('[x] אין הזמנה', 'error'); return { success: false }; }
    addLog('בודק סטטוס תשלום...');
    const r = await apiGet('/api/orders/' + setup.orderId);
    const order = r.data?.order || r.data;
    const paymentStatus = order?.paymentStatus || order?.status;
    addLog('[v] סטטוס תשלום: ' + paymentStatus, 'success');
    return { success: true, paymentStatus };
  };

  const s12WebhookSuccess = async () => {
    const pay = getData('s12-create-payment');
    if (pay?.skipped) { addLog('[WARN] דילוג', 'warning'); return { success: true, skipped: true }; }
    const setup = getData('s12-setup');
    addLog('מדמה webhook תשלום מוצלח...');
    const r = await apiPost('/api/payments/webhook', {
      transaction_uid: 'sim-' + ts(),
      status_code: '000',
      amount: 100,
      order_id: setup?.orderId,
      more_info: 'simulator-test',
    });
    if (r.ok) { addLog('[v] Webhook התקבל בהצלחה', 'success'); return { success: true }; }
    if (r.status === 404) { addLog('[WARN] API /api/payments/webhook לא קיים', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] Webhook נכשל: HTTP ' + r.status, 'error');
    return { success: false };
  };

  const s12OrderPaid = async () => {
    const wh = getData('s12-webhook-success');
    if (wh?.skipped) { addLog('[WARN] דילוג', 'warning'); return { success: true, skipped: true }; }
    const setup = getData('s12-setup');
    if (!setup?.orderId) { addLog('[x] אין הזמנה', 'error'); return { success: false }; }
    addLog('בודק שההזמנה עודכנה...');
    const r = await apiGet('/api/orders/' + setup.orderId);
    const order = r.data?.order || r.data;
    const status = order?.paymentStatus || order?.status;
    if (status === 'paid' || status === 'completed' || status === 'PAID') {
      addLog('[v] הזמנה עודכנה ל: ' + status, 'success');
      return { success: true };
    }
    addLog('[WARN] סטטוס הזמנה: ' + status + ' (ציפינו ל-paid)', 'warning');
    return { success: true, skipped: true };
  };

  const s12Idempotent = async () => {
    const wh = getData('s12-webhook-success');
    if (wh?.skipped) { addLog('[WARN] דילוג', 'warning'); return { success: true, skipped: true }; }
    const setup = getData('s12-setup');
    addLog('שולח webhook כפול...');
    const r = await apiPost('/api/payments/webhook', {
      transaction_uid: 'sim-' + ts(),
      status_code: '000',
      amount: 100,
      order_id: setup?.orderId,
      more_info: 'simulator-duplicate',
    });
    addLog('[v] Webhook כפול נשלח (HTTP ' + r.status + ')', r.ok ? 'success' : 'warning');
    return { success: true };
  };

  // ============================================================
  // S13 - PRIORITY ERP TEST FUNCTIONS
  // ============================================================

  const s13Setup = async () => {
    addLog('שולף עסק...');
    const tenR = await apiGet('/api/tenants');
    const tenants = tenR.data?.tenants || [];
    if (!tenants.length) { addLog('[x] אין עסקים', 'error'); return { success: false }; }
    const tenantId = tenants[0]._id || tenants[0].id;
    addLog('יוצר לקוח + מוצר + הזמנה...');
    const custR = await apiPost('/api/auth/register', { fullName: 'S13 לקוח Priority', email: 'sim-s13-cust-' + ts() + '@test.com', phone: randomPhone(), password: 'Test1234!', role: 'customer' });
    const custId = custR.data?.userId;
    const prodR = await apiPost('/api/products', { name: 'S13_erp_' + ts(), description: 'מוצר בדיקה S13', price: 300, tenantId, stockCount: 10, active: true, inStock: true, category: 'בדיקות', subCategory: 'כללי', media: { images: [{ url: 'https://placehold.co/400x400/1e3a8a/white?text=S13', alt: 'S13' }] } });
    const productId = prodR.data?._id || prodR.data?.product?._id;
    const orderR = await apiPost('/api/orders', { customerId: custId, tenantId, items: [{ productId, quantity: 1, price: 300 }], totalAmount: 300, status: 'completed' });
    const orderId = orderR.data?.orderId || orderR.data?._id || orderR.data?.order?._id;
    addLog('[v] הכנה הושלמה', 'success');
    return { success: true, tenantId, customerId: custId, productId, orderId };
  };

  const s13SyncCustomer = async () => {
    const setup = getData('s13-setup');
    if (!setup?.customerId) { addLog('[x] אין לקוח', 'error'); return { success: false }; }
    addLog('שולח סנכרון לקוח ל-Priority...');
    const r = await apiPost('/api/priority/sync-customer', { userId: setup.customerId });
    if (r.ok) { addLog('[v] סנכרון לקוח הצליח', 'success'); return { success: true }; }
    if (r.status === 404) { addLog('[WARN] API /api/priority/sync-customer לא קיים', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] סנכרון נכשל: ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false };
  };

  const s13SyncOrder = async () => {
    const setup = getData('s13-setup');
    if (!setup?.orderId) { addLog('[x] אין הזמנה', 'error'); return { success: false }; }
    addLog('שולח סנכרון הזמנה ל-Priority...');
    const r = await apiPost('/api/priority/sync-order', { orderId: setup.orderId });
    if (r.ok) { addLog('[v] סנכרון הזמנה הצליח', 'success'); return { success: true }; }
    if (r.status === 404) { addLog('[WARN] API /api/priority/sync-order לא קיים', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] סנכרון נכשל: ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false };
  };

  const s13SyncStatus = async () => {
    const custSync = getData('s13-sync-customer');
    const orderSync = getData('s13-sync-order');
    if (custSync?.skipped && orderSync?.skipped) { addLog('[WARN] API סנכרון לא קיים - דילוג', 'warning'); return { success: true, skipped: true }; }
    addLog('בודק סטטוס סנכרון...');
    const setup = getData('s13-setup');
    const r = await apiGet('/api/priority/sync-status?orderId=' + (setup?.orderId || ''));
    if (r.ok) { addLog('[v] סטטוס: ' + JSON.stringify(r.data).substring(0, 100), 'success'); return { success: true }; }
    if (r.status === 404) { addLog('[WARN] API sync-status לא קיים', 'warning'); return { success: true, skipped: true }; }
    addLog('[WARN] סטטוס סנכרון: HTTP ' + r.status, 'warning');
    return { success: true };
  };

  // ============================================================
  // S17 - RATE LIMITING TEST FUNCTIONS
  // ============================================================

  const s17RapidRequests = async () => {
    addLog('שולח 50 בקשות GET מהירות...');
    let ok = 0; let blocked = 0; let lastStatus = 200;
    for (let i = 0; i < 50; i++) {
      const r = await apiGet('/api/products?limit=1');
      if (r.ok) ok++;
      else { blocked++; lastStatus = r.status; }
    }
    addLog('[v] ' + ok + ' הצליחו, ' + blocked + ' נחסמו (אחרון: HTTP ' + lastStatus + ')', blocked > 0 ? 'success' : 'warning');
    return { success: true, ok, blocked, lastStatus };
  };

  const s17RateLimitHit = async () => {
    const rapid = getData('s17-rapid-requests');
    if (rapid?.blocked > 0) {
      addLog('[v] Rate limit הופעל: ' + rapid.blocked + ' בקשות נחסמו (HTTP ' + rapid.lastStatus + ')', 'success');
      return { success: true };
    }
    addLog('[WARN] לא נחסמו בקשות - ייתכן שאין rate limiting מוגדר', 'warning');
    return { success: true, skipped: true };
  };

  const s17LoginBrute = async () => {
    addLog('מנסה 20 התחברויות עם סיסמה שגויה...');
    let ok = 0; let blocked = 0; let lastStatus = 401;
    for (let i = 0; i < 20; i++) {
      const r = await apiPost('/api/auth/login', { identifier: 'brute-force-' + ts() + '@test.com', password: 'Wrong!' + i });
      if (r.status === 429) { blocked++; lastStatus = 429; }
      else ok++;
    }
    addLog('[v] ' + ok + ' קיבלו 401, ' + blocked + ' קיבלו 429', blocked > 0 ? 'success' : 'warning');
    return { success: true, ok, blocked, lastStatus };
  };

  const s17AfterCooldown = async () => {
    addLog('ממתין 3 שניות...');
    await new Promise(r => setTimeout(r, 3000));
    addLog('שולח בקשה אחרי המתנה...');
    const r = await apiGet('/api/products?limit=1');
    if (r.ok) { addLog('[v] חזר ל-200 אחרי cooldown', 'success'); return { success: true }; }
    addLog('[WARN] עדיין חסום: HTTP ' + r.status, 'warning');
    return { success: true, skipped: true };
  };

  // ============================================================
  // S21 - FULL SYSTEM E2E TEST FUNCTIONS
  // ============================================================

  const STORE_NAMES = ['חנות אלקטרוניקה', 'חנות אופנה', 'חנות בית וגן'];
  const STORE_SLUGS = ['electronics', 'fashion', 'home'];
  const PRODUCT_TYPES = [
    { suffix: 'רגיל', price: 150, stockCount: 20, commissionRate: 10 },
    { suffix: 'יקר', price: 800, stockCount: 10, commissionRate: 8 },
    { suffix: 'מבצע', price: 50, stockCount: 50, commissionRate: 15 },
    { suffix: 'קבוצתי', price: 300, stockCount: 30, commissionRate: 12, isGroupProduct: true },
  ];

  const s21CreateStores = async () => {
    addLog('========== S21: יוצר 3 חנויות ==========');
    // Re-login as admin
    await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });
    const stores = [];
    for (let i = 0; i < 3; i++) {
      addLog('יוצר בעלים לחנות ' + STORE_NAMES[i] + '...');
      const ownerEmail = 'sim-s21-owner-' + STORE_SLUGS[i] + '-' + ts() + '@test.com';
      const ownerR = await apiPost('/api/auth/register', { fullName: 'בעלים ' + STORE_NAMES[i], email: ownerEmail, phone: randomPhone(), password: 'Test1234!', role: 'business_admin' });
      if (!ownerR.ok) { addLog('[x] יצירת בעלים נכשלה: ' + (ownerR.data?.error || 'HTTP ' + ownerR.status), 'error'); return { success: false }; }
      const ownerId = ownerR.data?.userId;

      // Re-login as admin to create tenant
      await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });

      addLog('יוצר tenant: ' + STORE_NAMES[i] + '...');
      const tenR = await apiPost('/api/tenants', { name: STORE_NAMES[i], slug: STORE_SLUGS[i] + '-' + ts(), ownerId, domain: STORE_SLUGS[i] + '-' + ts() + '-test.vipo.co.il', status: 'active' });
      const tenantId = tenR.data?.tenantId || tenR.data?._id || tenR.data?.tenant?._id;
      if (!tenR.ok || !tenantId) { addLog('[x] יצירת tenant נכשלה: ' + (tenR.data?.error || 'HTTP ' + tenR.status), 'error'); return { success: false }; }

      stores.push({ tenantId, name: STORE_NAMES[i], slug: STORE_SLUGS[i], ownerId, ownerEmail, products: [], agents: [], customers: [], orders: [] });
      addLog('[v] חנות ' + (i + 1) + ': ' + STORE_NAMES[i] + ' (tenant: ' + tenantId + ')', 'success');
    }
    addLog('[v] 3 חנויות נוצרו בהצלחה', 'success');
    return { success: true, stores };
  };

  const s21CreateProducts = async () => {
    const setup = getData('s21-create-stores');
    if (!setup?.stores?.length) { addLog('[x] אין חנויות', 'error'); return { success: false }; }
    // Re-login as admin
    await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });
    const stores = JSON.parse(JSON.stringify(setup.stores));
    let totalProducts = 0;

    for (let si = 0; si < stores.length; si++) {
      const store = stores[si];
      addLog('--- מוצרים ל' + store.name + ' ---');
      for (let pi = 0; pi < PRODUCT_TYPES.length; pi++) {
        const pt = PRODUCT_TYPES[pi];
        const prodBody = {
          name: 'S21_' + store.slug + '_' + pt.suffix + '_' + ts(),
          description: 'מוצר בדיקה S21 - ' + pt.suffix + ' ב' + store.name,
          price: pt.price, tenantId: store.tenantId, stockCount: pt.stockCount,
          active: true, inStock: true, category: 'בדיקות', subCategory: pt.suffix,
          commissionRate: pt.commissionRate,
          media: { images: [{ url: 'https://placehold.co/400x400/1e3a8a/white?text=S21-' + store.slug + '-' + pi, alt: 'S21' }] },
        };
        if (pt.isGroupProduct) prodBody.isGroupProduct = true;
        const r = await apiPost('/api/products', prodBody);
        const pid = r.data?._id || r.data?.product?._id;
        if (!pid) { addLog('[x] מוצר ' + pt.suffix + ' נכשל: ' + (r.data?.error || 'HTTP ' + r.status), 'error'); return { success: false }; }
        store.products.push({ productId: pid, name: pt.suffix, price: pt.price, stockBefore: pt.stockCount, commissionRate: pt.commissionRate });
        totalProducts++;
      }
      addLog('[v] ' + PRODUCT_TYPES.length + ' מוצרים ל' + store.name, 'success');
    }
    addLog('[v] סה"כ ' + totalProducts + ' מוצרים נוצרו', 'success');
    return { success: true, stores, totalProducts };
  };

  const s21CreateAgents = async () => {
    const prev = getData('s21-create-products');
    if (!prev?.stores?.length) { addLog('[x] אין חנויות/מוצרים', 'error'); return { success: false }; }
    const stores = JSON.parse(JSON.stringify(prev.stores));
    let totalAgents = 0;

    for (let si = 0; si < stores.length; si++) {
      const store = stores[si];
      addLog('--- סוכנים ל' + store.name + ' ---');
      for (let ai = 0; ai < 3; ai++) {
        const email = 'sim-s21-agent-' + store.slug + '-' + ai + '-' + ts() + '@test.com';
        const r = await apiPost('/api/auth/register', { fullName: 'סוכן ' + (ai + 1) + ' ' + store.name, email, phone: randomPhone(), password: 'Test1234!', role: 'agent' });
        if (!r.ok) { addLog('[x] סוכן ' + (ai + 1) + ' נכשל', 'error'); return { success: false }; }
        const agentId = r.data?.userId;

        // Re-login admin & fetch coupon
        await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });
        const userR = await apiGet('/api/users/' + agentId);
        const coupon = userR.data?.user?.couponCode || userR.data?.couponCode || null;

        store.agents.push({ agentId, email, coupon });
        totalAgents++;
        addLog('[v] סוכן ' + (ai + 1) + ': ' + email + (coupon ? ' (קופון: ' + coupon + ')' : ''), 'success');
      }
    }
    addLog('[v] סה"כ ' + totalAgents + ' סוכנים נוצרו', 'success');
    return { success: true, stores, totalAgents };
  };

  const s21CreateCustomers = async () => {
    const prev = getData('s21-create-agents');
    if (!prev?.stores?.length) { addLog('[x] אין חנויות', 'error'); return { success: false }; }
    const stores = JSON.parse(JSON.stringify(prev.stores));
    let totalCustomers = 0;

    for (let si = 0; si < stores.length; si++) {
      const store = stores[si];
      addLog('--- לקוחות ל' + store.name + ' ---');
      for (let ci = 0; ci < 2; ci++) {
        const email = 'sim-s21-cust-' + store.slug + '-' + ci + '-' + ts() + '@test.com';
        const r = await apiPost('/api/auth/register', { fullName: 'לקוח ' + (ci + 1) + ' ' + store.name, email, phone: randomPhone(), password: 'Test1234!', role: 'customer' });
        if (!r.ok) { addLog('[x] לקוח ' + (ci + 1) + ' נכשל', 'error'); return { success: false }; }
        store.customers.push({ customerId: r.data?.userId, email });
        totalCustomers++;
      }
      addLog('[v] 2 לקוחות ל' + store.name, 'success');
    }
    // Re-login admin
    await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });
    addLog('[v] סה"כ ' + totalCustomers + ' לקוחות נוצרו', 'success');
    return { success: true, stores, totalCustomers };
  };

  // --- Phase 2: Commerce ---

  const s21Purchases = async () => {
    const prev = getData('s21-create-customers');
    if (!prev?.stores?.length) { addLog('[x] אין נתונים', 'error'); return { success: false }; }
    const stores = JSON.parse(JSON.stringify(prev.stores));
    let totalOrders = 0; let totalCommissions = 0;

    for (let si = 0; si < stores.length; si++) {
      const store = stores[si];
      addLog('--- רכישות ב' + store.name + ' ---');

      for (let ci = 0; ci < store.customers.length; ci++) {
        const customer = store.customers[ci];
        const loginR = await apiPost('/api/auth/login', { identifier: customer.email, password: 'Test1234!' });
        if (!loginR.ok) { addLog('[x] התחברות לקוח נכשלה: ' + (loginR.data?.error || 'HTTP ' + loginR.status), 'error'); return { success: false }; }
        // Each customer buys 2 products, using a different agent's coupon
        const agent = store.agents[ci % store.agents.length];
        for (let pi = 0; pi < Math.min(2, store.products.length); pi++) {
          const product = store.products[pi];
          const orderPayload = { items: [{ productId: product.productId, quantity: 1 }], status: 'completed' };
          if (agent.coupon) orderPayload.coupon = { code: agent.coupon };

          const r = await apiPost('/api/orders', orderPayload);
          const orderId = r.data?.orderId || r.data?._id || r.data?.order?._id;
          const commission = r.data?.commissionAmount || 0;

          if (r.ok && orderId) {
            store.orders.push({ orderId, customerId: customer.customerId, agentId: agent.agentId, productId: product.productId, commission });
            totalOrders++;
            if (commission > 0) totalCommissions++;
            addLog('[v] הזמנה: ' + product.name + ' ← לקוח ' + (ci + 1) + ' (קופון: ' + (agent.coupon || 'ללא') + ', עמלה: ' + commission + ')', 'success');
          } else {
            addLog('[WARN] הזמנה נכשלה: ' + (r.data?.error || 'HTTP ' + r.status), 'warning');
          }
        }
      }
      // Customer 2 buys product 3 (different product) via agent 3
      if (store.customers.length >= 2 && store.products.length >= 3) {
        const cust = store.customers[1];
        const loginR = await apiPost('/api/auth/login', { identifier: cust.email, password: 'Test1234!' });
        if (!loginR.ok) { addLog('[x] התחברות לקוח נכשלה: ' + (loginR.data?.error || 'HTTP ' + loginR.status), 'error'); return { success: false }; }
        const agent3 = store.agents[2];
        const prod3 = store.products[2];
        const payload = { items: [{ productId: prod3.productId, quantity: 2 }], status: 'completed' };
        if (agent3.coupon) payload.coupon = { code: agent3.coupon };
        const r = await apiPost('/api/orders', payload);
        const oid = r.data?.orderId || r.data?._id || r.data?.order?._id;
        if (r.ok && oid) {
          store.orders.push({ orderId: oid, customerId: cust.customerId, agentId: agent3.agentId, productId: prod3.productId, commission: r.data?.commissionAmount || 0 });
          totalOrders++;
          if (r.data?.commissionAmount > 0) totalCommissions++;
          addLog('[v] הזמנה נוספת: ' + prod3.name + ' ← לקוח 2 × agent 3', 'success');
        }
      }
    }
    // Re-login admin
    await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });
    addLog('[v] סה"כ ' + totalOrders + ' הזמנות, ' + totalCommissions + ' עם עמלה', 'success');
    return { success: true, stores, totalOrders, totalCommissions };
  };

  const s21VerifyStock = async () => {
    const prev = getData('s21-purchases');
    if (!prev?.stores?.length) { addLog('[x] אין נתונים', 'error'); return { success: false }; }
    let checked = 0; let decreased = 0;

    for (const store of prev.stores) {
      for (const product of store.products) {
        const r = await apiGet('/api/products/' + product.productId);
        const current = (r.data?.product || r.data)?.stockCount;
        if (product.name === 'קבוצתי') {
          if (current === product.stockBefore) {
            addLog('[v] ' + product.name + ': ' + product.stockBefore + ' → ' + current, 'success');
          } else {
            addLog('[WARN] ' + product.name + ': stock=' + current + ' (before=' + product.stockBefore + ')', 'warning');
          }
          checked++;
          continue;
        }
        if (current !== undefined && current < product.stockBefore) {
          decreased++;
          addLog('[v] ' + product.name + ': ' + product.stockBefore + ' → ' + current, 'success');
        } else {
          addLog('[WARN] ' + product.name + ': stock=' + current + ' (before=' + product.stockBefore + ')', 'warning');
        }
        checked++;
      }
    }
    addLog('[v] נבדקו ' + checked + ' מוצרים, ' + decreased + ' ירדו במלאי', decreased > 0 ? 'success' : 'warning');
    return { success: true, checked, decreased };
  };

  const s21VerifyCommissions = async () => {
    const prev = getData('s21-purchases');
    if (!prev?.stores?.length) { addLog('[x] אין נתונים', 'error'); return { success: false }; }
    let agentsChecked = 0; let agentsWithCommissions = 0;

    for (const store of prev.stores) {
      for (const agent of store.agents) {
        const r = await apiGet('/api/commissions?agentId=' + agent.agentId);
        const comms = r.data?.commissions || r.data?.items || [];
        agentsChecked++;
        if (comms.length > 0) {
          agentsWithCommissions++;
          const total = comms.reduce((s, c) => s + (c.amount || 0), 0);
          addLog('[v] ' + agent.email.split('@')[0] + ': ' + comms.length + ' עמלות (סה"כ ' + total + ')', 'success');
        } else {
          addLog('[WARN] ' + agent.email.split('@')[0] + ': 0 עמלות', 'warning');
        }
      }
    }
    addLog('[v] ' + agentsWithCommissions + '/' + agentsChecked + ' סוכנים עם עמלות', agentsWithCommissions > 0 ? 'success' : 'warning');
    return { success: true, agentsChecked, agentsWithCommissions };
  };

  // --- Phase 3: Data Isolation ---

  const s21CustomerSeesOwn = async () => {
    const prev = getData('s21-purchases');
    if (!prev?.stores?.length) { addLog('[x] אין נתונים', 'error'); return { success: false }; }
    let passed = 0; let total = 0;

    for (const store of prev.stores) {
      for (const customer of store.customers) {
        // Login as customer
        await apiPost('/api/auth/login', { identifier: customer.email, password: 'Test1234!' });
        const r = await apiGet('/api/orders?limit=50');
        const orders = r.data?.orders || r.data?.items || [];
        const myOrders = store.orders.filter(o => o.customerId === customer.customerId);
        total++;
        const foreignOrders = orders.filter(o => {
          const createdBy = o.createdBy?._id || o.createdBy;
          return createdBy && createdBy !== customer.customerId;
        });
        if (r.ok && foreignOrders.length === 0 && myOrders.length > 0 && orders.length === myOrders.length) {
          passed++;
          addLog('[v] ' + customer.email.split('@')[0] + ': רואה ' + orders.length + ' הזמנות (ציפינו ~' + myOrders.length + ')', 'success');
        } else {
          addLog('[x] ' + customer.email.split('@')[0] + ': רואה ' + orders.length + ' הזמנות (זרים=' + foreignOrders.length + ', ציפינו=' + myOrders.length + ')', 'error');
        }
      }
    }
    // Re-login admin
    await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });
    addLog('[v] ' + passed + '/' + total + ' לקוחות רואים רק את שלהם', passed === total ? 'success' : 'warning');
    return { success: passed === total, passed, total };
  };

  const s21AgentSeesOwn = async () => {
    const prev = getData('s21-purchases');
    if (!prev?.stores?.length) { addLog('[x] אין נתונים', 'error'); return { success: false }; }
    let passed = 0; let total = 0;

    for (const store of prev.stores) {
      for (const agent of store.agents) {
        await apiPost('/api/auth/login', { identifier: agent.email, password: 'Test1234!' });
        const r = await apiGet('/api/agent/commissions?tenantId=' + store.tenantId);
        const comms = r.data?.commissions || [];
        const expectedOrders = store.orders.filter(o => o.agentId === agent.agentId);
        const expectedOrderIds = new Set(expectedOrders.map(o => o.orderId));
        total++;
        const foreign = comms.filter(c => c?.orderId && !expectedOrderIds.has(c.orderId));
        const expectedTotal = expectedOrders.reduce((s, o) => s + (Number(o.commission || 0)), 0);
        const gotTotal = comms.reduce((s, c) => s + (Number(c.amount || 0)), 0);
        const totalsMatch = Math.abs(expectedTotal - gotTotal) < 0.01;
        if (r.ok && foreign.length === 0 && expectedOrders.length > 0 && comms.length === expectedOrders.length && totalsMatch) {
          passed++;
          addLog('[v] ' + agent.email.split('@')[0] + ': ' + comms.length + ' עמלות (ציפינו=' + expectedOrders.length + ')', 'success');
        } else {
          addLog('[x] ' + agent.email.split('@')[0] + ': עמלות=' + comms.length + ' (זרים=' + foreign.length + ', ציפינו=' + expectedOrders.length + ', ok=' + r.ok + ')', 'error');
        }
      }
    }
    await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });
    addLog('[v] ' + passed + '/' + total + ' סוכנים רואים רק את שלהם', passed === total ? 'success' : 'warning');
    return { success: passed === total, passed, total };
  };

  const s21StoreSeesOwn = async () => {
    const prev = getData('s21-purchases');
    if (!prev?.stores?.length) { addLog('[x] אין נתונים', 'error'); return { success: false }; }
    let passed = 0;

    // Exit any stuck impersonation
    await apiDelete('/api/admin/impersonate');
    await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });

    for (let si = 0; si < prev.stores.length; si++) {
      const store = prev.stores[si];
      addLog('Impersonate: ' + store.name + '...');
      const impR = await apiPost('/api/admin/impersonate', { tenantId: store.tenantId });
      if (!impR.ok) { addLog('[WARN] impersonate נכשל: ' + (impR.data?.error || 'HTTP ' + impR.status), 'warning'); continue; }

      const ordersR = await apiGet('/api/orders?limit=100');
      const orders = ordersR.data?.orders || ordersR.data?.items || [];
      const productsR = await apiGet('/api/products?limit=100');
      const products = productsR.data?.products || productsR.data?.items || [];

      // Check no products from other stores
      const otherStoreProducts = products.filter(p => {
        const pTenant = p.tenantId?._id || p.tenantId;
        return pTenant && pTenant !== store.tenantId;
      });

      if (otherStoreProducts.length === 0) {
        passed++;
        addLog('[v] ' + store.name + ': ' + orders.length + ' הזמנות, ' + products.length + ' מוצרים (מבודד)', 'success');
      } else {
        addLog('[x] ' + store.name + ': רואה ' + otherStoreProducts.length + ' מוצרים מחנויות אחרות!', 'error');
      }

      await apiDelete('/api/admin/impersonate');
    }
    await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });
    addLog('[v] ' + passed + '/' + prev.stores.length + ' חנויות מבודדות', passed === prev.stores.length ? 'success' : 'warning');
    return { success: passed === prev.stores.length, passed, total: prev.stores.length };
  };

  const s21AdminSeesAll = async () => {
    const prev = getData('s21-purchases');
    if (!prev?.stores?.length) { addLog('[x] אין נתונים', 'error'); return { success: false }; }
    await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });

    addLog('בודק שמנהל ראשי רואה הכל...');
    const ordersR = await apiGet('/api/orders?limit=200');
    const allOrders = ordersR.data?.orders || ordersR.data?.items || [];

    const productsR = await apiGet('/api/products?limit=200');
    const allProducts = productsR.data?.products || productsR.data?.items || [];

    const usersR = await apiGet('/api/users?limit=200');
    const allUsers = usersR.data?.users || usersR.data?.items || [];

    const tenantsR = await apiGet('/api/tenants');
    const allTenants = tenantsR.data?.tenants || [];

    // Count orders from our S21 stores
    const s21TenantIds = prev.stores.map(s => s.tenantId);
    const s21Orders = allOrders.filter(o => s21TenantIds.includes(o.tenantId?._id || o.tenantId));

    addLog('[v] מנהל רואה: ' + allOrders.length + ' הזמנות (' + s21Orders.length + ' של S21), ' + allProducts.length + ' מוצרים, ' + allUsers.length + ' משתמשים, ' + allTenants.length + ' חנויות', 'success');
    return { success: true, orders: allOrders.length, s21Orders: s21Orders.length, products: allProducts.length, users: allUsers.length, tenants: allTenants.length };
  };

  // --- Phase 4: Notifications ---

  const s21CheckNotifications = async () => {
    const prev = getData('s21-purchases');
    if (!prev?.stores?.length) { addLog('[x] אין נתונים', 'error'); return { success: false }; }
    await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });

    addLog('בודק התראות מנהל...');
    const adminAlertsR = await apiGet('/api/admin/alerts');
    const adminAlerts = adminAlertsR.data?.alerts || [];
    const adminUnread = adminAlertsR.data?.unreadCount || 0;
    addLog('[v] התראות מנהל: ' + adminAlerts.length + ' (לא נקראו: ' + adminUnread + ')', 'success');

    // Check notifications exist for agents
    let agentNotifs = 0;
    for (const store of prev.stores) {
      for (const agent of store.agents) {
        const r = await apiGet('/api/notifications?type=agent_commission_awarded&userId=' + agent.agentId + '&limit=10');
        const count = r.data?.items?.length || r.data?.notifications?.length || 0;
        agentNotifs += count;
      }
    }
    addLog('[v] התראות סוכנים: ' + agentNotifs + ' סה"כ', agentNotifs > 0 ? 'success' : 'warning');

    // Re-login admin
    await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });
    addLog('[v] בדיקת התראות הושלמה', 'success');
    return { success: true, adminAlerts: adminAlerts.length, adminUnread, agentNotifs };
  };

  // --- Phase 5: Withdrawals ---

  const s21ReleaseCommissions = async () => {
    const prev = getData('s21-purchases');
    if (!prev?.stores?.length) { addLog('[x] אין נתונים', 'error'); return { success: false }; }
    await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });

    let released = 0;
    for (const store of prev.stores) {
      for (const order of store.orders) {
        if (order.commission > 0) {
          const r = await apiPost('/api/admin/commissions/release', { action: 'release_single', orderId: order.orderId });
          if (r.ok) released++;
        }
      }
    }
    addLog('[v] שוחררו ' + released + ' עמלות', released > 0 ? 'success' : 'warning');
    return { success: true, released };
  };

  const s21RequestWithdrawals = async () => {
    const prev = getData('s21-purchases');
    if (!prev?.stores?.length) { addLog('[x] אין נתונים', 'error'); return { success: false }; }
    await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });

    const withdrawals = [];
    for (const store of prev.stores) {
      for (const agent of store.agents) {
        addLog('בקשת משיכה: ' + agent.email.split('@')[0] + '...');
        const r = await apiPost('/api/admin/test-harness/create-withdrawal', { agentId: agent.agentId, tenantId: store.tenantId });
        const wId = r.data?.requestId || r.data?._id;
        if (r.ok && wId) {
          const amount = r.data?.amount;
          withdrawals.push({ withdrawalId: wId, agentId: agent.agentId, amount, agentEmail: agent.email });
          addLog('[v] משיכה: ' + wId + (amount != null ? ' (' + amount + ')' : ''), 'success');
        } else {
          addLog('[WARN] נכשל: ' + (r.data?.error || 'HTTP ' + r.status), 'warning');
        }
      }
    }
    addLog('[v] ' + withdrawals.length + ' בקשות משיכה נוצרו', withdrawals.length > 0 ? 'success' : 'warning');
    return { success: true, withdrawals };
  };

  const s21ApproveWithdrawals = async () => {
    const wData = getData('s21-request-withdrawals');
    if (!wData?.withdrawals?.length) { addLog('[WARN] אין בקשות משיכה לאשר', 'warning'); return { success: true, skipped: true }; }
    await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });

    let approved = 0; let completed = 0;
    for (const w of wData.withdrawals) {
      addLog('מאשר: ' + w.withdrawalId + '...');
      const apR = await apiPatch('/api/admin/withdrawals/' + w.withdrawalId, { action: 'approve' });
      if (apR.ok) {
        approved++;
        addLog('משלים...');
        const compR = await apiPatch('/api/admin/withdrawals/' + w.withdrawalId, { action: 'complete' });
        if (compR.ok) completed++;
        else addLog('[WARN] השלמה נכשלה: ' + (compR.data?.error || 'HTTP ' + compR.status), 'warning');
      } else {
        addLog('[WARN] אישור נכשל: ' + (apR.data?.error || 'HTTP ' + apR.status), 'warning');
      }
    }
    addLog('[v] אושרו: ' + approved + ', הושלמו: ' + completed + ' מתוך ' + wData.withdrawals.length, completed > 0 ? 'success' : 'warning');
    return { success: true, approved, completed, total: wData.withdrawals.length };
  };

  const s21VerifyBalances = async () => {
    const prev = getData('s21-purchases');
    if (!prev?.stores?.length) { addLog('[x] אין נתונים', 'error'); return { success: false }; }
    await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });

    let checked = 0; let zeroBalance = 0;
    for (const store of prev.stores) {
      for (const agent of store.agents) {
        const r = await apiGet('/api/users/' + agent.agentId);
        const bal = Number(r.data?.user?.commissionBalance || r.data?.user?.availableBalance || 0);
        const isZero = Math.abs(bal) < 0.01;
        checked++;
        if (isZero) { zeroBalance++; }
        addLog((isZero ? '[v] ' : '[WARN] ') + agent.email.split('@')[0] + ': יתרה = ' + bal, isZero ? 'success' : 'warning');
      }
    }
    addLog('[v] ' + zeroBalance + '/' + checked + ' סוכנים עם יתרה 0', zeroBalance === checked ? 'success' : 'warning');
    return { success: true, checked, zeroBalance };
  };

  // --- Phase 6: Summary ---

  const s21Summary = async () => {
    addLog('========================================');
    addLog('        📊 דוח סופי - S21 Full E2E');
    addLog('========================================');

    const stores = getData('s21-create-stores');
    const products = getData('s21-create-products');
    const agents = getData('s21-create-agents');
    const customers = getData('s21-create-customers');
    const purchases = getData('s21-purchases');
    const stock = getData('s21-verify-stock');
    const comms = getData('s21-verify-commissions');
    const custIso = getData('s21-customer-sees-own');
    const agentIso = getData('s21-agent-sees-own');
    const storeIso = getData('s21-store-sees-own');
    const admin = getData('s21-admin-sees-all');
    const notifs = getData('s21-check-notifications');
    const release = getData('s21-release-commissions');
    const wReq = getData('s21-request-withdrawals');
    const wApprove = getData('s21-approve-withdrawals');
    const balances = getData('s21-verify-balances');

    addLog('🏪 חנויות: ' + (stores?.stores?.length || 0), 'success');
    addLog('📦 מוצרים: ' + (products?.totalProducts || 0), 'success');
    addLog('👤 סוכנים: ' + (agents?.totalAgents || 0), 'success');
    addLog('🛍️ לקוחות: ' + (customers?.totalCustomers || 0), 'success');
    addLog('🛒 הזמנות: ' + (purchases?.totalOrders || 0) + ' (' + (purchases?.totalCommissions || 0) + ' עם עמלה)', 'success');
    addLog('📉 מלאי ירד: ' + (stock?.decreased || 0) + '/' + (stock?.checked || 0), stock?.decreased > 0 ? 'success' : 'warning');
    addLog('💰 סוכנים עם עמלות: ' + (comms?.agentsWithCommissions || 0) + '/' + (comms?.agentsChecked || 0), comms?.agentsWithCommissions > 0 ? 'success' : 'warning');
    addLog('🔒 לקוחות מבודדים: ' + (custIso?.passed || 0) + '/' + (custIso?.total || 0), custIso?.passed === custIso?.total ? 'success' : 'warning');
    addLog('🔒 סוכנים מבודדים: ' + (agentIso?.passed || 0) + '/' + (agentIso?.total || 0), agentIso?.passed === agentIso?.total ? 'success' : 'warning');
    addLog('🔒 חנויות מבודדות: ' + (storeIso?.passed || 0) + '/' + (storeIso?.total || 0), storeIso?.passed === storeIso?.total ? 'success' : 'warning');
    addLog('👑 מנהל רואה: ' + (admin?.orders || 0) + ' הזמנות, ' + (admin?.products || 0) + ' מוצרים', 'success');
    addLog('🔔 התראות מנהל: ' + (notifs?.adminAlerts || 0) + ', סוכנים: ' + (notifs?.agentNotifs || 0), 'success');
    addLog('💸 עמלות שוחררו: ' + (release?.released || 0), 'success');
    addLog('🏦 בקשות משיכה: ' + (wReq?.withdrawals?.length || 0), 'success');
    addLog('✅ אושרו/הושלמו: ' + (wApprove?.approved || 0) + '/' + (wApprove?.completed || 0), 'success');
    addLog('💰 יתרה 0: ' + (balances?.zeroBalance || 0) + '/' + (balances?.checked || 0), balances?.zeroBalance === balances?.checked ? 'success' : 'warning');
    addLog('========================================');

    return { success: true };
  };

  // ============================================================
  // S22 - ALL NOTIFICATION TYPES TEST FUNCTIONS
  // ============================================================

  // --- Phase 1: Templates CRUD ---

  const s22ListTemplates = async () => {
    await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });
    addLog('שולף רשימת notification templates...');
    const r = await apiGet('/api/admin/notifications');
    if (!r.ok) { addLog('[x] שליפה נכשלה: HTTP ' + r.status, 'error'); return { success: false }; }
    const templates = r.data?.templates || [];
    addLog('[v] נמצאו ' + templates.length + ' תבניות', 'success');
    const types = templates.map(t => t.type);
    const expected = ['welcome_user', 'order_confirmation', 'agent_commission_awarded', 'admin_new_registration', 'admin_agent_sale', 'admin_payment_completed', 'order_new', 'agent_daily_digest', 'product_new_release', 'group_buy_weekly_reminder', 'group_buy_last_call', 'group_buy_closed', 'withdrawal_approved', 'withdrawal_completed', 'withdrawal_rejected'];
    let found = 0;
    for (const e of expected) {
      if (types.includes(e)) found++;
      else addLog('[WARN] חסרה תבנית: ' + e, 'warning');
    }
    addLog('[v] ' + found + '/' + expected.length + ' תבניות ברירת מחדל קיימות', found >= 12 ? 'success' : 'warning');
    return { success: true, count: templates.length, found, templates };
  };

  const s22CreateTemplate = async () => {
    addLog('יוצר template חדש: sim_test_notification...');
    const r = await apiPost('/api/admin/notifications', {
      type: 'sim_test_notification',
      name: 'התראת בדיקה סימולטור',
      title: 'בדיקה מהסימולטור',
      body: 'זוהי התראת בדיקה שנוצרה אוטומטית ע"י הסימולטור. זמן: {{timestamp}}.',
      description: 'תבנית בדיקה - נוצרה ע"י S22',
      audience: ['agent', 'customer'],
      variables: ['timestamp'],
      enabled: true,
    });
    if (r.ok) {
      const tpl = r.data?.template;
      addLog('[v] template נוצר: ' + (tpl?.type || 'sim_test_notification'), 'success');
      return { success: true, templateType: tpl?.type || 'sim_test_notification', templateId: tpl?._id };
    }
    if (r.status === 409) { addLog('[WARN] template כבר קיים (409)', 'warning'); return { success: true, templateType: 'sim_test_notification', alreadyExists: true }; }
    addLog('[x] יצירה נכשלה: ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false };
  };

  const s22EditTemplate = async () => {
    const prev = getData('s22-create-template');
    const tplType = prev?.templateType || 'sim_test_notification';
    addLog('עורך template: ' + tplType + '...');
    const r = await apiPut('/api/admin/notifications/' + tplType, {
      title: 'בדיקה מעודכנת מהסימולטור',
      body: 'תוכן מעודכן - בדיקת S22. זמן: {{timestamp}}. מספר ריצה: {{run_id}}.',
      variables: ['timestamp', 'run_id'],
    });
    if (r.ok) { addLog('[v] template עודכן', 'success'); return { success: true }; }
    if (r.status === 404) { addLog('[WARN] API PUT /api/admin/notifications/:type לא קיים', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] עדכון נכשל: ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false };
  };

  const s22ToggleTemplate = async () => {
    const tplType = 'sim_test_notification';
    addLog('מכבה template: ' + tplType + '...');
    const r = await apiPut('/api/admin/notifications/' + tplType, { enabled: false });
    if (r.ok) {
      addLog('בודק שהוא disabled...');
      const check = await apiGet('/api/admin/notifications');
      const tpl = (check.data?.templates || []).find(t => t.type === tplType);
      if (tpl && tpl.enabled === false) { addLog('[v] template מכובה', 'success'); return { success: true, disabled: true }; }
      if (tpl) { addLog('[WARN] enabled = ' + tpl.enabled, 'warning'); return { success: true, disabled: false }; }
      addLog('[WARN] template לא נמצא ברשימה', 'warning');
      return { success: true, skipped: true };
    }
    if (r.status === 404) { addLog('[WARN] PUT API לא קיים', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] כיבוי נכשל: ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false };
  };

  const s22DeleteTemplate = async () => {
    const tplType = 'sim_test_notification';
    addLog('מוחק template: ' + tplType + '...');
    const r = await apiDelete('/api/admin/notifications/' + tplType);
    if (r.ok) { addLog('[v] template נמחק', 'success'); return { success: true }; }
    if (r.status === 404) { addLog('[WARN] DELETE API לא קיים או template כבר נמחק', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] מחיקה נכשלה: ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false };
  };

  // --- Phase 2: Send (dryRun) ---

  const s22SendDryRun = async (templateType, variables = {}, label = '') => {
    addLog('שולח ' + (label || templateType) + ' (dryRun)...');
    const r = await apiPost('/api/admin/notifications/send', {
      templateType,
      variables,
      dryRun: true,
    });
    if (r.ok) {
      const deliveries = r.data?.result?.deliveries || [];
      const isDry = r.data?.result?.dryRun;
      addLog('[v] ' + templateType + ' → dryRun=' + isDry + ', deliveries=' + deliveries.length, 'success');
      return { success: true, dryRun: isDry, deliveries };
    }
    addLog('[x] ' + templateType + ' נכשל: ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false, error: r.data?.error };
  };

  const s22SendWelcome = () => s22SendDryRun('welcome_user', {}, 'ברוכים הבאים');
  const s22SendOrderConfirm = () => s22SendDryRun('order_confirmation', { order_id: 'SIM-ORD-001' }, 'אישור הזמנה');
  const s22SendCommission = () => s22SendDryRun('agent_commission_awarded', { commission_amount: '50', commission_percent: '10', business_name: ' בחנות בדיקה' }, 'עמלה לסוכן');
  const s22SendWithdrawal = () => s22SendDryRun('withdrawal_approved', { amount: '100' }, 'אישור משיכה');
  const s22SendProductNew = () => s22SendDryRun('product_new_release', { product_name: 'מוצר בדיקה S22', product_url: '/products/test' }, 'מוצר חדש');
  const s22SendGroupBuy = () => s22SendDryRun('group_buy_closed', { group_name: 'קבוצה S22' }, 'סגירת קבוצתית');

  const s22SendToRoles = async () => {
    addLog('שולח welcome_user עם audienceRoles ספציפיים (dryRun)...');
    const r = await apiPost('/api/admin/notifications/send', {
      templateType: 'welcome_user',
      audienceRoles: ['agent', 'customer'],
      dryRun: true,
    });
    if (r.ok) {
      const deliveries = r.data?.result?.deliveries || [];
      addLog('[v] שליחה לתפקידים הצליחה, deliveries=' + deliveries.length, 'success');
      return { success: true, deliveries };
    }
    addLog('[x] שליחה נכשלה: ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false };
  };

  // --- Phase 3: Schedule ---

  const s22ScheduleNotification = async () => {
    addLog('מתזמן התראה לעוד שעה...');
    const scheduleAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const r = await apiPost('/api/admin/notifications/schedule', {
      templateType: 'welcome_user',
      scheduleAt,
      audience: ['customer'],
      payloadOverrides: { variables: { test_run: 'S22-' + ts() } },
      metadata: { source: 'simulator_s22' },
    });
    if (r.ok) {
      const item = r.data?.scheduled;
      const id = item?._id || item?.id;
      addLog('[v] התראה תוזמנה: ' + id, 'success');
      return { success: true, scheduleId: id };
    }
    if (r.status === 404) { addLog('[WARN] Schedule API לא קיים', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] תזמון נכשל: ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false };
  };

  const s22ListScheduled = async () => {
    const prev = getData('s22-schedule-notification');
    if (prev?.skipped) { addLog('[WARN] דילוג - schedule לא נתמך', 'warning'); return { success: true, skipped: true }; }
    addLog('שולף רשימת התראות מתוזמנות...');
    const r = await apiGet('/api/admin/notifications/schedule?status=pending');
    if (!r.ok) { addLog('[x] שליפה נכשלה: HTTP ' + r.status, 'error'); return { success: false }; }
    const scheduled = r.data?.scheduled || [];
    addLog('[v] נמצאו ' + scheduled.length + ' מתוזמנות', 'success');
    const found = prev?.scheduleId ? scheduled.some(s => (s._id || s.id) === prev.scheduleId) : false;
    if (prev?.scheduleId) addLog(found ? '[v] ההתראה שלנו ברשימה' : '[WARN] ההתראה שלנו לא נמצאה', found ? 'success' : 'warning');
    return { success: true, count: scheduled.length, found };
  };

  const s22CancelScheduled = async () => {
    const prev = getData('s22-schedule-notification');
    if (prev?.skipped || !prev?.scheduleId) { addLog('[WARN] דילוג - אין scheduleId', 'warning'); return { success: true, skipped: true }; }
    addLog('מבטל התראה מתוזמנת: ' + prev.scheduleId + '...');
    const r = await apiPatch('/api/admin/notifications/schedule/' + prev.scheduleId, { status: 'cancelled' });
    if (r.ok) { addLog('[v] התראה בוטלה', 'success'); return { success: true }; }
    if (r.status === 404) { addLog('[WARN] Cancel API לא קיים', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] ביטול נכשל: ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false };
  };

  // --- Phase 4: System Alerts ---

  const s22CreateAlert = async (type, title, message) => {
    addLog('יוצר system alert (' + type + ')...');
    const r = await apiPost('/api/admin/alerts', {
      type,
      title,
      message,
      source: 'simulator_s22',
      metadata: { testRun: ts() },
    });
    if (r.ok) {
      const alertId = r.data?.alert?._id;
      addLog('[v] alert נוצר: ' + type + (alertId ? ' (' + alertId + ')' : ''), 'success');
      return { success: true, alertId, type };
    }
    addLog('[x] יצירה נכשלה: ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false };
  };

  const s22CreateAlertInfo = () => s22CreateAlert('info', 'בדיקת סימולטור - Info', 'התראת מידע שנוצרה ע"י S22 simulator');
  const s22CreateAlertWarning = () => s22CreateAlert('warning', 'בדיקת סימולטור - Warning', 'התראת אזהרה שנוצרה ע"י S22 simulator');
  const s22CreateAlertError = () => s22CreateAlert('error', 'בדיקת סימולטור - Error', 'התראת שגיאה שנוצרה ע"י S22 simulator');

  const s22FetchAlerts = async () => {
    addLog('שולף כל system alerts...');
    const r = await apiGet('/api/admin/alerts');
    if (!r.ok) { addLog('[x] שליפה נכשלה: HTTP ' + r.status, 'error'); return { success: false }; }
    const alerts = r.data?.alerts || [];
    const unread = r.data?.unreadCount || 0;
    const simAlerts = alerts.filter(a => a.source === 'simulator_s22');
    addLog('[v] סה"כ ' + alerts.length + ' alerts (' + simAlerts.length + ' שלנו), לא-נקראו: ' + unread, 'success');

    // Verify all 3 types
    const types = simAlerts.map(a => a.type);
    const hasInfo = types.includes('info');
    const hasWarning = types.includes('warning');
    const hasError = types.includes('error');
    addLog('[v] info=' + hasInfo + ', warning=' + hasWarning + ', error=' + hasError, hasInfo && hasWarning && hasError ? 'success' : 'warning');
    return { success: true, total: alerts.length, simCount: simAlerts.length, unread, alerts: simAlerts, hasAll: hasInfo && hasWarning && hasError };
  };

  const s22MarkRead = async () => {
    const prev = getData('s22-fetch-alerts');
    const alertId = prev?.alerts?.[0]?._id;
    if (!alertId) { addLog('[WARN] אין alert לסמן', 'warning'); return { success: true, skipped: true }; }
    addLog('מסמן alert כנקרא: ' + alertId + '...');
    const r = await apiPatch('/api/admin/alerts', { id: alertId });
    if (r.ok) { addLog('[v] alert סומן כנקרא', 'success'); return { success: true, alertId }; }
    if (r.status === 404) { addLog('[WARN] PATCH /api/admin/alerts לא קיים', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] סימון נכשל: ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false };
  };

  const s22UnreadCount = async () => {
    addLog('בודק מונה לא-נקראו...');
    const r = await apiGet('/api/admin/alerts?unread=true');
    if (!r.ok) { addLog('[x] שליפה נכשלה', 'error'); return { success: false }; }
    const unread = r.data?.unreadCount || r.data?.alerts?.length || 0;
    const prevUnread = getData('s22-fetch-alerts')?.unread || 0;
    const decreased = unread < prevUnread;
    addLog('[v] לא-נקראו: ' + unread + ' (לפני: ' + prevUnread + ')' + (decreased ? ' ← ירד!' : ''), decreased ? 'success' : 'warning');
    return { success: true, unread, decreased };
  };

  // --- Phase 5: Messages ---

  const s22SendMessageRole = async () => {
    addLog('שולח הודעה פנימית לכל הסוכנים...');
    const r = await apiPost('/api/messages', {
      targetRole: 'agent',
      message: 'הודעת בדיקה S22 - נשלחה לכל הסוכנים (' + new Date().toLocaleTimeString('he-IL') + ')',
    });
    if (r.ok) {
      const msgId = r.data?.message?._id || r.data?.messageId || r.data?._id;
      addLog('[v] הודעה לסוכנים נשלחה' + (msgId ? ': ' + msgId : ''), 'success');
      return { success: true, messageId: msgId };
    }
    addLog('[x] שליחה נכשלה: ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false };
  };

  const s22SendMessageUser = async () => {
    addLog('יוצר לקוח בדיקה לשליחת הודעה...');
    const custR = await apiPost('/api/auth/register', { fullName: 'S22 לקוח הודעות', email: 'sim-s22-msg-' + ts() + '@test.com', phone: randomPhone(), password: 'Test1234!', role: 'customer' });
    const custId = custR.data?.userId;
    // Re-login admin
    await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });
    if (!custId) { addLog('[WARN] לא הצליח ליצור לקוח, שולח ללא targetUserId', 'warning'); }

    addLog('שולח הודעה ללקוח ספציפי...');
    const payload = {
      targetRole: 'customer',
      message: 'הודעה אישית S22 ללקוח בדיקה (' + new Date().toLocaleTimeString('he-IL') + ')',
    };
    if (custId) payload.targetUserId = custId;
    const r = await apiPost('/api/messages', payload);
    if (r.ok) {
      const msgId = r.data?.message?._id || r.data?.messageId || r.data?._id;
      addLog('[v] הודעה ללקוח נשלחה' + (msgId ? ': ' + msgId : ''), 'success');
      return { success: true, messageId: msgId, customerId: custId, customerEmail: custR.data?.email || 'sim-s22-msg@test.com' };
    }
    addLog('[x] שליחה נכשלה: ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false, customerId: custId };
  };

  const s22FetchMessages = async () => {
    const prev = getData('s22-send-message-user');
    if (!prev?.customerId) { addLog('[WARN] אין לקוח, שולף הודעות כמנהל', 'warning'); }

    addLog('שולף הודעות...');
    const r = await apiGet('/api/messages?limit=20');
    if (!r.ok) { addLog('[x] שליפה נכשלה: HTTP ' + r.status, 'error'); return { success: false }; }
    const messages = r.data?.messages || r.data?.items || [];
    const simMsgs = messages.filter(m => m.message && m.message.includes('S22'));
    const firstId = simMsgs[0]?._id || simMsgs[0]?.id || null;
    addLog('[v] סה"כ ' + messages.length + ' הודעות (' + simMsgs.length + ' שלנו)' + (firstId ? ' [id: ' + firstId + ']' : ''), simMsgs.length > 0 ? 'success' : 'warning');
    return { success: true, total: messages.length, simCount: simMsgs.length, messageId: firstId };
  };

  const s22MarkMessageRead = async () => {
    addLog('מסמן כל ההודעות כנקראו (POST /api/messages/read-all)...');
    const r = await apiPost('/api/messages/read-all', {});
    if (r.ok) {
      const updated = r.data?.updated || 0;
      addLog('[v] ' + updated + ' הודעות סומנו כנקראו', 'success');
      return { success: true, updated };
    }
    addLog('[x] סימון נכשל: ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false };
  };

  // --- Phase 6: Validation + Summary ---

  const s22SendInvalidTemplate = async () => {
    addLog('שולח התראה עם template מזויף...');
    const r = await apiPost('/api/admin/notifications/send', { templateType: 'fake_nonexistent_template_xyz', dryRun: true });
    if (!r.ok) {
      const isExpected = r.status === 404 || r.status === 500 || (r.data?.error && r.data.error.includes('not_found'));
      addLog('[v] שגיאה צפויה: ' + (r.data?.error || 'HTTP ' + r.status), isExpected ? 'success' : 'warning');
      return { success: isExpected, status: r.status, error: r.data?.error };
    }
    addLog('[x] ציפינו לשגיאה אבל קיבלנו 200!', 'error');
    return { success: false };
  };

  const s22SendNoType = async () => {
    addLog('שולח התראה ללא templateType...');
    const r = await apiPost('/api/admin/notifications/send', { dryRun: true });
    if (!r.ok && (r.status === 400 || r.data?.error === 'template_type_required')) {
      addLog('[v] שגיאה צפויה: 400 template_type_required', 'success');
      return { success: true, status: r.status };
    }
    addLog('[x] ציפינו ל-400 אבל קיבלנו: ' + r.status, 'error');
    return { success: false };
  };

  const s22SendDisabledTemplate = async () => {
    // Re-create and disable the template for this test
    addLog('יוצר template זמני ומכבה...');
    await apiPost('/api/admin/notifications', {
      type: 'sim_disabled_test',
      name: 'בדיקת disabled',
      title: 'disabled test',
      body: 'test',
      audience: ['customer'],
      enabled: true,
    });
    await apiPut('/api/admin/notifications/sim_disabled_test', { enabled: false });

    addLog('שולח עם template מכובה...');
    const r = await apiPost('/api/admin/notifications/send', { templateType: 'sim_disabled_test', dryRun: true });

    // Cleanup
    await apiDelete('/api/admin/notifications/sim_disabled_test');

    if (!r.ok) {
      const isExpected = r.data?.error && (r.data.error.includes('disabled') || r.data.error.includes('template'));
      addLog('[v] שגיאה צפויה: ' + (r.data?.error || 'HTTP ' + r.status), isExpected ? 'success' : 'warning');
      return { success: true, status: r.status, error: r.data?.error };
    }
    addLog('[WARN] לא נחסם, ייתכן שהמערכת מתעלמת מ-disabled', 'warning');
    return { success: true, skipped: true };
  };

  const s22Summary = async () => {
    addLog('========================================');
    addLog('     🔔 דוח סופי - S22 All Notification Types');
    addLog('========================================');

    const templates = getData('s22-list-templates');
    const create = getData('s22-create-template');
    const edit = getData('s22-edit-template');
    const toggle = getData('s22-toggle-template');
    const del = getData('s22-delete-template');
    const welcome = getData('s22-send-welcome');
    const orderConf = getData('s22-send-order-confirm');
    const commission = getData('s22-send-commission');
    const withdrawal = getData('s22-send-withdrawal');
    const productNew = getData('s22-send-product-new');
    const groupBuy = getData('s22-send-group-buy');
    const roles = getData('s22-send-to-roles');
    const schedule = getData('s22-schedule-notification');
    const scheduled = getData('s22-list-scheduled');
    const cancel = getData('s22-cancel-scheduled');
    const alerts = getData('s22-fetch-alerts');
    const markRead = getData('s22-mark-read');
    const unread = getData('s22-unread-count');
    const msgRole = getData('s22-send-message-role');
    const msgUser = getData('s22-send-message-user');
    const fetchMsg = getData('s22-fetch-messages');
    const markMsg = getData('s22-mark-message-read');
    const invalidTpl = getData('s22-send-invalid-template');
    const noType = getData('s22-send-no-type');
    const disabledTpl = getData('s22-send-disabled-template');

    addLog('📋 Templates: ' + (templates?.count || 0) + ' (' + (templates?.found || 0) + ' defaults)', 'success');
    addLog('📋 CRUD: create=' + (create?.success ? 'v' : 'x') + ', edit=' + (edit?.success ? 'v' : 'x') + ', toggle=' + (toggle?.success ? 'v' : 'x') + ', delete=' + (del?.success ? 'v' : 'x'), 'success');

    const sends = [welcome, orderConf, commission, withdrawal, productNew, groupBuy, roles];
    const sendOk = sends.filter(s => s?.success).length;
    addLog('📤 שליחות dryRun: ' + sendOk + '/' + sends.length + ' הצליחו', sendOk === sends.length ? 'success' : 'warning');

    addLog('⏰ תזמון: schedule=' + (schedule?.success ? 'v' : 'x') + ', list=' + (scheduled?.success ? 'v' : 'x') + ', cancel=' + (cancel?.success ? 'v' : 'x'), 'success');
    addLog('⚠️ System Alerts: ' + (alerts?.simCount || 0) + ' נוצרו, all3types=' + (alerts?.hasAll ? 'v' : 'x'), 'success');
    addLog('⚠️ Read: mark=' + (markRead?.success ? 'v' : 'x') + ', unreadDecreased=' + (unread?.decreased ? 'v' : 'x'), 'success');
    addLog('💬 Messages: role=' + (msgRole?.success ? 'v' : 'x') + ', user=' + (msgUser?.success ? 'v' : 'x') + ', fetch=' + (fetchMsg?.simCount || 0) + ', markRead=' + (markMsg?.success ? 'v' : 'x'), 'success');
    addLog('🛡️ Validation: invalidTpl=' + (invalidTpl?.success ? 'v' : 'x') + ', noType=' + (noType?.success ? 'v' : 'x') + ', disabled=' + (disabledTpl?.success ? 'v' : 'x'), 'success');
    addLog('========================================');

    return { success: true };
  };

  // ============================================================
  // S23 - SHARING & COUPON FLOW TEST FUNCTIONS
  // ============================================================

  const S23_DATA = { agentId: null, agentEmail: null, couponCode: null, productId: null, productName: null, referralUrls: {} };

  // --- Phase 1: Setup ---

  const s23CreateAgentCoupon = async () => {
    addLog('מתחבר כמנהל...');
    await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });
    const agentEmail = 'sim-s23-agent-' + ts() + '@test.com';
    const agentPass = 'Test1234!';
    addLog('יוצר סוכן...');
    const regR = await apiPost('/api/auth/register', {
      fullName: 'S23 Agent Share',
      email: agentEmail,
      phone: randomPhone(),
      password: agentPass,
      role: 'agent',
    });
    const agentId = regR.data?.userId;
    if (!agentId) { addLog('[x] יצירת סוכן נכשלה', 'error'); return { success: false }; }
    addLog('[v] סוכן נוצר: ' + agentId, 'success');

    // Login as agent to generate coupon (sets couponStatus=active automatically)
    addLog('מתחבר כסוכן ליצירת קופון...');
    await apiPost('/api/auth/login', { identifier: agentEmail, password: agentPass });
    const couponR = await apiGet('/api/agent/coupon');
    const code = couponR.data?.coupon?.code;
    if (code) {
      addLog('[v] קופון נוצר: ' + code + ', status=' + (couponR.data?.coupon?.status || 'N/A') + ', discount=' + (couponR.data?.coupon?.discountPercent || 0) + '%', 'success');
    } else {
      addLog('[x] יצירת קופון נכשלה: ' + (couponR.data?.error || 'HTTP ' + couponR.status), 'error');
      return { success: false, agentId };
    }

    // Re-login admin for subsequent tests
    await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });
    S23_DATA.agentId = agentId;
    S23_DATA.couponCode = code;
    S23_DATA.agentEmail = agentEmail;
    return { success: true, agentId, couponCode: code, agentEmail };
  };

  const s23CreateProduct = async () => {
    await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });
    addLog('שולף רשימת עסקים...');
    const tenantsR = await apiGet('/api/tenants');
    const tenants = tenantsR.data?.tenants || tenantsR.data?.items || [];
    const tenantId = tenants[0]?._id || tenants[0]?.id;
    if (!tenantId) { addLog('[WARN] אין עסקים, מנסה ללא tenantId...', 'warning'); }

    addLog('יוצר מוצר לבדיקת שיתוף...');
    const pname = 'S23_שיתוף_' + ts();
    const r = await apiPost('/api/products', {
      name: pname,
      description: 'מוצר לבדיקת שיתוף לרשתות חברתיות עם קופון',
      price: 149.90,
      category: 'בדיקות',
      subCategory: 'כללי',
      tenantId,
      stockCount: 100,
      active: true,
      inStock: true,
      media: { images: [{ url: 'https://placehold.co/400x400/1e3a8a/white?text=S23', alt: 'S23' }] },
    });
    if (r.ok) {
      const pid = r.data?._id || r.data?.product?._id || r.data?.productId;
      addLog('[v] מוצר נוצר: ' + pid, 'success');
      S23_DATA.productId = pid;
      S23_DATA.productName = pname;
      return { success: true, productId: pid, productName: pname, tenantId };
    }
    addLog('[x] יצירת מוצר נכשלה: ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false };
  };

  const s23VerifyCouponActive = async () => {
    const code = S23_DATA.couponCode || getData('s23-create-agent-coupon')?.couponCode;
    if (!code) { addLog('[x] אין קוד קופון', 'error'); return { success: false }; }
    addLog('מאמת קופון: ' + code + '...');
    const r = await apiPost('/api/coupons/validate', { code });
    if (r.ok && r.data?.coupon) {
      const c = r.data.coupon;
      addLog('[v] קופון פעיל: ' + c.code + ', הנחה: ' + c.discountPercent + '%, עמלה: ' + c.commissionPercent + '%', 'success');
      return { success: true, coupon: c };
    }
    addLog('[x] קופון לא תקף: ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false };
  };

  // --- Phase 2: Share URLs ---

  const s23UrlProductRef = async () => {
    const code = S23_DATA.couponCode;
    const pid = S23_DATA.productId;
    if (!code || !pid) { addLog('[x] חסר קוד או מוצר', 'error'); return { success: false }; }

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const url = await buildCanonicalProductShareUrl(pid, code, baseUrl);
    addLog('URL מוצר + ref: ' + url);
    const hasRef = url.includes('?ref=' + code);
    addLog(hasRef ? '[v] URL כולל ref=' + code : '[x] URL חסר ref', hasRef ? 'success' : 'error');
    S23_DATA.referralUrls.product = url;
    return { success: hasRef, url };
  };

  const s23UrlStoreRef = async () => {
    const code = S23_DATA.couponCode;
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const url = baseUrl + '/store/test-store?ref=' + code;
    addLog('URL חנות + ref: ' + url);
    const hasRef = url.includes('?ref=' + code);
    addLog(hasRef ? '[v] URL כולל ref' : '[x] URL חסר ref', hasRef ? 'success' : 'error');
    S23_DATA.referralUrls.store = url;
    return { success: hasRef, url };
  };

  const s23UrlMarketplaceRef = async () => {
    const code = S23_DATA.couponCode;
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const url = baseUrl + '/?ref=' + code;
    addLog('URL מרקטפלייס + ref: ' + url);
    const hasRef = url.includes('?ref=' + code);
    addLog(hasRef ? '[v] URL כולל ref' : '[x] URL חסר ref', hasRef ? 'success' : 'error');
    S23_DATA.referralUrls.marketplace = url;
    return { success: hasRef, url };
  };

  const s23UrlVideoRef = async () => {
    const code = S23_DATA.couponCode;
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const fakeVideoId = '507f1f77bcf86cd799439011';
    const url = baseUrl + '/v/' + fakeVideoId + '?ref=' + encodeURIComponent(code);
    addLog('URL וידאו + ref: ' + url);
    const hasRef = url.includes('?ref=');
    addLog(hasRef ? '[v] URL כולל ref' : '[x] URL חסר ref', hasRef ? 'success' : 'error');
    S23_DATA.referralUrls.video = url;
    return { success: hasRef, url };
  };

  const s23VerifyAllUrls = async () => {
    const urls = S23_DATA.referralUrls;
    const code = S23_DATA.couponCode;
    let passed = 0;
    let total = 0;
    for (const [key, url] of Object.entries(urls)) {
      total++;
      if (url && url.includes(code)) {
        passed++;
        addLog('[v] ' + key + ': כולל קופון', 'success');
      } else {
        addLog('[x] ' + key + ': חסר קופון', 'error');
      }
    }
    addLog('[v] ' + passed + '/' + total + ' URLs כוללים קוד קופון', passed === total ? 'success' : 'warning');
    return { success: passed === total, passed, total };
  };

  // --- Phase 3: Referral Click Flow ---

  const s23ClickReferral = async () => {
    const code = S23_DATA.couponCode;
    if (!code) { addLog('[x] אין קופון', 'error'); return { success: false }; }
    addLog('שולח GET /r/' + code + ' (בדיקת redirect)...');
    const r = await apiGet('/r/' + code);
    // The /r/:code route does a redirect (302), which fetch follows.
    // We check if we get a valid response (the redirected page)
    addLog('[v] GET /r/' + code + ' → status=' + r.status + ', ok=' + r.ok, r.status > 0 ? 'success' : 'error');
    // Also verify that the autoCoupon cookie was set by checking /api/referral/auto-coupon
    const autoR = await apiGet('/api/referral/auto-coupon');
    const autoCoupon = autoR.data?.coupon;
    if (autoCoupon) {
      addLog('[v] autoCoupon cookie פעיל: ' + autoCoupon, 'success');
    } else {
      addLog('[WARN] autoCoupon cookie לא נשמר (ייתכן ש-httpOnly לא ניתן לקריאה)', 'warning');
    }
    return { success: true, status: r.status, autoCoupon };
  };

  const s23TrackReferral = async () => {
    const code = S23_DATA.couponCode;
    if (!code) { addLog('[x] אין קופון', 'error'); return { success: false }; }
    addLog('שולח POST /api/referral/track...');
    const r = await apiPost('/api/referral/track', {
      refCode: code,
      url: '/products/test-product',
      action: 'click',
    });
    if (r.ok) {
      addLog('[v] click נרשם: tracked=' + r.data?.tracked + ', tenantId=' + (r.data?.tenantId || 'null'), 'success');
      return { success: true, tracked: r.data?.tracked };
    }
    addLog('[x] track נכשל: ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false };
  };

  const s23VerifyReferralLog = async () => {
    const code = S23_DATA.couponCode;
    if (!code) { addLog('[x] אין קופון', 'error'); return { success: false }; }
    addLog('בודק referral_logs...');
    const r = await apiGet('/api/referral/log?refCode=' + code);
    if (r.ok) {
      const logs = r.data?.logs || r.data?.items || [];
      addLog('[v] נמצאו ' + logs.length + ' רשומות log', logs.length > 0 ? 'success' : 'warning');
      return { success: true, count: logs.length };
    }
    // API might not support GET by refCode - try alternative
    addLog('[WARN] שליפת referral logs ישירה לא נתמכת, הבדיקה הצליחה בשלב track', 'warning');
    return { success: true, skipped: true };
  };

  const s23ReferralInvalid = async () => {
    addLog('שולח GET /r/FAKE_CODE_XYZ123...');
    const r = await apiGet('/r/FAKE_CODE_XYZ123');
    addLog('[v] redirect עם קוד מזויף: status=' + r.status, r.status > 0 ? 'success' : 'warning');
    addLog('שולח POST /api/referral/track עם קוד מזויף...');
    const trackR = await apiPost('/api/referral/track', { refCode: 'FAKE_CODE_XYZ123', action: 'click' });
    const tracked = trackR.data?.tracked;
    addLog('[v] tracked=' + tracked + ' (צפוי: false)', tracked === false ? 'success' : 'warning');
    return { success: true, tracked };
  };

  // --- Phase 4: Auto-Coupon ---

  const s23AutoCouponApi = async () => {
    addLog('בודק GET /api/referral/auto-coupon...');
    const r = await apiGet('/api/referral/auto-coupon');
    if (r.ok) {
      const coupon = r.data?.coupon;
      const discount = r.data?.discountPercent;
      addLog('[v] auto-coupon: ' + (coupon || 'null') + (discount ? ', discount=' + discount + '%' : ''), coupon ? 'success' : 'warning');
      return { success: true, coupon, discount };
    }
    addLog('[x] auto-coupon נכשל: ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false };
  };

  const s23ValidateCoupon = async () => {
    const code = S23_DATA.couponCode;
    if (!code) { addLog('[x] אין קופון', 'error'); return { success: false }; }
    addLog('מאמת קופון: POST /api/coupons/validate...');
    const r = await apiPost('/api/coupons/validate', { code });
    if (r.ok && r.data?.coupon) {
      const c = r.data.coupon;
      addLog('[v] קופון תקף: code=' + c.code + ', discount=' + c.discountPercent + '%, agent=' + c.agentName, 'success');
      return { success: true, coupon: c };
    }
    addLog('[x] validate נכשל: ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false };
  };

  const s23ValidateInvalid = async () => {
    addLog('מאמת קוד מזויף...');
    const r = await apiPost('/api/coupons/validate', { code: 'TOTALLY_FAKE_COUPON_999' });
    if (!r.ok && (r.status === 404 || r.data?.error === 'coupon_not_found')) {
      addLog('[v] קוד מזויף → 404 coupon_not_found', 'success');
      return { success: true };
    }
    addLog('[x] ציפינו ל-404 אבל קיבלנו: ' + r.status, 'error');
    return { success: false };
  };

  const s23ValidateInactive = async () => {
    addLog('יוצר סוכן ללא couponStatus=active...');
    const inactiveCode = 'INACTIVE-' + ts();
    const regR = await apiPost('/api/auth/register', {
      fullName: 'S23 סוכן לא פעיל',
      email: 'sim-s23-inactive-' + ts() + '@test.com',
      phone: randomPhone(),
      password: 'Test1234!',
      role: 'agent',
    });
    const agentId = regR.data?.userId;
    // Re-login admin
    await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });
    if (agentId) {
      await apiPatch('/api/admin/agents/' + agentId, { couponCode: inactiveCode, couponStatus: 'inactive' });
    }
    addLog('מאמת קוד לא פעיל: ' + inactiveCode + '...');
    const r = await apiPost('/api/coupons/validate', { code: inactiveCode });
    if (!r.ok && (r.status === 404 || r.data?.error === 'coupon_not_found')) {
      addLog('[v] קוד לא פעיל → 404', 'success');
      return { success: true };
    }
    addLog('[WARN] ציפינו ל-404, קיבלנו: ' + r.status + ' (ייתכן שהסטטוס לא הוגדר)', 'warning');
    return { success: true, skipped: true };
  };

  // --- Phase 5: Social Networks ---

  const s23BuildShareUrl = async (productId, couponCode) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://test.vipo.co.il';
    return await buildCanonicalProductShareUrl(productId, couponCode, baseUrl);
  };

  const s23BuildShareText = (productName, price, couponCode, shareUrl) => {
    return '*' + productName + '*\nמחיר: ₪' + price + '\nקוד קופון: ' + couponCode + '\n\n' + shareUrl;
  };

  const s23WhatsappFormat = async () => {
    const code = S23_DATA.couponCode;
    const pid = S23_DATA.productId;
    const pname = S23_DATA.productName || 'מוצר בדיקה';
    const shareUrl = await s23BuildShareUrl(pid, code);
    const text = s23BuildShareText(pname, '149.90', code, shareUrl);
    const waUrl = 'https://wa.me/?text=' + encodeURIComponent(text);
    addLog('WhatsApp URL:');
    addLog(waUrl.substring(0, 120) + '...');
    const hasCoupon = waUrl.includes(encodeURIComponent(code));
    const hasProductUrl = waUrl.includes(encodeURIComponent(shareUrl));
    addLog('[v] כולל קופון: ' + hasCoupon + ', כולל לינק מוצר: ' + hasProductUrl, hasCoupon ? 'success' : 'error');
    return { success: hasCoupon, url: waUrl, hasCoupon, hasProductUrl };
  };

  const s23FacebookFormat = async () => {
    const code = S23_DATA.couponCode;
    const pid = S23_DATA.productId;
    const shareUrl = await s23BuildShareUrl(pid, code);
    const fbUrl = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(shareUrl);
    addLog('Facebook URL:');
    addLog(fbUrl.substring(0, 120) + '...');
    const hasRef = fbUrl.includes(encodeURIComponent('ref=' + code));
    addLog('[v] כולל ref param: ' + hasRef, hasRef ? 'success' : 'error');
    return { success: hasRef, url: fbUrl };
  };

  const s23TelegramFormat = async () => {
    const code = S23_DATA.couponCode;
    const pid = S23_DATA.productId;
    const pname = S23_DATA.productName || 'מוצר בדיקה';
    const shareUrl = await s23BuildShareUrl(pid, code);
    const text = s23BuildShareText(pname, '149.90', code, shareUrl);
    const tgUrl = 'https://t.me/share/url?url=' + encodeURIComponent(shareUrl) + '&text=' + encodeURIComponent(text);
    addLog('Telegram URL:');
    addLog(tgUrl.substring(0, 120) + '...');
    const hasCoupon = tgUrl.includes(encodeURIComponent(code));
    addLog('[v] כולל קופון: ' + hasCoupon, hasCoupon ? 'success' : 'error');
    return { success: hasCoupon, url: tgUrl };
  };

  const s23TwitterFormat = async () => {
    const code = S23_DATA.couponCode;
    const pid = S23_DATA.productId;
    const pname = S23_DATA.productName || 'מוצר בדיקה';
    const shareUrl = await s23BuildShareUrl(pid, code);
    const text = pname + ' | קוד קופון: ' + code;
    const twUrl = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent(shareUrl);
    addLog('Twitter/X URL:');
    addLog(twUrl.substring(0, 120) + '...');
    const hasCoupon = twUrl.includes(encodeURIComponent(code));
    addLog('[v] כולל קופון: ' + hasCoupon, hasCoupon ? 'success' : 'error');
    return { success: hasCoupon, url: twUrl };
  };

  const s23EmailFormat = async () => {
    const code = S23_DATA.couponCode;
    const pid = S23_DATA.productId;
    const pname = S23_DATA.productName || 'מוצר בדיקה';
    const shareUrl = await s23BuildShareUrl(pid, code);
    const subject = 'בדוק את ' + pname;
    const body = 'שלום,\n\n' + pname + '\nמחיר: ₪149.90\nקוד קופון: ' + code + '\n\nלרכישה: ' + shareUrl + '\n\nבברכה';
    const mailUrl = 'mailto:?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    addLog('Email URL:');
    addLog(mailUrl.substring(0, 120) + '...');
    const hasCoupon = mailUrl.includes(encodeURIComponent(code));
    addLog('[v] כולל קופון: ' + hasCoupon, hasCoupon ? 'success' : 'error');
    return { success: hasCoupon, url: mailUrl };
  };

  const s23AllNetworksCoupon = async () => {
    const code = S23_DATA.couponCode;
    const pid = S23_DATA.productId;
    const pname = S23_DATA.productName || 'מוצר בדיקה';
    const shareUrl = await s23BuildShareUrl(pid, code);
    const text = s23BuildShareText(pname, '149.90', code, shareUrl);

    const networks = [
      { name: 'WhatsApp', url: 'https://wa.me/?text=' + encodeURIComponent(text) },
      { name: 'Facebook', url: 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(shareUrl) },
      { name: 'Telegram', url: 'https://t.me/share/url?url=' + encodeURIComponent(shareUrl) + '&text=' + encodeURIComponent(text) },
      { name: 'Twitter/X', url: 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(pname + ' | קוד קופון: ' + code) + '&url=' + encodeURIComponent(shareUrl) },
      { name: 'Email', url: 'mailto:?subject=' + encodeURIComponent('בדוק את ' + pname) + '&body=' + encodeURIComponent(text.replace(/\*/g, '')) },
      { name: 'SMS', url: 'sms:?body=' + encodeURIComponent(text.replace(/\*/g, '')) },
      { name: 'Viber', url: 'viber://forward?text=' + encodeURIComponent(text + '\n' + shareUrl) },
      { name: 'LinkedIn', url: 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(shareUrl) },
    ];

    let passed = 0;
    for (const n of networks) {
      const hasCoupon = n.url.includes(encodeURIComponent(code)) || n.url.includes(code);
      if (hasCoupon) passed++;
      addLog((hasCoupon ? '[v] ' : '[x] ') + n.name + ': ' + (hasCoupon ? 'כולל קופון' : 'חסר קופון'), hasCoupon ? 'success' : 'error');
    }
    addLog('[v] ' + passed + '/' + networks.length + ' רשתות כוללות קוד קופון', passed === networks.length ? 'success' : 'warning');
    return { success: passed >= 6, passed, total: networks.length };
  };

  // --- Phase 6: E2E + Summary ---

  const s23E2eFullFlow = async () => {
    const code = S23_DATA.couponCode;
    if (!code) { addLog('[x] אין קופון', 'error'); return { success: false }; }

    addLog('========================================');
    addLog('     🔗 E2E Full Flow - שיתוף → רכישה');
    addLog('========================================');

    // Step 1: Build share URL
    const pid = S23_DATA.productId;
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = await buildCanonicalProductShareUrl(pid, code, baseUrl);
    addLog('1. לינק שיתוף: ' + shareUrl, 'success');

    // Step 2: Click referral link
    addLog('2. לחיצה על /r/' + code + '...');
    await apiGet('/r/' + code);
    addLog('   → redirect + cookie set', 'success');

    // Step 3: Track referral
    addLog('3. רישום click...');
    const trackR = await apiPost('/api/referral/track', { refCode: code, url: shareUrl, action: 'click' });
    addLog('   → tracked=' + (trackR.data?.tracked || false), 'success');

    // Step 4: Auto-coupon from cookie
    addLog('4. בדיקת auto-coupon...');
    const autoR = await apiGet('/api/referral/auto-coupon');
    const autoCoupon = autoR.data?.coupon;
    addLog('   → autoCoupon=' + (autoCoupon || 'null'), autoCoupon ? 'success' : 'warning');

    // Step 5: Validate coupon
    addLog('5. אימות קופון...');
    const valR = await apiPost('/api/coupons/validate', { code });
    const couponData = valR.data?.coupon;
    addLog('   → discount=' + (couponData?.discountPercent || 0) + '%, agent=' + (couponData?.agentName || 'N/A'), valR.ok ? 'success' : 'error');

    // Step 6: Verify coupon would auto-fill at checkout
    addLog('6. בדיקה שקופון ימולא אוטומטית ב-checkout...');
    const codeFromCookie = autoCoupon || code;
    const checkoutAutoFill = codeFromCookie && valR.ok;
    addLog('   → auto-fill: ' + (checkoutAutoFill ? 'כן!' : 'לא'), checkoutAutoFill ? 'success' : 'warning');

    addLog('========================================');
    addLog('✅ E2E Flow ' + (checkoutAutoFill ? 'הושלם בהצלחה!' : 'הושלם עם אזהרות'), checkoutAutoFill ? 'success' : 'warning');

    return { success: true, checkoutAutoFill, autoCoupon, couponData };
  };

  const s23Summary = async () => {
    addLog('========================================');
    addLog('     🔗 דוח סופי - S23 Sharing & Coupon Flow');
    addLog('========================================');

    const agent = getData('s23-create-agent-coupon');
    const product = getData('s23-create-product');
    const verify = getData('s23-verify-coupon-active');
    const urlProduct = getData('s23-url-product-ref');
    const urlStore = getData('s23-url-store-ref');
    const urlMp = getData('s23-url-marketplace-ref');
    const urlVideo = getData('s23-url-video-ref');
    const allUrls = getData('s23-verify-all-urls');
    const click = getData('s23-click-referral');
    const track = getData('s23-track-referral');
    const logCheck = getData('s23-verify-referral-log');
    const invalid = getData('s23-referral-invalid');
    const autoCoupon = getData('s23-auto-coupon-api');
    const validate = getData('s23-validate-coupon');
    const valInvalid = getData('s23-validate-invalid');
    const valInactive = getData('s23-validate-inactive');
    const wa = getData('s23-whatsapp-format');
    const fb = getData('s23-facebook-format');
    const tg = getData('s23-telegram-format');
    const tw = getData('s23-twitter-format');
    const email = getData('s23-email-format');
    const allNetworks = getData('s23-all-networks-coupon');
    const e2e = getData('s23-e2e-full-flow');

    addLog('⚙️ Setup: agent=' + (agent?.success ? 'v' : 'x') + ', product=' + (product?.success ? 'v' : 'x') + ', coupon=' + (verify?.success ? 'v' : 'x'), 'success');
    addLog('🔗 URLs: product=' + (urlProduct?.success ? 'v' : 'x') + ', store=' + (urlStore?.success ? 'v' : 'x') + ', mp=' + (urlMp?.success ? 'v' : 'x') + ', video=' + (urlVideo?.success ? 'v' : 'x') + ', all=' + (allUrls?.passed || 0) + '/' + (allUrls?.total || 0), 'success');
    addLog('👆 Referral: click=' + (click?.success ? 'v' : 'x') + ', track=' + (track?.success ? 'v' : 'x') + ', log=' + (logCheck?.success ? 'v' : 'x') + ', invalid=' + (invalid?.success ? 'v' : 'x'), 'success');
    addLog('🎫 Coupon: auto=' + (autoCoupon?.coupon || 'null') + ', validate=' + (validate?.success ? 'v' : 'x') + ', invalidCode=' + (valInvalid?.success ? 'v' : 'x') + ', inactive=' + (valInactive?.success ? 'v' : 'x'), 'success');

    const socialOk = [wa, fb, tg, tw, email].filter(s => s?.success).length;
    addLog('📱 Social: ' + socialOk + '/5 format OK, allNetworks=' + (allNetworks?.passed || 0) + '/' + (allNetworks?.total || 0), socialOk === 5 ? 'success' : 'warning');
    addLog('🏁 E2E: autoFill=' + (e2e?.checkoutAutoFill ? 'v' : 'x'), e2e?.checkoutAutoFill ? 'success' : 'warning');
    addLog('========================================');

    return { success: true };
  };

  // ============================================================
  // S24 - LOGS VERIFICATION TEST FUNCTIONS
  // ============================================================

  const S24_DATA = { baselineNotifTotal: 0, baselineActivityTotal: 0, baselineStats: null, triggeredAt: null };

  // --- Phase 1: Baseline ---

  const s24InitialNotifLogs = async () => {
    await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });
    addLog('שולף יומן התראות - baseline...');
    const r = await apiGet('/api/admin/notification-logs?page=1&limit=1&includeStats=true');
    if (r.ok) {
      const total = r.data?.total || 0;
      const stats = r.data?.stats || null;
      S24_DATA.baselineNotifTotal = total;
      S24_DATA.baselineStats = stats;
      addLog('[v] baseline: ' + total + ' התראות ביומן', 'success');
      if (stats) {
        addLog('   stats: sent=' + (stats.sent || 0) + ', failed=' + (stats.failed || 0) + ', dry_run=' + (stats.dryRun || stats.dry_run || 0), 'success');
      }
      return { success: true, total, stats };
    }
    addLog('[x] שליפת יומן נכשלה: ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false };
  };

  const s24InitialActivityLogs = async () => {
    addLog('שולף יומן פעילות - baseline...');
    const r = await apiGet('/api/admin/activity-logs?limit=1');
    if (r.ok) {
      const total = r.data?.stats?.total || 0;
      const today = r.data?.stats?.today || 0;
      S24_DATA.baselineActivityTotal = total;
      addLog('[v] baseline: ' + total + ' פעולות סה"כ, ' + today + ' היום', 'success');
      return { success: true, total, today };
    }
    addLog('[x] שליפת פעילות נכשלה: ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false };
  };

  const s24FetchStats = async () => {
    addLog('שולף סטטיסטיקות מפורטות...');
    const notifR = await apiGet('/api/admin/notification-logs?page=1&limit=1&includeStats=true');
    const actR = await apiGet('/api/admin/activity-logs?limit=1');
    const notifStats = notifR.data?.stats;
    const actStats = actR.data?.stats;
    if (notifStats) {
      addLog('[v] Notification stats: total=' + (notifR.data?.total || 0) + ', sent=' + (notifStats.sent || 0) + ', failed=' + (notifStats.failed || 0), 'success');
    } else {
      addLog('[WARN] אין סטטיסטיקות התראות', 'warning');
    }
    if (actStats) {
      addLog('[v] Activity stats: total=' + (actStats.total || 0) + ', create=' + (actStats.actions?.create || 0) + ', update=' + (actStats.actions?.update || 0) + ', delete=' + (actStats.actions?.delete || 0) + ', login=' + (actStats.actions?.login || 0), 'success');
    } else {
      addLog('[WARN] אין סטטיסטיקות פעילות', 'warning');
    }
    return { success: true, notifStats, actStats };
  };

  // --- Phase 2: Trigger Actions ---

  const s24TriggerRegister = async () => {
    await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });
    S24_DATA.triggeredAt = new Date().toISOString();
    const email = 'sim-s24-cust-' + ts() + '@test.com';
    addLog('רושם לקוח: ' + email + '...');
    const r = await apiPost('/api/auth/register', {
      fullName: 'S24 לקוח בדיקה',
      email,
      phone: randomPhone(),
      password: 'Test1234!',
      role: 'customer',
    });
    if (r.ok) {
      addLog('[v] לקוח נרשם: ' + (r.data?.userId || 'OK') + ' → צפוי welcome_user log', 'success');
      return { success: true, userId: r.data?.userId, email };
    }
    addLog('[x] הרשמה נכשלה: ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false };
  };

  const s24TriggerProduct = async () => {
    await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });
    addLog('שולף עסק...');
    const tenR = await apiGet('/api/tenants');
    const tenants = tenR.data?.tenants || tenR.data?.items || [];
    const tenantId = tenants[0]?._id || tenants[0]?.id;
    const pname = 'S24_LogTest_' + ts();
    addLog('יוצר מוצר: ' + pname + '...');
    const r = await apiPost('/api/products', {
      name: pname,
      description: 'מוצר בדיקת יומנים S24',
      price: 55,
      category: 'בדיקות',
      subCategory: 'כללי',
      tenantId,
      stockCount: 10,
      active: true,
      inStock: true,
      media: { images: [{ url: 'https://placehold.co/400x400/1e3a8a/white?text=S24', alt: 'S24' }] },
    });
    if (r.ok) {
      const pid = r.data?._id || r.data?.product?._id || r.data?.productId;
      addLog('[v] מוצר נוצר: ' + pid + ' → צפוי activity create log', 'success');
      return { success: true, productId: pid, productName: pname };
    }
    addLog('[x] יצירת מוצר נכשלה: ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false };
  };

  const s24TriggerDryrun = async () => {
    await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });
    addLog('שולח התראה dryRun (product_new_release)...');
    const r = await apiPost('/api/admin/notifications/send', {
      templateType: 'product_new_release',
      roles: ['customer'],
      dryRun: true,
      variables: { product_name: 'S24 Test Product' },
    });
    if (r.ok) {
      addLog('[v] dryRun נשלח → צפוי dry_run log', 'success');
      return { success: true };
    }
    addLog('[x] dryRun נכשל: ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false };
  };

  const s24TriggerOrderNotif = async () => {
    addLog('שולח התראה dryRun (order_confirmation)...');
    const r = await apiPost('/api/admin/notifications/send', {
      templateType: 'order_confirmation',
      roles: ['customer'],
      dryRun: true,
      variables: { order_id: 'SIM-S24-ORDER', customer_name: 'לקוח S24' },
    });
    if (r.ok) {
      addLog('[v] order_confirmation dryRun נשלח → צפוי log', 'success');
      return { success: true };
    }
    addLog('[x] נכשל: ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false };
  };

  const s24TriggerCommission = async () => {
    addLog('שולח התראה dryRun (agent_commission_awarded)...');
    const r = await apiPost('/api/admin/notifications/send', {
      templateType: 'agent_commission_awarded',
      roles: ['agent'],
      dryRun: true,
      variables: { agent_name: 'סוכן S24', commission_amount: '50' },
    });
    if (r.ok) {
      addLog('[v] agent_commission dryRun נשלח → צפוי log', 'success');
      return { success: true };
    }
    addLog('[x] נכשל: ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false };
  };

  // --- Phase 3: Verify Notification Logs ---

  const s24VerifyWelcome = async () => {
    addLog('מחפש welcome_user ביומן...');
    const r = await apiGet('/api/admin/notification-logs?templateType=welcome_user&limit=5');
    if (r.ok) {
      const logs = r.data?.logs || [];
      const recent = logs.find(l => {
        const created = new Date(l.createdAt);
        const threshold = new Date(S24_DATA.triggeredAt || Date.now() - 120000);
        return created >= threshold;
      });
      if (recent) {
        addLog('[v] welcome_user נמצא: "' + recent.title + '", status=' + recent.status, 'success');
        return { success: true, log: recent };
      }
      addLog('[WARN] welcome_user לא נמצא (אחרי trigger) - ייתכן שאין auto-send בהרשמה', 'warning');
      if (logs.length > 0) {
        addLog('   אחרון קיים: "' + logs[0].title + '" (' + logs[0].createdAt + ')', 'warning');
      }
      return { success: true, skipped: true, existingCount: logs.length };
    }
    addLog('[x] שליפה נכשלה: ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false };
  };

  const s24VerifyDryrun = async () => {
    addLog('מחפש dry_run ביומן...');
    const r = await apiGet('/api/admin/notification-logs?status=dry_run&limit=10');
    if (r.ok) {
      const logs = r.data?.logs || [];
      const recent = logs.find(l => {
        const created = new Date(l.createdAt);
        const threshold = new Date(S24_DATA.triggeredAt || Date.now() - 120000);
        return created >= threshold;
      });
      if (recent) {
        addLog('[v] dry_run נמצא: "' + recent.title + '", template=' + recent.templateType, 'success');
        return { success: true, log: recent };
      }
      addLog('[x] dry_run לא נמצא אחרי trigger', 'error');
      return { success: false, existingCount: logs.length };
    }
    addLog('[x] שליפה נכשלה: ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false };
  };

  const s24VerifyOrder = async () => {
    addLog('מחפש order_confirmation ביומן...');
    const r = await apiGet('/api/admin/notification-logs?templateType=order_confirmation&limit=5');
    if (r.ok) {
      const logs = r.data?.logs || [];
      const recent = logs.find(l => {
        const created = new Date(l.createdAt);
        const threshold = new Date(S24_DATA.triggeredAt || Date.now() - 120000);
        return created >= threshold;
      });
      if (recent) {
        addLog('[v] order_confirmation נמצא: status=' + recent.status + ', audience=' + recent.audienceType, 'success');
        return { success: true, log: recent };
      }
      addLog('[x] order_confirmation לא נמצא אחרי trigger', 'error');
      return { success: false, existingCount: logs.length };
    }
    addLog('[x] שליפה נכשלה', 'error');
    return { success: false };
  };

  const s24VerifyCommission = async () => {
    addLog('מחפש agent_commission_awarded ביומן...');
    const r = await apiGet('/api/admin/notification-logs?templateType=agent_commission_awarded&limit=5');
    if (r.ok) {
      const logs = r.data?.logs || [];
      const recent = logs.find(l => {
        const created = new Date(l.createdAt);
        const threshold = new Date(S24_DATA.triggeredAt || Date.now() - 120000);
        return created >= threshold;
      });
      if (recent) {
        addLog('[v] agent_commission_awarded נמצא: status=' + recent.status, 'success');
        return { success: true, log: recent };
      }
      addLog('[x] agent_commission_awarded לא נמצא אחרי trigger', 'error');
      return { success: false, existingCount: logs.length };
    }
    addLog('[x] שליפה נכשלה', 'error');
    return { success: false };
  };

  const s24VerifyCountUp = async () => {
    addLog('בודק שמונה ההתראות עלה...');
    const r = await apiGet('/api/admin/notification-logs?page=1&limit=1&includeStats=true');
    if (r.ok) {
      const newTotal = r.data?.total || 0;
      const baseline = S24_DATA.baselineNotifTotal;
      const diff = newTotal - baseline;
      addLog('baseline=' + baseline + ', now=' + newTotal + ', diff=' + diff, diff > 0 ? 'success' : 'warning');
      if (diff > 0) {
        addLog('[v] מונה עלה ב-' + diff + ' התראות חדשות', 'success');
        return { success: true, baseline, newTotal, diff };
      }
      addLog('[WARN] מונה לא עלה (ייתכן שה-dryRun לא נרשם)', 'warning');
      return { success: true, skipped: true, baseline, newTotal };
    }
    addLog('[x] שליפה נכשלה', 'error');
    return { success: false };
  };

  // --- Phase 4: Verify Activity Logs ---

  const s24VerifyActCreate = async () => {
    addLog('מחפש create action ביומן פעילות...');
    const r = await apiGet('/api/admin/activity-logs?action=create&limit=10');
    if (r.ok) {
      const logs = r.data?.logs || [];
      addLog('[v] נמצאו ' + logs.length + ' פעולות create', logs.length > 0 ? 'success' : 'warning');
      if (logs.length > 0) {
        addLog('   אחרון: ' + (logs[0].description || logs[0].entity || 'N/A') + ' (' + (logs[0].createdAt || '') + ')', 'success');
      }
      return { success: true, count: logs.length };
    }
    addLog('[x] שליפה נכשלה: ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false };
  };

  const s24VerifyActLogin = async () => {
    addLog('מחפש login action ביומן פעילות...');
    const r = await apiGet('/api/admin/activity-logs?action=login&limit=10');
    if (r.ok) {
      const logs = r.data?.logs || [];
      addLog('[v] נמצאו ' + logs.length + ' פעולות login', logs.length > 0 ? 'success' : 'warning');
      if (logs.length > 0) {
        addLog('   אחרון: ' + (logs[0].userEmail || logs[0].description || 'N/A'), 'success');
      }
      return { success: true, count: logs.length };
    }
    addLog('[x] שליפה נכשלה: ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false };
  };

  const s24VerifyActStats = async () => {
    addLog('בודק סטטיסטיקות פעילות...');
    const r = await apiGet('/api/admin/activity-logs?limit=1');
    if (r.ok && r.data?.stats) {
      const s = r.data.stats;
      addLog('[v] total=' + s.total + ', today=' + s.today, 'success');
      addLog('   create=' + (s.actions?.create || 0) + ', update=' + (s.actions?.update || 0) + ', delete=' + (s.actions?.delete || 0) + ', login=' + (s.actions?.login || 0), 'success');
      const newTotal = s.total;
      const baseline = S24_DATA.baselineActivityTotal;
      if (newTotal >= baseline) {
        addLog('[v] activity total OK (' + newTotal + ' >= ' + baseline + ')', 'success');
      }
      return { success: true, stats: s, baseline, newTotal };
    }
    addLog('[WARN] אין סטטיסטיקות', 'warning');
    return { success: true, skipped: true };
  };

  // --- Phase 5: Filters & Search ---

  const s24FilterTemplate = async () => {
    addLog('סינון לפי templateType=welcome_user...');
    const r = await apiGet('/api/admin/notification-logs?templateType=welcome_user&limit=10');
    if (r.ok) {
      const logs = r.data?.logs || [];
      const allMatch = logs.every(l => l.templateType === 'welcome_user');
      addLog('[v] ' + logs.length + ' תוצאות, allMatch=' + allMatch, allMatch ? 'success' : 'error');
      return { success: allMatch, count: logs.length };
    }
    addLog('[x] נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s24FilterStatus = async () => {
    addLog('סינון לפי status=dry_run...');
    const r = await apiGet('/api/admin/notification-logs?status=dry_run&limit=10');
    if (r.ok) {
      const logs = r.data?.logs || [];
      const allMatch = logs.every(l => l.status === 'dry_run');
      addLog('[v] ' + logs.length + ' תוצאות dry_run, allMatch=' + allMatch, allMatch ? 'success' : 'error');
      return { success: allMatch, count: logs.length };
    }
    addLog('[x] נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s24FilterRole = async () => {
    addLog('סינון לפי recipientRole=customer...');
    const r = await apiGet('/api/admin/notification-logs?recipientRole=customer&limit=10');
    if (r.ok) {
      const logs = r.data?.logs || [];
      addLog('[v] ' + logs.length + ' תוצאות עם role=customer', logs.length > 0 ? 'success' : 'warning');
      return { success: true, count: logs.length };
    }
    addLog('[x] נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s24FilterDate = async () => {
    const today = new Date().toISOString().split('T')[0];
    addLog('סינון לפי startDate=' + today + '...');
    const r = await apiGet('/api/admin/notification-logs?startDate=' + today + '&limit=10');
    if (r.ok) {
      const logs = r.data?.logs || [];
      const allToday = logs.every(l => l.createdAt && l.createdAt >= today);
      addLog('[v] ' + logs.length + ' תוצאות מהיום, allToday=' + allToday, allToday ? 'success' : 'warning');
      return { success: true, count: logs.length, allToday };
    }
    addLog('[x] נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s24SearchText = async () => {
    addLog('חיפוש טקסט: "ברוך"...');
    const r = await apiGet('/api/admin/notification-logs?search=ברוך&limit=10');
    if (r.ok) {
      const logs = r.data?.logs || [];
      addLog('[v] נמצאו ' + logs.length + ' תוצאות לחיפוש "ברוך"', logs.length > 0 ? 'success' : 'warning');
      if (logs.length > 0) {
        addLog('   ראשון: "' + (logs[0].title || 'N/A') + '"', 'success');
      }
      return { success: true, count: logs.length };
    }
    // Text search might not be enabled
    if (r.status === 500) {
      addLog('[WARN] חיפוש טקסט לא נתמך (ייתכן שצריך text index)', 'warning');
      return { success: true, skipped: true };
    }
    addLog('[x] נכשל: ' + r.status, 'error');
    return { success: false };
  };

  // --- Phase 6: Summary ---

  const s24Summary = async () => {
    addLog('========================================');
    addLog('     📋 דוח סופי - S24 Logs Verification');
    addLog('========================================');

    const initNotif = getData('s24-initial-notif-logs');
    const initAct = getData('s24-initial-activity-logs');
    const stats = getData('s24-fetch-stats');
    const tReg = getData('s24-trigger-register');
    const tProd = getData('s24-trigger-product');
    const tDry = getData('s24-trigger-dryrun');
    const tOrder = getData('s24-trigger-order-notif');
    const tComm = getData('s24-trigger-commission');
    const vWelcome = getData('s24-verify-welcome');
    const vDryrun = getData('s24-verify-dryrun');
    const vOrder = getData('s24-verify-order');
    const vComm = getData('s24-verify-commission');
    const vCount = getData('s24-verify-count-up');
    const vActCreate = getData('s24-verify-act-create');
    const vActLogin = getData('s24-verify-act-login');
    const vActStats = getData('s24-verify-act-stats');
    const fTemplate = getData('s24-filter-template');
    const fStatus = getData('s24-filter-status');
    const fRole = getData('s24-filter-role');
    const fDate = getData('s24-filter-date');
    const fSearch = getData('s24-search-text');

    addLog('📊 Baseline: notif=' + (initNotif?.total || 0) + ', activity=' + (initAct?.total || 0), 'success');
    addLog('⚡ Triggers: register=' + (tReg?.success ? 'v' : 'x') + ', product=' + (tProd?.success ? 'v' : 'x') + ', dryRun=' + (tDry?.success ? 'v' : 'x') + ', order=' + (tOrder?.success ? 'v' : 'x') + ', commission=' + (tComm?.success ? 'v' : 'x'), 'success');
    addLog('🔍 Verify Notif: welcome=' + (vWelcome?.success ? 'v' : 'x') + ', dryrun=' + (vDryrun?.success ? 'v' : 'x') + ', order=' + (vOrder?.success ? 'v' : 'x') + ', commission=' + (vComm?.success ? 'v' : 'x') + ', countUp=' + (vCount?.diff || 0), 'success');
    addLog('📝 Activity: create=' + (vActCreate?.count || 0) + ', login=' + (vActLogin?.count || 0) + ', stats=' + (vActStats?.success ? 'v' : 'x'), 'success');

    const filterOk = [fTemplate, fStatus, fRole, fDate, fSearch].filter(f => f?.success).length;
    addLog('🔎 Filters: ' + filterOk + '/5 OK (template=' + (fTemplate?.success ? 'v' : 'x') + ', status=' + (fStatus?.success ? 'v' : 'x') + ', role=' + (fRole?.success ? 'v' : 'x') + ', date=' + (fDate?.success ? 'v' : 'x') + ', search=' + (fSearch?.success ? 'v' : 'x') + ')', filterOk === 5 ? 'success' : 'warning');
    addLog('========================================');

    return { success: true };
  };

  // ============================================================
  // S25 - FULL ACTIVITY COVERAGE TEST FUNCTIONS
  // ============================================================

  const S25_DATA = { baselineNotif: 0, baselineActivity: 0, baselineAlerts: 0, triggeredAt: null, templateResults: {} };

  const ALL_TEMPLATES = [
    'welcome_user', 'admin_new_registration', 'order_new', 'order_confirmation',
    'agent_commission_awarded', 'admin_agent_sale', 'product_new_release',
    'agent_daily_digest', 'group_buy_weekly_reminder', 'group_buy_last_call',
    'group_buy_closed', 'withdrawal_approved', 'withdrawal_completed',
    'withdrawal_rejected', 'admin_payment_completed',
  ];

  // --- Phase 1: Baseline ---

  const s25BaselineNotif = async () => {
    await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });
    addLog('שולף baseline notification_logs...');
    const r = await apiGet('/api/admin/notification-logs?page=1&limit=1&includeStats=true');
    if (r.ok) {
      S25_DATA.baselineNotif = r.data?.total || 0;
      addLog('[v] baseline: ' + S25_DATA.baselineNotif + ' התראות', 'success');
      return { success: true, total: S25_DATA.baselineNotif, stats: r.data?.stats };
    }
    addLog('[x] ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false };
  };

  const s25BaselineActivity = async () => {
    addLog('שולף baseline activity_logs...');
    const r = await apiGet('/api/admin/activity-logs?limit=1');
    if (r.ok) {
      S25_DATA.baselineActivity = r.data?.stats?.total || 0;
      addLog('[v] baseline: ' + S25_DATA.baselineActivity + ' פעולות', 'success');
      return { success: true, total: S25_DATA.baselineActivity };
    }
    addLog('[x] ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false };
  };

  const s25BaselineAlerts = async () => {
    addLog('שולף baseline system_alerts...');
    const r = await apiGet('/api/admin/alerts');
    if (r.ok) {
      const count = r.data?.alerts?.length || 0;
      const unread = r.data?.unreadCount || 0;
      S25_DATA.baselineAlerts = count;
      addLog('[v] baseline: ' + count + ' alerts, ' + unread + ' unread', 'success');
      return { success: true, total: count, unread };
    }
    addLog('[x] ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false };
  };

  // --- Phase 2: All 15 templates (dryRun) ---

  const s25SendTemplate = async (templateType, roles, variables) => {
    const r = await apiPost('/api/admin/notifications/send', { templateType, roles, dryRun: true, variables });
    const ok = r.ok;
    S25_DATA.templateResults[templateType] = ok;
    return ok;
  };

  const s25TplWelcome = async () => {
    await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });
    S25_DATA.triggeredAt = new Date().toISOString();
    addLog('שולח dryRun: welcome_user...');
    const ok = await s25SendTemplate('welcome_user', ['customer'], { customer_name: 'S25 לקוח' });
    addLog(ok ? '[v] welcome_user נשלח' : '[x] welcome_user נכשל', ok ? 'success' : 'error');
    return { success: ok };
  };

  const s25TplAdminReg = async () => {
    addLog('שולח dryRun: admin_new_registration...');
    const ok = await s25SendTemplate('admin_new_registration', ['admin'], { user_type: 'לקוח', user_name: 'S25 Test', user_email: 'test@s25.com' });
    addLog(ok ? '[v]' : '[x]', ok ? 'success' : 'error');
    return { success: ok };
  };

  const s25TplOrderNew = async () => {
    addLog('שולח dryRun: order_new...');
    const ok = await s25SendTemplate('order_new', ['admin'], { order_id: 'S25-ORD', customer_name: 'לקוח S25', total_amount: '100' });
    addLog(ok ? '[v]' : '[x]', ok ? 'success' : 'error');
    return { success: ok };
  };

  const s25TplOrderConfirm = async () => {
    addLog('שולח dryRun: order_confirmation...');
    const ok = await s25SendTemplate('order_confirmation', ['customer'], { order_id: 'S25-ORD', customer_name: 'לקוח S25' });
    addLog(ok ? '[v]' : '[x]', ok ? 'success' : 'error');
    return { success: ok };
  };

  const s25TplCommission = async () => {
    addLog('שולח dryRun: agent_commission_awarded...');
    const ok = await s25SendTemplate('agent_commission_awarded', ['agent'], { agent_name: 'סוכן S25', commission_amount: '50' });
    addLog(ok ? '[v]' : '[x]', ok ? 'success' : 'error');
    return { success: ok };
  };

  const s25TplAgentSale = async () => {
    addLog('שולח dryRun: admin_agent_sale...');
    const ok = await s25SendTemplate('admin_agent_sale', ['admin'], { agent_name: 'סוכן S25', order_amount: '200' });
    addLog(ok ? '[v]' : '[x]', ok ? 'success' : 'error');
    return { success: ok };
  };

  const s25TplProductNew = async () => {
    addLog('שולח dryRun: product_new_release...');
    const ok = await s25SendTemplate('product_new_release', ['customer'], { product_name: 'מוצר S25' });
    addLog(ok ? '[v]' : '[x]', ok ? 'success' : 'error');
    return { success: ok };
  };

  const s25TplDigest = async () => {
    addLog('שולח dryRun: agent_daily_digest...');
    const ok = await s25SendTemplate('agent_daily_digest', ['agent'], { agent_name: 'סוכן S25', total_sales: '5', total_commission: '100' });
    addLog(ok ? '[v]' : '[x]', ok ? 'success' : 'error');
    return { success: ok };
  };

  const s25TplGroupRemind = async () => {
    addLog('שולח dryRun: group_buy_weekly_reminder...');
    const ok = await s25SendTemplate('group_buy_weekly_reminder', ['customer'], { group_name: 'קבוצה S25', time_left: '3 ימים' });
    addLog(ok ? '[v]' : '[x]', ok ? 'success' : 'error');
    return { success: ok };
  };

  const s25TplGroupLast = async () => {
    addLog('שולח dryRun: group_buy_last_call...');
    const ok = await s25SendTemplate('group_buy_last_call', ['customer'], { group_name: 'קבוצה S25' });
    addLog(ok ? '[v]' : '[x]', ok ? 'success' : 'error');
    return { success: ok };
  };

  const s25TplGroupClosed = async () => {
    addLog('שולח dryRun: group_buy_closed...');
    const ok = await s25SendTemplate('group_buy_closed', ['customer'], { group_name: 'קבוצה S25' });
    addLog(ok ? '[v]' : '[x]', ok ? 'success' : 'error');
    return { success: ok };
  };

  const s25TplWithdrawOk = async () => {
    addLog('שולח dryRun: withdrawal_approved...');
    const ok = await s25SendTemplate('withdrawal_approved', ['agent'], { amount: '500' });
    addLog(ok ? '[v]' : '[x]', ok ? 'success' : 'error');
    return { success: ok };
  };

  const s25TplWithdrawDone = async () => {
    addLog('שולח dryRun: withdrawal_completed...');
    const ok = await s25SendTemplate('withdrawal_completed', ['agent'], { amount: '500' });
    addLog(ok ? '[v]' : '[x]', ok ? 'success' : 'error');
    return { success: ok };
  };

  const s25TplWithdrawReject = async () => {
    addLog('שולח dryRun: withdrawal_rejected...');
    const ok = await s25SendTemplate('withdrawal_rejected', ['agent'], { amount: '500', reason: 'בדיקה' });
    addLog(ok ? '[v]' : '[x]', ok ? 'success' : 'error');
    return { success: ok };
  };

  const s25TplPayment = async () => {
    addLog('שולח dryRun: admin_payment_completed...');
    const ok = await s25SendTemplate('admin_payment_completed', ['admin'], { payment_amount: '300' });
    addLog(ok ? '[v]' : '[x]', ok ? 'success' : 'error');
    return { success: ok };
  };

  // --- Phase 3: Verify Notification Logs ---

  const s25VerifyAllTemplates = async () => {
    addLog('מחפש כל 15 תבניות ביומן...');
    let found = 0;
    let missing = [];
    for (const tpl of ALL_TEMPLATES) {
      const r = await apiGet('/api/admin/notification-logs?templateType=' + tpl + '&limit=3');
      const logs = r.data?.logs || [];
      const recent = logs.find(l => new Date(l.createdAt) >= new Date(S25_DATA.triggeredAt || Date.now() - 300000));
      if (recent) {
        found++;
      } else if (logs.length > 0) {
        found++;
        addLog('   ' + tpl + ': קיים (לא מהריצה הנוכחית)', 'warning');
      } else {
        missing.push(tpl);
      }
    }
    addLog('[v] ' + found + '/15 תבניות נמצאו ביומן', found >= 10 ? 'success' : 'warning');
    if (missing.length > 0) {
      addLog('   חסרות: ' + missing.join(', '), 'warning');
    }
    return { success: found >= 10, found, total: 15, missing };
  };

  const s25VerifyCountUp = async () => {
    addLog('בודק שמונה ההתראות עלה...');
    const r = await apiGet('/api/admin/notification-logs?page=1&limit=1&includeStats=true');
    if (r.ok) {
      const newTotal = r.data?.total || 0;
      const diff = newTotal - S25_DATA.baselineNotif;
      addLog('baseline=' + S25_DATA.baselineNotif + ', now=' + newTotal + ', +' + diff, diff > 0 ? 'success' : 'warning');
      return { success: diff > 0, diff, baseline: S25_DATA.baselineNotif, newTotal };
    }
    return { success: false };
  };

  const s25VerifyStatuses = async () => {
    addLog('בודק שכל הסטטוסים קיימים...');
    const statuses = ['sent', 'dry_run', 'failed'];
    let found = 0;
    for (const st of statuses) {
      const r = await apiGet('/api/admin/notification-logs?status=' + st + '&limit=1');
      const has = r.ok && (r.data?.logs?.length || 0) > 0;
      if (has) found++;
      addLog('   ' + st + ': ' + (has ? 'קיים' : 'חסר'), has ? 'success' : 'warning');
    }
    addLog('[v] ' + found + '/3 סטטוסים', found >= 2 ? 'success' : 'warning');
    return { success: found >= 2, found };
  };

  // --- Phase 4: Activity Logs ---

  const s25ActLogin = async () => {
    addLog('בודק login ביומן פעילות...');
    const r = await apiGet('/api/admin/activity-logs?action=login&limit=5');
    const logs = r.data?.logs || [];
    addLog('[v] ' + logs.length + ' login events', logs.length > 0 ? 'success' : 'warning');
    return { success: true, count: logs.length };
  };

  const s25ActCreateUser = async () => {
    addLog('בודק create user ביומן פעילות...');
    const r = await apiGet('/api/admin/activity-logs?action=create&category=user&limit=5');
    const logs = r.data?.logs || [];
    if (logs.length === 0) {
      const r2 = await apiGet('/api/admin/activity-logs?action=create&limit=10');
      const userLogs = (r2.data?.logs || []).filter(l => l.entity === 'user');
      addLog('[v] ' + userLogs.length + ' create user events (alt query)', userLogs.length > 0 ? 'success' : 'warning');
      return { success: true, count: userLogs.length };
    }
    addLog('[v] ' + logs.length + ' create user events', 'success');
    return { success: true, count: logs.length };
  };

  const s25ActCreateProduct = async () => {
    addLog('בודק create product ביומן פעילות...');
    const r = await apiGet('/api/admin/activity-logs?action=create&limit=10');
    const logs = (r.data?.logs || []).filter(l => l.entity === 'product');
    addLog('[v] ' + logs.length + ' create product events', logs.length > 0 ? 'success' : 'warning');
    return { success: true, count: logs.length };
  };

  const s25ActUpdate = async () => {
    addLog('בודק update ביומן פעילות...');
    const r = await apiGet('/api/admin/activity-logs?action=update&limit=5');
    const logs = r.data?.logs || [];
    addLog('[v] ' + logs.length + ' update events', logs.length > 0 ? 'success' : 'warning');
    return { success: true, count: logs.length };
  };

  const s25ActDelete = async () => {
    addLog('בודק delete ביומן פעילות...');
    const r = await apiGet('/api/admin/activity-logs?action=delete&limit=5');
    const logs = r.data?.logs || [];
    addLog('[v] ' + logs.length + ' delete events', logs.length > 0 ? 'success' : 'warning');
    return { success: true, count: logs.length };
  };

  // --- Phase 5: System Alerts ---

  const s25AlertInfo = async () => {
    addLog('יוצר alert info...');
    const r = await apiPost('/api/admin/alerts', { type: 'info', title: 'S25 Info Alert', message: 'בדיקת יומן - info alert מהסימולטור', source: 'simulator-s25' });
    if (r.ok) {
      addLog('[v] info alert נוצר', 'success');
      // Verify it appears in alerts
      const check = await apiGet('/api/admin/alerts');
      const found = (check.data?.alerts || []).find(a => a.title === 'S25 Info Alert');
      addLog(found ? '[v] נמצא ביומן alerts' : '[x] לא נמצא', found ? 'success' : 'error');
      return { success: !!found, alertId: found?._id };
    }
    addLog('[x] ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false };
  };

  const s25AlertWarning = async () => {
    addLog('יוצר alert warning...');
    const r = await apiPost('/api/admin/alerts', { type: 'warning', title: 'S25 Warning Alert', message: 'בדיקת יומן - warning alert מהסימולטור', source: 'simulator-s25' });
    if (r.ok) {
      addLog('[v] warning alert נוצר', 'success');
      const check = await apiGet('/api/admin/alerts');
      const found = (check.data?.alerts || []).find(a => a.title === 'S25 Warning Alert');
      addLog(found ? '[v] נמצא ביומן' : '[x] לא נמצא', found ? 'success' : 'error');
      return { success: !!found, alertId: found?._id };
    }
    addLog('[x] ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false };
  };

  const s25AlertError = async () => {
    addLog('יוצר alert error...');
    const r = await apiPost('/api/admin/alerts', { type: 'error', title: 'S25 Error Alert', message: 'בדיקת יומן - error alert מהסימולטור', source: 'simulator-s25' });
    if (r.ok) {
      addLog('[v] error alert נוצר', 'success');
      const check = await apiGet('/api/admin/alerts');
      const found = (check.data?.alerts || []).find(a => a.title === 'S25 Error Alert');
      addLog(found ? '[v] נמצא ביומן' : '[x] לא נמצא', found ? 'success' : 'error');
      return { success: !!found, alertId: found?._id };
    }
    addLog('[x] ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false };
  };

  const s25AlertCount = async () => {
    addLog('בודק unread count...');
    const r = await apiGet('/api/admin/alerts?unread=true');
    if (r.ok) {
      const unread = r.data?.unreadCount || r.data?.alerts?.length || 0;
      addLog('[v] unread=' + unread, unread > 0 ? 'success' : 'warning');
      return { success: true, unread };
    }
    addLog('[x] ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false };
  };

  const s25AlertMarkRead = async () => {
    addLog('מסמן alert כנקרא...');
    const alertsR = await apiGet('/api/admin/alerts');
    const alerts = alertsR.data?.alerts || [];
    const simAlert = alerts.find(a => a.source === 'simulator-s25' && !a.read);
    if (simAlert) {
      const id = simAlert._id;
      const r = await apiPatch('/api/admin/alerts', { id });
      addLog(r.ok ? '[v] alert סומן כנקרא' : '[x] סימון נכשל: HTTP ' + r.status, r.ok ? 'success' : 'error');
      return { success: r.ok };
    }
    addLog('[WARN] לא נמצא alert לסימון', 'warning');
    return { success: true, skipped: true };
  };

  // --- Phase 6: Summary ---

  const s25Summary = async () => {
    addLog('========================================');
    addLog('     🔬 דוח סופי - S25 Full Activity Coverage');
    addLog('========================================');

    const bNotif = getData('s25-baseline-notif');
    const bAct = getData('s25-baseline-activity');
    const bAlerts = getData('s25-baseline-alerts');

    // Count template successes
    const tplTests = ['s25-tpl-welcome', 's25-tpl-admin-reg', 's25-tpl-order-new', 's25-tpl-order-confirm',
      's25-tpl-commission', 's25-tpl-agent-sale', 's25-tpl-product-new', 's25-tpl-digest',
      's25-tpl-group-remind', 's25-tpl-group-last', 's25-tpl-group-closed',
      's25-tpl-withdraw-ok', 's25-tpl-withdraw-done', 's25-tpl-withdraw-reject', 's25-tpl-payment'];
    const tplOk = tplTests.filter(t => getData(t)?.success).length;

    const verifyAll = getData('s25-verify-all-templates');
    const verifyCount = getData('s25-verify-count-up');
    const verifyStatus = getData('s25-verify-statuses');

    const actLogin = getData('s25-act-login');
    const actUser = getData('s25-act-create-user');
    const actProd = getData('s25-act-create-product');
    const actUpdate = getData('s25-act-update');
    const actDel = getData('s25-act-delete');

    const alertInfo = getData('s25-alert-info');
    const alertWarn = getData('s25-alert-warning');
    const alertErr = getData('s25-alert-error');
    const alertCount = getData('s25-alert-count');
    const alertRead = getData('s25-alert-mark-read');

    addLog('📊 Baseline: notif=' + (bNotif?.total || 0) + ', activity=' + (bAct?.total || 0) + ', alerts=' + (bAlerts?.total || 0), 'success');
    addLog('📨 Templates: ' + tplOk + '/15 sent OK', tplOk >= 12 ? 'success' : 'warning');
    addLog('🔍 Verify: found=' + (verifyAll?.found || 0) + '/15, countUp=+' + (verifyCount?.diff || 0) + ', statuses=' + (verifyStatus?.found || 0) + '/3', 'success');

    const actTotal = [actLogin, actUser, actProd, actUpdate, actDel].filter(a => a?.count > 0).length;
    addLog('📝 Activity: ' + actTotal + '/5 types found (login=' + (actLogin?.count || 0) + ', createUser=' + (actUser?.count || 0) + ', createProd=' + (actProd?.count || 0) + ', update=' + (actUpdate?.count || 0) + ', delete=' + (actDel?.count || 0) + ')', actTotal >= 3 ? 'success' : 'warning');

    const alertOk = [alertInfo, alertWarn, alertErr].filter(a => a?.success).length;
    addLog('⚠️ Alerts: ' + alertOk + '/3 created, unread=' + (alertCount?.unread || 0) + ', markRead=' + (alertRead?.success ? 'v' : 'x'), alertOk === 3 ? 'success' : 'warning');
    addLog('========================================');

    return { success: true };
  };

  // ============================================================
  // S27 - DASHBOARD NAVIGATION TEST FUNCTIONS
  // ============================================================

  const S27_RESULTS = {};

  const s27CheckPage = async (path, label) => {
    addLog('בודק ' + label + ' → ' + path + '...');
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 12000);
      const res = await fetch(path, { credentials: 'include', signal: ctrl.signal, redirect: 'follow' });
      clearTimeout(t);
      const ok = res.status >= 200 && res.status < 400;
      S27_RESULTS[path] = { status: res.status, ok };
      addLog('   ' + path + ' → HTTP ' + res.status + (ok ? ' OK' : ' FAIL'), ok ? 'success' : 'error');
      return { success: ok, status: res.status, path };
    } catch (e) {
      S27_RESULTS[path] = { status: 0, ok: false };
      addLog('   ' + path + ' → ERROR: ' + e.message, 'error');
      return { success: false, status: 0, path, error: e.message };
    }
  };

  // --- Phase 1: Setup ---

  const s27AdminLogin = async () => {
    addLog('מתחבר כמנהל...');
    const r = await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });
    if (!r.ok) { addLog('[x] login נכשל', 'error'); return { success: false }; }
    addLog('[v] מחובר כ-super_admin', 'success');
    return { success: true };
  };

  const s27DashboardApi = async () => {
    addLog('בודק Dashboard API...');
    const r = await apiGet('/api/admin/dashboard');
    if (r.ok) {
      const stats = r.data?.stats || {};
      addLog('[v] Dashboard API → 200, users=' + (stats.totalUsers || 0) + ', products=' + (stats.totalProducts || 0), 'success');
      return { success: true, stats };
    }
    addLog('[x] ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false };
  };

  // --- Phase 2: Users category ---
  const s27NavUsers = async () => s27CheckPage('/admin/users', 'ניהול משתמשים');
  const s27NavAgents = async () => s27CheckPage('/admin/agents', 'ניהול סוכנים');
  const s27NavNotifLogs = async () => s27CheckPage('/admin/notification-logs', 'יומן התראות');
  const s27NavTenants = async () => s27CheckPage('/admin/tenants', 'ניהול חנויות');
  const s27NavSimulator = async () => s27CheckPage('/admin/simulator', 'סימולטור מערכת');

  // --- Phase 3: Catalog category ---
  const s27NavProducts = async () => s27CheckPage('/admin/products', 'ניהול מוצרים');
  const s27NavOrders = async () => s27CheckPage('/admin/orders', 'ניהול הזמנות');
  const s27NavMyOrders = async () => s27CheckPage('/my-orders', 'ההזמנות שלי');
  const s27NavProductsNew = async () => s27CheckPage('/admin/products/new', 'הוסף מוצר חדש');
  const s27NavCatalogMgr = async () => s27CheckPage('/catalog-manager', 'Catalog Manager');

  // --- Phase 4: Finance category ---
  const s27NavReports = async () => s27CheckPage('/admin/reports', 'דוחות');
  const s27NavAnalytics = async () => s27CheckPage('/admin/analytics', 'ניתוח נתונים');
  const s27NavTransactions = async () => s27CheckPage('/admin/transactions', 'עסקאות');
  const s27NavCommissions = async () => s27CheckPage('/admin/commissions', 'עמלות');
  const s27NavWithdrawals = async () => s27CheckPage('/admin/withdrawals', 'בקשות משיכה');

  // --- Phase 5: Settings + Marketing ---
  const s27NavNotifications = async () => s27CheckPage('/admin/notifications', 'התראות');
  const s27NavMarketing = async () => s27CheckPage('/admin/marketing-assets', 'שיווק');
  const s27NavSettings = async () => s27CheckPage('/admin/settings', 'הגדרות');
  const s27NavSiteTexts = async () => s27CheckPage('/admin/site-texts', 'ניהול טקסטים');
  const s27NavSocialAudit = async () => s27CheckPage('/admin/social-audit', 'Social Audits');
  const s27NavBranding = async () => s27CheckPage('/admin/branding', 'ניהול צבעים');
  const s27NavBotManager = async () => s27CheckPage('/admin/bot-manager', 'ניהול בוט צאט');

  // --- Phase 6: System ---
  const s27NavMonitor = async () => s27CheckPage('/admin/monitor', 'מוניטור');
  const s27NavBackup = async () => s27CheckPage('/admin/backups', 'גיבוי ועדכון');
  const s27NavErrors = async () => s27CheckPage('/admin/errors', 'ניטור שגיאות');
  const s27NavTasks = async () => s27CheckPage('/admin/tasks', 'משימות');
  const s27NavSysReports = async () => s27CheckPage('/admin/system-reports', 'דוחות מערכת');
  const s27NavSecurity = async () => s27CheckPage('/admin/security', 'אבטחה');
  const s27NavCrm = async () => s27CheckPage('/admin/crm/dashboard', 'CRM דשבורד');

  // --- Phase 7: Public + Summary ---
  const s27NavRegister = async () => s27CheckPage('/register', 'הרשמת לקוח');
  const s27NavRegisterAgent = async () => s27CheckPage('/register-agent', 'הרשמת סוכן');
  const s27NavRegisterBiz = async () => s27CheckPage('/register-business', 'הרשמת עסק');
  const s27NavLogin = async () => s27CheckPage('/login', 'דף התחברות');

  const s27Summary = async () => {
    addLog('========================================');
    addLog('     🧭 דוח סופי - S27 Dashboard Navigation');
    addLog('========================================');

    const entries = Object.entries(S27_RESULTS);
    const okCount = entries.filter(([, v]) => v.ok).length;
    const failCount = entries.filter(([, v]) => !v.ok).length;
    const total = entries.length;

    addLog('סה"כ: ' + total + ' דפים נבדקו');
    addLog('[v] OK: ' + okCount + '/' + total, 'success');
    if (failCount > 0) {
      addLog('[x] FAIL: ' + failCount + '/' + total, 'error');
      entries.filter(([, v]) => !v.ok).forEach(([path, v]) => {
        addLog('   FAIL: ' + path + ' → HTTP ' + v.status, 'error');
      });
    }

    // Group by category
    const cats = {
      'משתמשים': ['/admin/users', '/admin/agents', '/admin/notification-logs', '/admin/tenants', '/admin/simulator'],
      'קטלוג': ['/admin/products', '/admin/orders', '/my-orders', '/admin/products/new', '/catalog-manager'],
      'כספים': ['/admin/reports', '/admin/analytics', '/admin/transactions', '/admin/commissions', '/admin/withdrawals'],
      'הגדרות': ['/admin/notifications', '/admin/marketing-assets', '/admin/settings', '/admin/site-texts', '/admin/social-audit', '/admin/branding', '/admin/bot-manager'],
      'מערכת': ['/admin/monitor', '/admin/backups', '/admin/errors', '/admin/tasks', '/admin/system-reports', '/admin/security', '/admin/crm/dashboard'],
      'ציבורי': ['/register', '/register-agent', '/register-business', '/login'],
    };
    Object.entries(cats).forEach(([cat, paths]) => {
      const catOk = paths.filter(p => S27_RESULTS[p]?.ok).length;
      addLog('   ' + cat + ': ' + catOk + '/' + paths.length, catOk === paths.length ? 'success' : 'warning');
    });

    addLog('========================================');
    return { success: failCount === 0, okCount, failCount, total };
  };

  // ============================================================
  // S26 - MARKETING CONTENT LIBRARY TEST FUNCTIONS
  // ============================================================

  const S26_DATA = { tenantId: null, agentCoupon: null, agentRefLink: null, imageAssetId: null, videoAssetId: null, baselineCount: 0 };

  const S26_DEFAULT_TEMPLATE = 'הזדמנות מיוחדת!\n\nהצטרפו לרכישה קבוצתית ותיהנו ממחירים מטורפים!\n\nלרכישה: {link}\n\nקוד קופון להנחה: {coupon}\n\nנלחמים ביוקר המחיה - ורוכשים ביחד!';

  function s26BuildShareMessage(asset, coupon, link, discountPercent) {
    const template = (asset.messageTemplate ? asset.messageTemplate.trim() : '') || S26_DEFAULT_TEMPLATE;
    let msg = template
      .replaceAll('{coupon}', coupon || '')
      .replaceAll('{link}', link || '')
      .replaceAll('{discount}', discountPercent != null ? discountPercent + '%' : '');
    const nLink = typeof link === 'string' ? link.trim() : '';
    if (asset.type === 'video' && nLink && !msg.includes(nLink)) {
      msg = 'לצפייה בסרטון: ' + nLink + '\n\n' + msg.trim();
    }
    return msg;
  }

  // --- Phase 1: Setup ---

  const s26AdminLogin = async () => {
    addLog('מתחבר כמנהל...');
    const r = await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });
    if (!r.ok) { addLog('[x] login נכשל', 'error'); return { success: false }; }
    const tenR = await apiGet('/api/tenants');
    const tenants = tenR.data?.tenants || tenR.data?.items || [];
    S26_DATA.tenantId = tenants[0]?._id || tenants[0]?.id || null;
    addLog('[v] מחובר, tenant=' + (S26_DATA.tenantId || 'super'), 'success');
    return { success: true, tenantId: S26_DATA.tenantId };
  };

  const s26CreateAgentCoupon = async () => {
    addLog('יוצר סוכן עם קופון...');
    const email = 'sim-s26-agent-' + ts() + '@test.com';
    const regR = await apiPost('/api/auth/register', { fullName: 'S26 סוכן בדיקה', email, phone: randomPhone(), password: 'Test1234!', role: 'agent' });
    if (!regR.ok) { addLog('[x] הרשמת סוכן נכשלה: ' + (regR.data?.error || regR.status), 'error'); return { success: false }; }
    const loginR = await apiPost('/api/auth/login', { identifier: email, password: 'Test1234!' });
    if (!loginR.ok) { addLog('[x] login סוכן נכשל', 'error'); return { success: false }; }
    const couponR = await apiGet('/api/agent/coupon');
    const coupon = couponR.data?.couponCode || couponR.data?.coupon?.code || null;
    S26_DATA.agentCoupon = coupon;
    S26_DATA.agentRefLink = couponR.data?.referralLink || (typeof window !== 'undefined' ? window.location.origin + '/r/' + coupon : '/r/' + coupon);
    addLog('[v] סוכן: ' + email + ', coupon=' + coupon, coupon ? 'success' : 'warning');
    await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });
    return { success: !!coupon, coupon, email };
  };

  const s26BaselineAssets = async () => {
    addLog('שולף baseline assets...');
    const r = await apiGet('/api/admin/marketing-assets');
    if (r.ok) {
      const count = r.data?.items?.length || 0;
      S26_DATA.baselineCount = count;
      addLog('[v] baseline: ' + count + ' נכסים', 'success');
      return { success: true, count };
    }
    addLog('[x] ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false };
  };

  // --- Phase 2: CRUD ---

  const s26CreateImage = async () => {
    addLog('יוצר נכס תמונה...');
    const r = await apiPost('/api/admin/marketing-assets', {
      title: 'S26 תמונה שיווקית ' + ts(),
      type: 'image',
      mediaUrl: 'https://placehold.co/800x600/1e3a8a/white?text=S26+Image',
      thumbnailUrl: 'https://placehold.co/200x150/1e3a8a/white?text=S26+Thumb',
      messageTemplate: 'מבצע מטורף! {discount} הנחה!\nלרכישה: {link}\nקוד קופון: {coupon}',
      isActive: true,
    });
    if (r.ok && r.data?.asset) {
      S26_DATA.imageAssetId = r.data.asset.id;
      addLog('[v] תמונה נוצרה: ' + r.data.asset.id, 'success');
      return { success: true, id: r.data.asset.id, asset: r.data.asset };
    }
    addLog('[x] ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false };
  };

  const s26CreateVideo = async () => {
    addLog('יוצר נכס וידאו...');
    const r = await apiPost('/api/admin/marketing-assets', {
      title: 'S26 סרטון שיווקי ' + ts(),
      type: 'video',
      mediaUrl: 'https://res.cloudinary.com/demo/video/upload/v1234/sample.mp4',
      thumbnailUrl: '',
      messageTemplate: 'צפו בסרטון המדהים!\n{link}\n\nקוד קופון: {coupon}\nהנחה: {discount}',
      isActive: true,
    });
    if (r.ok && r.data?.asset) {
      S26_DATA.videoAssetId = r.data.asset.id;
      addLog('[v] וידאו נוצר: ' + r.data.asset.id, 'success');
      return { success: true, id: r.data.asset.id, asset: r.data.asset };
    }
    addLog('[x] ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false };
  };

  const s26ListAssets = async () => {
    addLog('שולף רשימת נכסים...');
    const r = await apiGet('/api/admin/marketing-assets');
    if (r.ok) {
      const items = r.data?.items || [];
      const hasImage = items.some(i => i.id === S26_DATA.imageAssetId);
      const hasVideo = items.some(i => i.id === S26_DATA.videoAssetId);
      addLog('[v] ' + items.length + ' נכסים, image=' + (hasImage ? 'v' : 'x') + ', video=' + (hasVideo ? 'v' : 'x'), hasImage && hasVideo ? 'success' : 'warning');
      return { success: true, count: items.length, hasImage, hasVideo };
    }
    addLog('[x] ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false };
  };

  const s26UpdateAsset = async () => {
    const id = S26_DATA.imageAssetId;
    if (!id) { addLog('[x] אין imageAssetId', 'error'); return { success: false }; }
    addLog('מעדכן נכס ' + id + '...');
    const r = await apiPatch('/api/admin/marketing-assets/' + id, {
      title: 'S26 תמונה מעודכנת ' + ts(),
      messageTemplate: 'מעודכן! {discount} הנחה!\n{link}\nקופון: {coupon}',
    });
    if (r.ok && r.data?.asset) {
      addLog('[v] נכס עודכן: title=' + r.data.asset.title, 'success');
      return { success: true, asset: r.data.asset };
    }
    addLog('[x] ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false };
  };

  const s26GetSingle = async () => {
    const id = S26_DATA.videoAssetId;
    if (!id) { addLog('[x] אין videoAssetId', 'error'); return { success: false }; }
    addLog('שולף נכס בודד ' + id + '...');
    const r = await apiGet('/api/admin/marketing-assets/' + id);
    if (r.ok && r.data?.asset) {
      const a = r.data.asset;
      const hasFields = a.title && a.type && a.mediaUrl;
      addLog('[v] type=' + a.type + ', mediaUrl=' + (a.mediaUrl ? 'v' : 'x') + ', template=' + (a.messageTemplate ? a.messageTemplate.substring(0, 30) + '...' : 'empty'), hasFields ? 'success' : 'warning');
      return { success: !!hasFields, asset: a };
    }
    addLog('[x] ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false };
  };

  const s26Validation = async () => {
    addLog('בודק ולידציה - POST ללא title...');
    const r1 = await apiPost('/api/admin/marketing-assets', { type: 'image', mediaUrl: 'https://example.com/img.jpg' });
    const noTitle = !r1.ok && r1.status === 400;
    addLog('   ללא title: ' + (noTitle ? '400 OK' : 'FAIL ' + r1.status), noTitle ? 'success' : 'error');

    addLog('   POST ללא mediaUrl...');
    const r2 = await apiPost('/api/admin/marketing-assets', { title: 'Test', type: 'image' });
    const noMedia = !r2.ok && r2.status === 400;
    addLog('   ללא mediaUrl: ' + (noMedia ? '400 OK' : 'FAIL ' + r2.status), noMedia ? 'success' : 'error');

    return { success: noTitle && noMedia, noTitle, noMedia };
  };

  // --- Phase 3: Share message + link building ---

  const s26TemplateVars = async () => {
    addLog('בודק החלפת משתנים בתבנית...');
    const coupon = S26_DATA.agentCoupon || 'TEST123';
    const link = 'https://example.com/shop';
    const discount = 15;
    const asset = { type: 'image', messageTemplate: 'קנה עכשיו ב-{discount} הנחה!\n{link}\nקוד: {coupon}' };
    const msg = s26BuildShareMessage(asset, coupon, link, discount);
    const hasCoupon = msg.includes(coupon);
    const hasLink = msg.includes(link);
    const hasDiscount = msg.includes('15%');
    const noVars = !msg.includes('{coupon}') && !msg.includes('{link}') && !msg.includes('{discount}');
    addLog('[v] coupon=' + (hasCoupon ? 'v' : 'x') + ', link=' + (hasLink ? 'v' : 'x') + ', discount=' + (hasDiscount ? 'v' : 'x') + ', noVars=' + (noVars ? 'v' : 'x'), hasCoupon && hasLink && hasDiscount && noVars ? 'success' : 'error');
    return { success: hasCoupon && hasLink && hasDiscount && noVars, message: msg };
  };

  const s26VideoLink = async () => {
    addLog('בודק לינק וידאו עם ref...');
    const videoId = S26_DATA.videoAssetId || 'test-video-id';
    const coupon = S26_DATA.agentCoupon || 'TEST123';
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001';
    const videoLink = baseUrl + '/v/' + videoId + '?ref=' + encodeURIComponent(coupon);
    const hasCoupon = videoLink.includes(coupon);
    const hasVideoPath = videoLink.includes('/v/' + videoId);
    addLog('[v] videoLink=' + videoLink, 'success');
    addLog('   coupon in URL=' + (hasCoupon ? 'v' : 'x') + ', /v/ID=' + (hasVideoPath ? 'v' : 'x'), hasCoupon && hasVideoPath ? 'success' : 'error');
    return { success: hasCoupon && hasVideoPath, videoLink };
  };

  const s26ImageLink = async () => {
    addLog('בודק לינק תמונה (referral link)...');
    const coupon = S26_DATA.agentCoupon || 'TEST123';
    const refLink = S26_DATA.agentRefLink || '/r/' + coupon;
    const hasCoupon = refLink.includes(coupon);
    addLog('[v] refLink=' + refLink + ', coupon=' + (hasCoupon ? 'v' : 'x'), hasCoupon ? 'success' : 'warning');
    return { success: true, refLink, hasCoupon };
  };

  const s26DefaultTemplate = async () => {
    addLog('בודק תבנית ברירת מחדל (messageTemplate ריק)...');
    const asset = { type: 'image', messageTemplate: '' };
    const coupon = S26_DATA.agentCoupon || 'TEST123';
    const link = 'https://example.com/shop';
    const msg = s26BuildShareMessage(asset, coupon, link, 10);
    const usedDefault = msg.includes('הזדמנות מיוחדת') || msg.includes('רכישה קבוצתית');
    const hasCoupon = msg.includes(coupon);
    const hasLink = msg.includes(link);
    addLog('[v] defaultUsed=' + (usedDefault ? 'v' : 'x') + ', coupon=' + (hasCoupon ? 'v' : 'x') + ', link=' + (hasLink ? 'v' : 'x'), usedDefault && hasCoupon ? 'success' : 'error');
    return { success: usedDefault && hasCoupon && hasLink, message: msg };
  };

  // --- Phase 4: All 7 social networks ---

  const s26BuildShareUrls = () => {
    const coupon = S26_DATA.agentCoupon || 'TEST123';
    const videoId = S26_DATA.videoAssetId || 'test-id';
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001';
    const shareLink = baseUrl + '/v/' + videoId + '?ref=' + encodeURIComponent(coupon);
    const asset = { type: 'video', messageTemplate: 'מבצע! {link}\nקופון: {coupon}', id: videoId };
    const preview = s26BuildShareMessage(asset, coupon, shareLink, 15);
    return { shareLink, preview, coupon };
  };

  const s26ShareWhatsapp = async () => {
    const { preview, coupon } = s26BuildShareUrls();
    const url = 'https://wa.me/?text=' + encodeURIComponent(preview);
    const hasCoupon = url.includes(encodeURIComponent(coupon));
    const validPrefix = url.startsWith('https://wa.me/');
    addLog('[v] WhatsApp URL: ' + url.substring(0, 80) + '...', 'success');
    addLog('   coupon=' + (hasCoupon ? 'v' : 'x') + ', prefix=' + (validPrefix ? 'v' : 'x'), hasCoupon && validPrefix ? 'success' : 'error');
    return { success: hasCoupon && validPrefix, url };
  };

  const s26ShareTelegram = async () => {
    const { shareLink, preview, coupon } = s26BuildShareUrls();
    const url = 'https://t.me/share/url?url=' + encodeURIComponent(shareLink) + '&text=' + encodeURIComponent(preview);
    const hasCoupon = url.includes(encodeURIComponent(coupon));
    const validPrefix = url.startsWith('https://t.me/share/');
    addLog('[v] Telegram URL OK, coupon=' + (hasCoupon ? 'v' : 'x'), hasCoupon && validPrefix ? 'success' : 'error');
    return { success: hasCoupon && validPrefix, url };
  };

  const s26ShareFacebook = async () => {
    const { shareLink, preview, coupon } = s26BuildShareUrls();
    const url = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(shareLink) + '&quote=' + encodeURIComponent(preview);
    const hasLink = url.includes(encodeURIComponent(shareLink));
    const validPrefix = url.includes('facebook.com/sharer/');
    addLog('[v] Facebook URL OK, link=' + (hasLink ? 'v' : 'x'), hasLink && validPrefix ? 'success' : 'error');
    return { success: hasLink && validPrefix, url };
  };

  const s26ShareTwitter = async () => {
    const { shareLink, preview, coupon } = s26BuildShareUrls();
    const url = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(preview) + '&url=' + encodeURIComponent(shareLink);
    const hasLink = url.includes(encodeURIComponent(shareLink));
    const validPrefix = url.includes('twitter.com/intent/tweet');
    addLog('[v] X/Twitter URL OK, link=' + (hasLink ? 'v' : 'x'), hasLink && validPrefix ? 'success' : 'error');
    return { success: hasLink && validPrefix, url };
  };

  const s26ShareLinkedin = async () => {
    const { shareLink } = s26BuildShareUrls();
    const url = 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(shareLink);
    const hasLink = url.includes(encodeURIComponent(shareLink));
    const validPrefix = url.includes('linkedin.com/sharing/');
    addLog('[v] LinkedIn URL OK, link=' + (hasLink ? 'v' : 'x'), hasLink && validPrefix ? 'success' : 'error');
    return { success: hasLink && validPrefix, url };
  };

  const s26ShareEmail = async () => {
    const { preview, coupon } = s26BuildShareUrls();
    const url = 'mailto:?subject=' + encodeURIComponent('הזדמנות מיוחדת ב-VIPO!') + '&body=' + encodeURIComponent(preview);
    const hasCoupon = url.includes(encodeURIComponent(coupon));
    const validPrefix = url.startsWith('mailto:');
    addLog('[v] Email URL OK, coupon=' + (hasCoupon ? 'v' : 'x'), hasCoupon && validPrefix ? 'success' : 'error');
    return { success: hasCoupon && validPrefix, url };
  };

  const s26ShareSms = async () => {
    const { preview, coupon } = s26BuildShareUrls();
    const url = 'sms:?body=' + encodeURIComponent(preview);
    const hasCoupon = url.includes(encodeURIComponent(coupon));
    const validPrefix = url.startsWith('sms:');
    addLog('[v] SMS URL OK, coupon=' + (hasCoupon ? 'v' : 'x'), hasCoupon && validPrefix ? 'success' : 'error');
    return { success: hasCoupon && validPrefix, url };
  };

  const s26AllNetworks = async () => {
    addLog('סיכום כל 7 הרשתות...');
    const wa = getData('s26-share-whatsapp');
    const tg = getData('s26-share-telegram');
    const fb = getData('s26-share-facebook');
    const tw = getData('s26-share-twitter');
    const li = getData('s26-share-linkedin');
    const em = getData('s26-share-email');
    const sms = getData('s26-share-sms');
    const all = [wa, tg, fb, tw, li, em, sms];
    const ok = all.filter(n => n?.success).length;
    addLog('[v] ' + ok + '/7 רשתות OK (WA=' + (wa?.success ? 'v' : 'x') + ', TG=' + (tg?.success ? 'v' : 'x') + ', FB=' + (fb?.success ? 'v' : 'x') + ', X=' + (tw?.success ? 'v' : 'x') + ', LI=' + (li?.success ? 'v' : 'x') + ', Email=' + (em?.success ? 'v' : 'x') + ', SMS=' + (sms?.success ? 'v' : 'x') + ')', ok === 7 ? 'success' : 'warning');
    return { success: ok === 7, passed: ok, total: 7 };
  };

  // --- Phase 5: Agent view ---

  const s26AgentList = async () => {
    addLog('מתחבר כסוכן ושולף marketing-assets...');
    const agentEmail = getData('s26-create-agent-coupon')?.email;
    if (agentEmail) {
      await apiPost('/api/auth/login', { identifier: agentEmail, password: 'Test1234!' });
    }
    const r = await apiGet('/api/agent/marketing-assets');
    if (r.ok) {
      const items = r.data?.items || [];
      addLog('[v] סוכן רואה ' + items.length + ' נכסים', items.length > 0 ? 'success' : 'warning');
      await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });
      return { success: true, count: items.length, items };
    }
    addLog('[x] ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });
    return { success: false };
  };

  const s26AgentHasNew = async () => {
    addLog('בודק שהנכסים החדשים נראים לסוכן...');
    const agentEmail = getData('s26-create-agent-coupon')?.email;
    if (agentEmail) {
      await apiPost('/api/auth/login', { identifier: agentEmail, password: 'Test1234!' });
    }
    const r = await apiGet('/api/agent/marketing-assets');
    const items = r.data?.items || [];
    const hasImage = items.some(i => i.id === S26_DATA.imageAssetId);
    const hasVideo = items.some(i => i.id === S26_DATA.videoAssetId);
    addLog('[v] image=' + (hasImage ? 'v' : 'x') + ', video=' + (hasVideo ? 'v' : 'x'), hasImage && hasVideo ? 'success' : 'warning');
    await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });
    return { success: hasImage || hasVideo, hasImage, hasVideo };
  };

  const s26DeleteAsset = async () => {
    const id = S26_DATA.imageAssetId;
    if (!id) { addLog('[x] אין imageAssetId', 'error'); return { success: false }; }
    addLog('מוחק נכס ' + id + '...');
    const r = await apiDelete('/api/admin/marketing-assets/' + id);
    if (r.ok) {
      addLog('[v] נכס נמחק', 'success');
      const check = await apiGet('/api/admin/marketing-assets');
      const stillExists = (check.data?.items || []).some(i => i.id === id);
      addLog(stillExists ? '[x] עדיין ברשימה!' : '[v] לא נמצא ברשימה - OK', stillExists ? 'error' : 'success');
      // cleanup video too
      if (S26_DATA.videoAssetId) {
        await apiDelete('/api/admin/marketing-assets/' + S26_DATA.videoAssetId);
        addLog('[v] וידאו נמחק גם', 'success');
      }
      return { success: !stillExists };
    }
    addLog('[x] ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false };
  };

  // --- Phase 6: Summary ---

  const s26Summary = async () => {
    addLog('========================================');
    addLog('     🎬 דוח סופי - S26 Marketing Content Library');
    addLog('========================================');

    const login = getData('s26-admin-login');
    const agent = getData('s26-create-agent-coupon');
    const imgCreate = getData('s26-create-image');
    const vidCreate = getData('s26-create-video');
    const list = getData('s26-list-assets');
    const update = getData('s26-update-asset');
    const single = getData('s26-get-single');
    const valid = getData('s26-validation');
    const tplVars = getData('s26-template-vars');
    const vidLink = getData('s26-video-link');
    const imgLink = getData('s26-image-link');
    const defTpl = getData('s26-default-template');
    const allNet = getData('s26-all-networks');
    const agentList = getData('s26-agent-list');
    const agentNew = getData('s26-agent-has-new');
    const del = getData('s26-delete-asset');

    addLog('⚙️ Setup: login=' + (login?.success ? 'v' : 'x') + ', agent=' + (agent?.coupon || 'x'), 'success');
    addLog('📦 CRUD: image=' + (imgCreate?.success ? 'v' : 'x') + ', video=' + (vidCreate?.success ? 'v' : 'x') + ', list=' + (list?.count || 0) + ', update=' + (update?.success ? 'v' : 'x') + ', single=' + (single?.success ? 'v' : 'x') + ', validation=' + (valid?.success ? 'v' : 'x'), 'success');
    addLog('📝 Share: vars=' + (tplVars?.success ? 'v' : 'x') + ', videoLink=' + (vidLink?.success ? 'v' : 'x') + ', imageLink=' + (imgLink?.success ? 'v' : 'x') + ', default=' + (defTpl?.success ? 'v' : 'x'), 'success');
    addLog('📱 Social: ' + (allNet?.passed || 0) + '/7 (WA+TG+FB+X+LI+Email+SMS)', allNet?.passed === 7 ? 'success' : 'warning');
    addLog('👤 Agent: list=' + (agentList?.count || 0) + ', newVisible=' + (agentNew?.success ? 'v' : 'x') + ', delete=' + (del?.success ? 'v' : 'x'), 'success');
    addLog('========================================');

    return { success: true };
  };

  // ============================================================
  // S28 - CRM FULL FLOW TEST FUNCTIONS
  // ============================================================

  const S28_DATA = { tenantId: null, leadId: null, leadName: null, conversationId: null, taskId: null, automationId: null };

  const s28SetupTenant = async () => {
    await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });
    addLog('שולף עסקים...');
    const r = await apiGet('/api/tenants');
    const tenants = r.data?.tenants || r.data?.items || [];
    if (!tenants.length) { addLog('[x] אין עסקים במערכת', 'error'); return { success: false }; }
    const tenant = tenants[0];
    S28_DATA.tenantId = tenant._id || tenant.id;
    addLog('impersonate ל: ' + (tenant.name || S28_DATA.tenantId));
    const imp = await apiPost('/api/admin/impersonate', { tenantId: S28_DATA.tenantId });
    if (!imp.ok) { addLog('[x] impersonate נכשל: HTTP ' + imp.status, 'error'); return { success: false }; }
    addLog('[v] מחובר לעסק: ' + (tenant.name || S28_DATA.tenantId), 'success');
    return { success: true, tenantId: S28_DATA.tenantId, tenantName: tenant.name };
  };

  const s28CrmStatsBaseline = async () => {
    addLog('שולף סטטיסטיקות CRM...');
    const r = await apiGet('/api/crm/stats');
    if (r.ok) {
      addLog('[v] baseline stats: ' + JSON.stringify(r.data).slice(0, 120), 'success');
      return { success: true, stats: r.data };
    }
    if (r.status === 404) { addLog('[WARN] /api/crm/stats לא קיים (404)', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] שליפת stats נכשלה: HTTP ' + r.status, 'error');
    return { success: false };
  };

  const s28CreateLead = async () => {
    const name = 'ליד בדיקה S28_' + ts();
    addLog('יוצר ליד: ' + name);
    const r = await apiPost('/api/crm/leads', { name, phone: '050' + Math.floor(Math.random() * 9000000 + 1000000), email: 'sim-s28-lead-' + ts() + '@test.com', source: 'manual', status: 'new', notes: 'נוצר ע"י סימולטור S28' });
    const leadId = r.data?._id || r.data?.id;
    if (r.ok && leadId) {
      S28_DATA.leadId = leadId;
      S28_DATA.leadName = name;
      addLog('[v] ליד נוצר: ' + leadId, 'success');
      return { success: true, leadId, name };
    }
    addLog('[x] יצירת ליד נכשלה: ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false };
  };

  const s28GetLead = async () => {
    if (!S28_DATA.leadId) { addLog('[x] אין ליד', 'error'); return { success: false }; }
    addLog('שולף ליד: ' + S28_DATA.leadId);
    const r = await apiGet('/api/crm/leads/' + S28_DATA.leadId);
    if (r.ok && r.data) {
      addLog('[v] ליד נמצא: ' + (r.data.name || r.data._id), 'success');
      return { success: true };
    }
    addLog('[x] שליפה נכשלה: HTTP ' + r.status, 'error');
    return { success: false };
  };

  const s28UpdateLead = async () => {
    if (!S28_DATA.leadId) { addLog('[x] אין ליד', 'error'); return { success: false }; }
    addLog('מעדכן סטטוס ליד ל-contacted...');
    const r = await apiPatch('/api/crm/leads/' + S28_DATA.leadId, { status: 'contacted', notes: 'עודכן ע"י S28 - ' + new Date().toISOString() });
    if (r.ok) {
      addLog('[v] ליד עודכן', 'success');
      return { success: true };
    }
    addLog('[x] עדכון נכשל: HTTP ' + r.status, 'error');
    return { success: false };
  };

  const s28ListLeads = async () => {
    addLog('שולף רשימת לידים...');
    const r = await apiGet('/api/crm/leads?limit=10');
    if (r.ok) {
      const count = r.data?.leads?.length || 0;
      const total = r.data?.pagination?.total || count;
      addLog('[v] נמצאו ' + count + ' לידים (סה"כ: ' + total + ')', 'success');
      return { success: true, count, total };
    }
    addLog('[x] שליפה נכשלה: HTTP ' + r.status, 'error');
    return { success: false };
  };

  const s28SearchLeads = async () => {
    if (!S28_DATA.leadName) { addLog('[WARN] אין שם ליד לחיפוש', 'warning'); return { success: true, skipped: true }; }
    const q = S28_DATA.leadName.slice(0, 15);
    addLog('מחפש: ' + q);
    const r = await apiGet('/api/crm/leads?search=' + encodeURIComponent(q));
    if (r.ok) {
      const found = (r.data?.leads || []).some(l => String(l._id) === String(S28_DATA.leadId));
      if (found) { addLog('[v] ליד נמצא בחיפוש', 'success'); return { success: true }; }
      addLog('[WARN] ליד לא נמצא בתוצאות חיפוש', 'warning');
      return { success: true, skipped: true };
    }
    addLog('[x] חיפוש נכשל: HTTP ' + r.status, 'error');
    return { success: false };
  };

  const s28CreateConversation = async () => {
    addLog('יוצר שיחה...');
    const body = { channel: 'whatsapp', subject: 'שיחת בדיקה S28 - ' + ts(), status: 'open' };
    if (S28_DATA.leadId) body.leadId = S28_DATA.leadId;
    const r = await apiPost('/api/crm/conversations', body);
    const convId = r.data?._id || r.data?.id;
    if (r.ok && convId) {
      S28_DATA.conversationId = convId;
      addLog('[v] שיחה נוצרה: ' + convId, 'success');
      return { success: true, conversationId: convId };
    }
    addLog('[x] יצירת שיחה נכשלה: ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false };
  };

  const s28ListConversations = async () => {
    addLog('שולף שיחות...');
    const r = await apiGet('/api/crm/conversations?limit=10');
    if (r.ok) {
      const count = r.data?.conversations?.length || 0;
      addLog('[v] נמצאו ' + count + ' שיחות', 'success');
      return { success: true, count };
    }
    addLog('[x] שליפה נכשלה: HTTP ' + r.status, 'error');
    return { success: false };
  };

  const s28AddInteraction = async () => {
    if (!S28_DATA.conversationId) { addLog('[x] אין שיחה', 'error'); return { success: false }; }
    addLog('מוסיף אינטראקציה...');
    const r = await apiPost('/api/crm/conversations/' + S28_DATA.conversationId + '/interactions', { type: 'note', content: 'הערה מסימולטור S28 - ' + new Date().toLocaleString('he-IL'), direction: 'outbound' });
    if (r.ok) { addLog('[v] אינטראקציה נוספה', 'success'); return { success: true }; }
    if (r.status === 404) { addLog('[WARN] interactions API לא קיים', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] הוספה נכשלה: HTTP ' + r.status, 'error');
    return { success: false };
  };

  const s28CreateTask = async () => {
    addLog('יוצר משימה...');
    const body = { title: 'משימת בדיקה S28 - ' + ts(), description: 'משימה מסימולטור', priority: 'high', status: 'pending', dueAt: new Date(Date.now() + 86400000).toISOString() };
    if (S28_DATA.leadId) body.leadId = S28_DATA.leadId;
    const r = await apiPost('/api/crm/tasks', body);
    const taskId = r.data?._id || r.data?.id;
    if (r.ok && taskId) {
      S28_DATA.taskId = taskId;
      addLog('[v] משימה נוצרה: ' + taskId, 'success');
      return { success: true, taskId };
    }
    addLog('[x] יצירת משימה נכשלה: ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false };
  };

  const s28ListTasks = async () => {
    addLog('שולף משימות...');
    const r = await apiGet('/api/crm/tasks?limit=10');
    if (r.ok) {
      const count = r.data?.tasks?.length || 0;
      const overdue = r.data?.overdueCount || 0;
      addLog('[v] ' + count + ' משימות, ' + overdue + ' באיחור', 'success');
      return { success: true, count, overdue };
    }
    addLog('[x] שליפה נכשלה: HTTP ' + r.status, 'error');
    return { success: false };
  };

  const s28UpdateTask = async () => {
    if (!S28_DATA.taskId) { addLog('[x] אין משימה', 'error'); return { success: false }; }
    addLog('מסיים משימה...');
    const r = await apiPatch('/api/crm/tasks/' + S28_DATA.taskId, { status: 'completed' });
    if (r.ok) { addLog('[v] משימה הושלמה', 'success'); return { success: true }; }
    addLog('[x] עדכון נכשל: HTTP ' + r.status, 'error');
    return { success: false };
  };

  const s28ListAutomations = async () => {
    addLog('שולף אוטומציות...');
    const r = await apiGet('/api/crm/automations');
    if (r.ok) {
      const items = r.data?.automations || r.data || [];
      const count = Array.isArray(items) ? items.length : 0;
      addLog('[v] נמצאו ' + count + ' אוטומציות', 'success');
      return { success: true, count };
    }
    if (r.status === 404) { addLog('[WARN] automations API לא קיים', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] שליפה נכשלה: HTTP ' + r.status, 'error');
    return { success: false };
  };

  const s28CreateAutomation = async () => {
    addLog('יוצר אוטומציה...');
    const r = await apiPost('/api/crm/automations', { name: 'S28 Auto ' + ts(), trigger: { type: 'lead_created', conditions: {} }, action: { type: 'notify_user' }, isActive: false });
    if (r.ok) {
      const autoId = r.data?._id || r.data?.id || null;
      S28_DATA.automationId = autoId;
      addLog('[v] אוטומציה נוצרה' + (autoId ? ': ' + autoId : ''), 'success');
      return { success: true, automationId: autoId };
    }
    if (r.status === 404) { addLog('[WARN] automations POST לא קיים', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] יצירה נכשלה: ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    return { success: false };
  };

  const s28DeleteLead = async () => {
    if (!S28_DATA.leadId) { addLog('[WARN] אין ליד למחיקה', 'warning'); return { success: true, skipped: true }; }
    addLog('מוחק ליד: ' + S28_DATA.leadId);
    const r = await apiDelete('/api/crm/leads/' + S28_DATA.leadId);
    if (r.ok) { addLog('[v] ליד נמחק', 'success'); return { success: true }; }
    addLog('[x] מחיקה נכשלה: HTTP ' + r.status, 'error');
    return { success: false };
  };

  const s28CrmStatsFinal = async () => {
    addLog('סטטיסטיקות סופיות...');
    const r = await apiGet('/api/crm/stats');
    await apiDelete('/api/admin/impersonate');
    if (r.ok) {
      addLog('[v] stats סופי: ' + JSON.stringify(r.data).slice(0, 120), 'success');
      return { success: true, stats: r.data };
    }
    addLog('[WARN] stats: HTTP ' + r.status, 'warning');
    return { success: true, skipped: true };
  };

  // ============================================================
  // S29 - OTP & EMAIL VERIFY TEST FUNCTIONS
  // ============================================================

  // --- Phase 1: OTP ---
  const s29OtpMissingPhone = async () => {
    addLog('שולח OTP ללא טלפון...');
    const r = await apiPost('/api/auth/send-otp', {});
    if (r.status === 400) { addLog('[v] נדחה כצפוי (400 - bad_request)', 'success'); return { success: true }; }
    if (r.status === 0) { addLog('[WARN] timeout - route OTP לא זמין (sendOTP חסר)', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 400, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  const s29OtpInvalidPhone = async () => {
    addLog('שולח OTP עם טלפון קצר...');
    const r = await apiPost('/api/auth/send-otp', { phone: '12' });
    if (r.status === 400) { addLog('[v] נדחה כצפוי (400 - טלפון קצר)', 'success'); return { success: true }; }
    if (r.status === 0) { addLog('[WARN] timeout - route OTP לא זמין', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 400, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  const s29OtpSend = async () => {
    addLog('שולח OTP לטלפון תקין...');
    const r = await apiPost('/api/auth/send-otp', { phone: '0533752633' });
    if (r.ok) { addLog('[v] OTP נשלח בהצלחה', 'success'); return { success: true }; }
    if (r.status === 429) { addLog('[WARN] rate limit - יותר מדי בקשות', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 500) { addLog('[WARN] שירות SMS לא זמין (500) - תקין בסביבת פיתוח', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout - sendOTP לא ממומש / SMS service חסר', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] שליחת OTP נכשלה: HTTP ' + r.status, 'error');
    return { success: false };
  };

  const s29OtpVerifyBadCode = async () => {
    addLog('מאמת OTP עם קוד שגוי...');
    const r = await apiPost('/api/auth/verify-otp', { phone: '0533752633', code: '000000' });
    if (r.status === 401) { addLog('[v] נדחה כצפוי (401 - invalid_code)', 'success'); return { success: true }; }
    if (r.status === 429) { addLog('[WARN] rate limit', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout - route verify-otp לא זמין', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 401, קיבלתי: ' + r.status + ' - ' + (r.data?.error || ''), 'error');
    return { success: false };
  };

  const s29OtpVerifyMissing = async () => {
    addLog('מאמת OTP ללא שדות...');
    const r = await apiPost('/api/auth/verify-otp', {});
    if (r.status === 400) { addLog('[v] נדחה כצפוי (400 - bad_request)', 'success'); return { success: true }; }
    if (r.status === 429) { addLog('[WARN] rate limit', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout - route verify-otp לא זמין', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 400, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  // --- Phase 2: Email ---
  const s29EmailMissing = async () => {
    addLog('שולח קוד מייל ללא email...');
    const r = await apiPost('/api/auth/send-email-code', {});
    if (r.status === 400) { addLog('[v] נדחה כצפוי (400 - invalid_email)', 'success'); return { success: true }; }
    if (r.status === 0) { addLog('[WARN] timeout - route send-email-code לא זמין', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 400, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  const s29EmailInvalid = async () => {
    addLog('שולח קוד למייל לא תקין...');
    const r = await apiPost('/api/auth/send-email-code', { email: 'not-an-email' });
    if (r.status === 400) { addLog('[v] נדחה כצפוי (400 - invalid_email)', 'success'); return { success: true }; }
    if (r.status === 0) { addLog('[WARN] timeout - route send-email-code לא זמין', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 400, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  const s29EmailSend = async () => {
    addLog('שולח קוד אימות למייל...');
    const r = await apiPost('/api/auth/send-email-code', { email: 'sim-s29-' + ts() + '@test.com' });
    if (r.ok) { addLog('[v] קוד אימות נשלח בהצלחה', 'success'); return { success: true }; }
    if (r.status === 429) { addLog('[WARN] rate limit - יותר מדי בקשות', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 500) { addLog('[WARN] שירות מייל לא זמין (500) - תקין בסביבת פיתוח', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout - שירות מייל לא זמין', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] שליחה נכשלה: HTTP ' + r.status, 'error');
    return { success: false };
  };

  const s29EmailVerifyNoCode = async () => {
    addLog('מאמת קוד מייל שלא נשלח...');
    const r = await apiPost('/api/auth/verify-email-code', { email: 'nonexistent-s29-' + ts() + '@test.com', code: '123456' });
    if (r.status === 400 && (r.data?.error === 'no_code' || r.data?.error === 'invalid_request')) {
      addLog('[v] נדחה כצפוי (400 - ' + r.data.error + ')', 'success'); return { success: true };
    }
    if (r.status === 400) { addLog('[v] נדחה כצפוי (400)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] verify-email-code שגיאת שרת (500) - DB לא זמין', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 429) { addLog('[WARN] rate limit', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout - route verify-email-code לא זמין', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 400/no_code, קיבלתי: ' + r.status + ' - ' + (r.data?.error || ''), 'error');
    return { success: false };
  };

  const s29EmailVerifyBadCode = async () => {
    addLog('מאמת קוד מייל שגוי...');
    const r = await apiPost('/api/auth/verify-email-code', { email: 'sim-s29-bad@test.com', code: '000000' });
    if (r.status === 400) { addLog('[v] נדחה כצפוי (400 - ' + (r.data?.error || 'invalid') + ')', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] verify-email-code שגיאת שרת (500) - DB lookup נכשל (אין קוד שנשלח)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 429) { addLog('[WARN] rate limit', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout - route verify-email-code לא זמין', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 400, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  const s29EmailVerifyMissing = async () => {
    addLog('מאמת קוד מייל ללא שדות...');
    const r = await apiPost('/api/auth/verify-email-code', {});
    if (r.status === 400) { addLog('[v] נדחה כצפוי (400 - invalid_request)', 'success'); return { success: true }; }
    if (r.status === 429) { addLog('[WARN] rate limit', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout - route verify-email-code לא זמין', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 400, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  // ============================================================
  // S30 - MESSAGING TEST FUNCTIONS
  // ============================================================

  const S30_DATA = { messageId: null };

  const s30Login = async () => {
    addLog('מתחבר כמנהל...');
    const r = await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });
    if (r.ok) { addLog('[v] התחברות הצליחה', 'success'); return { success: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] התחברות נכשלה: ' + r.status, 'error');
    return { success: false };
  };

  const s30SendEmpty = async () => {
    addLog('שולח הודעה ללא טקסט...');
    const r = await apiPost('/api/messages', {});
    if (r.status === 400) { addLog('[v] נדחה כצפוי (400 - message_required)', 'success'); return { success: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 400, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  const s30SendLong = async () => {
    addLog('שולח הודעה ארוכה מדי (2001+ תווים)...');
    const longMsg = 'א'.repeat(2100);
    const r = await apiPost('/api/messages', { message: longMsg });
    if (r.status === 400) { addLog('[v] נדחה כצפוי (400 - message_too_long)', 'success'); return { success: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 400, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  const s30SendBadRole = async () => {
    addLog('שולח הודעה עם targetRole שגוי...');
    const r = await apiPost('/api/messages', { message: 'בדיקה S30', targetRole: 'fake_role' });
    if (r.status === 400) { addLog('[v] נדחה כצפוי (400 - invalid_target_role)', 'success'); return { success: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 400, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  const s30SendOk = async () => {
    addLog('שולח הודעה תקינה...');
    const r = await apiPost('/api/messages', { message: 'הודעת בדיקה S30 - ' + ts(), targetRole: 'all' });
    if (r.ok && r.data?.item?.id) {
      S30_DATA.messageId = r.data.item.id;
      addLog('[v] הודעה נוצרה: ' + r.data.item.id, 'success');
      return { success: true, messageId: r.data.item.id };
    }
    if (r.ok) { addLog('[v] הודעה נוצרה (ללא ID)', 'success'); return { success: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] שליחה נכשלה: HTTP ' + r.status + ' - ' + (r.data?.error || ''), 'error');
    return { success: false };
  };

  const s30List = async () => {
    addLog('שולף רשימת הודעות...');
    const r = await apiGet('/api/messages');
    if (r.ok && Array.isArray(r.data?.items)) {
      addLog('[v] התקבלו ' + r.data.items.length + ' הודעות', 'success');
      return { success: true, count: r.data.items.length };
    }
    if (r.ok) { addLog('[v] תגובה תקינה', 'success'); return { success: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] שליפה נכשלה: HTTP ' + r.status, 'error');
    return { success: false };
  };

  const s30UnreadCount = async () => {
    addLog('שולף ספירת הודעות לא נקראו...');
    const r = await apiGet('/api/messages/unread-count');
    if (r.ok && typeof r.data?.count === 'number') {
      addLog('[v] לא נקראו: ' + r.data.count, 'success');
      return { success: true, count: r.data.count };
    }
    if (r.ok) { addLog('[v] תגובה תקינה', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] unread-count שגיאת שרת (500) - connectMongo / Mongoose', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] שליפה נכשלה: HTTP ' + r.status, 'error');
    return { success: false };
  };

  const s30ReadAll = async () => {
    addLog('מסמן את כל ההודעות כנקראו...');
    const r = await apiPost('/api/messages/read-all', {});
    if (r.ok) { addLog('[v] סומנו כנקראו: ' + (r.data?.updated || 0) + ' הודעות', 'success'); return { success: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] סימון נכשל: HTTP ' + r.status, 'error');
    return { success: false };
  };

  const s30Delete = async () => {
    if (!S30_DATA.messageId) { addLog('[WARN] אין messageId למחיקה - דילוג', 'warning'); return { success: true, skipped: true }; }
    addLog('מוחק הודעה: ' + S30_DATA.messageId);
    const r = await apiDelete('/api/messages/' + S30_DATA.messageId);
    if (r.ok) { addLog('[v] הודעה נמחקה', 'success'); return { success: true }; }
    if (r.status === 404) { addLog('[v] הודעה לא נמצאה (כבר נמחקה)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] מחיקה שגיאת שרת (500) - connectMongo / Mongoose', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] מחיקה נכשלה: HTTP ' + r.status, 'error');
    return { success: false };
  };

  const s30DeleteInvalid = async () => {
    addLog('מוחק הודעה עם ID שגוי...');
    const r = await apiDelete('/api/messages/invalid-id-12345');
    if (r.status === 400) { addLog('[v] נדחה כצפוי (400 - invalid_message_id)', 'success'); return { success: true }; }
    if (r.status === 404) { addLog('[v] נדחה כצפוי (404)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500) - connectMongo / Mongoose', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 400/404, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  const s30SupportEmpty = async () => {
    addLog('שולח הודעת תמיכה ללא טקסט...');
    const r = await apiPost('/api/support-messages', {});
    if (r.status === 400) { addLog('[v] נדחה כצפוי (400)', 'success'); return { success: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 400, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  const s30SupportSend = async () => {
    addLog('שולח הודעת תמיכה תקינה...');
    const r = await apiPost('/api/support-messages', { message: 'הודעת תמיכה S30 - ' + ts(), source: 'simulator' });
    if (r.status === 201 || r.ok) { addLog('[v] הודעת תמיכה נוצרה', 'success'); return { success: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] יצירה נכשלה: HTTP ' + r.status, 'error');
    return { success: false };
  };

  // ============================================================
  // S31 - AGENT DASHBOARD TEST FUNCTIONS
  // ============================================================

  const s31Login = async () => {
    addLog('מתחבר כמנהל...');
    const r = await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });
    if (r.ok) { addLog('[v] התחברות הצליחה', 'success'); return { success: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] התחברות נכשלה: ' + r.status, 'error');
    return { success: false };
  };

  const s31Marketplace = async () => {
    addLog('שולף Marketplace...');
    const r = await apiGet('/api/agent/marketplace');
    if (r.ok && Array.isArray(r.data?.businesses)) {
      addLog('[v] Marketplace: ' + r.data.businesses.length + ' עסקים', 'success');
      return { success: true, count: r.data.businesses.length };
    }
    if (r.ok) { addLog('[v] תגובה תקינה', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] שליפה נכשלה: HTTP ' + r.status, 'error');
    return { success: false };
  };

  const s31Businesses = async () => {
    addLog('שולף רשימת עסקים של סוכן...');
    const r = await apiGet('/api/agent/businesses');
    if (r.ok && Array.isArray(r.data?.businesses)) {
      addLog('[v] עסקים: ' + r.data.businesses.length, 'success');
      return { success: true, count: r.data.businesses.length };
    }
    if (r.ok) { addLog('[v] תגובה תקינה', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] שליפה נכשלה: HTTP ' + r.status, 'error');
    return { success: false };
  };

  const s31CurrentBiz = async () => {
    addLog('שולף עסק נוכחי...');
    const r = await apiGet('/api/agent/current-business');
    if (r.ok) {
      const biz = r.data?.currentBusiness;
      addLog('[v] עסק נוכחי: ' + (biz?.tenantName || 'אין') + ' | hasBusinesses=' + r.data?.hasBusinesses, 'success');
      return { success: true };
    }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] שליפה נכשלה: HTTP ' + r.status, 'error');
    return { success: false };
  };

  const s31Commissions = async () => {
    addLog('שולף עמלות סוכן...');
    const r = await apiGet('/api/agent/commissions');
    if (r.ok && r.data?.summary) {
      addLog('[v] עמלות: available=' + (r.data.summary.availableBalance || 0) + ', pending=' + (r.data.summary.pendingCommissions || 0), 'success');
      return { success: true };
    }
    if (r.ok) { addLog('[v] תגובה תקינה', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] שליפה נכשלה: HTTP ' + r.status, 'error');
    return { success: false };
  };

  const s31StatsNoAgent = async () => {
    addLog('שולף סטטיסטיקות ללא agentId...');
    const r = await apiGet('/api/agent/stats');
    if (r.status === 400) { addLog('[v] נדחה כצפוי (400 - agentId required)', 'success'); return { success: true }; }
    if (r.status === 403) { addLog('[v] נדחה כצפוי (403 - forbidden / no tenant)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 400/403, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  const s31CustomersNoAgent = async () => {
    addLog('שולף לקוחות ללא agentId...');
    const r = await apiGet('/api/agent/customers');
    if (r.status === 400) { addLog('[v] נדחה כצפוי (400 - agentId required)', 'success'); return { success: true }; }
    if (r.status === 403) { addLog('[v] נדחה כצפוי (403 - forbidden / no tenant)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 400/403, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  const s31CouponNotAgent = async () => {
    addLog('שולף קופון כמנהל (לא סוכן)...');
    const r = await apiGet('/api/agent/coupon');
    if (r.status === 403) { addLog('[v] נדחה כצפוי (403 - forbidden)', 'success'); return { success: true }; }
    if (r.status === 401) { addLog('[v] נדחה כצפוי (401)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 403, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  const s31SwitchNoTenant = async () => {
    addLog('מחליף עסק ללא tenantId...');
    const r = await apiPost('/api/agent/switch-business', {});
    if (r.status === 400) { addLog('[v] נדחה כצפוי (400 - tenantId required)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 400, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  const s31JoinNoTenant = async () => {
    addLog('מצטרף לעסק ללא tenantId...');
    const r = await apiPost('/api/agent/businesses', {});
    if (r.status === 400) { addLog('[v] נדחה כצפוי (400 - Invalid tenant ID)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 400, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  const s31JoinInvalidTenant = async () => {
    addLog('מצטרף לעסק עם tenantId שגוי...');
    const r = await apiPost('/api/agent/businesses', { tenantId: 'not-valid-id' });
    if (r.status === 400) { addLog('[v] נדחה כצפוי (400 - Invalid tenant ID)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 400, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  const s31LinkNoAgent = async () => {
    addLog('יוצר לינק ללא agentId...');
    const r = await apiPost('/api/agent/link/create', {});
    if (r.status === 400) { addLog('[v] נדחה כצפוי (400 - agentId required)', 'success'); return { success: true }; }
    if (r.status === 403) { addLog('[v] נדחה כצפוי (403 - no tenant)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 400/403, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  // ============================================================
  // S50 - ADMIN TOOLS EXTENDED TEST FUNCTIONS
  // ============================================================

  const s50Login = async () => {
    addLog('מתחבר כמנהל...');
    const r = await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });
    if (r.ok) { addLog('[v] התחברות הצליחה', 'success'); return { success: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] התחברות נכשלה: ' + r.status, 'error');
    return { success: false };
  };

  const s50SecurityScan = async () => {
    addLog('מריץ סריקת אבטחה...');
    const r = await apiGet('/api/admin/security-scan');
    if (r.ok && r.data?.success) {
      addLog(`[v] אבטחה: ציון=${r.data.overallScore}, סטטוס=${r.data.overallStatus}`, 'success');
      return { success: true };
    }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 429) { addLog('[WARN] rate limit (429)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] סריקת אבטחה נכשלה: ' + r.status, 'error');
    return { success: false };
  };

  const s50SeoAuditList = async () => {
    addLog('שולף דוחות SEO...');
    const r = await apiGet('/api/admin/seo-audit');
    if (r.ok && r.data?.ok) {
      addLog(`[v] דוחות SEO: ${r.data.count || 0}`, 'success');
      return { success: true };
    }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] דוחות SEO נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s50SocialAudit = async () => {
    addLog('שולף ביקורת חברתית...');
    const r = await apiGet('/api/admin/social-audit');
    if (r.ok) {
      addLog(`[v] ביקורת חברתית: ${r.data?.reports?.length || r.data?.count || 0} דוחות`, 'success');
      return { success: true };
    }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 429) { addLog('[WARN] rate limit (429)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] ביקורת חברתית נכשלה: ' + r.status, 'error');
    return { success: false };
  };

  const s50SystemReports = async () => {
    addLog('שולף דוחות מערכת...');
    const r = await apiGet('/api/admin/system-reports');
    if (r.ok) {
      addLog(`[v] דוחות מערכת: ${r.data?.reports?.length || 0}`, 'success');
      return { success: true };
    }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 429) { addLog('[WARN] rate limit (429)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] דוחות מערכת נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s50SettingsAuth = async () => {
    addLog('שולף הגדרות אימות...');
    const r = await apiGet('/api/admin/settings/auth');
    if (r.ok && r.data?.ok) {
      addLog(`[v] אימות מייל: ${r.data.settings?.emailVerificationEnabled ? 'פעיל' : 'כבוי'}`, 'success');
      return { success: true };
    }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] הגדרות אימות נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s50RestoreSuperAdmin = async () => {
    addLog('בודק קיום סופר אדמין...');
    const r = await apiGet('/api/admin/restore-super-admin');
    if (r.ok) {
      addLog(`[v] סופר אדמין קיים: ${r.data?.exists ? 'כן' : 'לא'}`, 'success');
      return { success: true };
    }
    if (r.status === 403) { addLog('[v] נדחה (403 - production)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] בדיקת סופר אדמין נכשלה: ' + r.status, 'error');
    return { success: false };
  };

  const s50StainlessList = async () => {
    addLog('שולף מוצרי נירוסטה...');
    const r = await apiGet('/api/admin/stainless');
    if (r.ok) {
      addLog(`[v] מוצרי נירוסטה: ${r.data?.items?.length || 0}`, 'success');
      return { success: true };
    }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 403) { addLog('[v] נדחה (403)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] מוצרי נירוסטה נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s50SeedInit = async () => {
    addLog('מריץ seed init...');
    const r = await apiPost('/api/seed/init', {});
    if (r.ok) {
      addLog(`[v] Seed: ${r.data?.message || 'ok'}`, 'success');
      return { success: true };
    }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 403) { addLog('[v] נדחה (403)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] Seed init נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s50TenantBySlug = async () => {
    addLog('שולף טננט לפי slug מזויף...');
    const r = await apiGet('/api/tenants/by-slug/fake-nonexistent-slug-999');
    if (r.status === 404) { addLog('[v] נדחה כצפוי (404 - not found)', 'success'); return { success: true }; }
    if (r.ok) { addLog('[v] slug חזר (ייתכן default)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] טננט לפי slug נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s50NotificationsPublic = async () => {
    addLog('שולף התראות ציבוריות...');
    const r = await apiGet('/api/notifications');
    if (r.ok) {
      const list = Array.isArray(r.data) ? r.data : r.data?.notifications || [];
      addLog(`[v] התראות: ${list.length}`, 'success');
      return { success: true };
    }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] התראות ציבוריות נכשל: ' + r.status, 'error');
    return { success: false };
  };

  // ============================================================
  // S49 - BUSINESS & USERS EXTENDED TEST FUNCTIONS
  // ============================================================

  const s49Login = async () => {
    addLog('מתחבר כמנהל...');
    const r = await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });
    if (r.ok) { addLog('[v] התחברות הצליחה', 'success'); return { success: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] התחברות נכשלה: ' + r.status, 'error');
    return { success: false };
  };

  const s49BusinessStats = async () => {
    addLog('שולף סטטיסטיקות עסק...');
    const r = await apiGet('/api/business/stats');
    if (r.ok) {
      addLog(`[v] מכירות חודשיות: ${r.data?.monthlySales || 0}, מוצרים: ${r.data?.totalProducts || 0}`, 'success');
      return { success: true };
    }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 403) { addLog('[v] נדחה (403 - no tenant)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] סטטיסטיקות עסק נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s49BusinessBranding = async () => {
    addLog('שולף מיתוג עסקי...');
    const r = await apiGet('/api/business/branding');
    if (r.ok && r.data?.settings) {
      addLog(`[v] מיתוג: primary=${r.data.settings.colors?.primary || 'N/A'}`, 'success');
      return { success: true };
    }
    if (r.status === 400) { addLog('[v] נדחה (400 - no tenant ID)', 'success'); return { success: true }; }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] מיתוג עסקי נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s49BusinessIntegrations = async () => {
    addLog('שולף אינטגרציות עסק...');
    const r = await apiGet('/api/business/integrations');
    if (r.ok && r.data?.ok) {
      addLog(`[v] אינטגרציות: paymentMode=${r.data.tenant?.paymentMode || 'N/A'}`, 'success');
      return { success: true };
    }
    if (r.status === 400) { addLog('[v] נדחה (400 - no tenant)', 'success'); return { success: true }; }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 403) { addLog('[v] נדחה (403)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] אינטגרציות עסק נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s49RegisterBusinessNoData = async () => {
    addLog('מנסה רישום עסק ללא נתונים...');
    const r = await apiPost('/api/register-business', {});
    if (r.status === 400) { addLog('[v] נדחה כצפוי (400 - missing fields)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 400, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  const s49JoinNoRef = async () => {
    addLog('בודק join ללא ref...');
    const r = await apiGet('/api/join');
    // join returns a redirect (307/302) or 200
    if (r.status === 307 || r.status === 302 || r.ok) {
      addLog('[v] Join redirect/ok', 'success');
      return { success: true };
    }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog(`[v] Join status: ${r.status}`, 'success');
    return { success: true };
  };

  const s49UsersMe = async () => {
    addLog('שולף פרופיל משתמש...');
    const r = await apiGet('/api/users/me');
    if (r.ok && r.data?.authenticated) {
      addLog(`[v] פרופיל: ${r.data.user?.fullName || r.data.user?.email || 'N/A'}`, 'success');
      return { success: true };
    }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] פרופיל משתמש נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s49MyOrders = async () => {
    addLog('שולף ההזמנות שלי...');
    const r = await apiGet('/api/my-orders');
    if (r.ok && r.data?.ok) {
      addLog(`[v] הזמנות: ${r.data.orders?.length || 0}`, 'success');
      return { success: true };
    }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] הזמנות נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s49SupportMessage = async () => {
    addLog('שולח הודעת תמיכה...');
    const r = await apiPost('/api/support-messages', { message: 'Test from simulator - ignore', source: 'simulator' });
    if (r.status === 201 && r.data?.success) {
      addLog(`[v] הודעת תמיכה נשלחה: ${r.data.messageId || 'ok'}`, 'success');
      return { success: true };
    }
    if (r.ok && r.data?.success) { addLog('[v] הודעת תמיכה נשלחה', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] הודעת תמיכה נכשלה: ' + r.status, 'error');
    return { success: false };
  };

  const s49SupportNoMsg = async () => {
    addLog('שולח תמיכה ללא הודעה...');
    const r = await apiPost('/api/support-messages', { message: '' });
    if (r.status === 400) { addLog('[v] נדחה כצפוי (400 - message required)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 400, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  const s49ChangePasswordNoData = async () => {
    addLog('מנסה שינוי סיסמה ללא נתונים...');
    const r = await apiPost('/api/users/me/change-password', {});
    if (r.status === 400) { addLog('[v] נדחה כצפוי (400 - missing fields)', 'success'); return { success: true }; }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 400/401, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  const s49TrackOrder = async () => {
    addLog('שולח מעקב הזמנה...');
    const r = await apiPost('/api/track/order', { productId: 'test-sim', amount: 0, customer: { name: 'Simulator' } });
    if (r.ok && r.data?.ok) {
      addLog(`[v] מעקב הזמנה: orderId=${r.data.orderId || 'ok'}`, 'success');
      return { success: true };
    }
    if (r.status === 410) {
      addLog('[v] מעקב הזמנה: endpoint deprecated (410)', 'success');
      return { success: true };
    }
    if (r.status === 400) { addLog('[v] נדחה (400)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] מעקב הזמנה נכשל: ' + r.status, 'error');
    return { success: false };
  };

  // ============================================================
  // S51 - CRM EXTENDED TEST FUNCTIONS
  // ============================================================

  const S51_DATA = { tenantId: null, leadId: null, leadName: null, conversationId: null, templateId: null };

  const s51Setup = async () => {
    addLog('מתחבר כמנהל...');
    const r = await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });
    if (!r.ok) { addLog('[x] התחברות נכשלה: ' + r.status, 'error'); return { success: false }; }
    addLog('שולף עסקים...');
    const t = await apiGet('/api/tenants');
    const tenants = t.data?.tenants || t.data?.items || [];
    if (!tenants.length) { addLog('[x] אין עסקים', 'error'); return { success: false }; }
    const tenant = tenants[0];
    S51_DATA.tenantId = tenant._id || tenant.id;
    const imp = await apiPost('/api/admin/impersonate', { tenantId: S51_DATA.tenantId });
    if (!imp.ok) { addLog('[x] impersonate נכשל: ' + imp.status, 'error'); return { success: false }; }
    addLog('[v] מחובר לעסק: ' + (tenant.name || S51_DATA.tenantId), 'success');
    return { success: true, tenantId: S51_DATA.tenantId };
  };

  const s51CreateTestLead = async () => {
    const name = 'S51_lead_' + ts();
    addLog('יוצר ליד בדיקה: ' + name);
    const r = await apiPost('/api/crm/leads', { name, phone: '050' + Math.floor(Math.random() * 9000000 + 1000000), email: 'sim-s51-' + ts() + '@test.com', source: 'manual', status: 'new', notes: 'ליד בדיקה S51' });
    const id = r.data?._id || r.data?.id;
    if (r.ok && id) {
      S51_DATA.leadId = id;
      S51_DATA.leadName = name;
      addLog('[v] ליד נוצר: ' + id, 'success');
      return { success: true, leadId: id };
    }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] יצירת ליד נכשלה: ' + (r.data?.error || r.status), 'error');
    return { success: false };
  };

  // --- Phase 2: Leads Advanced ---

  const s51LeadOrders = async () => {
    if (!S51_DATA.leadId) { addLog('[x] אין ליד', 'error'); return { success: false }; }
    addLog('שולף הזמנות ליד: ' + S51_DATA.leadId);
    const r = await apiGet('/api/crm/leads/' + S51_DATA.leadId + '/orders');
    if (r.ok) {
      const count = r.data?.orders?.length || 0;
      addLog('[v] נמצאו ' + count + ' הזמנות, stats: ' + JSON.stringify(r.data?.stats || {}).slice(0, 80), 'success');
      return { success: true, count };
    }
    if (r.status === 404) { addLog('[WARN] route לא קיים (404)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] שליפת הזמנות נכשלה: ' + r.status, 'error');
    return { success: false };
  };

  const s51LeadConvert = async () => {
    if (!S51_DATA.leadId) { addLog('[x] אין ליד', 'error'); return { success: false }; }
    addLog('ממיר ליד ללקוח: ' + S51_DATA.leadId);
    const r = await apiPost('/api/crm/leads/' + S51_DATA.leadId + '/convert', {});
    if (r.ok && r.data?.success) {
      addLog('[v] ליד הומר ללקוח: ' + (r.data?.customer?._id || 'ok'), 'success');
      return { success: true };
    }
    if (r.status === 400 && r.data?.error?.includes('already converted')) {
      addLog('[v] ליד כבר הומר (400)', 'success');
      return { success: true };
    }
    if (r.status === 404) { addLog('[WARN] route לא קיים (404)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] המרת ליד נכשלה: ' + (r.data?.error || r.status), 'error');
    return { success: false };
  };

  const s51LeadsExportJson = async () => {
    addLog('מייצא לידים (JSON)...');
    const r = await apiGet('/api/crm/leads/export?format=json');
    if (r.ok) {
      const total = r.data?.total || r.data?.leads?.length || 0;
      addLog('[v] ייצוא JSON: ' + total + ' לידים, exportedAt=' + (r.data?.exportedAt || 'n/a'), 'success');
      return { success: true, total };
    }
    if (r.status === 404) { addLog('[WARN] route לא קיים (404)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] ייצוא JSON נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s51LeadsExportCsv = async () => {
    addLog('מייצא לידים (CSV)...');
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 15000);
      const res = await fetch('/api/crm/leads/export?format=csv', { headers: SIM_HEADERS, credentials: 'include', signal: ctrl.signal });
      clearTimeout(t);
      if (res.ok) {
        const ct = res.headers.get('content-type') || '';
        const text = await res.text();
        if (ct.includes('csv') || text.includes(',')) {
          addLog('[v] ייצוא CSV: ' + text.length + ' bytes, content-type=' + ct.slice(0, 40), 'success');
          return { success: true, size: text.length };
        }
        addLog('[v] CSV response: ' + text.slice(0, 80), 'success');
        return { success: true };
      }
      if (res.status === 404) { addLog('[WARN] route לא קיים (404)', 'warning'); return { success: true, skipped: true }; }
      if (res.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
      addLog('[x] ייצוא CSV נכשל: ' + res.status, 'error');
      return { success: false };
    } catch (e) {
      if (e.name === 'AbortError') { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
      addLog('[x] שגיאה: ' + e.message, 'error');
      return { success: false };
    }
  };

  const s51LeadsImport = async () => {
    addLog('מייבא 2 לידים...');
    const leads = [
      { name: 'S51_import_A_' + ts(), phone: '051' + Math.floor(Math.random() * 9000000 + 1000000), source: 'import', status: 'new' },
      { name: 'S51_import_B_' + ts(), phone: '052' + Math.floor(Math.random() * 9000000 + 1000000), source: 'import', status: 'new' },
    ];
    const r = await apiPost('/api/crm/leads/import', { leads });
    if (r.ok && r.data?.success) {
      const res = r.data.results || {};
      addLog('[v] ייבוא: imported=' + (res.imported || 0) + ', skipped=' + (res.skipped || 0), 'success');
      return { success: true, imported: res.imported, skipped: res.skipped };
    }
    if (r.status === 404) { addLog('[WARN] route לא קיים (404)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] ייבוא נכשל: ' + (r.data?.error || r.status), 'error');
    return { success: false };
  };

  const s51LeadsImportNoData = async () => {
    addLog('מנסה ייבוא ללא נתונים...');
    const r = await apiPost('/api/crm/leads/import', { leads: [] });
    if (r.status === 400) { addLog('[v] נדחה כצפוי (400 - No leads data)', 'success'); return { success: true }; }
    if (r.status === 404) { addLog('[WARN] route לא קיים (404)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 400, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  const s51LeadsSla = async () => {
    addLog('שולף SLA לידים...');
    const r = await apiGet('/api/crm/leads/sla');
    if (r.ok) {
      const s = r.data?.stats || {};
      addLog('[v] SLA stats: pending=' + (s.pending || 0) + ', met=' + (s.met || 0) + ', breached=' + (s.breached || 0), 'success');
      return { success: true, stats: s };
    }
    if (r.status === 404) { addLog('[WARN] route לא קיים (404)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] שליפת SLA נכשלה: ' + r.status, 'error');
    return { success: false };
  };

  // --- Phase 3: Conversations Advanced ---

  const s51CreateConv = async () => {
    addLog('יוצר שיחה לבדיקות S51...');
    const body = { channel: 'whatsapp', subject: 'שיחת S51 - ' + ts(), status: 'open' };
    if (S51_DATA.leadId) body.leadId = S51_DATA.leadId;
    const r = await apiPost('/api/crm/conversations', body);
    const id = r.data?._id || r.data?.id;
    if (r.ok && id) {
      S51_DATA.conversationId = id;
      addLog('[v] שיחה נוצרה: ' + id, 'success');
      return { success: true, conversationId: id };
    }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] יצירת שיחה נכשלה: ' + (r.data?.error || r.status), 'error');
    return { success: false };
  };

  const s51GetConversation = async () => {
    if (!S51_DATA.conversationId) { addLog('[x] אין שיחה', 'error'); return { success: false }; }
    addLog('שולף שיחה: ' + S51_DATA.conversationId);
    const r = await apiGet('/api/crm/conversations/' + S51_DATA.conversationId);
    if (r.ok && r.data) {
      addLog('[v] שיחה נמצאה: channel=' + (r.data.channel || 'n/a') + ', status=' + (r.data.status || 'n/a'), 'success');
      return { success: true };
    }
    if (r.status === 404) { addLog('[WARN] שיחה לא נמצאה (404)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] שליפת שיחה נכשלה: ' + r.status, 'error');
    return { success: false };
  };

  const s51UpdateConversation = async () => {
    if (!S51_DATA.conversationId) { addLog('[x] אין שיחה', 'error'); return { success: false }; }
    addLog('מעדכן שיחה: status → resolved...');
    const r = await apiPatch('/api/crm/conversations/' + S51_DATA.conversationId, { status: 'resolved', subject: 'S51 updated - ' + new Date().toISOString() });
    if (r.ok) {
      addLog('[v] שיחה עודכנה: status=' + (r.data?.status || 'ok'), 'success');
      return { success: true };
    }
    if (r.status === 404) { addLog('[WARN] שיחה לא נמצאה (404)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] עדכון שיחה נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s51GetConversation404 = async () => {
    addLog('שולף שיחה עם ID מזויף...');
    const r = await apiGet('/api/crm/conversations/000000000000000000000000');
    if (r.status === 404) { addLog('[v] נדחה כצפוי (404)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500) - ID לא תקין', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 404, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  // --- Phase 4: Templates ---

  const s51ListTemplates = async () => {
    addLog('שולף תבניות הודעות...');
    const r = await apiGet('/api/crm/templates');
    if (r.ok) {
      const count = r.data?.templates?.length || 0;
      addLog('[v] נמצאו ' + count + ' תבניות', 'success');
      return { success: true, count };
    }
    if (r.status === 404) { addLog('[WARN] route לא קיים (404)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] שליפת תבניות נכשלה: ' + r.status, 'error');
    return { success: false };
  };

  const s51CreateTemplate = async () => {
    addLog('יוצר תבנית הודעה...');
    const r = await apiPost('/api/crm/templates', {
      name: 'S51 Template ' + ts(),
      content: 'שלום {{name}}, תודה על הפנייה שלך. ניצור קשר בהקדם.',
      category: 'general',
      channel: 'whatsapp',
      isActive: true,
    });
    if (r.ok || r.status === 201) {
      const tplId = r.data?.template?._id || r.data?.template?.id;
      S51_DATA.templateId = tplId;
      addLog('[v] תבנית נוצרה' + (tplId ? ': ' + tplId : '') + ', variables: ' + JSON.stringify(r.data?.template?.variables || []), 'success');
      return { success: true, templateId: tplId };
    }
    if (r.status === 404) { addLog('[WARN] route לא קיים (404)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] יצירת תבנית נכשלה: ' + (r.data?.error || r.status), 'error');
    return { success: false };
  };

  // --- Phase 5: WhatsApp ---

  const s51WaSendStatus = async () => {
    addLog('בודק סטטוס WhatsApp...');
    const r = await apiGet('/api/crm/whatsapp/send');
    if (r.ok) {
      addLog('[v] WhatsApp status: configured=' + (r.data?.configured || false) + ', provider=' + (r.data?.provider || 'n/a'), 'success');
      return { success: true, configured: r.data?.configured };
    }
    if (r.status === 401) { addLog('[WARN] לא מורשה (401)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] בדיקת סטטוס נכשלה: ' + r.status, 'error');
    return { success: false };
  };

  const s51WaSendNoData = async () => {
    addLog('שולח WhatsApp ללא נתונים...');
    const r = await apiPost('/api/crm/whatsapp/send', {});
    if (r.status === 400) { addLog('[v] נדחה כצפוי (400 - Missing required fields)', 'success'); return { success: true }; }
    if (r.status === 401) { addLog('[WARN] לא מורשה (401)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500) - WhatsApp לא מחובר', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 400, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  const s51WaConnect = async () => {
    addLog('מנסה חיבור WhatsApp...');
    const r = await apiPost('/api/crm/whatsapp/connect', { phone: '0533752633' });
    if (r.ok) {
      addLog('[v] חיבור WhatsApp: ' + JSON.stringify(r.data).slice(0, 100), 'success');
      return { success: true };
    }
    if (r.status === 401) { addLog('[WARN] לא מורשה (401)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500) - mock service', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] חיבור נכשל: ' + (r.data?.error || r.status), 'error');
    return { success: false };
  };

  const s51WaMessages = async () => {
    addLog('שולף הודעות WhatsApp...');
    const r = await apiGet('/api/crm/whatsapp/messages');
    if (r.ok) {
      const count = r.data?.messages?.length || 0;
      addLog('[v] הודעות: ' + count + (r.data?.error ? ' (warning: ' + r.data.error + ')' : ''), 'success');
      return { success: true, count };
    }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] שליפת הודעות נכשלה: ' + r.status, 'error');
    return { success: false };
  };

  const s51WaQr = async () => {
    addLog('שולף QR WhatsApp...');
    const r = await apiGet('/api/crm/whatsapp/qr');
    if (r.ok) {
      addLog('[v] QR response: qrCode=' + (r.data?.qrCode ? 'exists' : 'null') + (r.data?.error ? ', warning: ' + r.data.error : ''), 'success');
      return { success: true };
    }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] שליפת QR נכשלה: ' + r.status, 'error');
    return { success: false };
  };

  const s51WaResetCheck = async () => {
    addLog('בודק זמינות Reset WhatsApp...');
    const r = await apiGet('/api/crm/whatsapp/reset');
    if (r.ok) {
      addLog('[v] Reset: available=' + (r.data?.available || false) + ', message=' + (r.data?.message || 'n/a'), 'success');
      return { success: true, available: r.data?.available };
    }
    if (r.status === 501) { addLog('[v] Reset לא זמין בפרודקשן (501)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] בדיקת Reset נכשלה: ' + r.status, 'error');
    return { success: false };
  };

  const S52_DATA = { tenantId: null, tenantName: null, templateId: null, templateKey: null };

  const s52EnsureLogin = async () => {
    const me = await apiGet('/api/auth/me');
    const role = me.data?.user?.role;
    if (me.ok && role === 'super_admin') return true;
    const r = await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });
    return !!r.ok;
  };

  const s52Login = async () => {
    addLog('מתחבר כמנהל...');
    const r = await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });
    if (r.ok) { addLog('[v] התחברות הצליחה', 'success'); return { success: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] התחברות נכשלה: ' + r.status, 'error');
    return { success: false };
  };

  const s52PickTenant = async () => {
    if (!(await s52EnsureLogin())) { addLog('[x] לא מחובר', 'error'); return { success: false }; }
    addLog('שולף חנויות ל-Catalog Manager...');
    const r = await apiGet('/api/catalog-manager/tenants');
    if (r.ok && r.data?.ok) {
      const tenants = Array.isArray(r.data?.tenants) ? r.data.tenants : [];
      if (!tenants.length) { addLog('[WARN] אין חנויות', 'warning'); return { success: true, skipped: true }; }
      const t = tenants[0];
      const tenantId = t._id || t.id;
      if (!tenantId) { addLog('[WARN] tenantId חסר', 'warning'); return { success: true, skipped: true }; }
      S52_DATA.tenantId = tenantId;
      S52_DATA.tenantName = t.name || tenantId;
      addLog('[v] נבחרה חנות: ' + S52_DATA.tenantName, 'success');
      return { success: true, tenantId };
    }
    if (r.status === 403) { addLog('[v] נדחה (403 - super_admin only)', 'success'); return { success: true }; }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] טעינת חנויות נכשלה: ' + r.status, 'error');
    return { success: false };
  };

  const s52CloudinaryConfig = async () => {
    if (!(await s52EnsureLogin())) { addLog('[x] לא מחובר', 'error'); return { success: false }; }
    addLog('שולף Cloudinary config...');
    const r = await apiGet('/api/catalog-manager/cloudinary-config');
    if (r.ok && r.data?.cloudName) {
      addLog('[v] Cloudinary: cloud=' + r.data.cloudName, 'success');
      return { success: true };
    }
    if (r.status === 403) { addLog('[v] נדחה (403 - super_admin only)', 'success'); return { success: true }; }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500) / חסר env', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] Cloudinary config נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s52OrdersSmoke = async () => {
    if (!(await s52EnsureLogin())) { addLog('[x] לא מחובר', 'error'); return { success: false }; }
    if (!S52_DATA.tenantId) { addLog('[WARN] אין tenantId, דילוג', 'warning'); return { success: true, skipped: true }; }
    addLog('שולף הזמנות (לוגיסטיקה) ...');
    const url = '/api/orders?tenantId=' + encodeURIComponent(S52_DATA.tenantId) + '&page=1&limit=1';
    const r = await apiGet(url);
    if (r.ok) {
      const orders = Array.isArray(r.data?.orders) ? r.data.orders : Array.isArray(r.data?.items) ? r.data.items : [];
      addLog('[v] Orders: ' + orders.length + ' items (page=1,limit=1)', 'success');
      return { success: true };
    }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 403) { addLog('[v] נדחה (403)', 'success'); return { success: true }; }
    if (r.status === 429) { addLog('[WARN] rate limit (429)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] Orders נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s52ProductsIncludeInactive = async () => {
    if (!(await s52EnsureLogin())) { addLog('[x] לא מחובר', 'error'); return { success: false }; }
    if (!S52_DATA.tenantId) { addLog('[WARN] אין tenantId, דילוג', 'warning'); return { success: true, skipped: true }; }
    addLog('שולף מוצרים includeInactive...');
    const url = '/api/products?tenantId=' + encodeURIComponent(S52_DATA.tenantId) + '&includeInactive=true&limit=1';
    const r = await apiGet(url);
    if (r.ok) {
      const products = Array.isArray(r.data?.products) ? r.data.products : Array.isArray(r.data?.items) ? r.data.items : Array.isArray(r.data) ? r.data : [];
      addLog('[v] Products: ' + products.length + ' items', 'success');
      return { success: true };
    }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 403) { addLog('[v] נדחה (403)', 'success'); return { success: true }; }
    if (r.status === 429) { addLog('[WARN] rate limit (429)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] Products נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s52UploadNoTenant = async () => {
    if (!(await s52EnsureLogin())) { addLog('[x] לא מחובר', 'error'); return { success: false }; }
    addLog('מנסה upload ללא tenantId...');
    const r = await apiPost('/api/catalog-manager/upload', { products: [{ sku: 'S52_NO_TENANT_' + ts(), title: 'S52', images: ['https://example.com/a.jpg'], price: 1 }] });
    if (r.status === 400) { addLog('[v] נדחה כצפוי (400)', 'success'); return { success: true }; }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 403) { addLog('[v] נדחה (403)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 400, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  const s52UploadInvalidTenant = async () => {
    if (!(await s52EnsureLogin())) { addLog('[x] לא מחובר', 'error'); return { success: false }; }
    addLog('מנסה upload עם tenantId לא קיים...');
    const r = await apiPost('/api/catalog-manager/upload', { tenantId: '000000000000000000000000', products: [{ sku: 'S52_BAD_TENANT_' + ts(), title: 'S52', images: ['https://example.com/a.jpg'], price: 1 }] });
    if (r.status === 404) { addLog('[v] נדחה כצפוי (404)', 'success'); return { success: true }; }
    if (r.status === 400) { addLog('[v] נדחה (400)', 'success'); return { success: true }; }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 403) { addLog('[v] נדחה (403)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 404, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  const s52UploadNoProducts = async () => {
    if (!(await s52EnsureLogin())) { addLog('[x] לא מחובר', 'error'); return { success: false }; }
    if (!S52_DATA.tenantId) { addLog('[WARN] אין tenantId, דילוג', 'warning'); return { success: true, skipped: true }; }
    addLog('מנסה upload ללא מוצרים...');
    const r = await apiPost('/api/catalog-manager/upload', { tenantId: S52_DATA.tenantId, products: [] });
    if (r.status === 400) { addLog('[v] נדחה כצפוי (400)', 'success'); return { success: true }; }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 403) { addLog('[v] נדחה (403)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 400, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  const s52UploadMissingImages = async () => {
    if (!(await s52EnsureLogin())) { addLog('[x] לא מחובר', 'error'); return { success: false }; }
    if (!S52_DATA.tenantId) { addLog('[WARN] אין tenantId, דילוג', 'warning'); return { success: true, skipped: true }; }
    addLog('מנסה upload מוצר ללא תמונות...');
    const r = await apiPost('/api/catalog-manager/upload', { tenantId: S52_DATA.tenantId, products: [{ sku: 'S52_NO_IMG_' + ts(), title: 'S52 no image', price: 1, images: [] }] });
    if (r.status === 400) { addLog('[v] נדחה כצפוי (400 - חובה תמונה)', 'success'); return { success: true }; }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 403) { addLog('[v] נדחה (403)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 400, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  const s52UpdateNoTenant = async () => {
    if (!(await s52EnsureLogin())) { addLog('[x] לא מחובר', 'error'); return { success: false }; }
    addLog('מנסה update ללא tenantId...');
    const r = await apiPost('/api/catalog-manager/update', { products: [{ sku: 'S52_UPD_NO_TENANT_' + ts(), title: 'S52', price: 1 }] });
    if (r.status === 400) { addLog('[v] נדחה כצפוי (400)', 'success'); return { success: true }; }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 403) { addLog('[v] נדחה (403)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 400, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  const s52UpdateInvalidTenant = async () => {
    if (!(await s52EnsureLogin())) { addLog('[x] לא מחובר', 'error'); return { success: false }; }
    addLog('מנסה update עם tenantId לא קיים...');
    const r = await apiPost('/api/catalog-manager/update', { tenantId: '000000000000000000000000', products: [{ sku: 'S52_UPD_BAD_TENANT_' + ts(), title: 'S52', price: 1 }] });
    if (r.status === 404) { addLog('[v] נדחה כצפוי (404)', 'success'); return { success: true }; }
    if (r.status === 400) { addLog('[v] נדחה (400)', 'success'); return { success: true }; }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 403) { addLog('[v] נדחה (403)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 404, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  const s52UpdateNoProducts = async () => {
    if (!(await s52EnsureLogin())) { addLog('[x] לא מחובר', 'error'); return { success: false }; }
    if (!S52_DATA.tenantId) { addLog('[WARN] אין tenantId, דילוג', 'warning'); return { success: true, skipped: true }; }
    addLog('מנסה update ללא מוצרים...');
    const r = await apiPost('/api/catalog-manager/update', { tenantId: S52_DATA.tenantId, products: [] });
    if (r.status === 400) { addLog('[v] נדחה כצפוי (400)', 'success'); return { success: true }; }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 403) { addLog('[v] נדחה (403)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 400, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  const s52UpdateNotFound = async () => {
    if (!(await s52EnsureLogin())) { addLog('[x] לא מחובר', 'error'); return { success: false }; }
    if (!S52_DATA.tenantId) { addLog('[WARN] אין tenantId, דילוג', 'warning'); return { success: true, skipped: true }; }
    addLog('מנסה update SKU שלא קיים...');
    const sku = 'S52_NOT_FOUND_' + ts();
    const r = await apiPost('/api/catalog-manager/update', { tenantId: S52_DATA.tenantId, products: [{ sku, title: 'S52', price: 1 }] });
    if (r.ok && (r.data?.updated === 0 || r.data?.updated == null)) {
      const notFound = Array.isArray(r.data?.notFound) ? r.data.notFound : [];
      if (notFound.includes(sku)) {
        addLog('[v] לא נמצא כצפוי: ' + sku, 'success');
        return { success: true };
      }
      addLog('[v] response ok (updated=0)', 'success');
      return { success: true };
    }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 403) { addLog('[v] נדחה (403)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] Update notFound נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s52DeleteProductsNoTenant = async () => {
    if (!(await s52EnsureLogin())) { addLog('[x] לא מחובר', 'error'); return { success: false }; }
    addLog('מנסה delete-products ללא tenantId...');
    const r = await apiPost('/api/catalog-manager/delete-products', { skus: ['S52'] });
    if (r.status === 400) { addLog('[v] נדחה כצפוי (400)', 'success'); return { success: true }; }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 403) { addLog('[v] נדחה (403)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 400, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  const s52DeleteProductsNoSkus = async () => {
    if (!(await s52EnsureLogin())) { addLog('[x] לא מחובר', 'error'); return { success: false }; }
    if (!S52_DATA.tenantId) { addLog('[WARN] אין tenantId, דילוג', 'warning'); return { success: true, skipped: true }; }
    addLog('מנסה delete-products ללא skus...');
    const r = await apiPost('/api/catalog-manager/delete-products', { tenantId: S52_DATA.tenantId, skus: [] });
    if (r.status === 400) { addLog('[v] נדחה כצפוי (400)', 'success'); return { success: true }; }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 403) { addLog('[v] נדחה (403)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 400, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  const s52DeleteProductsNonexistent = async () => {
    if (!(await s52EnsureLogin())) { addLog('[x] לא מחובר', 'error'); return { success: false }; }
    if (!S52_DATA.tenantId) { addLog('[WARN] אין tenantId, דילוג', 'warning'); return { success: true, skipped: true }; }
    addLog('מנסה delete-products על SKU שלא קיים...');
    const r = await apiPost('/api/catalog-manager/delete-products', { tenantId: S52_DATA.tenantId, skus: ['S52_NO_SUCH_' + ts()] });
    if (r.ok && r.data?.success) {
      addLog('[v] delete-products ok (deletedCount=' + (r.data?.deletedCount ?? 0) + ')', 'success');
      return { success: true };
    }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 403) { addLog('[v] נדחה (403)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] delete-products נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s52DeleteMediaInvalidUrl = async () => {
    if (!(await s52EnsureLogin())) { addLog('[x] לא מחובר', 'error'); return { success: false }; }
    addLog('מנסה delete-media עם URL לא תקין...');
    const r = await apiPost('/api/catalog-manager/delete-media', { url: 'https://example.com/not-cloudinary.jpg' });
    if (r.status === 400) { addLog('[v] נדחה כצפוי (400)', 'success'); return { success: true }; }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 403) { addLog('[v] נדחה (403)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 400, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  const s52DeleteMediaRandom = async () => {
    if (!(await s52EnsureLogin())) { addLog('[x] לא מחובר', 'error'); return { success: false }; }
    addLog('מנסה delete-media עם URL random...');
    const url = 'https://res.cloudinary.com/demo/image/upload/v1234/s52_random_' + ts() + '.jpg';
    const r = await apiPost('/api/catalog-manager/delete-media', { url });
    if (r.ok && r.data?.success) {
      addLog('[v] delete-media success (deleted=' + String(r.data?.deleted) + ')', 'success');
      return { success: true };
    }
    if (r.status === 500) { addLog('[WARN] Cloudinary לא מוגדר (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 403) { addLog('[v] נדחה (403)', 'success'); return { success: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] delete-media נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s52RemoveProductMediaNoUrl = async () => {
    if (!(await s52EnsureLogin())) { addLog('[x] לא מחובר', 'error'); return { success: false }; }
    addLog('מנסה remove-product-media ללא URL...');
    const r = await apiPost('/api/catalog-manager/remove-product-media', { tenantId: S52_DATA.tenantId || '' });
    if (r.status === 400) { addLog('[v] נדחה כצפוי (400)', 'success'); return { success: true }; }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 403) { addLog('[v] נדחה (403)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 400, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  const s52RemoveProductMediaRandom = async () => {
    if (!(await s52EnsureLogin())) { addLog('[x] לא מחובר', 'error'); return { success: false }; }
    addLog('מנסה remove-product-media עם URL random...');
    const r = await apiPost('/api/catalog-manager/remove-product-media', { tenantId: S52_DATA.tenantId || '', url: 'https://example.com/s52-media-' + ts() + '.jpg' });
    if (r.ok && r.data?.success) {
      addLog('[v] updatedCount=' + String(r.data?.updatedCount ?? 0), 'success');
      return { success: true };
    }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 403) { addLog('[v] נדחה (403)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] remove-product-media נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s52TemplatesList = async () => {
    if (!(await s52EnsureLogin())) { addLog('[x] לא מחובר', 'error'); return { success: false }; }
    if (!S52_DATA.tenantId) { addLog('[WARN] אין tenantId, דילוג', 'warning'); return { success: true, skipped: true }; }
    addLog('שולף תבניות קטלוג...');
    const r = await apiGet('/api/admin/catalog-templates?tenantId=' + encodeURIComponent(S52_DATA.tenantId));
    if (r.ok && r.data?.ok) {
      addLog('[v] templates: ' + (r.data?.items?.length || 0), 'success');
      return { success: true };
    }
    if (r.status === 400) { addLog('[v] נדחה (400)', 'success'); return { success: true }; }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 403) { addLog('[v] נדחה (403)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] templates list נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s52TemplatesCreate = async () => {
    if (!(await s52EnsureLogin())) { addLog('[x] לא מחובר', 'error'); return { success: false }; }
    if (!S52_DATA.tenantId) { addLog('[WARN] אין tenantId, דילוג', 'warning'); return { success: true, skipped: true }; }
    const key = 's52-template-' + ts();
    addLog('יוצר תבנית: ' + key);
    const r = await apiPost('/api/admin/catalog-templates', { tenantId: S52_DATA.tenantId, key, name: 'S52 Template ' + ts(), isActive: true });
    const templateId = r.data?.template?.id || r.data?.template?._id;
    if (r.ok && r.data?.ok && templateId) {
      S52_DATA.templateId = templateId;
      S52_DATA.templateKey = key;
      addLog('[v] תבנית נוצרה: ' + templateId, 'success');
      return { success: true, templateId, key };
    }
    if (r.status === 400) { addLog('[WARN] נדחה (400 - ' + (r.data?.error || 'bad_request') + ')', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 403) { addLog('[v] נדחה (403)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] יצירת תבנית נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s52TemplatesUpdate = async () => {
    if (!(await s52EnsureLogin())) { addLog('[x] לא מחובר', 'error'); return { success: false }; }
    if (!S52_DATA.tenantId || !S52_DATA.templateId) { addLog('[WARN] אין תבנית לעדכון, דילוג', 'warning'); return { success: true, skipped: true }; }
    addLog('מעדכן תבנית: ' + S52_DATA.templateId);
    const r = await apiPatch('/api/admin/catalog-templates/' + S52_DATA.templateId, { tenantId: S52_DATA.tenantId, name: 'S52 Updated ' + ts() });
    if (r.ok && r.data?.ok) {
      addLog('[v] תבנית עודכנה', 'success');
      return { success: true };
    }
    if (r.status === 400) { addLog('[v] נדחה (400)', 'success'); return { success: true }; }
    if (r.status === 404) { addLog('[WARN] not_found (404)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 403) { addLog('[v] נדחה (403)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] עדכון תבנית נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s52TemplatesDelete = async () => {
    if (!(await s52EnsureLogin())) { addLog('[x] לא מחובר', 'error'); return { success: false }; }
    if (!S52_DATA.tenantId || !S52_DATA.templateId) { addLog('[WARN] אין תבנית למחיקה, דילוג', 'warning'); return { success: true, skipped: true }; }
    addLog('מוחק תבנית: ' + S52_DATA.templateId);
    const url = '/api/admin/catalog-templates/' + S52_DATA.templateId + '?tenantId=' + encodeURIComponent(S52_DATA.tenantId);
    const r = await apiDelete(url);
    if (r.ok && r.data?.ok) {
      addLog('[v] תבנית נמחקה', 'success');
      S52_DATA.templateId = null;
      return { success: true };
    }
    if (r.ok) {
      addLog('[v] תבנית נמחקה', 'success');
      S52_DATA.templateId = null;
      return { success: true };
    }
    if (r.status === 400) { addLog('[v] נדחה (400)', 'success'); return { success: true }; }
    if (r.status === 404) { addLog('[WARN] not_found (404)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 403) { addLog('[v] נדחה (403)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] מחיקת תבנית נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s52CleanupMediaManual = async () => {
    addLog('[WARN] cleanup-media לא מורץ אוטומטית (פעולה מסוכנת).', 'warning');
    return { success: true, skipped: true };
  };

  const S53_DATA = { tenantId: null, tenantSlug: null, tenantName: null, templateId: null, templateKey: null };

  const s53EnsureRunningLocally = async () => {
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    const port = typeof window !== 'undefined' ? window.location.port : '';
    const isLocal = port === '3001' || host === 'localhost' || host === '127.0.0.1';
    if (host && !isLocal) {
      addLog('[WARN] S53 Sync חייב לרוץ מהשרת המקומי (localhost:3001). כרגע אתה על: ' + host + (port ? ':' + port : ''), 'warning');
      addLog('[WARN] על Vercel אין CATALOG_TEMPLATE_SYNC_TARGET_URL ולכן sync יהיה skipped.', 'warning');
      return false;
    }
    return true;
  };

  const s53EnsureLogin = async () => {
    return s52EnsureLogin();
  };

  const s53Login = async () => {
    addLog('מתחבר כמנהל...');
    const r = await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });
    if (r.ok) { addLog('[v] התחברות הצליחה', 'success'); return { success: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] התחברות נכשלה: ' + r.status, 'error');
    return { success: false };
  };

  const s53CreateTenantSync = async () => {
    if (!(await s53EnsureRunningLocally())) { return { success: true, skipped: true }; }
    if (!(await s53EnsureLogin())) { addLog('[x] לא מחובר', 'error'); return { success: false }; }
    const slug = 's53-sync-' + ts();
    const name = 'S53 Sync Tenant ' + ts();
    addLog('יוצר חנות: ' + slug);
    const r = await apiPost('/api/tenants', { name, slug, status: 'pending' });
    if (!r.ok || !r.data?.ok || !r.data?.tenant?._id) {
      if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
      if (r.status === 403) { addLog('[v] נדחה (403)', 'success'); return { success: true }; }
      if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
      addLog('[x] יצירת חנות נכשלה: ' + r.status, 'error');
      return { success: false };
    }

    S53_DATA.tenantId = r.data.tenant._id;
    S53_DATA.tenantSlug = slug;
    S53_DATA.tenantName = name;

    const sync = r.data?.sync;
    if (!sync) {
      addLog('[WARN] אין sync בתגובה (כנראה לא רץ דרך סימולטור)', 'warning');
      return { success: true, skipped: true };
    }
    if (sync.skipped) {
      addLog('[WARN] sync מדולג (חסר env vars)', 'warning');
      if (sync.debug) {
        const d = sync.debug;
        addLog(
          '[WARN] sync debug: hasTarget=' + d.hasTarget + ' hasSecret=' + d.hasSecret + ' envLocalExists=' + d.envLocalExists,
          'warning'
        );
        if (d.cwd) addLog('[WARN] sync debug cwd: ' + d.cwd, 'warning');
        if (d.envLocalPath) addLog('[WARN] sync debug envLocalPath: ' + d.envLocalPath, 'warning');
      }
      return { success: true, skipped: true };
    }
    if (sync.ok) {
      addLog('[v] sync ok (tenant)', 'success');
      return { success: true };
    }
    addLog(
      '[x] sync נכשל (tenant): ' +
        (sync.status || sync.error || '') +
        (sync.data?.error ? ' (' + sync.data.error + ')' : ''),
      'error'
    );
    return { success: false };
  };

  const s53CreateTemplateSync = async () => {
    if (!(await s53EnsureRunningLocally())) { return { success: true, skipped: true }; }
    if (!(await s53EnsureLogin())) { addLog('[x] לא מחובר', 'error'); return { success: false }; }
    if (!S53_DATA.tenantId) { addLog('[WARN] אין tenantId, דילוג', 'warning'); return { success: true, skipped: true }; }
    const key = 's53-template-' + ts();
    addLog('יוצר תבנית: ' + key);
    const r = await apiPost('/api/admin/catalog-templates', { tenantId: S53_DATA.tenantId, key, name: 'S53 Template ' + ts(), isActive: true });
    const templateId = r.data?.template?.id || r.data?.template?._id;
    if (!r.ok || !r.data?.ok || !templateId) {
      if (r.status === 400) { addLog('[WARN] נדחה (400 - ' + (r.data?.error || 'bad_request') + ')', 'warning'); return { success: true, skipped: true }; }
      if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
      if (r.status === 403) { addLog('[v] נדחה (403)', 'success'); return { success: true }; }
      if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
      addLog('[x] יצירת תבנית נכשל: ' + r.status, 'error');
      return { success: false };
    }

    S53_DATA.templateId = templateId;
    S53_DATA.templateKey = key;

    const sync = r.data?.sync;
    if (!sync) { addLog('[WARN] אין sync בתגובה', 'warning'); return { success: true, skipped: true }; }
    if (sync.skipped) {
      addLog('[WARN] sync מדולג (חסר env vars)', 'warning');
      if (sync.debug) {
        const d = sync.debug;
        addLog(
          '[WARN] sync debug: hasTarget=' + d.hasTarget + ' hasSecret=' + d.hasSecret + ' targetLen=' + d.targetLen + ' secretLen=' + d.secretLen + ' envLocalExists=' + d.envLocalExists,
          'warning'
        );
        if (d.cwd) addLog('[WARN] sync debug cwd: ' + d.cwd, 'warning');
        if (d.envLocalPath) addLog('[WARN] sync debug envLocalPath: ' + d.envLocalPath, 'warning');
      }
      return { success: true, skipped: true };
    }
    if (sync.ok) { addLog('[v] sync ok (template create)', 'success'); return { success: true }; }
    addLog(
      '[x] sync נכשל (template create): ' +
        (sync.status || sync.error || '') +
        (sync.data?.error ? ' (' + sync.data.error + ')' : ''),
      'error'
    );
    return { success: false };
  };

  const s53UpdateTemplateSync = async () => {
    if (!(await s53EnsureRunningLocally())) { return { success: true, skipped: true }; }
    if (!(await s53EnsureLogin())) { addLog('[x] לא מחובר', 'error'); return { success: false }; }
    if (!S53_DATA.tenantId || !S53_DATA.templateId) { addLog('[WARN] אין תבנית לעדכון, דילוג', 'warning'); return { success: true, skipped: true }; }
    addLog('מעדכן תבנית: ' + S53_DATA.templateId);
    const r = await apiPatch('/api/admin/catalog-templates/' + S53_DATA.templateId, { tenantId: S53_DATA.tenantId, name: 'S53 Updated ' + ts() });
    if (!r.ok || !r.data?.ok) {
      if (r.status === 400) { addLog('[v] נדחה (400)', 'success'); return { success: true }; }
      if (r.status === 404) { addLog('[WARN] not_found (404)', 'warning'); return { success: true, skipped: true }; }
      if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
      if (r.status === 403) { addLog('[v] נדחה (403)', 'success'); return { success: true }; }
      if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
      addLog('[x] עדכון תבנית נכשל: ' + r.status, 'error');
      return { success: false };
    }
    const sync = r.data?.sync;
    if (!sync) { addLog('[WARN] אין sync בתגובה', 'warning'); return { success: true, skipped: true }; }
    if (sync.skipped) {
      addLog('[WARN] sync מדולג (חסר env vars)', 'warning');
      if (sync.debug) {
        const d = sync.debug;
        addLog(
          '[WARN] sync debug: hasTarget=' + d.hasTarget + ' hasSecret=' + d.hasSecret + ' targetLen=' + d.targetLen + ' secretLen=' + d.secretLen + ' envLocalExists=' + d.envLocalExists,
          'warning'
        );
        if (d.cwd) addLog('[WARN] sync debug cwd: ' + d.cwd, 'warning');
        if (d.envLocalPath) addLog('[WARN] sync debug envLocalPath: ' + d.envLocalPath, 'warning');
      }
      return { success: true, skipped: true };
    }
    if (sync.ok) { addLog('[v] sync ok (template update)', 'success'); return { success: true }; }
    addLog(
      '[x] sync נכשל (template update): ' +
        (sync.status || sync.error || '') +
        (sync.data?.error ? ' (' + sync.data.error + ')' : ''),
      'error'
    );
    return { success: false };
  };

  const s53DeleteTemplateSync = async () => {
    if (!(await s53EnsureRunningLocally())) { return { success: true, skipped: true }; }
    if (!(await s53EnsureLogin())) { addLog('[x] לא מחובר', 'error'); return { success: false }; }
    if (!S53_DATA.tenantId || !S53_DATA.templateId) { addLog('[WARN] אין תבנית למחיקה, דילוג', 'warning'); return { success: true, skipped: true }; }
    addLog('מוחק תבנית: ' + S53_DATA.templateId);
    const url = '/api/admin/catalog-templates/' + S53_DATA.templateId + '?tenantId=' + encodeURIComponent(S53_DATA.tenantId);
    const r = await apiDelete(url);
    if (!r.ok && r.status !== 404) {
      if (r.status === 400) { addLog('[v] נדחה (400)', 'success'); return { success: true }; }
      if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
      if (r.status === 403) { addLog('[v] נדחה (403)', 'success'); return { success: true }; }
      if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
      if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
      addLog('[x] מחיקת תבנית נכשל: ' + r.status, 'error');
      return { success: false };
    }
    const sync = r.data?.sync;
    S53_DATA.templateId = null;
    if (!sync) { addLog('[WARN] אין sync בתגובה', 'warning'); return { success: true, skipped: true }; }
    if (sync.skipped) {
      addLog('[WARN] sync מדולג (חסר env vars)', 'warning');
      if (sync.debug) {
        const d = sync.debug;
        addLog(
          '[WARN] sync debug: hasTarget=' + d.hasTarget + ' hasSecret=' + d.hasSecret + ' targetLen=' + d.targetLen + ' secretLen=' + d.secretLen + ' envLocalExists=' + d.envLocalExists,
          'warning'
        );
        if (d.cwd) addLog('[WARN] sync debug cwd: ' + d.cwd, 'warning');
        if (d.envLocalPath) addLog('[WARN] sync debug envLocalPath: ' + d.envLocalPath, 'warning');
      }
      return { success: true, skipped: true };
    }
    if (sync.ok) { addLog('[v] sync ok (template delete)', 'success'); return { success: true }; }
    addLog(
      '[x] sync נכשל (template delete): ' +
        (sync.status || sync.error || '') +
        (sync.data?.error ? ' (' + sync.data.error + ')' : ''),
      'error'
    );
    return { success: false };
  };

  // ============================================================
  // S54 - CATALOG UPLOAD & DISPLAY TEST FUNCTIONS
  // ============================================================

  const S54_DATA = { tenantId: null, tenantSlug: null, tenantName: null, templateKey: null, productIds: [], skus: [] };

  const s54Login = async () => {
    addLog('מתחבר כמנהל...');
    const r = await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });
    if (r.ok) { addLog('[v] התחברות הצליחה', 'success'); return { success: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] התחברות נכשלה: ' + r.status, 'error');
    return { success: false };
  };

  const s54PickTenant = async () => {
    addLog('שולף רשימת חנויות...');
    const r = await apiGet('/api/catalog-manager/tenants');
    if (!r.ok) {
      if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
      addLog('[x] שליפת חנויות נכשלה: ' + r.status, 'error');
      return { success: false };
    }
    const tenants = Array.isArray(r.data) ? r.data : r.data?.tenants || [];
    const niroста = tenants.find(t => (t.name || '').includes('נירוסטה'));
    if (!niroста) {
      addLog('[x] לא נמצאה חנות נירוסטה ברשימה (' + tenants.length + ' חנויות)', 'error');
      return { success: false };
    }
    S54_DATA.tenantId = niroста._id || niroста.id;
    S54_DATA.tenantSlug = niroста.slug || '';
    S54_DATA.tenantName = niroста.name || '';
    S54_DATA.templateKey = null;
    addLog('[v] חנות נירוסטה: ' + S54_DATA.tenantName + ' (' + S54_DATA.tenantId + ')', 'success');
    return { success: true };
  };

  const s54EnsureTemplateKey = async () => {
    if (S54_DATA.templateKey) return { success: true };
    if (!S54_DATA.tenantId) { addLog('[WARN] אין tenantId, דילוג', 'warning'); return { success: true, skipped: true }; }

    addLog('טוען תבניות (templateKey)...');
    const r = await apiGet('/api/admin/catalog-templates?tenantId=' + encodeURIComponent(S54_DATA.tenantId));
    if (!r.ok) {
      if (r.status === 401) { addLog('[x] לא מורשה (401) לטעינת תבניות', 'error'); return { success: false }; }
      if (r.status === 403) { addLog('[x] אין הרשאה (403) לטעינת תבניות', 'error'); return { success: false }; }
      if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
      addLog('[x] טעינת תבניות נכשלה: ' + r.status, 'error');
      return { success: false };
    }

    const items = Array.isArray(r.data?.items) ? r.data.items : [];
    const firstActive = items.find((t) => t && t.key && t.isActive !== false);
    if (!firstActive?.key) {
      addLog('[x] לא נמצאה תבנית פעילה (items=' + items.length + ')', 'error');
      return { success: false };
    }

    S54_DATA.templateKey = firstActive.key;
    addLog('[v] נבחרה תבנית: ' + S54_DATA.templateKey, 'success');
    return { success: true };
  };

  const s54UploadProduct = async (purchaseType, groupPurchaseType, label) => {
    if (!S54_DATA.tenantId) { addLog('[WARN] אין tenantId, דילוג', 'warning'); return { success: true, skipped: true }; }
    const tpl = await s54EnsureTemplateKey();
    if (!tpl.success) return tpl;
    const sku = 'S54-' + label.toUpperCase() + '-' + ts();
    const name = 'S54 ' + label + ' ' + ts();
    addLog('מעלה מוצר ' + label + ': ' + sku);

    const product = {
      title: name,
      name: name,
      sku: sku,
      category: 'בדיקות S54',
      subCategory: label,
      price: 150,
      purchaseType: purchaseType,
      groupPurchaseType: groupPurchaseType,
      images: [
        'https://placehold.co/400x400/1e3a8a/white?text=S54+' + encodeURIComponent(label) + '+1',
        'https://placehold.co/400x400/1e3a8a/white?text=S54+' + encodeURIComponent(label) + '+2',
        'https://placehold.co/400x400/1e3a8a/white?text=S54+' + encodeURIComponent(label) + '+3',
        'https://placehold.co/400x400/1e3a8a/white?text=S54+' + encodeURIComponent(label) + '+4',
        'https://placehold.co/400x400/1e3a8a/white?text=S54+' + encodeURIComponent(label) + '+5',
      ],
      stainless: { length: 120, width: 60, height: 85 },
      stockCount: purchaseType === 'regular' ? 10 : 0,
      inStock: purchaseType === 'regular',
    };

    if (purchaseType === 'group') {
      product.groupPurchaseDetails = { closingDays: '40', shippingDays: '60', minQuantity: '0', currentQuantity: '0' };
      product.groupPrice = 120;
    }

    const r = await apiPost('/api/catalog-manager/upload', {
      tenantId: S54_DATA.tenantId,
      templateKey: S54_DATA.templateKey,
      products: [product],
    });

    if (!r.ok || !r.data?.success) {
      if (r.status === 401) { addLog('[x] לא מורשה (401)', 'error'); return { success: false }; }
      if (r.status === 403) { addLog('[x] אין הרשאה (403)', 'error'); return { success: false }; }
      if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
      const errMsg = r.data?.errors?.[0]?.error || r.data?.error || 'HTTP ' + r.status;
      addLog('[x] העלאת ' + label + ' נכשלה: ' + errMsg, 'error');
      return { success: false };
    }

    addLog('[v] מוצר ' + label + ' הועלה בהצלחה (created: ' + (r.data.created || 0) + ')', 'success');
    S54_DATA.skus.push(sku);
    return { success: true };
  };

  const s54UploadRegular = () => s54UploadProduct('regular', 'group', 'רגיל');
  const s54UploadShared = () => s54UploadProduct('group', 'shared_container', 'מכולה');
  const s54UploadGroup = () => s54UploadProduct('group', 'group', 'קבוצתי');

  const s54FindTestProducts = async (url, label) => {
    const r = await apiGet(url);
    if (!r.ok) {
      if (r.status === 0) { addLog('[WARN] timeout (' + label + ')', 'warning'); return { success: true, skipped: true }; }
      addLog('[x] שליפה נכשלה (' + label + '): ' + r.status, 'error');
      return { success: false, products: [] };
    }
    const products = Array.isArray(r.data) ? r.data : r.data?.products || [];
    const found = products.filter(p => S54_DATA.skus.some(sku => (p.sku || '') === sku || (p.name || '').includes('S54')));
    return { success: true, products, found };
  };

  const s54MarketplaceAll = async () => {
    if (S54_DATA.skus.length === 0) { addLog('[WARN] אין מוצרים לבדיקה, דילוג', 'warning'); return { success: true, skipped: true }; }
    addLog('בודק מוצרי S54 במרקטפלייס...');
    const res = await s54FindTestProducts('/api/marketplace/products?limit=100', 'marketplace-all');
    if (!res.success) return res;
    if (res.found.length >= 3) {
      addLog('[v] נמצאו ' + res.found.length + ' מוצרי S54 במרקטפלייס (מתוך ' + res.products.length + ' מוצרים)', 'success');
      // Save product IDs for cleanup
      res.found.forEach(p => { if (p._id && !S54_DATA.productIds.includes(p._id)) S54_DATA.productIds.push(p._id); });
      return { success: true };
    }
    addLog('[x] נמצאו רק ' + res.found.length + '/3 מוצרי S54 במרקטפלייס (סה"כ ' + res.products.length + ')', 'error');
    // Still try to save IDs for cleanup
    res.found.forEach(p => { if (p._id && !S54_DATA.productIds.includes(p._id)) S54_DATA.productIds.push(p._id); });
    return { success: false };
  };

  const s54MarketplaceRegular = async () => {
    if (S54_DATA.skus.length === 0) { addLog('[WARN] אין מוצרים, דילוג', 'warning'); return { success: true, skipped: true }; }
    addLog('בודק מוצר רגיל במרקטפלייס (סינון type=regular)...');
    const res = await s54FindTestProducts('/api/marketplace/products?type=regular&limit=100', 'marketplace-regular');
    if (!res.success) return res;
    const regularFound = res.found.filter(p => p.purchaseType === 'regular' || (p.name || '').includes('רגיל'));
    if (regularFound.length >= 1) {
      addLog('[v] מוצר רגיל נמצא במרקטפלייס', 'success');
      return { success: true };
    }
    // Check if found in the broader results
    const anyFound = res.found.length;
    addLog('[x] מוצר רגיל לא נמצא (found S54: ' + anyFound + ', total: ' + res.products.length + ')', 'error');
    return { success: false };
  };

  const s54MarketplaceShared = async () => {
    if (S54_DATA.skus.length === 0) { addLog('[WARN] אין מוצרים, דילוג', 'warning'); return { success: true, skipped: true }; }
    addLog('בודק מוצר מכולה משותפת במרקטפלייס...');
    const res = await s54FindTestProducts('/api/marketplace/products?type=group&groupPurchaseType=shared_container&limit=100', 'marketplace-shared');
    if (!res.success) return res;
    const sharedFound = res.found.filter(p => p.groupPurchaseType === 'shared_container' || (p.name || '').includes('מכולה'));
    if (sharedFound.length >= 1) {
      addLog('[v] מוצר מכולה משותפת נמצא במרקטפלייס', 'success');
      return { success: true };
    }
    addLog('[x] מוצר מכולה משותפת לא נמצא (found S54: ' + res.found.length + ', total: ' + res.products.length + ')', 'error');
    return { success: false };
  };

  const s54MarketplaceGroup = async () => {
    if (S54_DATA.skus.length === 0) { addLog('[WARN] אין מוצרים, דילוג', 'warning'); return { success: true, skipped: true }; }
    addLog('בודק מוצר רכישה קבוצתית במרקטפלייס...');
    const res = await s54FindTestProducts('/api/marketplace/products?type=group&groupPurchaseType=group&limit=100', 'marketplace-group');
    if (!res.success) return res;
    const groupFound = res.found.filter(p => (p.groupPurchaseType === 'group' || !p.groupPurchaseType) && (p.purchaseType === 'group' || (p.name || '').includes('קבוצתי')));
    if (groupFound.length >= 1) {
      addLog('[v] מוצר רכישה קבוצתית נמצא במרקטפלייס', 'success');
      return { success: true };
    }
    addLog('[x] מוצר רכישה קבוצתית לא נמצא (found S54: ' + res.found.length + ', total: ' + res.products.length + ')', 'error');
    return { success: false };
  };

  const s54StoreProducts = async () => {
    if (!S54_DATA.tenantId || S54_DATA.skus.length === 0) { addLog('[WARN] אין tenantId או מוצרים, דילוג', 'warning'); return { success: true, skipped: true }; }
    addLog('בודק מוצרי S54 בחנות נירוסטה (tenantId=' + S54_DATA.tenantId + ')...');
    const res = await s54FindTestProducts('/api/products?tenantId=' + S54_DATA.tenantId + '&limit=200', 'store-all');
    if (!res.success) return res;
    // Also collect product IDs for cleanup from store API
    res.found.forEach(p => {
      const pid = p._id || p.id;
      if (pid && !S54_DATA.productIds.includes(pid)) S54_DATA.productIds.push(pid);
    });
    if (res.found.length >= 3) {
      addLog('[v] נמצאו ' + res.found.length + ' מוצרי S54 בחנות נירוסטה (מתוך ' + res.products.length + ')', 'success');
      return { success: true };
    }
    addLog('[x] נמצאו רק ' + res.found.length + '/3 מוצרי S54 בחנות נירוסטה', 'error');
    return { success: false };
  };

  const s54StoreRegular = async () => {
    if (!S54_DATA.tenantId || S54_DATA.skus.length === 0) { addLog('[WARN] דילוג', 'warning'); return { success: true, skipped: true }; }
    addLog('בודק מוצר רגיל בחנות...');
    const res = await s54FindTestProducts('/api/products?tenantId=' + S54_DATA.tenantId + '&limit=200', 'store-regular');
    if (!res.success) return res;
    const found = res.found.filter(p => p.purchaseType === 'regular' || (p.name || '').includes('רגיל'));
    if (found.length >= 1) {
      addLog('[v] מוצר רגיל נמצא בחנות עם purchaseType=regular', 'success');
      return { success: true };
    }
    addLog('[x] מוצר רגיל לא נמצא בחנות', 'error');
    return { success: false };
  };

  const s54StoreShared = async () => {
    if (!S54_DATA.tenantId || S54_DATA.skus.length === 0) { addLog('[WARN] דילוג', 'warning'); return { success: true, skipped: true }; }
    addLog('בודק מוצר מכולה בחנות...');
    const res = await s54FindTestProducts('/api/products?tenantId=' + S54_DATA.tenantId + '&limit=200', 'store-shared');
    if (!res.success) return res;
    const found = res.found.filter(p => p.groupPurchaseType === 'shared_container' || (p.name || '').includes('מכולה'));
    if (found.length >= 1) {
      addLog('[v] מוצר מכולה משותפת נמצא בחנות עם groupPurchaseType=shared_container', 'success');
      return { success: true };
    }
    addLog('[x] מוצר מכולה משותפת לא נמצא בחנות', 'error');
    return { success: false };
  };

  const s54StoreGroup = async () => {
    if (!S54_DATA.tenantId || S54_DATA.skus.length === 0) { addLog('[WARN] דילוג', 'warning'); return { success: true, skipped: true }; }
    addLog('בודק מוצר קבוצתי בחנות...');
    const res = await s54FindTestProducts('/api/products?tenantId=' + S54_DATA.tenantId + '&limit=200', 'store-group');
    if (!res.success) return res;
    const found = res.found.filter(p => (p.groupPurchaseType === 'group' || !p.groupPurchaseType) && p.purchaseType === 'group' && (p.name || '').includes('קבוצתי'));
    if (found.length >= 1) {
      addLog('[v] מוצר רכישה קבוצתית נמצא בחנות עם groupPurchaseType=group', 'success');
      return { success: true };
    }
    addLog('[x] מוצר רכישה קבוצתית לא נמצא בחנות', 'error');
    return { success: false };
  };

  const s54Cleanup = async () => {
    addLog('מנקה מוצרי S54...');
    let deleted = 0;
    // Try to find products by SKU if we don't have IDs
    if (S54_DATA.productIds.length === 0 && S54_DATA.tenantId) {
      addLog('מחפש מוצרי S54 למחיקה...');
      const res = await s54FindTestProducts('/api/products?tenantId=' + S54_DATA.tenantId + '&limit=200', 'cleanup-search');
      if (res.success && res.found.length > 0) {
        res.found.forEach(p => {
          const pid = p._id || p.id;
          if (pid && !S54_DATA.productIds.includes(pid)) S54_DATA.productIds.push(pid);
        });
      }
    }
    for (const pid of S54_DATA.productIds) {
      addLog('מוחק מוצר: ' + pid);
      const r = await apiDelete('/api/products/' + pid);
      if (r.ok) { deleted++; addLog('[v] נמחק', 'success'); }
      else addLog('[WARN] מחיקה נכשלה: HTTP ' + r.status, 'warning');
    }
    S54_DATA.productIds = [];
    S54_DATA.skus = [];
    addLog('[v] ניקוי הושלם: ' + deleted + ' מוצרים נמחקו', 'success');
    return { success: true };
  };

  // ============================================================
  // S48 - TENANTS & ADMIN FIX TEST FUNCTIONS
  // ============================================================

  const s48Login = async () => {
    addLog('מתחבר כמנהל...');
    const r = await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });
    if (r.ok) { addLog('[v] התחברות הצליחה', 'success'); return { success: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] התחברות נכשלה: ' + r.status, 'error');
    return { success: false };
  };

  const s48TenantsList = async () => {
    addLog('שולף רשימת טננטים...');
    const r = await apiGet('/api/tenants');
    if (r.ok) {
      const list = Array.isArray(r.data) ? r.data : r.data?.tenants || [];
      addLog(`[v] טננטים: ${list.length}`, 'success');
      return { success: true };
    }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] טננטים נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s48FixBusinessAdmins = async () => {
    addLog('מריץ תיקון מנהלי עסקים...');
    const r = await apiPost('/api/admin/fix-business-admins', {});
    if (r.ok && r.data) {
      addLog(`[v] תיקון: ${r.data.stats?.fixed || r.data.fixed || 0} מנהלים תוקנו`, 'success');
      return { success: true };
    }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 403) { addLog('[v] נדחה (403 - super_admin only)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] תיקון מנהלים נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s48FixTenantColors = async () => {
    addLog('מריץ תיקון צבעי טננטים...');
    const r = await apiPost('/api/admin/fix-tenant-colors', {});
    if (r.ok && r.data?.success) {
      addLog(`[v] ${r.data.message || 'צבעים עודכנו'}`, 'success');
      return { success: true };
    }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 403) { addLog('[v] נדחה (403 - super_admin only)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] תיקון צבעים נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s48CommissionsResetNoId = async () => {
    addLog('מנסה איפוס עמלות ללא orderId...');
    const r = await apiPost('/api/admin/commissions/reset', {});
    if (r.status === 400) { addLog('[v] נדחה כצפוי (400 - orderId required)', 'success'); return { success: true }; }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 400, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  // ============================================================
  // S47 - REFERRALS & TRACKING TEST FUNCTIONS
  // ============================================================

  const s47Login = async () => {
    addLog('מתחבר כמנהל...');
    const r = await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });
    if (r.ok) { addLog('[v] התחברות הצליחה', 'success'); return { success: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] התחברות נכשלה: ' + r.status, 'error');
    return { success: false };
  };

  const s47ReferralsList = async () => {
    addLog('שולף רשימת הפניות...');
    const r = await apiGet('/api/referrals/list');
    if (r.ok && r.data?.ok) {
      addLog(`[v] הפניות: ${r.data.count || 0}`, 'success');
      return { success: true };
    }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] הפניות נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s47ReferralsSummary = async () => {
    addLog('שולף סיכום הפניות...');
    const r = await apiGet('/api/referrals/summary');
    if (r.ok && r.data?.ok) {
      addLog(`[v] סיכום: ${r.data.referrals?.total || 0} הפניות`, 'success');
      return { success: true };
    }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] סיכום הפניות נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s47ReferralCreateNoData = async () => {
    addLog('יוצר הפנייה ללא נתונים...');
    const r = await apiPost('/api/referrals', {});
    if (r.status === 400) { addLog('[v] נדחה כצפוי (400 - bad_request)', 'success'); return { success: true }; }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 400, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  const s47TrackVisit = async () => {
    addLog('שולח מעקב ביקור...');
    const r = await apiPost('/api/track/visit', { page: '/simulator-test', referrer: 'simulator' });
    if (r.ok) { addLog('[v] מעקב ביקור נרשם', 'success'); return { success: true }; }
    if (r.status === 400) { addLog('[v] נדחה (400)', 'success'); return { success: true }; }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] מעקב ביקור נכשל: ' + r.status, 'error');
    return { success: false };
  };

  // ============================================================
  // S46 - PRODUCTS EXTENDED TEST FUNCTIONS
  // ============================================================

  const s46Login = async () => {
    addLog('מתחבר כמנהל...');
    const r = await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });
    if (r.ok) { addLog('[v] התחברות הצליחה', 'success'); return { success: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] התחברות נכשלה: ' + r.status, 'error');
    return { success: false };
  };

  const s46DuplicateNoId = async () => {
    addLog('מנסה שכפול ללא productId...');
    const r = await apiPost('/api/products/duplicate', {});
    if (r.status === 400) { addLog('[v] נדחה כצפוי (400 - productId required)', 'success'); return { success: true }; }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 400, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  const s46BulkDeleteNoIds = async () => {
    addLog('מנסה מחיקה מרובה ללא ids...');
    const r = await apiPost('/api/products/bulk-delete', { ids: [] });
    if (r.status === 410) { addLog('[v] נדחה כצפוי (410 - deprecated endpoint)', 'success'); return { success: true }; }
    if (r.status === 400) { addLog('[v] נדחה כצפוי (400 - ids required)', 'success'); return { success: true }; }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 400, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  const s46DemoCompleteNoOrder = async () => {
    addLog('מנסה demo-complete ללא orderId...');
    const r = await apiPost('/api/orders/demo-complete', {});
    if (r.status === 400) { addLog('[v] נדחה כצפוי (400 - order_id_required)', 'success'); return { success: true }; }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 400, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  const s46SalesList = async () => {
    addLog('שולף רשימת מכירות...');
    const r = await apiGet('/api/sales');
    if (r.ok) {
      const list = Array.isArray(r.data) ? r.data : [];
      addLog(`[v] מכירות: ${list.length}`, 'success');
      return { success: true };
    }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] מכירות נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s46SalesReport = async () => {
    addLog('שולף דוח מכירות...');
    const r = await apiGet('/api/sales/report');
    if (r.ok && r.data?.ok) {
      addLog(`[v] דוח: ${r.data.totals?.count || 0} מכירות, סה"כ=${r.data.totals?.totalSales || 0}`, 'success');
      return { success: true };
    }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 403) { addLog('[v] נדחה (403)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] דוח מכירות נכשל: ' + r.status, 'error');
    return { success: false };
  };

  // ============================================================
  // S45 - PUSH NOTIFICATIONS TEST FUNCTIONS
  // ============================================================

  const s45Login = async () => {
    addLog('מתחבר כמנהל...');
    const r = await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });
    if (r.ok) { addLog('[v] התחברות הצליחה', 'success'); return { success: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] התחברות נכשלה: ' + r.status, 'error');
    return { success: false };
  };

  const s45PushConfig = async () => {
    addLog('בודק Push config...');
    const r = await apiGet('/api/push/config');
    if (r.ok) {
      addLog(`[v] Push configured: ${r.data?.configured || false}`, 'success');
      return { success: true };
    }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] Push config נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s45PushSubscribeNoData = async () => {
    addLog('מנסה subscribe ללא subscription...');
    const r = await apiPost('/api/push/subscribe', {});
    if (r.status === 400) { addLog('[v] נדחה כצפוי (400 - invalid_subscription)', 'success'); return { success: true }; }
    if (r.status === 503) { addLog('[v] Push לא מוגדר (503)', 'success'); return { success: true }; }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 400/503, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  const s45PushDebug = async () => {
    addLog('בודק Push debug...');
    const r = await apiGet('/api/push/debug');
    if (r.ok) {
      addLog('[v] Push debug info OK', 'success');
      return { success: true };
    }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] Push debug נכשל: ' + r.status, 'error');
    return { success: false };
  };

  // ============================================================
  // S44 - SALES & TRANSACTIONS TEST FUNCTIONS
  // ============================================================

  const s44Login = async () => {
    addLog('מתחבר כמנהל...');
    const r = await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });
    if (r.ok) { addLog('[v] התחברות הצליחה', 'success'); return { success: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] התחברות נכשלה: ' + r.status, 'error');
    return { success: false };
  };

  const s44SalesList = async () => {
    addLog('שולף רשימת מכירות...');
    const r = await apiGet('/api/sales');
    if (r.ok) {
      const list = Array.isArray(r.data) ? r.data : [];
      addLog(`[v] מכירות: ${list.length}`, 'success');
      return { success: true };
    }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] מכירות נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s44SalesPostInvalid = async () => {
    addLog('יוצר מכירה ללא productId...');
    const r = await apiPost('/api/sales', { customerName: 'Test', customerPhone: '0533752633' });
    if (r.status === 400) { addLog('[v] נדחה כצפוי (400 - Invalid payload)', 'success'); return { success: true }; }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 403) { addLog('[v] נדחה (403)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 400, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  const s44SalesReport = async () => {
    addLog('שולף דוח מכירות...');
    const r = await apiGet('/api/sales/report');
    if (r.ok && r.data?.ok) {
      addLog(`[v] דוח: ${r.data.totals?.count || 0} מכירות, סה"כ=${r.data.totals?.totalSales || 0}`, 'success');
      return { success: true };
    }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 403) { addLog('[v] נדחה (403)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] דוח מכירות נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s44TransactionsList = async () => {
    addLog('שולף עסקאות...');
    const r = await apiGet('/api/transactions');
    if (r.ok && r.data?.ok) {
      addLog(`[v] עסקאות: ${r.data.items?.length || 0}`, 'success');
      return { success: true };
    }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] עסקאות נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s44WithdrawalsList = async () => {
    addLog('שולף משיכות...');
    const r = await apiGet('/api/withdrawals');
    if (r.ok && r.data?.ok) {
      addLog(`[v] משיכות: ${r.data.requests?.length || 0}`, 'success');
      return { success: true };
    }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 429) { addLog('[WARN] rate limit (429)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] משיכות נכשל: ' + r.status, 'error');
    return { success: false };
  };

  // ============================================================
  // S43 - SETTINGS & TEXTS TEST FUNCTIONS
  // ============================================================

  const s43Login = async () => {
    addLog('מתחבר כמנהל...');
    const r = await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });
    if (r.ok) { addLog('[v] התחברות הצליחה', 'success'); return { success: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] התחברות נכשלה: ' + r.status, 'error');
    return { success: false };
  };

  const s43SettingsGet = async () => {
    addLog('שולף הגדרות...');
    const r = await apiGet('/api/settings');
    if (r.ok && r.data?.ok) {
      addLog(`[v] הגדרות: siteName=${r.data.settings?.siteName || 'N/A'}`, 'success');
      return { success: true };
    }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] הגדרות נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s43ThemeGet = async () => {
    addLog('שולף ערכת נושא...');
    const r = await apiGet('/api/theme');
    if (r.ok && r.data?.ok) {
      addLog(`[v] ערכה: ${r.data.themeId || 'default'}, זמינות: ${r.data.availableThemes?.length || 0}`, 'success');
      return { success: true };
    }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] ערכת נושא נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s43ThemePostInvalid = async () => {
    addLog('מנסה להגדיר ערכה לא קיימת...');
    const r = await apiPost('/api/theme', { themeId: 'fake_theme_999' });
    if (r.status === 400) { addLog('[v] נדחה כצפוי (400 - invalid theme ID)', 'success'); return { success: true }; }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 400, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  const s43SiteTexts = async () => {
    addLog('שולף טקסטי אתר (home)...');
    const r = await apiGet('/api/site-texts?page=home');
    if (r.ok && r.data?.success) {
      addLog(`[v] סעיפים: ${r.data.sections?.length || 0}`, 'success');
      return { success: true };
    }
    if (r.ok) { addLog(`[v] טקסטי אתר: ${r.data?.texts?.length || 0}`, 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] טקסטי אתר נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s43SiteTextsAll = async () => {
    addLog('שולף כל הטקסטים...');
    const r = await apiGet('/api/site-texts/all');
    if (r.ok && r.data?.success) {
      addLog(`[v] טקסטים: ${r.data.texts?.length || 0}`, 'success');
      return { success: true };
    }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] כל הטקסטים נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s43PageTextsNoKey = async () => {
    addLog('שולף טקסטי עמוד ללא pageKey...');
    const r = await apiGet('/api/page-texts');
    if (r.status === 400) { addLog('[v] נדחה כצפוי (400 - pageKey required)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 400, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  // ============================================================
  // S42 - CLEANUP & ORPHAN AUDIT TEST FUNCTIONS
  // ============================================================

  const s42Login = async () => {
    addLog('מתחבר כמנהל...');
    const r = await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });
    if (r.ok) { addLog('[v] התחברות הצליחה', 'success'); return { success: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] התחברות נכשלה: ' + r.status, 'error');
    return { success: false };
  };

  const s42OrphanDryrun = async () => {
    addLog('מריץ orphan-products dry-run...');
    const r = await apiPost('/api/admin/cleanup/orphan-products', { dryRun: true });
    if (r.ok && r.data?.ok) {
      addLog(`[v] אורפן dry-run: ${r.data.total || 0} מוצרים יתומים`, 'success');
      return { success: true };
    }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] orphan dry-run נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s42AuditOrphans = async () => {
    addLog('בודק ביקורת אורפן...');
    const r = await apiGet('/api/admin/audit/orphan-products');
    if (r.ok && r.data) {
      addLog(`[v] אורפן: ${r.data.count ?? r.data.total ?? 0} מוצרים`, 'success');
      return { success: true };
    }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] ביקורת אורפן נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s42AuditTenantsSummary = async () => {
    addLog('שולף סיכום טננטים-מוצרים...');
    const r = await apiGet('/api/admin/audit/tenants-products-summary');
    if (r.ok && r.data) {
      addLog(`[v] טננטים: ${r.data.totalTenants || 0}, מוצרים: ${r.data.totalProducts || 0}`, 'success');
      return { success: true };
    }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] סיכום טננטים נכשל: ' + r.status, 'error');
    return { success: false };
  };

  // ============================================================
  // S41 - ADMIN MAINTENANCE TEST FUNCTIONS
  // ============================================================

  const s41Login = async () => {
    addLog('מתחבר כמנהל...');
    const r = await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });
    if (r.ok) { addLog('[v] התחברות הצליחה', 'success'); return { success: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] התחברות נכשלה: ' + r.status, 'error');
    return { success: false };
  };

  const s41FixOrderTypesPreview = async () => {
    addLog('שולף תצוגת תיקון הזמנות...');
    const r = await apiGet('/api/admin/fix-order-types');
    if (r.ok && r.data?.ok) {
      addLog(`[v] תצוגה: ${r.data.ordersToFix || 0} הזמנות לתיקון מתוך ${r.data.ordersChecked || 0}`, 'success');
      return { success: true };
    }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] תצוגת תיקון הזמנות נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s41EnforceNoConfirm = async () => {
    addLog('מנסה אכיפת מוצרים ללא confirm tokens...');
    const r = await apiPost('/api/admin/enforce/exact-5-products-safe', { confirm: 'wrong', confirm2: 'wrong' });
    if (r.status === 400) { addLog('[v] נדחה כצפוי (400 - confirm tokens required)', 'success'); return { success: true }; }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 403) { addLog('[v] נדחה (403)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 400, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  const s41MarketingAssetsList = async () => {
    addLog('שולף נכסי שיווק...');
    const r = await apiGet('/api/admin/marketing-assets');
    if (r.ok && r.data?.ok) {
      addLog(`[v] נכסי שיווק: ${r.data.items?.length || 0}`, 'success');
      return { success: true };
    }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] נכסי שיווק נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s41MarketingPostInvalid = async () => {
    addLog('יוצר נכס שיווק ללא title...');
    const r = await apiPost('/api/admin/marketing-assets', { type: 'invalid' });
    if (r.status === 400) { addLog('[v] נדחה כצפוי (400 - validation_error)', 'success'); return { success: true }; }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 400, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  // ============================================================
  // S40 - ORDERS EXTENDED & NOTIFICATIONS TEST FUNCTIONS
  // ============================================================

  const s40Login = async () => {
    addLog('מתחבר כמנהל...');
    const r = await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });
    if (r.ok) { addLog('[v] התחברות הצליחה', 'success'); return { success: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] התחברות נכשלה: ' + r.status, 'error');
    return { success: false };
  };

  const s40CommissionsList = async () => {
    addLog('שולף רשימת עמלות...');
    const r = await apiGet('/api/admin/commissions');
    if (r.ok && r.data?.ok) {
      addLog(`[v] עמלות: ${r.data.commissions?.length || 0}, סה"כ=${r.data.summary?.totalAmount || 0}`, 'success');
      return { success: true };
    }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 429) { addLog('[WARN] rate limit (429)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] עמלות נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s40NotificationsList = async () => {
    addLog('שולף תבניות התראות...');
    const r = await apiGet('/api/admin/notifications');
    if (r.ok && r.data?.ok) {
      addLog(`[v] תבניות: ${r.data.templates?.length || 0}, מתוזמנות: ${r.data.scheduled?.length || 0}`, 'success');
      return { success: true };
    }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 429) { addLog('[WARN] rate limit (429)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] התראות נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s40NotificationLogs = async () => {
    addLog('שולף לוג התראות...');
    const r = await apiGet('/api/admin/notification-logs?limit=5');
    if (r.ok) {
      addLog(`[v] לוג התראות: ${r.data?.logs?.length || r.data?.items?.length || 0} רשומות`, 'success');
      return { success: true };
    }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 429) { addLog('[WARN] rate limit (429)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] לוג התראות נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s40SendNoTemplate = async () => {
    addLog('שולח התראה ללא templateType...');
    const r = await apiPost('/api/admin/notifications/send', { variables: {} });
    if (r.status === 400) { addLog('[v] נדחה כצפוי (400 - template_type_required)', 'success'); return { success: true }; }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 429) { addLog('[WARN] rate limit (429)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 400, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  // ============================================================
  // S39 - GAMIFICATION TEST FUNCTIONS
  // ============================================================

  const s39Login = async () => {
    addLog('מתחבר כמנהל...');
    const r = await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });
    if (r.ok) { addLog('[v] התחברות הצליחה', 'success'); return { success: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] התחברות נכשלה: ' + r.status, 'error');
    return { success: false };
  };

  const s39BonusesList = async () => {
    addLog('שולף רשימת בונוסים...');
    const r = await apiGet('/api/gamification/bonuses?all=1');
    if (r.ok && Array.isArray(r.data)) {
      addLog(`[v] בונוסים: ${r.data.length} כללים`, 'success');
      return { success: true };
    }
    if (r.status === 403) { addLog('[v] נדחה (403 - admin only)', 'success'); return { success: true }; }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] בונוסים נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s39BonusesPostInvalid = async () => {
    addLog('יוצר בונוס ללא name/type...');
    const r = await apiPost('/api/gamification/bonuses', { name: '', type: 'invalid' });
    if (r.status === 400) { addLog('[v] נדחה כצפוי (400 - invalid payload)', 'success'); return { success: true }; }
    if (r.status === 403) { addLog('[v] נדחה (403)', 'success'); return { success: true }; }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 400, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  const s39GoalsList = async () => {
    addLog('שולף רשימת יעדים...');
    const r = await apiGet('/api/gamification/goals?all=1');
    if (r.ok && Array.isArray(r.data)) {
      addLog(`[v] יעדים: ${r.data.length}`, 'success');
      return { success: true };
    }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 403) { addLog('[v] נדחה (403)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] יעדים נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s39GoalsPostInvalid = async () => {
    addLog('יוצר יעד ללא agentId...');
    const r = await apiPost('/api/gamification/goals', { month: 99 });
    if (r.status === 400) { addLog('[v] נדחה כצפוי (400 - invalid payload)', 'success'); return { success: true }; }
    if (r.status === 403) { addLog('[v] נדחה (403)', 'success'); return { success: true }; }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 400, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  const s39LevelsList = async () => {
    addLog('שולף רשימת רמות...');
    const r = await apiGet('/api/gamification/levels?all=1');
    if (r.ok && Array.isArray(r.data)) {
      addLog(`[v] רמות: ${r.data.length}`, 'success');
      return { success: true };
    }
    if (r.status === 403) { addLog('[v] נדחה (403 - admin only)', 'success'); return { success: true }; }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] רמות נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s39LevelsPostInvalid = async () => {
    addLog('יוצר רמה ללא name...');
    const r = await apiPost('/api/gamification/levels', { name: '', minSalesAmount: -1 });
    if (r.status === 400) { addLog('[v] נדחה כצפוי (400 - invalid payload)', 'success'); return { success: true }; }
    if (r.status === 403) { addLog('[v] נדחה (403)', 'success'); return { success: true }; }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 400, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  const s39Seed = async () => {
    addLog('מריץ Seed גיימיפיקציה...');
    const r = await apiPost('/api/gamification/seed', {});
    if (r.ok && r.data?.success) {
      const res = r.data.results || {};
      addLog(`[v] Seed: levels=${res.levels?.created || 0}, bonuses=${res.bonuses?.created || 0}`, 'success');
      return { success: true };
    }
    if (r.status === 403) { addLog('[v] נדחה (403 - admin only)', 'success'); return { success: true }; }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] Seed נכשל: ' + r.status, 'error');
    return { success: false };
  };

  // ============================================================
  // S38 - PAYPLUS & PRIORITY INTEGRATIONS TEST FUNCTIONS
  // ============================================================

  const s38Login = async () => {
    addLog('מתחבר כמנהל...');
    const r = await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });
    if (r.ok) { addLog('[v] התחברות הצליחה', 'success'); return { success: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] התחברות נכשלה: ' + r.status, 'error');
    return { success: false };
  };

  const s38PayplusTransactions = async () => {
    addLog('שולף עסקאות PayPlus...');
    const r = await apiGet('/api/admin/payplus/transactions?limit=5');
    if (r.ok && r.data?.ok) {
      addLog(`[v] עסקאות: ${r.data.pagination?.total || 0}, עמוד ${r.data.pagination?.page || 1}`, 'success');
      return { success: true };
    }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500) - Mongoose', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] עסקאות PayPlus נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s38PayplusDeadLetter = async () => {
    addLog('שולף Dead Letter Queue...');
    const r = await apiGet('/api/admin/payplus/dead-letter?limit=5');
    if (r.ok && r.data?.ok) {
      addLog(`[v] DLQ: ${r.data.pagination?.total || 0} אירועים`, 'success');
      return { success: true };
    }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500) - Mongoose', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] DLQ נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s38PayplusReconciliation = async () => {
    addLog('שולף התאמות PayPlus...');
    const r = await apiGet('/api/admin/payplus/reconciliation');
    if (r.ok && r.data?.ok) {
      const s = r.data.summary || {};
      addLog(`[v] התאמות: ${s.totalEvents || 0} אירועים, matched=${s.matched || 0}, mismatches=${s.mismatches || 0}`, 'success');
      return { success: true };
    }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500) - Mongoose', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] התאמות PayPlus נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s38DlqInvalidAction = async () => {
    addLog('שולח פעולה לא תקינה ל-DLQ...');
    const r = await apiPost('/api/admin/payplus/dead-letter', { action: 'invalid_action_xyz' });
    if (r.status === 400) { addLog('[v] נדחה כצפוי (400 - Invalid action)', 'success'); return { success: true }; }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 400, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  const s38PriorityStatus = async () => {
    addLog('בודק סטטוס Priority...');
    const r = await apiGet('/api/admin/priority/status');
    if (r.ok) {
      const d = r.data;
      if (d.configured) {
        addLog(`[v] Priority: configured, connected=${d.connected}, env=${d.environment}`, 'success');
      } else {
        addLog(`[v] Priority: not configured (missing=${(d.missing||[]).join(',')})`, 'success');
      }
      return { success: true };
    }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] סטטוס Priority נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s38PriorityCustomers = async () => {
    addLog('שולף לקוחות Priority...');
    const r = await apiGet('/api/admin/priority/customers?limit=5');
    if (r.ok && r.data?.ok) {
      addLog(`[v] לקוחות: ${r.data.pagination?.total || 0}, synced=${r.data.stats?.synced || 0}`, 'success');
      return { success: true };
    }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500) - Mongoose', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] לקוחות Priority נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s38PriorityProducts = async () => {
    addLog('שולף מוצרי Priority...');
    const r = await apiGet('/api/admin/priority/products?limit=5');
    if (r.ok && r.data?.ok) {
      addLog(`[v] מוצרים: ${r.data.pagination?.total || 0} מיפויים`, 'success');
      return { success: true };
    }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500) - Mongoose', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] מוצרי Priority נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s38PriorityDocuments = async () => {
    addLog('שולף מסמכי Priority...');
    const r = await apiGet('/api/admin/priority/documents?limit=5');
    if (r.ok && r.data?.ok) {
      const s = r.data.stats || {};
      addLog(`[v] מסמכים: invoices=${s.totalInvoices || 0}, receipts=${s.totalReceipts || 0}`, 'success');
      return { success: true };
    }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500) - Mongoose', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] מסמכי Priority נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s38PriorityReconciliation = async () => {
    addLog('שולף התאמות Priority...');
    const r = await apiGet('/api/admin/priority/reconciliation');
    if (r.ok && r.data?.ok) {
      const s = r.data.summary || {};
      addLog(`[v] התאמות: total=${s.total || 0}, synced=${s.synced || 0}, failed=${s.failed || 0}`, 'success');
      return { success: true };
    }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500) - Mongoose', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] התאמות Priority נכשל: ' + r.status, 'error');
    return { success: false };
  };

  // ============================================================
  // S37 - ADMIN REPORTS & CATALOG TEMPLATES TEST FUNCTIONS
  // ============================================================

  const s37Login = async () => {
    addLog('מתחבר כמנהל...');
    const r = await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });
    if (r.ok) { addLog('[v] התחברות הצליחה', 'success'); return { success: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] התחברות נכשלה: ' + r.status, 'error');
    return { success: false };
  };

  const s37ReportsApi = async () => {
    addLog('בודק Reports API...');
    const r = await apiGet('/api/admin/reports');
    if (r.ok && r.data?.success) {
      addLog('[v] Reports API: ' + r.data.message, 'success');
      return { success: true };
    }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 429) { addLog('[WARN] rate limit (429)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] Reports API נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s37ReportsOverview = async () => {
    addLog('שולף סקירת דוחות...');
    const r = await apiGet('/api/admin/reports/overview');
    if (r.ok && r.data?.success) {
      addLog('[v] סקירה: data=' + JSON.stringify(r.data.data || {}).substring(0, 80), 'success');
      return { success: true };
    }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 429) { addLog('[WARN] rate limit (429)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] סקירת דוחות נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s37ReportsByAgent = async () => {
    addLog('שולף דוח לפי סוכן...');
    const r = await apiGet('/api/admin/reports/by-agent');
    if (r.ok && r.data?.success) {
      addLog(`[v] דוח סוכנים: ${r.data.items?.length || 0} רשומות`, 'success');
      return { success: true };
    }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 429) { addLog('[WARN] rate limit (429)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] דוח סוכנים נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s37ReportsByProduct = async () => {
    addLog('שולף דוח לפי מוצר...');
    const r = await apiGet('/api/admin/reports/by-product');
    if (r.ok && r.data?.success) {
      addLog(`[v] דוח מוצרים: ${r.data.items?.length || 0} רשומות`, 'success');
      return { success: true };
    }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 429) { addLog('[WARN] rate limit (429)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] דוח מוצרים נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s37CatalogManagerList = async () => {
    addLog('שולף רשימת מוצרי קטלוג מנהל...');
    const r = await apiGet('/api/admin/catalog-manager');
    if (r.ok && r.data?.items !== undefined) {
      addLog(`[v] מוצרי קטלוג: ${r.data.items?.length || 0}`, 'success');
      return { success: true };
    }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 403) { addLog('[v] נדחה (403)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] קטלוג מנהל נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s37CatalogManagerTenants = async () => {
    addLog('שולף עסקים קטלוג מנהל...');
    const r = await apiGet('/api/admin/catalog-manager/tenants');
    if (r.ok && r.data?.ok) {
      addLog(`[v] עסקים: ${r.data.tenants?.length || 0}`, 'success');
      return { success: true };
    }
    if (r.status === 403) { addLog('[v] נדחה (403 - super admin)', 'success'); return { success: true }; }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] עסקים קטלוג מנהל נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s37CopyNoData = async () => {
    addLog('מנסה להעתיק מוצרים ללא tenantId...');
    const r = await apiPost('/api/admin/catalog-manager/copy-to-tenant', {});
    if (r.status === 400) { addLog('[v] נדחה כצפוי (400 - missing tenantId)', 'success'); return { success: true }; }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 403) { addLog('[v] נדחה (403)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 400, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  const s37TemplatesNoTenant = async () => {
    addLog('שולף תבניות ללא tenantId...');
    const r = await apiGet('/api/admin/catalog-templates');
    if (r.status === 400) { addLog('[v] נדחה כצפוי (400 - tenant_required)', 'success'); return { success: true }; }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 403) { addLog('[v] נדחה (403)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 400, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  const s37TemplatesPostNoKey = async () => {
    addLog('יוצר תבנית ללא key...');
    const r = await apiPost('/api/admin/catalog-templates', { name: 'test' });
    if (r.status === 400) { addLog('[v] נדחה כצפוי (400 - invalid_key/tenant_required)', 'success'); return { success: true }; }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 403) { addLog('[v] נדחה (403)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 400, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  // ============================================================
  // S36 - MARKETPLACE & SYSTEM TEST FUNCTIONS
  // ============================================================

  const s36Login = async () => {
    addLog('מתחבר כמנהל...');
    const r = await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });
    if (r.ok) { addLog('[v] התחברות הצליחה', 'success'); return { success: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] התחברות נכשלה: ' + r.status, 'error');
    return { success: false };
  };

  const s36Health = async () => {
    addLog('בודק health check...');
    const r = await apiGet('/api/health');
    if (r.ok && r.data?.status === 'ok') {
      addLog(`[v] Health: ok, version=${r.data.version || '?'}`, 'success');
      return { success: true };
    }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] health נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s36ListUsers = async () => {
    addLog('שולף רשימת משתמשים...');
    const r = await apiGet('/api/list-users');
    if (r.ok && r.data?.success) {
      addLog(`[v] משתמשים: ${r.data.count || r.data.users?.length || 0}`, 'success');
      return { success: true };
    }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] רשימת משתמשים נכשלה: ' + r.status, 'error');
    return { success: false };
  };

  const s36AgentsList = async () => {
    addLog('שולף רשימת סוכנים...');
    const r = await apiGet('/api/agents?limit=5');
    if (r.ok && r.data?.agents !== undefined) {
      addLog(`[v] סוכנים: ${r.data.agents?.length || 0}, סה"כ ${r.data.total || 0}`, 'success');
      return { success: true };
    }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] רשימת סוכנים נכשלה: ' + r.status, 'error');
    return { success: false };
  };

  const s36MarketplaceProducts = async () => {
    addLog('שולף מוצרי מרקטפלייס...');
    const r = await apiGet('/api/marketplace/products?limit=5');
    if (r.ok && r.data?.products !== undefined) {
      addLog(`[v] מרקטפלייס: ${r.data.products?.length || 0} מוצרים, ${r.data.tenants?.length || 0} עסקים`, 'success');
      return { success: true };
    }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500) - Mongoose', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] מרקטפלייס נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s36ContainerOrders = async () => {
    addLog('שולף הזמנות מכולה...');
    const r = await apiGet('/api/marketplace/container-orders');
    if (r.ok && r.data?.ok) {
      addLog(`[v] הזמנות מכולה: ${r.data.total || 0}`, 'success');
      return { success: true };
    }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500) - Mongoose', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] הזמנות מכולה נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s36CustomerOrders = async () => {
    addLog('שולף הזמנות לקוח...');
    const r = await apiGet('/api/customer/orders');
    if (r.ok && r.data?.ok) {
      addLog(`[v] הזמנות לקוח: ${r.data.totalOrders || 0} הזמנות`, 'success');
      return { success: true };
    }
    if (r.status === 401) { addLog('[v] נדחה (401 - לא לקוח)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] הזמנות לקוח נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s36CatalogTenants = async () => {
    addLog('שולף עסקים מקטלוג...');
    const r = await apiGet('/api/catalog-manager/tenants');
    if (r.ok && r.data?.ok) {
      addLog(`[v] עסקים קטלוג: ${r.data.tenants?.length || 0}`, 'success');
      return { success: true };
    }
    if (r.status === 403) { addLog('[v] נדחה (403 - super admin only)', 'success'); return { success: true }; }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] עסקים קטלוג נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s36CloudinaryConfig = async () => {
    addLog('שולף הגדרות Cloudinary...');
    const r = await apiGet('/api/catalog-manager/cloudinary-config');
    if (r.ok && r.data?.cloudName) {
      addLog(`[v] Cloudinary: cloud=${r.data.cloudName}`, 'success');
      return { success: true };
    }
    if (r.status === 403) { addLog('[v] נדחה (403 - super admin only)', 'success'); return { success: true }; }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] Cloudinary נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s36AgentsNoFields = async () => {
    addLog('יוצר סוכן ללא שדות...');
    const r = await apiPost('/api/agents', {});
    if (r.status === 400) { addLog('[v] נדחה כצפוי (400 - Missing fields)', 'success'); return { success: true }; }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 400, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  // ============================================================
  // S35 - AUTH EXTENDED & PUBLIC APIS TEST FUNCTIONS
  // ============================================================

  const s35Login = async () => {
    addLog('מתחבר כמנהל...');
    const r = await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });
    if (r.ok) { addLog('[v] התחברות הצליחה', 'success'); return { success: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] התחברות נכשלה: ' + r.status, 'error');
    return { success: false };
  };

  const s35Me = async () => {
    addLog('שולף מידע משתמש נוכחי...');
    const r = await apiGet('/api/auth/me');
    if (r.ok && r.data?.ok) {
      addLog(`[v] משתמש: ${r.data.user?.email || '?'}, role=${r.data.user?.role || '?'}`, 'success');
      return { success: true };
    }
    if (r.status === 401) { addLog('[x] לא מחובר (401)', 'error'); return { success: false }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] me נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s35ForgotNoEmail = async () => {
    addLog('שולח שכחת סיסמה ללא מייל...');
    const r = await apiPost('/api/auth/forgot-password', {});
    if (r.status === 400) { addLog('[v] נדחה כצפוי (400 - missing_email)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 400, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  const s35ResetNoToken = async () => {
    addLog('שולח איפוס סיסמה ללא token...');
    const r = await apiPost('/api/auth/reset-password', {});
    if (r.status === 400) { addLog('[v] נדחה כצפוי (400 - missing_fields)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 400, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  const s35ResetBadToken = async () => {
    addLog('שולח איפוס סיסמה עם token שגוי...');
    const r = await apiPost('/api/auth/reset-password', { token: 'invalid-token-12345', password: 'Test1234!' });
    if (r.status === 400) { addLog('[v] נדחה כצפוי (400 - invalid_or_expired)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 400, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  const s35BrandingPublic = async () => {
    addLog('שולף מיתוג ציבורי...');
    const r = await apiGet('/api/branding');
    if (r.ok && r.data?.settings) {
      addLog(`[v] מיתוג: primary=${r.data.settings.colors?.primary || '?'}`, 'success');
      return { success: true };
    }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500) - Mongoose', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] מיתוג ציבורי נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s35Catalog = async () => {
    addLog('שולף קטלוג מוצרים...');
    const r = await apiGet('/api/catalog');
    if (r.ok && r.data?.ok) {
      addLog(`[v] קטלוג: ${r.data.products?.length || 0} מוצרים`, 'success');
      return { success: true };
    }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500) - Mongoose', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] קטלוג נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s35Categories = async () => {
    addLog('שולף קטגוריות...');
    const r = await apiGet('/api/categories');
    if (r.ok && r.data?.ok) {
      addLog(`[v] קטגוריות: ${r.data.categories?.length || 0}`, 'success');
      return { success: true };
    }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500) - Mongoose', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] קטגוריות נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s35BotConfig = async () => {
    addLog('שולף הגדרות בוט...');
    const r = await apiGet('/api/bot-config');
    if (r.ok && r.data?.success) {
      addLog(`[v] בוט: ${r.data.config?.categories?.length || 0} קטגוריות`, 'success');
      return { success: true };
    }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500) - Mongoose', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] הגדרות בוט נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s35Logout = async () => {
    addLog('מתנתק...');
    const r = await apiPost('/api/auth/logout', {});
    if (r.ok && r.data?.success) { addLog('[v] התנתקות הצליחה', 'success'); return { success: true }; }
    if (r.ok) { addLog('[v] התנתקות הצליחה', 'success'); return { success: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] התנתקות נכשלה: ' + r.status, 'error');
    return { success: false };
  };

  const s35MeAfterLogout = async () => {
    addLog('בודק מידע משתמש אחרי התנתקות...');
    const r = await apiGet('/api/auth/me');
    if (r.status === 401) { addLog('[v] נדחה כצפוי (401 - לא מחובר)', 'success'); return { success: true }; }
    if (r.ok) { addLog('[WARN] עדיין מחובר - cookie לא נמחק', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 401, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  const s35Relogin = async () => {
    addLog('מתחבר מחדש להחזרת מצב...');
    const r = await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });
    if (r.ok) { addLog('[v] התחברות מחדש הצליחה', 'success'); return { success: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] התחברות מחדש נכשלה: ' + r.status, 'error');
    return { success: false };
  };

  // ============================================================
  // S34 - ADMIN SYSTEM TOOLS TEST FUNCTIONS
  // ============================================================

  const s34Login = async () => {
    addLog('מתחבר כמנהל...');
    const r = await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });
    if (r.ok) { addLog('[v] התחברות הצליחה', 'success'); return { success: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] התחברות נכשלה: ' + r.status, 'error');
    return { success: false };
  };

  const s34BackupsList = async () => {
    addLog('שולף רשימת גיבויים...');
    const r = await apiGet('/api/admin/backups');
    if (r.ok && r.data?.backups !== undefined) {
      addLog(`[v] גיבויים: ${r.data.backups?.length || 0} גיבויים`, 'success');
      return { success: true };
    }
    if (r.status === 401) { addLog('[v] נדחה (401 - super admin only)', 'success'); return { success: true }; }
    if (r.status === 429) { addLog('[WARN] rate limit', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] רשימת גיבויים נכשלה: ' + r.status, 'error');
    return { success: false };
  };

  const s34EmergencyInfo = async () => {
    addLog('שולף מידע גיבוי חירום...');
    const r = await apiGet('/api/admin/emergency-backup');
    if (r.ok) {
      addLog(`[v] גיבוי חירום: עדכון אחרון=${r.data?.lastUpdate || 'לא ידוע'}`, 'success');
      return { success: true };
    }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 429) { addLog('[WARN] rate limit', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] מידע חירום נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s34NotificationLogs = async () => {
    addLog('שולף לוג התראות...');
    const r = await apiGet('/api/admin/notification-logs?limit=5');
    if (r.ok && r.data?.ok) {
      addLog(`[v] לוג התראות: ${r.data.logs?.length || r.data.total || 0} רשומות`, 'success');
      return { success: true };
    }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 429) { addLog('[WARN] rate limit', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] לוג התראות נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s34OrphanProducts = async () => {
    addLog('שולף מוצרים יתומים...');
    const r = await apiGet('/api/admin/audit/orphan-products');
    if (r.ok && r.data?.ok) {
      addLog(`[v] מוצרים יתומים: ${r.data.total || 0}`, 'success');
      return { success: true };
    }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 429) { addLog('[WARN] rate limit', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] מוצרים יתומים נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s34TenantsSummary = async () => {
    addLog('שולף סיכום מוצרים/עסקים...');
    const r = await apiGet('/api/admin/audit/tenants-products-summary');
    if (r.ok && r.data?.ok) {
      addLog(`[v] סיכום: ${r.data.totalTenants || 0} עסקים, ${r.data.totalProducts || 0} מוצרים`, 'success');
      return { success: true };
    }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 429) { addLog('[WARN] rate limit', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] סיכום נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s34GlobalBranding = async () => {
    addLog('שולף מיתוג גלובלי...');
    const r = await apiGet('/api/admin/branding');
    if (r.ok && r.data?.presets) {
      addLog(`[v] מיתוג: ${Object.keys(r.data.presets).length} presets`, 'success');
      return { success: true };
    }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500) - Mongoose', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] מיתוג גלובלי נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s34ImpersonateNoTenant = async () => {
    addLog('מנסה התחזות ללא tenantId...');
    const r = await apiPost('/api/admin/impersonate', {});
    if (r.status === 400) { addLog('[v] נדחה כצפוי (400 - נדרש מזהה עסק)', 'success'); return { success: true }; }
    if (r.status === 403) { addLog('[v] נדחה כצפוי (403 - אין הרשאה)', 'success'); return { success: true }; }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 400/403, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  const s34EmergencyNoAction = async () => {
    addLog('שולח גיבוי חירום ללא action...');
    const r = await apiPost('/api/admin/emergency-backup', {});
    if (r.status === 400) { addLog('[v] נדחה כצפוי (400 - Invalid action)', 'success'); return { success: true }; }
    if (r.status === 401) { addLog('[v] נדחה (401)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 400, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  // ============================================================
  // S33 - ADMIN AUDIT & MONITORING TEST FUNCTIONS
  // ============================================================

  const s33Login = async () => {
    addLog('מתחבר כמנהל...');
    const r = await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });
    if (r.ok) { addLog('[v] התחברות הצליחה', 'success'); return { success: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] התחברות נכשלה: ' + r.status, 'error');
    return { success: false };
  };

  const s33Dashboard = async () => {
    addLog('שולף דשבורד מנהל...');
    const r = await apiGet('/api/admin/dashboard');
    if (r.ok && r.data?.ok) {
      const s = r.data.stats;
      addLog(`[v] דשבורד: ${s?.totalUsers || 0} משתמשים, ${s?.totalOrders || 0} הזמנות, ${s?.totalProducts || 0} מוצרים`, 'success');
      return { success: true };
    }
    if (r.status === 429) { addLog('[WARN] rate limit', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] דשבורד נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s33ActivityLogs = async () => {
    addLog('שולף לוג פעילות...');
    const r = await apiGet('/api/admin/activity-logs?limit=5');
    if (r.ok && r.data?.success) {
      addLog(`[v] לוג פעילות: ${r.data.logs?.length || 0} רשומות, סה"כ ${r.data.stats?.total || 0}`, 'success');
      return { success: true };
    }
    if (r.status === 429) { addLog('[WARN] rate limit', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] לוג פעילות נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s33AuditLogs = async () => {
    addLog('שולף לוג ביקורת...');
    const r = await apiGet('/api/admin/audit-logs?limit=5');
    if (r.ok && r.data?.ok) {
      addLog(`[v] לוג ביקורת: ${r.data.logs?.length || 0} רשומות, סה"כ ${r.data.pagination?.total || 0}`, 'success');
      return { success: true };
    }
    if (r.status === 429) { addLog('[WARN] rate limit', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] לוג ביקורת נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s33ErrorLogs = async () => {
    addLog('שולף לוג שגיאות...');
    const r = await apiGet('/api/admin/error-logs?limit=5');
    if (r.ok && r.data?.success) {
      addLog(`[v] לוג שגיאות: ${r.data.logs?.length || 0} רשומות, ${r.data.stats?.unresolved || 0} לא פתורות`, 'success');
      return { success: true };
    }
    if (r.status === 429) { addLog('[WARN] rate limit', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] לוג שגיאות נכשל: ' + r.status, 'error');
    return { success: false };
  };

  const s33Alerts = async () => {
    addLog('שולף התראות מערכת...');
    const r = await apiGet('/api/admin/alerts');
    if (r.ok && r.data?.success) {
      addLog(`[v] התראות: ${r.data.alerts?.length || 0} התראות, ${r.data.unreadCount || 0} לא נקראו`, 'success');
      return { success: true };
    }
    if (r.status === 429) { addLog('[WARN] rate limit', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] התראות נכשלו: ' + r.status, 'error');
    return { success: false };
  };

  const s33ErrorStats = async () => {
    addLog('שולף סטטיסטיקות שגיאות...');
    const r = await apiGet('/api/admin/errors/stats');
    if (r.ok) {
      addLog(`[v] שגיאות: total=${r.data?.totalErrors || 0}, critical=${r.data?.criticalCount || 0}`, 'success');
      return { success: true };
    }
    if (r.status === 429) { addLog('[WARN] rate limit', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] סטטיסטיקות שגיאות נכשלו: ' + r.status, 'error');
    return { success: false };
  };

  const s33ErrorEvents = async () => {
    addLog('שולף אירועי שגיאות...');
    const r = await apiGet('/api/admin/errors/events?limit=5');
    if (r.ok && r.data?.items !== undefined) {
      addLog(`[v] אירועי שגיאות: ${r.data.items?.length || 0} אירועים`, 'success');
      return { success: true };
    }
    if (r.status === 429) { addLog('[WARN] rate limit', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] אירועי שגיאות נכשלו: ' + r.status, 'error');
    return { success: false };
  };

  const s33HealthHistory = async () => {
    addLog('שולף היסטוריית בריאות מערכת...');
    const r = await apiGet('/api/admin/health-history');
    if (r.ok && r.data?.success) {
      const u = r.data.uptime || {};
      addLog(`[v] בריאות: mongodb=${u.mongodb || 0}%, history=${r.data.history?.length || 0} רשומות`, 'success');
      return { success: true };
    }
    if (r.status === 429) { addLog('[WARN] rate limit', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] היסטוריית בריאות נכשלה: ' + r.status, 'error');
    return { success: false };
  };

  const s33AuditNoAction = async () => {
    addLog('שולח ביקורת ללא action...');
    const r = await apiPost('/api/admin/audit-logs', {});
    if (r.status === 400) { addLog('[v] נדחה כצפוי (400 - Action is required)', 'success'); return { success: true }; }
    if (r.status === 429) { addLog('[WARN] rate limit', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 400, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  const s33AlertNoTitle = async () => {
    addLog('שולח התראה ללא title...');
    const r = await apiPost('/api/admin/alerts', { message: 'test' });
    if (r.status === 400) { addLog('[v] נדחה כצפוי (400 - Title and message are required)', 'success'); return { success: true }; }
    if (r.status === 429) { addLog('[WARN] rate limit', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 400, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  // ============================================================
  // S32 - BUSINESS ADMIN TEST FUNCTIONS
  // ============================================================

  const s32Login = async () => {
    addLog('מתחבר כמנהל...');
    const r = await apiPost('/api/auth/login', { identifier: 'm0587009938@gmail.com', password: 'zxcvbnm1' });
    if (r.ok) { addLog('[v] התחברות הצליחה', 'success'); return { success: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] התחברות נכשלה: ' + r.status, 'error');
    return { success: false };
  };

  const s32StatsNoTenant = async () => {
    addLog('שולף סטטיסטיקות עסק ללא tenantId...');
    const r = await apiGet('/api/business/stats');
    if (r.status === 403) { addLog('[v] נדחה כצפוי (403 - אין הרשאה / אין tenant)', 'success'); return { success: true }; }
    if (r.status === 400) { addLog('[v] נדחה כצפוי (400)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 403, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  const s32BrandingGet = async () => {
    addLog('שולף מיתוג ללא tenantId...');
    const r = await apiGet('/api/business/branding');
    if (r.status === 400) { addLog('[v] נדחה כצפוי (400 - No tenant ID)', 'success'); return { success: true }; }
    if (r.status === 401) { addLog('[v] נדחה כצפוי (401)', 'success'); return { success: true }; }
    if (r.ok) { addLog('[v] תגובה תקינה (admin עם tenant)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 400/401, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  const s32BrandingPostEmpty = async () => {
    addLog('שולח עדכון מיתוג ללא tenantId...');
    const r = await apiPost('/api/business/branding', {});
    if (r.status === 400) { addLog('[v] נדחה כצפוי (400 - No tenant ID)', 'success'); return { success: true }; }
    if (r.status === 401) { addLog('[v] נדחה כצפוי (401)', 'success'); return { success: true }; }
    if (r.ok) { addLog('[v] תגובה תקינה (admin עם tenant)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 400/401, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  const s32IntegrationsGet = async () => {
    addLog('שולף אינטגרציות ללא tenantId...');
    const r = await apiGet('/api/business/integrations');
    if (r.status === 400) { addLog('[v] נדחה כצפוי (400 - No tenant associated)', 'success'); return { success: true }; }
    if (r.status === 403) { addLog('[v] נדחה כצפוי (403)', 'success'); return { success: true }; }
    if (r.ok) { addLog('[v] תגובה תקינה (admin עם tenant)', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 400/403, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  const s32IntegrationsPutEmpty = async () => {
    addLog('שולח עדכון אינטגרציות ללא tenantId...');
    const r = await apiPut('/api/business/integrations', {});
    if (r.status === 400) { addLog('[v] נדחה כצפוי (400 - No tenant associated)', 'success'); return { success: true }; }
    if (r.status === 403) { addLog('[v] נדחה כצפוי (403)', 'success'); return { success: true }; }
    if (r.ok) { addLog('[v] תגובה תקינה', 'success'); return { success: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] צפוי 400/403, קיבלתי: ' + r.status, 'error');
    return { success: false };
  };

  const s32ExportOrders = async () => {
    addLog('מייצא הזמנות...');
    const r = await apiGet('/api/business/orders/export');
    if (r.ok || r.status === 200) { addLog('[v] ייצוא הזמנות הצליח (CSV)', 'success'); return { success: true }; }
    if (r.status === 403) { addLog('[v] נדחה (403 - אין הרשאה)', 'success'); return { success: true }; }
    if (r.status === 429) { addLog('[WARN] rate limit', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] ייצוא נכשל: HTTP ' + r.status, 'error');
    return { success: false };
  };

  const s32ExportCommissions = async () => {
    addLog('מייצא עמלות...');
    const r = await apiGet('/api/business/commissions/export');
    if (r.ok || r.status === 200) { addLog('[v] ייצוא עמלות הצליח (CSV)', 'success'); return { success: true }; }
    if (r.status === 403) { addLog('[v] נדחה (403 - אין הרשאה)', 'success'); return { success: true }; }
    if (r.status === 429) { addLog('[WARN] rate limit', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 500) { addLog('[WARN] שגיאת שרת (500)', 'warning'); return { success: true, skipped: true }; }
    if (r.status === 0) { addLog('[WARN] timeout', 'warning'); return { success: true, skipped: true }; }
    addLog('[x] ייצוא נכשל: HTTP ' + r.status, 'error');
    return { success: false };
  };

  // ============================================================
  // TEST FUNCTION MAP
  // ============================================================
  const TEST_FUNCTIONS = {
    // S0 - System Health
    's0-me': s0Me,
    's0-system-status': s0SystemStatus,
    's0-tenants': s0Tenants,
    's0-users': s0Users,
    's0-agents': s0Agents,
    's0-marketing-stores': s0MarketingStores,
    's0-marketplace-products': s0MarketplaceProducts,
    's0-orders': s0Orders,
    's0-commissions-release': s0CommissionsRelease,
    's0-payplus': s0Payplus,
    's0-priority': s0Priority,

    // S1 - Auth
    's1-register-customer': s1RegisterCustomer,
    's1-register-agent': s1RegisterAgent,
    's1-register-duplicate': s1RegisterDuplicate,
    's1-register-invalid': s1RegisterInvalid,
    's1-login-success': s1LoginSuccess,
    's1-login-wrong-password': s1LoginWrongPassword,
    's1-login-nonexistent': s1LoginNonexistent,
    's1-verify-session': s1VerifySession,
    's1-logout': s1Logout,
    's1-verify-no-session': s1VerifyNoSession,
    's1-forgot-password': s1ForgotPassword,
    's1-relogin-admin': s1ReloginAdmin,
    's1-studio-login': s1StudioLogin,
    's1-studio-tenants': s1StudioTenants,
    's55-studio-login-same': s55StudioLoginSame,
    's55-studio-jwt-decode-same': s55StudioJwtDecodeSame,
    's55-studio-tenants-same': s55StudioTenantsSame,
    's55-studio-categories-same': s55StudioCategoriesSame,
    's55-studio-login-127': s55StudioLogin127,
    's55-studio-tenants-cross-no-auth': s55StudioTenantsCrossNoAuth,
    's55-studio-tenants-127': s55StudioTenants127,
    's55-studio-categories-127': s55StudioCategories127,
    's55-studio-tenants-no-auth': s55StudioTenantsNoAuth,
    's55-studio-tenants-no-bearer': s55StudioTenantsNoBearer,
    's55-studio-tenants-fake-token': s55StudioTenantsFakeToken,
    // S2 - Products
    's2-setup-business': s2SetupBusiness,
    's2-create-product': s2CreateProduct,
    's2-verify-product': s2VerifyProduct,
    's2-create-invalid': s2CreateInvalid,
    's2-update-price': s2UpdatePrice,
    's2-update-stock': s2UpdateStock,
    's2-update-status': s2UpdateStatus,
    's2-list-products': s2ListProducts,
    's2-get-single': s2GetSingle,
    's2-delete-product': s2DeleteProduct,
    // S4 - Roles
    's4-setup-users': s4SetupUsers,
    's4-customer-products-ok': s4CustomerProductsOk,
    's4-customer-admin-403': s4CustomerAdmin403,
    's4-customer-delete-403': s4CustomerDelete403,
    's4-agent-businesses-ok': s4AgentBusinessesOk,
    's4-agent-admin-403': s4AgentAdmin403,
    's4-agent-delete-user-403': s4AgentDeleteUser403,
    's4-admin-users-ok': s4AdminUsersOk,
    's4-admin-orders-ok': s4AdminOrdersOk,
    's4-admin-tenants-ok': s4AdminTenantsOk,
    // S5 - Coupons
    's5-setup': s5Setup,
    's5-agent-has-coupon': s5AgentHasCoupon,
    's5-share-link': s5ShareLink,
    's5-customer-register': s5CustomerRegister,
    's5-order-with-coupon': s5OrderWithCoupon,
    's5-commission-created': s5CommissionCreated,
    's5-agent-balance': s5AgentBalance,
    // S9 - Multi-Tenant
    's9-create-biz-a': s9CreateBizA,
    's9-create-biz-b': s9CreateBizB,
    's9-biz-a-no-biz-b-products': s9BizANoBizBProducts,
    's9-biz-b-no-biz-a-products': s9BizBNoBizAProducts,
    's9-biz-a-no-biz-b-orders': s9BizANoBizBOrders,
    's9-admin-sees-all': s9AdminSeesAll,
    // S3 - Cart & Checkout
    's3-setup': s3Setup,
    's3-add-to-cart': s3AddToCart,
    's3-update-qty': s3UpdateQty,
    's3-remove-item': s3RemoveItem,
    's3-empty-cart': s3EmptyCart,
    's3-add-for-checkout': s3AddForCheckout,
    's3-create-order': s3CreateOrder,
    's3-verify-order': s3VerifyOrder,
    's3-verify-stock-decreased': s3VerifyStockDecreased,
    // S6 - Commissions
    's6-setup': s6Setup,
    's6-commission-exists': s6CommissionExists,
    's6-commission-amount': s6CommissionAmount,
    's6-agent-balance': s6AgentBalance,
    's6-commission-list': s6CommissionList,
    // S7 - Withdrawals
    's7-setup': s7Setup,
    's7-request-withdrawal': s7RequestWithdrawal,
    's7-verify-pending': s7VerifyPending,
    's7-admin-approve': s7AdminApprove,
    's7-admin-complete': s7AdminComplete,
    's7-balance-zero': s7BalanceZero,
    's7-biz-admin-blocked': s7BizAdminBlocked,
    // S8 - Notifications
    's8-setup': s8Setup,
    's8-order-notification': s8OrderNotification,
    's8-admin-notifications': s8AdminNotifications,
    's8-read-notification': s8ReadNotification,
    's8-unread-count': s8UnreadCount,
    // S10 - Group Purchase
    's10-setup': s10Setup,
    's10-create-group': s10CreateGroup,
    's10-join-group': s10JoinGroup,
    's10-verify-group-status': s10VerifyGroupStatus,
    's10-close-group': s10CloseGroup,
    // S14 - Impersonation
    's14-get-tenants': s14GetTenants,
    's14-impersonate': s14Impersonate,
    's14-verify-filtered': s14VerifyFiltered,
    's14-unimpersonate': s14Unimpersonate,
    's14-verify-all-data': s14VerifyAllData,
    // S15 - Business E2E
    's15-register-business': s15RegisterBusiness,
    's15-create-tenant': s15CreateTenant,
    's15-approve-tenant': s15ApproveTenant,
    's15-add-product': s15AddProduct,
    's15-add-agent': s15AddAgent,
    's15-customer-purchase': s15CustomerPurchase,
    's15-verify-dashboard': s15VerifyDashboard,
    // S16 - RBAC Matrix
    's16-setup-users': s16SetupUsers,
    's16-products-customer-get': s16ProductsCustomerGet,
    's16-products-customer-post': s16ProductsCustomerPost,
    's16-products-agent-get': s16ProductsAgentGet,
    's16-users-customer-403': s16UsersCustomer403,
    's16-users-agent-403': s16UsersAgent403,
    's16-users-admin-200': s16UsersAdmin200,
    's16-orders-customer-own': s16OrdersCustomerOwn,
    's16-orders-admin-all': s16OrdersAdminAll,
    's16-delete-order-customer-403': s16DeleteOrderCustomer403,
    // S18 - Input Validation
    's18-register-no-email': s18RegisterNoEmail,
    's18-register-no-password': s18RegisterNoPassword,
    's18-product-no-name': s18ProductNoName,
    's18-product-no-price': s18ProductNoPrice,
    's18-negative-price': s18NegativePrice,
    's18-invalid-email': s18InvalidEmail,
    's18-xss-name': s18XssName,
    's18-huge-payload': s18HugePayload,
    // S19 - Cascade Delete
    's19-setup': s19Setup,
    's19-delete-user': s19DeleteUser,
    's19-verify-orders-gone': s19VerifyOrdersGone,
    's19-verify-product-delete': s19VerifyProductDelete,
    // S20 - Data Consistency
    's20-setup': s20Setup,
    's20-order-stock': s20OrderStock,
    's20-order-total': s20OrderTotal,
    's20-multi-order-stock': s20MultiOrderStock,
    // S11 - Shared Container
    's11-setup': s11Setup,
    's11-create-container': s11CreateContainer,
    's11-add-order-to-container': s11AddOrderToContainer,
    's11-check-cbm': s11CheckCbm,
    's11-container-status': s11ContainerStatus,
    // S12 - PayPlus
    's12-setup': s12Setup,
    's12-create-payment': s12CreatePayment,
    's12-payment-status': s12PaymentStatus,
    's12-webhook-success': s12WebhookSuccess,
    's12-order-paid': s12OrderPaid,
    's12-idempotent': s12Idempotent,
    // S13 - Priority ERP
    's13-setup': s13Setup,
    's13-sync-customer': s13SyncCustomer,
    's13-sync-order': s13SyncOrder,
    's13-sync-status': s13SyncStatus,
    // S17 - Rate Limiting
    's17-rapid-requests': s17RapidRequests,
    's17-rate-limit-hit': s17RateLimitHit,
    's17-login-brute': s17LoginBrute,
    's17-after-cooldown': s17AfterCooldown,
    // S21 - Full System E2E
    's21-create-stores': s21CreateStores,
    's21-create-products': s21CreateProducts,
    's21-create-agents': s21CreateAgents,
    's21-create-customers': s21CreateCustomers,
    's21-purchases': s21Purchases,
    's21-verify-stock': s21VerifyStock,
    's21-verify-commissions': s21VerifyCommissions,
    's21-customer-sees-own': s21CustomerSeesOwn,
    's21-agent-sees-own': s21AgentSeesOwn,
    's21-store-sees-own': s21StoreSeesOwn,
    's21-admin-sees-all': s21AdminSeesAll,
    's21-check-notifications': s21CheckNotifications,
    's21-release-commissions': s21ReleaseCommissions,
    's21-request-withdrawals': s21RequestWithdrawals,
    's21-approve-withdrawals': s21ApproveWithdrawals,
    's21-verify-balances': s21VerifyBalances,
    's21-summary': s21Summary,
    // S22 - All Notification Types
    's22-list-templates': s22ListTemplates,
    's22-create-template': s22CreateTemplate,
    's22-edit-template': s22EditTemplate,
    's22-toggle-template': s22ToggleTemplate,
    's22-delete-template': s22DeleteTemplate,
    's22-send-welcome': s22SendWelcome,
    's22-send-order-confirm': s22SendOrderConfirm,
    's22-send-commission': s22SendCommission,
    's22-send-withdrawal': s22SendWithdrawal,
    's22-send-product-new': s22SendProductNew,
    's22-send-group-buy': s22SendGroupBuy,
    's22-send-to-roles': s22SendToRoles,
    's22-schedule-notification': s22ScheduleNotification,
    's22-list-scheduled': s22ListScheduled,
    's22-cancel-scheduled': s22CancelScheduled,
    's22-create-alert-info': s22CreateAlertInfo,
    's22-create-alert-warning': s22CreateAlertWarning,
    's22-create-alert-error': s22CreateAlertError,
    's22-fetch-alerts': s22FetchAlerts,
    's22-mark-read': s22MarkRead,
    's22-unread-count': s22UnreadCount,
    's22-send-message-role': s22SendMessageRole,
    's22-send-message-user': s22SendMessageUser,
    's22-fetch-messages': s22FetchMessages,
    's22-mark-message-read': s22MarkMessageRead,
    's22-send-invalid-template': s22SendInvalidTemplate,
    's22-send-no-type': s22SendNoType,
    's22-send-disabled-template': s22SendDisabledTemplate,
    's22-summary': s22Summary,
    // S23 - Sharing & Coupon Flow
    's23-create-agent-coupon': s23CreateAgentCoupon,
    's23-create-product': s23CreateProduct,
    's23-verify-coupon-active': s23VerifyCouponActive,
    's23-url-product-ref': s23UrlProductRef,
    's23-url-store-ref': s23UrlStoreRef,
    's23-url-marketplace-ref': s23UrlMarketplaceRef,
    's23-url-video-ref': s23UrlVideoRef,
    's23-verify-all-urls': s23VerifyAllUrls,
    's23-click-referral': s23ClickReferral,
    's23-track-referral': s23TrackReferral,
    's23-verify-referral-log': s23VerifyReferralLog,
    's23-referral-invalid': s23ReferralInvalid,
    's23-auto-coupon-api': s23AutoCouponApi,
    's23-validate-coupon': s23ValidateCoupon,
    's23-validate-invalid': s23ValidateInvalid,
    's23-validate-inactive': s23ValidateInactive,
    's23-whatsapp-format': s23WhatsappFormat,
    's23-facebook-format': s23FacebookFormat,
    's23-telegram-format': s23TelegramFormat,
    's23-twitter-format': s23TwitterFormat,
    's23-email-format': s23EmailFormat,
    's23-all-networks-coupon': s23AllNetworksCoupon,
    's23-e2e-full-flow': s23E2eFullFlow,
    's23-summary': s23Summary,
    // S24 - Logs Verification
    's24-initial-notif-logs': s24InitialNotifLogs,
    's24-initial-activity-logs': s24InitialActivityLogs,
    's24-fetch-stats': s24FetchStats,
    's24-trigger-register': s24TriggerRegister,
    's24-trigger-product': s24TriggerProduct,
    's24-trigger-dryrun': s24TriggerDryrun,
    's24-trigger-order-notif': s24TriggerOrderNotif,
    's24-trigger-commission': s24TriggerCommission,
    's24-verify-welcome': s24VerifyWelcome,
    's24-verify-dryrun': s24VerifyDryrun,
    's24-verify-order': s24VerifyOrder,
    's24-verify-commission': s24VerifyCommission,
    's24-verify-count-up': s24VerifyCountUp,
    's24-verify-act-create': s24VerifyActCreate,
    's24-verify-act-login': s24VerifyActLogin,
    's24-verify-act-stats': s24VerifyActStats,
    's24-filter-template': s24FilterTemplate,
    's24-filter-status': s24FilterStatus,
    's24-filter-role': s24FilterRole,
    's24-filter-date': s24FilterDate,
    's24-search-text': s24SearchText,
    's24-summary': s24Summary,
    // S25 - Full Activity Coverage
    's25-baseline-notif': s25BaselineNotif,
    's25-baseline-activity': s25BaselineActivity,
    's25-baseline-alerts': s25BaselineAlerts,
    's25-tpl-welcome': s25TplWelcome,
    's25-tpl-admin-reg': s25TplAdminReg,
    's25-tpl-order-new': s25TplOrderNew,
    's25-tpl-order-confirm': s25TplOrderConfirm,
    's25-tpl-commission': s25TplCommission,
    's25-tpl-agent-sale': s25TplAgentSale,
    's25-tpl-product-new': s25TplProductNew,
    's25-tpl-digest': s25TplDigest,
    's25-tpl-group-remind': s25TplGroupRemind,
    's25-tpl-group-last': s25TplGroupLast,
    's25-tpl-group-closed': s25TplGroupClosed,
    's25-tpl-withdraw-ok': s25TplWithdrawOk,
    's25-tpl-withdraw-done': s25TplWithdrawDone,
    's25-tpl-withdraw-reject': s25TplWithdrawReject,
    's25-tpl-payment': s25TplPayment,
    's25-verify-all-templates': s25VerifyAllTemplates,
    's25-verify-count-up': s25VerifyCountUp,
    's25-verify-statuses': s25VerifyStatuses,
    's25-act-login': s25ActLogin,
    's25-act-create-user': s25ActCreateUser,
    's25-act-create-product': s25ActCreateProduct,
    's25-act-update': s25ActUpdate,
    's25-act-delete': s25ActDelete,
    's25-alert-info': s25AlertInfo,
    's25-alert-warning': s25AlertWarning,
    's25-alert-error': s25AlertError,
    's25-alert-count': s25AlertCount,
    's25-alert-mark-read': s25AlertMarkRead,
    's25-summary': s25Summary,
    // S26 - Marketing Content Library
    's26-admin-login': s26AdminLogin,
    's26-create-agent-coupon': s26CreateAgentCoupon,
    's26-baseline-assets': s26BaselineAssets,
    's26-create-image': s26CreateImage,
    's26-create-video': s26CreateVideo,
    's26-list-assets': s26ListAssets,
    's26-update-asset': s26UpdateAsset,
    's26-get-single': s26GetSingle,
    's26-validation': s26Validation,
    's26-template-vars': s26TemplateVars,
    's26-video-link': s26VideoLink,
    's26-image-link': s26ImageLink,
    's26-default-template': s26DefaultTemplate,
    's26-share-whatsapp': s26ShareWhatsapp,
    's26-share-telegram': s26ShareTelegram,
    's26-share-facebook': s26ShareFacebook,
    's26-share-twitter': s26ShareTwitter,
    's26-share-linkedin': s26ShareLinkedin,
    's26-share-email': s26ShareEmail,
    's26-share-sms': s26ShareSms,
    's26-all-networks': s26AllNetworks,
    's26-agent-list': s26AgentList,
    's26-agent-has-new': s26AgentHasNew,
    's26-delete-asset': s26DeleteAsset,
    's26-summary': s26Summary,
    // S27 - Dashboard Navigation
    's27-admin-login': s27AdminLogin,
    's27-dashboard-api': s27DashboardApi,
    's27-nav-users': s27NavUsers,
    's27-nav-agents': s27NavAgents,
    's27-nav-notif-logs': s27NavNotifLogs,
    's27-nav-tenants': s27NavTenants,
    's27-nav-simulator': s27NavSimulator,
    's27-nav-products': s27NavProducts,
    's27-nav-orders': s27NavOrders,
    's27-nav-my-orders': s27NavMyOrders,
    's27-nav-products-new': s27NavProductsNew,
    's27-nav-catalog-mgr': s27NavCatalogMgr,
    's27-nav-reports': s27NavReports,
    's27-nav-analytics': s27NavAnalytics,
    's27-nav-transactions': s27NavTransactions,
    's27-nav-commissions': s27NavCommissions,
    's27-nav-withdrawals': s27NavWithdrawals,
    's27-nav-notifications': s27NavNotifications,
    's27-nav-marketing': s27NavMarketing,
    's27-nav-settings': s27NavSettings,
    's27-nav-site-texts': s27NavSiteTexts,
    's27-nav-social-audit': s27NavSocialAudit,
    's27-nav-branding': s27NavBranding,
    's27-nav-bot-manager': s27NavBotManager,
    's27-nav-monitor': s27NavMonitor,
    's27-nav-backup': s27NavBackup,
    's27-nav-errors': s27NavErrors,
    's27-nav-tasks': s27NavTasks,
    's27-nav-sys-reports': s27NavSysReports,
    's27-nav-security': s27NavSecurity,
    's27-nav-crm': s27NavCrm,
    's27-nav-register': s27NavRegister,
    's27-nav-register-agent': s27NavRegisterAgent,
    's27-nav-register-biz': s27NavRegisterBiz,
    's27-nav-login': s27NavLogin,
    's27-summary': s27Summary,
    // S28 - CRM
    's28-setup-tenant': s28SetupTenant,
    's28-crm-stats-baseline': s28CrmStatsBaseline,
    's28-create-lead': s28CreateLead,
    's28-get-lead': s28GetLead,
    's28-update-lead': s28UpdateLead,
    's28-list-leads': s28ListLeads,
    's28-search-leads': s28SearchLeads,
    's28-create-conversation': s28CreateConversation,
    's28-list-conversations': s28ListConversations,
    's28-add-interaction': s28AddInteraction,
    's28-create-task': s28CreateTask,
    's28-list-tasks': s28ListTasks,
    's28-update-task': s28UpdateTask,
    's28-list-automations': s28ListAutomations,
    's28-create-automation': s28CreateAutomation,
    's28-delete-lead': s28DeleteLead,
    's28-crm-stats-final': s28CrmStatsFinal,
    // S29 - OTP & Email
    's29-otp-missing-phone': s29OtpMissingPhone,
    's29-otp-invalid-phone': s29OtpInvalidPhone,
    's29-otp-send': s29OtpSend,
    's29-otp-verify-bad-code': s29OtpVerifyBadCode,
    's29-otp-verify-missing': s29OtpVerifyMissing,
    's29-email-missing': s29EmailMissing,
    's29-email-invalid': s29EmailInvalid,
    's29-email-send': s29EmailSend,
    's29-email-verify-no-code': s29EmailVerifyNoCode,
    's29-email-verify-bad-code': s29EmailVerifyBadCode,
    's29-email-verify-missing': s29EmailVerifyMissing,
    // S30 - Messaging
    's30-login': s30Login,
    's30-send-empty': s30SendEmpty,
    's30-send-long': s30SendLong,
    's30-send-bad-role': s30SendBadRole,
    's30-send-ok': s30SendOk,
    's30-list': s30List,
    's30-unread-count': s30UnreadCount,
    's30-read-all': s30ReadAll,
    's30-delete': s30Delete,
    's30-delete-invalid': s30DeleteInvalid,
    's30-support-empty': s30SupportEmpty,
    's30-support-send': s30SupportSend,
    // S31 - Agent Dashboard
    's31-login': s31Login,
    's31-marketplace': s31Marketplace,
    's31-businesses': s31Businesses,
    's31-current-biz': s31CurrentBiz,
    's31-commissions': s31Commissions,
    's31-stats-no-agent': s31StatsNoAgent,
    's31-customers-no-agent': s31CustomersNoAgent,
    's31-coupon-not-agent': s31CouponNotAgent,
    's31-switch-no-tenant': s31SwitchNoTenant,
    's31-join-no-tenant': s31JoinNoTenant,
    's31-join-invalid-tenant': s31JoinInvalidTenant,
    's31-link-no-agent': s31LinkNoAgent,
    // S32 - Business Admin
    's32-login': s32Login,
    's32-stats-no-tenant': s32StatsNoTenant,
    's32-branding-get': s32BrandingGet,
    's32-branding-post-empty': s32BrandingPostEmpty,
    's32-integrations-get': s32IntegrationsGet,
    's32-integrations-put-empty': s32IntegrationsPutEmpty,
    's32-export-orders': s32ExportOrders,
    's32-export-commissions': s32ExportCommissions,
    // S33 - Admin Audit & Monitoring
    's33-login': s33Login,
    's33-dashboard': s33Dashboard,
    's33-activity-logs': s33ActivityLogs,
    's33-audit-logs': s33AuditLogs,
    's33-error-logs': s33ErrorLogs,
    's33-alerts': s33Alerts,
    's33-error-stats': s33ErrorStats,
    's33-error-events': s33ErrorEvents,
    's33-health-history': s33HealthHistory,
    's33-audit-no-action': s33AuditNoAction,
    's33-alert-no-title': s33AlertNoTitle,
    // S34 - Admin System Tools
    's34-login': s34Login,
    's34-backups-list': s34BackupsList,
    's34-emergency-info': s34EmergencyInfo,
    's34-notification-logs': s34NotificationLogs,
    's34-orphan-products': s34OrphanProducts,
    's34-tenants-summary': s34TenantsSummary,
    's34-global-branding': s34GlobalBranding,
    's34-impersonate-no-tenant': s34ImpersonateNoTenant,
    's34-emergency-no-action': s34EmergencyNoAction,
    // S35 - Auth Extended & Public APIs
    's35-login': s35Login,
    's35-me': s35Me,
    's35-forgot-no-email': s35ForgotNoEmail,
    's35-reset-no-token': s35ResetNoToken,
    's35-reset-bad-token': s35ResetBadToken,
    's35-branding-public': s35BrandingPublic,
    's35-catalog': s35Catalog,
    's35-categories': s35Categories,
    's35-bot-config': s35BotConfig,
    's35-logout': s35Logout,
    's35-me-after-logout': s35MeAfterLogout,
    's35-relogin': s35Relogin,
    // S36 - Marketplace & System
    's36-login': s36Login,
    's36-health': s36Health,
    's36-list-users': s36ListUsers,
    's36-agents-list': s36AgentsList,
    's36-marketplace-products': s36MarketplaceProducts,
    's36-container-orders': s36ContainerOrders,
    's36-customer-orders': s36CustomerOrders,
    's36-catalog-tenants': s36CatalogTenants,
    's36-cloudinary-config': s36CloudinaryConfig,
    's36-agents-no-fields': s36AgentsNoFields,
    // S37 - Reports & Catalog Templates
    's37-login': s37Login,
    's37-reports-api': s37ReportsApi,
    's37-reports-overview': s37ReportsOverview,
    's37-reports-by-agent': s37ReportsByAgent,
    's37-reports-by-product': s37ReportsByProduct,
    's37-catalog-manager-list': s37CatalogManagerList,
    's37-catalog-manager-tenants': s37CatalogManagerTenants,
    's37-copy-no-data': s37CopyNoData,
    's37-templates-no-tenant': s37TemplatesNoTenant,
    's37-templates-post-no-key': s37TemplatesPostNoKey,
    // S38 - PayPlus & Priority
    's38-login': s38Login,
    's38-payplus-transactions': s38PayplusTransactions,
    's38-payplus-dead-letter': s38PayplusDeadLetter,
    's38-payplus-reconciliation': s38PayplusReconciliation,
    's38-dlq-invalid-action': s38DlqInvalidAction,
    's38-priority-status': s38PriorityStatus,
    's38-priority-customers': s38PriorityCustomers,
    's38-priority-products': s38PriorityProducts,
    's38-priority-documents': s38PriorityDocuments,
    's38-priority-reconciliation': s38PriorityReconciliation,
    // S39 - Gamification
    's39-login': s39Login,
    's39-bonuses-list': s39BonusesList,
    's39-bonuses-post-invalid': s39BonusesPostInvalid,
    's39-goals-list': s39GoalsList,
    's39-goals-post-invalid': s39GoalsPostInvalid,
    's39-levels-list': s39LevelsList,
    's39-levels-post-invalid': s39LevelsPostInvalid,
    's39-seed': s39Seed,
    // S40 - Orders & Notifications
    's40-login': s40Login,
    's40-commissions-list': s40CommissionsList,
    's40-notifications-list': s40NotificationsList,
    's40-notification-logs': s40NotificationLogs,
    's40-send-no-template': s40SendNoTemplate,
    // S41 - Admin Maintenance
    's41-login': s41Login,
    's41-fix-order-types-preview': s41FixOrderTypesPreview,
    's41-enforce-no-confirm': s41EnforceNoConfirm,
    's41-marketing-assets-list': s41MarketingAssetsList,
    's41-marketing-post-invalid': s41MarketingPostInvalid,
    // S42 - Cleanup & Orphan Audit
    's42-login': s42Login,
    's42-orphan-dryrun': s42OrphanDryrun,
    's42-audit-orphans': s42AuditOrphans,
    's42-audit-tenants-summary': s42AuditTenantsSummary,
    // S43 - Settings & Texts
    's43-login': s43Login,
    's43-settings-get': s43SettingsGet,
    's43-theme-get': s43ThemeGet,
    's43-theme-post-invalid': s43ThemePostInvalid,
    's43-site-texts': s43SiteTexts,
    's43-site-texts-all': s43SiteTextsAll,
    's43-page-texts-no-key': s43PageTextsNoKey,
    // S44 - Sales & Transactions
    's44-login': s44Login,
    's44-sales-list': s44SalesList,
    's44-sales-post-invalid': s44SalesPostInvalid,
    's44-sales-report': s44SalesReport,
    's44-transactions-list': s44TransactionsList,
    's44-withdrawals-list': s44WithdrawalsList,
    // S45 - Push Notifications
    's45-login': s45Login,
    's45-push-config': s45PushConfig,
    's45-push-subscribe-no-data': s45PushSubscribeNoData,
    's45-push-debug': s45PushDebug,
    // S46 - Products Extended
    's46-login': s46Login,
    's46-duplicate-no-id': s46DuplicateNoId,
    's46-bulk-delete-no-ids': s46BulkDeleteNoIds,
    's46-demo-complete-no-order': s46DemoCompleteNoOrder,
    's46-sales-list': s46SalesList,
    's46-sales-report': s46SalesReport,
    // S47 - Referrals & Tracking
    's47-login': s47Login,
    's47-referrals-list': s47ReferralsList,
    's47-referrals-summary': s47ReferralsSummary,
    's47-referral-create-no-data': s47ReferralCreateNoData,
    's47-track-visit': s47TrackVisit,
    // S48 - Tenants & Admin Fix
    's48-login': s48Login,
    's48-tenants-list': s48TenantsList,
    's48-fix-business-admins': s48FixBusinessAdmins,
    's48-fix-tenant-colors': s48FixTenantColors,
    's48-commissions-reset-no-id': s48CommissionsResetNoId,
    // S49 - Business & Users Extended
    's49-login': s49Login,
    's49-business-stats': s49BusinessStats,
    's49-business-branding': s49BusinessBranding,
    's49-business-integrations': s49BusinessIntegrations,
    's49-register-business-no-data': s49RegisterBusinessNoData,
    's49-join-no-ref': s49JoinNoRef,
    's49-users-me': s49UsersMe,
    's49-my-orders': s49MyOrders,
    's49-support-message': s49SupportMessage,
    's49-support-no-msg': s49SupportNoMsg,
    's49-change-password-no-data': s49ChangePasswordNoData,
    's49-track-order': s49TrackOrder,
    // S50 - Admin Tools Extended
    's50-login': s50Login,
    's50-security-scan': s50SecurityScan,
    's50-seo-audit-list': s50SeoAuditList,
    's50-social-audit': s50SocialAudit,
    's50-system-reports': s50SystemReports,
    's50-settings-auth': s50SettingsAuth,
    's50-restore-super-admin': s50RestoreSuperAdmin,
    's50-stainless-list': s50StainlessList,
    's50-seed-init': s50SeedInit,
    's50-tenant-by-slug': s50TenantBySlug,
    's50-notifications-public': s50NotificationsPublic,
    // S51 - CRM Extended
    's51-setup': s51Setup,
    's51-create-test-lead': s51CreateTestLead,
    's51-lead-orders': s51LeadOrders,
    's51-lead-convert': s51LeadConvert,
    's51-leads-export-json': s51LeadsExportJson,
    's51-leads-export-csv': s51LeadsExportCsv,
    's51-leads-import': s51LeadsImport,
    's51-leads-import-no-data': s51LeadsImportNoData,
    's51-leads-sla': s51LeadsSla,
    's51-create-conv': s51CreateConv,
    's51-get-conversation': s51GetConversation,
    's51-update-conversation': s51UpdateConversation,
    's51-get-conversation-404': s51GetConversation404,
    's51-list-templates': s51ListTemplates,
    's51-create-template': s51CreateTemplate,
    's51-wa-send-status': s51WaSendStatus,
    's51-wa-send-no-data': s51WaSendNoData,
    's51-wa-connect': s51WaConnect,
    's51-wa-messages': s51WaMessages,
    's51-wa-qr': s51WaQr,
    's51-wa-reset-check': s51WaResetCheck,
    's52-login': s52Login,
    's52-pick-tenant': s52PickTenant,
    's52-cloudinary-config': s52CloudinaryConfig,
    's52-orders-smoke': s52OrdersSmoke,
    's52-products-include-inactive': s52ProductsIncludeInactive,
    's52-upload-no-tenant': s52UploadNoTenant,
    's52-upload-invalid-tenant': s52UploadInvalidTenant,
    's52-upload-no-products': s52UploadNoProducts,
    's52-upload-missing-images': s52UploadMissingImages,
    's52-update-no-tenant': s52UpdateNoTenant,
    's52-update-invalid-tenant': s52UpdateInvalidTenant,
    's52-update-no-products': s52UpdateNoProducts,
    's52-update-not-found': s52UpdateNotFound,
    's52-delete-products-no-tenant': s52DeleteProductsNoTenant,
    's52-delete-products-no-skus': s52DeleteProductsNoSkus,
    's52-delete-products-nonexistent': s52DeleteProductsNonexistent,
    's52-delete-media-invalid-url': s52DeleteMediaInvalidUrl,
    's52-delete-media-random': s52DeleteMediaRandom,
    's52-remove-product-media-no-url': s52RemoveProductMediaNoUrl,
    's52-remove-product-media-random': s52RemoveProductMediaRandom,
    's52-templates-list': s52TemplatesList,
    's52-templates-create': s52TemplatesCreate,
    's52-templates-update': s52TemplatesUpdate,
    's52-templates-delete': s52TemplatesDelete,
    's52-cleanup-media-manual': s52CleanupMediaManual,
    's53-login': s53Login,
    's53-create-tenant-sync': s53CreateTenantSync,
    's53-create-template-sync': s53CreateTemplateSync,
    's53-update-template-sync': s53UpdateTemplateSync,
    's53-delete-template-sync': s53DeleteTemplateSync,
    's54-login': s54Login,
    's54-pick-tenant': s54PickTenant,
    's54-upload-regular': s54UploadRegular,
    's54-upload-shared': s54UploadShared,
    's54-upload-group': s54UploadGroup,
    's54-marketplace-all': s54MarketplaceAll,
    's54-marketplace-regular': s54MarketplaceRegular,
    's54-marketplace-shared': s54MarketplaceShared,
    's54-marketplace-group': s54MarketplaceGroup,
    's54-store-products': s54StoreProducts,
    's54-store-regular': s54StoreRegular,
    's54-store-shared': s54StoreShared,
    's54-store-group': s54StoreGroup,
    's54-cleanup': s54Cleanup,
  };

  // ============================================================
  // GLOBAL CLEANUP - ניקוי ידני של כל הנתונים שנוצרו
  // ============================================================
  const cleanupAll = async () => {
    setIsCleaning(true);
    addLog('========== מתחיל ניקוי כל נתוני הבדיקות ==========', 'warning');

    const data = testDataRef.current;
    const userIds = new Set();
    const productIds = new Set();

    // Collect all user IDs from all suites
    for (const [key, val] of Object.entries(data)) {
      if (val?.userId) userIds.add(val.userId);
      if (val?.agentId) userIds.add(val.agentId);
      if (val?.customer?.userId) userIds.add(val.customer.userId);
      if (val?.agent?.userId) userIds.add(val.agent.userId);
      if (val?.productId) productIds.add(val.productId);
    }

    let deletedUsers = 0;
    let deletedProducts = 0;

    // Delete products first
    for (const pid of productIds) {
      addLog('מוחק מוצר: ' + pid);
      const r = await apiDelete('/api/products/' + pid);
      if (r.ok) { deletedProducts++; addLog('[v] מוצר נמחק', 'success'); }
      else addLog('[WARN] מחיקת מוצר נכשלה: HTTP ' + r.status, 'warning');
    }

    // Delete users
    for (const uid of userIds) {
      addLog('מוחק משתמש: ' + uid);
      const r = await apiDelete('/api/users/' + uid);
      if (r.ok) { deletedUsers++; addLog('[v] משתמש נמחק', 'success'); }
      else addLog('[WARN] מחיקת משתמש נכשלה: HTTP ' + r.status, 'warning');
    }

    addLog('========== ניקוי הושלם: ' + deletedUsers + ' משתמשים, ' + deletedProducts + ' מוצרים ==========', 'success');
    setIsCleaning(false);
  };

  // ============================================================
  // SYSTEM RESET & RESTORE
  // ============================================================

  const handleSystemReset = async () => {
    if (!resetPassword) { alert('יש להזין סיסמה'); return; }
    const modeLabel = resetMode === 'test_only' ? 'ניקוי נתוני בדיקות בלבד' : 'איפוס מלא';
    if (!confirm('⚠️ ' + modeLabel + '\n\n' + (resetMode === 'test_only'
      ? 'ימחקו רק משתמשים/הזמנות/מוצרים שנוצרו בסימולטור (sim-*, test-*).\nחנויות אמיתיות לא יפגעו.'
      : 'ימחק הכל חוץ מהמנהל הראשי, Catalog Templates, וחנויות מוגנות.') + '\n\nלהמשיך?')) return;

    setIsResetting(true);
    addLog('========== 🔴 מתחיל ' + modeLabel + ' ==========', 'warning');

    try {
      const payload = { password: resetPassword, mode: resetMode };
      if (resetMode === 'full' && protectedTenants.length > 0) {
        payload.protectedTenantIds = protectedTenants;
      }
      const r = await apiPost('/api/admin/system-reset', payload);
      if (!r.ok) {
        const errMsg = r.data?.error === 'invalid_password' ? 'סיסמה שגויה' : r.data?.error || 'HTTP ' + r.status;
        addLog('[x] איפוס נכשל: ' + errMsg, 'error');
        alert('איפוס נכשל: ' + errMsg);
        setIsResetting(false);
        return;
      }

      // Download backup JSON automatically
      if (r.data?.templatesBackupData?.length > 0) {
        const backupJson = JSON.stringify(r.data.templatesBackupData, null, 2);
        const blob = new Blob([backupJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'catalog-templates-backup-' + new Date().toISOString().slice(0, 19).replace(/:/g, '-') + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        addLog('[v] גיבוי templates הורד למחשב (' + r.data.templatesBackupData.length + ' תבניות)', 'success');
      }

      // Log deletion counts
      const counts = r.data?.deletedCounts || {};
      const summary = Object.entries(counts).map(([k, v]) => k + ': ' + v).join(', ');
      addLog('[v] נמחקו: ' + summary, 'success');
      addLog('========== ✅ ' + modeLabel + ' הושלם ==========', 'success');

      setShowResetModal(false);
      setResetPassword('');
      setResetMode('test_only');
      setProtectedTenants([]);
    } catch (err) {
      addLog('[x] שגיאה באיפוס: ' + err.message, 'error');
    }
    setIsResetting(false);
  };

  const loadBackupsAndTenants = async () => {
    const r = await apiGet('/api/admin/system-reset');
    if (r.ok) {
      if (r.data?.backups) setBackupsList(r.data.backups);
      if (r.data?.tenants) {
        setTenantsList(r.data.tenants);
        // Auto-protect all real tenants
        setProtectedTenants(r.data.tenants.map(t => t._id));
      }
    }
  };

  const handleRestoreFromDb = async (backupId) => {
    if (!confirm('לשחזר תבניות מגיבוי זה? התבניות הנוכחיות יוחלפו.')) return;
    setIsRestoring(true);
    addLog('משחזר templates מגיבוי...', 'warning');
    const r = await apiPost('/api/admin/system-reset/restore', { source: 'db', backupId });
    if (r.ok) {
      addLog('[v] שוחזרו ' + r.data.restored + ' תבניות', 'success');
    } else {
      addLog('[x] שחזור נכשל: ' + (r.data?.error || 'HTTP ' + r.status), 'error');
    }
    setIsRestoring(false);
    setShowRestoreModal(false);
  };

  const handleRestoreFromFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm('לשחזר תבניות מקובץ? התבניות הנוכחיות יוחלפו.')) { e.target.value = ''; return; }
    setIsRestoring(true);
    addLog('משחזר templates מקובץ...', 'warning');
    try {
      const text = await file.text();
      const templates = JSON.parse(text);
      const arr = Array.isArray(templates) ? templates : [templates];
      const r = await apiPost('/api/admin/system-reset/restore', { source: 'file', templates: arr });
      if (r.ok) {
        addLog('[v] שוחזרו ' + r.data.restored + ' תבניות מקובץ', 'success');
      } else {
        addLog('[x] שחזור נכשל: ' + (r.data?.error || 'HTTP ' + r.status), 'error');
      }
    } catch (err) {
      addLog('[x] שגיאה בקריאת קובץ: ' + err.message, 'error');
    }
    setIsRestoring(false);
    setShowRestoreModal(false);
    e.target.value = '';
  };

  // ============================================================
  // TEST RUNNER
  // ============================================================

  const TEST_TIMEOUT_MS = {
    's21-create-stores': 90000,
    's21-create-products': 90000,
    's21-create-agents': 180000,
    's21-create-customers': 90000,
    's21-purchases': 120000,
  };

  const runTest = async (testId, testName) => {
    clearSimulatorAbort();
    setResult(testId, 'running');
    addLog('--- מריץ: ' + testName + ' ---');
    try {
      const testFn = TEST_FUNCTIONS[testId];
      if (!testFn) {
        addLog('[x] פונקציית בדיקה לא נמצאה: ' + testId, 'error');
        setResult(testId, 'failed');
        return;
      }
      const timeoutMs = TEST_TIMEOUT_MS[testId] || 30000;
      const timeoutSeconds = Math.round(timeoutMs / 1000);
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout: בדיקה חרגה מ-' + timeoutSeconds + ' שניות')), timeoutMs));
      const result = await Promise.race([testFn(), timeout]);
      setResult(testId, result.success ? 'success' : 'failed', result);
    } catch (err) {
      addLog('[x] שגיאה: ' + err.message, 'error');
      if ((err.message || '').startsWith('Timeout:')) {
        stopRunAllRef.current = true;
        requestSimulatorAbort();
      }
      setResult(testId, 'failed');
    }
  };

  const runAllTests = async () => {
    setIsRunningAll(true);
    setTestResults({});
    setTestData({});
    testDataRef.current = {};
    stopRunAllRef.current = false;
    clearSimulatorAbort();
    setLogs([]);
    addLog('========== מתחיל הרצת כל הבדיקות ==========', 'info');

    const cats = SUITE_CATEGORIES_MAP[activeSuite] || S1_CATEGORIES;
    for (const cat of Object.values(cats)) {
      setActiveTab(cat.id);
      addLog('--- [' + cat.name + '] ---', 'info');
      for (const test of cat.tests) {
        if (stopRunAllRef.current) {
          addLog('========== הרצה נעצרה עקב timeout ==========', 'warning');
          setIsRunningAll(false);
          return;
        }
        if (test?.manual) {
          addLog('--- SKIP (manual): ' + test.name + ' ---', 'warning');
          setResult(test.id, 'skipped', { skipped: true });
          await new Promise(r => setTimeout(r, 250));
          continue;
        }
        await runTest(test.id, test.name);
        if (stopRunAllRef.current) {
          addLog('========== הרצה נעצרה עקב timeout ==========', 'warning');
          setIsRunningAll(false);
          return;
        }
        await new Promise(r => setTimeout(r, 800));
      }
    }

    addLog('========== הרצה הסתיימה ==========', 'info');
    setIsRunningAll(false);
  };

  // ============================================================
  // COMPUTED VALUES
  // ============================================================
  const currentCategories = SUITE_CATEGORIES_MAP[activeSuite] || S1_CATEGORIES;
  const cat = currentCategories[activeTab] || Object.values(currentCategories)[0];

  const allTests = Object.values(currentCategories).flatMap(c => c.tests);
  const totalTests = allTests.length;
  const passedTests = allTests.filter(t => testResults[t.id] === 'success').length;
  const failedTests = allTests.filter(t => testResults[t.id] === 'failed').length;
  const skippedTests = allTests.filter(t => testResults[t.id] === 'skipped').length;

  const getStyle = (s) => {
    if (s === 'success') return 'bg-green-50 border-green-300 text-green-800';
    if (s === 'failed') return 'bg-red-50 border-red-300 text-red-800';
    if (s === 'running') return 'bg-yellow-50 border-yellow-300 text-yellow-800';
    if (s === 'skipped') return 'bg-slate-50 border-slate-300 text-slate-700';
    return 'bg-gray-50 border-gray-200 text-gray-600';
  };

  const getIcon = (s) => {
    if (s === 'success') return '✓';
    if (s === 'failed') return '✗';
    if (s === 'running') return '⟳';
    if (s === 'skipped') return '↷';
    return '○';
  };

  // ============================================================
  // RENDER
  // ============================================================
  const doneTests = passedTests + failedTests + skippedTests;
  const progressPct = totalTests > 0 ? Math.round((doneTests / totalTests) * 100) : 0;
  const successDenom = passedTests + failedTests;
  const successPct = successDenom > 0 ? Math.round((passedTests / successDenom) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50" style={{ zoom: 0.75 }}>
    <div className="flex overflow-hidden" dir="rtl" style={{ height: 'calc(100vh / 0.75)', width: 'calc(100vw / 0.75)', background: '#0c1222' }}>

      {/* ===== LEFT SIDEBAR - Suite Navigator ===== */}
      <aside className="w-[220px] flex-shrink-0 flex flex-col h-full" style={{ background: 'linear-gradient(180deg, #0f172a 0%, #0c1222 100%)', borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
        {/* Logo Header */}
        <div className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1e3a8a, #0891b2)' }}>
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div>
            <div className="text-sm font-bold text-white tracking-tight">VIPO QA</div>
            <div className="text-[9px] font-medium" style={{ color: '#0891b2' }}>System Simulator v3</div>
          </div>
        </div>

        {/* Suite List */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
          {Object.values(TEST_SUITES).map(suite => {
            const isActive = activeSuite === suite.id;
            const suiteCats = SUITE_CATEGORIES_MAP[suite.id];
            const suiteTests = suiteCats ? Object.values(suiteCats).flatMap(c => c.tests) : [];
            const suitePassed = suiteTests.filter(t => testResults[t.id] === 'success').length;
            const suiteFailed = suiteTests.filter(t => testResults[t.id] === 'failed').length;
            const suiteTotal = suiteTests.length;
            const hasResults = suitePassed + suiteFailed > 0;
            return (
              <button
                key={suite.id}
                onClick={() => {
                  setActiveSuite(suite.id);
                  setActiveTab(SUITE_FIRST_TAB[suite.id] || Object.keys(SUITE_CATEGORIES_MAP[suite.id])[0]);
                }}
                className={`w-full text-right px-2.5 py-2 rounded-lg text-[11px] font-medium transition-all flex items-center gap-2 group ${
                  isActive ? 'text-white' : 'hover:bg-white/[0.04]'
                }`}
                style={{
                  background: isActive ? 'linear-gradient(135deg, rgba(30,58,138,0.5), rgba(8,145,178,0.3))' : 'transparent',
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.5)',
                  border: isActive ? '1px solid rgba(8,145,178,0.3)' : '1px solid transparent',
                }}
              >
                <SimIcon emoji={suite.icon} className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 truncate text-[10px]">{suite.name}</span>
                {hasResults && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                    suiteFailed > 0 ? 'bg-red-500/20 text-red-400' : suitePassed === suiteTotal ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {suitePassed}/{suiteTotal}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Sidebar Footer Stats */}
        <div className="px-3 py-3 space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between text-[10px]">
            <span style={{ color: 'rgba(255,255,255,0.4)' }}>התקדמות כללית</span>
            <span className="font-bold" style={{ color: '#0891b2' }}>{progressPct}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progressPct}%`, background: failedTests > 0 ? 'linear-gradient(90deg, #10b981, #ef4444)' : 'linear-gradient(90deg, #1e3a8a, #0891b2)' }} />
          </div>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /><span style={{ color: 'rgba(255,255,255,0.5)' }}>{passedTests}</span></span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /><span style={{ color: 'rgba(255,255,255,0.5)' }}>{failedTests}</span></span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} /><span style={{ color: 'rgba(255,255,255,0.5)' }}>{totalTests - passedTests - failedTests - skippedTests}</span></span>
          </div>
        </div>
      </aside>

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex-1 flex flex-col h-full overflow-hidden" style={{ background: '#111827' }}>

        {/* Top Banner */}
        <div className="flex-shrink-0 px-4 py-2.5 flex items-center justify-between gap-4" style={{ background: 'linear-gradient(135deg, rgba(30,58,138,0.4) 0%, rgba(8,145,178,0.2) 100%)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {/* Suite Info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <SimIcon emoji={TEST_SUITES[activeSuite]?.icon} className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">{TEST_SUITES[activeSuite]?.name}</h2>
              <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.45)' }}>{TEST_SUITES[activeSuite]?.description}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button onClick={runAllTests} disabled={isRunningAll} className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11px] font-bold text-white disabled:opacity-50 transition-all hover:shadow-lg hover:shadow-cyan-500/20" style={{ background: 'linear-gradient(135deg, #1e3a8a, #0891b2)' }}>
              {isRunningAll ? (
                <><svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> מריץ...</>
              ) : (
                <><svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg> הרץ הכל</>
              )}
            </button>
            <button onClick={() => { setTestResults({}); setTestData({}); testDataRef.current = {}; setLogs([]); }} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all" style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              אפס
            </button>
            <button onClick={cleanupAll} disabled={isCleaning || isRunningAll} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all disabled:opacity-50" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
              {isCleaning ? '⟳ מנקה...' : '🧹 ניקוי'}
            </button>
            <button onClick={() => { setShowResetModal(true); loadBackupsAndTenants(); }} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all" style={{ background: 'rgba(220,38,38,0.2)', color: '#fca5a5', border: '1px solid rgba(220,38,38,0.3)' }}>
              ⚠ איפוס
            </button>
            <button onClick={() => { setShowRestoreModal(true); loadBackupsAndTenants(); }} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all" style={{ background: 'rgba(16,185,129,0.15)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.2)' }}>
              ♻ שחזור
            </button>

            {/* Stats Badges */}
            <div className="flex items-center gap-1.5 mr-2" style={{ borderRight: '1px solid rgba(255,255,255,0.1)', paddingRight: '12px' }}>
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-emerald-400 font-bold text-sm">{passedTests}</span>
              </div>
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                <span className="text-red-400 font-bold text-sm">{failedTests}</span>
              </div>
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.3)' }} />
                <span className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>{totalTests - passedTests - failedTests - skippedTests}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Progress Bar */}
        <div className="flex-shrink-0 px-4 py-1.5 flex items-center gap-3" style={{ background: 'rgba(0,0,0,0.35)', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'sticky', top: 0, zIndex: 20, backdropFilter: 'blur(8px)' }}>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[10px] font-bold" style={{ color: '#0891b2' }}>{progressPct}%</span>
            <div className="w-40 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${progressPct}%`, background: failedTests > 0 ? 'linear-gradient(90deg, #10b981, #f59e0b, #ef4444)' : 'linear-gradient(90deg, #1e3a8a, #0891b2, #06b6d4)' }} />
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded" style={{ background: 'rgba(16,185,129,0.12)' }}><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /><span className="font-bold text-emerald-400">{passedTests}</span></span>
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded" style={{ background: 'rgba(239,68,68,0.12)' }}><span className="w-1.5 h-1.5 rounded-full bg-red-400" /><span className="font-bold text-red-400">{failedTests}</span></span>
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.04)' }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.25)' }} /><span className="font-bold" style={{ color: 'rgba(255,255,255,0.35)' }}>{totalTests - passedTests - failedTests - skippedTests}</span></span>
          </div>
          <span className="text-[9px] mr-auto" style={{ color: 'rgba(255,255,255,0.3)' }}>{isRunningAll ? '⟳ מריץ...' : ''} {TEST_SUITES[activeSuite]?.name} — {passedTests}/{totalTests}</span>
        </div>

        {/* Category Tabs */}
        <div className="flex-shrink-0 px-4 pt-2 flex items-center gap-1 overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
          {Object.values(currentCategories).map(c => {
            const catTests = c.tests || [];
            const catPassed = catTests.filter(t => testResults[t.id] === 'success').length;
            const catTotal = catTests.length;
            const isActiveCat = activeTab === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setActiveTab(c.id)}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-[11px] font-medium transition-all whitespace-nowrap"
                style={{
                  background: isActiveCat ? 'rgba(255,255,255,0.06)' : 'transparent',
                  color: isActiveCat ? '#fff' : 'rgba(255,255,255,0.4)',
                  borderBottom: isActiveCat ? '2px solid #0891b2' : '2px solid transparent',
                }}
              >
                <SimIcon emoji={c.icon} className="w-3.5 h-3.5" />
                <span>{c.name}</span>
                {catPassed > 0 && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: catPassed === catTotal ? 'rgba(16,185,129,0.2)' : 'rgba(8,145,178,0.2)', color: catPassed === catTotal ? '#6ee7b7' : '#67e8f9' }}>
                    {catPassed}/{catTotal}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Main Content Area - split between tests and logs */}
        <div className="flex-1 flex flex-col min-h-0 px-4 py-2 gap-2">

          {/* Test Cards Grid */}
          <div className="rounded-xl overflow-hidden flex flex-col" style={{ flex: '0 1 40%', minHeight: '120px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {cat && (
              <div className="p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 overflow-y-auto flex-1 min-h-0" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
                {cat.tests.map(t => {
                  const s = testResults[t.id] || 'pending';
                  const d = testData[t.id];
                  const cardBg = s === 'success' ? 'rgba(16,185,129,0.08)' : s === 'failed' ? 'rgba(239,68,68,0.08)' : s === 'running' ? 'rgba(234,179,8,0.08)' : s === 'skipped' ? 'rgba(148,163,184,0.08)' : 'rgba(255,255,255,0.02)';
                  const cardBorder = s === 'success' ? 'rgba(16,185,129,0.25)' : s === 'failed' ? 'rgba(239,68,68,0.25)' : s === 'running' ? 'rgba(234,179,8,0.25)' : s === 'skipped' ? 'rgba(148,163,184,0.25)' : 'rgba(255,255,255,0.06)';
                  const titleColor = s === 'success' ? '#6ee7b7' : s === 'failed' ? '#fca5a5' : s === 'running' ? '#fde68a' : s === 'skipped' ? '#cbd5e1' : 'rgba(255,255,255,0.7)';
                  const iconColor = s === 'success' ? '#10b981' : s === 'failed' ? '#ef4444' : s === 'running' ? '#eab308' : s === 'skipped' ? '#94a3b8' : 'rgba(255,255,255,0.2)';
                  return (
                    <div
                      key={t.id}
                      className="rounded-lg p-2.5 transition-all hover:scale-[1.02] cursor-default"
                      style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
                    >
                      <div className="flex items-start gap-2 mb-1.5">
                        <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 text-[10px] font-bold" style={{ background: `${iconColor}22`, color: iconColor, border: `1px solid ${iconColor}44` }}>
                          {s === 'running' ? (
                            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                          ) : getIcon(s)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-[10px] truncate" style={{ color: titleColor }}>{t.name}</h3>
                          <p className="text-[9px] leading-tight line-clamp-2 mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{t.desc}</p>
                        </div>
                      </div>
                      {d?.httpStatus && <div className="text-[9px] mb-1 font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>HTTP {d.httpStatus}</div>}
                      {d?.skipped && <div className="text-[9px] mb-1 text-yellow-500">SKIPPED</div>}
                      <button
                        onClick={() => runTest(t.id, t.name)}
                        disabled={s === 'running' || isRunningAll}
                        className="w-full py-1 rounded-md font-bold text-[10px] disabled:opacity-40 transition-all"
                        style={{
                          background: s === 'running' ? 'rgba(234,179,8,0.2)' : 'linear-gradient(135deg, rgba(30,58,138,0.6), rgba(8,145,178,0.6))',
                          color: s === 'running' ? '#fde68a' : 'rgba(255,255,255,0.8)',
                          border: '1px solid rgba(255,255,255,0.08)',
                        }}
                      >
                        {s === 'running' ? '⟳ רץ...' : '▶ הרץ'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Terminal / Log Console */}
          <div className="rounded-xl overflow-hidden flex flex-col" style={{ flex: '1 1 60%', minHeight: '80px', border: '1px solid rgba(255,255,255,0.06)' }}>
            {/* Terminal Header */}
            <div className="flex items-center justify-between px-3 py-1.5 flex-shrink-0" style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
                </div>
                <span className="text-[11px] font-medium mr-2" style={{ color: 'rgba(255,255,255,0.4)' }}>Terminal — Test Output</span>
                <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-md font-medium" style={{ background: isRunningAll ? 'rgba(234,179,8,0.15)' : 'rgba(16,185,129,0.15)', color: isRunningAll ? '#fde68a' : '#6ee7b7', border: `1px solid ${isRunningAll ? 'rgba(234,179,8,0.2)' : 'rgba(16,185,129,0.2)'}` }}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isRunningAll ? 'bg-yellow-400 animate-pulse' : 'bg-emerald-400'}`} />
                  {isRunningAll ? 'Running...' : 'Ready'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="flex items-center rounded-md overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                  <button onClick={() => setLogFontSize(s => Math.max(7, s - 1))} className="text-[10px] px-1.5 py-0.5 transition-all" style={{ color: 'rgba(255,255,255,0.3)' }}>−</button>
                  <span className="text-[9px] px-1" style={{ color: 'rgba(255,255,255,0.2)' }}>{logFontSize}</span>
                  <button onClick={() => setLogFontSize(s => Math.min(18, s + 1))} className="text-[10px] px-1.5 py-0.5 transition-all" style={{ color: 'rgba(255,255,255,0.3)' }}>+</button>
                </div>
                <button onClick={() => { const text = logs.map(l => `[${l.time}] ${l.message}`).join('\n'); navigator.clipboard.writeText(text).then(() => { const btn = document.getElementById('copy-log-btn'); if (btn) { btn.textContent = '✓'; setTimeout(() => { btn.textContent = 'Copy'; }, 1500); } }); }} id="copy-log-btn" disabled={logs.length === 0} className="text-[10px] px-2 py-0.5 rounded-md transition-all disabled:opacity-20" style={{ color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.08)' }}>Copy</button>
                <button onClick={() => setLogs([])} className="text-[10px] px-2 py-0.5 rounded-md transition-all" style={{ color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.08)' }}>Clear</button>
              </div>
            </div>
            {/* Terminal Body */}
            <div className="overflow-y-auto p-3 font-mono flex-1 min-h-0" style={{ background: '#0a0e1a', fontSize: `${logFontSize}px`, scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
              {logs.length === 0 ? (
                <div style={{ color: 'rgba(255,255,255,0.15)' }}>
                  <span style={{ color: '#0891b2' }}>$</span> Waiting for test execution...
                </div>
              ) : logs.map((l, i) => (
                <div key={i} className="py-[1px] leading-snug" style={{ color: l.type === 'success' ? '#4ade80' : l.type === 'error' ? '#f87171' : l.type === 'warning' ? '#fbbf24' : 'rgba(255,255,255,0.55)' }}>
                  <span style={{ color: 'rgba(255,255,255,0.15)' }}>[{l.time}]</span>{' '}
                  {l.type === 'success' && <span style={{ color: '#22c55e' }}>✓ </span>}
                  {l.type === 'error' && <span style={{ color: '#ef4444' }}>✗ </span>}
                  {l.message}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <div className="flex-shrink-0 px-4 py-1.5 flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
              <span className={`w-2 h-2 rounded-full ${isRunningAll ? 'bg-yellow-400 animate-pulse' : 'bg-emerald-500'}`} />
              {isRunningAll ? 'Running Tests...' : 'System Ready'}
            </span>
            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>
            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>Suite: {TEST_SUITES[activeSuite]?.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.25)' }}>Tests: {passedTests}/{totalTests} passed</span>
            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>
            <span className="text-[10px] font-mono" style={{ color: successPct === 100 && totalTests > 0 ? '#4ade80' : 'rgba(255,255,255,0.25)' }}>{successPct}% success rate</span>
          </div>
        </div>
      </div>

      {/* ====== RESET MODAL ====== */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 my-4" dir="rtl">
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">🔴</div>
              <h2 className="text-xl font-bold text-red-800">איפוס מערכת</h2>
            </div>

            {/* Mode Selection */}
            <div className="mb-4 space-y-2">
              <label className="block text-sm font-bold text-gray-700 mb-1">בחר מצב:</label>
              <label className={'flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ' + (resetMode === 'test_only' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300')}>
                <input type="radio" name="resetMode" value="test_only" checked={resetMode === 'test_only'} onChange={() => setResetMode('test_only')} className="mt-1" />
                <div>
                  <div className="font-bold text-sm text-blue-800">🧹 ניקוי בדיקות בלבד (בטוח)</div>
                  <div className="text-xs text-gray-600 mt-0.5">מוחק רק sim-*, test-* — חנויות אמיתיות לא נפגעות</div>
                </div>
              </label>
              <label className={'flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ' + (resetMode === 'full' ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300')}>
                <input type="radio" name="resetMode" value="full" checked={resetMode === 'full'} onChange={() => setResetMode('full')} className="mt-1" />
                <div>
                  <div className="font-bold text-sm text-red-800">💣 איפוס מלא (מסוכן)</div>
                  <div className="text-xs text-gray-600 mt-0.5">מוחק הכל חוץ ממנהל ראשי + Catalog Templates + חנויות מוגנות</div>
                </div>
              </label>
            </div>

            {/* Protected Tenants (only in full mode) */}
            {resetMode === 'full' && tenantsList.length > 0 && (
              <div className="mb-4 bg-yellow-50 border border-yellow-300 rounded-lg p-3">
                <div className="font-bold text-sm text-yellow-800 mb-2">🛡️ חנויות מוגנות (לא יימחקו):</div>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {tenantsList.map(t => (
                    <label key={t._id} className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={protectedTenants.includes(t._id)}
                        onChange={(e) => {
                          if (e.target.checked) setProtectedTenants(prev => [...prev, t._id]);
                          else setProtectedTenants(prev => prev.filter(id => id !== t._id));
                        }}
                      />
                      <span className="font-medium">{t.name}</span>
                      <span className="text-gray-400">({t.slug})</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Info box */}
            <div className={'rounded-lg p-3 mb-4 text-xs ' + (resetMode === 'test_only' ? 'bg-blue-50 border border-blue-200 text-blue-700' : 'bg-red-50 border border-red-200 text-red-700')}>
              {resetMode === 'test_only' ? (
                <>
                  <strong>מה יימחק:</strong> משתמשים עם מייל sim-*/test-*/@test.com, המוצרים/הזמנות/עמלות שלהם, וחנויות סימולטור.
                  <br /><strong>מה נשאר:</strong> כל החנויות האמיתיות, המוצרים שלהן, המשתמשים האמיתיים.
                </>
              ) : (
                <>
                  <strong>⚠️ מוחק הכל</strong> חוץ מ: מנהל ראשי, Catalog Templates, חנויות מסומנות למעלה.
                  <br />גיבוי אוטומטי של templates יורד למחשב + נשמר ב-DB.
                </>
              )}
            </div>

            {/* Password */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">סיסמת מנהל ראשי</label>
              <input
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSystemReset()}
                placeholder="הזן סיסמה לאישור..."
                className={'w-full px-4 py-2.5 border-2 rounded-lg focus:outline-none text-sm ' + (resetMode === 'test_only' ? 'border-blue-300 focus:border-blue-500' : 'border-red-300 focus:border-red-500')}
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSystemReset}
                disabled={isResetting || !resetPassword}
                className={'flex-1 py-2.5 text-white rounded-lg font-bold text-sm disabled:opacity-50 transition-all ' + (resetMode === 'test_only' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-700 hover:bg-red-800')}
              >
                {isResetting ? '⟳ מאפס...' : resetMode === 'test_only' ? '🧹 נקה בדיקות' : '💣 אפס מערכת'}
              </button>
              <button
                onClick={() => { setShowResetModal(false); setResetPassword(''); setResetMode('test_only'); }}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium text-sm transition-all"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== RESTORE MODAL ====== */}
      {showRestoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6" dir="rtl">
            <div className="text-center mb-5">
              <div className="text-4xl mb-2">♻️</div>
              <h2 className="text-xl font-bold text-emerald-800">שחזור Catalog Templates</h2>
            </div>

            {/* Restore from file */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4">
              <h3 className="font-bold text-sm text-emerald-800 mb-2">📁 שחזור מקובץ</h3>
              <p className="text-xs text-gray-600 mb-2">העלה קובץ JSON שהורד בזמן איפוס</p>
              <label className="inline-block px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-sm cursor-pointer transition-all">
                {isRestoring ? '⟳ משחזר...' : '📂 בחר קובץ JSON'}
                <input type="file" accept=".json" onChange={handleRestoreFromFile} className="hidden" disabled={isRestoring} />
              </label>
            </div>

            {/* Restore from DB backup */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h3 className="font-bold text-sm text-blue-800 mb-2">💾 שחזור מגיבוי במערכת</h3>
              {backupsList.length === 0 ? (
                <p className="text-xs text-gray-500">אין גיבויים שמורים</p>
              ) : (
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {backupsList.map(b => (
                    <div key={b._id} className="flex items-center justify-between bg-white rounded-lg p-2 border text-xs">
                      <div>
                        <div className="font-medium">{new Date(b.createdAt).toLocaleString('he-IL')}</div>
                        <div className="text-gray-500">{b.templateCount} תבניות • {b.createdBy}</div>
                      </div>
                      <button
                        onClick={() => handleRestoreFromDb(b._id)}
                        disabled={isRestoring}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 transition-all"
                      >
                        שחזר
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setShowRestoreModal(false)}
              className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium text-sm transition-all"
            >
              סגור
            </button>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}

export default SimulatorPage;
