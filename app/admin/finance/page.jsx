export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

import FinanceClient from './FinanceClient';

export const metadata = {
  title: 'כספים ודוחות | Admin',
};

export default function AdminFinancePage() {
  return <FinanceClient />;
}
