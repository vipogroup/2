export const metadata = {
  title: 'פתח עסק חדש - VIPO',
  description: 'הצטרף לפלטפורמת VIPO - מערכת ניהול סוכנים ומכירות חכמה. פתח את העסק שלך והתחל למכור עוד היום!',
  openGraph: {
    title: 'פתח עסק חדש - VIPO',
    description: 'הצטרף לפלטפורמת VIPO - מערכת ניהול סוכנים ומכירות חכמה. פתח את העסק שלך והתחל למכור עוד היום!',
    url: 'https://vipo-agents-test.vercel.app/register-business',
    siteName: 'VIPO',
    images: [
      {
        url: 'https://vipo-agents-test.vercel.app/icons/512.png',
        width: 512,
        height: 512,
        alt: 'VIPO - מערכת סוכנים',
      },
    ],
    locale: 'he_IL',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'פתח עסק חדש - VIPO',
    description: 'הצטרף לפלטפורמת VIPO - מערכת ניהול סוכנים ומכירות חכמה',
    images: ['https://vipo-agents-test.vercel.app/icons/512.png'],
  },
};

export default function RegisterBusinessLayout({ children }) {
  return children;
}
