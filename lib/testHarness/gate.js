import { ADMIN_PERMISSIONS, hasPermission, isSuperAdminUser } from '@/lib/superAdmins';

export function isTestHarnessEnabled() {
  return process.env.NODE_ENV !== 'production' || process.env.ENABLE_TEST_HARNESS === 'true';
}

export function assertTestHarnessAccess({ user, requestId, source } = {}) {
if (!isTestHarnessEnabled()) {
    const error = new Error('המשאב לא נמצא');
    error.status = 404;
    error.code = 'TEST_HARNESS_DISABLED';
    error.meta = { requestId, source };
    throw error;
  }

  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    const error = new Error('אין הרשאה ל-Test Harness');
    error.status = 403;
    error.code = 'TEST_HARNESS_FORBIDDEN';
    error.meta = { requestId, source };
    throw error;
  }

  if (!isSuperAdminUser(user) && !hasPermission(user, ADMIN_PERMISSIONS.MANAGE_TEST_HARNESS)) {
    const error = new Error('אין הרשאה ל-Test Harness');
    error.status = 403;
    error.code = 'TEST_HARNESS_FORBIDDEN';
    error.meta = { requestId, source };
    throw error;
  }

  return true;
}
