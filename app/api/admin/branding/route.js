import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { connectMongo } from '@/lib/mongoose';
import BrandingSettings from '@/models/BrandingSettings';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Presets מוכנים מראש
const PRESETS = {
  vipo: {
    name: 'VIPO Original',
    colors: { primary: '#1e3a8a', secondary: '#0891b2', accent: '#6366f1' },
  },
  amazon: {
    name: 'Amazon Style',
    colors: { primary: '#131921', secondary: '#ff9900', accent: '#146eb4' },
  },
  aliexpress: {
    name: 'AliExpress Style',
    colors: { primary: '#ff4747', secondary: '#ff6600', accent: '#1a1a1a' },
  },
  shopify: {
    name: 'Shopify Style',
    colors: { primary: '#5c6ac4', secondary: '#006fbb', accent: '#47c1bf' },
  },
  woocommerce: {
    name: 'WooCommerce Style',
    colors: { primary: '#7f54b3', secondary: '#96588a', accent: '#9b5c8f' },
  },
  modern: {
    name: 'Modern Dark',
    colors: { primary: '#0f172a', secondary: '#3b82f6', accent: '#8b5cf6' },
  },
  nature: {
    name: 'Nature Green',
    colors: { primary: '#064e3b', secondary: '#059669', accent: '#34d399' },
  },
  sunset: {
    name: 'Sunset Orange',
    colors: { primary: '#7c2d12', secondary: '#ea580c', accent: '#fb923c' },
  },
};

// בדיקת הרשאות מנהל ראשי
async function checkAdminAuth(request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value || cookieStore.get('token')?.value;
  
  if (!token) {
    return null;
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin' && decoded.role !== 'super_admin') {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

// GET - קבלת הגדרות גלובליות
export async function GET(request) {
  try {
    const user = await checkAdminAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    await connectMongo();
    
    const settings = await BrandingSettings.getGlobal();
    const stats = await BrandingSettings.countUsingGlobal();
    
    return NextResponse.json({
      settings,
      stats,
      presets: PRESETS,
    });
  } catch (error) {
    console.error('Error getting branding settings:', error);
    return NextResponse.json({ error: 'Failed to get settings' }, { status: 500 });
  }
}

// POST - עדכון הגדרות גלובליות
export async function POST(request) {
  try {
    const user = await checkAdminAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    await connectMongo();
    
    const body = await request.json();
    const { presetId, colors, logo, favicon, typography, borderRadius } = body;
    
    // אם נבחר Preset
    let updates = {};
    if (presetId && PRESETS[presetId]) {
      updates = {
        presetId,
        colors: PRESETS[presetId].colors,
      };
    } else {
      updates = {
        presetId: null,
        ...(colors && { colors }),
        ...(logo && { logo }),
        ...(favicon && { favicon }),
        ...(typography && { typography }),
        ...(borderRadius && { borderRadius }),
      };
    }
    
    const settings = await BrandingSettings.updateGlobal(updates, user.userId);
    
    return NextResponse.json({
      success: true,
      settings,
      message: 'הגדרות העיצוב עודכנו בהצלחה',
    });
  } catch (error) {
    console.error('Error updating branding settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
