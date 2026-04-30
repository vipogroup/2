const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.vipo-group.com').trim();

export const metadata = {
  title: 'הצטרפות לסוכנים | VIPO',
  description: 'הצטרפו לתוכנית הסוכנים של VIPO וקבלו מערכת שיתוף, מעקב קישורים וניהול עמלות בזמן אמת.',
  alternates: {
    canonical: `${SITE_URL}/for-agents`,
  },
  openGraph: {
    title: 'הצטרפות לסוכנים | VIPO',
    description: 'שיווק מוצרים, קבלת עמלות ומעקב ביצועים עם מערכת הסוכנים של VIPO.',
    url: `${SITE_URL}/for-agents`,
    type: 'website',
    locale: 'he_IL',
  },
  twitter: {
    card: 'summary',
    title: 'הצטרפות לסוכנים | VIPO',
    description: 'שיווק מוצרים, קבלת עמלות ומעקב ביצועים עם מערכת הסוכנים של VIPO.',
  },
};

export default function ForAgentsLayout({ children }) {
  return children;
}