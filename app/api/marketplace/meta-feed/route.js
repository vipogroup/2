import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

import { getDb } from '@/lib/db';
import {
  META_FEED_CACHE_HEADERS,
  META_FEED_LIMIT,
  META_FEED_PROJECTION,
} from '@/lib/meta/metaFeedConstants';
import { mapProductToFeedItem, buildItemXml } from '@/lib/meta/metaFeedMapper';
import { buildRssDocument } from '@/lib/meta/metaFeedXml';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const GROUP_PURCHASE_TYPE_EXCLUDE = [
  'shared_container',
  'shared-container',
  'shared container',
  'sharedContainer',
];

function isMetaFeedEnabled() {
  return String(process.env.META_FEED_ENABLED || '').trim() === 'true';
}

function parseTenantObjectId() {
  const raw = String(process.env.META_FEED_TENANT_ID || '').trim();
  if (!raw || !ObjectId.isValid(raw)) return null;
  return new ObjectId(raw);
}

export async function GET() {
  if (!isMetaFeedEnabled()) {
    return new NextResponse('Not Found', { status: 404 });
  }

  const rawTenantId = String(process.env.META_FEED_TENANT_ID || '').trim();
  const tenantOid = parseTenantObjectId();
  if (!tenantOid) {
    return new NextResponse('Meta feed misconfigured: META_FEED_TENANT_ID', { status: 503 });
  }

  let db;
  try {
    db = await getDb();
  } catch (e) {
    console.error('[meta-feed] getDb', e);
    return new NextResponse('Service Unavailable', { status: 503 });
  }

  if (!db) {
    return new NextResponse('Service Unavailable', { status: 503 });
  }

  try {
    const tenant = await db.collection('tenants').findOne(
      { $or: [{ _id: tenantOid }, { _id: rawTenantId }] },
      { projection: { _id: 1 } },
    );
    if (!tenant) {
      return new NextResponse('Meta feed: tenant not found', { status: 503 });
    }

    const query = {
      tenantId: { $in: [tenantOid, rawTenantId] },
      status: 'published',
      active: { $ne: false },
      stockCount: { $gt: 0 },
      inStock: true,
      purchaseType: { $ne: 'group' },
      type: { $ne: 'group' },
      price: { $gt: 0 },
      'media.images.0': { $exists: true },
      groupPurchaseType: {
        $nin: GROUP_PURCHASE_TYPE_EXCLUDE,
      },
    };

    const docs = await db
      .collection('products')
      .find(query, {
        projection: META_FEED_PROJECTION,
        sort: { updatedAt: -1 },
        limit: META_FEED_LIMIT,
      })
      .toArray();

    const itemBlocks = [];
    for (const doc of docs) {
      try {
        const item = mapProductToFeedItem(doc);
        if (item) {
          itemBlocks.push(buildItemXml(item));
        }
      } catch (mapErr) {
        console.error('[meta-feed] map item', mapErr);
      }
    }

    const xml = buildRssDocument(itemBlocks);
    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        ...META_FEED_CACHE_HEADERS,
      },
    });
  } catch (e) {
    console.error('[meta-feed] query', e);
    return new NextResponse('Service Unavailable', { status: 503 });
  }
}
