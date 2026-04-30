import { requireAdmin } from '@/lib/auth/server';

export const dynamic = 'force-dynamic';

export default async function CatalogManagerStandalonePage() {
  await requireAdmin();
  const v = Date.now();
  return (
    <div style={{ width: '100%', height: '100%', minHeight: 'calc(100vh - 56px)' }}>
      <iframe
        src={`/_standalone/catalog-manager/index.html?v=${v}`}
        title="Catalog Manager"
        style={{ width: '100%', height: '100%', border: 'none' }}
      />
    </div>
  );
}
