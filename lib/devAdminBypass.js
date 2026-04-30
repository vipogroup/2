import { requireAdminApi } from '@/lib/auth/server';

export async function requireAdminApiWithDevBypass(req) {
  if (process.env.NODE_ENV === 'production') {
    return requireAdminApi(req);
  }

  const devKey = process.env.DEV_ADMIN_KEY;
  const headerKey = req?.headers?.get?.('x-dev-admin-key') || null;

  if (devKey && headerKey && headerKey === devKey) {
    return {
      id: 'dev-bypass',
      role: 'super_admin',
      isDevBypass: true,
    };
  }

  return requireAdminApi(req);
}
