import { requireAuth } from '@/lib/authz';
import MessagesClient from './MessagesClient';

export const dynamic = 'force-dynamic';

export default async function MessagesPage() {
  const user = await requireAuth();

  return (
    <MessagesClient
      currentUser={{
        id: user.id,
        role: user.role,
        fullName: user.fullName || user.email || '',
        tenantId: user.tenantId || null,
      }}
    />
  );
}
