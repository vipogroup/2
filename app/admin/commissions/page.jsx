export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

import CommissionsClient from './CommissionsClient';

export const metadata = {
  title: 'ניהול עמלות | Admin',
};

export default function AdminCommissionsPage() {
  return <CommissionsClient />;
}
