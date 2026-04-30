import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import SiteText from '@/models/SiteText';

export const revalidate = 300;

// GET - Fetch ALL texts from database
async function GETHandler() {
  try {
    await connectMongo();
    
    const texts = await SiteText.find({}).sort({ page: 1, section: 1, order: 1 });
    
    return NextResponse.json(
      { success: true, texts },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=1800',
        },
      },
    );
  } catch (error) {
    console.error('SITE_TEXTS_ALL_DB_UNAVAILABLE:', error?.message || error);
    return NextResponse.json(
      {
        success: true,
        texts: [],
        fallback: true,
        reason: 'db_unavailable',
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      },
    );
  }
}

export const GET = withErrorLogging(GETHandler);
