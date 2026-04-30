import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

import { connectMongo } from '@/lib/mongoose';
import Product from '@/models/Product';
import { requireAdminApi } from '@/lib/auth/server';

export const runtime = 'nodejs';

async function POSTHandler(req) {
  // Block in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  try {
    // Require admin even in dev
    await requireAdminApi(req);
    await connectMongo();

    const jsonPath = path.join(process.cwd(), 'export_vipo_products_ui', 'data', 'products.json');

    const raw = await fs.readFile(jsonPath, 'utf-8');
    const parsed = JSON.parse(raw);
    const items = Array.isArray(parsed?.items) ? parsed.items : [];

    if (!items.length) {
      return NextResponse.json(
        {
          ok: false,
          message: 'No items found in products.json',
        },
        { status: 400 },
      );
    }

    const docs = items.map((item, index) => {
      const name = item.name || `Product ${index + 1}`;
      const dimensions = item.dimensions || '';
      const priceRaw = item.price;

      let price = 0;
      if (typeof priceRaw === 'number') {
        price = priceRaw;
      } else if (typeof priceRaw === 'string') {
        const numericMatch = priceRaw.match(/([0-9]+(?:\.[0-9]+)?)/);
        if (numericMatch) {
          price = Number(numericMatch[1]);
        }
      }

      return {
        name,
        description: dimensions || String(priceRaw || ''),
        fullDescription: dimensions || String(priceRaw || ''),
        category: 'Exported',
        price: price,
        originalPrice: null,
        commission: price ? price * 0.1 : 0,
        type: 'online',
        purchaseType: 'regular',
        status: 'published',
        inStock: true,
        stockCount: 0,
        media: {
          images: [],
          videoUrl: '',
        },
        rating: 0,
        reviews: 0,
        features: [],
        specs: {},
      };
    });

    let created = 0;
    let updated = 0;

    for (const doc of docs) {
      const existing = await Product.findOne({ name: doc.name });
      if (existing) {
        await Product.updateOne({ _id: existing._id }, { $set: doc });
        updated += 1;
      } else {
        await Product.create(doc);
        created += 1;
      }
    }

    const total = await Product.countDocuments();

    return NextResponse.json(
      {
        ok: true,
        message: `Seed completed. Created ${created} products, updated ${updated}. Total in collection: ${total}.`,
        created,
        updated,
        total,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('SEED_PRODUCTS_ERROR', error);
    return NextResponse.json(
      {
        ok: false,
        message: 'Failed to seed products',
        error: error.message,
      },
      { status: 500 },
    );
  }
}

export const POST = withErrorLogging(POSTHandler);
