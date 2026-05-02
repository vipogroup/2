import MarketplaceHome from '@/app/components/MarketplaceHome';

export const dynamic = 'force-dynamic';

/**
 * דף הבית הציבורי — מרקטפלייס גלובלי (תואם לפריסת Vercel / vipo-group.com).
 * הגרסה הקודמת כאן הייתה לנדינג שיווקי סטטי; המערכת בפרודקשן משתמשת ב-MarketplaceHome.
 */
export default function HomePage() {
  return <MarketplaceHome />;
}
