import { getPublicGaMeasurementId } from './publicAnalytics.js';

const DEFAULT_SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.vipo-group.com').trim();

export const DEFAULT_SETTINGS = {
  // General
  siteName: 'VIPO',
  siteDescription: 'מערכת מתקדמת לניהול סוכנים ומוצרים',
  logoUrl: '',
  faviconUrl: '',

  // Colors
  primaryColor: '#1e3a8a',
  secondaryColor: '#0891b2',
  accentColor: '#00bcd4',
  successColor: '#16a34a',
  warningColor: '#eab308',
  dangerColor: '#dc2626',
  backgroundColor: '#f7fbff',
  textColor: '#0d1b2a',

  // Typography & layout
  fontFamily: "'Inter', 'Heebo', sans-serif",
  lineHeight: 1.5,
  letterSpacing: '0.01em',
  direction: 'rtl',
  themePreset: 'vipo-turquoise',

  // Contact
  email: 'vipogroup1@gmail.com',
  phone: '053-375-2633',
  address: 'תל אביב, ישראל',
  whatsapp: '972533752633',

  // Social Media
  facebook: '',
  instagram: '',
  twitter: '',
  linkedin: '',

  // Features
  enableRegistration: true,
  enableGroupBuy: true,
  enableGamification: true,
  enableNotifications: true,
  enableDarkMode: false,

  // Marketplace visibility - which purchase types are visible to customers
  marketplaceShowStock: true,
  marketplaceShowGroup: true,
  marketplaceShowSharedContainer: true,

  // SEO
  siteUrl: DEFAULT_SITE_URL,
  metaTitle: 'VIPO - מערכת ניהול סוכנים',
  metaDescription: 'מערכת מתקדמת לניהול סוכנים, מוצרים ורכישות קבוצתיות',
  metaKeywords: 'סוכנים, מוצרים, רכישה קבוצתית, VIPO',

  // Google Analytics & Marketing (no hardcoded measurement ID — use NEXT_PUBLIC_GA_MEASUREMENT_ID)
  googleAnalyticsId: '',
  googleTagManagerId: '',
  googleSearchConsoleVerification: '',

  // Email
  smtpHost: '',
  smtpPort: '587',
  smtpUser: '',
  smtpPassword: '',
  emailFrom: 'vipogroup1@gmail.com',
};

export function withDefaultSettings(partial = {}) {
  const merged = {
    ...DEFAULT_SETTINGS,
    ...partial,
  };

  // DB documents often store "" for optional fields — fall back to env-based GA ID, not a second hardcoded ID.
  if (!String(merged.googleAnalyticsId || '').trim()) {
    merged.googleAnalyticsId = getPublicGaMeasurementId();
  }
  if (!String(merged.googleTagManagerId || '').trim()) {
    merged.googleTagManagerId = DEFAULT_SETTINGS.googleTagManagerId;
  }

  return merged;
}
