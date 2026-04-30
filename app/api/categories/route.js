// app/api/categories/route.js
import { withErrorLogging } from '@/lib/errorTracking/errorLogger';
import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import Category from '@/models/Category';
import { requireAdminApi } from '@/lib/auth/server';
import { getCurrentTenant } from '@/lib/tenant';

const DEFAULT_CATEGORIES = [
  'אביזרי מחשב',
  'אודיו',
  'מסכים',
  'ריהוט',
  'רכישה קבוצתית',
];

// GET - Get all categories
async function GETHandler(req) {
  try {
    await connectMongo();
    
    // Multi-Tenant: Filter by tenant
    const tenant = await getCurrentTenant(req);
    const filter = { type: 'product', active: true };
    if (tenant) {
      filter.tenantId = tenant._id;
    }
    
    const categories = await Category.find(filter)
      .sort({ sortOrder: 1, name: 1 })
      .lean();
    
    // If no categories exist, create defaults
    if (categories.length === 0) {
      const defaultDocs = DEFAULT_CATEGORIES.map((name, index) => ({
        name,
        type: 'product',
        active: true,
        sortOrder: index,
      }));
      
      await Category.insertMany(defaultDocs, { ordered: false }).catch(() => {});
      
      return NextResponse.json({
        ok: true,
        categories: DEFAULT_CATEGORIES,
      });
    }
    
    return NextResponse.json({
      ok: true,
      categories: categories.map(c => c.name),
    });
  } catch (error) {
    console.error('GET /api/categories error:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

// POST - Add new category
async function POSTHandler(req) {
  try {
    await requireAdminApi(req);
    await connectMongo();
    
    const body = await req.json();
    const name = body.name?.trim();
    
    if (!name) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }
    
    // Check if category already exists
    // Escape regex special characters to prevent ReDoS
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existing = await Category.findOne({ 
      name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
      type: 'product' 
    });
    
    if (existing) {
      // If it exists but inactive, reactivate it
      if (!existing.active) {
        existing.active = true;
        await existing.save();
        return NextResponse.json({ ok: true, category: existing.name, reactivated: true });
      }
      return NextResponse.json({ error: 'Category already exists' }, { status: 400 });
    }
    
    // Create new category
    const category = await Category.create({
      name,
      type: 'product',
      active: true,
    });
    
    return NextResponse.json({ ok: true, category: category.name });
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('POST /api/categories error:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}

// DELETE - Delete category (soft delete)
async function DELETEHandler(req) {
  try {
    await requireAdminApi(req);
    await connectMongo();
    
    const { searchParams } = new URL(req.url);
    const name = searchParams.get('name');
    
    if (!name) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }
    
    const result = await Category.findOneAndUpdate(
      { name, type: 'product' },
      { active: false },
      { new: true }
    );
    
    if (!result) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }
    
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('DELETE /api/categories error:', error);
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
}

export const GET = withErrorLogging(GETHandler);
export const POST = withErrorLogging(POSTHandler);
export const DELETE = withErrorLogging(DELETEHandler);
