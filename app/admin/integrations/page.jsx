export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

import IntegrationsClient from './IntegrationsClient';

export const metadata = {
  title: 'אינטגרציות | Admin',
};

export default function AdminIntegrationsPage() {
  return <IntegrationsClient />;
}
