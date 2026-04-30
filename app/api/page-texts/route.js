import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import PageTextOverride from '@/models/PageTextOverride';

export const dynamic = 'force-dynamic';

// GET - Load text overrides + button position for a page
export async function GET(request) {
  try {
    await connectMongo();
    const { searchParams } = new URL(request.url);
    const pageKey = searchParams.get('pageKey');
    const tenantId = searchParams.get('tenantId') || 'global';

    if (!pageKey) {
      return NextResponse.json({ error: 'pageKey required' }, { status: 400 });
    }

    const doc = await PageTextOverride.findOne({ tenantId, pageKey });
    return NextResponse.json({
      success: true,
      overrides: doc?.overrides || {},
      buttonPos: doc?.buttonPos || { x: 8, y: 8, scale: 1, locked: false }
    });
  } catch (error) {
    console.error('PAGE_TEXTS_DB_UNAVAILABLE:', error?.message || error);
    return NextResponse.json({
      success: true,
      overrides: {},
      buttonPos: { x: 8, y: 8, scale: 1, locked: false },
      fallback: true,
      reason: 'db_unavailable',
    });
  }
}

// PUT - Save text overrides and/or button position
export async function PUT(request) {
  try {
    await connectMongo();
    const body = await request.json();
    const { pageKey, tenantId = 'global', overrides, buttonPos } = body;

    if (!pageKey) {
      return NextResponse.json({ error: 'pageKey required' }, { status: 400 });
    }

    const updateData = {};
    if (overrides !== undefined) updateData.overrides = overrides;
    if (buttonPos !== undefined) updateData.buttonPos = buttonPos;

    const doc = await PageTextOverride.findOneAndUpdate(
      { tenantId, pageKey },
      { $set: updateData },
      { new: true, upsert: true }
    );

    return NextResponse.json({ success: true, doc });
  } catch (error) {
    console.error('Error saving page texts:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
