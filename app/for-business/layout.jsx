const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.vipo-group.com').trim();

export const metadata = {
  title: 'פתרונות לעסקים | VIPO',
  description: 'מערכת VIPO לעסקים: ניהול מוצרים, הזמנות, סוכנים, עמלות ודוחות במקום אחד.',
  alternates: {
    canonical: `${SITE_URL}/for-business`,
  },
  openGraph: {
    title: 'פתרונות לעסקים | VIPO',
    description: 'הכירו את פלטפורמת VIPO לניהול מכירות, סוכנים ותפעול עסקי מתקדם.',
    url: `${SITE_URL}/for-business`,
    type: 'website',
    locale: 'he_IL',
  },
  twitter: {
    card: 'summary',
    title: 'פתרונות לעסקים | VIPO',
    description: 'הכירו את פלטפורמת VIPO לניהול מכירות, סוכנים ותפעול עסקי מתקדם.',
  },
};

export default function ForBusinessLayout({ children }) {
  return children;
}