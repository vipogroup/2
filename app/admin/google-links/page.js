export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

import GoogleLinksClient from './GoogleLinksClient';

export const metadata = {
  title: 'דוחות גוגל | Admin',
};

export default function GoogleLinksPage() {
  return <GoogleLinksClient />;
}
