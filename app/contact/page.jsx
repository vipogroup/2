import ContactPageClient from './ContactPageClient';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.vipo-group.com').trim();

export const metadata = {
  title: 'יצירת קשר עם VIPO - תמיכה, שירות ושיתופי פעולה',
  description: 'צרו קשר עם צוות VIPO לכל שאלה לגבי מוצרים, הזמנות, שילוח, ותמיכה מקצועית לעסקים וללקוחות פרטיים.',
  alternates: {
    canonical: `${SITE_URL}/contact`,
  },
  openGraph: {
    title: 'יצירת קשר עם VIPO - תמיכה, שירות ושיתופי פעולה',
    description: 'צוות VIPO זמין עבורכם לכל שאלה, בקשה או שיתוף פעולה.',
    url: `${SITE_URL}/contact`,
    type: 'website',
    locale: 'he_IL',
  },
  twitter: {
    card: 'summary',
    title: 'יצירת קשר עם VIPO - תמיכה, שירות ושיתופי פעולה',
    description: 'צוות VIPO זמין עבורכם לכל שאלה, בקשה או שיתוף פעולה.',
  },
};

export default function ContactPage() {
  return (
    <>
      <p className="sr-only">יצירת קשר עם VIPO</p>
      <ContactPageClient />
    </>
  );
}
