import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const WHATSAPP_PROVIDER = process.env.WHATSAPP_PROVIDER || 'internal';
const WHATSAPP_SERVER_URL = process.env.WHATSAPP_LOCAL_URL || 'http://localhost:3002';
const DIALOG_360_API_KEY = process.env.DIALOG_360_API_KEY;

async function GETHandler(request) {
  try {
    if (WHATSAPP_PROVIDER === '360dialog') {
      const configured = !!DIALOG_360_API_KEY;
      return NextResponse.json({
        ready: configured,
        provider: '360dialog',
        info: configured ? { phone: 'WhatsApp Business (360dialog)' } : null,
        error: configured ? null : 'DIALOG_360_API_KEY not set',
      });
    }

    if (WHATSAPP_PROVIDER === 'local') {
      const response = await fetch(`${WHATSAPP_SERVER_URL}/status`, { cache: 'no-store' });
      const data = await response.json();
      return NextResponse.json({ ...data, provider: 'local' });
    }

    // Mock/internal
    return NextResponse.json({
      ready: true,
      provider: 'mock',
      info: { phone: 'Mock Mode' },
      mock: true,
    });
  } catch (error) {
    return NextResponse.json({ 
      ready: false, 
      provider: WHATSAPP_PROVIDER,
      error: error.message || 'WhatsApp service unavailable',
    });
  }
}

export const GET = withErrorLogging(GETHandler);
