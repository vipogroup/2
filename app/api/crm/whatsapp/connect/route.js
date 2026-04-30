import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/requireAuth';
import { connectWhatsApp } from '@/lib/crm/whatsappMockService';

export const dynamic = 'force-dynamic';

async function POSTHandler(request) {
  try {
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { phone } = await request.json();
    
    // התחבר לוואטסאפ (מדומה)
    const result = await connectWhatsApp(phone || '0533752633');
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Connection error:', error);
    return NextResponse.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
}

export const POST = withErrorLogging(POSTHandler);
