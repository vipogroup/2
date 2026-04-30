import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/requireAuth';
import { simulateIncomingMessage } from '@/lib/crm/whatsappMockService';

export const dynamic = 'force-dynamic';

async function POSTHandler(request) {
  try {
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { from, message } = await request.json();
    
    // סימולציה של הודעה נכנסת
    const result = simulateIncomingMessage(
      from || '0533752633',
      message || 'שלום! אני מעוניין לשמוע עוד על המערכת'
    );
    
    return NextResponse.json({
      success: true,
      message: result
    });
  } catch (error) {
    console.error('Simulation error:', error);
    return NextResponse.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
}

export const POST = withErrorLogging(POSTHandler);
