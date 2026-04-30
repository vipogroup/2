import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('Primary admin config hardening', () => {
  it('accepts canonical and brand alias emails', async () => {
    vi.stubEnv('ADMIN_EMAIL', '');
    vi.stubEnv('ADMIN_EMAIL_ALIASES', '');

    const { isPrimaryAdminEmail } = await import('@/lib/auth/primaryAdminConfig');

    expect(isPrimaryAdminEmail('m0587009938@gmail.com')).toBe(true);
    expect(isPrimaryAdminEmail('vipogroup1@gmail.com')).toBe(true);
    expect(isPrimaryAdminEmail(' VIPOGROUP1@GMAIL.COM ')).toBe(true);
    expect(isPrimaryAdminEmail('other-admin@gmail.com')).toBe(false);
  });

  it('sanitizes configured email artifacts and parses extra aliases', async () => {
    vi.stubEnv('ADMIN_EMAIL', '"m0587009938@gmail.com\\r\\n"');
    vi.stubEnv('ADMIN_EMAIL_ALIASES', ' team-admin@vipo.local;vipogroup1@gmail.com ');

    const { isPrimaryAdminEmail, primaryAdminConfig } = await import('@/lib/auth/primaryAdminConfig');

    expect(primaryAdminConfig.emailCandidates).toContain('m0587009938@gmail.com');
    expect(primaryAdminConfig.emailCandidates).toContain('team-admin@vipo.local');
    expect(isPrimaryAdminEmail('TEAM-ADMIN@VIPO.LOCAL')).toBe(true);
  });

  it('accepts both exact and trimmed configured passwords', async () => {
    vi.stubEnv('ADMIN_PASSWORD', '1q2w3e4r ');
    vi.stubEnv('SUPER_ADMIN_PASSWORD', '');

    const { isPrimaryAdminPassword } = await import('@/lib/auth/primaryAdminConfig');

    expect(isPrimaryAdminPassword('1q2w3e4r ')).toBe(true);
    expect(isPrimaryAdminPassword('1q2w3e4r')).toBe(true);
    expect(isPrimaryAdminPassword('zxcvbnm1')).toBe(true);
    expect(isPrimaryAdminPassword('wrong-password')).toBe(false);
  });
});
