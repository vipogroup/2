'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import TransactionsReport from '@/components/admin/TransactionsReport';

export default function TransactionsClient() {
  const pathname = usePathname();
  const basePath = pathname?.startsWith('/business') ? '/business' : '/admin';
  return (
    <main className="min-h-screen bg-white p-3 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header removed - sidebar provides navigation */}
        <TransactionsReport />
      </div>
    </main>
  );
}
