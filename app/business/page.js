import dynamic from 'next/dynamic';

const BusinessDashboardClient = dynamic(() => import('./components/BusinessDashboardClient'), {
  ssr: false,
});

export const metadata = {
  title: 'דשבורד עסק | VIPO',
  description: 'ניהול העסק שלך',
};

export default function BusinessPage() {
  return <BusinessDashboardClient />;
}
