import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

import { getWebPushConfig } from '@/lib/webPush';

function validateBase64ForClient(str) {
  if (!str) return false;
  try {
    const cleaned = str.trim().replace(/^['"]+|['"]+$/g, '').replace(/\s+/g, '');
    const base64Regex = /^[A-Za-z0-9+/\-_]*={0,2}$/;
    if (!base64Regex.test(cleaned)) return false;
    
    const padding = '='.repeat((4 - (cleaned.length % 4)) % 4);
    const base64 = (cleaned + padding).replace(/-/g, '+').replace(/_/g, '/');
    
    // Test decode
    if (typeof atob !== 'undefined') {
      atob(base64);
    } else {
      Buffer.from(cleaned, 'base64');
    }
    return true;
  } catch (error) {
    return false;
  }
}

async function GETHandler() {
  const config = getWebPushConfig();

  if (!config.configured) {
    return NextResponse.json({ ok: false, configured: false }, { status: 200 });
  }

  // Validate public key before sending to client
  if (!validateBase64ForClient(config.publicKey)) {
    console.error('VAPID_CONFIG_ERROR: Invalid public key detected', {
      keyLength: config.publicKey?.length,
      keyPreview: config.publicKey ? config.publicKey.substring(0, 20) : null,
    });
    return NextResponse.json({ ok: false, configured: false, error: 'invalid_public_key' }, { status: 200 });
  }

  return NextResponse.json({
    ok: true,
    configured: true,
    publicKey: config.publicKey,
    contact: config.contact,
  });
}

export const GET = withErrorLogging(GETHandler);
