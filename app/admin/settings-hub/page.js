export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

import SettingsHubClient from './SettingsHubClient';

export const metadata = {
  title: 'מרכז הגדרות | Admin',
};

export default function SettingsHubPage() {
  return <SettingsHubClient />;
}
