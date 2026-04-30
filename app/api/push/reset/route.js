import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
import { NextResponse } from 'next/server';
import { requireAuthApi } from '@/lib/auth/server';
import { deleteAllUserSubscriptions } from '@/lib/pushSubscriptions';
import { apiDebugLog } from '@/lib/apiDebugLog';

async function POSTHandler(request) {
  try {
    const user = await requireAuthApi(request);
    const userId = user.id;
    apiDebugLog('PUSH_RESET: Deleting all subscriptions for user:', userId);

    const result = await deleteAllUserSubscriptions(userId);
    apiDebugLog('PUSH_RESET: Deleted', result.deletedCount, 'subscriptions');

    return NextResponse.json({
      ok: true,
      deletedCount: result.deletedCount,
      message: `נמחקו ${result.deletedCount} רישומים. כעת יש להפעיל מחדש את ההתראות.`,
    });
  } catch (error) {
    console.error('PUSH_RESET: Error:', error);
    return NextResponse.json(
      { ok: false, error: 'Server error' },
      { status: 500 }
    );
  }
}

export const POST = withErrorLogging(POSTHandler);
