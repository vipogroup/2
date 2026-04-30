export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

import RegistrationLinksClient from './RegistrationLinksClient';

export const metadata = {
  title: 'קישורי הרשמה | Admin',
};

export default function RegistrationLinksPage() {
  return <RegistrationLinksClient />;
}
