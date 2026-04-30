import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const WHATSAPP_SERVER_URL = process.env.WHATSAPP_LOCAL_URL || 'http://localhost:3002';

async function GETHandler(request) {
  try {
    const response = await fetch(`${WHATSAPP_SERVER_URL}/qr/json`, {
      cache: 'no-store',
    });
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ 
      error: 'WhatsApp server not running',
      qrCode: null
    });
  }
}

export const GET = withErrorLogging(GETHandler);
