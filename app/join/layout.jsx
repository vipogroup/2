const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.vipo-group.com').trim();

export const metadata = {
  title: 'הצטרפות מהירה | VIPO',
  description: 'דף הצטרפות מהירה ל-VIPO דרך הפניה אישית, לרכישה או לרישום כסוכן.',
  alternates: {
    canonical: `${SITE_URL}/join`,
  },
  openGraph: {
    title: 'הצטרפות מהירה | VIPO',
    description: 'הצטרפות מהירה ל-VIPO דרך קישור הפניה אישי.',
    url: `${SITE_URL}/join`,
    type: 'website',
    locale: 'he_IL',
  },
  twitter: {
    card: 'summary',
    title: 'הצטרפות מהירה | VIPO',
    description: 'הצטרפות מהירה ל-VIPO דרך קישור הפניה אישי.',
  },
};

export default function JoinLayout({ children }) {
  return children;
}