import AboutPageClient from './AboutPageClient';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.vipo-group.com').trim();

export const metadata = {
  title: 'אודות VIPO | יבוא, שינוע ורכש גלובלי',
  description: 'הכירו את VIPO Group: חברה ישראלית ליבוא, איתור מפעלים גלובליים, שינוע חכם וליווי מלא בתהליכי רכש לעסקים ולפרטיים.',
  alternates: {
    canonical: `${SITE_URL}/about`,
  },
  openGraph: {
    title: 'אודות VIPO | יבוא, שינוע ורכש גלובלי',
    description: 'מי אנחנו, מה אנחנו עושים ואיך VIPO עוזרת לכם לחסוך בעלויות רכש ושילוח.',
    url: `${SITE_URL}/about`,
    type: 'website',
    locale: 'he_IL',
  },
  twitter: {
    card: 'summary',
    title: 'אודות VIPO | יבוא, שינוע ורכש גלובלי',
    description: 'מי אנחנו, מה אנחנו עושים ואיך VIPO עוזרת לכם לחסוך בעלויות רכש ושילוח.',
  },
};

export default function AboutPage() {
  return (
    <>
      <h1 className="sr-only">אודות VIPO - יבוא, שינוע ורכש גלובלי</h1>
      <AboutPageClient />
    </>
  );
}
