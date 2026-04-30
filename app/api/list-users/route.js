import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdminApi } from '@/lib/auth/server';

async function GETHandler(request) {
  try {
    // Admin-only: list all users
    await requireAdminApi(request);
    
    const db = await getDb();
    const users = db.collection('users');

    const allUsers = await users
      .find(
        {},
        {
          projection: {
            email: 1,
            phone: 1,
            role: 1,
            fullName: 1,
            createdAt: 1,
            isActive: 1,
            // Security: Never expose passwordHash
          },
        },
      )
      .toArray();

    return NextResponse.json({
      success: true,
      count: allUsers.length,
      users: allUsers.map((u) => ({
        _id: String(u._id),
        email: u.email,
        phone: u.phone,
        role: u.role,
        fullName: u.fullName,
        isActive: u.isActive,
        createdAt: u.createdAt,
      })),
    });
  } catch (error) {
    console.error('LIST_USERS_ERROR:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

export const GET = withErrorLogging(GETHandler);
